# Product Backlog

| ID | Actor | User Story | Status | Conditions of Satisfaction (CoS) |
| :-- | :---- | :--------- | :----- | :------------------------------- |
| 1 | Plugin Developer | As a plugin developer, I want a Vercel relay that can create sessions and stream tool-invocation events via SSE so that LLMs can communicate with the browser without local servers. | Done | • `POST /api/sessions` returns code & TTL<br>• `GET /stream`, `/request`, `/response` implemented with KV store<br>• Works in dev deployment; automated integration tests pass<br>• Production deployment accessible with SSO bypass |
| 2 | End User | As an end user, I want the CODAP plugin to display a pairing banner with copy-prompt/code actions so that I can easily connect an LLM session. [View Details](./2/prd.md) | Done | • Banner visible on load with 8-char code ✅<br>• Countdown timer updates ✅<br>• Copy prompt includes code, relay URL, instructions ✅<br>• UX meets accessibility spec ✅ |
| 3 | Browser Worker | As a browser worker, I want to fetch tool requests via SSE (with polling fallback) and post results so that CODAP executes LLM commands in real time. | Proposed | • EventSource connection established<br>• Fallback to 1 s polling when SSE fails<br>• Successful round-trip shown in demo |
| 4 | LLM Agent | As an LLM agent, I want to retrieve a JSON-Schema tool manifest for the current session so that I can build correctly-shaped MCP calls. | Proposed | • `GET /metadata` returns manifest derived from registry<br>• Version field included<br>• Sample schema validated against JSON Schema draft-07 |
| 5 | Security Engineer | As a security engineer, I want enforced TTL, 40-bit code entropy and rate-limiting on `/request` so that sessions remain secure. | Proposed | • Codes auto-expire after 10 min<br>• Collision probability documented<br>• 60 req/min IP+code limit applied |
| 6 | DevOps | As DevOps, I want structured logs and comprehensive monitoring from both relay and browser so that we can monitor reliability and performance. | Proposed | • Edge/Serverless logs include requestId & latency<br>• Browser logs throttle to info level<br>• 95th latency alert configured<br>• Error tracking and monitoring dashboard<br>• Performance metrics and alerting |
| 7 | Integrator | As an integrator, I want a `.well-known/codap-mcp.json` descriptor so that automated clients can self-configure. | Proposed | • Endpoint serves JSON per PRD<br>• Links to request/response schemas<br>• Cache-control max-age=3600 |
| 8 | QA | As QA, I want a Playwright E2E test covering the full pair-and-execute happy path so that we prevent regressions. | Proposed | • Test spins up CODAP, establishes session, issues createCase, verifies response<br>• Runs in CI on every PR |
| 9 | Performance Engineer | As a performance engineer, I want the relay to scale to 1 000 concurrent sessions with comprehensive performance monitoring so that we can support beta launch. | Proposed | • Load test report shows ≤1 s 95th latency at 1 000 sessions<br>• Scaling plan with KV & Edge concurrency outlined<br>• Performance monitoring and optimization implementation<br>• Cold start time analysis and mitigation strategies |
| 10 | Accessibility Specialist | As an accessibility specialist, I want the pairing UI to meet WCAG AA so that all users can benefit. | Proposed | • Colour contrast ≥4.5:1<br>• ARIA-live announcements verified by screen readers<br>• Keyboard shortcuts documented |

| 11 | Platform Engineer | As a platform engineer, I want proper environment variable management so that configuration is secure and environment-specific. | Proposed | • Environment-specific configurations (dev/staging/prod)<br>• No hardcoded configuration values in source code<br>• Configuration validation on startup<br>• Clear separation of secret vs non-secret variables |
| 12 | Developer | As a developer, I want TypeScript implementation for better type safety and maintainability. | Proposed | • All API endpoints migrated to TypeScript<br>• Type definitions for all data models<br>• Edge Function compatibility resolved<br>• Build pipeline with type checking |
| 13 | Security Engineer | As a security engineer, I want proper secrets management and secure configuration practices. | Proposed | • Vercel environment variables for all secrets<br>• Rotation strategy for bypass tokens<br>• No sensitive data in logs or source code<br>• Security scanning in CI pipeline |

## PBI History Log

| Timestamp | PBI_ID | Event_Type | Details | User |
|-----------|--------|------------|---------|------|
| 2025-06-17-01:15:00 | 1 | Status Update | Moved from InReview to InProgress - Production API accessible but KV storage still needed | AI_Agent |
| 2025-06-17-01:15:00 | 1 | Enhancement | Added production deployment accessibility requirement to CoS | AI_Agent |
| 2025-06-17-01:15:00 | 6 | Enhancement | Enhanced monitoring scope to include comprehensive performance tracking | AI_Agent |
| 2025-06-17-01:15:00 | 9 | Enhancement | Added performance monitoring and cold start analysis to scope | AI_Agent |
| 2025-06-17-01:25:00 | 11 | Deleted | Removed duplicate PBI - KV storage belongs in original PBI 1 scope per .cursorrules DRY principle | AI_Agent |
| 2025-06-17-01:35:00 | 1 | Task Added | Added missing task 1-6 for KV storage implementation to complete original PBI 1 scope | AI_Agent |
| 2025-06-17-01:45:00 | 11 | Scope Clarification | Removed secret management overlap with PBI-13, focused on non-secret environment variables | AI_Agent |
| 2025-06-17-01:45:00 | 1 | Documentation Correction | Updated tasks 1-2 and 1-4 to reflect actual Node.js implementation vs claimed Edge/KV | AI_Agent |
| 2025-06-17-03:10:00 | 1 | Status Update | Completed - All tasks done, Redis KV storage implemented, production deployment successful | AI_Agent |
| 2025-06-17-01:15:00 | 11 | Created | New PBI for proper environment variable management and configuration security | AI_Agent |
| 2025-06-17-01:15:00 | 12 | Created | New PBI for TypeScript migration to improve type safety and maintainability | AI_Agent |
| 2025-06-17-01:15:00 | 13 | Created | New PBI for comprehensive secrets management and security practices | AI_Agent |
| 2025-01-17-14:45:00 | 2 | Status Update | Moved from Proposed to Agreed - Task breakdown approved, commencing implementation | AI_Agent | 
| 2025-01-17-15:00:00 | 2 | Status Update | Moved from Agreed to InProgress - Starting implementation of pairing banner | AI_Agent |
| 2025-01-17-17:55:00 | 2 | Status Update | Moved from InProgress to Done - All tasks completed, E2E tests passing, CoS verified | AI_Agent | 