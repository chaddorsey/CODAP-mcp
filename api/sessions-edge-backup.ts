export const runtime = "edge";

import { kv } from "@vercel/kv";
import { generateSessionCode, createErrorResponse, createSuccessResponse, getRateLimitKey } from "./utils";
import { CreateSessionRequestSchema, SessionDataSchema } from "./schemas";

// Configuration
const SESSION_TTL_SECONDS = 600; // 10 minutes
const RATE_LIMIT_SESSION_PER_IP = 30;

/**
 * Rate limiting check for session creation
 */
async function checkRateLimit(ip: string): Promise<boolean> {
  const key = getRateLimitKey(ip, "sessions");
  const current = await kv.incr(key);
  
  if (current === 1) {
    // First request, set expiry for the window (1 minute)
    await kv.expire(key, 60);
  }
  
  return current <= RATE_LIMIT_SESSION_PER_IP;
}

/**
 * Generates a unique session code that doesn't already exist in KV
 */
async function generateUniqueSessionCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = generateSessionCode();
    const exists = await kv.exists(`session:${code}`);
    
    if (!exists) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error("Failed to generate unique session code after maximum attempts");
}

/**
 * POST /api/sessions handler
 * Creates a new session and returns pairing code
 */
export default async function handler(request: Request): Promise<Response> {
  try {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    
    // Only allow POST method
    if (request.method !== "POST") {
      return createErrorResponse(
        405,
        "method_not_allowed",
        "Only POST method is allowed"
      );
    }
    
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    // Check rate limit
    const rateLimitOk = await checkRateLimit(ip);
    if (!rateLimitOk) {
      return createErrorResponse(
        429,
        "rate_limit_exceeded",
        `Too many session creation requests. Limit: ${RATE_LIMIT_SESSION_PER_IP} per minute`,
        "SESSION_RATE_LIMIT"
      );
    }
    
    // Validate request body (should be empty JSON object)
    try {
      const body = await request.json();
      CreateSessionRequestSchema.parse(body);
    } catch {
      return createErrorResponse(
        400,
        "invalid_request",
        "Request body must be valid JSON object"
      );
    }
    
    // Generate unique session code
    const code = await generateUniqueSessionCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    
    // Create session data
    const sessionData = SessionDataSchema.parse({
      code,
      createdAt: now.toISOString(),
      ttl: SESSION_TTL_SECONDS,
      lastActivity: now.toISOString()
    });
    
    // Store in KV with TTL
    await kv.setex(`session:${code}`, SESSION_TTL_SECONDS, JSON.stringify(sessionData));
    
    // Return success response
    return createSuccessResponse({
      code,
      ttl: SESSION_TTL_SECONDS,
      expiresAt: expiresAt.toISOString()
    }, 201);
    
  } catch (error) {
    console.error("Session creation error:", error);
    
    return createErrorResponse(
      500,
      "internal_server_error",
      "Failed to create session"
    );
  }
} 

