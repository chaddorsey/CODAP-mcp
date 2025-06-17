# PBI-1: Vercel Relay for Browser-LLM Sessions

## Overview
Provide a cloud-hosted relay (edge/serverless) that brokers communication between browser-based CODAP plugins and arbitrary LLMs. The relay issues short-lived session codes, streams tool-invocation events to the browser via SSE, and exposes request / response endpoints to complete the round-trip.

## Problem Statement
Current MCP prototype assumes a local server or browser extension. Public users cannot install software. We need a zero-install, scalable relay so any LLM can call CODAP tools running in the user's browser.

## User Stories
• As a plugin developer, I can POST `/api/sessions` and receive `{ code, ttl }` so I can embed the code in a prompt.  
• As a browser worker, I can open `GET /stream?code=XXXX` and receive JSON events when an LLM calls a tool.  
• As an LLM agent, I can POST `/request` and GET `/response` to execute tools.  
• As DevOps, I can observe structured logs and basic metrics.

## Technical Approach
1. Vercel Edge Functions (Edge Runtime) for low-latency SSE.  
2. Vercel KV for session + message storage (TTL support).  
3. Endpoints:  
   • `POST /api/sessions` – creates `{code, ttl}`  
   • `GET  /stream` – SSE stream of tool requests filtered by `code`  
   • `POST /request` – LLM posts tool request `{code, id, payload}`  
   • `POST /response` – browser posts result `{code, id, result}`  
   • `GET  /metadata` – JSON-Schema manifest  
4. JSON messages conform to MCP spec; validated with `zod`.  
5. Rate-limit and validate all inputs.

**Detailed Architecture**: See [Relay Architecture Design](../../design/relay_architecture.md)

## UX/UI Considerations
Not applicable – server component.  Status & errors surface via HTTP status codes / JSON bodies for easy debugging.

## Acceptance Criteria
1. Happy-path round-trip works in dev deployment inside Playwright test.  
2. Codes are 8-char Base32, random, expire ≤10 min.  
3. SSE delivers events within 1 s (95-percentile) for 1 000 concurrent sessions in load test.  
4. All endpoints covered by integration tests (Jest + supertest).  
5. CI passes and deploys branch preview to Vercel.

## Dependencies
• Vercel KV availability.  
• MCP tool registry (already exists).  
• Browser worker (PBI-3) for consuming stream.

## Open Questions
• Should we namespace KV keys by environment?  
• Do we need WebSocket fallback in addition to polling?

## Related Tasks
See [Tasks for PBI 1](./tasks.md) 