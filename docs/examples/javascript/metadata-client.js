/**
 * CODAP Metadata API Client Example (JavaScript/Node.js)
 * 
 * This example demonstrates how to interact with the CODAP metadata endpoint
 * to retrieve available tools for LLM agents.
 */

const https = require('https');
const http = require('http');

class CODAPMetadataClient {
  constructor(baseUrl, sessionCode) {
    this.baseUrl = baseUrl;
    this.sessionCode = sessionCode;
  }

  /**
   * Get tool manifest from the metadata endpoint
   * @param {string} [apiVersion] - Optional API version to request
   * @returns {Promise<Object>} The tool manifest response
   */
  async getToolManifest(apiVersion = null) {
    const url = `${this.baseUrl}/api/sessions/${this.sessionCode}/metadata`;
    
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CODAP-Metadata-Client/1.0.0'
    };

    // Add version negotiation header if specified
    if (apiVersion) {
      headers['Accept-Version'] = apiVersion;
    }

    try {
      const response = await this.makeRequest('GET', url, headers);
      
      // Log version information from response headers
      console.log('API Version:', response.headers['api-version']);
      console.log('Tool Manifest Version:', response.headers['tool-manifest-version']);
      console.log('Supported Versions:', response.headers['supported-versions']);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if a specific tool is available
   * @param {string} toolName - Name of the tool to check
   * @returns {Promise<boolean>} True if tool is available
   */
  async isToolAvailable(toolName) {
    try {
      const manifest = await this.getToolManifest();
      return manifest.tools.some(tool => tool.name === toolName);
    } catch (error) {
      console.error('Error checking tool availability:', error.message);
      return false;
    }
  }

  /**
   * Get the schema for a specific tool
   * @param {string} toolName - Name of the tool
   * @returns {Promise<Object|null>} Tool schema or null if not found
   */
  async getToolSchema(toolName) {
    try {
      const manifest = await this.getToolManifest();
      const tool = manifest.tools.find(tool => tool.name === toolName);
      return tool ? tool.inputSchema : null;
    } catch (error) {
      console.error('Error getting tool schema:', error.message);
      return null;
    }
  }

  /**
   * List all available tools
   * @returns {Promise<Array>} Array of tool names
   */
  async listAvailableTools() {
    try {
      const manifest = await this.getToolManifest();
      return manifest.tools.map(tool => ({
        name: tool.name,
        description: tool.description
      }));
    } catch (error) {
      console.error('Error listing tools:', error.message);
      return [];
    }
  }

  /**
   * Test version negotiation
   * @param {string} requestedVersion - Version to request
   * @returns {Promise<Object>} Version negotiation result
   */
  async testVersionNegotiation(requestedVersion) {
    try {
      const manifest = await this.getToolManifest(requestedVersion);
      return {
        success: true,
        version: manifest.apiVersion,
        manifest
      };
    } catch (error) {
      if (error.code === 'VERSION_NOT_SUPPORTED') {
        return {
          success: false,
          error: error.message,
          requestedVersion: error.requestedVersion,
          supportedVersions: error.supportedVersions
        };
      }
      throw error;
    }
  }

  /**
   * Make HTTP request with error handling
   * @private
   */
  makeRequest(method, url, headers, body = null) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: headers
      };

