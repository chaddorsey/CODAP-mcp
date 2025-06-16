/**
 * Generates a cryptographically secure 8-character Base32 session code
 * Format: A-Z, 2-7 (32 characters total)
 * Entropy: 40 bits (~1 trillion combinations)
 */
export function generateSessionCode(): string {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const codeLength = 8;
  
  // Use crypto.getRandomValues for cryptographic security
  const randomBytes = new Uint8Array(codeLength);
  crypto.getRandomValues(randomBytes);
  
  let code = '';
  for (let i = 0; i < codeLength; i++) {
    code += base32Chars[randomBytes[i] % 32];
  }
  
  return code;
}

/**
 * Validates session code format
 */
export function isValidSessionCode(code: string): boolean {
  return /^[A-Z2-7]{8}$/.test(code);
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  status: number,
  error: string,
  message: string,
  code?: string
): Response {
  return new Response(
    JSON.stringify({
      error,
      message,
      code
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  );
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse(
  data: any,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    }
  );
}

/**
 * Rate limiting key generation
 */
export function getRateLimitKey(ip: string, endpoint: string): string {
  return `ratelimit:${endpoint}:${ip}`;
} 