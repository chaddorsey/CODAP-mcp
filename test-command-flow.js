// test-command-flow.js
// Simple test to verify the command queue system works

const API_SERVER_URL = "http://localhost:8083";

async function testCommandFlow() {
  console.log("Testing CODAP Command Flow...\n");

  // 1. Check API server health
  console.log("1. Checking API server health...");
  try {
    const healthResponse = await fetch(`${API_SERVER_URL}/api/health`);
    const health = await healthResponse.json();
    console.log("✅ API Server Health:", health);
  } catch (error) {
    console.log("❌ API Server not responding:", error.message);
    return;
  }

  // 2. Get pending commands
  console.log("\n2. Getting pending commands...");
  try {
    const commandsResponse = await fetch(`${API_SERVER_URL}/api/codap/commands`);
    const commandsData = await commandsResponse.json();
    console.log("📋 Pending commands:", commandsData.commands.length);
    
    if (commandsData.commands.length === 0) {
      console.log("No commands to process");
      return;
    }

    // 3. Process each command (simulate frontend)
    for (const command of commandsData.commands) {
      console.log(`\n3. Processing command: ${command.action} ${command.resource}`);
      console.log("Command details:", command);

      // Simulate CODAP API call result
      const mockResult = {
        success: true,
        values: {
          id: "mock-context-id",
          name: command.values.name || "Mock Dataset",
          collections: command.values.collections || []
        }
      };

      // 4. Send result back to API server
      console.log("4. Sending result back to API server...");
      try {
        const resultResponse = await fetch(`${API_SERVER_URL}/api/codap/results`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            commandId: command.id,
            success: true,
            result: mockResult
          })
        });

        if (resultResponse.ok) {
          console.log("✅ Result sent successfully");
        } else {
          console.log("❌ Failed to send result");
        }
      } catch (error) {
        console.log("❌ Error sending result:", error.message);
      }
    }

    // 5. Check health again to see queue status
    console.log("\n5. Checking final queue status...");
    const finalHealthResponse = await fetch(`${API_SERVER_URL}/api/health`);
    const finalHealth = await finalHealthResponse.json();
    console.log("📊 Final status:", finalHealth);

  } catch (error) {
    console.log("❌ Error getting commands:", error.message);
  }
}

// Run the test
testCommandFlow().catch(console.error); 
