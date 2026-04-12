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
