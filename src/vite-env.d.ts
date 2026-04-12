/// <reference types="vite/client" />

declare module 'xlsx-js-style' {
  const utils: {
    book_new(): any;
    aoa_to_sheet(data: any[][]): any;
    book_append_sheet(wb: any, ws: any, name: string): void;
    decode_range(ref: string): { s: { r: number; c: number }; e: { r: number; c: number } };
    encode_cell(cell: { r: number; c: number }): string;
  };
  function write(wb: any, opts: any): ArrayBuffer;
  export { utils, write };
}
