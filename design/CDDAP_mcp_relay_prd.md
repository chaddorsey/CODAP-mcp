# Product Requirements Document (PRD)

## 1. Overview & Objectives

**Goal:**  
Enable external LLMs (ChatGPT desktop/web, Claude, local LLaMA, OpenAI plugins) to drive a CODAP plugin via MCP tool calls, without requiring users to run local servers. We’ll accomplish this with:

- **Code-based session pairing**: short-lived session codes link an LLM session to a specific browser tab.
- **Serverless relay** on Vercel: queues MCP request/response messages.
- **Dynamic tool manifests** fetched per session: LLMs discover available CODAP-API functions in that tab.
- **In-browser MCP dispatcher**: routes incoming calls to CODAP via the CODAP JavaScript API.

---

## 2. Scope

### In-Scope

- Generating and displaying pairing codes in the CODAP plugin UI.  
- Vercel-hosted serverless endpoints for session lifecycle, metadata, request and response.  
- Browser polling of the relay to fetch LLM tool invocations and post back results.  
- JSON-Schema–driven tool manifest dynamically returned per session.  
- Full end-to-end flow: LLM → relay → browser dispatch → CODAP API call → relay → LLM.

### Out-of-Scope

- Persistent long-term storage of user data beyond session TTL.  
- Authentication beyond one-time session codes.  
- Non-MCP calls (e.g., user manual UI only).  
- Support for MEC proxies or enterprise firewalls.

---

## 3. High-Level Architecture

```plaintext
+-------------+      POST/GET         +-------------+      postMessage/poll      +-----------+
|  External   | <———— relay.yourapp —> |  Vercel     | <——— HTTP polls ———> | Browser/  |
|  LLM Agent  |                         |  Relay      |                         | CODAP Tab |
+-------------+                         +-------------+                         +-----------+
       ▲                                       ▲                                      ▲
       │ fetch metadata (.well-known)          │ store request JSON                   │
       │ POST /sessions/:code/request          │ GET /sessions/:code/request          │
       │ GET /sessions/:code/response          │ POST /sessions/:code/response        │
```

---

## 4. Components & Responsibilities

### 4.1. CODAP Plugin (Browser Tab)

- **Pairing Module**  
  - On load, generate a **session code** (8-character alphanumeric).  
  - Display code prominently (“Your pairing code: `AB47-9D`”).  
  - Store session metadata in `localStorage` under key `mcp-session-<code>`.

- **MCP Dispatcher**  
  - Expose `window.mcpDispatcher` with `tools` registry and `.call(toolId, fnName, args)` method.  
  - Validate calls against the tool manifest schema.

- **Polling Worker**  
  - Every 500–1000 ms, `GET /api/sessions/:code/request`.  
  - If a new request exists, invoke via `mcpDispatcher.call()`.  
  - POST the result (or error) back to `/api/sessions/:code/response`.

- **Tool Registration**  
  - At pairing time, `GET /api/sessions/:code/metadata` to fetch JSON schema of available tools/functions.  
  - Register each function in `mcpDispatcher.tools`.

- **CODAP API Integration**  
  - For each tool function, map to a CODAP API call (e.g., `createCase`, `updateAttribute`).  
  - Handle async callbacks and return structured results.

---

### 4.2. Vercel Serverless Relay

Under `/api` on your Vercel project:

#### 4.2.1. `POST /api/sessions`

- **Purpose:** Create a new session code (if plugin prefers relay-driven code).  
- **Request:** none  
- **Response:**  
  ```json
  { "code": "AB47-9D", "expiresAt": "2025-06-15T14:00:00Z" }
  ```

#### 4.2.2. `GET /api/sessions/:code/metadata`

- **Purpose:** Return tool manifest JSON for that browser session.  
- **Response:**  
  ```json
  {
    "tools": [
      {
        "id": "codap-createCase",
        "description": "Create a new case in CODAP",
        "functions": [
          {
            "name": "createCase",
            "parameters": { /* JSON Schema */ }
          },
          …
        ]
      },
      …
    ]
  }
  ```

#### 4.2.3. `POST /api/sessions/:code/request`

- **Purpose:** LLM posts a tool invocation.  
- **Request Body:**  
  ```json
  {
    "requestId": "req-123",
    "toolId": "codap-createCase",
    "functionName": "createCase",
    "args": { "case": { "attr1": 42 } }
  }
  ```

- **Behavior:**  
  - Validate session code exists & not expired.  
  - Enqueue request object in in-memory/Redis store keyed by `code`.  
  - Respond `202 Accepted`.

#### 4.2.4. `GET /api/sessions/:code/request`

