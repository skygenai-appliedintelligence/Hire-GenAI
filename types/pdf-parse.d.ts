declare module 'pdf-parse' {
  export interface PdfParseResult {
    numpages: number
    numrender: number
    info: any
    metadata?: any
    version: string
    text: string
  }

  function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer,
    options?: any
  ): Promise<PdfParseResult>

  export default pdfParse
}
