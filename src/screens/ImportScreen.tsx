import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { Sheet } from '../types';
import { PERSON_COLORS } from '../lib/utils';

interface ImportScreenProps {
  sheets: Sheet[];
  workflow: string;
  tolerance: number;
  onSheetsChange: (sheets: Sheet[]) => void;
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
  sheets,
  workflow,
  tolerance,
  onSheetsChange,
  onWorkflowChange,
  onToleranceChange,
  onAnalyse,
}: ImportScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingIdx, setPendingIdx] = useState<number>(0);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const maxSlots = workflow === 'session-compare' ? 2 : 5;

  function handleFiles(files: FileList, startIdx: number) {
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

  function removeSheet(idx: number) {
    const newSheets = sheets.filter((_, i) => i !== idx);
    onSheetsChange(newSheets);
  }

  function updatePerson(idx: number, person: string) {
    const newSheets = [...sheets];
    newSheets[idx] = { ...newSheets[idx], person };
    onSheetsChange(newSheets);
  }

  function handleDrop(e: DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(null);
    handleFiles(e.dataTransfer.files, idx);
  }

  return (
    <div className="import-wrap">
      <div className="screen-heading">Import cue sheets</div>
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
          const isDisabled = !sheet && i > sheets.length;

          if (sheet) {
            return (
              <div key={i} className="drop-zone loaded">
                <div className="drop-remove" onClick={() => removeSheet(i)}>✕</div>
                <div className="drop-icon" style={{ color: sheet.color }}>📄</div>
                <div className="drop-filename">{sheet.filename}</div>
                <div className="drop-count">{sheet.rows.length} rows</div>
                <input
                  className="drop-person-input"
                  placeholder="Person / role…"
                  value={sheet.person}
                  onChange={(e) => updatePerson(i, e.target.value)}
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
                onDrop={(e) => handleDrop(e, i)}
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
          if (e.target.files) handleFiles(e.target.files, pendingIdx);
          e.target.value = '';
        }}
      />

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
        <button className="btn" onClick={() => onSheetsChange([])}>Clear all</button>
        <button className="btn btn-primary" disabled={sheets.length < 2} onClick={onAnalyse}>
          Analyse sheets →
        </button>
      </div>
    </div>
  );
}
