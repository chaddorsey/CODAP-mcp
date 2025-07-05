# Product Backlog

| ID | Actor | User Story | Status | Conditions of Satisfaction (CoS) |
| :-- | :---- | :--------- | :----- | :------------------------------- |
| 1 | Plugin Developer | As a plugin developer, I want a Vercel relay that can create sessions and stream tool-invocation events via SSE so that LLMs can communicate with the browser without local servers. | Done | • `POST /api/sessions` returns code & TTL<br>• `GET /stream`, `/request`, `/response` implemented with KV store<br>• Works in dev deployment; automated integration tests pass<br>• Production deployment accessible with SSO bypass |
| 2 | End User | As an end user, I want the CODAP plugin to display a pairing banner with copy-prompt/code actions so that I can easily connect an LLM session. [View Details](./2/prd.md) | Done | • Banner visible on load with 8-char code ✅<br>• Countdown timer updates ✅<br>• Copy prompt includes code, relay URL, instructions ✅<br>• UX meets accessibility spec ✅ |
| 3 | Browser Worker | As a browser worker, I want to fetch tool requests via SSE (with polling fallback) and post results so that CODAP executes LLM commands in real time. [View Details](./3/prd.md) | Done | • EventSource connection established ✅<br>• Fallback to 1 s polling when SSE fails ✅<br>• Successful round-trip shown in demo ✅<br>• Complete E2E test coverage ✅ |
| 4 | LLM Agent | As an LLM agent, I want to retrieve a JSON-Schema tool manifest for the current session so that I can build correctly-shaped MCP calls. [View Details](./4/prd.md) | Done | • `GET /metadata` returns manifest derived from registry ✅<br>• Version field included ✅<br>• Sample schema validated against JSON Schema draft-07 ✅<br>• Complete CODAP integration working ✅ |
| 5 | Security Engineer | As a security engineer, I want enforced TTL, 40-bit code entropy and rate-limiting on `/request` so that sessions remain secure. | Proposed | • Codes auto-expire after 10 min<br>• Collision probability documented<br>• 60 req/min IP+code limit applied |
| 6 | DevOps | As DevOps, I want structured logs and comprehensive monitoring from both relay and browser so that we can monitor reliability and performance. | Proposed | • Edge/Serverless logs include requestId & latency<br>• Browser logs throttle to info level<br>• 95th latency alert configured<br>• Error tracking and monitoring dashboard<br>• Performance metrics and alerting |
| 7 | Integrator | As an integrator, I want a `.well-known/codap-mcp.json` descriptor so that automated clients can self-configure. | Proposed | • Endpoint serves JSON per PRD<br>• Links to request/response schemas<br>• Cache-control max-age=3600 |
| 8 | QA | As QA, I want a Playwright E2E test covering the full pair-and-execute happy path so that we prevent regressions. | Proposed | • Test spins up CODAP, establishes session, issues createCase, verifies response<br>• Runs in CI on every PR |
| 9 | Performance Engineer | As a performance engineer, I want the relay to scale to 1 000 concurrent sessions with comprehensive performance monitoring so that we can support beta launch. | Proposed | • Load test report shows ≤1 s 95th latency at 1 000 sessions<br>• Scaling plan with KV & Edge concurrency outlined<br>• Performance monitoring and optimization implementation<br>• Cold start time analysis and mitigation strategies |
| 10 | Accessibility Specialist | As an accessibility specialist, I want the pairing UI to meet WCAG AA so that all users can benefit. | Proposed | • Colour contrast ≥4.5:1<br>• ARIA-live announcements verified by screen readers<br>• Keyboard shortcuts documented |
| 11 | Platform Engineer | As a platform engineer, I want proper environment variable management so that configuration is secure and environment-specific. | Proposed | • Environment-specific configurations (dev/staging/prod)<br>• No hardcoded configuration values in source code<br>• Configuration validation on startup<br>• Clear separation of secret vs non-secret variables |
| 12 | Developer | As a developer, I want TypeScript implementation for better type safety and maintainability. | Proposed | • All API endpoints migrated to TypeScript<br>• Type definitions for all data models<br>• Edge Function compatibility resolved<br>• Build pipeline with type checking |
| 13 | Security Engineer | As a security engineer, I want proper secrets management and secure configuration practices. | Proposed | • Vercel environment variables for all secrets<br>• Rotation strategy for bypass tokens<br>• No sensitive data in logs or source code<br>• Security scanning in CI pipeline |
| 14 | Platform Architect | As a platform architect, I want a modular Tool Module system with runtime registration so that tools can be added, versioned, and managed without code deployments. [View Details](./14/prd.md) | Proposed | • Tool modules can be registered at runtime<br>• Schema validation and parameter checking<br>• Version management and dependency resolution<br>• Permission system for tool access control<br>• Module packs for bulk tool distribution<br>• Health checking and lifecycle management |
| 15 | Integration Developer | As an integration developer, I want a universal adapter pattern so that the same tool interface can work with different backend systems beyond CODAP. [View Details](./15/prd.md) | Proposed | • Universal operation interface for create/read/update/delete<br>• CODAP, Slack, Database, and REST API adapters<br>• Automatic resource schema introspection<br>• Adapter capability detection and routing<br>• Error handling and fallback mechanisms<br>• Cross-application tool compatibility |
| 16 | Data Analyst | As a data analyst, I want comprehensive CODAP API coverage with full CRUD operations, collection management, and interactive features so that I can perform advanced data manipulation and analysis. [View Details](./16/prd.md) | Done | • Complete CRUD operations for all CODAP entities ✅<br>• Collection and attribute management tools ✅<br>• Case and item manipulation capabilities ✅<br>• Selection and filtering tools ✅<br>• Event listeners and real-time updates ✅<br>• Component management and interaction ✅<br>• 90%+ coverage of CODAP Plugin API functions ✅<br>• Comprehensive test suite for all new tools ✅<br>• Integration with existing Vercel server architecture ✅<br>• Graph axes assignment optimization ✅ |
| 17 | Plugin Developer | As a plugin developer, I want dynamic tool registration and session-aware tool management so that plugins can communicate their available tools to LLMs in real-time. [View Details](./17/prd.md) | Proposed | • Plugin-initiated tool registration per session<br>• Session-specific tool availability in metadata endpoint<br>• Real-time tool availability updates via SSE<br>• Plugin capability negotiation protocol<br>• Dynamic tool set changes communicated to LLMs<br>• Backwards compatibility with existing static tools<br>• Multi-application plugin support framework |
| 18 | LLM Application Developer | As an LLM application developer, I want the Vercel server to be fully MCP protocol compliant so that I can integrate CODAP tools using standard MCP clients without custom API implementations. [View Details](./18/prd.md) | InProgress | • JSON-RPC 2.0 message format compliance<br>• Standard MCP lifecycle (initialize, capabilities, tools)<br>• StreamableHTTP transport for Vercel deployment<br>• MCP-compliant tool discovery and execution<br>• Session management with MCP headers<br>• Compatibility with Claude Desktop, Cursor, and MCP SDK<br>• Backwards compatibility during migration<br>• Complete MCP server implementation |
| 19 | End User & Developer | As an end user, I want a seamless, one-click Claude Desktop extension install for CODAP control; as a developer, I want a local codebase and build process that makes it easy to develop, test, and package the latest code as a Claude-ready Desktop Extension. | Proposed | • User can install CODAP MCP as a Claude Desktop extension via .dxt file<br>• No manual config or dependency install required<br>• Extension includes all tools and up-to-date code<br>• Developer can build/test locally and package for Claude in one step<br>• Build process updates extension folder and manifest automatically<br>• E2E test verifies extension works in Claude Desktop<br>• Documentation for both user and developer workflows |
| 20 | Plugin Developer | As a plugin developer, I want to extend the plugin to support SageModeler tools in addition to CODAP tools, so that LLMs can control both applications in an integrated environment. | Proposed | • SageModeler tool definitions created and documented<br>• Plugin can relay and execute SageModeler tool calls<br>• Integrated tool registry supports both CODAP and SageModeler<br>• E2E test verifies LLM can use both toolsets in a CODAP+Sage session<br>• Documentation updated for dual-application support |
| 21 | Platform Architect | As a platform architect, I want the plugin and relay server to support tool capability registration and dynamic registry filtering using secure session keys, so that only the correct set of tools is exposed to the LLM for each session context. [View Details](./21/prd.md) | Done | ✅ Plugin registers capabilities (CODAP, SageModeler, etc.) with the server at session creation<br>✅ Session keys are cryptographically secure and encode capability context<br>✅ Server dynamically filters tool registry per session<br>✅ LLM only sees tools available for the session context<br>✅ Security and spoofing risks mitigated<br>✅ E2E test verifies correct tool exposure for each session type<br>✅ Documentation updated for capability registration and filtering |
| 22 | Plugin Developer & API Explorer | As a plugin developer, I want a comprehensive SageModeler API testing interface that matches the reference plugin feature-for-feature, and as an API explorer, I want a complete testing ground for all SageModeler API functionality to validate MCP tool coverage and discover API capabilities. [View Details](./22/prd.md) | Agreed | • Complete migration of reference plugin UI to SageModeler API panel<br>• 6 main tabs: Nodes/Links, Experiment, Recording, Import/Export, Settings, Inspector<br>• All node management features with extensive property controls<br>• Complete link management with relation vectors, scalars, and direction control<br>• Comprehensive experiment builder with parameter types and modes<br>• Recording controls with duration/units and state management<br>• Model and SD-JSON import/export with converter functions<br>• Settings panel for model complexity and UI controls<br>• Inspector panel with node/link querying and selection<br>• Selection synchronization with SageModeler selections<br>• MCP tool coverage validation and gap documentation<br>• All functionality preserved via MCP calls where possible<br>• Direct API calls for gaps with comprehensive logging<br>• Comprehensive activity logging and feedback<br>• Complete preservation of existing MCP functionality |

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
| 2025-01-17-18:00:00 | 3 | Status Update | Moved from Proposed to Agreed - PBI detail document created, ready for task breakdown | AI_Agent |
| 2025-01-17-18:10:00 | 3 | Status Update | Moved from Agreed to InProgress - Task breakdown complete, starting implementation | AI_Agent |
| 2025-01-18-01:05:00 | 3 | Status Update | Moved from InProgress to Done - All 10 tasks completed, full browser worker system with E2E tests | AI_Agent |
| 2025-01-27-10:46:00 | 3 | Task Added | Added task 3-11 Developer Testing Infrastructure - retrospective documentation of testing capabilities | AI_Agent |
| 2025-01-27-11:00:00 | 4 | Status Update | Moved from Proposed to Agreed - Starting PBI 4 development on new branch | AI_Agent |
| 2025-06-19-16:20:00 | 4 | Status Update | Moved from InProgress to Done - All tasks completed, comprehensive debugging completed, full end-to-end CODAP integration working | AI_Agent |
| 2025-06-19-17:30:00 | 14 | Created | New PBI for modular Tool Module system with runtime registration and lifecycle management | AI_Agent |
| 2025-06-19-17:30:00 | 15 | Created | New PBI for universal adapter pattern enabling cross-application tool compatibility | AI_Agent |
| 2025-06-19-18:00:00 | 16 | Created | New PBI for comprehensive CODAP API coverage expansion with full CRUD operations and advanced features | AI_Agent |
| 2025-06-19-18:30:00 | 17 | Created | New PBI for dynamic tool registration and session-aware tool management to complete the plugin-LLM integration vision | AI_Agent |
| 2025-06-19-19:00:00 | 18 | Created | New PBI for full MCP protocol compliance to enable standard LLM client integration | AI_Agent |
| 2025-01-20-10:00:00 | 16 | Status Update | Moved from Proposed to Agreed - Comprehensive tools implemented, integration plan created | AI_Agent |
| 2025-01-20-10:00:00 | 16 | Task Update | Added integration tasks 16-19 through 16-22 for Vercel server integration | AI_Agent |
| 2025-01-20-10:00:00 | 16 | Implementation Note | 33 comprehensive tools implemented in server/codap-tools.ts, require integration with Vercel server | AI_Agent |
| 2025-01-20-18:00:00 | 16 | Status Update | Moved from Agreed to Done - All tasks completed, comprehensive tools integrated, graph axes optimization implemented | AI_Agent |
| 2025-01-20-20:00:00 | 18 | Status Update | Moved from Proposed to Agreed - Comprehensive task breakdown created with 15 tasks covering MCP compliance implementation | AI_Agent |
| 2025-01-20-20:05:00 | 18 | Status Update | Moved from Agreed to InProgress - Starting implementation with task 18-1 architectural design | AI_Agent |
| 2025-01-05-15:30:00 | 21 | Status Update | Moved from Proposed to Done - Complete capability filtering integration with working CODAP/SageModeler tool execution. All 8 tasks completed with comprehensive session-aware tool filtering, exact tool counts, and clear user guidance. Merged PBI-21 branch with working integration branch. | AI_Agent |
| 2025-01-05-16:00:00 | 21 | Major Achievement | 🎉 BREAKTHROUGH: Successfully resolved Claude Desktop tool prefixing issue and achieved comprehensive capability filtering. After extensive debugging of timeout wrappers, BrowserWorkerService fixes, and session communication, discovered root cause was server name inconsistency in MCP endpoints. Fixed server name from 'codap-mcp-server' to 'codap-mcp' across all endpoints. Enhanced connect_to_session responses with explicit tool availability warnings. Result: Both CODAP and SageModeler tools now work perfectly with proper session-aware filtering. Commit: 0f19310 | AI_Agent |
| 2025-01-06-09:00:00 | 22 | Created | New PBI for comprehensive SageModeler API panel migration - complete feature-for-feature migration of reference plugin UI to current plugin's SageModeler mode. Includes 6 main tabs (Nodes/Links, Experiment, Recording, Import/Export, Settings, Inspector), extensive property controls, MCP tool coverage validation, and preservation of existing MCP functionality. Critical project to provide complete SageModeler API testing ground for developers and API explorers. | AI_Agent |
| 2025-01-06-09:45:00 | 22 | Status Update | Moved from Proposed to Agreed - Task 22-1 (Reference Plugin Audit) completed with comprehensive analysis. Delivered detailed audit results covering all 6 tabs, MCP tool gap analysis identifying 8 functional areas with specific coverage/gap breakdown, and implementation blueprint. Foundation established for systematic migration with clear priorities and technical approach. Ready to proceed with implementation. | AI_Agent |

