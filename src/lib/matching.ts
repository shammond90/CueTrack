import { Group, RowWithMeta, Sheet } from '../types';
import { median, SKIP_FIELDS } from './utils';

export function analyseSheets(sheets: Sheet[], tolerance: number): Group[] {
  const allRows: RowWithMeta[] = [];
  sheets.forEach((sheet, si) => {
    sheet.rows.forEach((row) => {
      allRows.push({
        ...row,
        _sheetIdx: si,
        _ts: parseFloat(row.timestamp_seconds) || 0,
      } as unknown as RowWithMeta);
    });
  });

  const byType: Record<string, RowWithMeta[]> = {};
  allRows.forEach((r) => {
    const t = (r.type || 'UNK').toUpperCase();
    if (!byType[t]) byType[t] = [];
    byType[t].push(r);
  });

  const groups: Group[] = [];
  let gid = 0;

  Object.entries(byType).forEach(([type, rows]) => {
    const sorted = rows.slice().sort((a, b) => a._ts - b._ts);
    const clusters: RowWithMeta[][] = [];
    let current: RowWithMeta[] = [];

    sorted.forEach((r) => {
      if (current.length === 0) {
        current = [r];
        return;
      }
      const clusterStart = current[0]._ts;
      const fitsWindow = r._ts - clusterStart <= tolerance;
      const sameSheetConflict = current.some((c) => c._sheetIdx === r._sheetIdx);
      if (fitsWindow && !sameSheetConflict) {
        current.push(r);
      } else {
        clusters.push(current);
        current = [r];
      }
    });
    if (current.length > 0) clusters.push(current);

    clusters.forEach((cluster) => {
      const sheetsInCluster = [...new Set(cluster.map((r) => r._sheetIdx))];
      const canonTs = median(cluster.map((r) => r._ts));
      const canonTsFormatted = cluster[0].timestamp_formatted || '';
      const whatValues = [...new Set(cluster.map((r) => r.what || '').filter(Boolean))];
      const canonWhat = whatValues[0] || '';

      const conflictFields: Group['conflictFields'] = [];
      const allFieldNames = [...new Set(cluster.flatMap((r) => Object.keys(r)))];
      const comparableFields = allFieldNames.filter((f) => !SKIP_FIELDS.has(f));

      comparableFields.forEach((f) => {
        const vals = cluster.map((r) => (r[f] || '').trim()).filter((v) => v !== '');
        const unique = [...new Set(vals)];
        if (unique.length > 1) {
          conflictFields.push({
            field: f,
            values: cluster
              .map((r) => ({ sheetIdx: r._sheetIdx, val: (r[f] || '').trim() }))
              .filter((v) => v.val !== ''),
          });
        }
      });

      if (cluster.length > 1) {
        const tsValues = cluster.map((r) => r._ts);
        const uniqueTs = [...new Set(tsValues)];
        if (uniqueTs.length > 1) {
          conflictFields.push({
            field: 'timecode',
            values: cluster.map((r) => ({
              sheetIdx: r._sheetIdx,
              val: r.timestamp_formatted || String(r._ts),
            })),
          });
        }
      }

      const isStructural = ['TITLE', 'SCENE'].includes(type);
      const isUnique = sheetsInCluster.length === 1;

      if (!isUnique && sheetsInCluster.length < sheets.length) {
        const missing = sheets.map((_, i) => i).filter((i) => !sheetsInCluster.includes(i));
        const presenceValues = sheetsInCluster.map((si) => ({ sheetIdx: si, val: '✓ present' }));
        missing.forEach((si) => presenceValues.push({ sheetIdx: si, val: '✗ missing' }));
        conflictFields.push({ field: 'presence', values: presenceValues });
      }

      let status: 'clean' | 'conflict' | 'unique';
      if (isUnique) status = 'unique';
      else if (conflictFields.length === 0) status = 'clean';
      else status = 'conflict';

      groups.push({
        id: gid++,
        type,
        canonTs,
        canonTsFormatted,
        canonWhat,
        cluster,
        sheetsInCluster,
        conflictFields,
        status,
        isStructural,
      });
    });
  });

  return groups.sort((a, b) => a.canonTs - b.canonTs);
}
