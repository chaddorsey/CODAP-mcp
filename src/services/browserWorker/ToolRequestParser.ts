/**
 * Tool Request Parser
 * Handles parsing, validation, and security checks for incoming MCP tool requests
 */

import { 
  ToolRequestParserInterface, 
  ToolRequestParserConfig, 
  DEFAULT_PARSER_CONFIG,
  ParseResult,
  ParseError,
  ToolRequest
} from "./types";

import {
  validateRequestSize,
  validateObjectDepth,
  validateRequiredFields,
  validateParameter,
  sanitizeParameters,
  isValidObject
} from "./utils/validation";

import {
  getToolSchema,
  isToolSupported,
  getSupportedTools
} from "./schemas/toolSchemas";

/**
 * Main tool request parser implementation
 */
export class ToolRequestParser implements ToolRequestParserInterface {
  private config: ToolRequestParserConfig;

  constructor(config: Partial<ToolRequestParserConfig> = {}) {
    this.config = { ...DEFAULT_PARSER_CONFIG, ...config };
  }

  /**
   * Parse raw request data into validated tool request
   */
  parseRequest(rawRequest: unknown): ParseResult {
    try {
      // Security validations first
      if (this.config.enableSecurityValidation) {
        const sizeError = validateRequestSize(rawRequest, this.config.maxRequestSize);
        if (sizeError) {
          return { success: false, error: sizeError };
        }

        const depthError = validateObjectDepth(rawRequest, this.config.maxObjectDepth);
        if (depthError) {
          return { success: false, error: depthError };
        }
      }

      // Parse to tool request structure
      const parseResult = this.parseToToolRequest(rawRequest);
      if (!parseResult.success) {
        return parseResult;
      }

      const toolRequest = parseResult.data!;

      // Validate tool exists
      if (!this.validateTool(toolRequest.tool)) {
        if (!this.config.allowUnknownTools) {
          return {
            success: false,
            error: {
              code: "UNKNOWN_TOOL",
              message: `Tool '${toolRequest.tool}' is not supported`,
              details: { 
                tool: toolRequest.tool, 
                supportedTools: this.getSupportedTools() 
              }
            }
          };
        }
      }

      // Validate parameters if tool is known
      if (this.validateTool(toolRequest.tool)) {
        const paramError = this.validateParameters(toolRequest.tool, toolRequest.parameters);
        if (paramError) {
          return { success: false, error: paramError };
        }
      }

      // Sanitize parameters if enabled
      let sanitizedParameters = toolRequest.parameters;
      if (this.config.sanitizeInputs) {
        sanitizedParameters = sanitizeParameters(
          toolRequest.parameters,
          this.config.maxStringLength,
          this.config.maxObjectDepth
        );
      }

      // Apply custom validators
      if (this.config.customValidators) {
        for (const [validatorName, validator] of Object.entries(this.config.customValidators)) {
          if (!validator(toolRequest.parameters)) {
            return {
              success: false,
              error: {
                code: "CUSTOM_VALIDATION_FAILED",
                message: `Custom validation '${validatorName}' failed`,
                details: { validator: validatorName }
              }
            };
          }
        }
      }

      // Return successfully parsed request
      return {
        success: true,
        data: {
          ...toolRequest,
          parameters: sanitizedParameters
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: "Failed to parse tool request",
          details: { 
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined
          }
        }
      };
    }
  }

  /**
   * Validate that a tool is supported
   */
  validateTool(toolName: string): boolean {
    return isToolSupported(toolName);
  }

  /**
   * Validate tool parameters against schema
   */
  validateParameters(toolName: string, parameters: Record<string, unknown>): ParseError | null {
    const schema = getToolSchema(toolName);
    if (!schema) {
      // If we don't have a schema and unknown tools are allowed, skip validation
      if (this.config.allowUnknownTools) {
        return null;
      }
      return {
        code: "SCHEMA_NOT_FOUND",
        message: `No schema found for tool '${toolName}'`,
        details: { tool: toolName }
      };
    }

    // Validate required parameters
    if (schema.parameters.required) {
      const requiredError = validateRequiredFields(parameters, schema.parameters.required);
      if (requiredError) {
        return requiredError;
      }
    }

    // Validate each parameter against its schema
    for (const [paramName, paramSchema] of Object.entries(schema.parameters.properties)) {
      const value = parameters[paramName];
      
      // Skip validation for undefined optional parameters
      if (value === undefined && !schema.parameters.required?.includes(paramName)) {
        continue;
      }

      const paramError = validateParameter(value, paramSchema, paramName);
      if (paramError) {
        return paramError;
      }
    }

    return null;
  }

