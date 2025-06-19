# PBI-17: Dynamic Tool Registration Architecture Design

## Overview

This document specifies the architecture for transforming the static tool registry into a fully dynamic, plugin-driven ecosystem where applications communicate their available tools to the relay server per session, enabling real-time tool discovery and session-specific tool availability.

## System Architecture Evolution

### Current State (Post-PBI 14+15)
```
┌─────────────┐     HTTP POST      ┌──────────────┐     SSE/HTTP     ┌─────────────┐
│    LLM      │ ────────────────►  │    Vercel    │ ◄──────────────► │   Plugin    │
│   Agent     │                    │    Relay     │                  │   (CODAP)   │
└─────────────┘                    └──────────────┘                  └─────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │ Static Tool  │
                                   │   Registry   │
                                   └──────────────┘
```

### Target State (Post-PBI 17)
```
┌─────────────┐     HTTP POST      ┌──────────────┐     SSE/HTTP     ┌─────────────┐
│    LLM      │ ────────────────►  │    Vercel    │ ◄──────────────► │   Plugin    │
│   Agent     │                    │    Relay     │                  │   (CODAP)   │
└─────────────┘                    └──────────────┘                  └─────────────┘
                                          │                                   │
                                          ▼                                   │
                                   ┌──────────────┐                          │
                                   │Session-Aware │ ◄─── Tool Registration ──┘
                                   │Tool Registry │
                                   └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Per-Session │
                                   │ Tool Storage │
                                   └──────────────┘
```

## Core Components Architecture

### 1. Plugin Registration Protocol

```typescript
interface PluginRegistrationProtocol {
  // Session-specific tool registration
  registerTools(sessionCode: string, registration: PluginRegistration): Promise<RegistrationResult>;
  
  // Dynamic tool updates during session
  updateTools(sessionCode: string, updates: ToolUpdateRequest): Promise<UpdateResult>;
  
  // Tool availability queries
  getAvailableTools(sessionCode: string): Promise<ToolDefinition[]>;
  
  // Real-time notifications
  notifyToolChanges(sessionCode: string, changes: ToolAvailabilityUpdate): Promise<void>;
}

interface PluginRegistration {
  sessionCode: string;
  pluginType: 'codap' | 'slack' | 'database' | 'custom';
  pluginVersion: string;
  capabilities: PluginCapability[];
  availableTools: ToolDefinition[];
  environment: PluginEnvironment;
  constraints?: PluginConstraints;
}

interface PluginCapability {
  type: 'data_analysis' | 'visualization' | 'messaging' | 'storage' | 'computation';
  level: 'basic' | 'advanced' | 'enterprise';
  resources: ResourceCapability[];
  permissions: string[];
}

interface PluginEnvironment {
  version: string;
  features: string[];
  limitations: string[];
  contextInfo: {
    dataContexts?: number;
    components?: ComponentInfo[];
    activeDatasets?: string[];
    userPermissions?: string[];
  };
}
```

### 2. Session-Aware Tool Registry

