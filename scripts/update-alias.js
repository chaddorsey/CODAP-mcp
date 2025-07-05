#!/usr/bin/env node

/**
 * Update Alias Script
 * 
 * This script updates the codap-mcp-stable.vercel.app alias to point to the most recent
 * production deployment. Use this after testing a new deployment to promote it to the
 * stable alias that Claude Desktop and other MCP clients use.
 * 
 * Usage:
 *   npm run alias:update
 *   node scripts/update-alias.js
 */

const { execSync } = require("child_process");
const path = require("path");

const STABLE_ALIAS = "codap-mcp-stable.vercel.app";

function log(message) {
  console.log(`[alias-update] ${message}`);
}

function error(message) {
  console.error(`[alias-update] ERROR: ${message}`);
}

function runCommand(command, description) {
  log(`${description}...`);
  try {
    const result = execSync(command, { 
      encoding: "utf8", 
      stdio: ["pipe", "pipe", "pipe"],
      cwd: path.dirname(__dirname)
    });
    return result.trim();
  } catch (err) {
    error(`Failed to ${description.toLowerCase()}: ${err.message}`);
    if (err.stdout) {
      console.error("stdout:", err.stdout);
    }
    if (err.stderr) {
      console.error("stderr:", err.stderr);
    }
    process.exit(1);
  }
}

function main() {
  log("🚀 Starting alias update process...");
  
  // Get list of deployments
  const deploymentList = runCommand("vercel ls", "Fetching recent deployments");
  
  // The Vercel CLI in this context returns just the URLs, ordered by newest first
  const lines = deploymentList.split("\n").filter(line => line.trim());
  let latestDeployment = null;
  
  // Take the first URL (which is the most recent deployment)
  for (const line of lines) {
    if (line.startsWith("https://") && line.includes("vercel.app")) {
      latestDeployment = line.trim();
      break;
    }
  }
  
  if (!latestDeployment) {
    error("No deployment found. Please deploy first with: npm run deploy");
    error("Available deployments:");
    console.error(deploymentList);
    process.exit(1);
  }
  
  log(`📍 Latest deployment found: ${latestDeployment}`);
  
  // Check if alias already points to this deployment
  try {
    const aliasListResult = runCommand("vercel alias ls", "Checking for existing aliases");
    const aliasLines = aliasListResult.split("\n");
    let currentAliasTarget = null;
    
    // Find the line that contains our stable alias
    for (const line of aliasLines) {
      if (line.includes(STABLE_ALIAS)) {
        // Extract the source URL (first column)
        const parts = line.trim().split(/\s+/);
        if (parts.length > 0 && parts[0].includes("vercel.app")) {
          currentAliasTarget = parts[0];
          break;
        }
      }
    }
    
    if (currentAliasTarget) {
      // Normalize URLs for comparison (alias list might not include https://)
      const normalizedCurrent = currentAliasTarget.startsWith("https://") ? 
        currentAliasTarget : `https://${currentAliasTarget}`;
      const normalizedLatest = latestDeployment;
      
      if (normalizedCurrent === normalizedLatest) {
        log(`✅ Alias already points to the latest deployment!`);
        log(`   ${STABLE_ALIAS} -> ${normalizedLatest}`);
        return;
      } else {
        log(`Current alias points to different deployment: ${normalizedCurrent}`);
        log(`Latest deployment is: ${normalizedLatest}`);
        log(`Updating alias...`);
      }
    } else {
      log("No existing alias found, creating new one...");
    }
  } catch (err) {
    // Failed to get alias list, which is fine - just create the alias
    log("Unable to check existing aliases, creating new one...");
  }
  
  // Update the alias
  const aliasCommand = `vercel alias set ${latestDeployment} ${STABLE_ALIAS}`;
  runCommand(aliasCommand, `Setting alias ${STABLE_ALIAS} to point to ${latestDeployment}`);
  
  log("✅ Alias updated successfully!");
  log(`   ${STABLE_ALIAS} -> ${latestDeployment}`);
  log("");
  log("🎉 Your Claude Desktop MCP configuration will now use the latest deployment!");
  log("   You can verify with: npm run alias:current");
}

if (require.main === module) {
  main();
}

module.exports = { main }; 
