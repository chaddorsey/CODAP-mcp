#!/bin/bash

# CODAP Metadata API Examples using curl
# 
# This script demonstrates various ways to interact with the CODAP metadata endpoint
# using curl commands. These examples show request/response patterns, error handling,
# and version negotiation.
#
# Usage:
#   1. Set your BASE_URL and SESSION_CODE variables below
#   2. Run: chmod +x metadata-examples.sh && ./metadata-examples.sh
#   3. Or run individual commands by copying them from this file

# Configuration - UPDATE THESE VALUES
BASE_URL="https://your-domain.com"
SESSION_CODE="your-session-code-here"

# Colors for output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}CODAP Metadata API curl Examples${NC}"
echo "=================================="
echo ""

# Helper function to make requests with pretty output
make_request() {
    local title="$1"
    local curl_cmd="$2"
    
    echo -e "${YELLOW}$title${NC}"
    echo "Command: $curl_cmd"
    echo ""
    
    # Execute the curl command and capture response
    response=$(eval "$curl_cmd" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}Response:${NC}"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
    else
        echo -e "${RED}Error:${NC}"
        echo "$response"
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Check if jq is available for pretty JSON formatting
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Note: 'jq' command not found. JSON responses will not be formatted.${NC}"
    echo "Install jq for better output: https://stedolan.github.io/jq/"
    echo ""
fi

# 1. Basic request - Get tool manifest
make_request "1. Basic Tool Manifest Request" \
"curl -X GET \\
  '${BASE_URL}/api/sessions/${SESSION_CODE}/metadata' \\
  -H 'Content-Type: application/json' \\
  -H 'User-Agent: curl-example/1.0' \\
  -w '\\nHTTP Status: %{http_code}\\nTotal Time: %{time_total}s\\n' \\
  -s"

# 2. Request with version negotiation - supported version
make_request "2. Version Negotiation - Supported Version (1.0.0)" \
"curl -X GET \\
  '${BASE_URL}/api/sessions/${SESSION_CODE}/metadata' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept-Version: 1.0.0' \\
  -H 'User-Agent: curl-example/1.0' \\
  -w '\\nHTTP Status: %{http_code}\\nTotal Time: %{time_total}s\\n' \\
  -s"

# 3. Request with version negotiation - unsupported version
make_request "3. Version Negotiation - Unsupported Version (2.0.0)" \
"curl -X GET \\
  '${BASE_URL}/api/sessions/${SESSION_CODE}/metadata' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept-Version: 2.0.0' \\
  -H 'User-Agent: curl-example/1.0' \\
  -w '\\nHTTP Status: %{http_code}\\nTotal Time: %{time_total}s\\n' \\
  -s"

# 4. Request with detailed headers - show all response headers
make_request "4. Detailed Headers - View All Response Headers" \
"curl -X GET \\
  '${BASE_URL}/api/sessions/${SESSION_CODE}/metadata' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept-Version: 1.0.0' \\
  -H 'User-Agent: curl-example/1.0' \\
  -D /dev/stderr \\
  -w '\\nHTTP Status: %{http_code}\\nTotal Time: %{time_total}s\\n' \\
  -s"

# 5. CORS preflight request
make_request "5. CORS Preflight Request (OPTIONS)" \
"curl -X OPTIONS \\
  '${BASE_URL}/api/sessions/${SESSION_CODE}/metadata' \\
  -H 'Origin: https://example.com' \\
  -H 'Access-Control-Request-Method: GET' \\
  -H 'Access-Control-Request-Headers: Accept-Version' \\
  -D /dev/stderr \\
  -w '\\nHTTP Status: %{http_code}\\nTotal Time: %{time_total}s\\n' \\
  -s"

# 6. Error scenario - Invalid session code
echo -e "${YELLOW}6. Error Scenario - Invalid Session Code${NC}"
echo "Command: curl -X GET '${BASE_URL}/api/sessions/invalid-session-code/metadata' ..."
echo ""

response=$(curl -X GET \
  "${BASE_URL}/api/sessions/invalid-session-code/metadata" \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: curl-example/1.0' \
  -w '\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n' \
  -s 2>&1)

echo -e "${RED}Expected Error Response:${NC}"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""
echo "----------------------------------------"
echo ""

# 7. Error scenario - Wrong HTTP method
make_request "7. Error Scenario - Wrong HTTP Method (POST)" \
"curl -X POST \\
  '${BASE_URL}/api/sessions/${SESSION_CODE}/metadata' \\
  -H 'Content-Type: application/json' \\
  -H 'User-Agent: curl-example/1.0' \\
  -d '{}' \\
  -w '\\nHTTP Status: %{http_code}\\nTotal Time: %{time_total}s\\n' \\
  -s"

# 8. Performance test - measure response time
echo -e "${YELLOW}8. Performance Test - Response Time Measurement${NC}"
echo "Making 5 consecutive requests to measure performance..."
echo ""

total_time=0
for i in {1..5}; do
    response_time=$(curl -X GET \
      "${BASE_URL}/api/sessions/${SESSION_CODE}/metadata" \
      -H 'Content-Type: application/json' \
      -H 'Accept-Version: 1.0.0' \
      -w '%{time_total}' \
      -s \
      -o /dev/null 2>/dev/null)
    
    echo "Request $i: ${response_time}s"
    total_time=$(echo "$total_time + $response_time" | bc -l 2>/dev/null || echo "N/A")
done

if [ "$total_time" != "N/A" ]; then
    avg_time=$(echo "scale=3; $total_time / 5" | bc -l)
    echo "Average response time: ${avg_time}s"
else
    echo "Average calculation unavailable (bc not installed)"
fi

echo ""
echo "----------------------------------------"
echo ""

# 9. Extract specific information using jq
if command -v jq &> /dev/null; then
    echo -e "${YELLOW}9. Extract Specific Information with jq${NC}"
    echo ""
    
    # Get just the tool names
    echo "Tool names only:"
    curl -X GET \
      "${BASE_URL}/api/sessions/${SESSION_CODE}/metadata" \
      -H 'Content-Type: application/json' \
      -s 2>/dev/null | jq -r '.tools[].name' 2>/dev/null || echo "Request failed"
    
    echo ""
    
    # Get API version info
    echo "Version information:"
    curl -X GET \
      "${BASE_URL}/api/sessions/${SESSION_CODE}/metadata" \
      -H 'Accept-Version: 1.0.0' \
      -s 2>/dev/null | jq '{apiVersion, toolManifestVersion, supportedVersions}' 2>/dev/null || echo "Request failed"
    
    echo ""
    
    # Count tools
    echo "Number of available tools:"
    curl -X GET \
      "${BASE_URL}/api/sessions/${SESSION_CODE}/metadata" \
      -s 2>/dev/null | jq '.tools | length' 2>/dev/null || echo "Request failed"
    
    echo ""
    echo "----------------------------------------"
    echo ""
fi

# 10. Complete example with all best practices
echo -e "${YELLOW}10. Complete Example with Best Practices${NC}"
echo "This example shows all recommended headers and practices:"
echo ""

curl -X GET \
  "${BASE_URL}/api/sessions/${SESSION_CODE}/metadata" \
  -H 'Content-Type: application/json' \
  -H 'Accept-Version: 1.0.0' \
  -H 'User-Agent: MyApp/1.0.0 (contact@example.com)' \
  -H 'Accept: application/json' \
  -w '\n\n=== Response Metrics ===\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nDNS Lookup: %{time_namelookup}s\nConnect Time: %{time_connect}s\nSSL Handshake: %{time_appconnect}s\nRedirects: %{num_redirects}\nResponse Size: %{size_download} bytes\n' \
  -s | jq '.' 2>/dev/null || echo "Request failed or jq not available"

echo ""
echo "========================================"
echo -e "${GREEN}Examples completed!${NC}"
echo ""
echo "Tips for production use:"
echo "- Always use HTTPS in production"
echo "- Include proper User-Agent headers"
echo "- Handle errors appropriately in your application"
echo "- Consider implementing retry logic for network failures"
echo "- Monitor response times and implement timeouts"
echo "- Use version negotiation for forward compatibility" 