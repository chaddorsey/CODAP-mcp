/**
 * Validation utilities for tool request parsing
 * Provides security checks, sanitization, and parameter validation
 */

import { ParseError, ToolParameterSchema } from "../types";

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(input: string, maxLength = 10000): string {
  if (typeof input !== "string") {
    return "";
  }
  
  // Remove control characters except tabs, newlines, and carriage returns
  // eslint-disable-next-line no-control-regex
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  
  // Truncate to max length
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned;
}

/**
 * Check if input is a valid object (not null, not array)
 */
export function isValidObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

/**
 * Calculate object depth for security validation
 */
export function getObjectDepth(obj: unknown, currentDepth = 0): number {
  if (currentDepth > 50) { // Prevent stack overflow
    return currentDepth;
  }
  
  if (!isValidObject(obj)) {
    return currentDepth;
  }
  
  let maxDepth = currentDepth;
  
  for (const value of Object.values(obj)) {
    if (isValidObject(value) || Array.isArray(value)) {
      const depth = getObjectDepth(value, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  
  return maxDepth;
}

/**
 * Validate request size in bytes
 */
export function validateRequestSize(data: unknown, maxSize: number): ParseError | null {
  try {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = new TextEncoder().encode(jsonString).length;
    
    if (sizeInBytes > maxSize) {
      return {
        code: "REQUEST_TOO_LARGE",
        message: `Request size ${sizeInBytes} bytes exceeds maximum ${maxSize} bytes`,
        details: { size: sizeInBytes, maxSize }
      };
    }
    
    return null;
  } catch (error) {
    return {
      code: "SIZE_VALIDATION_ERROR",
      message: "Failed to calculate request size",
      details: { error: error instanceof Error ? error.message : "Unknown error" }
    };
  }
}

/**
 * Validate object depth for security
 */
export function validateObjectDepth(data: unknown, maxDepth: number): ParseError | null {
  const depth = getObjectDepth(data);
  
  if (depth > maxDepth) {
    return {
      code: "OBJECT_TOO_DEEP",
      message: `Object depth ${depth} exceeds maximum ${maxDepth}`,
      details: { depth, maxDepth }
    };
  }
  
  return null;
}

/**
 * Validate required fields in request
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): ParseError | null {
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      return {
        code: "MISSING_REQUIRED_FIELD",
        message: `Missing required field: ${field}`,
        details: { field, requiredFields }
      };
    }
  }
  
  return null;
}

/**
 * Validate parameter against schema
 */
export function validateParameter(
  value: unknown,
  schema: ToolParameterSchema,
  paramName: string
): ParseError | null {
  // Check type
  if (!validateParameterType(value, schema.type)) {
    return {
      code: "INVALID_PARAMETER_TYPE",
      message: `Parameter '${paramName}' must be of type ${schema.type}`,
      details: { paramName, expectedType: schema.type, actualType: typeof value }
    };
  }
  
  // Check enum values
  if (schema.enum && !schema.enum.includes(value)) {
    return {
      code: "INVALID_ENUM_VALUE",
      message: `Parameter '${paramName}' must be one of: ${schema.enum.join(", ")}`,
      details: { paramName, allowedValues: schema.enum, actualValue: value }
    };
  }
  
  // Type-specific validations
  if (schema.type === "string" && typeof value === "string") {
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        return {
          code: "PATTERN_MISMATCH",
          message: `Parameter '${paramName}' does not match required pattern`,
          details: { paramName, pattern: schema.pattern, value }
        };
      }
    }
  }
  
  if (schema.type === "number" && typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      return {
        code: "VALUE_TOO_SMALL",
        message: `Parameter '${paramName}' must be >= ${schema.minimum}`,
        details: { paramName, minimum: schema.minimum, value }
      };
    }
    
    if (schema.maximum !== undefined && value > schema.maximum) {
      return {
        code: "VALUE_TOO_LARGE",
        message: `Parameter '${paramName}' must be <= ${schema.maximum}`,
        details: { paramName, maximum: schema.maximum, value }
      };
    }
  }
  
  return null;
}

/**
 * Validate parameter type
 */
function validateParameterType(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return isValidObject(value);
    case "array":
      return Array.isArray(value);
    default:
      return false;
  }
}

/**
 * Sanitize parameters recursively
 */
export function sanitizeParameters(
  params: Record<string, unknown>,
  maxStringLength = 10000,
  maxDepth = 10,
  currentDepth = 0
): Record<string, unknown> {
  if (currentDepth >= maxDepth) {
    return {};
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value, maxStringLength);
    } else if (isValidObject(value)) {
      sanitized[key] = sanitizeParameters(
        value as Record<string, unknown>,
        maxStringLength,
        maxDepth,
        currentDepth + 1
      );
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (typeof item === "string") {
          return sanitizeString(item, maxStringLength);
        } else if (isValidObject(item)) {
          return sanitizeParameters(
            item as Record<string, unknown>,
            maxStringLength,
            maxDepth,
            currentDepth + 1
          );
        }
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
} 
