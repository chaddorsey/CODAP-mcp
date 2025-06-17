import { SessionService, SessionServiceError } from '../../services';

// Integration tests that verify SessionService API contract compliance
describe('SessionService Integration Tests', () => {
  const mockBaseUrl = 'https://test-relay.example.com';
  let sessionService: SessionService;

  // Mock fetch for controlled integration testing
  const mockFetch = jest.fn();
  (global as any).fetch = mockFetch;

  beforeEach(() => {
    sessionService = new SessionService({ baseUrl: mockBaseUrl });
    mockFetch.mockClear();
  });

  describe('API Contract Compliance', () => {
    it('should make correct HTTP request to sessions endpoint', async () => {
      const expectedResponse = {
        code: 'ABCD1234',
        ttl: 600,
        expiresAt: '2025-01-17T16:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResponse
      });

      await sessionService.createSession();

      expect(mockFetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({}),
          signal: expect.any(AbortSignal)
        }
      );
    });

    it('should handle relay API response structure correctly', async () => {
      const relayResponse = {
        code: 'TEST1234',
        ttl: 600,
        expiresAt: '2025-01-17T16:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => relayResponse
      });

      const result = await sessionService.createSession();

      expect(result).toEqual(relayResponse);
      expect(sessionService.isValidSession(result.code)).toBe(true);
      expect(result.ttl).toBe(600);
      expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should handle actual relay error responses', async () => {
      const errorScenarios = [
        {
          status: 429,
          response: { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
          expectedErrorType: 'RATE_LIMITED'
        },
        {
          status: 500,
          response: { error: 'Internal server error' },
          expectedErrorType: 'SERVICE_UNAVAILABLE'
        },
        {
          status: 400,
          response: { error: 'Invalid request', code: 'INVALID_REQUEST' },
          expectedErrorType: 'INVALID_SESSION'
        }
      ];

      for (const scenario of errorScenarios) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: scenario.status,
          json: async () => scenario.response
        });

        await expect(sessionService.createSession()).rejects.toThrow(SessionServiceError);
        mockFetch.mockClear();
      }
    });
  });

  describe('Environment Configuration', () => {
    it('should work with production-like URLs', async () => {
      const prodService = new SessionService({
        baseUrl: 'https://codap-mcp.vercel.app'
      });

      const expectedResponse = {
        code: 'PROD1234',
        ttl: 600,
        expiresAt: '2025-01-17T16:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResponse
      });

      const result = await prodService.createSession();
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://codap-mcp.vercel.app/api/sessions',
        expect.any(Object)
      );
      expect(result.code).toBe('PROD1234');
    });

    it('should work with development URLs', async () => {
      const devService = new SessionService({
        baseUrl: 'http://localhost:3000',
        timeout: 5000
      });

      const expectedResponse = {
        code: 'DEV12345',
        ttl: 600,
        expiresAt: '2025-01-17T16:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => expectedResponse
      });

      const result = await devService.createSession();
      
      expect(result.code).toBe('DEV12345');
    });
  });

  describe('Real-world Error Scenarios', () => {
    it('should handle network connectivity issues', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(sessionService.createSession()).rejects.toThrow(SessionServiceError);
      await expect(sessionService.createSession()).rejects.toThrow('Failed to create session after 3 attempts');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(sessionService.createSession()).rejects.toThrow(SessionServiceError);
    });

    it('should handle server timeout scenarios', async () => {
      const timeoutService = new SessionService({
        baseUrl: mockBaseUrl,
        timeout: 100,
        maxRetries: 1
      });

      // Simulate timeout by delaying response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(timeoutService.createSession()).rejects.toThrow(SessionServiceError);
    });
  });

  describe('Session Code Validation Integration', () => {
    it('should validate session codes from actual API responses', async () => {
      const validCodes = ['ABCD1234', 'A2B3C4D5', 'ZZZZ7777'];
      
      for (const code of validCodes) {
        expect(sessionService.isValidSession(code)).toBe(true);
      }
    });

    it('should reject invalid codes that might come from corrupted responses', async () => {
      const invalidCodes = ['abc12345', '12345678', 'ABCD123', 'ABCD12345', ''];
      
      for (const code of invalidCodes) {
        expect(sessionService.isValidSession(code)).toBe(false);
      }
    });
  });

  describe('Service Reliability Features', () => {
    it('should implement exponential backoff correctly', async () => {
      const retryService = new SessionService({
        baseUrl: mockBaseUrl,
        maxRetries: 3,
        retryDelay: 10
      });

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            code: 'SUCCESS1',
            ttl: 600,
            expiresAt: '2025-01-17T16:00:00.000Z'
          })
        });
      });

      const startTime = Date.now();
      const result = await retryService.createSession();
      const endTime = Date.now();

      expect(callCount).toBe(3);
      expect(result.code).toBe('SUCCESS1');
      // Should have some delay for retries (at least 30ms for two retries)
      expect(endTime - startTime).toBeGreaterThan(20);
    });

    it('should abort request on timeout', async () => {
      const timeoutService = new SessionService({
        baseUrl: mockBaseUrl,
        timeout: 50
      });

      let abortSignal: AbortSignal | undefined;
      mockFetch.mockImplementationOnce((url, options) => {
        abortSignal = options?.signal as AbortSignal;
        return new Promise(() => {}); // Never resolves
      });

      const promise = timeoutService.createSession();
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(abortSignal?.aborted).toBe(true);
      await expect(promise).rejects.toThrow('Request timeout');
    });
  });
}); 