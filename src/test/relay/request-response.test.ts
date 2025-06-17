import { ToolRequestSchema, ToolResponseSchema } from '../../../server/relay/schemas';

describe('Request/Response Schema Validation', () => {
  describe('ToolRequestSchema', () => {
    const validRequest = {
      code: 'ABC23456',
      id: 'test-request-1',
      tool: 'create_codap_graph',
      args: { dataset: 'students' }
    };

    it('should validate valid tool request', () => {
      const result = ToolRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('ABC23456');
        expect(result.data.id).toBe('test-request-1');
        expect(result.data.tool).toBe('create_codap_graph');
        expect(result.data.args).toEqual({ dataset: 'students' });
      }
    });

    it('should reject invalid session code format', () => {
      const invalid = { ...validRequest, code: 'invalid' };
      const result = ToolRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing tool name', () => {
      const invalid = { ...validRequest, tool: '' };
      const result = ToolRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing request ID', () => {
      const invalid = { ...validRequest, id: '' };
      const result = ToolRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should handle empty args object', () => {
      const withEmptyArgs = { ...validRequest, args: {} };
      const result = ToolRequestSchema.safeParse(withEmptyArgs);
      expect(result.success).toBe(true);
    });

    it('should handle missing args property', () => {
      const { args, ...withoutArgs } = validRequest;
      const result = ToolRequestSchema.safeParse(withoutArgs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.args).toEqual({});
      }
    });
  });

  describe('ToolResponseSchema', () => {
    const validResponse = {
      code: 'ABC23456',
      id: 'test-request-1',
      result: {
        content: [
          {
            type: 'text' as const,
            text: 'Graph created successfully'
          }
        ]
      }
    };

    it('should validate valid tool response', () => {
      const result = ToolResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('ABC23456');
        expect(result.data.id).toBe('test-request-1');
        expect(result.data.result.content).toHaveLength(1);
        expect(result.data.result.content[0].type).toBe('text');
      }
    });

    it('should reject invalid session code format', () => {
      const invalid = { ...validResponse, code: 'invalid' };
      const result = ToolResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing request ID', () => {
      const invalid = { ...validResponse, id: '' };
      const result = ToolResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate multiple content items', () => {
      const multipleContent = {
        ...validResponse,
        result: {
          content: [
            { type: 'text' as const, text: 'First message' },
            { type: 'text' as const, text: 'Second message' }
          ]
        }
      };
      const result = ToolResponseSchema.safeParse(multipleContent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.result.content).toHaveLength(2);
      }
    });

    it('should reject invalid content type', () => {
      const invalidContent = {
        ...validResponse,
        result: {
          content: [
            { type: 'invalid', text: 'Test message' }
          ]
        }
      };
      const result = ToolResponseSchema.safeParse(invalidContent);
      expect(result.success).toBe(false);
    });
  });

  describe('Session code validation', () => {
    // Base32 characters: A-Z and 2-7 only
    const validCodes = ['A2345672', 'ZZZZZZZZ', 'B7B7B7B7', 'ABCDEFGH'];
    const invalidCodes = ['abc12345', '1234567890', 'A234567', 'A23456789', 'A234567!', '12345678'];

    it('should accept valid Base32 session codes', () => {
      validCodes.forEach(code => {
        const request = { code, id: 'test', tool: 'test', args: {} };
        const result = ToolRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid session codes', () => {
      invalidCodes.forEach(code => {
        const request = { code, id: 'test', tool: 'test', args: {} };
        const result = ToolRequestSchema.safeParse(request);
        expect(result.success).toBe(false);
      });
    });
  });
}); 