# LLM Agent Tool Manifest API

## Overview

The LLM Agent Tool Manifest API provides a standardized way for LLM agents to discover and access available tools within the CODAP-mcp system. This endpoint returns a manifest of available tools that can be used for data analysis, visualization, and manipulation tasks.

## Endpoint

```
GET /api/sessions/:code/metadata
```

## Authentication

This endpoint requires a valid session code. The session must be active and not expired. Session validation is performed automatically by the middleware.

### Session Requirements
- Valid session code in the URL path
- Session must not be expired (`expiresAt` must be in the future)
- Session must exist in the Redis data store

## Request

### URL Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `code`    | string | Yes      | The session code identifying the user session |

### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Accept-Version` | string | No | Preferred API version (e.g., "1.0.0"). If not provided, latest version is used |

### Example Request

```http
GET /api/sessions/abc123def456/metadata HTTP/1.1
Host: your-domain.com
Accept-Version: 1.0.0
```

## Response

### Success Response (200 OK)

#### Headers

| Header | Description |
|--------|-------------|
| `API-Version` | Current API version being used |
| `Tool-Manifest-Version` | Version of the tool manifest format |
| `Supported-Versions` | Comma-separated list of supported API versions |
| `Access-Control-Allow-Origin` | CORS header (always "*") |
| `Access-Control-Allow-Methods` | Allowed HTTP methods |
| `Access-Control-Allow-Headers` | Allowed request headers including `Accept-Version` |
| `Access-Control-Expose-Headers` | Exposed response headers for client access |

#### Response Body

```json
{
  "apiVersion": "1.0.0",
  "toolManifestVersion": "1.0.0", 
  "supportedVersions": ["1.0.0"],
  "tools": [
    {
      "name": "create_codap_dataset",
      "description": "Create a new dataset in CODAP with the specified structure and data",
      "inputSchema": {
        "type": "object",
        "properties": {
          "datasetName": {
            "type": "string",
            "description": "The name for the new dataset"
          },
          "attributes": {
            "type": "array",
            "description": "Array of attribute definitions",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string" },
                "type": { "type": "string", "enum": ["numeric", "categorical", "date"] },
                "description": { "type": "string" }
              },
              "required": ["name", "type"]
            }
          },
          "data": {
            "type": "array",
            "description": "Array of data records",
            "items": { "type": "object" }
          }
        },
        "required": ["datasetName", "attributes", "data"]
      }
    },
    {
      "name": "update_codap_dataset", 
      "description": "Update an existing dataset in CODAP by adding new data or modifying existing data",
      "inputSchema": {
        "type": "object",
        "properties": {
          "datasetName": {
            "type": "string",
            "description": "The name of the dataset to update"
          },
          "operation": {
            "type": "string",
            "enum": ["append", "replace", "update"],
            "description": "Type of update operation to perform"
          },
          "data": {
            "type": "array",
            "description": "Array of data records to add or update",
            "items": { "type": "object" }
          }
        },
        "required": ["datasetName", "operation", "data"]
      }
    },
    {
      "name": "create_codap_visualization",
      "description": "Create a visualization (graph, table, map) in CODAP using specified dataset and configuration",
      "inputSchema": {
        "type": "object", 
        "properties": {
          "datasetName": {
            "type": "string",
            "description": "The name of the dataset to visualize"
          },
          "visualizationType": {
            "type": "string",
            "enum": ["scatter", "bar", "histogram", "table", "map"],
            "description": "Type of visualization to create"
          },
          "xAttribute": {
            "type": "string",
            "description": "Attribute to use for x-axis (if applicable)"
          },
          "yAttribute": {
            "type": "string", 
            "description": "Attribute to use for y-axis (if applicable)"
          },
          "config": {
            "type": "object",
            "description": "Additional configuration options for the visualization"
          }
        },
        "required": ["datasetName", "visualizationType"]
      }
    },
    {
      "name": "get_codap_status",
      "description": "Get the current status and available datasets in the CODAP session",
      "inputSchema": {
        "type": "object",
        "properties": {
          "includeData": {
            "type": "boolean",
            "description": "Whether to include sample data in the response",
            "default": false
          }
        }
      }
    }
  ]
}
```

### Version Negotiation

The API supports version negotiation through the `Accept-Version` header:

- **No `Accept-Version` header**: Returns the latest supported version (currently 1.0.0)
- **Supported version requested**: Returns the requested version with appropriate headers
- **Unsupported version requested**: Returns 406 Not Acceptable with error details

#### Version Negotiation Example

Request for unsupported version:
```http
GET /api/sessions/abc123def456/metadata HTTP/1.1
Accept-Version: 2.0.0
```

Response:
```http
HTTP/1.1 406 Not Acceptable
Content-Type: application/json

{
  "error": "Unsupported version",
  "requestedVersion": "2.0.0", 
  "supportedVersions": ["1.0.0"]
}
```

## Error Responses

### 400 Bad Request
Invalid session code format or missing required parameters.

```json
{
  "error": "Invalid session code format"
}
```

### 401 Unauthorized  
Session not found or invalid.

```json
{
  "error": "Session not found or invalid"
}
```

### 403 Forbidden
Session has expired.

```json
{
  "error": "Session expired"
}
```

### 405 Method Not Allowed
HTTP method other than GET used.

```json
{
  "error": "Method not allowed"
}
```

### 406 Not Acceptable
Unsupported API version requested.

```json
{
  "error": "Unsupported version",
  "requestedVersion": "2.0.0",
  "supportedVersions": ["1.0.0"]
}
```

### 500 Internal Server Error
Server-side error occurred.

```json
{
  "error": "Internal server error"
}
```

## CORS Support

The endpoint includes full CORS support with the following configuration:

- **Origin**: `*` (all origins allowed)
- **Methods**: `GET, POST, PUT, DELETE, OPTIONS`
- **Headers**: `Content-Type, Authorization, Accept-Version`
- **Exposed Headers**: `API-Version, Tool-Manifest-Version, Supported-Versions`

OPTIONS preflight requests are automatically handled.

## Rate Limiting

Currently, no rate limiting is implemented. Future versions may include rate limiting based on session or IP address.

## Versioning Strategy

The API uses semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes to the API structure or behavior
- **MINOR**: New features or non-breaking changes
- **PATCH**: Bug fixes and minor improvements

Version compatibility:
- **Current Version**: 1.0.0
- **Supported Versions**: ["1.0.0"]
- **Tool Manifest Version**: 1.0.0

## Security Considerations

1. **Session Validation**: All requests must include a valid, non-expired session code
2. **CORS Configuration**: Currently allows all origins - consider restricting in production
3. **Error Information**: Error responses are designed to be informative without exposing sensitive system details
4. **Input Validation**: All parameters are validated before processing

## Performance

- **Typical Response Time**: < 100ms
- **Response Size**: ~2-5KB depending on number of available tools
- **Caching**: Currently no caching implemented - consider adding response caching for better performance

## Monitoring and Logging

The endpoint includes comprehensive logging for:
- Request processing and timing
- Session validation results  
- Error conditions and debugging information
- Version negotiation outcomes

Logs are structured using the Pino logging framework for easy parsing and analysis. 