const { TEST_SESSIONS, INVALID_SESSION_CODES } = require("./fixtures/sessionData");

// Mock kv-utils and session validation middleware
jest.mock("../../../api/kv-utils", () => ({
  getSession: jest.fn(),
  setSession: jest.fn(),
  deleteSession: jest.fn(),
  SESSION_TTL: 600
}));

jest.mock("../../../api/_middleware/sessionValidation", () => ({
  withSessionValidation: (handler) => handler,
  createErrorResponse: jest.fn((res, status, error, message) => {
    res.status(status).json({ error, message });
  })
}));

describe("Metadata API Integration Tests", () => {
  let handler;
  let mockGetSession;
  let consoleErrorSpy;

  beforeAll(() => {
    // Import handler after mocks are set up
    handler = require("../../../api/metadata");
    mockGetSession = require("../../../server/utils/kv-utils").getSession;
    
    // Spy on console.error to suppress expected error messages during tests
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (overrides = {}) => ({
    method: "GET",
    query: { code: "ABCD2345" },
    headers: {},
    session: TEST_SESSIONS.valid.data,
    sessionCode: "ABCD2345",
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

  describe("Session Integration Tests", () => {
    it("should successfully retrieve metadata with valid session", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.json).toHaveBeenCalled();
      
      const responseBody = res.json.mock.calls[0][0];
      
      // Verify response structure
      expect(responseBody).toHaveProperty("version", "1.0.0");
      expect(responseBody).toHaveProperty("apiVersion", "1.0.0");
      expect(responseBody).toHaveProperty("toolManifestVersion", "1.0.0");
      expect(responseBody).toHaveProperty("supportedVersions");
      expect(responseBody).toHaveProperty("tools");
      expect(responseBody).toHaveProperty("sessionCode", "ABCD2345");
      expect(responseBody).toHaveProperty("generatedAt");
      expect(responseBody).toHaveProperty("expiresAt");

      // Verify tools array
      expect(Array.isArray(responseBody.tools)).toBe(true);
      expect(responseBody.tools.length).toBeGreaterThan(0);

      // Verify version headers
      expect(res.setHeader).toHaveBeenCalledWith("API-Version", "1.0.0");
      expect(res.setHeader).toHaveBeenCalledWith("Tool-Manifest-Version", "1.0.0");
      expect(res.setHeader).toHaveBeenCalledWith("Supported-Versions", "1.0.0");
    });

    it("should handle expired session correctly", async () => {
      const req = createMockRequest({
        session: TEST_SESSIONS.expired.data,
        sessionCode: TEST_SESSIONS.expired.code
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty("sessionCode", TEST_SESSIONS.expired.code);
      expect(responseBody).toHaveProperty("expiresAt", TEST_SESSIONS.expired.data.expiresAt);
    });

    it("should handle minimal session data", async () => {
      const req = createMockRequest({
        session: TEST_SESSIONS.minimal.data,
        sessionCode: TEST_SESSIONS.minimal.code
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty("sessionCode", TEST_SESSIONS.minimal.code);
      expect(responseBody).toHaveProperty("tools");
    });
  });

  describe("API Endpoint Integration Tests", () => {
    it("should handle CORS preflight OPTIONS request", async () => {
      const req = createMockRequest({ method: "OPTIONS" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.end).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Methods", "GET, OPTIONS");
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Headers", "Content-Type, Accept-Version");
    });

    it("should reject non-GET methods", async () => {
      const req = createMockRequest({ method: "POST" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.json).toHaveBeenCalledWith({
        error: "method_not_allowed",
        message: "Only GET method is allowed"
      });
    });

    it("should handle version negotiation with Accept-Version header", async () => {
      const req = createMockRequest({
        headers: { "accept-version": "1.0.0" }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty("apiVersion", "1.0.0");
    });

    it("should reject unsupported version in Accept-Version header", async () => {
      const req = createMockRequest({
        headers: { "accept-version": "2.0.0" }
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(406);
      expect(res.json).toHaveBeenCalledWith({
        error: "version_not_acceptable",
        message: "Requested version 2.0.0 not supported. Supported versions: 1.0.0"
      });
    });

    it("should work without Accept-Version header (backward compatibility)", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty("apiVersion", "1.0.0");
    });
  });

  describe("Tool Registry Integration Tests", () => {
    it("should return expected tool manifest structure", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      const { tools } = responseBody;
      
      // Verify tools array structure
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Verify each tool has required properties
      tools.forEach(tool => {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool.inputSchema).toHaveProperty("type", "object");
        expect(tool.inputSchema).toHaveProperty("properties");
        expect(typeof tool.name).toBe("string");
        expect(typeof tool.description).toBe("string");
      });
    });

    it("should include expected CODAP tools", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      const toolNames = responseBody.tools.map(tool => tool.name);
      
      // Verify core CODAP tools are present
      expect(toolNames).toContain("create_dataset_with_table");
      expect(toolNames).toContain("create_graph");
      expect(toolNames).toContain("create_data_context");
      expect(toolNames).toContain("get_data_contexts");
    });

    it("should have valid JSON schema for each tool", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      
      responseBody.tools.forEach(tool => {
        const { inputSchema } = tool;
        
        // Basic JSON schema validation
        expect(inputSchema).toHaveProperty("type");
        expect(inputSchema.type).toBe("object");
        
        if (inputSchema.properties) {
          expect(typeof inputSchema.properties).toBe("object");
        }
        
        if (inputSchema.required) {
          expect(Array.isArray(inputSchema.required)).toBe(true);
        }
      });
    });
  });

  describe("Error Handling Integration Tests", () => {
    it("should handle internal errors gracefully", async () => {
      const req = createMockRequest({ session: null });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "internal_server_error",
        message: "Failed to retrieve metadata"
      });
    });

    it("should handle malformed session data gracefully", async () => {
      // The handler is designed to be resilient, so malformed session data 
      // should still return a 200 response with available data
      const req = createMockRequest({
        session: { invalid: "session without expiresAt" },
        sessionCode: "TESTCODE"
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty("sessionCode", "TESTCODE");
      expect(responseBody).toHaveProperty("tools");
      // expiresAt should be undefined since the session data is malformed
      expect(responseBody.expiresAt).toBeUndefined();
    });
  });

  describe("Performance Integration Tests", () => {
    it("should respond within acceptable time limits", async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      
      const startTime = Date.now();
      await handler(req, res);
      const responseTime = Date.now() - startTime;
      
      // Should respond within 100ms for unit test
      expect(responseTime).toBeLessThan(100);
      expect(res.statusCode).toBe(200);
    });

    it("should handle multiple sequential requests", async () => {
      const requests = 3;
      const results = [];

      for (let i = 0; i < requests; i++) {
        const req = createMockRequest();
        const res = createMockResponse();
        
        await handler(req, res);
        results.push(res.statusCode);
      }

      // All requests should succeed
      results.forEach(statusCode => {
        expect(statusCode).toBe(200);
      });
    });
  });

  describe("Cross-Component Integration Tests", () => {
    it("should properly integrate with session validation middleware", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      const responseBody = res.json.mock.calls[0][0];
      
      // Verify middleware-provided session info is used
      expect(responseBody).toHaveProperty("sessionCode", "ABCD2345");
      expect(responseBody).toHaveProperty("expiresAt", TEST_SESSIONS.valid.data.expiresAt);
    });

    it("should maintain proper error response format", async () => {
      const req = createMockRequest({ method: "POST" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody).toHaveProperty("error");
      expect(responseBody).toHaveProperty("message");
    });
  });
}); 
