/**
 * Two-Step Graph Axes Assignment Test
 * Step 1: Create graph component
 * Step 2: Update/assign axes in subsequent API calls
 */

const SESSION_CODE = "YZLUCZUJ";
const BASE_URL = "https://codap-e9fut2tgz-cdorsey-concordorgs-projects.vercel.app";
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

async function testTwoStepGraphAxes() {
  console.log("🎯 TWO-STEP GRAPH AXES ASSIGNMENT TEST");
  console.log(`📋 Session: ${SESSION_CODE}`);
  console.log("🎯 Goal: Create graph first, then assign axes in separate API calls");
  console.log("==================================================\n");

  try {
    // Step 1: Create data context
    console.log("1️⃣ Creating data context...");
    const dataContext = await submitToolRequest("create_data_context", {
      name: "TwoStepTest",
      title: "Two-Step Graph Test"
    });

    if (!dataContext.success) {
      console.log("❌ Failed to create data context");
      return;
    }

    // Step 2: Create collection with attributes
    console.log("\n2️⃣ Creating collection with attributes...");
    const collection = await submitToolRequest("create_collection", {
      dataContextName: "TwoStepTest",
      collectionName: "Experiments",
      attributes: [
        { name: "trial", type: "numeric", title: "Trial Number" },
        { name: "voltage", type: "numeric", title: "Voltage (V)" },
        { name: "current", type: "numeric", title: "Current (A)" },
        { name: "resistance", type: "numeric", title: "Resistance (Ω)" }
      ]
    });

    if (!collection.success) {
      console.log("❌ Failed to create collection");
      return;
    }

    // Step 3: Add sample data
    console.log("\n3️⃣ Adding sample data...");
    const items = await submitToolRequest("create_items", {
      dataContextName: "TwoStepTest",
      collectionName: "Experiments",
      items: [
        { trial: 1, voltage: 1.5, current: 0.15, resistance: 10 },
        { trial: 2, voltage: 3.0, current: 0.30, resistance: 10 },
        { trial: 3, voltage: 4.5, current: 0.45, resistance: 10 },
        { trial: 4, voltage: 6.0, current: 0.60, resistance: 10 },
        { trial: 5, voltage: 7.5, current: 0.75, resistance: 10 }
      ]
    });

    if (!items.success) {
      console.log("❌ Failed to create items");
      return;
    }

    // Step 3b: Create data table to make data visible
    console.log("\n3️⃣b Creating data table...");
    const dataTable = await submitToolRequest("create_table", {
      dataContextName: "TwoStepTest",
      title: "Electrical Experiments Data",
      position: { x: 50, y: 50 },
      dimensions: { width: 500, height: 200 }
    });

    if (dataTable.success) {
      console.log(`   📋 Data table created with ID: ${dataTable.data.id}`);
    }

    await pause(3, "🔍 CHECK: Data table should be visible with 5 experiment records");

    // Step 4: Create empty graph component (no axes assigned yet)
    console.log("\n4️⃣ Creating empty graph component...");
    const emptyGraph = await submitToolRequest("create_graph", {
      dataContextName: "TwoStepTest",
      title: "Voltage vs Current (Two-Step)",
      position: { x: 50, y: 280 },
      dimensions: { width: 400, height: 300 }
    });

    if (!emptyGraph.success) {
      console.log("❌ Failed to create empty graph");
      return;
    }

    const graphId = emptyGraph.data.id;
    console.log(`   📊 Empty graph created with ID: ${graphId}`);

    await pause(3, "🔍 CHECK: Empty graph should be visible with random dots");

    // Step 5: Update graph to assign X-axis attribute
    console.log("\n5️⃣ Assigning X-axis attribute...");
    const assignXAxis = await submitToolRequest("update_component", {
      componentId: graphId,
      xAttributeName: "voltage"
    });

    if (assignXAxis.success) {
      console.log(`   📈 X-axis assigned to 'voltage'`);
    }

    await pause(3, "🔍 CHECK: Does graph now show voltage on X-axis?");

    // Step 6: Update graph to assign Y-axis attribute
    console.log("\n6️⃣ Assigning Y-axis attribute...");
    const assignYAxis = await submitToolRequest("update_component", {
      componentId: graphId,
      yAttributeName: "current"
    });

    if (assignYAxis.success) {
      console.log(`   📈 Y-axis assigned to 'current'`);
    }

    await pause(5, "🔍 CHECK: Does graph now show current on Y-axis? Should see linear relationship!");

    // Step 7: Create second graph using the two-step approach
    console.log("\n7️⃣ Creating second graph with two-step approach...");
    
    // 7a: Create empty graph
    const emptyGraph2 = await submitToolRequest("create_graph", {
      dataContextName: "TwoStepTest",
      title: "Trial vs Resistance (Two-Step)",
      position: { x: 480, y: 280 },
      dimensions: { width: 400, height: 300 }
    });

    if (!emptyGraph2.success) {
      console.log("❌ Failed to create second empty graph");
      return;
    }

    const graphId2 = emptyGraph2.data.id;
    console.log(`   📊 Second empty graph created with ID: ${graphId2}`);

    // 7b: Assign both axes in one update call
    console.log("\n8️⃣ Assigning both axes in single update...");
    const assignBothAxes = await submitToolRequest("update_component", {
      componentId: graphId2,
      xAttributeName: "trial",
      yAttributeName: "resistance"
    });

    if (assignBothAxes.success) {
      console.log(`   📈 Both axes assigned: trial (X) and resistance (Y)`);
    }

    await pause(5, "🔍 CHECK: Does second graph show trial vs resistance?");

    // Step 8: Try alternative update approach using component resource
    console.log("\n9️⃣ Testing alternative update approach...");
    const emptyGraph3 = await submitToolRequest("create_graph", {
      dataContextName: "TwoStepTest",
      title: "Voltage vs Resistance (Alternative)",
      position: { x: 50, y: 620 },
      dimensions: { width: 400, height: 300 }
    });

    if (emptyGraph3.success) {
      const graphId3 = emptyGraph3.data.id;
      console.log(`   📊 Third graph created with ID: ${graphId3}`);

      // Try updating with full component specification
      const updateGraph3 = await submitToolRequest("update_component", {
        componentId: graphId3,
        values: {
          xAttributeName: "voltage",
          yAttributeName: "resistance"
        }
      });

      if (updateGraph3.success) {
        console.log(`   📈 Third graph updated with voltage vs resistance`);
      }
    }

    await pause(5, "🔍 CHECK: Does third graph show voltage vs resistance?");

    console.log("\n🎉 TWO-STEP GRAPH AXES TEST FINISHED!");
    console.log("📊 What should be visible in CODAP:");
    console.log("   • Data table with 5 electrical experiment records");
    console.log("   • Graph 1: Voltage (X) vs Current (Y) - should show linear relationship");
    console.log("   • Graph 2: Trial (X) vs Resistance (Y) - should show flat line at 10Ω");
    console.log("   • Graph 3: Voltage (X) vs Resistance (Y) - should show flat line at 10Ω");
    console.log("\n🔧 Two-step approaches tested:");
    console.log("   1. Create graph → Update X-axis → Update Y-axis (separate calls)");
    console.log("   2. Create graph → Update both axes (single call)");
    console.log("   3. Create graph → Update with values object");
    console.log("\n❓ CRITICAL QUESTION: Which two-step approach shows attribute names on axes?");

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testTwoStepGraphAxes().catch(console.error); 
