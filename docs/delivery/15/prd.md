# PBI-15: Universal Adapter Pattern for Cross-Application Compatibility

[View in Backlog](../backlog.md#user-content-15)

## Overview

Create a universal adapter pattern that allows the same tool interface to work with completely different backend systems beyond CODAP. This enables the platform to serve as a universal application integration hub, where tools can seamlessly work across databases, messaging systems, APIs, and other applications.

## Problem Statement

The current system is tightly coupled to CODAP-specific APIs:
- All tools use `sendMessage(action, resource, values)` format specific to CODAP
- Tool schemas assume CODAP concepts (dataContext, collections, attributes)
- Error handling is CODAP-specific
- No abstraction layer for different backend systems

This creates limitations:
- **Application Lock-in**: Cannot reuse tools with other applications
- **Limited Market**: Reduces platform appeal to non-CODAP users  
- **Maintenance Burden**: Separate implementations needed for each application
- **Integration Complexity**: Each new application requires complete tool rewrites

## User Stories

**Primary Story**: As an integration developer, I want a universal adapter pattern so that the same tool interface can work with different backend systems beyond CODAP.

**Supporting Stories**:
- As a Slack team lead, I want to use data analysis tools in Slack channels
- As a database administrator, I want to apply the same tools to database tables
- As an API developer, I want to integrate tools with REST services
- As a product manager, I want to expand the platform's addressable market

## Technical Approach

### Universal Tool Interface

Create a standard operation interface that abstracts common patterns across applications:

```typescript
interface UniversalOperation {
  type: 'create' | 'read' | 'update' | 'delete' | 'query' | 'bulk';
  resource: string;
  data?: Record<string, any>;
  filters?: ResourceFilter[];
  options?: OperationOptions;
}

interface ResourceFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: any;
}

interface OperationOptions {
  limit?: number;
  offset?: number;
  sort?: SortCriteria[];
  timeout?: number;
}
```

### Application Adapter Interface

```typescript
interface ApplicationAdapter {
  readonly name: string;
  readonly version: string;
  readonly capabilities: AdapterCapability[];
  
  // Lifecycle management
  initialize(config: AdapterConfig): Promise<void>;
  destroy(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  
  // Core operations - standardized across all adapters
  executeOperation(operation: UniversalOperation): Promise<OperationResult>;
  
  // Resource management
  listResources(resourceType: string, filters?: ResourceFilter[]): Promise<Resource[]>;
  getResource(resourceType: string, id: string): Promise<Resource>;
  createResource(resourceType: string, data: ResourceData): Promise<Resource>;
  updateResource(resourceType: string, id: string, data: Partial<ResourceData>): Promise<Resource>;
  deleteResource(resourceType: string, id: string): Promise<void>;
  
  // Bulk operations
  bulkCreate(resourceType: string, items: ResourceData[]): Promise<Resource[]>;
  bulkUpdate(resourceType: string, updates: ResourceUpdate[]): Promise<Resource[]>;
  
  // Schema introspection
  getResourceSchema(resourceType: string): Promise<ResourceSchema>;
  getSupportedOperations(): Promise<OperationDescriptor[]>;
}

enum AdapterCapability {
  CREATE_DATASET = "create_dataset",
  CREATE_VISUALIZATION = "create_visualization", 
  QUERY_DATA = "query_data",
  BULK_INSERT = "bulk_insert",
  SEND_MESSAGE = "send_message",
  CREATE_CHANNEL = "create_channel",
  FILE_UPLOAD = "file_upload",
  REAL_TIME_SYNC = "real_time_sync"
}
```

### CODAP Adapter Implementation

```typescript
export class CODAPAdapter implements ApplicationAdapter {
  readonly name = "codap";
  readonly version = "1.0.0";
  readonly capabilities = [
    AdapterCapability.CREATE_DATASET,
    AdapterCapability.CREATE_VISUALIZATION,
    AdapterCapability.QUERY_DATA,
    AdapterCapability.BULK_INSERT
  ];

  private codapAPI: CODAPPluginAPI;

  async executeOperation(operation: UniversalOperation): Promise<OperationResult> {
    switch (operation.type) {
      case 'create':
        return this.handleCreate(operation);
      case 'read':
        return this.handleRead(operation);
      case 'query':
        return this.handleQuery(operation);
      default:
        throw new UnsupportedOperationError(`Operation ${operation.type} not supported`);
    }
  }

  private async handleCreate(operation: UniversalOperation): Promise<OperationResult> {
    const { resource, data } = operation;
    
    switch (resource) {
      case 'dataset':
        // Map universal dataset to CODAP data context
        const codapResult = await this.codapAPI.createDataContext({
          name: data.name,
          collections: [{
            name: data.collectionName || "Cases",
            attrs: this.mapAttributesToCODAP(data.attributes)
          }]
        });
        
        return {
          success: true,
          result: this.mapCODAPResultToUniversal(codapResult),
          metadata: {
            adapter: this.name,
            originalOperation: operation
          }
        };
        
      case 'visualization':
        const graphResult = await this.codapAPI.createComponent({
          type: 'graph',
          dataContext: data.dataContext,
          configuration: {
            xAttributeName: data.xAxis,
            yAttributeName: data.yAxis
          }
        });
        
        return {
          success: true,
          result: this.mapCODAPResultToUniversal(graphResult)
        };
        
      default:
        throw new UnsupportedResourceError(`Resource type ${resource} not supported`);
    }
  }

  private mapAttributesToCODAP(attributes: any[]): CODAPAttribute[] {
    return attributes.map(attr => ({
      name: attr.name,
      type: this.mapUniversalTypeToCODAP(attr.type),
      description: attr.description
    }));
  }

  private mapUniversalTypeToCODAP(type: string): CODAPAttributeType {
    const typeMap: Record<string, CODAPAttributeType> = {
      'number': 'numeric',
      'string': 'categorical', 
      'date': 'date',
      'boolean': 'categorical'
    };
    return typeMap[type] || 'categorical';
  }

  async getSupportedOperations(): Promise<OperationDescriptor[]> {
    return [
      {
        type: 'create',
        resource: 'dataset',
        description: 'Create a new CODAP data context',
        parameters: {
          name: { type: 'string', required: true },
          attributes: { type: 'array', required: true },
          data: { type: 'array', required: false }
        }
      },
      {
        type: 'create', 
        resource: 'visualization',
        description: 'Create a CODAP graph component',
        parameters: {
          dataContext: { type: 'string', required: true },
          xAxis: { type: 'string', required: true },
          yAxis: { type: 'string', required: false }
        }
      }
    ];
  }
}
```

### Slack Adapter Implementation

```typescript
export class SlackAdapter implements ApplicationAdapter {
  readonly name = "slack";
  readonly version = "1.0.0";
  readonly capabilities = [
    AdapterCapability.SEND_MESSAGE,
    AdapterCapability.CREATE_CHANNEL,
    AdapterCapability.FILE_UPLOAD
  ];

  private slackClient: WebClient;

  async executeOperation(operation: UniversalOperation): Promise<OperationResult> {
    switch (operation.type) {
      case 'create':
        return this.handleSlackCreate(operation);
      case 'query':
        return this.handleSlackQuery(operation);
      default:
        throw new UnsupportedOperationError(`Operation ${operation.type} not supported by Slack adapter`);
    }
  }

  private async handleSlackCreate(operation: UniversalOperation): Promise<OperationResult> {
    const { resource, data } = operation;
    
    switch (resource) {
      case 'message':
        // Map universal message to Slack message format
        const result = await this.slackClient.chat.postMessage({
          channel: data.channel,
          text: data.content,
          attachments: this.mapUniversalAttachmentsToSlack(data.attachments),
          blocks: this.mapDataToSlackBlocks(data.structuredData)
        });
        
        return {
          success: true,
          result: {
            id: result.ts,
            channel: result.channel,
            timestamp: result.ts,
            permalink: await this.getPermalink(result.channel, result.ts)
          }
        };
        
      case 'channel':
        const channelResult = await this.slackClient.conversations.create({
          name: data.name,
          is_private: data.private || false,
          topic: data.description
        });
        
        return {
          success: true,
          result: {
            id: channelResult.channel.id,
            name: channelResult.channel.name,
            type: 'channel'
          }
        };
        
      case 'dataset':
        // Convert dataset to Slack table message
        const tableMessage = this.formatDatasetAsSlackTable(data);
        return this.handleSlackCreate({
          ...operation,
          resource: 'message',
          data: { ...data, content: tableMessage }
        });
        
      default:
        throw new UnsupportedResourceError(`Resource ${resource} not supported by Slack adapter`);
    }
  }

  private formatDatasetAsSlackTable(data: any): string {
    // Convert dataset to Slack-formatted table
    const { name, attributes, data: rows } = data;
    
    let message = `*Dataset: ${name}*\n\n`;
    
    // Create header row
    const headers = attributes.map((attr: any) => attr.name).join(' | ');
    message += `${headers}\n`;
    message += headers.replace(/[^|]/g, '-') + '\n';
    
    // Add data rows (limited to first 10 for readability)
    const displayRows = rows.slice(0, 10);
    for (const row of displayRows) {
      const values = attributes.map((attr: any) => row[attr.name] || '').join(' | ');
      message += `${values}\n`;
    }
    
    if (rows.length > 10) {
      message += `\n_... and ${rows.length - 10} more rows_`;
    }
    
    return message;
  }
}
```

### Database Adapter Implementation

```typescript
export class DatabaseAdapter implements ApplicationAdapter {
  readonly name = "database";
  readonly version = "1.0.0";
  readonly capabilities = [
    AdapterCapability.CREATE_DATASET,
    AdapterCapability.QUERY_DATA,
    AdapterCapability.BULK_INSERT
  ];

  private connection: DatabaseConnection;

  async executeOperation(operation: UniversalOperation): Promise<OperationResult> {
    switch (operation.type) {
      case 'create':
        return this.handleDatabaseCreate(operation);
      case 'query':
        return this.handleDatabaseQuery(operation);
      case 'update':
        return this.handleDatabaseUpdate(operation);
      default:
        throw new UnsupportedOperationError(`Operation ${operation.type} not supported by database adapter`);
    }
  }

  private async handleDatabaseCreate(operation: UniversalOperation): Promise<OperationResult> {
    const { resource, data } = operation;
    
    switch (resource) {
      case 'dataset':
        // Create database table from dataset specification
        const tableName = this.sanitizeTableName(data.name);
        const columns = this.mapAttributesToSQLColumns(data.attributes);
        
        const createTableSQL = `
          CREATE TABLE ${tableName} (
            id SERIAL PRIMARY KEY,
            ${columns.map(col => `${col.name} ${col.type}`).join(',\n            ')},
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
        
        await this.connection.query(createTableSQL);
        
        // Insert data if provided
        if (data.data && data.data.length > 0) {
          await this.bulkInsertData(tableName, data.attributes, data.data);
        }
        
        return {
          success: true,
          result: {
            tableName,
            rowCount: data.data?.length || 0,
            schema: columns
          }
        };
        
      default:
        throw new UnsupportedResourceError(`Resource ${resource} not supported`);
    }
  }

  private mapAttributesToSQLColumns(attributes: any[]): SQLColumn[] {
    return attributes.map(attr => ({
      name: this.sanitizeColumnName(attr.name),
      type: this.mapUniversalTypeToSQL(attr.type),
      nullable: !attr.required
    }));
  }

  private mapUniversalTypeToSQL(type: string): string {
    const typeMap: Record<string, string> = {
      'number': 'DECIMAL',
      'integer': 'INTEGER',
      'string': 'TEXT',
      'boolean': 'BOOLEAN',
      'date': 'TIMESTAMP'
    };
    return typeMap[type] || 'TEXT';
  }
}
```

### Universal Tool Using Adapters

```typescript
export class UniversalDatasetTool implements ToolModule {
  readonly definition = {
    name: "create_dataset",
    version: "2.0.0",
    description: "Create a dataset in any supported application",
    author: "Universal Tools Team",
    tags: ["dataset", "universal", "cross-platform"]
  };

