const { validateSession, withSessionValidation, isValidSessionCode, createErrorResponse } = require('../../../api/_middleware/sessionValidation');

// Mock kv-utils
jest.mock('../../../api/kv-utils', () => ({
  getSession: jest.fn()
}));

const { getSession } = require('../../../api/kv-utils');

describe('Session Validation Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      query: {},
      params: {},
      session: null,
      sessionCode: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('isValidSessionCode', () => {
    it('should validate correct session code format', () => {
      expect(isValidSessionCode('ABCD2345')).toBe(true);
      expect(isValidSessionCode('Z7Z7Z7Z7')).toBe(true);
      expect(isValidSessionCode('A2B3C4D5')).toBe(true);
    });

    it('should reject invalid session code formats', () => {
      expect(isValidSessionCode('abc12345')).toBe(false); // lowercase
      expect(isValidSessionCode('ABCD123')).toBe(false);  // too short
      expect(isValidSessionCode('ABCD12345')).toBe(false); // too long
      expect(isValidSessionCode('ABCD123!')).toBe(false);  // invalid character
      expect(isValidSessionCode('ABCD1234')).toBe(false);  // contains 0, 1, 8, 9 (not Base32)
      expect(isValidSessionCode('')).toBe(false);          // empty
      expect(isValidSessionCode(null)).toBe(false);        // null
      expect(isValidSessionCode(undefined)).toBe(false);   // undefined
    });
  });

  describe('createErrorResponse', () => {
    it('should create proper error response', () => {
      createErrorResponse(mockRes, 400, 'test_error', 'Test message', 'TEST_CODE');
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'test_error',
        message: 'Test message',
        code: 'TEST_CODE'
      });
    });

    it('should create error response without code', () => {
      createErrorResponse(mockRes, 500, 'server_error', 'Server error');
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'server_error',
        message: 'Server error'
      });
    });
  });

  describe('validateSession', () => {
    const validSessionCode = 'ABCD2345';
    const validSession = {
      id: 'test-session',
      expiresAt: new Date(Date.now() + 600000).toISOString() // 10 minutes from now
    };

    it('should validate session successfully with valid code in query', async () => {
      mockReq.query.code = validSessionCode;
      getSession.mockResolvedValue(validSession);

      const result = await validateSession(mockReq, mockRes, mockNext);

      expect(result).toEqual(validSession);
      expect(mockReq.session).toEqual(validSession);
      expect(mockReq.sessionCode).toBe(validSessionCode);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate session successfully with valid code in params', async () => {
      mockReq.params.code = validSessionCode;
      getSession.mockResolvedValue(validSession);

      const result = await validateSession(mockReq, mockRes);

      expect(result).toEqual(validSession);
      expect(mockReq.session).toEqual(validSession);
      expect(mockReq.sessionCode).toBe(validSessionCode);
    });

    it('should reject request with missing session code', async () => {
      const result = await validateSession(mockReq, mockRes);

      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'invalid_session_code',
        message: 'Session code must be 8-character Base32 format'
      });
    });

    it('should reject request with invalid session code format', async () => {
      mockReq.query.code = 'invalid';

      const result = await validateSession(mockReq, mockRes);

      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'invalid_session_code',
        message: 'Session code must be 8-character Base32 format'
      });
    });

    it('should reject request when session not found', async () => {
      mockReq.query.code = validSessionCode;
      getSession.mockResolvedValue(null);

      const result = await validateSession(mockReq, mockRes);

      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'session_not_found',
        message: 'Session not found or expired'
      });
    });

    it('should reject request when session is expired', async () => {
      const expiredSession = {
        id: 'test-session',
        expiresAt: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      };
      mockReq.query.code = validSessionCode;
      getSession.mockResolvedValue(expiredSession);

      const result = await validateSession(mockReq, mockRes);

      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(410);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'session_expired',
        message: 'Session has expired'
      });
    });

    it('should handle Redis errors gracefully', async () => {
      mockReq.query.code = validSessionCode;
      getSession.mockRejectedValue(new Error('Redis connection error'));

      const result = await validateSession(mockReq, mockRes);

      expect(result).toBeNull();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'internal_server_error',
        message: 'Failed to validate session'
      });
    });
  });

  describe('withSessionValidation', () => {
    const validSessionCode = 'ABCD2345';
    const validSession = {
      id: 'test-session',
      expiresAt: new Date(Date.now() + 600000).toISOString()
    };

    it('should call wrapped handler when session is valid', async () => {
      const mockHandler = jest.fn().mockResolvedValue('handler result');
      const wrappedHandler = withSessionValidation(mockHandler);
      
      mockReq.query.code = validSessionCode;
      getSession.mockResolvedValue(validSession);

      await wrappedHandler(mockReq, mockRes);

      expect(mockHandler).toHaveBeenCalledWith(mockReq, mockRes);
      expect(mockReq.session).toEqual(validSession);
      expect(mockReq.sessionCode).toBe(validSessionCode);
    });

    it('should not call wrapped handler when session is invalid', async () => {
      const mockHandler = jest.fn();
      const wrappedHandler = withSessionValidation(mockHandler);
      
      mockReq.query.code = 'invalid';

      await wrappedHandler(mockReq, mockRes);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should not call wrapped handler when session is not found', async () => {
      const mockHandler = jest.fn();
      const wrappedHandler = withSessionValidation(mockHandler);
      
      mockReq.query.code = validSessionCode;
      getSession.mockResolvedValue(null);

      await wrappedHandler(mockReq, mockRes);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
}); 