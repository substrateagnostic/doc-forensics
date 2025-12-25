declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }
  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>;
  export default pdfParse;
}

declare module 'exifreader' {
  interface Tags {
    [key: string]: {
      value: unknown;
      description: string;
    };
  }
  export function load(data: ArrayBuffer | Buffer): Tags;
}