---

## Appendix: Capability Filtering and Tool Prefixing Resolution (January 5, 2025)

### Overview
During PBI-21 integration, extensive debugging was required to resolve Claude Desktop tool prefixing issues and achieve comprehensive capability filtering. This appendix documents the debugging trials, workarounds for unimplemented MCP features, and the breakthrough solution.

### Problem Statement
- **CODAP tools worked**: `createDataContext`, `createItems`, `createTable` all successful
- **SageModeler tools failed**: `Tool 'CODAP MCP Server:sage_create_node' not found` errors
- **Capability messaging worked**: Claude received correct session-specific tool lists
- **Root issue**: Claude Desktop inconsistently prefixed tool names with server name

### Debugging Trials and Approaches

#### 1. **Timeout Wrapper Investigation**
- **Hypothesis**: SageModeler tools were timing out due to missing timeout protection
- **Approach**: Added `sendCODAPMessage()` wrapper with 10-second timeout to ToolExecutor.ts
- **Result**: CODAP tools still worked, SageModeler tools still failed with prefixing
- **Lesson**: Timeout wasn't the issue - prefixing was preventing tool discovery

#### 2. **BrowserWorkerService Comprehensive Handler Analysis**
- **Discovery**: CODAP tools used comprehensive handlers in BrowserWorkerService.ts
- **Investigation**: Added timeout protection to comprehensive handlers
- **Enhanced debugging**: Extensive console logging to track execution flow
- **Result**: Confirmed CODAP tools worked through comprehensive handlers, SageModeler tools failed at tool name resolution

