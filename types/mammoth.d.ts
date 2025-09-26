declare module "mammoth" {
  export interface ExtractResult {
    value: string;
    messages?: any[];
  }

  export interface ExtractInput {
    path?: string;
    arrayBuffer?: ArrayBuffer;
    buffer?: Buffer;
  }

  export function extractRawText(
    input: ExtractInput,
    options?: Record<string, unknown>
  ): Promise<ExtractResult>;

  const _default: {
    extractRawText: typeof extractRawText;
  };
  export default _default;
}
