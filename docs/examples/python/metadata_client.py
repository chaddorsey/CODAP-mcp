"""
CODAP Metadata API Client Example (Python)

This example demonstrates how to interact with the CODAP metadata endpoint
to retrieve available tools for LLM agents.

Requirements:
    pip install requests

Usage:
    from metadata_client import CODAPMetadataClient
    
    client = CODAPMetadataClient('https://your-domain.com', 'your-session-code')
    manifest = await client.get_tool_manifest()
"""

import requests
import json
from typing import Dict, List, Optional, Union
from dataclasses import dataclass


@dataclass
class VersionNegotiationResult:
    """Result of version negotiation attempt"""
    success: bool
    version: Optional[str] = None
    error: Optional[str] = None
    requested_version: Optional[str] = None
    supported_versions: Optional[List[str]] = None
    manifest: Optional[Dict] = None


class CODAPMetadataError(Exception):
    """Base exception for CODAP metadata client errors"""
    def __init__(self, message: str, code: Optional[str] = None, status_code: Optional[int] = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


class AuthenticationError(CODAPMetadataError):
    """Raised when authentication fails"""
    pass


class SessionExpiredError(CODAPMetadataError):
    """Raised when session has expired"""
    pass


class VersionNotSupportedError(CODAPMetadataError):
    """Raised when requested API version is not supported"""
    def __init__(self, message: str, requested_version: str, supported_versions: List[str]):
        super().__init__(message, 'VERSION_NOT_SUPPORTED')
        self.requested_version = requested_version
        self.supported_versions = supported_versions


class CODAPMetadataClient:
    """Client for interacting with CODAP metadata endpoint"""
    
    def __init__(self, base_url: str, session_code: str, timeout: int = 30):
        """
        Initialize the metadata client
        
        Args:
            base_url: Base URL of the CODAP service
            session_code: Valid session code for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.session_code = session_code
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'CODAP-Metadata-Client-Python/1.0.0'
        })

    def get_tool_manifest(self, api_version: Optional[str] = None) -> Dict:
        """
        Get tool manifest from the metadata endpoint
        
        Args:
            api_version: Optional API version to request
            
        Returns:
            Dictionary containing the tool manifest
            
        Raises:
            CODAPMetadataError: For various API errors
        """
        url = f"{self.base_url}/api/sessions/{self.session_code}/metadata"
        headers = {}
        
        # Add version negotiation header if specified
        if api_version:
            headers['Accept-Version'] = api_version
            
        try:
            response = self.session.get(url, headers=headers, timeout=self.timeout)
            
            # Log version information from response headers
            print(f"API Version: {response.headers.get('api-version', 'Not provided')}")
            print(f"Tool Manifest Version: {response.headers.get('tool-manifest-version', 'Not provided')}")
            print(f"Supported Versions: {response.headers.get('supported-versions', 'Not provided')}")
            
            if response.status_code == 200:
                return response.json()
            else:
                self._handle_error_response(response)
                
        except requests.RequestException as e:
            raise CODAPMetadataError(f"Network error: {str(e)}")

    def is_tool_available(self, tool_name: str) -> bool:
        """
        Check if a specific tool is available
        
        Args:
            tool_name: Name of the tool to check
            
        Returns:
            True if tool is available, False otherwise
        """
        try:
            manifest = self.get_tool_manifest()
            return any(tool['name'] == tool_name for tool in manifest['tools'])
        except CODAPMetadataError as e:
            print(f"Error checking tool availability: {e}")
            return False

    def get_tool_schema(self, tool_name: str) -> Optional[Dict]:
        """
        Get the input schema for a specific tool
        
        Args:
            tool_name: Name of the tool
            
        Returns:
            Tool schema dictionary or None if not found
        """
        try:
            manifest = self.get_tool_manifest()
            for tool in manifest['tools']:
                if tool['name'] == tool_name:
                    return tool.get('inputSchema')
            return None
        except CODAPMetadataError as e:
            print(f"Error getting tool schema: {e}")
            return None

    def list_available_tools(self) -> List[Dict[str, str]]:
        """
        Get list of all available tools with names and descriptions
        
        Returns:
            List of dictionaries with 'name' and 'description' keys
        """
        try:
            manifest = self.get_tool_manifest()
            return [
                {
                    'name': tool['name'],
                    'description': tool['description']
                }
                for tool in manifest['tools']
            ]
        except CODAPMetadataError as e:
            print(f"Error listing tools: {e}")
            return []

    def test_version_negotiation(self, requested_version: str) -> VersionNegotiationResult:
        """
        Test version negotiation with a specific version
        
        Args:
            requested_version: Version to request
            
        Returns:
            VersionNegotiationResult object with the outcome
        """
        try:
            manifest = self.get_tool_manifest(requested_version)
            return VersionNegotiationResult(
                success=True,
                version=manifest['apiVersion'],
                manifest=manifest
            )
        except VersionNotSupportedError as e:
            return VersionNegotiationResult(
                success=False,
                error=str(e),
                requested_version=e.requested_version,
                supported_versions=e.supported_versions
            )

    def _handle_error_response(self, response: requests.Response):
        """Handle error responses from the API"""
        try:
            error_data = response.json()
        except (json.JSONDecodeError, ValueError):
            error_data = {'error': response.text or 'Unknown error'}

        status_code = response.status_code
        error_message = error_data.get('error', f'HTTP {status_code} error')

        if status_code == 400:
            raise CODAPMetadataError(f"Bad Request: {error_message}", status_code=status_code)
        elif status_code == 401:
            raise AuthenticationError(f"Unauthorized: {error_message}", 'AUTHENTICATION_FAILED', status_code)
        elif status_code == 403:
            raise SessionExpiredError(f"Forbidden: {error_message}", 'SESSION_EXPIRED', status_code)
        elif status_code == 405:
            raise CODAPMetadataError(f"Method Not Allowed: {error_message}", status_code=status_code)
        elif status_code == 406:
            requested_version = error_data.get('requestedVersion', 'unknown')
            supported_versions = error_data.get('supportedVersions', [])
            raise VersionNotSupportedError(
                f"Unsupported version: {requested_version}",
                requested_version,
                supported_versions
            )
        elif status_code == 500:
            raise CODAPMetadataError(f"Internal Server Error: {error_message}", status_code=status_code)
        else:
            raise CODAPMetadataError(f"HTTP {status_code}: {error_message}", status_code=status_code)


def example_usage():
    """Example usage of the CODAP metadata client"""
    client = CODAPMetadataClient('https://your-domain.com', 'your-session-code-here')

    try:
        # Basic usage - get tool manifest
        print('=== Getting Tool Manifest ===')
        manifest = client.get_tool_manifest()
        print(f'Available tools: {len(manifest["tools"])}')
        print(f'API Version: {manifest["apiVersion"]}')

        # List all tools
        print('\n=== Available Tools ===')
        tools = client.list_available_tools()
        for tool in tools:
            print(f"- {tool['name']}: {tool['description']}")

        # Check if specific tool is available
        print('\n=== Tool Availability Check ===')
        is_create_dataset_available = client.is_tool_available('create_codap_dataset')
        print(f'create_codap_dataset available: {is_create_dataset_available}')

        # Get schema for a specific tool
        print('\n=== Tool Schema ===')
        schema = client.get_tool_schema('create_codap_dataset')
        if schema:
            print('create_codap_dataset schema:')
            print(json.dumps(schema, indent=2))

        # Version negotiation - request supported version
        print('\n=== Version Negotiation (Supported) ===')
        supported_result = client.test_version_negotiation('1.0.0')
        print(f'Supported version result: {supported_result}')

        # Version negotiation - request unsupported version
        print('\n=== Version Negotiation (Unsupported) ===')
        unsupported_result = client.test_version_negotiation('2.0.0')
        print(f'Unsupported version result: {unsupported_result}')

    except AuthenticationError as e:
        print(f'Authentication failed: {e}')
        print('Please check your session code')
    except SessionExpiredError as e:
        print(f'Session expired: {e}')
        print('Please obtain a new session code')
    except VersionNotSupportedError as e:
        print(f'Version not supported: {e}')
        print(f'Supported versions: {e.supported_versions}')
    except CODAPMetadataError as e:
        print(f'API error: {e}')
    except Exception as e:
        print(f'Unexpected error: {e}')


def test_error_scenarios():
    """Test various error scenarios"""
    print('\n=== Testing Error Scenarios ===')

    # Test with invalid session code
    invalid_client = CODAPMetadataClient('https://your-domain.com', 'invalid-session')
    try:
        invalid_client.get_tool_manifest()
    except CODAPMetadataError as e:
        print(f'Invalid session error: {e}')

    # Test with malformed URL
    try:
        malformed_client = CODAPMetadataClient('not-a-url', 'session-code')
        malformed_client.get_tool_manifest()
    except CODAPMetadataError as e:
        print(f'Network error: {e}')

    print('For expired session testing, use a session code that has expired')


# Advanced usage example with context manager
class CODAPMetadataSession:
    """Context manager for CODAP metadata client sessions"""
    
    def __init__(self, base_url: str, session_code: str):
        self.client = CODAPMetadataClient(base_url, session_code)
        
    def __enter__(self):
        return self.client
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Close session if needed
        if hasattr(self.client, 'session'):
            self.client.session.close()


def advanced_example():
    """Advanced example using context manager"""
    print('\n=== Advanced Example with Context Manager ===')
    
    with CODAPMetadataSession('https://your-domain.com', 'your-session-code') as client:
        try:
            tools = client.list_available_tools()
            print(f'Found {len(tools)} tools using context manager')
        except CODAPMetadataError as e:
            print(f'Error in context manager: {e}')


if __name__ == '__main__':
    example_usage()
    test_error_scenarios()
    advanced_example()
    print('\n=== Example completed ===') 