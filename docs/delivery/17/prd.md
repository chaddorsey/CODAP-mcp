# PBI-17: Dynamic Tool Registration and Session-Aware Management

[View in Backlog](../backlog.md#user-content-17)

## Overview

Transform the system into a fully dynamic plugin ecosystem where plugins communicate their available tools to the relay server per session, enabling real-time tool discovery, session-specific tool availability, and multi-application plugin support. This PBI completes the architectural vision for a universal plugin-LLM integration platform.

## Problem Statement

Even with PBI 14 (Tool Module System) and PBI 15 (Universal Adapter Pattern) implemented, the system still lacks the final components needed to achieve the ultimate vision:

**Current Post-PBI 14+15 Limitations:**
- **Static Tool Registration**: Tools are still registered at server startup, not dynamically per plugin session
- **Global Tool Sets**: All sessions see the same tools regardless of plugin capabilities
- **No Plugin Communication**: Plugins cannot inform the relay about their specific tool availability
- **No Real-time Updates**: LLMs don't receive notifications when plugin tool availability changes
- **Limited Multi-App Support**: Each application type requires separate deployment rather than runtime switching

**Vision Gap Analysis:**
The current architecture serves tools from a static registry, but the vision requires plugins to actively communicate their available tools per session, with real-time updates to LLMs when tool availability changes.

## User Stories

**Primary Story**: As a plugin developer, I want dynamic tool registration and session-aware tool management so that plugins can communicate their available tools to LLMs in real-time.

**Supporting Stories**:
- As a plugin, I want to register my available tools with the relay server when I create a session so that LLMs only see tools I can execute
- As a plugin, I want to update my tool availability during a session so that LLMs are notified of changes in real-time
- As an LLM, I want to receive notifications when tool availability changes so that I can adapt my capabilities dynamically
- As a user, I want different plugins to offer different tool sets so that each application provides relevant functionality
- As a system administrator, I want session-isolated tool sets so that different users see appropriate tools for their context

## Technical Approach

### Plugin-Initiated Tool Registration

Transform the current server-controlled tool registration into a plugin-driven dynamic system:

```typescript
// New Plugin Registration Protocol
interface PluginRegistration {
  sessionCode: string;
  pluginType: string; // 'codap', 'slack', 'database', etc.
  capabilities: PluginCapability[];
  availableTools: ToolDefinition[];
  environment: PluginEnvironment;
}

interface PluginCapability {
  type: 'data_analysis' | 'visualization' | 'messaging' | 'storage';
  level: 'basic' | 'advanced' | 'enterprise';
  resources: ResourceCapability[];
}

interface PluginEnvironment {
  version: string;
  features: string[];
  limitations: string[];
  contextInfo: Record<string, any>;
}
```

### New Relay Endpoints

#### `POST /api/sessions/:code/register-tools`
**Purpose**: Plugin registers its available tools for the session
```typescript
interface ToolRegistrationRequest {
  pluginType: string;
  tools: ToolDefinition[];
  capabilities: PluginCapability[];
  environment: PluginEnvironment;
}

interface ToolRegistrationResponse {
  success: boolean;
  registeredTools: string[];
  sessionConfiguration: SessionConfig;
}
```

#### `POST /api/sessions/:code/update-tools`
**Purpose**: Plugin updates tool availability during session
```typescript
interface ToolUpdateRequest {
  toolUpdates: {
    added?: ToolDefinition[];
    removed?: string[];
    modified?: ToolDefinition[];
  };
  reason: string;
}
```

#### Enhanced `GET /api/sessions/:code/metadata`
**Purpose**: Return session-specific tool manifest based on plugin registration
```typescript
interface SessionMetadata {
  apiVersion: string;
  sessionId: string;
  pluginType: string;
  capabilities: PluginCapability[];
  tools: ToolDefinition[]; // Only tools available to this session
  environment: PluginEnvironment;
  lastUpdated: string;
}
```

### Real-Time Tool Updates via SSE

Extend the existing SSE stream to include tool availability changes:

```typescript
// New SSE Event Types
interface ToolAvailabilityUpdate {
  type: 'tool-availability-update';
  data: {
    sessionCode: string;
    updates: {
      added: ToolDefinition[];
      removed: string[];
      modified: ToolDefinition[];
    };
    timestamp: string;
    reason: string;
  };
}

// Example SSE Events
event: tool-availability-update
data: {"sessionCode":"ABC12345","updates":{"added":[{"name":"export_large_dataset","description":"Export datasets >10k rows"}],"removed":[],"modified":[]},"timestamp":"2025-06-19T18:30:00Z","reason":"plugin_upgrade"}

event: tool-request
data: {"id":"req-456","tool":"export_large_dataset","args":{"datasetName":"large_study","format":"csv"}}
```

### Session-Aware Tool Management

```typescript
export class SessionToolManager {
  private sessionTools = new Map<string, Set<string>>();
  private toolRegistry: ToolModuleRegistry;
  private adapterRegistry: AdapterRegistry;

  async registerPluginTools(
    sessionCode: string, 
    registration: PluginRegistration
  ): Promise<void> {
    // Validate plugin capabilities
    await this.validatePluginCapabilities(registration);
    
    // Register session-specific tools
    const sessionToolSet = new Set<string>();
    
    for (const tool of registration.availableTools) {
      // Create tool module instance for this session
      const module = await this.createSessionToolModule(tool, registration);
      
      // Register with appropriate adapter
      const adapter = this.adapterRegistry.getAdapter(registration.pluginType);
      await module.initialize(adapter);
      
      // Add to session tool set
      sessionToolSet.add(tool.name);
      this.toolRegistry.registerSessionTool(sessionCode, module);
    }
    
    this.sessionTools.set(sessionCode, sessionToolSet);
    
    // Notify LLM of tool availability
    await this.notifyToolAvailability(sessionCode, {
      added: registration.availableTools,
      removed: [],
      modified: []
    });
  }

  async updatePluginTools(
    sessionCode: string,
    updates: ToolUpdateRequest
  ): Promise<void> {
    const sessionToolSet = this.sessionTools.get(sessionCode);
    if (!sessionToolSet) {
      throw new Error(`No tools registered for session: ${sessionCode}`);
    }

    // Process tool updates
    if (updates.toolUpdates.added) {
      for (const tool of updates.toolUpdates.added) {
        const module = await this.createSessionTool Module(tool, sessionCode);
        await this.toolRegistry.registerSessionTool(sessionCode, module);
        sessionToolSet.add(tool.name);
      }
    }

    if (updates.toolUpdates.removed) {
      for (const toolName of updates.toolUpdates.removed) {
        await this.toolRegistry.unregisterSessionTool(sessionCode, toolName);
        sessionToolSet.delete(toolName);
      }
    }

    // Notify LLM via SSE
    await this.notifyToolAvailability(sessionCode, updates.toolUpdates);
  }

  getSessionMetadata(sessionCode: string): SessionMetadata {
    const tools = this.toolRegistry.getSessionTools(sessionCode);
    const session = this.getSession(sessionCode);
    
    return {
      apiVersion: "2.0.0",
      sessionId: sessionCode,
      pluginType: session.pluginType,
      capabilities: session.capabilities,
      tools: tools.map(tool => tool.definition),
      environment: session.environment,
      lastUpdated: new Date().toISOString()
    };
  }
}
```

### Plugin Integration Pattern

Updated plugin initialization flow:

```typescript
// Plugin-side integration
export class CODAPPluginIntegration {
  async initializeSession(): Promise<string> {
    // 1. Create session
    const session = await this.sessionService.createSession();
    
    // 2. Analyze CODAP environment
    const environment = await this.analyzeCODAPEnvironment();
    
    // 3. Determine available tools based on CODAP state
    const availableTools = await this.determineAvailableTools(environment);
    
    // 4. Register tools with relay
    await this.registerTools(session.code, {
      pluginType: 'codap',
      capabilities: this.getCapabilities(environment),
      availableTools: availableTools,
      environment: environment
    });
    
    // 5. Start monitoring for capability changes
    this.startCapabilityMonitoring(session.code);
    
    return session.code;
  }

  private async determineAvailableTools(env: PluginEnvironment): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];
    
    // Base tools always available
    tools.push(...this.getBaseCODAPTools());
    
    // Add advanced tools based on CODAP version/features
    if (env.features.includes('hierarchical_data')) {
      tools.push(...this.getHierarchicalDataTools());
    }
    
    if (env.features.includes('graph_components')) {
      tools.push(...this.getVisualizationTools());
    }
    
    // Add tools based on current data contexts
    const dataSources = await this.getAvailableDataSources();
    if (dataSources.length > 0) {
      tools.push(...this.getDataAnalysisTools());
    }
    
    return tools;
  }

  private async onCODAPStateChange(changes: CODAPStateChange): Promise<void> {
    // Determine if tool availability changed
    const currentTools = await this.determineAvailableTools(this.environment);
    const previousTools = this.lastRegisteredTools;
    
    const updates = this.calculateToolUpdates(previousTools, currentTools);
    
    if (updates.added.length || updates.removed.length || updates.modified.length) {
      await this.updateTools(this.sessionCode, {
        toolUpdates: updates,
        reason: `CODAP state change: ${changes.type}`
      });
      
      this.lastRegisteredTools = currentTools;
    }
  }
}
```

### Backwards Compatibility Strategy

Ensure existing integrations continue working:

```typescript
export class BackwardsCompatibilityLayer {
  // Support existing static tool registration
  async initializeStaticTools(): Promise<void> {
    // Create default session with all legacy tools
    const defaultTools = await this.loadLegacyToolRegistry();
    
    // Register as global fallback
    for (const sessionCode of this.activeSessions) {
      if (!this.sessionToolManager.hasRegisteredTools(sessionCode)) {
        await this.sessionToolManager.registerPluginTools(sessionCode, {
          sessionCode,
          pluginType: 'legacy',
          capabilities: [{ type: 'data_analysis', level: 'basic', resources: [] }],
          availableTools: defaultTools,
          environment: { version: '1.0.0', features: [], limitations: [] }
        });
      }
    }
  }

  // Handle sessions without plugin registration
  async handleUnregisteredSession(sessionCode: string): Promise<SessionMetadata> {
    // Auto-register with default tool set
    await this.registerDefaultTools(sessionCode);
    return this.sessionToolManager.getSessionMetadata(sessionCode);
  }
}
```

## UX/UI Considerations

### Plugin Developer Experience
- Clear documentation for tool registration API
- Development tools for testing dynamic registration
- Plugin capability analysis helpers
- Real-time debugging of tool availability

### End User Experience  
- Tool availability reflected in UI immediately
- Clear indication when tools become available/unavailable
- Seamless experience across different plugin types
- Error messages that explain tool unavailability

### LLM Integration Experience
- Automatic tool discovery without configuration
- Real-time capability updates via SSE
- Clear error messages when tools are unavailable
- Session-specific tool documentation

## Acceptance Criteria

1. **Plugin Registration**: Plugins can register their available tools per session via REST API
2. **Session-Specific Metadata**: `/metadata` endpoint returns only tools available to the session's plugin
3. **Real-Time Updates**: Tool availability changes are pushed to LLMs via SSE events
4. **Multi-Application Support**: Different plugin types (CODAP, Slack, etc.) can register different tool sets
5. **Capability Negotiation**: System negotiates and validates plugin capabilities before tool registration
6. **Dynamic Tool Updates**: Plugins can add/remove/modify available tools during active sessions
7. **Backwards Compatibility**: Existing static tool integrations continue working unchanged
8. **Error Handling**: Graceful handling of plugin registration failures and tool conflicts
9. **Performance**: Tool registration and updates complete within 500ms
10. **Session Isolation**: Tool sets are properly isolated between different sessions

## Dependencies

- **PBI 14** (Complete): Tool Module System with runtime registration
- **PBI 15** (Complete): Universal Adapter Pattern for cross-application support
- Session management infrastructure from PBI 1
- SSE streaming system from PBI 3

## Open Questions

1. **Tool Conflict Resolution**: How to handle conflicts when multiple plugins want to register the same tool name?
2. **Resource Management**: How to prevent plugins from registering too many tools and overwhelming the system?
3. **Security Validation**: How to validate that plugins can actually execute the tools they register?
4. **Performance Optimization**: How to efficiently manage tool registration for high-concurrency scenarios?
5. **Plugin Discovery**: Should there be a mechanism for discovering what types of plugins are available?

## Related Tasks

Tasks will be defined when this PBI moves from Proposed to Agreed status, following the established task breakdown and documentation process.

---

## Implementation Vision Summary

This PBI transforms the system from a server-controlled static tool registry to a fully dynamic plugin-driven ecosystem:

**Before (Post-PBI 14+15)**: Tools registered at server startup → All sessions see same tools → No real-time capability updates

**After (Post-PBI 17)**: Plugins register tools per session → Session-specific tool availability → Real-time updates via SSE → Multi-application support

This completes the architectural vision for a universal plugin-LLM integration platform where:
- ✅ Users open applications containing plugins
- ✅ Plugins start sessions and communicate available tools  
- ✅ Users get session-specific prompts for their LLMs
- ✅ LLMs connect and discover tools dynamically
- ✅ Tool availability changes in real-time based on plugin state
- ✅ System supports arbitrary plugin types beyond CODAP 