```typescript
export class SessionToolRegistry {
  private sessionTools = new Map<string, SessionToolSet>();
  private globalTools = new Map<string, ToolModule>();
  private toolModuleRegistry: ToolModuleRegistry;
  private adapterRegistry: AdapterRegistry;

  async registerSessionTools(
    sessionCode: string,
    registration: PluginRegistration
  ): Promise<RegistrationResult> {
    // Validate session exists
    await this.validateSession(sessionCode);
    
    // Validate plugin capabilities
    const validationResult = await this.validatePluginCapabilities(registration);
    if (!validationResult.valid) {
      throw new PluginValidationError(validationResult.errors);
    }

    // Create session tool set
    const sessionToolSet = new SessionToolSet(sessionCode, registration.pluginType);
    
    // Register each tool with appropriate adapter
    const registeredTools: string[] = [];
    const failedTools: ToolRegistrationError[] = [];
    
    for (const toolDef of registration.availableTools) {
      try {
        // Create tool module instance
        const toolModule = await this.createToolModule(toolDef, registration);
        
        // Get appropriate adapter
        const adapter = this.adapterRegistry.getAdapter(registration.pluginType);
        if (!adapter) {
          throw new AdapterNotFoundError(`No adapter for plugin type: ${registration.pluginType}`);
        }
        
        // Initialize tool with adapter
        await toolModule.initialize(adapter, registration.environment);
        
        // Register tool
        sessionToolSet.addTool(toolModule);
        registeredTools.push(toolDef.name);
        
      } catch (error) {
        failedTools.push({
          toolName: toolDef.name,
          error: error.message,
          recoverable: this.isRecoverableError(error)
        });
      }
    }
    
    // Store session tool set
    this.sessionTools.set(sessionCode, sessionToolSet);
    
    // Notify LLM of tool availability via SSE
    await this.notifyToolAvailability(sessionCode, {
      type: 'tools-registered',
      added: registeredTools.map(name => 
        registration.availableTools.find(t => t.name === name)!
      ),
      removed: [],
      modified: [],
      timestamp: new Date().toISOString(),
      reason: 'plugin-registration'
    });
    
    return {
      success: true,
      registeredTools,
      failedTools,
      sessionConfiguration: {
        toolCount: registeredTools.length,
        capabilities: registration.capabilities,
        environment: registration.environment
      }
    };
  }

  getSessionMetadata(sessionCode: string): SessionMetadata {
    const sessionToolSet = this.sessionTools.get(sessionCode);
    
    if (!sessionToolSet) {
      // Return default tools for backwards compatibility
      return this.getDefaultSessionMetadata(sessionCode);
    }

    const tools = sessionToolSet.getAllTools();
    const registration = sessionToolSet.getRegistration();
    
    return {
      apiVersion: "2.0.0",
      sessionId: sessionCode,
      pluginType: registration.pluginType,
      pluginVersion: registration.pluginVersion,
      capabilities: registration.capabilities,
      tools: tools.map(tool => tool.getDefinition()),
      environment: registration.environment,
      toolCount: tools.length,
      lastUpdated: sessionToolSet.getLastUpdated().toISOString(),
      supportedOperations: this.getSupportedOperations(registration.pluginType)
    };
  }
}
```

### 3. Real-Time Tool Update System

```typescript
export class ToolUpdateNotificationSystem {
  private sseConnections = new Map<string, SSEConnection>();
  private notificationQueue = new Map<string, ToolNotification[]>();

  async notifyToolAvailability(
    sessionCode: string,
    update: ToolAvailabilityUpdate
  ): Promise<void> {
    const connection = this.sseConnections.get(sessionCode);
    
    if (connection?.isActive()) {
      // Send immediate SSE notification
      await connection.send({
        event: 'tool-availability-update',
        data: JSON.stringify(update)
      });
    } else {
      // Queue notification for when connection is established
      this.queueNotification(sessionCode, {
        type: 'tool-availability-update',
        data: update,
        timestamp: new Date().toISOString()
      });
    }
    
    // Store in session metadata for /metadata endpoint
    await this.updateSessionMetadataCache(sessionCode, update);
  }

  async handleSSEConnection(sessionCode: string, connection: SSEConnection): Promise<void> {
    this.sseConnections.set(sessionCode, connection);
    
    // Send queued notifications
    const queuedNotifications = this.notificationQueue.get(sessionCode) || [];
    for (const notification of queuedNotifications) {
      await connection.send({
        event: notification.type,
        data: JSON.stringify(notification.data)
      });
    }
    
    // Clear queue after sending
    this.notificationQueue.delete(sessionCode);
    
    // Set up connection cleanup
    connection.onClose(() => {
      this.sseConnections.delete(sessionCode);
    });
  }
}
```

### 4. Enhanced API Endpoints

#### `POST /api/sessions/:code/register-tools`
```typescript
export async function registerTools(req: Request, res: Response): Promise<void> {
  const { code } = req.params;
  const registration: PluginRegistration = req.body;
  
  try {
    // Validate session
    const session = await getSession(code);
    if (!session || session.expired) {
      return res.status(404).json({
        error: 'session_not_found',
        message: 'Session not found or expired'
      });
    }
    
    // Register tools
    const result = await sessionToolRegistry.registerSessionTools(code, registration);
    
    res.status(201).json(result);
    
  } catch (error) {
    logger.error('Tool registration failed', { sessionCode: code, error: error.message });
    res.status(500).json({
      error: 'registration_failed',
      message: 'Failed to register tools'
    });
  }
}
```

