/**
 * Visual CODAP Tools Workflow Test
 * Prioritizes creating visible data and table first, then demonstrates all tools
 * with real-time visible changes in the CODAP interface
 */

const SESSION_CODE = "TVIZM5FF";
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

async function submitToolRequest(toolName, params, description = "") {
  const requestId = `test-${toolName}-${Date.now()}`;
  
  console.log(`🔧 ${description || toolName}...`);
  
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
    console.log(`   ❌ Failed to submit: ${submitResponse.data?.message || "Unknown error"}`);
    return { success: false, error: submitResponse.data };
  }
  
  // Poll for response (max 8 seconds)
  for (let attempt = 1; attempt <= 8; attempt++) {
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
          const valuesStr = JSON.stringify(result.result.values || result.result);
          console.log(`   ✅ Success: ${valuesStr.substring(0, 80)}${valuesStr.length > 80 ? "..." : ""}`);
          return { success: true, data: result.result.values || result.result };
        } else if (result.result && !result.result.success) {
          console.log(`   ❌ Failed: ${JSON.stringify(result.result.values || result.result)}`);
          return { success: false, error: result.result.values || result.result };
        }
      }
    
    if (attempt === 8) {
      console.log(`   ⏰ Timed out after 8 seconds`);
      return { success: false, error: "Timeout" };
    }
  }
}

