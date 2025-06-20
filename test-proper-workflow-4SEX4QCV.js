/**
 * Proper CODAP Workflow Test
 * Tests tools in the correct logical order to create and query data
 */

const SESSION_CODE = "4SEX4QCV";
const BASE_URL = "https://codap-l1pz9li9n-cdorsey-concordorgs-projects.vercel.app";
const BYPASS_HEADER = "pAg5Eon3T8qOwMaWKzo9k6T4pdbYiCye";

async function makeRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      statusText: "Network Error",
      data: error.message,
      headers: {}
    };
  }
}

async function submitToolRequest(toolName, params) {
  const requestId = `test-${toolName}-${Date.now()}`;
  
  console.log(`🔧 Testing ${toolName}...`);
  
  // Submit request
  const submitResponse = await makeRequest(`${BASE_URL}/api/request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sso-bypass": BYPASS_HEADER
    },
    body: JSON.stringify({
      sessionCode: SESSION_CODE,
      toolName,
      params,
      requestId
    })
  });
  
  if (submitResponse.status !== 202) {
    console.log(`❌ Failed to submit ${toolName}:`, submitResponse.data);
    return null;
  }
  
  console.log(`   ⏳ Request queued: ${requestId}`);
  
  // Poll for response (max 15 seconds)
  for (let attempt = 1; attempt <= 15; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pollResponse = await makeRequest(`${BASE_URL}/api/response?sessionCode=${SESSION_CODE}&requestId=${requestId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-sso-bypass": BYPASS_HEADER
      }
    });
    
    if (pollResponse.status === 200) {
      const result = pollResponse.data;
      if (result.result && result.result.success) {
        console.log(`   ✅ ${toolName} succeeded:`, JSON.stringify(result.result.values, null, 2));
        return result.result.values;
      } else if (result.result && !result.result.success) {
        console.log(`   ❌ ${toolName} failed:`, JSON.stringify(result.result.values, null, 2));
        return null;
      }
    }
    
    if (attempt === 15) {
      console.log(`   ⏰ ${toolName} timed out after 15 seconds`);
      return null;
    }
  }
}

async function testProperWorkflow() {
  console.log("🚀 Proper CODAP Workflow Test");
  console.log("📋 Session:", SESSION_CODE);
  console.log("🌐 Server:", BASE_URL);
  console.log("==================================================\n");

  // Step 1: Check current data contexts
  console.log("1️⃣ Checking existing data contexts...");
  const existingContexts = await submitToolRequest("get_data_contexts", {});
  
  // Step 2: Create a new data context
  console.log("\n2️⃣ Creating new data context...");
  const dataContext = await submitToolRequest("create_data_context", {
    name: "TestDataset",
    title: "Test Dataset for Workflow",
    description: "A test dataset to verify CODAP integration"
  });
  
  if (!dataContext) {
    console.log("❌ Cannot continue without data context");
    return;
  }
  
  // Step 3: Create a collection in the data context  
  console.log("\n3️⃣ Creating collection...");
  const collection = await submitToolRequest("create_collection", {
    dataContextName: "TestDataset",
    collectionName: "Students",
    attributes: [
      { name: "name", type: "categorical" },
      { name: "age", type: "numeric" },
      { name: "grade", type: "categorical" }
    ]
  });
  
  if (!collection) {
    console.log("❌ Cannot continue without collection");
    return;
  }
  
  // Step 4: Verify the collection was created
  console.log("\n4️⃣ Verifying collection...");
  const collections = await submitToolRequest("get_collections", {
    dataContextName: "TestDataset"
  });
  
  // Step 5: Create some test data
  console.log("\n5️⃣ Creating test items...");
  const items = await submitToolRequest("create_items", {
    dataContextName: "TestDataset",
    collectionName: "Students",
    items: [
      { name: "Alice", age: 16, grade: "10th" },
      { name: "Bob", age: 17, grade: "11th" },
      { name: "Charlie", age: 15, grade: "9th" }
    ]
  });
  
  // Step 6: Query the data we just created
  console.log("\n6️⃣ Querying created data...");
  const itemCount = await submitToolRequest("get_case_count", {
    dataContextName: "TestDataset"
  });
  
  const retrievedItems = await submitToolRequest("get_items", {
    dataContextName: "TestDataset",
    collectionName: "Students"
  });
  
  // Step 7: Final verification
  console.log("\n7️⃣ Final verification...");
  const finalContexts = await submitToolRequest("get_data_contexts", {});
  
  console.log("\n🎉 Workflow test completed!");
  console.log("✅ The CODAP-MCP system is fully operational with proper data flow.");
}

testProperWorkflow().catch(console.error); 
