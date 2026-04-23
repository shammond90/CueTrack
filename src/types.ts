export interface Sheet {
  filename: string;
  person: string;
  rows: Record<string, string>[];
  color: string;
}

export interface ConflictFieldValue {
  sheetIdx: number;
  val: string;
}

export interface ConflictField {
  field: string;
  values: ConflictFieldValue[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RowWithMeta = { [key: string]: any; _sheetIdx: number; _ts: number };

export interface Group {
  id: number;
  type: string;
  canonTs: number;
  canonTsFormatted: string;
  canonWhat: string;
  cluster: RowWithMeta[];
  sheetsInCluster: number[];
  conflictFields: ConflictField[];
  status: 'clean' | 'conflict' | 'unique';
  isStructural: boolean;
}

export type Decisions = Record<number, Record<string, string>>;

// ─── JSON / .cuetation format ────────────────────────────────────────────────

export interface FieldDefinition {
  key: string;
  label: string;
  tier: number;
  inputType: string;
  sizeHint: string;
  archived: boolean;
  defaultLabel?: string;
}

export interface CuetationAnnotation {
  id: string;
  timestamp: number;
  timeInTitle: number | null;
  cue: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  status: string;
  flagged: boolean;
  flagNote: string;
  sort_order: number;
  version: number;
  deleted: boolean;
}

export interface CuetationProjectConfig {
  cueTypes: string[];
  cueTypeColors: Record<string, string>;
  cueTypeFields: Record<string, string[]>;
  fieldDefinitions: FieldDefinition[];
  visibleColumns?: { key: string; label: string; visible: boolean }[];
  [key: string]: unknown;
}

export interface CuetationProject {
  cuetation_version: number;
  exported_at: string;
  project: {
    name: string;
    created_at: number;
    updated_at: number;
    video_filename: string | null;
    video_path: string | null;
    video_filesize: number | null;
    video_duration: number | null;
    config: CuetationProjectConfig;
    columns: { key: string; label: string; visible: boolean }[];
    export_templates: unknown[];
  };
  annotations: Record<string, CuetationAnnotation[]>;
}

/** A resolved canonical CueType, mapping per-project source type names to one canonical name. */
export interface CueTypeResolution {
  canonicalName: string;
  /** entries[projectIdx] = the original type name in that project (undefined = type not in that project) */
  sourceNames: (string | undefined)[];
  /** auto = all sources had identical names; manual = user resolved it */
  matchKind: 'auto' | 'manual' | 'new';
}

/** A resolved canonical field, mapping per-project source keys to one canonical key/label. */
export interface FieldResolution {
  canonicalKey: string;
  canonicalLabel: string;
  tier: number;
  inputType: string;
  sizeHint: string;
  archived: boolean;
  /** sourceKeys[projectIdx] = the field key in that project (undefined = field not in that project) */
  sourceKeys: (string | undefined)[];
  matchKind: 'auto' | 'manual' | 'new';
}

export interface SchemaReconciliation {
  primaryProjectIdx: number;
  cueTypeResolutions: CueTypeResolution[];
  fieldResolutions: FieldResolution[];
}