#### 3. **CODAP Plugin API Context Investigation**
- **Discovery**: Console warning "Interactive API is meant to be used in iframe"
- **Investigation**: CODAP Plugin API requires proper initialization with `initializePlugin()`
- **Fix**: Added `initializeCODAPInterface()` method with proper plugin initialization
- **Result**: Resolved CODAP API context issues but didn't fix SageModeler prefixing

#### 4. **Direct postMessage Communication Attempts**
- **Approach**: Attempted direct `window.postMessage()` for CODAP tools (similar to SageModeler)
- **Trial 1**: Custom message format with `type: "codap-request"`
- **Trial 2**: Official CODAP Plugin API message format
- **Result**: CODAP didn't recognize custom formats, official API required initialization

#### 5. **Server Name Investigation and Resolution**
- **Discovery**: Two different server names in MCP endpoints
  - `handleInitialize`: `"codap-mcp"` ✅
  - `handleCapabilities`: `"codap-mcp-server"` ❌
- **Root Cause**: Claude Desktop uses capabilities endpoint for server information
- **Fix**: Changed capabilities server name to `"codap-mcp"` for consistency
- **Result**: 🎉 **BREAKTHROUGH** - SageModeler tools now work without prefix

### Workarounds for Unimplemented MCP Features

#### 1. **Session-Specific Tool Discovery**
- **MCP Limitation**: Protocol doesn't support per-session tool filtering
- **Workaround**: Enhanced `connect_to_session` responses with comprehensive capability messaging
- **Implementation**: 
  ```
  🎯 **This is a CODAP-only session**
  🚫 **CRITICAL**: SageModeler tools (sage_*) are NOT available
  ✅ Valid Tools for This Session (35 total)
  🚫 **Unavailable in this session**: All SageModeler tools
  ```

#### 2. **Tool Name Prefixing Inconsistency**
- **MCP Issue**: Claude Desktop inconsistently prefixes tools with server name
- **Workaround**: Ensure consistent, clean server names across all MCP endpoints
- **Best Practice**: Use simple names without spaces, colons, or complex characters

#### 3. **Session Context Communication**
- **MCP Gap**: No standard way to communicate session-specific tool availability
- **Workaround**: Use connection response as primary communication channel
- **Strategy**: Make capability messaging so explicit that it overrides initial tool discovery

### Technical Implementation Details

#### Server Name Consistency Fix
```javascript
// Before (inconsistent)
// handleInitialize: name: "codap-mcp"
// handleCapabilities: name: "codap-mcp-server"

// After (consistent)
// Both endpoints: name: "codap-mcp"
```

#### Enhanced Capability Messaging
```javascript
// CODAP-only session
capabilityText += `🚫 **CRITICAL**: SageModeler tools (sage_*) are NOT available in this session and will return "Tool not found" errors.\n\n`;

// Dual-capability session  
capabilityText += `✅ **DUAL CAPABILITIES**: Both CODAP and SageModeler tools are available in this session.\n\n`;
```