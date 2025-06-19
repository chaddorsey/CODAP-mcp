import { ToolSchema, ToolParameterSchema } from '../types';

/**
 * Transforms a ToolSchema (internal format) to JSON Schema draft-07.
 * @param toolSchema The internal ToolSchema to transform.
 * @returns JSON Schema draft-07 object.
 */
export function toolSchemaToJsonSchema(toolSchema: ToolSchema): object {
  const { name, description, parameters } = toolSchema;
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: name,
    description,
    ...transformParameterSchema(parameters)
  };
}

/**
 * Recursively transforms ToolParameterSchema to JSON Schema properties.
 * @param paramSchema The ToolParameterSchema or parameters object.
 * @returns JSON Schema object.
 */
function transformParameterSchema(paramSchema: any): object {
  if (!paramSchema) return {};
  const { type, properties, items, required, description, enum: enumValues, ...rest } = paramSchema;
  const base: any = { type };
  if (description) base.description = description;
  if (enumValues) base.enum = enumValues;
  if (type === 'object') {
    base.properties = {};
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        base.properties[key] = transformParameterSchema(value);
      }
    }
    if (required) base.required = required;
  } else if (type === 'array') {
    base.items = items ? transformParameterSchema(items) : {};
  }
  // Copy over other JSON Schema-relevant fields
  for (const key of ['default', 'minimum', 'maximum', 'pattern']) {
    if (rest[key] !== undefined) base[key] = rest[key];
  }
  return base;
} 