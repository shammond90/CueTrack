import {
  CuetationAnnotation,
  CuetationProject,
  CuetationProjectConfig,
  Decisions,
  FieldDefinition,
  Group,
  SchemaReconciliation,
  Sheet,
} from '../types';
import { getMergedRows } from './export';

function randomHex(n: number) {
  const arr = new Uint8Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function newUUID(): string {
  // crypto.randomUUID() is available in all modern browsers (ES2021)
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Fallback (older environments)
  return `${randomHex(4)}-${randomHex(2)}-4${randomHex(2).slice(1)}-${(
    (parseInt(randomHex(1), 16) & 0x3) |
    0x8
  ).toString(16)}${randomHex(2).slice(1)}-${randomHex(6)}`;
}

function formatTs(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':');
}

/**
 * Build a merged .cuetation.json project from the resolved merge data.
 *
 * - Config base = primary project's config
 * - CueType names + cueTypeFields keys updated to canonical names/keys
 * - fieldDefinitions = union using canonical key/label
 * - Annotations assembled from mergedRows, with fresh UUIDs
 */
export function buildMergedCuetationJson(
  projects: CuetationProject[],
  reconciliation: SchemaReconciliation,
  groups: Group[],
  sheets: Sheet[],
  decisions: Decisions,
  accepted: Set<number>,
  discarded: Set<number>,
): CuetationProject {
  const primary = projects[reconciliation.primaryProjectIdx];
  const { cueTypeResolutions, fieldResolutions } = reconciliation;

  // ── Build remapping helpers ─────────────────────────────────────────────

  // primarySourceType → canonicalName
  const typeCanonMap = new Map<string, string>();
  for (const r of cueTypeResolutions) {
    const src = r.sourceNames[reconciliation.primaryProjectIdx];
    if (src !== undefined) typeCanonMap.set(src.toUpperCase(), r.canonicalName);
  }

  // primarySourceKey → canonicalKey
  const fieldCanonMap = new Map<string, string>();
  for (const r of fieldResolutions) {
    const src = r.sourceKeys[reconciliation.primaryProjectIdx];
    if (src !== undefined) fieldCanonMap.set(src, r.canonicalKey);
  }

  // ── Build merged config ──────────────────────────────────────────────────

  // CueTypes: use canonical names in canonical order
  const mergedCueTypes: string[] = cueTypeResolutions.map((r) => r.canonicalName);

  // CueType colours: remap from primary using canonical names
  const mergedCueTypeColors: Record<string, string> = {};
  for (const r of cueTypeResolutions) {
    const srcName = r.sourceNames[reconciliation.primaryProjectIdx];
    const color = srcName
      ? primary.project.config.cueTypeColors[srcName]
      : primary.project.config.cueTypeColors[r.canonicalName];
    if (color) mergedCueTypeColors[r.canonicalName] = color;
  }

  // CueTypeFields: remap from primary using canonical type and field names
  const mergedCueTypeFields: Record<string, string[]> = {};
  for (const r of cueTypeResolutions) {
    const srcName = r.sourceNames[reconciliation.primaryProjectIdx] ?? r.canonicalName;
    const fields = primary.project.config.cueTypeFields[srcName] ?? [];
    mergedCueTypeFields[r.canonicalName] = fields.map((k) => fieldCanonMap.get(k) ?? k);
  }

  // FieldDefinitions: union using canonical keys/labels
  const mergedFieldDefs: FieldDefinition[] = fieldResolutions.map((r) => ({
    key: r.canonicalKey,
    label: r.canonicalLabel,
    tier: r.tier,
    inputType: r.inputType,
    sizeHint: r.sizeHint,
    archived: r.archived,
    defaultLabel: r.canonicalLabel,
  }));

  // visibleColumns: remap from primary
  const primaryCols = primary.project.config.visibleColumns ?? [];
  const mergedVisibleColumns = primaryCols.map((col) => {
    const canonKey = fieldCanonMap.get(col.key) ?? col.key;
    const fieldDef = mergedFieldDefs.find((fd) => fd.key === canonKey);
    return {
      key: canonKey,
      label: fieldDef?.label ?? col.label,
      visible: col.visible,
    };
  });

  const mergedConfig: CuetationProjectConfig = {
    ...primary.project.config,
    cueTypes: mergedCueTypes,
    cueTypeColors: mergedCueTypeColors,
    cueTypeFields: mergedCueTypeFields,
    fieldDefinitions: mergedFieldDefs,
    visibleColumns: mergedVisibleColumns,
  };

  // ── Convert merged rows → annotations ────────────────────────────────────

  const mergedRows = getMergedRows(groups, sheets, decisions, accepted, discarded);
  const now = new Date().toISOString();
  const setKey = `project_${Date.now()}_${randomHex(5)}:0`;

  const annotations: CuetationAnnotation[] = mergedRows.map((row, order) => {
    const ts = parseFloat(row.timestamp_seconds || '0');
    const type = row.type ?? '';

    // Collect all non-meta keys as cue fields
    const skipKeys = new Set([
      'timestamp_seconds', 'timestamp_formatted', 'type', 'time_in_title',
      '_merge_source', '_ann_id', '_ann_status', '_ann_flagged', '_ann_flagNote',
      '_ann_sort_order', '_ann_version', '_ann_createdAt', '_ann_updatedAt',
    ]);

    const cue: Record<string, string> = { type };
    for (const [k, v] of Object.entries(row)) {
      if (!skipKeys.has(k)) cue[k] = v ?? '';
    }

    return {
      id: newUUID(),
      timestamp: ts,
      timeInTitle: row.time_in_title ? parseFloat(row.time_in_title) : null,
      cue,
      createdAt: row._ann_createdAt || now,
      updatedAt: now,
      status: row._ann_status || 'provisional',
      flagged: row._ann_flagged === 'true',
      flagNote: row._ann_flagNote || '',
      sort_order: order,
      version: (parseInt(row._ann_version || '1') || 1) + 1,
      deleted: false,
    };
  });

  // ── Assemble output project ───────────────────────────────────────────────

  const mergedProject: CuetationProject = {
    cuetation_version: primary.cuetation_version,
    exported_at: now,
    project: {
      ...primary.project,
      name: `${primary.project.name} (merged)`,
      updated_at: Date.now(),
      config: mergedConfig,
      columns: mergedVisibleColumns,
    },
    annotations: { [setKey]: annotations },
  };

  return mergedProject;
}

/** Trigger download of a .cuetation.json file */
export function exportMergedJson(
  projects: CuetationProject[],
  reconciliation: SchemaReconciliation,
  groups: Group[],
  sheets: Sheet[],
  decisions: Decisions,
  accepted: Set<number>,
  discarded: Set<number>,
): void {
  const merged = buildMergedCuetationJson(
    projects, reconciliation, groups, sheets, decisions, accepted, discarded,
  );
  const json = JSON.stringify(merged, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${merged.project.name.replace(/\s+/g, '_')}.cuetation.json`;
  a.click();
  URL.revokeObjectURL(url);
}
