# PBI-14: Tool Module Architecture Design

## Executive Summary

This design document outlines the architectural approach for transforming the current hardcoded tool system into a flexible, modular architecture that enables runtime tool registration, versioning, and management without requiring code deployments.

## Current State Analysis

### Problems with Current Architecture

The existing tool system requires code changes in three locations for every new tool:

1. **Tool Schema Definition** (`src/services/browserWorker/schemas/toolSchemas.ts`)
   ```typescript
   DEFAULT_TOOL_REGISTRY: ToolRegistry = {
     create_dataset: { /* schema definition */ },
     // ... hardcoded schemas
   }
   ```

2. **Implementation Switch Statement** (`src/services/browserWorker/ToolExecutor.ts`)
   ```typescript
   switch (request.tool) {
     case "create_dataset":
       result = await this.createDataset(request.args);
       break;
     // ... hardcoded cases
   }
   ```

3. **External Manifest** (`api/metadata.js`)
   ```javascript
   tools: Object.entries(DEFAULT_TOOL_REGISTRY).map(/* ... */)
   ```

### Fragility Points

- **Triple Source of Truth**: Tool information scattered across multiple files
- **Deployment Coupling**: Tool updates require full application deployments
- **No Access Control**: All tools available to all users
- **Manual Synchronization**: Error-prone process of keeping schemas, implementations, and manifests in sync

## Target Architecture: Tool Module System

### Core Concept: Dynamic Module Registration

Replace hardcoded switch statements with a dynamic registration system:

```typescript
// Current: Hardcoded approach
switch (request.tool) {
  case "create_dataset":
    result = await this.createDataset(request.args);
    break;
}

// Target: Module-based approach
const module = this.moduleRegistry.getModule(request.tool);
result = await module.execute(request.args, context);
```

### Tool Module Interface

```typescript
interface ToolModule {
  readonly definition: {
    name: string;
    version: string;
    description: string;
    author: string;
    tags: string[];
    dependencies?: ModuleDependency[];
  };
  
  readonly schema: ToolSchema;
  readonly implementation: ToolImplementation;
  readonly permissions?: PermissionConfig;
  readonly lifecycle?: ModuleLifecycle;
}

interface ToolImplementation {
  execute(args: Record<string, any>, context: ExecutionContext): Promise<ToolResult>;
  validate?(args: Record<string, any>): ValidationResult;
  healthCheck?(): Promise<HealthStatus>;
}

interface ExecutionContext {
  requestId: string;
  sessionId: string;
  userId?: string;
  permissions: Permission[];
  rateLimiter: RateLimiter;
  tracer: Tracer;
}
```

### Module Registry System

```typescript
export class ToolModuleRegistry {
  private modules = new Map<string, ToolModule>();
  private permissionManager: PermissionManager;
  private versionManager: VersionManager;

  async registerModule(module: ToolModule): Promise<void> {
    await this.validateModule(module);
    await this.initializeModule(module);
    this.modules.set(module.definition.name, module);
    
    this.logger.info(`Tool module registered: ${module.definition.name}@${module.definition.version}`);
  }

  getAvailableModules(context: ExecutionContext): ToolDefinition[] {
    return Array.from(this.modules.values())
      .filter(module => this.canExecuteModule(module, context))
      .map(module => module.definition);
  }

  async executeModule(
    moduleName: string,
    args: Record<string, any>,
    context: ExecutionContext
  ): Promise<ToolResult> {
    const module = this.modules.get(moduleName);
    if (!module) {
      throw new ModuleNotFoundError(`Tool module not found: ${moduleName}`);
    }

    // Permission and rate limiting checks
    if (!this.permissionManager.canExecute(moduleName, context)) {
      throw new PermissionDeniedError(`Access denied for tool: ${moduleName}`);
    }

    await context.rateLimiter.checkLimit(moduleName);

    // Execute with tracing
    const span = context.tracer.startSpan(`module.${moduleName}`);
    try {
      return await module.implementation.execute(args, context);
    } finally {
      span.end();
    }
  }
}
```

### Module Pack System

