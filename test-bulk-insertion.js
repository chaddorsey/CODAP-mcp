const fetch = require("node-fetch");

async function testBulkInsertion() {
  console.log("Testing bulk insertion fix...");
  
  try {
    // Test creating a dataset with bulk insertion
    const response = await fetch("http://localhost:8083/api/codap/create-dataset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Bulk Test",
        dataType: "custom",
        data: [
          { x: 1, y: 10, category: "A" },
          { x: 2, y: 20, category: "B" },
          { x: 3, y: 30, category: "C" }
        ],
        attributes: [
          { name: "x", type: "numeric" },
          { name: "y", type: "numeric" },
          { name: "category", type: "categorical" }
        ]
      })
    });
    
    const result = await response.json();
    console.log("Dataset creation result:", JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log("✅ Dataset created successfully");
      console.log(`📊 Records: ${result.recordCount}`);
      console.log("🔍 Check CODAP to see if data is now visible in the table");
    } else {
      console.log("❌ Dataset creation failed");
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testBulkInsertion(); 