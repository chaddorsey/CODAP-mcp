import { kv } from '@vercel/kv';
import { createErrorResponse, createSuccessResponse, getRateLimitKey } from './utils';
import { ToolResponseSchema } from './schemas';

// Configuration
const RATE_LIMIT_RESPONSE_PER_CODE = parseInt(process.env.RATE_LIMIT_RESPONSE_PER_CODE || '60');

/**
 * Rate limiting check for tool responses per IP+code combination
 */
async function checkRateLimit(ip: string, code: string): Promise<boolean> {
  const key = getRateLimitKey(`${ip}:${code}`, 'response');
  const current = await kv.incr(key);
  
  if (current === 1) {
    // First request, set expiry for the window (1 minute)
    await kv.expire(key, 60);
  }
  
  return current <= RATE_LIMIT_RESPONSE_PER_CODE;
}

/**
 * Validate session exists and is active
 */
async function validateSession(code: string): Promise<boolean> {
  try {
    const sessionData = await kv.get(`session:${code}`);
    return sessionData !== null;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

/**
 * Store tool response in KV with TTL
 */
async function storeToolResponse(code: string, response: any): Promise<void> {
  const responseKey = `res:${code}`;
  const responseJson = JSON.stringify({
    ...response,
    timestamp: new Date().toISOString()
  });
  
  // Add to the end of the list (FIFO queue)
  await kv.rpush(responseKey, responseJson);
  
  // Set TTL on the response queue (1 hour)
  await kv.expire(responseKey, 3600);
}

/**
 * POST /response handler
 * Accepts tool results from browsers and stores them for LLM consumption
 */
export default async function handler(request: Request): Promise<Response> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
    // Only allow POST method
    if (request.method !== 'POST') {
      return createErrorResponse(
        405,
        'method_not_allowed',
        'Only POST method is allowed'
      );
    }
    
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return createErrorResponse(
        400,
        'invalid_json',
        'Request body must be valid JSON'
      );
    }
    
    // Validate against schema
    const validation = ToolResponseSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        400,
        'validation_error',
        'Request body validation failed',
        validation.error.message
      );
    }
    
    const { code, id, result } = validation.data;
    
    // Check rate limit per IP+code combination
    const rateLimitOk = await checkRateLimit(ip, code);
    if (!rateLimitOk) {
      return createErrorResponse(
        429,
        'rate_limit_exceeded',
        `Too many responses for this session. Limit: ${RATE_LIMIT_RESPONSE_PER_CODE} per minute`,
        'RESPONSE_RATE_LIMIT'
      );
    }
    
    // Validate session exists
    const sessionValid = await validateSession(code);
    if (!sessionValid) {
      return createErrorResponse(
        404,
        'session_not_found',
        'Session not found or expired'
      );
    }
    
    // Store the tool response
    await storeToolResponse(code, { id, result });
    
    // Return 202 Accepted with response confirmation
    return createSuccessResponse({
      id,
      status: 'stored',
      message: 'Tool response stored successfully'
    }, 202);
    
  } catch (error) {
    console.error('Tool response error:', error);
    
    return createErrorResponse(
      500,
      'internal_server_error',
      'Failed to process tool response'
    );
  }
} 