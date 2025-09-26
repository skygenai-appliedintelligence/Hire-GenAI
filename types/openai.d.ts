declare module "openai" {
  // Minimal type shim to satisfy TypeScript in editors when the real
  // module types are unavailable. This does NOT provide runtime code.
  // You must still install the package: `npm install openai`.
  // For better types, remove this shim once the real package is installed.
  class OpenAI {
    constructor(config?: { apiKey?: string });
    chat: {
      completions: {
        create(input: any): Promise<any>;
      };
    };
  }
  export default OpenAI;
}
