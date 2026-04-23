import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { CuetationProject, Sheet } from '../types';
import { PERSON_COLORS } from '../lib/utils';
import { parseCuetationJson } from '../lib/jsonParser';

type AppMode = 'csv' | 'json';

interface ImportScreenProps {
  mode: AppMode;
  sheets: Sheet[];
  jsonProjects: CuetationProject[];
  workflow: string;
  tolerance: number;
  onSheetsChange: (sheets: Sheet[]) => void;
  onJsonProjectsChange: (projects: CuetationProject[]) => void;
  onModeChange: (mode: AppMode) => void;
  onWorkflowChange: (w: string) => void;
  onToleranceChange: (t: number) => void;
  onAnalyse: () => void;
}

const WORKFLOWS = [
  {
    id: 'new-show',
    title: 'New show',
    desc: 'Multiple departments annotating their specialisms. LD logs lights, SD logs audio, SM logs everything.',
  },
  {
    id: 'recreation',
    title: 'Recreation',
    desc: 'Multiple people annotating everything independently. Assistants, SMs, revival productions.',
  },
  {
    id: 'session-compare',
    title: 'Session comparison',
    desc: "Compare two of your own sessions — diff what changed or merge the best of both.",
  },
];

export default function ImportScreen({
  mode,
  sheets,
  jsonProjects,
  workflow,
  tolerance,
  onSheetsChange,
  onJsonProjectsChange,
  onModeChange,
  onWorkflowChange,
  onToleranceChange,
  onAnalyse,
}: ImportScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [pendingIdx, setPendingIdx] = useState<number>(0);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const maxSlots = workflow === 'session-compare' ? 2 : 5;
  const JSON_MAX_SLOTS = 5;

  // ── CSV handlers ─────────────────────────────────────────────────────────

  function handleCsvFiles(files: FileList, startIdx: number) {
    const newSheets = [...sheets];
    Array.from(files).forEach((file, offset) => {
      const idx = startIdx + offset;
      if (idx >= maxSlots) return;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          newSheets[idx] = {
            filename: file.name,
            person: file.name.replace('.csv', '').replace(/_/g, ' '),
            rows: result.data as Record<string, string>[],
            color: PERSON_COLORS[idx % PERSON_COLORS.length],
          };
          onSheetsChange([...newSheets]);
        },
      });
    });
  }

  function removeCsvSheet(idx: number) {
    const newSheets = sheets.filter((_, i) => i !== idx);
    onSheetsChange(newSheets);
  }

  function updateCsvPerson(idx: number, person: string) {
    const newSheets = [...sheets];
    newSheets[idx] = { ...newSheets[idx], person };
    onSheetsChange(newSheets);
  }

  function handleCsvDrop(e: DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(null);
    handleCsvFiles(e.dataTransfer.files, idx);
  }

  // ── JSON handlers ─────────────────────────────────────────────────────────

  async function handleJsonFiles(files: FileList | File[]) {
    setJsonError(null);
    const fileArr = Array.from(files).filter((f) => f.name.endsWith('.cuetation.json') || f.name.endsWith('.json'));
    if (!fileArr.length) return;

    const newProjects = [...jsonProjects];
    for (const file of fileArr) {
      if (newProjects.length >= JSON_MAX_SLOTS) break;
      try {
        const project = await parseCuetationJson(file);
        // Tag the filename onto the project name if it's the default
        const existing = newProjects.findIndex((p) => p.project.name === project.project.name);
        if (existing >= 0) {
          // Same project name — still allow it (different annotation versions)
          project.project.name = `${project.project.name} (${newProjects.length + 1})`;
        }
        // Attach original filename for display
        (project as CuetationProject & { _filename?: string })._filename = file.name;
        newProjects.push(project);
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Failed to parse file');
        return;
      }
    }

    onJsonProjectsChange(newProjects);
    if (mode !== 'json') onModeChange('json');
  }

  function removeJsonProject(idx: number) {
    const updated = jsonProjects.filter((_, i) => i !== idx);
    onJsonProjectsChange(updated);
    if (updated.length === 0) onModeChange('csv');
  }

  function updateJsonProjectName(idx: number, name: string) {
    const updated = jsonProjects.map((p, i) =>
      i === idx ? { ...p, project: { ...p.project, name } } : p,
    );
    onJsonProjectsChange(updated);
  }

  function handleJsonDrop(e: DragEvent) {
    e.preventDefault();
    setDragOverIdx(null);
    handleJsonFiles(e.dataTransfer.files);
  }

  // ── Mode switcher ─────────────────────────────────────────────────────────

  function switchMode(m: AppMode) {
    if (m === mode) return;
    onModeChange(m);
    onSheetsChange([]);
    onJsonProjectsChange([]);
    setJsonError(null);
  }

  const canProceed = mode === 'json' ? jsonProjects.length >= 2 : sheets.length >= 2;

  return (
    <div className="import-wrap">
      <div className="screen-heading">Import cue sheets</div>

      {/* Mode switcher */}
      <div className="import-mode-switch">
        <button
          className={`import-mode-btn${mode === 'csv' ? ' active' : ''}`}
          onClick={() => switchMode('csv')}
        >
          CSV files
        </button>
        <button
          className={`import-mode-btn${mode === 'json' ? ' active' : ''}`}
          onClick={() => switchMode('json')}
        >
          Project files (.cuetation.json)
        </button>
      </div>

      {/* ── CSV mode ── */}
      {mode === 'csv' && (
        <>
          <div className="screen-sub">
            Upload 2–5 CSV exports from Cuetrack. Each file represents one person's annotation of the same recording.
          </div>

          <div className="workflow-picker">
            {WORKFLOWS.map((w) => (
              <div
                key={w.id}
                className={`workflow-card${workflow === w.id ? ' selected' : ''}`}
                onClick={() => onWorkflowChange(w.id)}
              >
                <div className="workflow-title">{w.title}</div>
                <div className="workflow-desc">{w.desc}</div>
              </div>
            ))}
          </div>

          <div className="drop-zones">
            {Array.from({ length: maxSlots }).map((_, i) => {
              const sheet = sheets[i];
              const isNextEmpty = !sheet && i <= sheets.length;

              if (sheet) {
                return (
                  <div key={i} className="drop-zone loaded">
                    <div className="drop-remove" onClick={() => removeCsvSheet(i)}>✕</div>
                    <div className="drop-icon" style={{ color: sheet.color }}>📄</div>
                    <div className="drop-filename">{sheet.filename}</div>
                    <div className="drop-count">{sheet.rows.length} rows</div>
                    <input
                      className="drop-person-input"
                      placeholder="Person / role…"
                      value={sheet.person}
                      onChange={(e) => updateCsvPerson(i, e.target.value)}
                    />
                  </div>
                );
              }

              if (isNextEmpty) {
                return (
                  <div
                    key={i}
                    className={`drop-zone${dragOverIdx === i ? ' drag-over' : ''}`}
                    onClick={() => {
                      setPendingIdx(i);
                      fileInputRef.current?.click();
                    }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={(e) => handleCsvDrop(e, i)}
                  >
                    <div className="drop-icon">+</div>
                    <div className="drop-label">Drop CSV here<br />or click to browse</div>
                  </div>
                );
              }

              return (
                <div key={i} className="drop-zone" style={{ opacity: 0.4, cursor: 'default' }}>
                  <div className="drop-icon" style={{ opacity: 0.3 }}>+</div>
                  <div className="drop-label" style={{ opacity: 0.3 }}>Slot {i + 1}</div>
                </div>
              );
            })}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".csv"
            multiple
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files) handleCsvFiles(e.target.files, pendingIdx);
              e.target.value = '';
            }}
          />
        </>
      )}

      {/* ── JSON mode ── */}
      {mode === 'json' && (
        <>
          <div className="screen-sub">
            Upload 2–5 Cuetation project files (.cuetation.json). CueType and field differences
            will be reconciled in the next step.
          </div>

          <div className="drop-zones">
            {Array.from({ length: JSON_MAX_SLOTS }).map((_, i) => {
              const project = jsonProjects[i] as (CuetationProject & { _filename?: string }) | undefined;
              const isNextEmpty = !project && i <= jsonProjects.length;

              if (project) {
                const annotationCount = Object.values(project.annotations).flat().filter(
                  (a) => !(a as CuetationProject['annotations'][string][number]).deleted,
                ).length;
                return (
                  <div key={i} className="drop-zone loaded">
                    <div className="drop-remove" onClick={() => removeJsonProject(i)}>✕</div>
                    <div className="drop-icon" style={{ color: PERSON_COLORS[i % PERSON_COLORS.length] }}>
                      🗂
                    </div>
                    <div className="drop-filename">{project._filename ?? project.project.name}</div>
                    <div className="drop-count">{annotationCount} annotations</div>
                    <input
                      className="drop-person-input"
                      placeholder="Project name…"
                      value={project.project.name}
                      onChange={(e) => updateJsonProjectName(i, e.target.value)}
                    />
                  </div>
                );
              }

              if (isNextEmpty) {
                return (
                  <div
                    key={i}
                    className={`drop-zone${dragOverIdx === i ? ' drag-over' : ''}`}
                    onClick={() => jsonFileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i); }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={handleJsonDrop}
                  >
                    <div className="drop-icon">+</div>
                    <div className="drop-label">Drop .cuetation.json<br />or click to browse</div>
                  </div>
                );
              }

              return (
                <div key={i} className="drop-zone" style={{ opacity: 0.4, cursor: 'default' }}>
                  <div className="drop-icon" style={{ opacity: 0.3 }}>+</div>
                  <div className="drop-label" style={{ opacity: 0.3 }}>Slot {i + 1}</div>
                </div>
              );
            })}
          </div>

          {jsonError && (
            <div className="import-error">{jsonError}</div>
          )}

          <input
            type="file"
            ref={jsonFileInputRef}
            accept=".json,.cuetation.json"
            multiple
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files) handleJsonFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </>
      )}

      <div className="settings-panel">
        <div className="settings-row">
          <div className="settings-label">
            Matching tolerance — cues within this window are considered the same moment
          </div>
          <select
            className="tol-select"
            value={tolerance}
            onChange={(e) => onToleranceChange(parseInt(e.target.value))}
          >
            <option value={0}>±0s (exact)</option>
            <option value={1}>±1s (tight)</option>
            <option value={2}>±2s (default)</option>
            <option value={5}>±5s (loose)</option>
          </select>
        </div>
        <div className="settings-row">
          <div className="settings-label">Match by cue type + timecode (recommended)</div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>
            type + tc
          </span>
        </div>
      </div>

      <div className="import-actions">
        <button
          className="btn"
          onClick={() => {
            onSheetsChange([]);
            onJsonProjectsChange([]);
          }}
        >
          Clear all
        </button>
        <button className="btn btn-primary" disabled={!canProceed} onClick={onAnalyse}>
          {mode === 'json' ? 'Reconcile schemas →' : 'Analyse sheets →'}
        </button>
      </div>
    </div>
  );
}
