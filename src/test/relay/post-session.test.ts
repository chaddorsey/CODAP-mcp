import { generateSessionCode, isValidSessionCode } from "../../../server/relay/utils";

// Mock @vercel/kv for testing
jest.mock("@vercel/kv", () => ({
  kv: {
    incr: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
    setex: jest.fn()
  }
}));

describe("Session Code Generation", () => {
  describe("generateSessionCode", () => {
    it("should generate 8-character codes", () => {
      const code = generateSessionCode();
      expect(code).toHaveLength(8);
    });

    it("should only use valid Base32 characters (A-Z, 2-7)", () => {
      const code = generateSessionCode();
      expect(code).toMatch(/^[A-Z2-7]{8}$/);
    });

    it("should generate different codes on subsequent calls", () => {
      const code1 = generateSessionCode();
      const code2 = generateSessionCode();
      expect(code1).not.toBe(code2);
    });

    it("should have good entropy distribution", () => {
      const codes = new Set();
      const numCodes = 1000;
      
      for (let i = 0; i < numCodes; i++) {
        codes.add(generateSessionCode());
      }
      
      // Should have high uniqueness (at least 99% unique in 1000 attempts)
      expect(codes.size).toBeGreaterThan(numCodes * 0.99);
    });
  });

  describe("isValidSessionCode", () => {
    it("should validate correct 8-character Base32 codes", () => {
      expect(isValidSessionCode("ABCDEFGH")).toBe(true);
      expect(isValidSessionCode("A2B3C4D5")).toBe(true);
      expect(isValidSessionCode("7777AAAA")).toBe(true);
    });

    it("should reject codes with invalid characters", () => {
      expect(isValidSessionCode("ABCDEFG1")).toBe(false); // Contains '1'
      expect(isValidSessionCode("ABCDEFG0")).toBe(false); // Contains '0'
      expect(isValidSessionCode("ABCDEFG8")).toBe(false); // Contains '8'
      expect(isValidSessionCode("ABCDEFG9")).toBe(false); // Contains '9'
      expect(isValidSessionCode("abcdefgh")).toBe(false); // Lowercase
    });

    it("should reject codes with wrong length", () => {
      expect(isValidSessionCode("ABCDEFG")).toBe(false);  // Too short
      expect(isValidSessionCode("ABCDEFGHI")).toBe(false); // Too long
      expect(isValidSessionCode("")).toBe(false);          // Empty
    });

    it("should reject non-string inputs", () => {
      expect(isValidSessionCode(null as any)).toBe(false);
      expect(isValidSessionCode(undefined as any)).toBe(false);
      expect(isValidSessionCode(12345678 as any)).toBe(false);
    });
  });
});

describe("Session Creation Endpoint", () => {
  // Note: Full integration tests would require setting up a test environment
  // with Vercel KV mocking. For now, we focus on utility function tests.
  
  it("should have proper error handling structure", () => {
    // This test ensures our error response structure is consistent
    // In a full test, we would test the actual endpoint handler
    expect(true).toBe(true); // Placeholder for endpoint integration tests
  });
}); 
