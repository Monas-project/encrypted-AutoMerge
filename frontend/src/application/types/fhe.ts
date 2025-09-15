export type Base64 = string;
export type DocId = string;
export type ContentIdDecString = `${number}`;

export const TIMESTAMP_DIGITS = 16 as const;
export const MAX_CONTENT_LEN = 64 as const;
export const CONTENT_NIBBLES = (MAX_CONTENT_LEN * 2);

export type FixedLengthArray<T, L extends number> = ReadonlyArray<T> & { length: L };
export type Base64x16 = FixedLengthArray<Base64, typeof TIMESTAMP_DIGITS>;
export type Base64x128 = FixedLengthArray<Base64, typeof CONTENT_NIBBLES>;

export interface WsClientUpdate {
  doc_id: DocId;
  ts_cts: Base64[]; // length 16
  id_cts: Base64[]; // length 16
  content_id: ContentIdDecString; // u64 decimal string
  content_cts: Base64[]; // length 128
}

export interface WsServerSelected {
  doc_id: DocId;
  selected_id_cts: Base64[]; // length 16
}

export interface GetContentResponse {
  content_cts: Base64[]; // length 128
}


