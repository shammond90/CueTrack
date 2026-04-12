import { useState, useRef, useEffect, useCallback } from 'react';
import { Decisions, Group, Sheet } from '../types';
import { getBadgeClass } from '../lib/utils';

interface ReviewScreenProps {
  groups: Group[];
  conflictGroups: Group[];
  sheets: Sheet[];
  decisions: Decisions;
  accepted: Set<number>;
  currentConflictIdx: number;
  onSetConflictIdx: (idx: number) => void;
  onDecisionsChange: (d: Decisions) => void;
  onAcceptGroup: (id: number) => void;
  onDiscardUnique: (id: number) => void;
  onGoToExport: () => void;
}

export default function ReviewScreen({
  conflictGroups,
  sheets,
  decisions,
  accepted,
  currentConflictIdx,
  onSetConflictIdx,
  onDecisionsChange,
  onAcceptGroup,
  onDiscardUnique,
  onGoToExport,
}: ReviewScreenProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const [videoDragOver, setVideoDragOver] = useState(false);

  // Splitter state
  const [topFlex, setTopFlex] = useState(66);
  const [rightWidth, setRightWidth] = useState(380);

  const group = conflictGroups[currentConflictIdx];
  const total = conflictGroups.length;
  const resolved = conflictGroups.filter(
    (g) => accepted.has(g.id) || (decisions[g.id] && Object.keys(decisions[g.id]).length > 0),
  ).length;

  // Seek video when conflict changes
  useEffect(() => {
    if (videoRef.current && group) {
      videoRef.current.currentTime = group.canonTs;
    }
  }, [currentConflictIdx, group, videoUrl]);

  function loadVideo(file: File) {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }

  function nextConflict() {
    if (currentConflictIdx < conflictGroups.length - 1) {
      onSetConflictIdx(currentConflictIdx + 1);
    } else {
      onGoToExport();
    }
  }

  function prevConflict() {
    if (currentConflictIdx > 0) onSetConflictIdx(currentConflictIdx - 1);
  }

  function chooseField(groupId: number, field: string, value: string) {
    const newDecs = { ...decisions };
    if (!newDecs[groupId]) newDecs[groupId] = {};
    newDecs[groupId] = { ...newDecs[groupId], [field]: value };
    onDecisionsChange(newDecs);
  }

  function acceptResolution() {
    if (!group) return;
    onAcceptGroup(group.id);
    nextConflict();
  }

  function includeUnique(id: number) {
    onAcceptGroup(id);
    nextConflict();
  }

  function discardUnique(id: number) {
    onDiscardUnique(id);
    nextConflict();
  }

  // Horizontal splitter drag
  const leftColRef = useRef<HTMLDivElement>(null);
  const onSplitterHDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startFlex = topFlex;
      const totalH = leftColRef.current?.offsetHeight || 1;
      const onMove = (ev: MouseEvent) => {
        const dy = ev.clientY - startY;
        const dPct = (dy / totalH) * 100;
        setTopFlex(Math.max(10, Math.min(90, startFlex + dPct)));
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [topFlex],
  );

  // Vertical splitter drag
  const rightColRef = useRef<HTMLDivElement>(null);
  const onSplitterVDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = rightColRef.current?.offsetWidth || 380;
      const onMove = (ev: MouseEvent) => {
        const dx = startX - ev.clientX;
        setRightWidth(Math.max(240, Math.min(window.innerWidth * 0.6, startWidth + dx)));
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [],
  );

  return (
    <div className="review-container">
      <input
        type="file"
        ref={videoFileRef}
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) loadVideo(e.target.files[0]);
        }}
      />

      {/* LEFT COLUMN */}
      <div className="review-left-col" ref={leftColRef}>
        <div className="review-video-area" style={{ flex: `${topFlex} 0 0` }}>
          {videoUrl ? (
            <video ref={videoRef} controls preload="metadata" src={videoUrl} />
          ) : (
            <div
              className={`video-drop-zone${videoDragOver ? ' drag-over' : ''}`}
              onClick={() => videoFileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setVideoDragOver(true); }}
              onDragLeave={() => setVideoDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setVideoDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith('video/')) loadVideo(file);
              }}
            >
              <span style={{ fontSize: 24 }}>🎬</span>
              <span>Drop video or click to load</span>
            </div>
          )}
        </div>

        <div className="splitter-h" onMouseDown={onSplitterHDown} />

        <div className="review-conflict-area" style={{ flex: `${100 - topFlex} 0 0` }}>
          <div style={{
            padding: '8px 16px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {resolved} of {total} conflicts resolved
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={prevConflict}>← Prev</button>
              <button className="btn btn-sm" onClick={nextConflict}>Next →</button>
            </span>
          </div>
          <div className="conflict-list-wrap">
            {conflictGroups.map((g, i) => {
              const isActive = i === currentConflictIdx;
              const isResolved = accepted.has(g.id) || (decisions[g.id] && Object.keys(decisions[g.id]).length > 0);
              return (
                <div
                  key={g.id}
                  className={`conflict-item${isActive ? ' active' : ''}${isResolved ? ' resolved' : ''}`}
                  onClick={() => onSetConflictIdx(i)}
                >
                  <div className="ci-header">
                    <span className={`badge ${getBadgeClass(g.type)}`}>{g.type}</span>
                    <span className="ci-what">{g.canonWhat || '—'}</span>
                    <span
                      className={`status-badge ${g.status === 'conflict' ? 's-conflict' : 's-unique'}`}
                      style={{ fontSize: 9, padding: '1px 6px' }}
                    >
                      {g.status}
                    </span>
                    <span className="ci-tc">{g.canonTsFormatted}</span>
                  </div>
                  <div className="ci-detail">
                    {g.status === 'conflict'
                      ? g.conflictFields
                          .map((f) => `${f.field}: ${f.values.map((v) => `${sheets[v.sheetIdx]?.person}: ${v.val}`).join(' · ')}`)
                          .join(' | ')
                      : `Only in: ${sheets[g.sheetsInCluster[0]]?.person}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* VERTICAL SPLITTER */}
      <div className="splitter-v" onMouseDown={onSplitterVDown} />

      {/* RIGHT COLUMN */}
      <div className="review-right-col" ref={rightColRef} style={{ width: rightWidth }}>
        {group ? (
          <ResolutionPanel
            group={group}
            sheets={sheets}
            decisions={decisions[group.id] || {}}
            total={total}
            resolved={resolved}
            onChooseField={(field, val) => chooseField(group.id, field, val)}
            onAccept={acceptResolution}
            onSkip={nextConflict}
            onIncludeUnique={() => includeUnique(group.id)}
            onDiscardUnique={() => discardUnique(group.id)}
          />
        ) : (
          <>
            <div className="resolution-header">
              <div className="empty-resolution">
                <div style={{ fontSize: 24 }}>←</div>
                Select a conflict from the list to review it
              </div>
            </div>
            <div className="resolution-scroll" />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Resolution Panel ── */
interface ResolutionPanelProps {
  group: Group;
  sheets: Sheet[];
  decisions: Record<string, string>;
  total: number;
  resolved: number;
  onChooseField: (field: string, val: string) => void;
  onAccept: () => void;
  onSkip: () => void;
  onIncludeUnique: () => void;
  onDiscardUnique: () => void;
}

function ResolutionPanel({
  group,
  sheets,
  decisions,
  total,
  resolved,
  onChooseField,
  onAccept,
  onSkip,
  onIncludeUnique,
  onDiscardUnique,
}: ResolutionPanelProps) {
  const pct = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const progressBar = (
    <div className="progress-wrap">
      <div className="progress-label">{resolved} of {total} reviewed</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );

  if (group.status === 'unique') {
    const r = group.cluster[0];
    const fields = ['what', 'cue_number', 'duration', 'delay', 'when', 'cue_sheet_notes'];
    return (
      <>
        <div className="resolution-header">
          <div className="res-label">Resolving unique</div>
          <div className="res-cue">
            <span className={`badge ${getBadgeClass(group.type)}`}>{group.type}</span>
            <span className="res-title">{group.canonWhat || '—'}</span>
            <span className="res-tc">{group.canonTsFormatted}</span>
          </div>
        </div>
        <div className="resolution-scroll">
          {progressBar}
          <div className="res-field">
            <div className="field-name">Source</div>
            <div style={{
              padding: '10px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--text-mid)',
            }}>
              Only annotated by <strong style={{ color: 'var(--text)' }}>{sheets[group.sheetsInCluster[0]]?.person}</strong>
            </div>
          </div>
          <div className="res-field">
            <div className="field-name">All values</div>
            {fields.filter((f) => r[f]).map((f) => (
              <div
                key={f}
                style={{
                  display: 'flex', gap: 8, padding: '4px 0',
                  borderBottom: '1px solid var(--border)', fontSize: 11,
                }}
              >
                <span style={{ color: 'var(--text-dim)', width: 120, fontFamily: 'var(--mono)' }}>{f}</span>
                <span style={{ color: 'var(--text)' }}>{r[f]}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button className="btn btn-green" style={{ flex: 1 }} onClick={onIncludeUnique}>+ Include this cue</button>
            <button className="btn" style={{ flex: 1 }} onClick={onDiscardUnique}>Discard</button>
          </div>
        </div>
      </>
    );
  }

  // Conflict
  const agreedFields = ['what', 'cue_number', 'duration'].filter(
    (f) => !group.conflictFields.some((cf) => cf.field === f) && group.cluster.some((r) => (r[f] || '').trim()),
  );

  return (
    <>
      <div className="resolution-header">
        <div className="res-label">Resolving conflict</div>
        <div className="res-cue">
          <span className={`badge ${getBadgeClass(group.type)}`}>{group.type}</span>
          <span className="res-title">{group.canonWhat || '—'}</span>
          <span className="res-tc">{group.canonTsFormatted}</span>
        </div>
      </div>
      <div className="resolution-scroll">
        {progressBar}
        {group.conflictFields.map((cf) => {
          const chosen = decisions[cf.field];
          return (
            <div key={cf.field} className="res-field">
              <div className="field-name">{cf.field}</div>
              <div className="field-options">
                {cf.values.map((v, vi) => {
                  const sheet = sheets[v.sheetIdx];
                  const isChosen = chosen === v.val;
                  return (
                    <div
                      key={vi}
                      className={`field-option${isChosen ? ' chosen' : ''}`}
                      onClick={() => onChooseField(cf.field, v.val)}
                    >
                      <div className="opt-radio">{isChosen && <div className="radio-dot" />}</div>
                      <span className="opt-val">{v.val}</span>
                      <span className="opt-source">
                        <span className={`opt-src-dot pd-${v.sheetIdx}`} style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%' }} />
                        {' '}{sheet?.person || `Sheet ${v.sheetIdx + 1}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <CustomValueRow
                chosen={chosen}
                values={cf.values}
                onChoose={(val) => onChooseField(cf.field, val)}
              />
            </div>
          );
        })}

        {agreedFields.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 4 }}>
            <div className="field-name" style={{ marginBottom: 8 }}>
              Agreed fields <span style={{ color: 'var(--green)', fontSize: 9 }}>✓</span>
            </div>
            {agreedFields.map((f) => {
              const match = group.cluster.find((r) => ((r as Record<string, string>)[f] || '').trim());
              const val = match ? (match as Record<string, string>)[f] || '' : '';
              if (!val) return null;
              return (
                <div
                  key={f}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', background: 'var(--green-bg)',
                    border: '1px solid var(--green-border)', borderRadius: 6,
                    marginBottom: 4, fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--green)' }}>✓</span>
                  <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--mono)', fontSize: 10, width: 80 }}>{f}</span>
                  <span style={{ color: 'var(--text)' }}>{val}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="resolution-footer">
        <button className="btn" style={{ flex: 1 }} onClick={onSkip}>Skip</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onAccept}>Accept →</button>
      </div>
    </>
  );
}

/* ── Custom Value Row ── */
function CustomValueRow({
  chosen,
  values,
  onChoose,
}: {
  chosen: string | undefined;
  values: { sheetIdx: number; val: string }[];
  onChoose: (val: string) => void;
}) {
  const isCustom = chosen && !values.some((v) => v.val === chosen);
  const [customVal, setCustomVal] = useState(isCustom ? chosen : '');

  return (
    <div className="custom-row">
      <input
        className="custom-input"
        placeholder="Custom value…"
        value={customVal}
        onChange={(e) => setCustomVal(e.target.value)}
      />
      <button className="btn btn-sm" onClick={() => { if (customVal) onChoose(customVal); }}>Set</button>
    </div>
  );
}
