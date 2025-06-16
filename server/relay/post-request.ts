import { kv } from '@vercel/kv';
import { createErrorResponse, createSuccessResponse, getRateLimitKey } from './utils';
import { ToolRequestSchema } from './schemas';

// Configuration
const RATE_LIMIT_REQUEST_PER_CODE = parseInt(process.env.RATE_LIMIT_REQUEST_PER_CODE || '60');

/**
 * Rate limiting check for tool requests per IP+code combination
 */
async function checkRateLimit(ip: string, code: string): Promise<boolean> {
  const key = getRateLimitKey(`${ip}:${code}`, 'request');
  const current = await kv.incr(key);
  
  if (current === 1) {
    // First request, set expiry for the window (1 minute)
    await kv.expire(key, 60);
  }
  
  return current <= RATE_LIMIT_REQUEST_PER_CODE;
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
 * Enqueue tool request to session queue
 */
async function enqueueToolRequest(code: string, request: any): Promise<void> {
  const queueKey = `req:${code}`;
  const requestJson = JSON.stringify({
    ...request,
    timestamp: new Date().toISOString()
  });
  
  // Add to the end of the list (FIFO queue)
  await kv.rpush(queueKey, requestJson);
  
  // Set TTL on the queue to clean up old requests (1 hour)
  await kv.expire(queueKey, 3600);
}

/**
 * POST /request handler
 * Accepts tool requests from LLMs and queues them for browser consumption
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
    const validation = ToolRequestSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(
        400,
        'validation_error',
        'Request body validation failed',
        validation.error.message
      );
    }
    
    const { code, id, tool, args } = validation.data;
    
    // Check rate limit per IP+code combination
    const rateLimitOk = await checkRateLimit(ip, code);
    if (!rateLimitOk) {
      return createErrorResponse(
        429,
        'rate_limit_exceeded',
        `Too many requests for this session. Limit: ${RATE_LIMIT_REQUEST_PER_CODE} per minute`,
        'REQUEST_RATE_LIMIT'
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
    
    // Enqueue the tool request
    await enqueueToolRequest(code, { id, tool, args });
    
    // Return 202 Accepted with request details
    return createSuccessResponse({
      id,
      status: 'queued',
      message: 'Tool request queued for processing'
    }, 202);
    
  } catch (error) {
    console.error('Tool request error:', error);
    
    return createErrorResponse(
      500,
      'internal_server_error',
      'Failed to process tool request'
    );
  }
} 