  readonly schema: ToolSchema = {
    name: "create_dataset",
    description: "Create a dataset with optional visualization",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", required: true },
        attributes: { 
          type: "array", 
          required: true,
          items: {
            type: "object",
            properties: {
              name: { type: "string", required: true },
              type: { 
                type: "string", 
                enum: ["number", "string", "date", "boolean"],
                required: true 
              },
              description: { type: "string" }
            }
          }
        },
        data: { type: "array" },
        application: { 
          type: "string", 
          enum: ["codap", "slack", "database", "api"],
          description: "Target application for dataset creation"
        },
        options: {
          type: "object",
          properties: {
            createVisualization: { type: "boolean" },
            notificationChannel: { type: "string" },
            tableName: { type: "string" }
          }
        }
      },
      required: ["name", "attributes", "application"]
    }
  };

  private adapterRegistry: AdapterRegistry;

  async execute(args: Record<string, any>, context: ExecutionContext): Promise<ToolResult> {
    const { application, options = {}, ...operationData } = args;
    
    // Get appropriate adapter
    const adapter = this.adapterRegistry.getAdapter(application);
    if (!adapter) {
      throw new AdapterNotFoundError(`No adapter available for: ${application}`);
    }

    // Verify adapter supports required capabilities
    if (!adapter.capabilities.includes(AdapterCapability.CREATE_DATASET)) {
      throw new CapabilityNotSupportedError(`${application} adapter does not support dataset creation`);
    }

    try {
      // Execute primary operation
      const operation: UniversalOperation = {
        type: 'create',
        resource: 'dataset',
        data: operationData,
        options
      };

      const result = await adapter.executeOperation(operation);
      
      // Optional: Create visualization if supported and requested
      if (options.createVisualization && 
          adapter.capabilities.includes(AdapterCapability.CREATE_VISUALIZATION)) {
        
        const vizOperation: UniversalOperation = {
          type: 'create',
          resource: 'visualization',
          data: {
            dataContext: operationData.name,
            xAxis: operationData.attributes[0]?.name,
            yAxis: operationData.attributes[1]?.name,
            type: 'scatter'
          }
        };
        
        const vizResult = await adapter.executeOperation(vizOperation);
        result.result.visualization = vizResult.result;
      }

      return {
        success: true,
        result: result.result,
        metadata: {
          adapter: adapter.name,
          capabilities: adapter.capabilities,
          operation: operation.type
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          type: "adapter_error",
          message: `${application} adapter failed: ${error.message}`,
          details: { 
            adapter: adapter.name, 
            error: error.stack,
            operation: 'create_dataset'
          }
        }
      };
    }
  }
}
```

### Adapter Registry and Routing

```typescript
export class AdapterRegistry {
  private adapters = new Map<string, ApplicationAdapter>();

