import { useState, useRef, useEffect, useCallback, type MouseEvent as ReactMouseEvent } from 'react';
import { Decisions, Group, Sheet } from '../types';
import { getBadgeClass, getSectionLabel, buildMergedPreview, SKIP_FIELDS_MERGED } from '../lib/utils';

interface CompareScreenProps {
  groups: Group[];
  sheets: Sheet[];
  decisions: Decisions;
  accepted: Set<number>;
  onDecisionsChange: (d: Decisions) => void;
  onAcceptGroup: (id: number) => void;
  onAcceptAllClean: () => void;
  onGoToReview: () => void;
  onOpenConflict: (id: number) => void;
}

export default function CompareScreen({
  groups,
  sheets,
  decisions,
  accepted,
  onDecisionsChange,
  onAcceptGroup,
  onAcceptAllClean,
  onGoToReview,
  onOpenConflict,
}: CompareScreenProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ groupId: number; sheetIdx: number; rect: DOMRect } | null>(null);
  const [editor, setEditor] = useState<{ groupId: number; rect: DOMRect } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const nClean = groups.filter((g) => g.status === 'clean').length;
  const nConflict = groups.filter((g) => g.status === 'conflict').length;
  const nUnique = groups.filter((g) => g.status === 'unique').length;

  const toggleFilter = (s: string) => setFilter((prev) => (prev === s ? null : s));

  // Close popover/editor on click outside or Escape
  useEffect(() => {
    function handleClick(e: globalThis.MouseEvent) {
      if (popover && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
      if (editor && editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setEditor(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setPopover(null);
        setEditor(null);
      }
    }
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [popover, editor]);

  function showCellPopover(e: ReactMouseEvent, groupId: number, sheetIdx: number) {
    e.stopPropagation();
    setEditor(null);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    // Pre-select clicked sheet's values for un-decided fields
    const group = groups.find((g) => g.id === groupId)!;
    const newDecs = { ...decisions };
    if (!newDecs[groupId]) newDecs[groupId] = {};
    group.conflictFields.forEach((cf) => {
      const sheetVal = cf.values.find((v) => v.sheetIdx === sheetIdx);
      if (sheetVal) newDecs[groupId][cf.field] = sheetVal.val;
    });
    onDecisionsChange(newDecs);
    setPopover({ groupId, sheetIdx, rect });
  }

  function popChooseField(groupId: number, field: string, value: string) {
    const newDecs = { ...decisions };
    if (!newDecs[groupId]) newDecs[groupId] = {};
    newDecs[groupId] = { ...newDecs[groupId], [field]: value };
    onDecisionsChange(newDecs);
  }

  function applyPopover(groupId: number) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const decs = decisions[groupId] || {};
    const allResolved = group.conflictFields.every((cf) => decs[cf.field]);
    if (allResolved) onAcceptGroup(groupId);
    setPopover(null);
  }

  function openMergedEditor(e: ReactMouseEvent, groupId: number) {
    e.stopPropagation();
    setPopover(null);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEditor({ groupId, rect });
  }

  function saveMergedEditor(groupId: number, editorValues: Record<string, string>) {
    const newDecs = { ...decisions };
    if (!newDecs[groupId]) newDecs[groupId] = {};
    newDecs[groupId] = { ...newDecs[groupId], ...editorValues };
    onDecisionsChange(newDecs);

    const group = groups.find((g) => g.id === groupId);
    if (group && !accepted.has(groupId)) {
      const decs = newDecs[groupId];
      const allResolved = !group.conflictFields.length || group.conflictFields.every((cf) => decs[cf.field]);
      if (allResolved || group.status === 'clean' || group.status === 'unique') {
        onAcceptGroup(groupId);
      }
    }
    setEditor(null);
  }

  // Render rows
  let lastSection = '';
  const rows: React.ReactElement[] = [];

  const filteredGroups = filter ? groups.filter((g) => g.status === filter) : groups;

  filteredGroups.forEach((group) => {
    const section = getSectionLabel(group.canonTs);
    if (section !== lastSection) {
      lastSection = section;
      rows.push(
        <tr key={`section-${section}-${group.id}`} className="section-header">
          <td colSpan={2 + sheets.length}>{section}</td>
        </tr>,
      );
    }
    rows.push(
      <GroupRow
        key={group.id}
        group={group}
        sheets={sheets}
        decisions={decisions[group.id] || {}}
        isAccepted={accepted.has(group.id)}
        onAccept={() => onAcceptGroup(group.id)}
        onOpenConflict={() => onOpenConflict(group.id)}
        onCellClick={(e, si) => showCellPopover(e, group.id, si)}
        onMergedClick={(e) => openMergedEditor(e, group.id)}
      />,
    );
  });

  const colW = Math.floor(60 / sheets.length);

  return (
    <>
      <div className="compare-toolbar">
        <div
          className={`stat-pill pill-clean${filter === 'clean' ? ' active-filter' : ''}`}
          onClick={() => toggleFilter('clean')}
        >
          <div className="stat-dot" />
          {nClean} matched
        </div>
        <div
          className={`stat-pill pill-conflict${filter === 'conflict' ? ' active-filter' : ''}`}
          onClick={() => toggleFilter('conflict')}
        >
          <div className="stat-dot" />
          {nConflict} conflicts
        </div>
        <div
          className={`stat-pill pill-unique${filter === 'unique' ? ' active-filter' : ''}`}
          onClick={() => toggleFilter('unique')}
        >
          <div className="stat-dot" />
          {nUnique} unique
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-green" onClick={onAcceptAllClean}>
            ✓ Accept all matched ({nClean})
          </button>
          <button className="btn btn-sm btn-primary" onClick={onGoToReview}>
            Review conflicts →
          </button>
        </div>
      </div>

      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Cue</th>
              {sheets.map((s, i) => (
                <th key={i} style={{ width: `${colW}%` }}>
                  <span className={`opt-src-dot pd-${i}`} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 4 }} />
                  {s.person}
                </th>
              ))}
              <th style={{ width: '15%' }}>Merged</th>
              <th style={{ width: '10%' }}>Status</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>

      {popover && <CellPopover
        ref={popoverRef}
        group={groups.find((g) => g.id === popover.groupId)!}
        sheets={sheets}
        decisions={decisions[popover.groupId] || {}}
        rect={popover.rect}
        onChoose={(field, val) => popChooseField(popover.groupId, field, val)}
        onApply={() => applyPopover(popover.groupId)}
        onClose={() => setPopover(null)}
      />}

      {editor && <MergedEditor
        ref={editorRef}
        group={groups.find((g) => g.id === editor.groupId)!}
        decisions={decisions[editor.groupId] || {}}
        rect={editor.rect}
        onSave={(vals) => saveMergedEditor(editor.groupId, vals)}
        onClose={() => setEditor(null)}
      />}
    </>
  );
}

