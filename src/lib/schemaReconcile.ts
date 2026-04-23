import {
  CuetationProject,
  CueTypeResolution,
  FieldResolution,
  SchemaReconciliation,
} from '../types';

/**
 * Auto-reconcile CueTypes and FieldDefinitions across multiple projects.
 *
 * Auto-match rules:
 *   CueType:  label match is case-insensitive; identical → 'auto'
 *   Field:    key match (exact) → 'auto'; key differs but label matches (case-insensitive) → 'manual' (flagged)
 *
 * The primary project's ordering is used as the canonical order for both
 * cueTypes and fieldDefinitions.
 */
export function autoReconcile(
  projects: CuetationProject[],
  primaryIdx: number,
): SchemaReconciliation {
  const n = projects.length;
  const primary = projects[primaryIdx];

  // ── CueType reconciliation ────────────────────────────────────────────────

  // Start with primary project's cueTypes (canonical order)
  const cueTypeResolutions: CueTypeResolution[] = primary.project.config.cueTypes.map((t) => {
    const sourceNames: (string | undefined)[] = Array(n).fill(undefined);
    sourceNames[primaryIdx] = t;
    return { canonicalName: t, sourceNames, matchKind: 'auto' };
  });

  // For each other project, try to match their cueTypes to existing resolutions
  for (let pi = 0; pi < n; pi++) {
    if (pi === primaryIdx) continue;
    const proj = projects[pi];

    for (const t of proj.project.config.cueTypes) {
      const tNorm = t.toUpperCase();

      // Try exact (case-insensitive) match against existing canonical names
      const existing = cueTypeResolutions.find(
        (r) => r.canonicalName.toUpperCase() === tNorm,
      );

      if (existing) {
        existing.sourceNames[pi] = t;
        if (existing.matchKind === 'new') existing.matchKind = 'manual';
      } else {
        // No match — add as unresolved entry (sourceNames only set for this project)
        const sourceNames: (string | undefined)[] = Array(n).fill(undefined);
        sourceNames[pi] = t;
        cueTypeResolutions.push({
          canonicalName: t,
          sourceNames,
          matchKind: 'manual', // unmatched across projects — needs user attention
        });
      }
    }
  }

  // Mark entries that appear in all projects and had exact matches as 'auto'
  cueTypeResolutions.forEach((r) => {
    const defined = r.sourceNames.filter((s) => s !== undefined);
    const allSameName = defined.every((s) => s!.toUpperCase() === r.canonicalName.toUpperCase());
    if (allSameName && defined.length === n) r.matchKind = 'auto';
  });

  // ── Field definition reconciliation ──────────────────────────────────────

  // Collect all fieldDefinitions from all projects, keyed by field key
  const fieldMap = new Map<string, FieldResolution>();

  // Process primary project first to establish canonical order
  for (const fd of primary.project.config.fieldDefinitions) {
    if (!fieldMap.has(fd.key)) {
      const sourceKeys: (string | undefined)[] = Array(n).fill(undefined);
      sourceKeys[primaryIdx] = fd.key;
      fieldMap.set(fd.key, {
        canonicalKey: fd.key,
        canonicalLabel: fd.label,
        tier: fd.tier,
        inputType: fd.inputType,
        sizeHint: fd.sizeHint,
        archived: fd.archived,
        sourceKeys,
        matchKind: 'auto',
      });
    }
  }

  // Process other projects
  for (let pi = 0; pi < n; pi++) {
    if (pi === primaryIdx) continue;

    for (const fd of projects[pi].project.config.fieldDefinitions) {
      const existingByKey = fieldMap.get(fd.key);

      if (existingByKey) {
        // Same key — auto-match
        existingByKey.sourceKeys[pi] = fd.key;
        // Label mismatch: flag so user can decide canonical label
        if (existingByKey.matchKind === 'auto' && fd.label !== existingByKey.canonicalLabel) {
          existingByKey.matchKind = 'manual';
        }
      } else {
        // Different key — check if label matches an existing field (possible rename)
        const labelNorm = fd.label.toLowerCase();
        const existingByLabel = [...fieldMap.values()].find(
          (r) => r.canonicalLabel.toLowerCase() === labelNorm,
        );

        if (existingByLabel) {
          // Same label, different key — likely a renamed field; flag for user
          existingByLabel.sourceKeys[pi] = fd.key;
          existingByLabel.matchKind = 'manual';
        } else {
          // Entirely new field from this project
          const sourceKeys: (string | undefined)[] = Array(n).fill(undefined);
          sourceKeys[pi] = fd.key;
          fieldMap.set(fd.key, {
            canonicalKey: fd.key,
            canonicalLabel: fd.label,
            tier: fd.tier,
            inputType: fd.inputType,
            sizeHint: fd.sizeHint,
            archived: fd.archived,
            sourceKeys,
            matchKind: 'new',
          });
        }
      }
    }
  }

  const fieldResolutions = [...fieldMap.values()];

  return { primaryProjectIdx: primaryIdx, cueTypeResolutions, fieldResolutions };
}

/**
 * Given a SchemaReconciliation and user edits, produce a per-CueType list of
 * canonical field keys for scoped comparison in analyseSheets.
 */
export function buildCueTypeFieldsMap(
  reconciliation: SchemaReconciliation,
  primaryProject: CuetationProject,
): Record<string, string[]> {
  const { cueTypeResolutions, fieldResolutions, primaryProjectIdx } = reconciliation;

  // Build canonical key lookup: sourceKey (for primary) → canonicalKey
  const fieldKeyMap = new Map<string, string>();
  for (const fr of fieldResolutions) {
    const srcKey = fr.sourceKeys[primaryProjectIdx];
    if (srcKey !== undefined) fieldKeyMap.set(srcKey, fr.canonicalKey);
  }

  const result: Record<string, string[]> = {};
  for (const ct of cueTypeResolutions) {
    const primarySourceName = ct.sourceNames[primaryProjectIdx] ?? ct.canonicalName;
    const fieldsForType =
      primaryProject.project.config.cueTypeFields[primarySourceName] ?? [];
    result[ct.canonicalName.toUpperCase()] = fieldsForType.map(
      (k) => fieldKeyMap.get(k) ?? k,
    );
  }

  return result;
}
