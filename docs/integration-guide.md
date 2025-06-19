# CODAP LLM Agent Tool Manifest Integration Guide

## Overview

This guide provides step-by-step instructions for integrating with the CODAP LLM Agent Tool Manifest API. This API allows LLM agents to discover and access available tools for data analysis, visualization, and manipulation within the CODAP system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Authentication](#authentication)
4. [API Integration](#api-integration)
5. [Version Management](#version-management)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Testing Your Integration](#testing-your-integration)
9. [Production Considerations](#production-considerations)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before integrating with the CODAP metadata API, ensure you have:

- **Valid Session Code**: A valid CODAP session code that provides access to the system
- **Network Access**: Ability to make HTTPS requests to the CODAP service
- **JSON Parsing**: Capability to parse JSON responses in your preferred programming language
- **Error Handling**: Implementation for handling HTTP errors and API-specific error codes

### Technical Requirements

- **Protocol**: HTTPS (required for production)
- **HTTP Methods**: GET (primary), OPTIONS (for CORS preflight)
- **Content Type**: `application/json`
- **Response Format**: JSON
- **Timeout**: Recommended 30-60 seconds

## Quick Start

### 1. Basic Request

```bash
curl -X GET \
  'https://your-domain.com/api/sessions/YOUR_SESSION_CODE/metadata' \
  -H 'Content-Type: application/json' \
  -H 'Accept-Version: 1.0.0'
```

### 2. Expected Response

```json
{
  "apiVersion": "1.0.0",
  "toolManifestVersion": "1.0.0",
  "supportedVersions": ["1.0.0"],
  "tools": [
    {
      "name": "create_codap_dataset",
      "description": "Create a new dataset in CODAP",
      "inputSchema": {
        "type": "object",
        "properties": {
          "datasetName": { "type": "string" },
          "attributes": { "type": "array" },
          "data": { "type": "array" }
        },
        "required": ["datasetName", "attributes", "data"]
      }
    }
  ]
}
```

### 3. Integration Checklist

- [ ] Obtain a valid session code
- [ ] Test basic connectivity
- [ ] Implement error handling
- [ ] Parse tool manifest
- [ ] Implement version negotiation
- [ ] Add logging and monitoring

## Authentication

The CODAP metadata API uses session-based authentication. Sessions are validated through middleware that checks:

### Session Validation Process

1. **Session Existence**: The session code must exist in the Redis data store
2. **Session Expiry**: The session must not be expired (`expiresAt` > current time)
3. **Session Format**: The session code must be properly formatted

### Obtaining a Session Code

Session codes are typically obtained through:
- User authentication flow in the CODAP web application
- API authentication endpoints (if available)
- Administrative provisioning (for system integrations)

### Session Code Format

- **Type**: String
- **Length**: Variable (typically 20-50 characters)
- **Characters**: Alphanumeric with possible special characters
- **Case Sensitive**: Yes

## API Integration

### Step 1: Choose Your HTTP Client

Select an appropriate HTTP client for your programming language:

- **JavaScript/Node.js**: `fetch`, `axios`, `node-fetch`
- **Python**: `requests`, `httpx`, `urllib`
- **Java**: `HttpClient`, `OkHttp`, `Apache HttpClient`
- **C#**: `HttpClient`, `RestSharp`
- **Go**: `net/http`, `resty`
- **Ruby**: `net/http`, `faraday`, `httparty`

### Step 2: Implement Basic Request Function

```javascript
// JavaScript example
async function getToolManifest(baseUrl, sessionCode, apiVersion = null) {
  const url = `${baseUrl}/api/sessions/${sessionCode}/metadata`;
  
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'YourApp/1.0.0'
  };
  
  if (apiVersion) {
    headers['Accept-Version'] = apiVersion;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
    timeout: 30000
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}
```

### Step 3: Parse Tool Manifest

```javascript
function parseToolManifest(manifest) {
  const tools = new Map();
  
  manifest.tools.forEach(tool => {
    tools.set(tool.name, {
      description: tool.description,
      schema: tool.inputSchema,
      required: tool.inputSchema.required || []
    });
  });
  
  return {
    apiVersion: manifest.apiVersion,
    tools: tools,
    toolCount: manifest.tools.length
  };
}
```

## Version Management

The API supports version negotiation to ensure compatibility between clients and servers.

### Version Negotiation Process

1. **Client Request**: Include `Accept-Version` header with desired version
2. **Server Response**: Returns requested version if supported, latest if not specified
3. **Version Mismatch**: Returns 406 Not Acceptable if version is unsupported

### Semantic Versioning

The API follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes to API structure or behavior
- **MINOR**: New features, non-breaking changes
- **PATCH**: Bug fixes, minor improvements

### Version Compatibility Matrix

| Client Version | Server Version | Compatibility |
|---------------|----------------|---------------|
| 1.0.0         | 1.0.0         | ✅ Full        |
| 1.0.x         | 1.0.y         | ✅ Full        |
| 1.x.x         | 1.y.y         | ⚠️ Minor differences |
| 2.x.x         | 1.x.x         | ❌ Incompatible |

## Error Handling

Implement comprehensive error handling for all possible scenarios:

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|---------|
| 200 | Success | Process response |
| 400 | Bad Request | Fix request format |
| 401 | Unauthorized | Check session code |
| 403 | Forbidden | Refresh session |
| 405 | Method Not Allowed | Use GET method |
| 406 | Not Acceptable | Adjust version |
| 500 | Server Error | Retry with backoff |

### Error Handling Implementation

```javascript
class CODAPMetadataError extends Error {
  constructor(message, code, statusCode, details = {}) {
    super(message);
    this.name = 'CODAPMetadataError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function createApiError(error) {
  if (error.status === 401) {
    return new CODAPMetadataError(
      'Authentication failed', 
      'AUTH_ERROR', 
      401,
      { suggestion: 'Check session code validity' }
    );
  }
  
  if (error.status === 403) {
    return new CODAPMetadataError(
      'Session expired', 
      'SESSION_EXPIRED', 
      403,
      { suggestion: 'Obtain a new session code' }
    );
  }
  
  return new CODAPMetadataError(
    'Unknown error', 
    'UNKNOWN_ERROR', 
    error.status || 0
  );
}
```

## Best Practices

### 1. Caching Strategy

```javascript
class CachedMetadataClient {
  constructor(baseUrl, sessionCode, cacheTimeout = 300000) { // 5 minutes
    this.baseUrl = baseUrl;
    this.sessionCode = sessionCode;
    this.cache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = cacheTimeout;
  }
  
  async getToolManifest(forceRefresh = false) {
    const now = Date.now();
    
    if (!forceRefresh && this.cache && this.cacheExpiry > now) {
      return this.cache;
    }
    
    this.cache = await this.refreshTools();
    this.cacheExpiry = now + this.cacheTimeout;
    
    return this.cache;
  }
}
```

### 2. Request Timeout and Retry Logic

```javascript
const requestConfig = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // Start with 1 second
  retryMultiplier: 2, // Exponential backoff
  maxRetryDelay: 10000 // Max 10 seconds between retries
};
```

### 3. Logging and Monitoring

- Log all API requests and responses for debugging
- Monitor response times and success rates
- Track version negotiation outcomes
- Alert on authentication failures

## Testing Your Integration

### 1. Unit Tests

Test your client code with mocked responses:

```javascript
// Example using Jest
describe('CODAP Metadata Client', () => {
  test('should fetch tool manifest successfully', async () => {
    // Mock successful response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        apiVersion: '1.0.0',
        tools: [{ name: 'test_tool', description: 'Test tool' }]
      })
    });
    
    const manifest = await getToolManifest('https://test.com', 'session');
    expect(manifest.apiVersion).toBe('1.0.0');
  });
});
```

### 2. Integration Tests

Test against a real API endpoint with a test session.

### 3. Load Testing

Verify performance under expected load conditions.

## Production Considerations

### Security
- **HTTPS Only**: Never use HTTP in production
- **Session Management**: Implement secure session renewal
- **Error Messages**: Don't expose sensitive information in error responses
- **Input Validation**: Validate all inputs before sending requests

### Performance
- **Connection Pooling**: Reuse HTTP connections
- **Response Caching**: Cache responses appropriately
- **Compression**: Use gzip compression if supported
- **CDN**: Consider using a CDN for static resources

### Monitoring
- **Health Checks**: Implement endpoint health monitoring
- **Metrics**: Track response times, error rates, and success rates
- **Alerting**: Set up alerts for failures and performance degradation
- **Logging**: Comprehensive logging for debugging and auditing

### Scalability
- **Load Balancing**: Distribute requests across multiple instances
- **Circuit Breaker**: Implement circuit breaker pattern for resilience
- **Queue Management**: Use queues for high-volume requests
- **Horizontal Scaling**: Scale clients horizontally as needed

## Troubleshooting

### Common Issues

#### Authentication Failures (401)
- Verify session code is valid and correctly formatted
- Check session hasn't expired or been invalidated
- Ensure proper session management

#### Session Expired (403)
- Implement automatic session renewal
- Check system clock synchronization
- Add buffer time for session expiration

#### Version Compatibility (406)
- Update client to support current API version
- Implement graceful fallback to supported versions
- Check version compatibility matrix

#### Network Issues
- Increase timeout values
- Implement retry logic with exponential backoff
- Check network connectivity and DNS resolution

### Debug Checklist

When troubleshooting issues:

- [ ] Check HTTP status code
- [ ] Verify request headers
- [ ] Log response headers
- [ ] Validate session code format
- [ ] Test with curl command
- [ ] Check network connectivity
- [ ] Verify API version compatibility
- [ ] Review error response body

## Support and Resources

- **[API Documentation](./api/metadata-endpoint.md)** - Complete endpoint reference
- **[Examples](./examples/)** - Working code examples in multiple languages
- **[Troubleshooting](./troubleshooting.md)** - Common issues and solutions

For additional support, please contact the development team or refer to the troubleshooting documentation.
