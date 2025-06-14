import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ExpressHttpTransport } from '@modelcontextprotocol/sdk/server/http.js';
import * as codap from './codap-helper.js';

async function main() {
  // 1) Create the MCP server
  const server = new McpServer({ name: 'MCP_plugin', version: '1.0.0' });

  // 2) Register every exported helper as a tool
  Object.keys(codap).forEach(fnName => {
    server.tool(
      fnName,
      server.z.object({}),
      async (params) => {
        const result = await (codap as any)[fnName](params);
        return { content: [{ type: 'json', json: result }] };
      }
    );
  });

  // 3) Set up Express + HTTP/SSE transport
  const app = express();
  app.use(express.json());
  const transport = new ExpressHttpTransport({ app, basePath: '/mcp', port: 8083 });
  await server.connect(transport);

  console.log('✅ CODAP MCP server listening on http://localhost:8083/mcp');
}

main().catch(console.error);