```typescript
export interface ModulePack {
  metadata: {
    name: string;
    version: string;
    description: string;
    author: string;
    moduleCount: number;
  };
  modules: ToolModule[];
}

// Example CODAP module pack
export const CODAPModulePack: ModulePack = {
  metadata: {
    name: "CODAP Core Tools",
    version: "1.0.0",
    description: "Essential CODAP data analysis and visualization tools",
    author: "CODAP Team",
    moduleCount: 9
  },
  modules: [
    new CODAPDatasetModule(),
    new CODAPGraphModule(),
    new CODAPTableModule(),
    new CODAPDataContextModule(),
    new CODAPItemsModule(),
    new CODAPComponentModule(),
    new CODAPQueryModule(),
    new CODAPSelectionModule(),
    new CODAPExportModule()
  ]
};

// Registry loading
await moduleRegistry.loadModulePack(CODAPModulePack);
```

### Permission System

```typescript
interface PermissionConfig {
  requiredScopes: string[];
  allowedRoles?: string[];
  rateLimits: RateLimitConfig;
  sessionTypes?: SessionType[];
}

interface RateLimitConfig {
  perMinute: number;
  perHour: number;
  perDay?: number;
  burst?: number;
}

// Configuration-driven permissions
const toolPermissions = {
  "create_dataset": {
    requiredScopes: ["codap:write"],
    rateLimits: { perMinute: 10, perHour: 100 }
  },
  "delete_dataset": {
    requiredScopes: ["codap:write", "codap:admin"],
    allowedRoles: ["admin", "power_user"],
    rateLimits: { perMinute: 2, perHour: 10 }
  }
};
```

### Configuration Management

```yaml
# config/tool-modules.yaml
module_registry:
  auto_load_packs:
    - "./packs/codap-modules"
    - "./packs/database-modules"
    - "./packs/visualization-modules"
  
  permissions:
    default:
      requiredScopes: ["tool:execute"]
      rateLimits:
        perMinute: 10
        perHour: 100
    
    premium:
      requiredScopes: ["tool:execute", "tool:premium"]
      rateLimits:
        perMinute: 100
        perHour: 1000

  session_types:
    basic:
      allowed_modules: ["create_dataset", "get_data_contexts"]
    premium:
      allowed_modules: ["*"]
    readonly:
      allowed_modules: ["get_*"]
```

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Implement `ToolModule` interface and `ToolModuleRegistry`
2. Create `ExecutionContext` and permission system
3. Develop module loading and validation

### Phase 2: Migration Wrapper
1. Create compatibility layer for existing hardcoded tools
2. Implement dual-mode operation (legacy + module-based)
3. Migrate one tool at a time to module format

### Phase 3: Module Packs
1. Create CODAP module pack
2. Implement module pack loading system
3. Add admin interface for module management

### Phase 4: Advanced Features
1. Third-party module support
2. Hot reloading capabilities
3. Module marketplace integration

## Benefits

### For Developers
- **Modular Development**: Tools developed as independent modules
- **Simplified Maintenance**: Single location for tool definition
- **Better Testing**: Isolated module testing

### For Operations
- **Runtime Updates**: Deploy tool updates without application restarts
- **Granular Control**: Per-tool permissions and rate limiting
- **Monitoring**: Individual tool health and performance metrics

### For Users
- **Dynamic Availability**: Tool availability based on permissions
- **Better Performance**: Optimized module loading and execution
- **Enhanced Security**: Fine-grained access control

## Risk Mitigation

### Security Considerations
- Module sandboxing to prevent malicious code execution
- Digital signatures for third-party modules
- Resource limits per module

### Performance Considerations
- Module caching and lazy loading
- Execution context pooling
- Performance monitoring per module

### Backwards Compatibility
- Gradual migration path from hardcoded tools
- Legacy tool wrapper for compatibility
- Version management for module dependencies

## Success Metrics

1. **Development Velocity**: Time to add new tools reduced by 80%
2. **System Reliability**: Module failures isolated, no system-wide crashes
3. **Permission Compliance**: 100% of tool access respects permission system
4. **Performance**: Module overhead <10ms per tool execution
5. **Adoption**: All hardcoded tools migrated to module format

This architecture transforms the tool system from a rigid, deployment-coupled implementation to a flexible, runtime-configurable platform that supports third-party development and enterprise-grade access control. 