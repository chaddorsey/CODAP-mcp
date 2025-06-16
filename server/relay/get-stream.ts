import { kv } from '@vercel/kv';
import { isValidSessionCode, createErrorResponse } from './utils';

// Configuration
const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
const POLLING_INTERVAL_MS = 1000; // 1 second

/**
 * Check if session exists and is valid
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
 * Retrieve and clear tool requests from the queue
 */
async function getToolRequests(code: string): Promise<any[]> {
  try {
    const queueKey = `req:${code}`;
    
    // Get all requests in the queue
    const requests = await kv.lrange(queueKey, 0, -1);
    
    if (requests.length > 0) {
      // Clear the queue after retrieving requests
      await kv.del(queueKey);
      
      // Parse JSON strings back to objects
      return requests.map(req => {
        try {
          return typeof req === 'string' ? JSON.parse(req) : req;
        } catch (error) {
          console.error('Failed to parse request:', req, error);
          return null;
        }
      }).filter(req => req !== null);
    }
    
    return [];
  } catch (error) {
    console.error('Error retrieving tool requests:', error);
    return [];
  }
}

/**
 * Create SSE data string
 */
function createSSEEvent(eventType: string, data: any): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * GET /stream handler
 * Establishes SSE connection and streams tool requests
 */
export default async function handler(request: Request): Promise<Response> {
  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Cache-Control'
        }
      });
    }
    
    // Only allow GET method
    if (request.method !== 'GET') {
      return createErrorResponse(
        405,
        'method_not_allowed',
        'Only GET method is allowed'
      );
    }
    
    // Extract and validate session code from query params
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      return createErrorResponse(
        400,
        'missing_session_code',
        'Session code query parameter is required'
      );
    }
    
    if (!isValidSessionCode(code)) {
      return createErrorResponse(
        400,
        'invalid_session_code',
        'Session code format is invalid'
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
    
    // Create SSE stream using ReadableStream
    const stream = new ReadableStream({
      start(controller) {
                 let heartbeatInterval: NodeJS.Timeout;
         let pollingInterval: NodeJS.Timeout;
        let isClosed = false;
        
        // Helper to send SSE events
        const sendEvent = (eventType: string, data: any) => {
          if (!isClosed) {
            try {
              const sseData = createSSEEvent(eventType, data);
              controller.enqueue(new TextEncoder().encode(sseData));
            } catch (error) {
              console.error('Error sending SSE event:', error);
            }
          }
        };
        
        // Send initial connection confirmation
        sendEvent('connected', { 
          code, 
          timestamp: new Date().toISOString(),
          message: 'SSE connection established'
        });
        
        // Set up heartbeat to keep connection alive
        heartbeatInterval = setInterval(() => {
          sendEvent('heartbeat', { 
            timestamp: new Date().toISOString() 
          });
        }, HEARTBEAT_INTERVAL_MS);
        
        // Set up polling for tool requests
        pollingInterval = setInterval(async () => {
          try {
            const requests = await getToolRequests(code);
            
            for (const request of requests) {
              sendEvent('tool-request', request);
            }
          } catch (error) {
            console.error('Error polling for requests:', error);
            sendEvent('error', {
              error: 'polling_error',
              message: 'Error retrieving tool requests'
            });
          }
        }, POLLING_INTERVAL_MS);
        
        // Handle cleanup when stream is closed
        const cleanup = () => {
          isClosed = true;
          clearInterval(heartbeatInterval);
          clearInterval(pollingInterval);
        };
        
        // Set up abort signal handling
        if (request.signal) {
          request.signal.addEventListener('abort', cleanup);
        }
        
        // Clean up after some time if no activity (prevent memory leaks)
        setTimeout(() => {
          if (!isClosed) {
            sendEvent('timeout', { 
              message: 'Stream timeout - please reconnect',
              timestamp: new Date().toISOString()
            });
            cleanup();
            controller.close();
          }
        }, 10 * 60 * 1000); // 10 minutes timeout
      }
    });
    
    // Return SSE response
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      }
    });
    
  } catch (error) {
    console.error('SSE stream error:', error);
    
    return createErrorResponse(
      500,
      'internal_server_error',
      'Failed to establish SSE stream'
    );
  }
} 