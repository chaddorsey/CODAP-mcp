# MCP SuperAssistant Integration Setup

## Overview
This guide will help you connect MCP SuperAssistant to your CODAP MCP server for full round-trip testing.

## Prerequisites
1. ✅ MCP Server running on `localhost:8083`
2. ✅ CODAP Plugin running on `localhost:8081` 
3. 🌐 MCP SuperAssistant browser access

## Step 1: Start the MCP Server

```bash
# Build the server
npm run build:mcp

# Start the MCP server
npm run start:mcp
```

The server should show:
```
✅ MCP server listening on http://localhost:8083/mcp
```

## Step 2: Verify Server Health

Test the server endpoints:

```bash
# Health check
curl http://localhost:8083/health

# SSE test (should show streaming data)
curl http://localhost:8083/sse-test

# MCP endpoint check
curl http://localhost:8083/mcp
```

## Step 3: Configure MCP SuperAssistant

### Connection Details:
- **Server URL**: `http://localhost:8083/sse`
- **Protocol**: SSE (Server-Sent Events)
- **Transport**: SSE
- **CORS**: Enabled for all origins

### Alternative HTTP Endpoint:
- **Server URL**: `http://localhost:8083/mcp`
- **Protocol**: HTTP
- **Transport**: Streamable HTTP

### Available Tools:

1. **`echo`** - Text echoing for basic connectivity testing
   ```json
   {
     "text": "Hello from MCP SuperAssistant!"
   }
   ```

2. **`add_numbers`** - Mathematical operations testing
   ```json
   {
     "a": 42,
     "b": 58
   }
   ```

3. **`get_current_time`** - Server time retrieval
   ```json
   {}
   ```

4. **`create_codap_dataset`** - CODAP data generation (main feature)
   ```json
   {
     "datasetName": "LLM-Generated-Data",
     "dataType": "random_numbers",
     "recordCount": 10
   }
   ```

5. **`test_full_integration`** - Comprehensive integration test
   ```json
   {
     "testType": "comprehensive",
     "includeData": true
   }
   ```

## Step 4: Test Connection

### Basic Test Sequence:

1. **Connection Test**:
   ```
   Use the echo tool with message: "Testing MCP SuperAssistant connection"
   ```

2. **Functionality Test**:
   ```
   Use add_numbers with a=25, b=17
   ```

3. **Integration Test**:
   ```
   Use test_full_integration with default parameters
   ```

4. **CODAP Data Test**:
   ```
   Use create_codap_dataset with:
   - datasetName: "SuperAssistant-Test"
   - dataType: "random_numbers" 
   - recordCount: 15
   ```

## Step 5: Full Round Trip Test

### Recommended Test Prompt for LLM:

```
Please test the MCP-CODAP integration by:

1. First, run the test_full_integration tool to verify the system status
2. Then create a dataset using create_codap_dataset with:
   - Name: "AI-Generated-Sample"
   - Type: "sample_students" 
   - Count: 20 records
3. Finally, use the echo tool to confirm the round trip is complete

Provide a summary of each step and the results.
```

## Expected Results

### Successful Integration Should Show:

✅ **MCP Connection**: Server responds to all tool calls  
✅ **Data Generation**: CODAP-compatible datasets created  
✅ **Session Management**: Persistent connections maintained  
✅ **CORS**: Cross-origin requests working  
✅ **Tool Schema**: All 5 tools available and functional  

### Sample Success Response:
```
🎯 MCP-CODAP Full Integration Test Results

✅ MCP Server Status: RUNNING
📍 SSE Endpoint: http://localhost:8083/sse
📍 HTTP Endpoint: http://localhost:8083/mcp
🕐 Server Time: 2025-01-XX...
🔧 Available Tools: 5
🎉 INTEGRATION TEST PASSED!
Ready for external LLM connections via MCP SuperAssistant.
```

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Server now allows all origins (`*`)
2. **Connection Timeout**: Check server is running on port 8083
3. **Tool Not Found**: Verify tool names match exactly
4. **Session Issues**: Server handles session management automatically

### Debug Commands:

```bash
# Check server logs
npm run start:mcp

# Test direct HTTP
curl -X POST http://localhost:8083/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{"tools":{}}},"id":1}'
```

## Next Steps

Once connected successfully:

1. 🎯 Test all 5 MCP tools
2. 📊 Generate various dataset types
3. 🔄 Verify CODAP integration in the plugin
4. 🚀 Explore advanced LLM-driven data analysis workflows

## Support

- Server logs: Check terminal running `npm run start:mcp`
- Plugin logs: Check browser console at `localhost:8081`
- Network issues: Verify ports 8081 and 8083 are available

---

**Ready for MCP SuperAssistant Integration! 🚀** 