import { CuetationProject, CuetationAnnotation, SchemaReconciliation, Sheet } from '../types';

/** Parse and basic-validate a .cuetation.json file. */
export async function parseCuetationJson(file: File): Promise<CuetationProject> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${file.name}: not valid JSON`);
  }

  const p = parsed as Record<string, unknown>;
  if (!p.project || !p.annotations) {
    throw new Error(`${file.name}: missing required fields (project, annotations)`);
  }

  const project = p.project as Record<string, unknown>;
  const config = project.config as Record<string, unknown> | undefined;
  if (!config || !Array.isArray(config.cueTypes)) {
    throw new Error(`${file.name}: missing config.cueTypes`);
  }

  return p as unknown as CuetationProject;
}

/** Format seconds to HH:MM:SS */
function formatTs(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':');
}

/**
 * Flatten all annotations from a parsed project into a Sheet (list of flat rows),
 * applying the SchemaReconciliation to remap CueType names and field keys to
 * canonical values so they can be compared across projects.
 */
export function normalizeToSheet(
  project: CuetationProject,
  projectIdx: number,
  reconciliation: SchemaReconciliation,
  color: string,
  filename: string,
  person: string,
): Sheet {
  // Build CueType name → canonical name map for this project
  const typeMap = new Map<string, string>();
  for (const res of reconciliation.cueTypeResolutions) {
    const src = res.sourceNames[projectIdx];
    if (src !== undefined) typeMap.set(src.toUpperCase(), res.canonicalName.toUpperCase());
  }

  // Build source field key → canonical field key map for this project
  const fieldKeyMap = new Map<string, string>();
  for (const res of reconciliation.fieldResolutions) {
    const srcKey = res.sourceKeys[projectIdx];
    if (srcKey !== undefined) fieldKeyMap.set(srcKey, res.canonicalKey);
  }

  // Collect all annotations across all sets, deduplicating by ID.
  // A project exported after a video is attached often has two sets with the
  // same annotations stored under different keys (project key + video key).
  const seen = new Set<string>();
  const allAnnotations: CuetationAnnotation[] = [];
  for (const annotationList of Object.values(project.annotations)) {
    for (const ann of annotationList as CuetationAnnotation[]) {
      if (ann.deleted) continue;
      if (seen.has(ann.id)) continue;
      seen.add(ann.id);
      allAnnotations.push(ann);
    }
  }

  const rows: Record<string, string>[] = [];

  for (const ann of allAnnotations) {
      const ts = ann.timestamp ?? 0;
      const rawType = (ann.cue?.type ?? '').toUpperCase();
      const canonType = typeMap.get(rawType) ?? rawType;

      const row: Record<string, string> = {
        timestamp_seconds: String(ts),
        timestamp_formatted: formatTs(ts),
        type: canonType,
        time_in_title: ann.timeInTitle !== null && ann.timeInTitle !== undefined
          ? String(ann.timeInTitle)
          : '',
        // keep original annotation metadata for JSON re-export
        _ann_id: ann.id,
        _ann_status: ann.status ?? '',
        _ann_flagged: ann.flagged ? 'true' : 'false',
        _ann_flagNote: ann.flagNote ?? '',
        _ann_sort_order: String(ann.sort_order ?? 0),
        _ann_version: String(ann.version ?? 1),
        _ann_createdAt: ann.createdAt ?? '',
        _ann_updatedAt: ann.updatedAt ?? '',
      };

      // Map cue fields using canonical key names
      for (const [k, v] of Object.entries(ann.cue ?? {})) {
        if (k === 'type') continue; // already handled
        const canonKey = fieldKeyMap.get(k) ?? k;
        row[canonKey] = String(v ?? '');
      }

      rows.push(row);
  }

  return { filename, person, rows, color };
}
