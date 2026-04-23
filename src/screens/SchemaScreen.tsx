import { useState, useCallback } from 'react';
import {
  CuetationProject,
  CueTypeResolution,
  FieldResolution,
  SchemaReconciliation,
} from '../types';
import { autoReconcile } from '../lib/schemaReconcile';

interface SchemaScreenProps {
  projects: CuetationProject[];
  reconciliation: SchemaReconciliation;
  onReconciliationChange: (r: SchemaReconciliation) => void;
  onProceed: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function statusDot(kind: CueTypeResolution['matchKind'] | FieldResolution['matchKind']) {
  if (kind === 'auto') return <span className="schema-dot schema-dot-auto" title="Auto-matched" />;
  if (kind === 'manual') return <span className="schema-dot schema-dot-manual" title="Needs review" />;
  return <span className="schema-dot schema-dot-new" title="New (not in all projects)" />;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SchemaScreen({
  projects,
  reconciliation,
  onReconciliationChange,
  onProceed,
}: SchemaScreenProps) {
  const [activeTab, setActiveTab] = useState<'cueTypes' | 'fields'>('cueTypes');
  const n = projects.length;

  // ── Primary project picker ─────────────────────────────────────────────

  function setPrimary(idx: number) {
    const fresh = autoReconcile(projects, idx);
    // Preserve any canonical name overrides the user already made
    const nameOverrides = new Map(
      reconciliation.cueTypeResolutions.map((r) => [
        r.sourceNames.filter(Boolean).join('|'),
        r.canonicalName,
      ]),
    );
    fresh.cueTypeResolutions.forEach((r) => {
      const key = r.sourceNames.filter(Boolean).join('|');
      if (nameOverrides.has(key)) r.canonicalName = nameOverrides.get(key)!;
    });
    onReconciliationChange(fresh);
  }

  // ── CueType mutations ──────────────────────────────────────────────────

  const setCanonicalName = useCallback(
    (idx: number, name: string) => {
      const next = { ...reconciliation };
      next.cueTypeResolutions = next.cueTypeResolutions.map((r, i) =>
        i === idx ? { ...r, canonicalName: name } : r,
      );
      onReconciliationChange(next);
    },
    [reconciliation, onReconciliationChange],
  );

  /** Map a project's unmatched type to an existing canonical resolution */
  const mapTypeToCanonical = useCallback(
    (fromIdx: number, fromSourceIdx: number, toResIdx: number | null) => {
      const next = { ...reconciliation };
      const resolutions = next.cueTypeResolutions.map((r) => ({ ...r, sourceNames: [...r.sourceNames] }));

      const from = resolutions[fromSourceIdx];
      const srcName = from.sourceNames[fromIdx];
      if (srcName === undefined) return;

      if (toResIdx === null) {
        // Unmap — restore to its own entry
        from.sourceNames[fromIdx] = srcName;
        from.matchKind = 'manual';
      } else {
        // Clear this source from the "from" resolution
        from.sourceNames[fromIdx] = undefined;
        // Set on target resolution
        resolutions[toResIdx].sourceNames[fromIdx] = srcName;
        resolutions[toResIdx].matchKind = 'manual';
        // If "from" is now empty, remove it
        const nonEmpty = resolutions[fromSourceIdx].sourceNames.some((s) => s !== undefined);
        if (!nonEmpty) resolutions.splice(fromSourceIdx, 1);
      }

      next.cueTypeResolutions = resolutions;
      onReconciliationChange(next);
    },
    [reconciliation, onReconciliationChange],
  );

  // ── Field mutations ────────────────────────────────────────────────────

  const setFieldLabel = useCallback(
    (idx: number, label: string) => {
      const next = { ...reconciliation };
      next.fieldResolutions = next.fieldResolutions.map((r, i) =>
        i === idx ? { ...r, canonicalLabel: label } : r,
      );
      onReconciliationChange(next);
    },
    [reconciliation, onReconciliationChange],
  );

  const remapFieldSource = useCallback(
    (projectIdx: number, fromFieldIdx: number, toFieldIdx: number | null) => {
      const next = { ...reconciliation };
      const fields = next.fieldResolutions.map((r) => ({
        ...r,
        sourceKeys: [...r.sourceKeys],
      }));

      const from = fields[fromFieldIdx];
      const srcKey = from.sourceKeys[projectIdx];
      if (srcKey === undefined) return;

      if (toFieldIdx === null) {
        // Unmap — keep source on its own resolution
        from.matchKind = 'manual';
      } else {
        from.sourceKeys[projectIdx] = undefined;
        fields[toFieldIdx].sourceKeys[projectIdx] = srcKey;
        fields[toFieldIdx].matchKind = 'manual';
        const nonEmpty = fields[fromFieldIdx].sourceKeys.some((k) => k !== undefined);
        if (!nonEmpty) fields.splice(fromFieldIdx, 1);
      }

      next.fieldResolutions = fields;
      onReconciliationChange(next);
    },
    [reconciliation, onReconciliationChange],
  );

  // ── Computed stats ─────────────────────────────────────────────────────

  const typeWarnings = reconciliation.cueTypeResolutions.filter(
    (r) => r.matchKind !== 'auto',
  ).length;
  const fieldWarnings = reconciliation.fieldResolutions.filter(
    (r) => r.matchKind !== 'auto',
  ).length;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="schema-wrap">
      <div className="screen-heading">Schema reconciliation</div>
      <div className="screen-sub">
        Review how CueTypes and fields are matched across your projects before comparing annotations.
      </div>

      {/* Primary project picker */}
      <div className="schema-section">
        <div className="schema-section-title">Primary project</div>
        <div className="schema-sub">
          The primary project's config (colours, settings) will be used as the base for the merged output.
        </div>
        <div className="schema-primary-row">
          {projects.map((p, i) => (
            <label key={i} className="schema-primary-option">
              <input
                type="radio"
                name="primary"
                checked={reconciliation.primaryProjectIdx === i}
                onChange={() => setPrimary(i)}
              />
              <span className="schema-primary-name">{p.project.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="schema-tabs">
        <button
          className={`schema-tab${activeTab === 'cueTypes' ? ' active' : ''}`}
          onClick={() => setActiveTab('cueTypes')}
        >
          Cue Types
          {typeWarnings > 0 && <span className="schema-badge">{typeWarnings}</span>}
        </button>
        <button
          className={`schema-tab${activeTab === 'fields' ? ' active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          Fields
          {fieldWarnings > 0 && <span className="schema-badge">{fieldWarnings}</span>}
        </button>
      </div>

      {/* ── CueType tab ── */}
      {activeTab === 'cueTypes' && (
        <div className="schema-table-wrap">
          <table className="schema-table">
            <thead>
              <tr>
                <th></th>
                <th>Canonical name <span className="schema-hint">(used in merged output)</span></th>
                {projects.map((p, i) => (
                  <th key={i}>
                    <span
                      className="schema-project-dot"
                      style={{ background: i === reconciliation.primaryProjectIdx ? 'var(--indigo)' : 'var(--text-dim)' }}
                    />
                    {p.project.name}
                  </th>
                ))}
                <th>Remap to</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.cueTypeResolutions.map((res, ri) => {
                const isUnmatched = res.sourceNames.some((s) => s === undefined);
                return (
                  <tr key={ri} className={res.matchKind !== 'auto' ? 'schema-row-warn' : ''}>
                    <td>{statusDot(res.matchKind)}</td>
                    <td>
                      <input
                        className="schema-name-input"
                        value={res.canonicalName}
                        onChange={(e) => setCanonicalName(ri, e.target.value)}
                      />
                    </td>
                    {projects.map((_, pi) => (
                      <td key={pi} className="schema-src-cell">
                        {res.sourceNames[pi] ?? <span className="schema-missing">—</span>}
                      </td>
                    ))}
                    <td>
                      {isUnmatched && (
                        <select
                          className="schema-remap-select"
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const toIdx = parseInt(val);
                            const projectIdx = res.sourceNames.findIndex((s) => s !== undefined);
                            if (projectIdx >= 0) mapTypeToCanonical(projectIdx, ri, toIdx);
                          }}
                        >
                          <option value="">Map to…</option>
                          {reconciliation.cueTypeResolutions.map((r2, r2i) =>
                            r2i !== ri ? (
                              <option key={r2i} value={r2i}>
                                {r2.canonicalName}
                              </option>
                            ) : null,
                          )}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="schema-legend">
            <span className="schema-dot schema-dot-auto" /> auto-matched &nbsp;
            <span className="schema-dot schema-dot-manual" /> needs review &nbsp;
            <span className="schema-dot schema-dot-new" /> new / only in one project
          </div>
        </div>
      )}

      {/* ── Fields tab ── */}
      {activeTab === 'fields' && (
        <div className="schema-table-wrap">
          <table className="schema-table">
            <thead>
              <tr>
                <th></th>
                <th>Canonical key</th>
                <th>Canonical label <span className="schema-hint">(editable)</span></th>
                {projects.map((p, i) => (
                  <th key={i}>
                    <span
                      className="schema-project-dot"
                      style={{ background: i === reconciliation.primaryProjectIdx ? 'var(--indigo)' : 'var(--text-dim)' }}
                    />
                    {p.project.name}
                  </th>
                ))}
                <th>Remap to</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.fieldResolutions.map((res, fi) => {
                const isUnmatched = res.sourceKeys.some((k) => k === undefined);
                const projectsWithField = res.sourceKeys
                  .map((k, pi) => ({ k, pi }))
                  .filter((x) => x.k !== undefined);

                return (
                  <tr key={fi} className={res.matchKind !== 'auto' ? 'schema-row-warn' : ''}>
                    <td>{statusDot(res.matchKind)}</td>
                    <td>
                      <code className="schema-key">{res.canonicalKey}</code>
                    </td>
                    <td>
                      <input
                        className="schema-name-input"
                        value={res.canonicalLabel}
                        onChange={(e) => setFieldLabel(fi, e.target.value)}
                      />
                    </td>
                    {projects.map((_, pi) => (
                      <td key={pi} className="schema-src-cell">
                        {res.sourceKeys[pi] !== undefined ? (
                          <code className="schema-key schema-key-src">{res.sourceKeys[pi]}</code>
                        ) : (
                          <span className="schema-missing">—</span>
                        )}
                      </td>
                    ))}
                    <td>
                      {isUnmatched && projectsWithField.length > 0 && (
                        <select
                          className="schema-remap-select"
                          defaultValue=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const toIdx = parseInt(val);
                            const { pi } = projectsWithField[0];
                            remapFieldSource(pi, fi, toIdx);
                          }}
                        >
                          <option value="">Map to…</option>
                          {reconciliation.fieldResolutions.map((r2, r2i) =>
                            r2i !== fi ? (
                              <option key={r2i} value={r2i}>
                                {r2.canonicalLabel} ({r2.canonicalKey})
                              </option>
                            ) : null,
                          )}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="schema-legend">
            <span className="schema-dot schema-dot-auto" /> auto-matched &nbsp;
            <span className="schema-dot schema-dot-manual" /> label or key differs &nbsp;
            <span className="schema-dot schema-dot-new" /> only in one project
          </div>
        </div>
      )}

      <div className="schema-actions">
        <div className="schema-summary">
          {typeWarnings > 0 && (
            <span className="schema-warn-text">
              {typeWarnings} cue type{typeWarnings > 1 ? 's' : ''} need review
            </span>
          )}
          {fieldWarnings > 0 && (
            <span className="schema-warn-text">
              {fieldWarnings} field{fieldWarnings > 1 ? 's' : ''} need review
            </span>
          )}
          {typeWarnings === 0 && fieldWarnings === 0 && (
            <span className="schema-ok-text">All schemas reconciled</span>
          )}
        </div>
        <button className="btn btn-primary" onClick={onProceed}>
          Proceed to Compare →
        </button>
      </div>
    </div>
  );
}
