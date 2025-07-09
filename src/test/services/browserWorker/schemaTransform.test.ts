import { toolSchemaToJsonSchema } from "../../../services/browserWorker/utils/schemaTransform";
// If ToolSchema is not exported, comment out or remove the import and use an inline type for the test
// import { ToolSchema } from "../../../services/browserWorker/types";

type ToolSchema = {
  name: string;
  description: string;
  parameters: any;
};

describe("toolSchemaToJsonSchema", () => {
  it("should transform a simple ToolSchema to JSON Schema draft-07", () => {
    const toolSchema: ToolSchema = {
      name: "test_tool",
      description: "A test tool",
      parameters: {
        type: "object",
        properties: {
          foo: { type: "string", description: "A foo", required: true },
          bar: { type: "number", minimum: 0, maximum: 10 },
          baz: { type: "boolean" },
          qux: {
            type: "object",
            properties: {
              nested: { type: "string", enum: ["a", "b"] }
            }
          },
          arr: {
            type: "array",
            items: { type: "number" }
          }
        },
        required: ["foo", "bar"]
      }
    };
    const jsonSchema = toolSchemaToJsonSchema(toolSchema);
    expect(jsonSchema).toMatchObject({
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "test_tool",
      description: "A test tool",
      type: "object",
      properties: {
        foo: { type: "string", description: "A foo" },
        bar: { type: "number", minimum: 0, maximum: 10 },
        baz: { type: "boolean" },
        qux: {
          type: "object",
          properties: {
            nested: { type: "string", enum: ["a", "b"] }
          }
        },
        arr: {
          type: "array",
          items: { type: "number" }
        }
      },
      required: ["foo", "bar"]
    });
  });
}); 
