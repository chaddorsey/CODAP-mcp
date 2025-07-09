# Product Requirements Document (PRD)

## 1. Overview & Objectives.

**Goal:**  
Enable external LLMs (ChatGPT desktop/web, Claude, local LLaMA, OpenAI plugins) to drive a CODAP plugin via MCP tool calls, without requiring users to run local servers. We'll accomplish this with:

- **Code-based session pairing**: short-lived session codes link an LLM session to a specific browser tab.
- **Serverless relay** on Vercel: queues MCP request/response messages.
- **Dynamic tool manifests** fetched per session: LLMs discover available CODAP-API functions in that tab.
- **In-browser MCP dispatcher**: routes incoming calls to CODAP via the CODAP JavaScript API.
- **Browser-side Server-Sent Events (SSE) stream from the relay to receive tool-invocation events (with an automatic 1 s HTTP-polling fallback) and browser POSTs execution results back.**

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
- LLM streaming output beyond single-object JSON responses.

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
  - On load, **POST** `/api/sessions` to retrieve a **session code** (8-character Base32).  
  - Display two copy actions: **primary** "Copy prompt" (full text that the user can paste into an LLM, including instructions and the code) and **secondary** "Copy code only".  
  - Store session metadata in `localStorage` under key `mcp-session-<code>` and start a visible expiry countdown.
  - The copied prompt MUST embed: (a) the pairing code, (b) the relay base URL, (c) an instruction to GET `/metadata`, and (d) the JSON shapes for `/request` and `/response`.  
  - Example prompt template (placeholders in `{{ }}`):  
    ```text
    You are CODAP's AI assistant.
    • Pairing code: {{code}}
    • Relay base URL: {{relay}}/api/sessions/{{code}}
    • First, GET {{relay}}/api/sessions/{{code}}/metadata to load the tool manifest.
    • When instructed, POST a JSON body compliant with the manifest to {{relay}}/api/sessions/{{code}}/request.
    • Poll GET {{relay}}/api/sessions/{{code}}/response until `requestId` matches and `success` is true.
    ```

- **MCP Dispatcher**  
  - Expose `window.mcpDispatcher` with `tools` registry and `.call(toolId, fnName, args)` method.  
  - Validate calls against the tool manifest schema.

- **Event Stream Worker (SSE with polling fallback)**  
  - Open an `EventSource` to `GET /api/sessions/:code/stream` and handle `tool-request` events pushed from the relay.  
  - If the stream errors or the browser lacks SSE support, fall back to 1 s polling via `GET /api/sessions/:code/request`.  
  - After executing each request, `POST` the result (or error) to `/api/sessions/:code/response`.

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

#### 4.2.7. `GET /.well-known/codap-mcp.json`

- **Purpose:** Provide a machine-readable descriptor of endpoint paths, protocol version, and JSON schema locations.  
- **Response:**  
  ```json
  {
    "protocolVersion": "1.0",
    "manifestEndpoint": "/api/sessions/{code}/metadata",
    "requestEndpoint": "/api/sessions/{code}/request",
    "responseEndpoint": "/api/sessions/{code}/response",
    "eventStreamEndpoint": "/api/sessions/{code}/stream",
    "requestSchema": "https://relay.example.com/schemas/request.json",
    "responseSchema": "https://relay.example.com/schemas/response.json"
  }
  ```
  *Optional in Phase 1 but recommended for future auto-configuration of agents.*

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
- **As an** LLM, **I want** to `GET /api/sessions/:code/response` **so that** I receive the tool's output.

### 6.6. Session Teardown

- **As a** system, **I want** sessions to auto-expire after TTL **so that** resources are freed and codes cannot be reused maliciously.

### 6.7. Prompt Copy

- **As a** user, **I want** the "Copy prompt" button to place a ready-made chat prompt (including the code and usage instructions) on my clipboard **so that** I can paste it into an LLM without manually explaining the protocol.

---

## 7. Non-Functional Requirements

- **Scalability:** Phase-1 target: 1 000 simultaneous sessions, with a documented upgrade path to ≥ 5 000 (Redis tier bump, Edge Function concurrency ×3).  
- **Latency:** End-to-end latency ≤ 1 s via SSE; ≤ 1.2 s via polling fallback.  
- **Security:** Session codes expire after 10 min; code entropy ≥ 40 bits; origin checks in browser.  
- **Transport:** Browser ↔ Relay uses SSE with 25 s keep-alive pings; automatic polling fallback.  
- **Reliability:** Retry on transient 5xx; idempotent request/response by `requestId`.  
- **Observability:** Vercel logs for API invocations; browser console logs for tool dispatch.

---

## 8. UX & UI Guidelines

1. **Pairing banner**  
   • Large monospace code `AB47-9D2C` centred at top of plugin.  
   • Primary button **Copy prompt** copies: "You are about to connect to CODAP. Paste the code `{{code}}` into the chat to begin."  
   • Secondary button **Copy code** copies just `{{code}}`.  
   • Sub-text countdown: "Expires in 09:57".  
2. **Connection indicator**  
   • 🟢/🟡/🔴 status dot in header with tooltip "MCP Connected / Idle / Disconnected".  
3. **Colour states**  
   • Neutral grey initial, blue pulse after copy, green after first request, red when expired.  
4. **Accessibility**  
   • ARIA-live region announces status changes.  
   • High-contrast palette (WCAG AA).  
   • Keyboard shortcuts: `c` (copy), `r` (regenerate).

---

## 9. Security & Compliance

- Validate all incoming JSON against JSON Schema.  
- Reject calls with invalid `toolId` or `functionName`.  
- Enforce HTTPS everywhere.  
- Rate-limit `/request` to prevent brute-forcing codes.  
- CORS: only allow requests from known LLM plugin origins or via relay.

---

## 10. Migration Plan

1. **Extract** existing local MCP server handlers into standalone JS modules.  
2. **Implement** serverless endpoints in Vercel following the API spec.  
3. **Embed** pairing code UI and polling logic into the CODAP plugin.  
4. **Integrate** JSON-Schema manifest generation from the tool registry.  
5. **Test** end-to-end with ChatGPT plugin, Claude prompt tool, and local LLaMA agent.  
6. **Deploy** to production, retire local server, monitor logs.