#### Enhanced `GET /api/sessions/:code/metadata`
```typescript
export async function getSessionMetadata(req: Request, res: Response): Promise<void> {
  const { code } = req.params;
  
  try {
    // Get session-specific metadata
    const metadata = sessionToolRegistry.getSessionMetadata(code);
    
    res.set({
      'API-Version': '2.0.0',
      'Session-ID': code,
      'Last-Modified': metadata.lastUpdated
    });
    
    res.json(metadata);
    
  } catch (error) {
    res.status(404).json({
      error: 'session_not_found',
      message: 'Session not found or no tools registered'
    });
  }
}
```

## Plugin Integration Patterns

### CODAP Plugin Integration
```typescript
export class CODAPDynamicToolProvider {
  private sessionCode: string;
  private registeredTools = new Set<string>();

  async initialize(): Promise<void> {
    // Create session
    const session = await this.sessionService.createSession();
    this.sessionCode = session.code;
    
    // Analyze CODAP environment
    const environment = await this.analyzeCODAPEnvironment();
    
    // Determine initial tool set
    const availableTools = await this.determineAvailableTools(environment);
    
    // Register with relay
    await this.registerTools({
      sessionCode: this.sessionCode,
      pluginType: 'codap',
      pluginVersion: this.getPluginVersion(),
      capabilities: this.getCapabilities(environment),
      availableTools,
      environment
    });
    
    // Start monitoring for environment changes
    this.startEnvironmentMonitoring();
  }

  private async determineAvailableTools(env: PluginEnvironment): Promise<ToolDefinition[]> {
    const tools: ToolDefinition[] = [];
    
    // Always available base tools
    tools.push(...this.getBaseCODAPTools());
    
    // Conditional tools based on CODAP state
    if (env.contextInfo.dataContexts && env.contextInfo.dataContexts > 0) {
      tools.push(...this.getDataAnalysisTools());
    }
    
    if (env.features.includes('graph_components')) {
      tools.push(...this.getVisualizationTools());
    }
    
    if (env.features.includes('hierarchical_data')) {
      tools.push(...this.getHierarchicalTools());
    }
    
    return tools;
  }
}
```

## Data Storage Schema

### Session Tool Storage
```typescript
// Redis Keys
const SESSION_TOOLS_KEY = (sessionCode: string) => `session:${sessionCode}:tools`;
const SESSION_METADATA_KEY = (sessionCode: string) => `session:${sessionCode}:metadata`;

// Session Tool Data Structure
interface SessionToolData {
  sessionCode: string;
  pluginType: string;
  pluginVersion: string;
  registeredAt: string;
  lastUpdated: string;
  tools: {
    [toolName: string]: {
      definition: ToolDefinition;
      status: 'active' | 'disabled' | 'error';
      registeredAt: string;
      usageCount: number;
    };
  };
  capabilities: PluginCapability[];
  environment: PluginEnvironment;
}
```

## Migration Strategy

### Phase 1: Backwards Compatibility
- Implement new endpoints alongside existing static system
- Default to static tools for sessions without plugin registration
- Add tool update SSE events (ignored by current clients)

### Phase 2: Plugin Registration
- Update CODAP plugin to use dynamic registration
- Maintain fallback to static tools
- Test session-specific tool availability

### Phase 3: Real-Time Updates
- Implement environment monitoring in plugins
- Add tool availability change notifications
- Test dynamic tool updates in live sessions

### Phase 4: Multi-Application Support
- Add Slack and database plugin examples
- Test cross-application tool compatibility
- Performance testing with multiple plugin types

### Phase 5: Production Migration
- Deploy to production with feature flags
- Monitor performance and error rates
- Gradually migrate existing sessions

## Performance Considerations

### Caching Strategy
- Cache session metadata in Redis with 5-minute TTL
- Cache tool definitions per plugin type
- Use connection pooling for database operations

### Scalability Limits
- Maximum 1000 tools per session
- Maximum 10 tool updates per minute per session
- Session tool data expires with session TTL

## Security Considerations

### Plugin Validation
- Validate plugin capabilities against known limits
- Sanitize tool definitions to prevent code injection
- Rate limit tool registration and update requests

### Session Isolation
- Ensure tools are isolated between sessions
- Prevent cross-session tool access
- Validate session ownership for tool operations

This architecture provides the foundation for a fully dynamic, plugin-driven tool ecosystem that completes the vision of universal plugin-LLM integration while maintaining backwards compatibility and security. 