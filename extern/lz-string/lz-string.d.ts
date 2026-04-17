export type LzInput = string | ArrayBuffer | Uint8Array | number[];

declare function compressToBase64(input: LzInput): string;
declare function decompressFromBase64(input: string): string;
declare function compressToUint8Array(input: LzInput): Uint8Array;
declare function decompressFromUint8Array(input: Uint8Array): string;
export default {
  compressToBase64,
  decompressFromBase64,
  compressToUint8Array,
  decompressFromUint8Array,
};