/* ── GroupRow ── */
interface GroupRowProps {
  group: Group;
  sheets: Sheet[];
  decisions: Record<string, string>;
  isAccepted: boolean;
  onAccept: () => void;
  onOpenConflict: () => void;
  onCellClick: (e: ReactMouseEvent, sheetIdx: number) => void;
  onMergedClick: (e: ReactMouseEvent) => void;
}

function GroupRow({ group, sheets, decisions, isAccepted, onAccept, onOpenConflict, onCellClick, onMergedClick }: GroupRowProps) {
  const cls = `row-${group.status}${group.isStructural ? ' row-structural' : ''}${isAccepted ? ' accepted' : ''}`;
  const preview = buildMergedPreview(group, decisions);
  const previewFields = ['cue_number', 'duration', 'delay', 'when', 'how', 'who', 'cue_sheet_notes'];

  let mergedContent: React.ReactElement;
  if (isAccepted || group.status === 'clean') {
    const what = preview.what || group.canonWhat || '—';
    mergedContent = (
      <>
        <span className="merged-edit-icon">✏️</span>
        <div className="merged-what">{what}</div>
        {previewFields.map((f) =>
          preview[f] ? (
            <div key={f} className="merged-field">
              <span className="mf-label">{f}:</span> <span className="mf-val">{preview[f]}</span>
            </div>
          ) : null,
        )}
      </>
    );
  } else if (group.status === 'conflict') {
    const resolvedCount = group.conflictFields.filter((cf) => decisions[cf.field]).length;
    const total = group.conflictFields.length;
    if (resolvedCount > 0) {
      const what = preview.what || group.canonWhat || '—';
      mergedContent = (
        <>
          <span className="merged-edit-icon">✏️</span>
          <div className="merged-what" style={{ opacity: 0.7 }}>{what}</div>
          <div className="merged-field">
            <span className="mf-label">{resolvedCount}/{total} fields resolved</span>
          </div>
        </>
      );
    } else {
      mergedContent = <span className="merged-pending">— pending</span>;
    }
  } else {
    mergedContent = <span className="merged-pending">— pending</span>;
  }

  let statusContent: React.ReactElement;
  if (group.status === 'clean') {
    statusContent = (
      <>
        <span className="status-badge s-clean">Matched</span><br />
        <button className="btn btn-xs btn-green" onClick={onAccept}>✓ Accept</button>
      </>
    );
  } else if (group.status === 'conflict') {
    statusContent = (
      <>
        <span className="status-badge s-conflict">Conflict</span><br />
        <button className="btn btn-xs btn-yellow" onClick={onOpenConflict}>Review →</button>
      </>
    );
  } else {
    statusContent = (
      <>
        <span className="status-badge s-unique">Unique</span><br />
        <button className="btn btn-xs btn-blue" onClick={onAccept}>+ Include</button>
      </>
    );
  }

  return (
    <tr className={cls} data-status={group.status}>
      <td className="td-cue">
        <div className="cue-type-row">
          <span className={`badge ${getBadgeClass(group.type)}`}>{group.type}</span>
          <span className="cue-tc">{group.canonTsFormatted}</span>
        </div>
        {group.canonWhat && <div className="cue-what">{group.canonWhat}</div>}
      </td>
      {sheets.map((_, si) => {
        const sheetRows = group.cluster.filter((r) => r._sheetIdx === si);
        if (!sheetRows.length) {
          return <td key={si} className="td-sheet"><span className="cell-empty">—</span></td>;
        }
        const r = sheetRows[0];
        const extraParts: string[] = [];
        if (r.cue_number) extraParts.push(`#${r.cue_number}`);
        if (r.duration) extraParts.push(`dur:${r.duration}`);
        const conflictFields = group.conflictFields.filter((cf) => cf.values.some((v) => v.sheetIdx === si));
        const isClickable = group.status === 'conflict' && conflictFields.length > 0;

        return (
          <td
            key={si}
            className={`td-sheet${isClickable ? ' clickable' : ''}`}
            onClick={isClickable ? (e) => onCellClick(e, si) : undefined}
          >
            {r.timestamp_formatted && <div className="cue-tc">{r.timestamp_formatted}</div>}
            <div className="sheet-what">{r.what || '—'}</div>
            {extraParts.length > 0 && <div className="sheet-extra">{extraParts.join(' · ')}</div>}
            {conflictFields.map((cf) => {
              const v = cf.values.find((x) => x.sheetIdx === si);
              return v ? <div key={cf.field} className="conflict-val">⚠ {cf.field}: {v.val}</div> : null;
            })}
          </td>
        );
      })}
      <td className="td-merged" onClick={onMergedClick}>{mergedContent}</td>
      <td className="td-status">{statusContent}</td>
    </tr>
  );
}

