/**
 * Generates simple connection prompt for Claude Desktop
 */
export function generateClaudeConnectionPrompt(sessionId: string): string {
  return `Connect to CODAP session ${sessionId}`;
}

/**
 * Generates detailed connection instructions after copying
 */
export function generateConnectionInstructions(sessionId: string): string {
  return `✅ Copied to clipboard!

Paste this into Claude Desktop:
"Connect to CODAP session ${sessionId}"

Claude will then connect to your CODAP workspace and you can:
• Create and modify datasets
• Generate graphs and visualizations
• Filter and analyze data
• Perform calculations and statistics

The connection will remain active while this CODAP session is open.`;
}

/**
 * Generates connection instructions for Claude Desktop
 */
export function generateClaudeConnectionInstructions(sessionId: string): string {
  return `Connect to CODAP session ${sessionId}

Tell Claude: "Connect to CODAP session ${sessionId}"

This will connect Claude to your current CODAP workspace so you can:
• Create and modify datasets
• Generate graphs and visualizations  
• Filter and analyze data
• Perform calculations and statistics

Need help setting up Claude Desktop? Click "Set up Claude MCP" in the plugin.`;
}

/**
 * Generates session-agnostic MCP configuration for Claude Desktop
 * This configuration uses our server-side stdio bridge - no external dependencies needed!
 * Just Node.js (which Claude Desktop users already have)
 */
export function generateClaudeMCPConfig(): string {
  const config = {
    "mcpServers": {
      "codap-mcp": {
        "command": "node",
        "args": [
          "-e",
          "const https=require('https');process.stdin.setEncoding('utf8');process.stdin.on('data',d=>{d.trim().split('\\n').forEach(async l=>{if(l.trim()){try{const m=JSON.parse(l);const r=await new Promise((resolve,reject)=>{const req=https.request('https://codap-mcp-stable.vercel.app/api/mcp',{method:'POST',headers:{'Content-Type':'application/json','mcp-session-id':process.env.MCP_SESSION_ID||'claude-session'}},res=>{let data='';res.on('data',c=>data+=c);res.on('end',()=>resolve(JSON.parse(data)))});req.on('error',reject);req.write(JSON.stringify(m));req.end()});if(r)process.stdout.write(JSON.stringify(r)+'\\n')}catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32603,message:e.message}})+'\\n')}}})});process.stderr.write('CODAP MCP ready\\n');"
        ],
        "env": {
          "MCP_SESSION_ID": "claude-desktop-session"
        }
      }
    }
  };
  
  return JSON.stringify(config, null, 2);
}

/**
 * Generates simple connection command for Claude Desktop with session context
 */
export function generateSimpleConnectionCommand(sessionId: string): string {
  return `Connect to CODAP session ${sessionId}`;
}

/**
 * Generates detailed setup instructions for first-time users
 */
export function generateDetailedSetupInstructions(relayBaseUrl: string): string {
  const config = generateClaudeMCPConfig();
  
  return `# Set up Claude Desktop with CODAP

## Step 1: Add MCP Configuration
Add this to your Claude Desktop config file:

\`\`\`json
${config}
\`\`\`

## Configuration File Location:
- **macOS**: ~/.config/claude-desktop/claude_desktop_config.json
- **Windows**: %APPDATA%\\Claude\\claude_desktop_config.json  
- **Linux**: ~/.config/claude-desktop/claude_desktop_config.json

## Step 2: Restart Claude Desktop
After saving the configuration, restart Claude Desktop.

## Step 3: Connect to Any Session
When you have a CODAP session running, tell Claude:
"Connect to CODAP session [SESSION_ID]"

Replace [SESSION_ID] with the actual session ID from your CODAP plugin.

## Why This Works Better
- One-time setup works for all future CODAP sessions
- No need to reconfigure Claude Desktop for each session
- Session IDs are passed dynamically when connecting
- Configuration never expires or becomes invalid

You can now use natural language to work with CODAP data!`;
}

/**
 * Generates session-specific connection instructions for current session
 */
export function generateSessionConnectionInstructions(sessionId: string): string {
  return `To connect Claude Desktop to your current CODAP session:

**Copy and paste this into Claude Desktop:**
Connect to CODAP session ${sessionId}

**What this does:**
• Establishes connection to your current CODAP workspace
• Enables natural language data manipulation
• Provides access to all 34 CODAP tools

**If this is your first time:**
Click "Set up Claude MCP" below for one-time configuration.`;
}

