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

async function updateAlias() {
  try {
    log("🔍 Getting latest deployment...");
    
    // Get the latest deployment URL
    const vercelOutput = execSync("vercel ls", { encoding: "utf8" });
    
    // Find the first Ready deployment URL
    const lines = vercelOutput.split("\n");
    let latestUrl = null;
    
    for (const line of lines) {
      // Look for lines that are complete URLs (they're ordered newest first)
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("https://codap-") && trimmedLine.endsWith(".vercel.app")) {
        latestUrl = trimmedLine;
        break;
      }
    }
    
    if (!latestUrl) {
      error("❌ Could not find a Ready deployment URL");
      process.exit(1);
    }
    
    log(`✅ Latest deployment: ${latestUrl}`);
    
    // Update the alias
    log("🔄 Updating alias...");
    const aliasCommand = `vercel alias set ${latestUrl} codap-mcp-stable.vercel.app`;
    
    const result = execSync(aliasCommand, { encoding: "utf8" });
    log(result);
    
    log("🎉 Alias updated successfully!");
    log("🌐 Stable URL: https://codap-mcp-stable.vercel.app");
    
  } catch (error) {
    error("❌ Error updating alias:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  updateAlias();
}

module.exports = { updateAlias }; 