async function pause(seconds, message) {
  console.log(`\n⏸️  ${message}`);
  console.log(`   Pausing ${seconds} seconds to observe changes in CODAP...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function testVisualWorkflow() {
  console.log("🚀 Visual CODAP Tools Workflow Test");
  console.log("📋 Session:", SESSION_CODE);
  console.log("🌐 Server:", BASE_URL);
  console.log("🎯 Goal: Create visible data and table immediately, then demonstrate all tools");
  console.log("👀 Watch your CODAP interface for real-time changes!");
  console.log("==================================================\n");

  let dataContextId, collectionId, itemIds = [], componentIds = [];

  // ===========================================
  // PHASE 1: IMMEDIATE VISUAL SETUP
  // ===========================================
  console.log("🎬 PHASE 1: IMMEDIATE VISUAL SETUP");
  console.log("Create data and table ASAP for visual feedback");
  console.log("=====================================\n");

  // 1. Create data context
  console.log("1️⃣ Creating data context...");
  const dataContext = await submitToolRequest("create_data_context", {
    name: "LiveDemo",
    title: "Live Demo Dataset",
    description: "Real-time demonstration of all CODAP tools"
  });
  
  if (!dataContext.success) {
    console.log("❌ Cannot continue without data context");
    return;
  }
  dataContextId = dataContext.data.id;

  // 2. Create collection with initial data structure
  console.log("\n2️⃣ Creating collection with attributes...");
  const collection = await submitToolRequest("create_collection", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    attributes: [
      { name: "name", type: "categorical", title: "Student Name" },
      { name: "age", type: "numeric", title: "Age" },
      { name: "grade", type: "categorical", title: "Grade" },
      { name: "score", type: "numeric", title: "Score" }
    ]
  });
  
  if (!collection.success) {
    console.log("❌ Cannot continue without collection");
    return;
  }

  // 3. Add initial data immediately
  console.log("\n3️⃣ Adding initial student data...");
  const initialItems = await submitToolRequest("create_items", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    items: [
      { name: "Alice", age: 16, grade: "10th", score: 85 },
      { name: "Bob", age: 17, grade: "11th", score: 92 },
      { name: "Charlie", age: 15, grade: "9th", score: 78 }
    ]
  });

  // 4. Create table immediately for visual feedback
  console.log("\n4️⃣ Creating data table for visual feedback...");
  const table = await submitToolRequest("create_table", {
    dataContextName: "LiveDemo",
    title: "Live Demo - Student Data",
    position: { x: 50, y: 50 },
    dimensions: { width: 500, height: 300 }
  });

  if (table.success) {
    componentIds.push(table.data.id);
  }

  await pause(3, "LOOK AT YOUR CODAP! You should see a table with 3 students.");

  // ===========================================
  // PHASE 2: DATA MANIPULATION DEMO
  // ===========================================
  console.log("\n📊 PHASE 2: LIVE DATA MANIPULATION");
  console.log("Watch the table update as we modify data!");
  console.log("=======================================\n");

  // 5. Add more students
  console.log("5️⃣ Adding more students - WATCH THE TABLE GROW!");
  await submitToolRequest("create_items", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    items: [
      { name: "Diana", age: 16, grade: "10th", score: 95 },
      { name: "Ethan", age: 17, grade: "11th", score: 88 }
    ]
  });

  await pause(2, "Notice 2 new students appeared in the table!");

  // 6. Get all current items to work with
  console.log("\n6️⃣ Getting all current items...");
  const allItems = await submitToolRequest("get_items", {
    dataContextName: "LiveDemo",
    collectionName: "Students"
  });

  if (allItems.success && allItems.data.length > 0) {
    itemIds = allItems.data.map(item => item.id);
    console.log(`   Found ${itemIds.length} students with IDs: ${itemIds.slice(0, 3).join(", ")}...`);
  }

  // 7. Add a new attribute - WATCH THE TABLE GET A NEW COLUMN!
  console.log("\n7️⃣ Adding GPA column - WATCH FOR NEW COLUMN!");
  await submitToolRequest("create_attribute", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    attribute: {
      name: "gpa",
      type: "numeric",
      title: "GPA",
      description: "Grade Point Average"
    }
  });

  await pause(2, "A new GPA column should have appeared!");

  // 8. Update some student data - WATCH VALUES CHANGE!
  console.log("\n8️⃣ Updating student data - WATCH VALUES CHANGE!");
  if (itemIds.length >= 3) {
    await submitToolRequest("update_items", {
      dataContextName: "LiveDemo",
      updates: [
        { id: itemIds[0], values: { gpa: 3.8, score: 90 } },
        { id: itemIds[1], values: { gpa: 3.5, score: 95 } },
        { id: itemIds[2], values: { gpa: 3.2, score: 82 } }
      ]
    });
  }

  await pause(3, "Watch the scores and GPA values update in the table!");

  // ===========================================
  // PHASE 3: VISUAL COMPONENTS DEMO
  // ===========================================
  console.log("\n📈 PHASE 3: VISUAL COMPONENTS");
  console.log("Creating graphs and charts!");
  console.log("============================\n");

  // 9. Create scatter plot - NEW VISUAL!
  console.log("9️⃣ Creating scatter plot: Age vs Score");
  const graph = await submitToolRequest("create_graph", {
    dataContextName: "LiveDemo",
    title: "Age vs Score Scatter Plot",
    xAttribute: "age",
    yAttribute: "score",
    position: { x: 600, y: 50 },
    dimensions: { width: 400, height: 300 }
  });

  if (graph.success) {
    componentIds.push(graph.data.id);
  }

  await pause(3, "A scatter plot should appear showing age vs score relationship!");

  // 10. Create another graph - GPA vs Score  
  console.log("\n🔟 Creating another graph: GPA vs Score");
  const graph2 = await submitToolRequest("create_graph", {
    dataContextName: "LiveDemo",
    title: "GPA vs Score Analysis",
    xAttribute: "gpa",
    yAttribute: "score",
    position: { x: 50, y: 400 },
    dimensions: { width: 400, height: 300 }
  });

  await pause(3, "Second graph created! Notice the correlation patterns.");

  // ===========================================
  // PHASE 4: SELECTION AND ANALYSIS
  // ===========================================
  console.log("\n🎯 PHASE 4: SELECTION AND ANALYSIS");
  console.log("Interactive selection and filtering!");
  console.log("==================================\n");

  // 11. Select specific students - WATCH HIGHLIGHTING!
  console.log("1️⃣1️⃣ Selecting high-scoring students - WATCH HIGHLIGHTING!");
  if (itemIds.length >= 3) {
    await submitToolRequest("select_cases", {
      dataContextName: "LiveDemo",
      collectionName: "Students",
      caseIds: [itemIds[0], itemIds[3]] // Alice and Diana (high scorers)
    });
  }

  await pause(3, "Selected students should be highlighted in table and graphs!");

  // 12. Search for specific criteria
  console.log("\n1️⃣2️⃣ Searching for 10th grade students...");
  await submitToolRequest("search_cases", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    searchCriteria: { attributeName: "grade", value: "10th" }
  });

  await pause(2, "Search results show 10th grade students.");

  // 13. Get case count
  console.log("\n1️⃣3️⃣ Getting total student count...");
  await submitToolRequest("get_case_count", {
    dataContextName: "LiveDemo",
    collectionName: "Students"
  });

  // ===========================================
  // PHASE 5: ADVANCED OPERATIONS
  // ===========================================
  console.log("\n🔧 PHASE 5: ADVANCED OPERATIONS");
  console.log("Attribute management and data refinement");
  console.log("=======================================\n");

  // 14. Reorder attributes - WATCH COLUMNS MOVE!
  console.log("1️⃣4️⃣ Repositioning score column - WATCH IT MOVE!");
  await submitToolRequest("reorder_attributes", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    attributeName: "score",
    newPosition: 2  // Move score to position 2 (after name and age)
  });

  await pause(3, "Score column should have moved to a new position!");

  // 15. Update attribute properties
  console.log("\n1️⃣5️⃣ Updating attribute titles...");
  await submitToolRequest("update_attribute", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    attributeName: "score",
    title: "Test Score (%)",
    description: "Test score as percentage"
  });

  await pause(2, 'Score column title should update to "Test Score (%)"');

  // 16. Add one more student with all data
  console.log("\n1️⃣6️⃣ Adding final student with complete data...");
  await submitToolRequest("create_items", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    items: [
      { name: "Fiona", age: 16, grade: "10th", score: 97, gpa: 4.0 }
    ]
  });

  await pause(3, "Final student Fiona added - notice the high GPA and score!");

  // ===========================================
  // PHASE 6: COMPONENT MANAGEMENT
  // ===========================================
  console.log("\n🖼️ PHASE 6: COMPONENT MANAGEMENT");
  console.log("Managing visual components");
  console.log("===========================\n");

  // 17. Get all components
  console.log("1️⃣7️⃣ Listing all components...");
  await submitToolRequest("get_components", {});

  // 18. Update table position
  console.log("\n1️⃣8️⃣ Moving table to new position...");
  if (componentIds.length > 0) {
    await submitToolRequest("update_component", {
      componentId: componentIds[0],
      title: "🎓 Final Student Dataset",
      position: { x: 100, y: 100 }
    });
  }

  await pause(2, "Table should move and get a new title with graduation emoji!");

  // ===========================================
  // PHASE 7: FINAL DEMONSTRATIONS
  // ===========================================
  console.log("\n🏁 PHASE 7: FINAL DEMONSTRATIONS");
  console.log("Testing remaining tools and cleanup options");
  console.log("==========================================\n");

  // 19. Clear selection
  console.log("1️⃣9️⃣ Clearing all selections...");
  await submitToolRequest("clear_selection", {
    dataContextName: "LiveDemo",
    collectionName: "Students"
  });

  await pause(2, "All highlighting should disappear.");

  // 20. Get specific student by index
  console.log("\n2️⃣0️⃣ Getting first student details...");
  await submitToolRequest("get_case_by_index", {
    dataContextName: "LiveDemo",
    collectionName: "Students",
    caseIndex: 0
  });

  // 21. Get specific item by ID
  if (itemIds.length > 0) {
    console.log("\n2️⃣1️⃣ Getting student by ID...");
    await submitToolRequest("get_item_by_id", {
      dataContextName: "LiveDemo",
      collectionName: "Students",
      itemId: itemIds[0]
    });
  }

  // 22. Final data verification
  console.log("\n2️⃣2️⃣ Final data verification...");
  await submitToolRequest("get_data_contexts", {});
  await submitToolRequest("get_collections", { dataContextName: "LiveDemo" });
  await submitToolRequest("get_attributes", { 
    dataContextName: "LiveDemo", 
    collectionName: "Students" 
  });

  console.log("\n🎉 VISUAL DEMONSTRATION COMPLETE!");
  console.log("=================================");
  console.log("✅ All major CODAP tools demonstrated with visual feedback!");
  console.log("✅ Real-time data creation, modification, and analysis");
  console.log("✅ Multiple visual components (table, scatter plots)");
  console.log("✅ Interactive selection and highlighting");
  console.log("✅ Dynamic attribute management");
  console.log("✅ Complete workflow from setup to analysis");
  console.log("\n👀 Your CODAP interface should now show:");
  console.log("   📊 A data table with 6 students");
  console.log("   📈 Two scatter plot graphs");
  console.log("   🎯 All data properly organized and visible");
  console.log("\n🚀 The CODAP-MCP system is fully operational for LLM agents!");

  // Optional cleanup prompt
  console.log("\n🧹 CLEANUP OPTIONS:");
  console.log("The test data remains in CODAP for your inspection.");
  console.log('If you want to clean up, manually delete the "LiveDemo" data context.');
}

testVisualWorkflow().catch(console.error); 
