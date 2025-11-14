declare module '@modelcontextprotocol/sdk/client/index.js' {
  export class Client {
    constructor(info: any, options: any);
    connect(transport: any): Promise<void>;
    listTools(): Promise<{ tools: any[] }>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/client/stdio.js' {
  export class StdioClientTransport {
    constructor(options: { command: string; args: string[]; env?: Record<string, string> });
  }
}
