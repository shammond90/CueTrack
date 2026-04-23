import { useState } from 'react';
import { CuetationProject, Decisions, Group, SchemaReconciliation, Sheet } from '../types';
import { exportMergedCSV, exportMergeReport } from '../lib/export';
import { exportMergedJson } from '../lib/jsonExport';

interface ExportScreenProps {
  mode: 'csv' | 'json';
  groups: Group[];
  sheets: Sheet[];
  jsonProjects: CuetationProject[];
  reconciliation: SchemaReconciliation | null;
  decisions: Decisions;
  accepted: Set<number>;
  discarded: Set<number>;
  conflictGroups: Group[];
  workflow: string;
  tolerance: number;
  onGoToReview: () => void;
}

export default function ExportScreen({
  mode,
  groups,
  sheets,
  jsonProjects,
  reconciliation,
  decisions,
  accepted,
  discarded,
  conflictGroups,
  workflow,
  tolerance,
  onGoToReview,
}: ExportScreenProps) {
  const nClean = groups.filter((g) => g.status === 'clean').length;
  const resolved = conflictGroups.filter(
    (g) => accepted.has(g.id) || decisions[g.id],
  ).length;
  const uniqueIncluded = groups.filter((g) => g.status === 'unique' && accepted.has(g.id)).length;

  const [csvSelected, setCsvSelected] = useState(mode === 'csv');
  const [jsonSelected, setJsonSelected] = useState(mode === 'json');
  const [reportSelected, setReportSelected] = useState(false);

  function doExport() {
    if (csvSelected) exportMergedCSV(groups, sheets, decisions, accepted, discarded);
    if (reportSelected) exportMergeReport(groups, sheets, decisions, accepted, conflictGroups, workflow, tolerance);
    if (jsonSelected && reconciliation && jsonProjects.length > 0) {
      exportMergedJson(jsonProjects, reconciliation, groups, sheets, decisions, accepted, discarded);
    }
  }

  return (
    <div className="export-wrap">
      <div className="screen-heading">Export merged sheet</div>
      <div className="screen-sub">
        {resolved} of {conflictGroups.length} conflicts resolved · {sheets.length} sheets merged
      </div>

      <div className="export-stats">
        <div className="export-stat">
          <span className="export-stat-num">{accepted.size + nClean}</span>
          <div className="export-stat-label">Total cues</div>
        </div>
        <div className="export-stat">
          <span className="export-stat-num" style={{ color: 'var(--green)' }}>{nClean}</span>
          <div className="export-stat-label">Auto-merged</div>
        </div>
        <div className="export-stat">
          <span className="export-stat-num" style={{ color: 'var(--amber)' }}>{resolved}</span>
          <div className="export-stat-label">Manually resolved</div>
        </div>
        <div className="export-stat">
          <span className="export-stat-num" style={{ color: 'var(--blue)' }}>{uniqueIncluded}</span>
          <div className="export-stat-label">Unique included</div>
        </div>
      </div>

      <div className="export-options">
        <div className={`export-opt${csvSelected ? ' selected' : ''}`} onClick={() => setCsvSelected(!csvSelected)}>
          <div className="export-opt-icon">📊</div>
          <div className="export-opt-text">
            <div className="export-opt-title">CSV — Cuetation import format</div>
            <div className="export-opt-desc">Drop directly into a new Cuetation project</div>
          </div>
          <div className="export-opt-check">{csvSelected ? '✓' : ''}</div>
        </div>
        {mode === 'json' && (
          <div className={`export-opt${jsonSelected ? ' selected' : ''}`} onClick={() => setJsonSelected(!jsonSelected)}>
            <div className="export-opt-icon">🗂</div>
            <div className="export-opt-text">
              <div className="export-opt-title">Project JSON — .cuetation.json</div>
              <div className="export-opt-desc">Full merged project file, ready to reimport into Cuetation</div>
            </div>
            <div className="export-opt-check">{jsonSelected ? '✓' : ''}</div>
          </div>
        )}
        <div className={`export-opt${reportSelected ? ' selected' : ''}`} onClick={() => setReportSelected(!reportSelected)}>
          <div className="export-opt-icon">📋</div>
          <div className="export-opt-text">
            <div className="export-opt-title">Merge Report — XLSX</div>
            <div className="export-opt-desc">Full log of every decision made during this session</div>
          </div>
          <div className="export-opt-check">{reportSelected ? '✓' : ''}</div>
        </div>
      </div>

      <div className="export-actions">
        <button className="btn" onClick={onGoToReview}>← Back to review</button>
        <button className="btn btn-primary" onClick={doExport}>Download selected →</button>
      </div>
    </div>
  );
}