      const req = client.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : {};
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({
                statusCode: res.statusCode,
                headers: res.headers,
                data: parsedData
              });
            } else {
              reject({
                statusCode: res.statusCode,
                headers: res.headers,
                data: parsedData
              });
            }
          } catch (parseError) {
            reject({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data,
              parseError
            });
          }
        });
      });

      req.on('error', (error) => {
        reject({
          networkError: true,
          message: error.message,
          error
        });
      });

      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Handle and transform errors
   * @private
   */
  handleError(error) {
    if (error.networkError) {
      return new Error(`Network error: ${error.message}`);
    }

    const statusCode = error.statusCode;
    const errorData = error.data;

    switch (statusCode) {
      case 400:
        return new Error(`Bad Request: ${errorData.error || 'Invalid request'}`);
      
      case 401:
        const authError = new Error(`Unauthorized: ${errorData.error || 'Session not found or invalid'}`);
        authError.code = 'AUTHENTICATION_FAILED';
        return authError;
      
      case 403:
        const forbiddenError = new Error(`Forbidden: ${errorData.error || 'Session expired'}`);
        forbiddenError.code = 'SESSION_EXPIRED';
        return forbiddenError;
      
      case 405:
        return new Error(`Method Not Allowed: ${errorData.error || 'Method not supported'}`);
      
      case 406:
        const versionError = new Error(`Unsupported version: ${errorData.requestedVersion}`);
        versionError.code = 'VERSION_NOT_SUPPORTED';
        versionError.requestedVersion = errorData.requestedVersion;
        versionError.supportedVersions = errorData.supportedVersions;
        return versionError;
      
      case 500:
        return new Error(`Internal Server Error: ${errorData.error || 'Server error occurred'}`);
      
      default:
        return new Error(`HTTP ${statusCode}: ${errorData.error || 'Unknown error'}`);
    }
  }
}

// Example usage
async function example() {
  const client = new CODAPMetadataClient('https://your-domain.com', 'your-session-code-here');

  try {
    // Basic usage - get tool manifest
    console.log('=== Getting Tool Manifest ===');
    const manifest = await client.getToolManifest();
    console.log('Available tools:', manifest.tools.length);
    console.log('API Version:', manifest.apiVersion);

    // List all tools
    console.log('\n=== Available Tools ===');
    const tools = await client.listAvailableTools();
    tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });

    // Check if specific tool is available
    console.log('\n=== Tool Availability Check ===');
    const isCreateDatasetAvailable = await client.isToolAvailable('create_codap_dataset');
    console.log('create_codap_dataset available:', isCreateDatasetAvailable);

    // Get schema for a specific tool
    console.log('\n=== Tool Schema ===');
    const schema = await client.getToolSchema('create_codap_dataset');
    if (schema) {
      console.log('create_codap_dataset schema:', JSON.stringify(schema, null, 2));
    }

    // Version negotiation - request supported version
    console.log('\n=== Version Negotiation (Supported) ===');
    const supportedVersionResult = await client.testVersionNegotiation('1.0.0');
    console.log('Supported version result:', supportedVersionResult);

    // Version negotiation - request unsupported version
    console.log('\n=== Version Negotiation (Unsupported) ===');
    const unsupportedVersionResult = await client.testVersionNegotiation('2.0.0');
    console.log('Unsupported version result:', unsupportedVersionResult);

  } catch (error) {
    console.error('Example failed:', error.message);
    
    // Handle specific error types
    if (error.code === 'AUTHENTICATION_FAILED') {
      console.error('Please check your session code');
    } else if (error.code === 'SESSION_EXPIRED') {
      console.error('Please obtain a new session code');
    } else if (error.code === 'VERSION_NOT_SUPPORTED') {
      console.error('Supported versions:', error.supportedVersions);
    }
  }
}

// Utility function for testing different scenarios
async function testErrorScenarios() {
  console.log('\n=== Testing Error Scenarios ===');

  // Test with invalid session code
  const invalidClient = new CODAPMetadataClient('https://your-domain.com', 'invalid-session');
  try {
    await invalidClient.getToolManifest();
  } catch (error) {
    console.log('Invalid session error:', error.message);
  }

  // Test with expired session (simulation)
  console.log('For expired session testing, use a session code that has expired');
}

// Export for use as module
module.exports = CODAPMetadataClient;

// Run example if this file is executed directly
if (require.main === module) {
  example().then(() => {
    console.log('\n=== Example completed ===');
  }).catch(error => {
    console.error('Example failed:', error);
    process.exit(1);
  });
} 