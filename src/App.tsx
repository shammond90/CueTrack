import { useState, useCallback } from 'react';
import { Sheet, Group, Decisions } from './types';
import { analyseSheets } from './lib/matching';
import ImportScreen from './screens/ImportScreen';
import CompareScreen from './screens/CompareScreen';
import ReviewScreen from './screens/ReviewScreen';
import ExportScreen from './screens/ExportScreen';

type Stage = 1 | 2 | 3 | 4;

const STAGE_LABELS = ['Import sheets', 'Compare', 'Review conflicts', 'Export'];

export default function App() {
  const [stage, setStage] = useState<Stage>(1);
  const [workflow, setWorkflow] = useState('new-show');
  const [tolerance, setTolerance] = useState(2);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [conflictGroups, setConflictGroups] = useState<Group[]>([]);
  const [decisions, setDecisions] = useState<Decisions>({});
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [discarded, setDiscarded] = useState<Set<number>>(new Set());
  const [currentConflictIdx, setCurrentConflictIdx] = useState(0);

  const statusText = groups.length > 0 ? `${accepted.size}/${groups.length} cues resolved` : '';

  const handleAnalyse = useCallback(() => {
    const g = analyseSheets(sheets, tolerance);
    setGroups(g);
    setConflictGroups(g.filter((gr) => gr.status === 'conflict' || gr.status === 'unique'));
    setDecisions({});
    setAccepted(new Set());
    setDiscarded(new Set());
    setCurrentConflictIdx(0);
    setStage(2);
  }, [sheets, tolerance]);

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
      setStage(3);
    },
    [conflictGroups],
  );

  function goToStage(n: Stage) {
    if (n === 2 && sheets.length < 2) return;
    setStage(n);
  }

  return (
    <>
      {/* HEADER */}
      <div className="header">
        <span className="wordmark">
          Cue<em>track</em>
        </span>
        <div className="header-divider" />
        <span className="header-label">Sheet Merge</span>
        <div className="header-right">
          <span className="text-dim" style={{ fontSize: 11 }}>{statusText}</span>
        </div>
      </div>

      {/* STAGE BAR */}
      <div className="stage-bar">
        {STAGE_LABELS.map((label, i) => {
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
          sheets={sheets}
          workflow={workflow}
          tolerance={tolerance}
          onSheetsChange={setSheets}
          onWorkflowChange={setWorkflow}
          onToleranceChange={setTolerance}
          onAnalyse={handleAnalyse}
        />
      )}

      {stage === 2 && (
        <CompareScreen
          groups={groups}
          sheets={sheets}
          decisions={decisions}
          accepted={accepted}
          onDecisionsChange={setDecisions}
          onAcceptGroup={acceptGroup}
          onAcceptAllClean={acceptAllClean}
          onGoToReview={() => setStage(3)}
          onOpenConflict={openConflict}
        />
      )}

      {stage === 3 && (
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
          onGoToExport={() => setStage(4)}
        />
      )}

      {stage === 4 && (
        <ExportScreen
          groups={groups}
          sheets={sheets}
          decisions={decisions}
          accepted={accepted}
          discarded={discarded}
          conflictGroups={conflictGroups}
          workflow={workflow}
          tolerance={tolerance}
          onGoToReview={() => setStage(3)}
        />
      )}
    </>
  );
}
