import Papa from 'papaparse';
import * as XLSX from 'xlsx-js-style';
import { Decisions, Group, Sheet } from '../types';
import { today } from './utils';

function downloadText(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getMergedRows(
  groups: Group[],
  sheets: Sheet[],
  decisions: Decisions,
  accepted: Set<number>,
  discarded: Set<number>,
): Record<string, string>[] {
  const result: Record<string, string>[] = [];

  groups.forEach((group) => {
    if (group.status === 'unique' && discarded.has(group.id)) return;
    if (group.status === 'unique' && !accepted.has(group.id)) return;

    const groupDecisions = decisions[group.id] || {};
    let bestRow: Record<string, string> = group.cluster[0] as unknown as Record<string, string>;
    if (group.cluster.length > 1) {
      const sorted = group.cluster.slice().sort((a, b) => {
        const aFilled = Object.values(a).filter((v) => v && v !== '').length;
        const bFilled = Object.values(b).filter((v) => v && v !== '').length;
        return bFilled - aFilled;
      });
      bestRow = sorted[0] as unknown as Record<string, string>;
    }

    const merged: Record<string, string> = { ...bestRow };
    Object.entries(groupDecisions).forEach(([f, v]) => {
      merged[f] = v;
    });

    merged.timestamp_seconds = String(group.canonTs);
    merged.timestamp_formatted = group.canonTsFormatted;

    const sources =
      group.status === 'clean'
        ? 'auto-merged'
        : group.sheetsInCluster.map((i) => sheets[i]?.person).join('+');
    merged._merge_source = sources;

    result.push(merged);
  });

  return result.sort(
    (a, b) =>
      parseFloat(a.timestamp_seconds || '0') - parseFloat(b.timestamp_seconds || '0'),
  );
}

const EXPORT_COLS = [
  'timestamp_seconds', 'timestamp_formatted', 'time_in_title', 'type', 'cue_number',
  'old_cue_number', 'cue_time', 'duration', 'delay', 'follow', 'hang', 'block', 'assert',
  'when', 'what', 'presets', 'colour_palette', 'spot_frame', 'spot_intensity', 'spot_time',
  'cue_sheet_notes', 'final', 'dress', 'tech', 'cueing_notes', 'standby_time',
  'warning_time', 'created_at', 'updated_at', '_merge_source',
];

export function exportMergedCSV(
  groups: Group[],
  sheets: Sheet[],
  decisions: Decisions,
  accepted: Set<number>,
  discarded: Set<number>,
): void {
  const rows = getMergedRows(groups, sheets, decisions, accepted, discarded);
  if (!rows.length) {
    alert('No cues to export.');
    return;
  }

  const csv = Papa.unparse(
    rows.map((r) => {
      const out: Record<string, string> = {};
      EXPORT_COLS.forEach((c) => (out[c] = r[c] || ''));
      return out;
    }),
    { columns: EXPORT_COLS },
  );

  downloadText(csv, `cuetation_merged_${today()}.csv`, 'text/csv');
}

export function exportMergeReport(
  groups: Group[],
  sheets: Sheet[],
  decisions: Decisions,
  accepted: Set<number>,
  conflictGroups: Group[],
  workflow: string,
  tolerance: number,
): void {
  const wb = XLSX.utils.book_new();

  type XLSXWorksheet = ReturnType<typeof XLSX.utils.aoa_to_sheet>;

  function autofitSheet(ws: XLSXWorksheet, wrapCols: number[]) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const colWidths: { wch: number }[] = [];
    const rowHeights: { hpt: number }[] = [];
    const wrapSet = new Set(wrapCols);

    for (let c = range.s.c; c <= range.e.c; c++) {
      let maxW = 8;
      for (let r = range.s.r; r <= range.e.r; r++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell || cell.v == null) continue;
        const val = String(cell.v);
        if (wrapSet.has(c) && val.includes('\n')) {
          const lines = val.split('\n');
          const longest = Math.max(...lines.map((l: string) => l.length));
          maxW = Math.max(maxW, longest + 2);
          cell.s = { alignment: { wrapText: true, vertical: 'top' } };
          const needed = Math.max(lines.length * 15, 20);
          rowHeights[r] = { hpt: Math.max(rowHeights[r]?.hpt || 0, needed) };
        } else {
          maxW = Math.max(maxW, val.length + 2);
        }
      }
      colWidths[c] = { wch: Math.min(maxW, 60) };
    }

    ws['!cols'] = colWidths;
    ws['!rows'] = rowHeights;
  }

  const summaryData = [
    ['Cuetation Sheet Merge Report'],
    [],
    ['Generated', new Date().toLocaleString()],
    ['Workflow', workflow],
    ['Sheets', sheets.map((s) => `${s.person} (${s.filename})`).join('\n')],
    ['Tolerance', `±${tolerance}s`],
    [],
    ['Total groups', groups.length],
    ['Clean matches', groups.filter((g) => g.status === 'clean').length],
    ['Conflicts', groups.filter((g) => g.status === 'conflict').length],
    ['Unique cues', groups.filter((g) => g.status === 'unique').length],
    ['Resolved', Object.keys(decisions).length],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  autofitSheet(wsSummary, [1]);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const logRows: (string | number)[][] = [
    ['Timecode', 'Type', 'What', 'Field', 'Versions', 'Decision', 'Source'],
  ];

  conflictGroups.forEach((g) => {
    if (g.status === 'conflict') {
      const d = decisions[g.id] || {};
      g.conflictFields.forEach((cf) => {
        const chosen = d[cf.field];
        const versions = cf.values
          .map((v) => `${sheets[v.sheetIdx]?.person}: ${v.val}`)
          .join('\n');
        const src = cf.values.find((v) => v.val === chosen);
        logRows.push([
          g.canonTsFormatted,
          g.type,
          g.canonWhat,
          cf.field,
          versions,
          chosen || '(not resolved)',
          src ? sheets[src.sheetIdx]?.person || '' : 'custom',
        ]);
      });
    } else if (g.status === 'unique') {
      const inc = accepted.has(g.id);
      logRows.push([
        g.canonTsFormatted,
        g.type,
        g.canonWhat,
        'inclusion',
        `Only in ${sheets[g.sheetsInCluster[0]]?.person || ''}`,
        inc ? 'Included' : 'Discarded',
        '',
      ]);
    }
  });

  const wsLog = XLSX.utils.aoa_to_sheet(logRows);
  autofitSheet(wsLog, [4]);
  XLSX.utils.book_append_sheet(wb, wsLog, 'Decision Log');

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cuetation_merge_report_${today()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