  /**
   * Get list of supported tools
   */
  getSupportedTools(): string[] {
    return getSupportedTools();
  }

  /**
   * Update parser configuration
   */
  updateConfig(newConfig: Partial<ToolRequestParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ToolRequestParserConfig {
    return { ...this.config };
  }

  /**
   * Parse raw data to tool request structure
   */
  private parseToToolRequest(rawRequest: unknown): ParseResult {
    // Check if input is valid object
    if (!isValidObject(rawRequest)) {
      return {
        success: false,
        error: {
          code: "INVALID_REQUEST_FORMAT",
          message: "Request must be a valid JSON object",
          details: { actualType: typeof rawRequest }
        }
      };
    }

    const data = rawRequest as Record<string, unknown>;

    // Handle different input formats
    if (this.isToolRequestFormat(data)) {
      // Direct ToolRequest format
      return this.parseToolRequestFormat(data);
    } else if (this.isSSEEventFormat(data)) {
      // SSE event format with nested tool request
      return this.parseSSEEventFormat(data);
    } else if (this.isGenericFormat(data)) {
      // Generic format with tool and args/parameters
      return this.parseGenericFormat(data);
    } else {
      return {
        success: false,
        error: {
          code: "UNRECOGNIZED_FORMAT",
          message: "Request format not recognized",
          details: { availableFields: Object.keys(data) }
        }
      };
    }
  }

  /**
   * Check if data matches ToolRequest format
   */
  private isToolRequestFormat(data: Record<string, unknown>): boolean {
    return typeof data.id === "string" && 
           typeof data.tool === "string" && 
           typeof data.args === "object" &&
           typeof data.timestamp === "string" &&
           typeof data.sessionCode === "string";
  }

  /**
   * Parse ToolRequest format
   */
  private parseToolRequestFormat(data: Record<string, unknown>): ParseResult {
    // Safe casting after validation in isToolRequestFormat
    const toolRequest = data as unknown as ToolRequest;
    
    return {
      success: true,
      data: {
        id: toolRequest.id,
        tool: toolRequest.tool,
        parameters: isValidObject(toolRequest.args) ? toolRequest.args : {},
        metadata: {
          timestamp: toolRequest.timestamp,
          sessionCode: toolRequest.sessionCode
        }
      }
    };
  }

  /**
   * Check if data matches SSE event format
   */
  private isSSEEventFormat(data: Record<string, unknown>): boolean {
    return data.type === "tool-request" && 
           isValidObject(data.data) &&
           this.isToolRequestFormat(data.data as Record<string, unknown>);
  }

  /**
   * Parse SSE event format
   */
  private parseSSEEventFormat(data: Record<string, unknown>): ParseResult {
    const eventData = data.data as Record<string, unknown>;
    return this.parseToolRequestFormat(eventData);
  }

  /**
   * Check if data matches generic format
   */
  private isGenericFormat(data: Record<string, unknown>): boolean {
    return typeof data.tool === "string" && 
           (isValidObject(data.args) || isValidObject(data.parameters));
  }

  /**
   * Parse generic format
   */
  private parseGenericFormat(data: Record<string, unknown>): ParseResult {
    const id = typeof data.id === "string" ? data.id : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tool = data.tool as string;
    const parameters = isValidObject(data.parameters) ? 
      data.parameters : 
      (isValidObject(data.args) ? data.args : {});

    return {
      success: true,
      data: {
        id,
        tool,
        parameters,
        metadata: {
          timestamp: new Date().toISOString(),
          originalFormat: "generic"
        }
      }
    };
  }
} 
