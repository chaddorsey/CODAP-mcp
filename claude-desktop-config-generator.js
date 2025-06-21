#!/usr/bin/env node

/**
 * Claude Desktop MCP Configuration Generator
 * Generates the configuration needed to connect Claude Desktop to CODAP MCP server
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  serverUrl: 'https://codap-aqzdjk77d-cdorsey-concordorgs-projects.vercel.app/api/mcp',
  defaultSessionId: 'EXAMPLE01'
};

function generateMCPConfig() {
  return {
    "mcpServers": {
      "codap": {
        "command": "node",
        "args": [
          "-e",
          "const https=require('https');process.stdin.setEncoding('utf8');process.stdin.on('data',d=>{d.trim().split('\\n').forEach(async l=>{if(l.trim()){try{const m=JSON.parse(l);const r=await new Promise((resolve,reject)=>{const req=https.request('" + CONFIG.serverUrl + "',{method:'POST',headers:{'Content-Type':'application/json','mcp-session-id':process.env.MCP_SESSION_ID||'claude-session'}},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>resolve(JSON.parse(data)))});req.on('error',reject);req.write(JSON.stringify(m));req.end()});if(r)process.stdout.write(JSON.stringify(r)+'\\n')}catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32603,message:e.message}})+'\\n')}}})});process.stderr.write('CODAP MCP ready\\n');"
        ],
        "env": {
          "MCP_SESSION_ID": "claude-desktop-session"
        }
      }
    }
  };
}

function getClaudeConfigPath() {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  switch (platform) {
    case 'darwin': // macOS
      return path.join(homeDir, '.config', 'claude-desktop', 'claude_desktop_config.json');
    case 'win32': // Windows
      return path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
    case 'linux': // Linux
      return path.join(homeDir, '.config', 'claude-desktop', 'claude_desktop_config.json');
    default:
      return path.join(homeDir, '.config', 'claude-desktop', 'claude_desktop_config.json');
  }
}

function printInstructions(sessionId, configPath, config) {
  console.log('\n🤖 Claude Desktop MCP Configuration Generator');
  console.log('=' .repeat(60));
  console.log(`\n🔗 Server URL: ${CONFIG.serverUrl}`);
  console.log(`📁 Config Path: ${configPath}`);
  
  console.log('\n📝 Configuration to add:');
  console.log('─'.repeat(40));
  console.log(JSON.stringify(config, null, 2));
  console.log('─'.repeat(40));
  
  console.log('\n🔧 Setup Instructions:');
  console.log('1. Create the config directory if it doesn\'t exist:');
  console.log(`   mkdir -p "${path.dirname(configPath)}"`);
  console.log('\n2. Edit/create the config file:');
  console.log(`   nano "${configPath}"`);
  console.log('\n3. Add the configuration above to the file');
  console.log('   (If file exists, merge with existing content)');
  console.log('\n4. Restart Claude Desktop');
  console.log('\n5. Test the connection by telling Claude:');
  console.log(`   "Connect to CODAP session ${sessionId}"`);
  
  console.log('\n🎯 NEW APPROACH BENEFITS:');
  console.log('• 🔄 Works for ALL CODAP sessions (no reconfiguration needed)');
  console.log('• ⏰ Configuration NEVER expires');
  console.log('• 🚀 Quick connection with any session ID');
  console.log('• 🛠️ One-time setup, use forever');
  
  console.log('\n✨ What you can do once connected:');
  console.log('• "Create a new dataset called Students with columns Name, Age, Grade"');
  console.log('• "Add sample data with 5 student records"');
  console.log('• "Create a scatter plot of Age vs Grade"');
  console.log('• "Calculate the average age of all students"');
  console.log('• "Filter to show only students with grade A"');
  
  console.log('\n🔍 How to connect to any CODAP session:');
  console.log('1. Load CODAP with the plugin');
  console.log('2. Note the session ID (8-character code)');
  console.log('3. Tell Claude: "Connect to CODAP session [SESSION_ID]"');
  console.log('4. Start using natural language with your CODAP data!');
  
  console.log('\n🔍 Troubleshooting:');
  console.log('• Check that Claude Desktop is updated to latest version');
  console.log('• Verify internet connection');
  console.log('• Ensure config file syntax is valid JSON');
  console.log('• Check Claude Desktop console for MCP connection logs');
}

function main() {
  const args = process.argv.slice(2);
  const sessionId = args[0] || CONFIG.defaultSessionId;
  
  const config = generateMCPConfig();
  const configPath = getClaudeConfigPath();
  
  printInstructions(sessionId, configPath, config);
  
  // Optionally save to file
  if (args.includes('--save')) {
    const outputFile = `claude-config-universal.json`;
    fs.writeFileSync(outputFile, JSON.stringify(config, null, 2));
    console.log(`\n💾 Configuration saved to: ${outputFile}`);
  }
  
  // Optionally check if config directory exists
  if (args.includes('--check')) {
    const configDir = path.dirname(configPath);
    if (fs.existsSync(configDir)) {
      console.log(`\n✅ Config directory exists: ${configDir}`);
      if (fs.existsSync(configPath)) {
        console.log(`✅ Config file exists: ${configPath}`);
        try {
          const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          console.log('📖 Existing config preview:');
          console.log(JSON.stringify(existingConfig, null, 2).substring(0, 200) + '...');
        } catch (e) {
          console.log('⚠️  Config file exists but is not valid JSON');
        }
      } else {
        console.log(`📝 Config file needs to be created: ${configPath}`);
      }
    } else {
      console.log(`📁 Config directory needs to be created: ${configDir}`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateMCPConfig,
  getClaudeConfigPath,
  CONFIG
}; 