/**
 * Complete Graph Axes Test - Create Data First, Then Test Fixed Implementation
 * Creates everything from scratch: data context, collection, sample data, then tests graph axes
 */

const SESSION_CODE = "N62K5ST2";
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
      data: responseData
    };
  } catch (error) {
    return {
      status: 0,
      statusText: "Network Error",
      data: { error: error.message }
    };
  }
}

async function submitToolRequest(toolName, params) {
  const requestId = `test-${toolName}-${Date.now()}`;
  
  console.log(`🔧 ${toolName}...`);
  
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
    console.log(`   ❌ Submit failed: ${submitResponse.statusText}`);
    return { success: false, error: submitResponse.data };
  }

  // Poll for response with timeout
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;

    const pollResponse = await makeRequest(`${BASE_URL}/api/response?sessionCode=${SESSION_CODE}&requestId=${requestId}`, {
      method: "GET",
      headers: {
        "x-sso-bypass": BYPASS_HEADER
      }
    });

    if (pollResponse.status === 200) {
      const result = pollResponse.data;
      if (result.result && result.result.success) {
        const valuesStr = JSON.stringify(result.result.values || result.result);
        console.log(`   ✅ Success: ${valuesStr.substring(0, 80)}${valuesStr.length > 80 ? "..." : ""}`);
        return { success: true, data: result.result.values || result.result };
      } else if (result.result && !result.result.success) {
        console.log(`   ❌ Failed: ${JSON.stringify(result.result.values || result.result)}`);
        return { success: false, error: result.result.values || result.result };
      }
    }
  }

  console.log(`   ⏰ Timeout after ${maxAttempts} seconds`);
  return { success: false, error: "Timeout" };
}

async function pause(seconds, message) {
  console.log(`\n⏸️  PAUSE ${seconds}s: ${message}`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function testCompleteGraphAxes() {
  console.log("🎯 COMPLETE GRAPH AXES TEST WITH DATA CREATION");
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log("🎯 Goal: Create data first, then test fixed graph axes implementation");
  console.log("==================================================\n");

  try {
    // Step 1: Create data context
    console.log("1️⃣ Creating data context...");
    const dataContext = await submitToolRequest("create_data_context", {
      name: "GraphAxesTest",
      title: "Graph Axes Test Dataset"
    });

    if (!dataContext.success) {
      console.log("❌ Failed to create data context");
      return;
    }

    // Step 2: Create collection with attributes
    console.log("\n2️⃣ Creating collection with attributes...");
    const collection = await submitToolRequest("create_collection", {
      dataContextName: "GraphAxesTest",
      collectionName: "Students",
      attributes: [
        { name: "name", type: "categorical" },
        { name: "age", type: "numeric" },
        { name: "score", type: "numeric" },
        { name: "gpa", type: "numeric" }
      ]
    });

    if (!collection.success) {
      console.log("❌ Failed to create collection");
      return;
    }

    // Step 3: Add sample data
    console.log("\n3️⃣ Adding sample data...");
    const items = await submitToolRequest("create_items", {
      dataContextName: "GraphAxesTest",
      collectionName: "Students",
      items: [
        { name: "Alice", age: 16, score: 85, gpa: 3.4 },
        { name: "Bob", age: 17, score: 92, gpa: 3.8 },
        { name: "Charlie", age: 15, score: 78, gpa: 3.1 },
        { name: "Diana", age: 16, score: 88, gpa: 3.6 },
        { name: "Ethan", age: 17, score: 95, gpa: 3.9 },
        { name: "Fiona", age: 15, score: 82, gpa: 3.3 }
      ]
    });

    if (!items.success) {
      console.log("❌ Failed to create items");
      return;
    }

    // Step 4: Create table for visibility
    console.log("\n4️⃣ Creating data table...");
    await submitToolRequest("create_table", {
      dataContextName: "GraphAxesTest",
      title: "Student Data Table",
      position: { x: 50, y: 50 },
      dimensions: { width: 500, height: 200 }
    });

    await pause(3, "Data table should now be visible with 6 students!");

    // Step 5: Test FIXED graph creation - Method 1
    console.log("\n5️⃣ Testing FIXED Graph Creation - Method 1: Direct xAttribute/yAttribute");
    const graph1 = await submitToolRequest("create_graph", {
      dataContextName: "GraphAxesTest",
      title: "FIXED: Age vs Score",
      xAttribute: "age",        // Server converts this to xAttributeName
      yAttribute: "score",      // Server converts this to yAttributeName
      position: { x: 50, y: 300 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph1.success) {
      console.log(`   📊 FIXED Graph 1 created with ID: ${graph1.data.id}`);
    }

    await pause(5, '🔍 CHECK: Does Graph 1 show "age" on X-axis and "score" on Y-axis?');

    // Step 6: Test FIXED graph creation - Method 2
    console.log("\n6️⃣ Testing FIXED Graph Creation - Method 2: Configuration object");
    const graph2 = await submitToolRequest("create_graph", {
      dataContextName: "GraphAxesTest",
      title: "FIXED: GPA vs Score (Config)",
      configuration: {
        xAttributeName: "gpa",   // Should be flattened to top level
        yAttributeName: "score"  // Should be flattened to top level
      },
      position: { x: 500, y: 300 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph2.success) {
      console.log(`   📊 FIXED Graph 2 created with ID: ${graph2.data.id}`);
    }

    await pause(5, '🔍 CHECK: Does Graph 2 show "gpa" on X-axis and "score" on Y-axis?');

    // Step 7: Test third variation
    console.log("\n7️⃣ Testing FIXED Graph Creation - Method 3: Age vs GPA");
    const graph3 = await submitToolRequest("create_graph", {
      dataContextName: "GraphAxesTest",
      title: "FIXED: Age vs GPA",
      xAttribute: "age",
      yAttribute: "gpa",
      position: { x: 50, y: 650 },
      dimensions: { width: 400, height: 300 }
    });

    if (graph3.success) {
      console.log(`   📊 FIXED Graph 3 created with ID: ${graph3.data.id}`);
    }

    await pause(5, '🔍 CHECK: Does Graph 3 show "age" on X-axis and "gpa" on Y-axis?');

    console.log("\n🎉 COMPLETE GRAPH AXES TEST FINISHED!");
    console.log("📊 What should be visible in CODAP:");
    console.log("   • Data table with 6 students (Alice, Bob, Charlie, Diana, Ethan, Fiona)");
    console.log("   • 3 graphs with different attribute combinations");
    console.log("\n🔧 Technical fixes applied:");
    console.log("   • Server: xAttribute → xAttributeName, yAttribute → yAttributeName");
    console.log("   • Browser Worker: Flattened configuration.xAttributeName to top level");
    console.log("   • Both: Direct assignment to component values (no nested configuration)");
    console.log("\n❓ CRITICAL QUESTION: Do ANY of the 3 graphs show attribute names on their axes?");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testCompleteGraphAxes().catch(console.error); 