/* ── CellPopover ── */
import { forwardRef } from 'react';

interface CellPopoverProps {
  group: Group;
  sheets: Sheet[];
  decisions: Record<string, string>;
  rect: DOMRect;
  onChoose: (field: string, val: string) => void;
  onApply: () => void;
  onClose: () => void;
}

const CellPopover = forwardRef<HTMLDivElement, CellPopoverProps>(
  ({ group, sheets, decisions, rect, onChoose, onApply, onClose }, ref) => {
    const popRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        (popRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;

        if (node) {
          const popRect = node.getBoundingClientRect();
          let top = rect.bottom + 4;
          let left = rect.left;
          if (top + popRect.height > window.innerHeight) top = rect.top - popRect.height - 4;
          if (left + popRect.width > window.innerWidth) left = window.innerWidth - popRect.width - 8;
          setPos({ top, left: Math.max(4, left) });
        }
      },
      [rect, ref],
    );

    return (
      <div
        className="cell-popover"
        ref={setRefs}
        style={pos ? { top: pos.top, left: pos.left } : { top: rect.bottom + 4, left: rect.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cell-popover-header">
          <span className={`badge ${getBadgeClass(group.type)}`}>{group.type}</span>
          <span>{group.canonWhat || '—'}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10 }}>{group.canonTsFormatted}</span>
        </div>
        <div className="cell-popover-body">
          {group.conflictFields.map((cf) => {
            const chosen = decisions[cf.field];
            return (
              <div key={cf.field} className="pop-field">
                <div className="pop-field-name">{cf.field}</div>
                {cf.values.map((v, vi) => {
                  const s = sheets[v.sheetIdx];
                  const isChosen = chosen === v.val;
                  return (
                    <div
                      key={vi}
                      className={`pop-option${isChosen ? ' chosen' : ''}`}
                      onClick={() => onChoose(cf.field, v.val)}
                    >
                      <div className="opt-radio">{isChosen && <div className="radio-dot" />}</div>
                      <span className="opt-val">{v.val}</span>
                      <span className="opt-source">
                        <span className={`opt-src-dot pd-${v.sheetIdx}`} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%' }} />
                        {' '}{s?.person || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="cell-popover-footer">
          <button className="btn btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-xs btn-primary" onClick={onApply}>Apply</button>
        </div>
      </div>
    );
  },
);

/* ── MergedEditor ── */
interface MergedEditorProps {
  group: Group;
  decisions: Record<string, string>;
  rect: DOMRect;
  onSave: (values: Record<string, string>) => void;
  onClose: () => void;
}

const MergedEditor = forwardRef<HTMLDivElement, MergedEditorProps>(
  ({ group, decisions, rect, onSave, onClose }, ref) => {
    const preview = buildMergedPreview(group, decisions);
    const allKeys = [...new Set(group.cluster.flatMap((r) => Object.keys(r)))];
    const editableFields = allKeys.filter((f) => !SKIP_FIELDS_MERGED.has(f));

    const [values, setValues] = useState<Record<string, string>>(() => {
      const v: Record<string, string> = {};
      editableFields.forEach((f) => (v[f] = (preview[f] || '').toString()));
      return v;
    });

    const edRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        (edRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;

        if (node) {
          const edRect = node.getBoundingClientRect();
          let top = rect.top;
          let left = rect.right + 6;
          if (left + edRect.width > window.innerWidth) left = rect.left - edRect.width - 6;
          if (top + edRect.height > window.innerHeight) top = window.innerHeight - edRect.height - 8;
          if (top < 4) top = 4;
          setPos({ top, left: Math.max(4, left) });
        }
      },
      [rect, ref],
    );

    return (
      <div
        className="merged-editor"
        ref={setRefs}
        style={pos ? { top: pos.top, left: pos.left } : { top: rect.top, left: rect.right + 6 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="merged-editor-header">
          <span>Edit merged values</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--mono)' }}>{group.canonTsFormatted}</span>
        </div>
        <div className="merged-editor-body">
          {editableFields.map((f) => {
            const val = values[f] || '';
            const needsTextarea = val.length > 60 || f === 'cue_sheet_notes' || f === 'notes';
            return (
              <div key={f} className="me-field">
                <label>{f}</label>
                {needsTextarea ? (
                  <textarea
                    rows={2}
                    value={val}
                    onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                  />
                ) : (
                  <input
                    value={val}
                    onChange={(e) => setValues({ ...values, [f]: e.target.value })}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="merged-editor-footer">
          <button className="btn btn-xs" onClick={onClose}>Cancel</button>
          <button className="btn btn-xs btn-primary" onClick={() => onSave(values)}>Save</button>
        </div>
      </div>
    );
  },
);
