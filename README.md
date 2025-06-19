# CODAP MCP Integration

A Model Context Protocol (MCP) server for the CODAP (Common Online Data Analysis Platform) data analysis tool, enabling large language models to interact directly with CODAP for data manipulation and visualization.

## 🌟 **Status: Fully Operational**

The system is now fully deployed and operational! LLMs can:
- ✅ **Discover tools** via the metadata endpoint
- ✅ **Queue tool requests** which are processed asynchronously  
- ✅ **Create real datasets** in your CODAP session
- ✅ **Generate visualizations** (graphs, tables, etc.)
- ✅ **Execute all tools** through the web-based API

No local installation required - everything runs through web APIs.

## 🚀 Quick Start for LLMs

1. **Get session code** from your CODAP session (e.g., `T5SDQIRW`)
2. **Discover available tools**:
   ```bash
   GET https://codap-mcp-cdorsey-concordorgs-projects.vercel.app/api/metadata?code=YOUR_SESSION_CODE
   ```
3. **Queue tool requests**:
   ```bash
   POST https://codap-mcp-cdorsey-concordorgs-projects.vercel.app/api/request
   {
     "sessionCode": "YOUR_SESSION_CODE",
     "requestId": "unique-id-123",
     "toolName": "create_dataset_with_table",
     "params": { ... }
   }
   ```

## 🔧 System Architecture

### Web-Based Operation
- **Request Queue**: Tools are queued via HTTP POST to `/api/request`
- **SSE Streaming**: Browser worker receives requests via Server-Sent Events from `/api/stream`
- **Tool Execution**: Browser worker executes tools directly against CODAP Plugin API
- **Response Storage**: Results stored in KV and accessible via web APIs

### Available Tools (9 total)
- `create_dataset_with_table` - Create datasets with automatic table display
- `create_graph` - Generate visualizations (scatter plots, bar charts, etc.)
- `create_data_context` - Create new data contexts
- `create_items` - Add cases to existing datasets
- `get_data_contexts` - List all data contexts
- `get_components` - List all visualization components
- And more...

## 📊 Example Usage

### Create a Student Performance Dataset
```json
POST /api/request
{
  "sessionCode": "T5SDQIRW",
  "requestId": "create-students-001",
  "toolName": "create_dataset_with_table",
  "params": {
    "name": "StudentPerformance",
    "attributes": [
      {"name": "student_id", "type": "categorical"},
      {"name": "math_score", "type": "numeric"},
      {"name": "reading_score", "type": "numeric"}
    ],
    "data": [
      {"student_id": "S001", "math_score": 85, "reading_score": 78},
      {"student_id": "S002", "math_score": 92, "reading_score": 88}
    ]
  }
}
```

### Create a Scatter Plot Visualization
```json
POST /api/request
{
  "sessionCode": "T5SDQIRW", 
  "requestId": "viz-scatter-001",
  "toolName": "create_graph",
  "params": {
    "dataContext": "StudentPerformance",
    "graphType": "scatterplot",
    "xAttribute": "math_score",
    "yAttribute": "reading_score",
    "title": "Math vs Reading Scores"
  }
}
```

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metadata?code={sessionCode}` | GET | Get available tools and schemas |
| `/api/request` | POST | Queue tool execution request |
| `/api/response` | POST | Store tool execution response |
| `/api/stream?code={sessionCode}` | GET | SSE stream for browser worker |

## 🔧 For Developers

### Local Development
```bash
npm install
npm run dev
```

### Testing
```bash
npm test                    # Unit tests
npm run test:integration   # Integration tests
npm run test:playwright    # E2E tests
```

### Project Structure
- `api/` - Vercel serverless functions (HTTP API)
- `src/services/browserWorker/` - Browser-based tool execution
- `docs/` - API documentation and examples
- `playwright/` - End-to-end tests

## 📖 Documentation

- [API Documentation](docs/api/metadata-endpoint.md)
- [Integration Guide](docs/integration-guide.md)
- [Troubleshooting](docs/troubleshooting.md)
- [JavaScript Examples](docs/examples/javascript/)
- [Python Examples](docs/examples/python/)
- [cURL Examples](docs/examples/curl/)

## 🔒 Security & Session Management

- Session codes are 8-character Base32 format (e.g., `T5SDQIRW`)
- Sessions auto-expire after inactivity
- CORS enabled for cross-origin requests
- Rate limiting on API endpoints

## 🎯 LLM Integration Patterns

### For LLMs with MCP Support
Use the native MCP protocol with tool calling capabilities.

### For LLMs without MCP Support
Use the HTTP API endpoints directly:
1. Call metadata endpoint for tool discovery
2. POST to request endpoint for tool execution
3. Monitor results through web interface

### For LLMs without Web Access (like ChatGPT)
Use the action-triggered URL patterns or copy-paste workflows described in the integration guide.

## 📈 Version Management

The API supports version negotiation:
- Current API Version: `1.0.0`
- Tool Manifest Version: `1.0.0`
- Use `Accept-Version` header for version control

## 🤝 Contributing

See project documentation in `docs/delivery/` for development workflow and task management.

## 📄 License

MIT License - see LICENSE file for details.

---

**Ready to integrate with any LLM!** 🚀
