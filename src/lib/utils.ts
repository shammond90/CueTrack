import { Group } from '../types';

export const PERSON_COLORS = ['#ff8c42', '#60a5fa', '#4ade80', '#f472b6', '#a78bfa'];

export const SKIP_FIELDS = new Set([
  '_sheetIdx', '_ts', 'timestamp_seconds', 'timestamp_formatted',
  'type', 'time_in_title', 'created_at', 'updated_at',
]);

export const SKIP_FIELDS_MERGED = new Set([
  '_sheetIdx', '_ts', 'timestamp_seconds', 'timestamp_formatted',
  'type', 'time_in_title', 'created_at', 'updated_at', '_merge_source',
]);

export function median(arr: number[]): number {
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function getBadgeClass(type: string): string {
  const t = (type || '').toUpperCase();
  if (t === 'LIGHTS' || t === 'LIGHT') return 'badge-LIGHTS';
  if (t.startsWith('SPOT 1') || t === 'SPOT1') return 'badge-SPOT1';
  if (t.startsWith('SPOT 2') || t === 'SPOT2') return 'badge-SPOT2';
  if (t === 'SPOT') return 'badge-SPOT';
  if (t === 'AUDIO') return 'badge-AUDIO';
  if (t === 'RAIL') return 'badge-RAIL';
  if (t === 'ENVIRO') return 'badge-ENVIRO';
  if (t === 'DECK') return 'badge-DECK';
  if (t === 'SCENE') return 'badge-SCENE';
  if (t === 'TITLE') return 'badge-TITLE';
  return 'badge-default';
}

export function getSectionLabel(canonTs: number): string {
  if (canonTs < 3600) return 'Act I';
  if (canonTs < 7200) return 'Act II';
  return 'Act III';
}

export function buildMergedPreview(
  group: Group,
  decisions: Record<string, string>,
): Record<string, string> {
  let bestRow: Record<string, string> = { ...(group.cluster[0] as Record<string, string>) };
  if (group.cluster.length > 1) {
    const sorted = group.cluster.slice().sort((a, b) => {
      const aF = Object.values(a).filter((v) => v && v !== '').length;
      const bF = Object.values(b).filter((v) => v && v !== '').length;
      return bF - aF;
    });
    bestRow = { ...(sorted[0] as Record<string, string>) };
  }
  const merged: Record<string, string> = bestRow;
  Object.entries(decisions).forEach(([f, v]) => {
    merged[f] = v;
  });
  merged.timestamp_formatted = group.canonTsFormatted;
  return merged;
}
