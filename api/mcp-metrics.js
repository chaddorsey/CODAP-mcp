/**
 * MCP Session Metrics Endpoint
 * Provides session monitoring and metrics for the MCP server
 */

const { kv } = require('@vercel/kv');

// Import SessionManager from the main MCP module
const { SessionManager } = require('./mcp.js');

/**
 * Get session metrics
 */
async function getSessionMetrics(sessionId) {
  try {
    const session = await kv.get(`mcp:${sessionId}`);
    
    if (!session) {
      return null;
    }
    
    return {
      sessionId: sessionId,
      status: session.status,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      requestCount: session.requestCount || 0,
      toolCallCount: session.toolCallCount || 0,
      errorCount: session.errorCount || 0,
      initialized: session.initialized,
      clientInfo: session.clientInfo
    };
  } catch (error) {
    console.error(`[Metrics] Error getting session ${sessionId}:`, error);
    return null;
  }
}

/**
 * Get global session metrics from KV storage
 */
async function getGlobalMetrics() {
  try {
    // Get all session keys
    const keys = await kv.keys('mcp:*');
    const sessionCount = keys.length;
    
    // Get sample of sessions for aggregation
    const sampleSize = Math.min(10, sessionCount);
    const sampleKeys = keys.slice(0, sampleSize);
    
    let totalRequests = 0;
    let totalToolCalls = 0;
    let totalErrors = 0;
    let activeSessions = 0;
    
    const now = Date.now();
    const activeThreshold = 10 * 60 * 1000; // 10 minutes
    
    for (const key of sampleKeys) {
      try {
        const session = await kv.get(key);
        if (session) {
          totalRequests += session.requestCount || 0;
          totalToolCalls += session.toolCallCount || 0;
          totalErrors += session.errorCount || 0;
          
          if (session.lastAccessedAt && (now - session.lastAccessedAt) < activeThreshold) {
            activeSessions++;
          }
        }
      } catch (error) {
        console.warn(`[Metrics] Failed to get session for key ${key}:`, error);
      }
    }
    
    return {
      totalSessions: sessionCount,
      activeSessions: activeSessions,
      averageRequests: sampleSize > 0 ? Math.round(totalRequests / sampleSize) : 0,
      averageToolCalls: sampleSize > 0 ? Math.round(totalToolCalls / sampleSize) : 0,
      averageErrors: sampleSize > 0 ? Math.round(totalErrors / sampleSize) : 0,
      sampleSize: sampleSize
    };
  } catch (error) {
    console.error('[Metrics] Error getting global metrics:', error);
    return {
      totalSessions: 0,
      activeSessions: 0,
      averageRequests: 0,
      averageToolCalls: 0,
      averageErrors: 0,
      error: error.message
    };
  }
}

/**
 * Handle GET requests for metrics
 */
async function GET(req) {
  const startTime = Date.now();
  
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session') || req.headers.get('mcp-session-id');
    
    let response;
    
    if (sessionId) {
      // Get specific session metrics
      const sessionMetrics = await getSessionMetrics(sessionId);
      const globalMetrics = await getGlobalMetrics();
      
      response = {
        sessionId: sessionId,
        session: sessionMetrics,
        globalMetrics: globalMetrics,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime
      };
    } else {
      // Get global metrics only
      const globalMetrics = await getGlobalMetrics();
      
      response = {
        globalMetrics: globalMetrics,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime
      };
    }
    
    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
  } catch (error) {
    console.error('[Metrics] Error:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to retrieve metrics',
      message: error.message,
      timestamp: new Date().toISOString(),
      processingTimeMs: Date.now() - startTime
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * Handle OPTIONS requests for CORS
 */
async function OPTIONS(req) {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, mcp-session-id',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Export functions for Vercel serverless
module.exports = {
  GET,
  OPTIONS
}; 