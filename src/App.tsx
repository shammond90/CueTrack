import { useState, useCallback, useEffect } from 'react';
import { CuetationProject, Sheet, Group, Decisions, SchemaReconciliation } from './types';
import { analyseSheets } from './lib/matching';
import { autoReconcile, buildCueTypeFieldsMap } from './lib/schemaReconcile';
import { normalizeToSheet } from './lib/jsonParser';
import { PERSON_COLORS } from './lib/utils';
import ImportScreen from './screens/ImportScreen';
import SchemaScreen from './screens/SchemaScreen';
import CompareScreen from './screens/CompareScreen';
import ReviewScreen from './screens/ReviewScreen';
import ExportScreen from './screens/ExportScreen';
import LandingPage from './screens/LandingPage';
import TermsPage from './screens/TermsPage';
import PrivacyPage from './screens/PrivacyPage';

type AppMode = 'csv' | 'json';
// CSV mode: stages 1-4  (Import → Compare → Review → Export)
// JSON mode: stages 1-5 (Import → Schema → Compare → Review → Export)
type Stage = 1 | 2 | 3 | 4 | 5;
type Page = 'landing' | 'merge' | 'terms' | 'privacy';

const CSV_STAGE_LABELS = ['Import sheets', 'Compare', 'Review conflicts', 'Export'];
const JSON_STAGE_LABELS = ['Import projects', 'Schema', 'Compare', 'Review conflicts', 'Export'];

const isAppSubdomain = window.location.hostname.startsWith('app.');
const MAIN_SITE = 'https://cuetrack.com';
const APP_SITE = 'https://app.cuetrack.com';