- **Purpose:** Browser polls for pending requests.  
- **Response:**  
  ```json
  [ /* zero or more */ {
      "requestId": "req-123",
      "toolId": "codap-createCase",
      "functionName": "createCase",
      "args": { … }
    }
  ]
  ```

#### 4.2.5. `POST /api/sessions/:code/response`

- **Purpose:** Browser posts back execution results.  
- **Body:**  
  ```json
  {
    "requestId": "req-123",
    "success": true,
    "result": { "caseId": "c789" }
  }
  ```

- **Behavior:** Store response in queue keyed by code/requestId.

#### 4.2.6. `GET /api/sessions/:code/response`

- **Purpose:** LLM polls for completed responses.  
- **Response:**  
  ```json
  [{
    "requestId": "req-123",
    "success": true,
    "result": { "caseId": "c789" }
  }]
  ```

---

## 5. Data Models & Schema

### 5.1. Session Record

```ts
interface Session {
  code: string;                // e.g. "AB47-9D"
  createdAt: ISO8601 timestamp;
  expiresAt: ISO8601 timestamp; // e.g. 10 minutes later
  toolManifest: ToolManifest;   // cached or dynamically fetched
}
```

### 5.2. ToolManifest

```ts
interface ToolManifest {
  tools: Array<{
    id: string;
    description: string;
    functions: Array<{
      name: string;
      description: string;
      parameters: JSONSchemaObject;
    }>;
  }>;
}
```

### 5.3. Request & Response Queues

```ts
interface ToolRequest {
  requestId: string;    // unique per call
  toolId: string;
  functionName: string;
  args: any;
}

interface ToolResponse {
  requestId: string;
  success: boolean;
  result?: any;
  error?: string;
}
```

---

## 6. User Stories

### 6.1. Session Pairing

- **As a** user, **I want** the CODAP plugin to show me a pairing code when it loads **so that** I can link it to my LLM session.
- **As a** developer, **I want** to POST `/api/sessions` to generate a code **so that** pairing can be initiated serverlessly.

### 6.2. Manifest Discovery

- **As an** LLM plugin, **I want** to `GET /api/sessions/:code/metadata` **so that** I know what tools and functions are available.
- **As a** developer, **I want** to return a JSON Schema–driven tool manifest **so that** LLMs can automatically structure calls.

### 6.3. Request Dispatch

- **As an** LLM, **I want** to `POST /api/sessions/:code/request` with a JSON payload **so that** my instruction can be executed in the browser.
- **As a** browser plugin, **I want** to poll `GET /api/sessions/:code/request` **so that** I can retrieve pending invocations.

### 6.4. CODAP Execution

- **As a** plugin developer, **I want** the MCP dispatcher to map calls like `createCase` to the CODAP API **so that** the graph or table updates accordingly.
- **As a** user, **I want** to see results returned to my LLM session **so that** I can continue the conversation with live data context.

### 6.5. Response Delivery

- **As a** browser, **I want** to `POST /api/sessions/:code/response` after execution **so that** the LLM can retrieve results.
- **As an** LLM, **I want** to `GET /api/sessions/:code/response` **so that** I receive the tool’s output.

### 6.6. Session Teardown

- **As a** system, **I want** sessions to auto-expire after TTL **so that** resources are freed and codes cannot be reused maliciously.

---

## 7. Non-Functional Requirements

- **Scalability:** Handle hundreds of concurrent sessions; serverless auto-scales.  
- **Latency:** Active polling interval ≤ 1 s end-to-end.  
- **Security:** Session codes expire after 10 min; code entropy ≥ 32 bits; origin checks in browser.  
- **Reliability:** Retry on transient 5xx; idempotent request/response by requestId.  
- **Observability:** Vercel logs for API invocations; browser console logs for tool dispatch.

---

## 8. Security & Compliance

- Validate all incoming JSON against JSON Schema.  
- Reject calls with invalid `toolId` or `functionName`.  
- Enforce HTTPS everywhere.  
- Rate-limit `/request` to prevent brute-forcing codes.  
- CORS: only allow requests from known LLM plugin origins or via relay.

---

## 9. Migration Plan

1. **Extract** existing local MCP server handlers into standalone JS modules.  
2. **Implement** serverless endpoints in Vercel following the API spec.  
3. **Embed** pairing code UI and polling logic into the CODAP plugin.  
4. **Integrate** JSON-Schema manifest generation from the tool registry.  
5. **Test** end-to-end with ChatGPT plugin, Claude prompt tool, and local LLaMA agent.  
6. **Deploy** to production, retire local server, monitor logs.
