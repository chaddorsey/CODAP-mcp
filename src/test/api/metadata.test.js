// Mock the session validation middleware
jest.mock('../../../api/_middleware/sessionValidation', () => ({
  withSessionValidation: (handler) => handler,
  createErrorResponse: jest.fn((res, status, error, message) => {
    res.status(status).json({ error, message });
  })
}));

// Mock kv-utils to avoid Redis dependency
jest.mock('../../../api/kv-utils', () => ({
  getSession: jest.fn()
}));

// Add TextEncoder/TextDecoder polyfills for test environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
}

describe('Metadata API Version Management', () => {
  let handler;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Load the handler
    handler = require('../../../api/metadata.js');
  });

  const createMockRequest = (overrides = {}) => ({
    method: 'GET',
    query: { code: 'ABCD2345' },
    headers: {},
    session: {
      id: 'test-session',
      expiresAt: new Date(Date.now() + 600000).toISOString()
    },
    sessionCode: 'ABCD2345',
    ...overrides
  });

  const createMockResponse = () => {
    const res = {
      headers: {},
      statusCode: 200,
      setHeader: jest.fn((name, value) => {
        res.headers[name] = value;
      }),
      status: jest.fn((code) => {
        res.statusCode = code;
        return res;
      }),
      json: jest.fn((data) => {
        res.body = data;
        return res;
      }),
      end: jest.fn()
    };
    return res;
  };

  describe('Version Headers', () => {
    it('should include all required version headers', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('API-Version', '1.0.0');
      expect(res.setHeader).toHaveBeenCalledWith('Tool-Manifest-Version', '1.0.0');
      expect(res.setHeader).toHaveBeenCalledWith('Supported-Versions', '1.0.0');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Accept-Version');
    });

    it('should set CORS headers correctly', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, OPTIONS');
    });
  });

  describe('Response Body Versioning', () => {
    it('should include version information in response body', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseBody = res.json.mock.calls[0][0];
      
      expect(responseBody).toHaveProperty('apiVersion', '1.0.0');
      expect(responseBody).toHaveProperty('toolManifestVersion', '1.0.0');
      expect(responseBody).toHaveProperty('supportedVersions');
      expect(responseBody.supportedVersions).toEqual({
        api: ['1.0.0'],
        toolManifest: ['1.0.0']
      });
    });

    it('should include existing manifest structure', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      const responseBody = res.json.mock.calls[0][0];
      
      expect(responseBody).toHaveProperty('version', '1.0.0');
      expect(responseBody).toHaveProperty('tools');
      expect(responseBody).toHaveProperty('sessionCode', 'ABCD2345');
      expect(responseBody).toHaveProperty('generatedAt');
      expect(responseBody).toHaveProperty('expiresAt');
      expect(Array.isArray(responseBody.tools)).toBe(true);
    });
  });

  describe('Version Negotiation', () => {
    it('should accept supported version in Accept-Version header', async () => {
      const req = createMockRequest({
        headers: { 'accept-version': '1.0.0' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('should reject unsupported version with 406 Not Acceptable', async () => {
      const req = createMockRequest({
        headers: { 'accept-version': '2.0.0' }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(406);
      expect(res.json).toHaveBeenCalledWith({
        error: 'version_not_acceptable',
        message: 'Requested version 2.0.0 not supported. Supported versions: 1.0.0'
      });
    });

    it('should work without Accept-Version header (backward compatibility)', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('HTTP Methods', () => {
    it('should handle OPTIONS requests for CORS preflight', async () => {
      const req = createMockRequest({ method: 'OPTIONS' });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.end).toHaveBeenCalled();
    });

    it('should reject non-GET methods (except OPTIONS)', async () => {
      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.json).toHaveBeenCalledWith({
        error: 'method_not_allowed',
        message: 'Only GET method is allowed'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle internal errors gracefully', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      // Mock an error in the session object
      req.session = null;

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'internal_server_error',
        message: 'Failed to retrieve metadata'
      });
    });
  });

  describe('Tool Manifest Structure', () => {
    it('should include expected tools in the manifest', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      const responseBody = res.json.mock.calls[0][0];
      const toolNames = responseBody.tools.map(tool => tool.name);
      
      expect(toolNames).toContain('create_dataset_with_table');
      expect(toolNames).toContain('create_graph');
      expect(toolNames).toContain('create_data_context');
      expect(toolNames).toContain('get_data_contexts');
    });

    it('should have proper tool schema structure', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      const responseBody = res.json.mock.calls[0][0];
      const firstTool = responseBody.tools[0];
      
      expect(firstTool).toHaveProperty('name');
      expect(firstTool).toHaveProperty('description');
      expect(firstTool).toHaveProperty('inputSchema');
      expect(firstTool.inputSchema).toHaveProperty('type', 'object');
      expect(firstTool.inputSchema).toHaveProperty('properties');
    });
  });
}); 