function useHashRoute(): [Page, (p: Page) => void] {
  const getPage = (): Page => {
    if (isAppSubdomain) return 'merge';
    const hash = window.location.hash.replace('#/', '').replace('#', '');
    if (hash === 'merge') return 'merge';
    if (hash === 'terms') return 'terms';
    if (hash === 'privacy') return 'privacy';
    return 'landing';
  };
  const [page, setPageState] = useState<Page>(getPage);

  useEffect(() => {
    const onHash = () => setPageState(getPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setPage = (p: Page) => {
    if (p === 'merge' && !isAppSubdomain) {
      window.location.href = APP_SITE;
      return;
    }
    if (p === 'landing' && isAppSubdomain) {
      window.location.href = MAIN_SITE;
      return;
    }
    window.location.hash = p === 'landing' ? '/' : `/${p}`;
  };

  return [page, setPage];
}

export default function App() {
  const [page, setPage] = useHashRoute();
  const [mode, setMode] = useState<AppMode>('csv');
  const [stage, setStage] = useState<Stage>(1);
  const [workflow, setWorkflow] = useState('new-show');
  const [tolerance, setTolerance] = useState(2);
  // CSV state
  const [sheets, setSheets] = useState<Sheet[]>([]);
  // JSON state
  const [jsonProjects, setJsonProjects] = useState<CuetationProject[]>([]);
  const [reconciliation, setReconciliation] = useState<SchemaReconciliation | null>(null);
  // Shared analysis state
  const [groups, setGroups] = useState<Group[]>([]);
  const [conflictGroups, setConflictGroups] = useState<Group[]>([]);
  const [decisions, setDecisions] = useState<Decisions>({});
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [discarded, setDiscarded] = useState<Set<number>>(new Set());
  const [currentConflictIdx, setCurrentConflictIdx] = useState(0);

  const stageLabels = mode === 'json' ? JSON_STAGE_LABELS : CSV_STAGE_LABELS;
  const statusText = groups.length > 0 ? `${accepted.size}/${groups.length} cues resolved` : '';

  // ── CSV: Import → Compare (stage 1 → 2) ──────────────────────────────────
  const handleAnalyseCsv = useCallback(() => {
    const g = analyseSheets(sheets, tolerance);
    setGroups(g);
    setConflictGroups(g.filter((gr) => gr.status === 'conflict' || gr.status === 'unique'));
    setDecisions({});
    setAccepted(new Set());
    setDiscarded(new Set());
    setCurrentConflictIdx(0);
    setStage(2);
  }, [sheets, tolerance]);

  // ── JSON: Import → Schema (stage 1 → 2) ──────────────────────────────────
  const handleProceedToSchema = useCallback(() => {
    const rec = autoReconcile(jsonProjects, 0);
    setReconciliation(rec);
    setStage(2);
  }, [jsonProjects]);

  // ── JSON: Schema → Compare (stage 2 → 3) ─────────────────────────────────
  const handleAnalyseJson = useCallback(() => {
    if (!reconciliation) return;
    const primaryProject = jsonProjects[reconciliation.primaryProjectIdx];
    const normalizedSheets = jsonProjects.map((proj, pi) =>
      normalizeToSheet(
        proj,
        pi,
        reconciliation,
        PERSON_COLORS[pi % PERSON_COLORS.length],
        (proj as CuetationProject & { _filename?: string })._filename ?? `${proj.project.name}.cuetation.json`,
        proj.project.name,
      ),
    );
    setSheets(normalizedSheets);
    const cueTypeFields = buildCueTypeFieldsMap(reconciliation, primaryProject);
    const g = analyseSheets(normalizedSheets, tolerance, cueTypeFields);
    setGroups(g);
    setConflictGroups(g.filter((gr) => gr.status === 'conflict' || gr.status === 'unique'));
    setDecisions({});
    setAccepted(new Set());
    setDiscarded(new Set());
    setCurrentConflictIdx(0);
    setStage(3);
  }, [reconciliation, jsonProjects, tolerance]);

  // ── Unified "Analyse" from ImportScreen ──────────────────────────────────
  const handleAnalyse = useCallback(() => {
    if (mode === 'json') {
      handleProceedToSchema();
    } else {
      handleAnalyseCsv();
    }
  }, [mode, handleProceedToSchema, handleAnalyseCsv]);

  // Compare stage number differs per mode
  const compareStage: Stage = mode === 'json' ? 3 : 2;
  const reviewStage: Stage = mode === 'json' ? 4 : 3;
  const exportStage: Stage = mode === 'json' ? 5 : 4;

  const acceptGroup = useCallback((id: number) => {
    setAccepted((prev) => new Set(prev).add(id));
  }, []);

  const acceptAllClean = useCallback(() => {
    setAccepted((prev) => {
      const next = new Set(prev);
      groups.filter((g) => g.status === 'clean').forEach((g) => next.add(g.id));
      return next;
    });
  }, [groups]);

  const discardUniqueGroup = useCallback((id: number) => {
    setDiscarded((prev) => new Set(prev).add(id));
  }, []);

  const openConflict = useCallback(
    (id: number) => {
      const idx = conflictGroups.findIndex((g) => g.id === id);
      if (idx >= 0) setCurrentConflictIdx(idx);
      setStage(reviewStage);
    },
    [conflictGroups, reviewStage],
  );

  function goToStage(n: Stage) {
    // Prevent jumping forward past the current reachable stage
    if (n === compareStage && sheets.length < 2 && groups.length === 0) return;
    if (n === (mode === 'json' ? 2 : -1) && jsonProjects.length < 2) return;
    setStage(n);
  }

  if (page === 'landing') return <LandingPage />;
  if (page === 'terms') return <TermsPage />;
  if (page === 'privacy') return <PrivacyPage />;

  return (
    <>
      {/* HEADER */}
      <div className="header">
        <a className="wordmark" href={isAppSubdomain ? MAIN_SITE : '#/'} style={{ cursor: 'pointer', textDecoration: 'none' }}>
          Cue<em>track</em>
        </a>
        <div className="header-divider" />
        <span className="header-label">Sheet Merge</span>
        <div className="header-right">
          <span className="text-dim" style={{ fontSize: 11 }}>{statusText}</span>
        </div>
      </div>

      {/* STAGE BAR */}
      <div className="stage-bar">
        {stageLabels.map((label, i) => {
          const num = (i + 1) as Stage;
          const isActive = stage === num;
          const isDone = num < stage;
          const cls = `stage-tab${isActive ? ' active' : ''}${isDone ? ' done' : ''}`;
          return (
            <div key={num}>
              {i > 0 && <span className="stage-arrow">›</span>}
              <div className={cls} onClick={() => goToStage(num)} style={{ display: 'inline-flex' }}>
                <div className="stage-num">{isDone ? '✓' : num}</div>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* SCREENS */}
      {stage === 1 && (
        <ImportScreen
          mode={mode}
          sheets={sheets}
          jsonProjects={jsonProjects}
          workflow={workflow}
          tolerance={tolerance}
          onSheetsChange={setSheets}
          onJsonProjectsChange={setJsonProjects}
          onModeChange={(m) => { setMode(m); setStage(1); setGroups([]); setSheets([]); setJsonProjects([]); setReconciliation(null); }}
          onWorkflowChange={setWorkflow}
          onToleranceChange={setTolerance}
          onAnalyse={handleAnalyse}
        />
      )}

      {/* JSON-only: Schema reconciliation stage */}
      {stage === 2 && mode === 'json' && reconciliation && (
        <SchemaScreen
          projects={jsonProjects}
          reconciliation={reconciliation}
          onReconciliationChange={setReconciliation}
          onProceed={handleAnalyseJson}
        />
      )}

      {stage === compareStage && (
        <CompareScreen
          groups={groups}
          sheets={sheets}
          decisions={decisions}
          accepted={accepted}
          onDecisionsChange={setDecisions}
          onAcceptGroup={acceptGroup}
          onAcceptAllClean={acceptAllClean}
          onGoToReview={() => setStage(reviewStage)}
          onOpenConflict={openConflict}
        />
      )}

      {stage === reviewStage && (
        <ReviewScreen
          groups={groups}
          conflictGroups={conflictGroups}
          sheets={sheets}
          decisions={decisions}
          accepted={accepted}
          currentConflictIdx={currentConflictIdx}
          onSetConflictIdx={setCurrentConflictIdx}
          onDecisionsChange={setDecisions}
          onAcceptGroup={acceptGroup}
          onDiscardUnique={discardUniqueGroup}
          onGoToExport={() => setStage(exportStage)}
        />
      )}

      {stage === exportStage && (
        <ExportScreen
          mode={mode}
          groups={groups}
          sheets={sheets}
          jsonProjects={jsonProjects}
          reconciliation={reconciliation}
          decisions={decisions}
          accepted={accepted}
          discarded={discarded}
          conflictGroups={conflictGroups}
          workflow={workflow}
          tolerance={tolerance}
          onGoToReview={() => setStage(reviewStage)}
        />
      )}
    </>
  );
}
