# Claude Desktop Integration Testing Guide

## Overview
This guide provides step-by-step instructions for testing the full Claude Desktop integration with CODAP. It covers both the technical setup and real-world usage scenarios.

## Prerequisites

### Required Software
- **Claude Desktop** (latest version) - Download from [claude.ai](https://claude.ai/download)
- **Node.js** (for MCP server-fetch) - Download from [nodejs.org](https://nodejs.org/)
- **Web Browser** - Modern browser (Chrome, Firefox, Safari, Edge)

### Required Access
- **CODAP**: https://codap.concord.org/app/
- **CODAP Plugin**: Load from production URL
- **Internet Connection**: Required for MCP server communication

## Testing Scenarios

### Scenario 1: First-Time User Setup (5 minutes)

**Objective**: Test the complete onboarding flow for a new user

#### Step 1: Load CODAP with Plugin
1. Open browser and navigate to: https://codap.concord.org/app/
2. Click "Plugins" menu → "Add CODAP Plugin"
3. Enter plugin URL: `https://codap-aqzdjk77d-cdorsey-concordorgs-projects.vercel.app`
4. **Expected Result**: CODAP AI Assistant panel appears with session ID

#### Step 2: Initial UI Verification
1. Verify prominent session ID display (8-character code)
2. Verify "📋 Copy Claude Connection Instructions" button is visible
3. Verify "Need help? Set up Claude MCP ↗" link is subtle but accessible
4. **Expected Result**: Clean, uncluttered interface focused on connection

#### Step 3: Claude Desktop Configuration
1. Click "Need help? Set up Claude MCP ↗" link
2. **Expected Result**: Modal appears with complete configuration
3. Verify configuration includes:
   - Correct MCP server URL
   - Session-specific environment variable
   - Platform-specific config file paths
   - Step-by-step instructions
4. Copy the configuration JSON
5. Create Claude Desktop config directory:
   ```bash
   # macOS/Linux
   mkdir -p ~/.config/claude-desktop
   
   # Windows (PowerShell)
   New-Item -Path "$env:APPDATA\Claude" -ItemType Directory -Force
   ```
6. Edit config file and add the configuration:
   ```bash
   # macOS/Linux
   nano ~/.config/claude-desktop/claude_desktop_config.json
   
   # Windows
   notepad "%APPDATA%\Claude\claude_desktop_config.json"
   ```
7. Restart Claude Desktop
8. **Expected Result**: Claude Desktop shows CODAP tools in available MCP servers

#### Step 4: Connection Test
1. Return to CODAP plugin
2. Click "📋 Copy Claude Connection Instructions" button
3. **Expected Result**: Connection instructions copied to clipboard
4. Open Claude Desktop
5. Paste instructions into chat
6. **Expected Result**: Claude acknowledges connection and lists available CODAP tools

### Scenario 2: Data Creation Workflow (10 minutes)

**Objective**: Test complete data manipulation workflow via natural language

#### Step 2.1: Dataset Creation
1. Tell Claude: "Create a new dataset called 'StudentGrades' with columns: StudentName (text), MathScore (number), ScienceScore (number), Grade (text)"
2. **Expected Result**: 
   - Dataset appears in CODAP workspace
   - Table shows correct column structure
   - Claude confirms successful creation

#### Step 2.2: Data Population
1. Tell Claude: "Add sample data for 8 students with realistic names and scores"
2. **Expected Result**:
   - 8 rows of data appear in CODAP table
   - Names are realistic (not generic)
   - Scores are within reasonable ranges (0-100)
   - Grades correspond to score ranges

#### Step 2.3: Visualization Creation
1. Tell Claude: "Create a scatter plot showing the relationship between MathScore and ScienceScore"
2. **Expected Result**:
   - Scatter plot component appears in CODAP
   - X-axis shows MathScore
   - Y-axis shows ScienceScore
   - Points represent individual students

#### Step 2.4: Data Analysis
1. Tell Claude: "Calculate the average math score and identify students scoring above average"
2. **Expected Result**:
   - Claude provides calculated average
   - Lists specific students above average
   - May highlight these students in CODAP

#### Step 2.5: Data Filtering
1. Tell Claude: "Show only students with grades A or B"
2. **Expected Result**:
   - CODAP table filters to show subset
   - Visualizations update to reflect filtered data
   - Claude confirms filter applied

### Scenario 3: Error Handling and Recovery (5 minutes)

**Objective**: Test system behavior under error conditions

#### Step 3.1: Network Interruption
1. Disconnect internet connection
2. Tell Claude to perform a CODAP operation
3. **Expected Result**: Clear error message about connection failure
4. Reconnect internet
5. Retry operation
6. **Expected Result**: Operation succeeds after reconnection

#### Step 3.2: Invalid Operation
1. Tell Claude: "Delete all data from a nonexistent dataset called 'FakeData'"
2. **Expected Result**: 
   - Claude provides helpful error message
   - Suggests alternative actions
   - No error state in CODAP

#### Step 3.3: Session Timeout
1. Leave session idle for 15+ minutes
2. Attempt CODAP operation
3. **Expected Result**:
   - Session timeout error
   - Clear instructions to reconnect
   - Option to get new session ID

### Scenario 4: Multi-Session Testing (10 minutes)

**Objective**: Test session isolation with multiple CODAP instances

#### Step 4.1: Multiple CODAP Tabs
1. Open second CODAP tab in new browser window
2. Load CODAP plugin (different session ID)
3. Configure Claude with second session
4. **Expected Result**: Two independent CODAP workspaces

#### Step 4.2: Session Isolation Verification
1. Create different datasets in each session
2. Verify operations in one session don't affect the other
3. **Expected Result**: Complete isolation between sessions

#### Step 4.3: Claude Session Switching
1. Use Claude to connect to first session
2. Perform operations
3. Switch Claude to second session
4. Perform different operations
5. **Expected Result**: Claude can work with both sessions independently

## Performance Benchmarks

### Expected Performance Metrics
- **Plugin Load Time**: < 3 seconds
- **Session Creation**: < 2 seconds
- **Tool Discovery**: < 2 seconds (Claude Desktop)
- **Simple Operations**: < 5 seconds (create dataset, add data)
- **Complex Operations**: < 10 seconds (create visualization with analysis)
- **Error Recovery**: < 3 seconds (after network restoration)

### Performance Testing
1. Measure each metric during testing
2. Record any operations exceeding thresholds
3. Test under different network conditions
4. Verify consistent performance across browser types

## Troubleshooting Guide

### Common Issues and Solutions

#### "Claude doesn't see CODAP tools"
- **Check**: Claude Desktop configuration syntax
- **Check**: MCP server URL is correct
- **Solution**: Restart Claude Desktop after config changes

#### "Connection failed" errors
- **Check**: Internet connectivity
- **Check**: Session ID matches between CODAP and Claude config
- **Solution**: Copy new connection instructions from CODAP

#### "Tool execution failed"
- **Check**: CODAP plugin is loaded and responsive
- **Check**: Browser console for JavaScript errors
- **Solution**: Refresh CODAP page and reconnect

#### "Session not found"
- **Check**: Session hasn't expired (10-minute TTL)
- **Solution**: Generate new session in CODAP plugin

### Advanced Troubleshooting

#### MCP Server Debugging
```bash
# Test MCP server directly
curl -X POST https://codap-aqzdjk77d-cdorsey-concordorgs-projects.vercel.app/api/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: TEST123" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

#### Claude Desktop Logs
- **macOS**: `~/Library/Logs/Claude/`
- **Windows**: `%APPDATA%\Claude\logs\`
- **Linux**: `~/.local/share/Claude/logs/`

#### Browser Console Monitoring
1. Open browser developer tools (F12)
2. Monitor Console tab during operations
3. Look for MCP-related errors or warnings

## Success Criteria Checklist

### Technical Integration
- [ ] Claude Desktop connects to MCP server successfully
- [ ] All 34 CODAP tools are discoverable
- [ ] Tool execution works for both simple and complex operations
- [ ] Session management maintains isolation
- [ ] Error handling provides clear, actionable messages

### User Experience
- [ ] Setup process completable in under 5 minutes
- [ ] Connection instructions are clear and copy-paste ready
- [ ] Natural language commands work intuitively
- [ ] Performance meets benchmark targets
- [ ] Error states are recoverable

### Compatibility
- [ ] Works on macOS Claude Desktop
- [ ] Works on Windows Claude Desktop
- [ ] Works on Linux Claude Desktop
- [ ] Compatible with latest Claude Desktop version
- [ ] Configuration persists across Claude Desktop restarts

## Reporting Results

### Test Report Template
```
# Claude Desktop Integration Test Report

**Date**: [Date]
**Tester**: [Name]
**Claude Desktop Version**: [Version]
**Operating System**: [OS and Version]

## Scenario Results
- [ ] Scenario 1: First-Time Setup - PASS/FAIL
- [ ] Scenario 2: Data Workflow - PASS/FAIL  
- [ ] Scenario 3: Error Handling - PASS/FAIL
- [ ] Scenario 4: Multi-Session - PASS/FAIL

## Performance Metrics
- Plugin Load: [X] seconds
- Tool Discovery: [X] seconds
- Simple Operations: [X] seconds
- Complex Operations: [X] seconds

## Issues Encountered
[List any issues, errors, or unexpected behavior]

## Recommendations
[Suggestions for improvements or additional testing]
```

### Next Steps After Testing
1. Document any bugs or improvements needed
2. Verify all success criteria are met
3. Prepare for production release
4. Create user documentation based on testing feedback

This comprehensive testing guide ensures the Claude Desktop integration meets all requirements and provides an excellent user experience for connecting CODAP to Claude Desktop via the MCP protocol. 