# PBI-15: Universal Adapter Architecture Design

## Executive Summary

This design document outlines the architectural approach for creating a universal adapter pattern that enables the same tool interface to work across completely different backend systems (CODAP, Slack, databases, APIs). This transforms the platform from a CODAP-specific tool system into a universal application integration hub.

## Current State Analysis

### CODAP-Specific Limitations

The current system is tightly coupled to CODAP APIs with hardcoded tool implementations that only work with CODAP's `sendMessage(action, resource, values)` format.

### Key Problems

- **Application Lock-in**: Tools only work with CODAP
- **Limited Market Appeal**: Reduces platform's addressable market
- **Maintenance Burden**: Each application requires separate tool implementations
- **Integration Complexity**: New applications need complete tool rewrites

## Target Architecture: Universal Adapter Pattern

### Core Concept: Application-Agnostic Tools

Transform tools to work with any backend through standardized adapters that implement a common interface while handling application-specific details internally.

### Universal Operation Interface

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

## Adapter Implementations

### CODAP Adapter

```typescript
export class CODAPAdapter implements ApplicationAdapter {
  readonly name = "codap";
  readonly capabilities = [
    AdapterCapability.CREATE_DATASET,
    AdapterCapability.CREATE_VISUALIZATION,
    AdapterCapability.QUERY_DATA
  ];

  async executeOperation(operation: UniversalOperation): Promise<OperationResult> {
    switch (operation.type) {
      case 'create':
        return this.handleCreate(operation);
      case 'read':
        return this.handleRead(operation);
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
          metadata: { adapter: this.name, originalOperation: operation }
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
}
```

### Slack Adapter

```typescript
export class SlackAdapter implements ApplicationAdapter {
  readonly name = "slack";
  readonly capabilities = [
    AdapterCapability.SEND_MESSAGE,
    AdapterCapability.CREATE_CHANNEL,
    AdapterCapability.FILE_UPLOAD
  ];

  private slackClient: WebClient;

  async executeOperation(operation: UniversalOperation): Promise<OperationResult> {
    const { resource, data } = operation;
    
    switch (resource) {
      case 'message':
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
        
      case 'dataset':
        // Convert dataset to Slack table message
        const tableMessage = this.formatDatasetAsSlackTable(data);
        return this.executeOperation({
          ...operation,
          resource: 'message',
          data: { ...data, content: tableMessage }
        });
        
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
    }
  }

  private formatDatasetAsSlackTable(data: any): string {
    const { name, attributes, data: rows } = data;
    
    let message = `*Dataset: ${name}*\n\n`;
    const headers = attributes.map((attr: any) => attr.name).join(' | ');
    message += `${headers}\n`;
    message += headers.replace(/[^|]/g, '-') + '\n';
    
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

### Database Adapter

```typescript
export class DatabaseAdapter implements ApplicationAdapter {
  readonly name = "database";
  readonly capabilities = [
    AdapterCapability.CREATE_DATASET,
    AdapterCapability.QUERY_DATA,
    AdapterCapability.BULK_INSERT
  ];

  private connection: DatabaseConnection;

  async executeOperation(operation: UniversalOperation): Promise<OperationResult> {
    const { resource, data } = operation;
    
    if (resource === 'dataset' && operation.type === 'create') {
      // Create database table from dataset specification
      const tableName = this.sanitizeTableName(data.name);
      const columns = this.mapAttributesToSQLColumns(data.attributes);
      
      const createTableSQL = `
        CREATE TABLE ${tableName} (
          id SERIAL PRIMARY KEY,
          ${columns.map(col => `${col.name} ${col.type}`).join(',\n          ')},
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
    }

    throw new UnsupportedOperationError(`Operation not supported: ${operation.type} on ${resource}`);
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

## Universal Tool Example

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
              }
            }
          }
        },
        data: { type: "array" },
        application: { 
          type: "string", 
          enum: ["codap", "slack", "database", "api"],
          description: "Target application for dataset creation"
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

    // Execute primary operation
    const operation: UniversalOperation = {
      type: 'create',
      resource: 'dataset',
      data: operationData,
      options
    };

    const result = await adapter.executeOperation(operation);
    
    return {
      success: true,
      result: result.result,
      metadata: {
        adapter: adapter.name,
        capabilities: adapter.capabilities,
        operation: operation.type
      }
    };
  }
}
```

## Adapter Registry System

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
}
```

## Implementation Strategy

### Phase 1: Universal Interfaces
1. Define `UniversalOperation` and `ApplicationAdapter` interfaces
2. Create `AdapterRegistry` system
3. Implement basic operation routing

### Phase 2: Core Adapters
1. Implement CODAP adapter (maintains current functionality)
2. Create Slack adapter for messaging and notifications
3. Develop Database adapter for data persistence

### Phase 3: Tool Migration
1. Migrate existing tools to use adapter pattern
2. Add application selection to tool parameters
3. Implement adapter capability detection

### Phase 4: Advanced Features
1. Add REST API adapter
2. Implement adapter health monitoring
3. Create adapter configuration management

## Cross-Application Use Cases

### Data Analysis Workflow
1. **CODAP**: Create and visualize dataset
2. **Slack**: Notify team of analysis completion
3. **Database**: Persist results for future reference

### Business Intelligence Pipeline
1. **Database**: Query source data
2. **CODAP**: Create analysis and visualizations
3. **Slack**: Share insights with stakeholders

### Collaborative Research
1. **CODAP**: Conduct data exploration
2. **Database**: Store intermediate results
3. **Slack**: Coordinate team discussions

## Benefits

### Market Expansion
- **Broader Appeal**: Platform works with popular business tools
- **Reduced Barriers**: Teams can use existing infrastructure
- **Increased Adoption**: Familiar interfaces reduce learning curve

### Technical Advantages
- **Code Reuse**: Same tools work across applications
- **Maintainability**: Single tool implementation supports multiple backends
- **Testing**: Adapter pattern enables comprehensive testing

### User Experience
- **Unified Interface**: Consistent tool behavior across applications
- **Flexibility**: Choose appropriate backend for each use case
- **Integration**: Seamless workflows across multiple applications

## Risk Mitigation

### Data Consistency
- Transaction management across adapters
- Rollback mechanisms for failed operations
- Data validation at adapter boundaries

### Performance Optimization
- Adapter connection pooling
- Operation caching where appropriate
- Lazy loading of adapter resources

### Error Handling
- Graceful degradation when adapters fail
- Clear error messages explaining adapter limitations
- Fallback adapter selection

## Success Metrics

1. **Cross-Platform Usage**: 30% of tool executions use non-CODAP adapters
2. **Market Expansion**: 50% increase in platform adoption
3. **Developer Productivity**: Time to add new application support reduced by 70%
4. **User Satisfaction**: 90% approval rating for cross-application workflows
5. **System Reliability**: 99.9% uptime across all adapters

This architecture transforms the platform from a CODAP-specific tool system into a universal application integration hub, dramatically expanding its market potential and user value proposition. 