  registerAdapter(adapter: ApplicationAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  getAdapter(name: string): ApplicationAdapter | undefined {
    return this.adapters.get(name);
  }

  getAdaptersByCapability(capability: AdapterCapability): ApplicationAdapter[] {
    return Array.from(this.adapters.values())
      .filter(adapter => adapter.capabilities.includes(capability));
  }

  async routeOperation(
    operation: UniversalOperation, 
    preferredAdapters?: string[]
  ): Promise<OperationResult> {
    // Route to preferred adapter if specified and available
    if (preferredAdapters) {
      for (const adapterName of preferredAdapters) {
        const adapter = this.adapters.get(adapterName);
        if (adapter && this.supportsOperation(adapter, operation)) {
          return adapter.executeOperation(operation);
        }
      }
    }

    // Find any adapter that supports the operation
    const compatibleAdapters = Array.from(this.adapters.values())
      .filter(adapter => this.supportsOperation(adapter, operation));

    if (compatibleAdapters.length === 0) {
      throw new NoCompatibleAdapterError(`No adapter supports operation: ${operation.type} on ${operation.resource}`);
    }

    // Use first compatible adapter (could implement load balancing here)
    return compatibleAdapters[0].executeOperation(operation);
  }

  private supportsOperation(adapter: ApplicationAdapter, operation: UniversalOperation): boolean {
    // Implementation depends on operation type and adapter capabilities
    // This would be more sophisticated in practice
    return true;
  }
}
```

## UX/UI Considerations

### Application Selection Interface
- Dropdown or tabs for choosing target application
- Capability indicators showing what each adapter supports
- Real-time availability status for each adapter

### Cross-Application Workflows
- Unified tool interface regardless of backend
- Clear feedback about adapter-specific behaviors
- Error messages that explain adapter limitations

### Configuration Management
- Adapter connection settings per user/session
- Credential management for different applications
- Fallback adapter preferences

## Acceptance Criteria

1. **Universal Interface**: All adapters implement the same ApplicationAdapter interface
2. **CODAP Compatibility**: Existing CODAP tools work unchanged through the CODAP adapter
3. **Cross-Application Tools**: Same tool works across CODAP, Slack, and database backends
4. **Capability Detection**: System automatically detects what each adapter supports
5. **Error Handling**: Graceful handling of adapter failures with clear error messages
6. **Resource Mapping**: Automatic translation between universal and application-specific formats
7. **Configuration**: Adapter settings configurable via environment/config files
8. **Performance**: Adapter layer adds <5ms overhead to tool execution
9. **Extensibility**: New adapters can be added without modifying existing tools
10. **Testing**: Comprehensive adapter testing including mock adapters for testing

## Dependencies

- Depends on Tool Module system (PBI-14) for plugin architecture
- Requires TypeScript implementation (PBI-12) for interface enforcement
- Benefits from monitoring system (PBI-6) for adapter health tracking

## Open Questions

1. **Schema Translation**: How to handle complex schema mismatches between applications?
2. **Transaction Management**: How to handle multi-step operations that span adapters?
3. **Real-time Sync**: Should adapters support real-time data synchronization?
4. **Adapter Marketplace**: Should there be a marketplace for third-party adapters?
5. **Performance Optimization**: How to minimize latency when routing through adapters?

## Related Tasks

Tasks will be defined when this PBI moves from Proposed to Agreed status, following the established task breakdown and documentation process. 