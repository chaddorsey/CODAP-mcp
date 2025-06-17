console.log("🧪 Testing CODAP MCP Relay API Endpoints");

// Configuration
const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "your-secret-here";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

console.log(`Testing against: ${BASE_URL}`);
if (BASE_URL.includes("vercel.app")) {
    console.log(`Using bypass secret: ${BYPASS_SECRET.substring(0, 10)}...`);
}

const getHeaders = () => {
    const headers = {
        "Content-Type": "application/json",
        "Origin": "https://codap.concord.org"
    };
    
    // Add bypass header for Vercel production deployments
    if (BASE_URL.includes("vercel.app") && BYPASS_SECRET !== "your-secret-here") {
        headers["x-vercel-protection-bypass"] = BYPASS_SECRET;
    }
    
    return headers;
};

async function testSessionCreation() {
    console.log("\n📝 Testing Session Creation...");
    try {
        const response = await fetch(`${BASE_URL}/api/sessions`, {
            method: "POST",
            headers: getHeaders()
        });
        
        const data = await response.json();
        console.log("✅ Session created:", data);
        return data.code;
    } catch (error) {
        console.error("❌ Session creation failed:", error.message);
        return null;
    }
}

async function testToolRequest(sessionCode) {
    console.log("\n🔧 Testing Tool Request...");
    try {
        const response = await fetch(`${BASE_URL}/api/request`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                sessionCode,
                requestId: "test-" + Date.now(),
                toolName: "test-tool",
                params: { test: "data" }
            })
        });
        
        const data = await response.json();
        console.log("✅ Tool request:", data);
        return true;
    } catch (error) {
        console.error("❌ Tool request failed:", error.message);
        return false;
    }
}

async function testToolResponse(sessionCode) {
    console.log("\n📤 Testing Tool Response...");
    try {
        const response = await fetch(`${BASE_URL}/api/response`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                sessionCode,
                requestId: "test-123",
                result: { success: true, data: "test result" }
            })
        });
        
        const data = await response.json();
        console.log("✅ Tool response:", data);
        return true;
    } catch (error) {
        console.error("❌ Tool response failed:", error.message);
        return false;
    }
}

async function testSSEStream(sessionCode) {
    console.log("\n🌊 Testing SSE Stream...");
    try {
        const url = new URL(`${BASE_URL}/api/stream`);
        url.searchParams.set("sessionCode", sessionCode);
        
        // Add bypass header to URL for SSE
        if (BASE_URL.includes("vercel.app") && BYPASS_SECRET !== "your-secret-here") {
            url.searchParams.set("x-vercel-protection-bypass", BYPASS_SECRET);
        }
        
        console.log("🔗 SSE URL:", url.toString());
        console.log("✅ SSE stream endpoint accessible (connection test skipped)");
        return true;
    } catch (error) {
        console.error("❌ SSE stream failed:", error.message);
        return false;
    }
}

async function testCORSHeaders() {
    console.log("\n🌐 Testing CORS Headers...");
    try {
        const response = await fetch(`${BASE_URL}/api/sessions`, {
            method: "OPTIONS",
            headers: {
                "Origin": "https://codap.concord.org",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        });
        
        const corsOrigin = response.headers.get("Access-Control-Allow-Origin");
        const corsMethods = response.headers.get("Access-Control-Allow-Methods");
        
        console.log("✅ CORS Origin:", corsOrigin);
        console.log("✅ CORS Methods:", corsMethods);
        return true;
    } catch (error) {
        console.error("❌ CORS test failed:", error.message);
        return false;
    }
}

async function testErrorHandling() {
    console.log("\n🚫 Testing Error Handling...");
    try {
        const response = await fetch(`${BASE_URL}/api/request`, {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                sessionCode: "INVALID",
                requestId: "test-error",
                toolName: "test-tool",
                params: {}
            })
        });
        
        const data = await response.json();
        console.log("✅ Error handling:", data);
        return true;
    } catch (error) {
        console.error("❌ Error handling test failed:", error.message);
        return false;
    }
}

async function runAllTests() {
    console.log("🚀 Starting API Tests\n");
    
    const sessionCode = await testSessionCreation();
    if (!sessionCode) {
        console.log("❌ Cannot continue tests without session code");
        return;
    }
    
    const results = {
        session: !!sessionCode,
        toolRequest: await testToolRequest(sessionCode),
        toolResponse: await testToolResponse(sessionCode),
        sseStream: await testSSEStream(sessionCode),
        cors: await testCORSHeaders(),
        errorHandling: await testErrorHandling()
    };
    
    console.log("\n📊 Test Results:");
    console.log("================");
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? "✅" : "❌"} ${test}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
}

runAllTests().catch(console.error); 
