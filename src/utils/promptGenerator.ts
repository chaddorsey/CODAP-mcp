import type { SessionData } from "../services/types";

/**
 * Configuration for prompt generation
 */
export interface PromptConfig {
  /** Base URL for the relay service */
  relayBaseUrl: string;
  /** Additional instructions to include */
  additionalInstructions?: string;
  /** Whether to include troubleshooting section */
  includeTroubleshooting?: boolean;
  /** Custom branding/service name */
  serviceName?: string;
}

/**
 * Default prompt configuration
 */
const DEFAULT_CONFIG: Required<PromptConfig> = {
  relayBaseUrl: "http://localhost:3000",
  additionalInstructions: "",
  includeTroubleshooting: true,
  serviceName: "CODAP Plugin Assistant"
};

/**
 * Generates a formatted setup prompt with session information
 * @param sessionData - Session data from the API
 * @param config - Configuration for prompt generation
 * @returns Formatted prompt text
 */
export function generateSetupPrompt(
  sessionData: SessionData,
  config: Partial<PromptConfig> = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { code, ttl, expiresAt } = sessionData;
  const { relayBaseUrl, additionalInstructions, includeTroubleshooting, serviceName } = finalConfig;

  // Calculate expiration time
  const expirationDate = new Date(expiresAt);
  const expirationTime = expirationDate.toLocaleTimeString();
  const expirationDateStr = expirationDate.toLocaleDateString();
  
  // Calculate minutes remaining
  const minutesRemaining = Math.ceil(ttl / 60);

  const prompt = `# ${serviceName} Setup Instructions

## Session Details
**Session Code:** ${code}
**Expires:** ${expirationTime} on ${expirationDateStr} (${minutesRemaining} minutes remaining)
**Relay URL:** ${relayBaseUrl}

## Setup Instructions

1. **Copy your session code:** ${code}

2. **Connect to your AI assistant** (ChatGPT, Claude, etc.) and use this prompt:

   \`\`\`
   I want to connect to a CODAP plugin session. Please use the following details:
   
   Session Code: ${code}
   Relay URL: ${relayBaseUrl}
   
   Please establish a connection to this session and help me work with CODAP data analysis.
   \`\`\`

3. **Verify the connection** - Your AI assistant should confirm it can connect to the session.

4. **Start working** - You can now ask your AI assistant to help with data analysis, visualization, and CODAP operations.

## What You Can Do

- **Data Analysis:** Ask for statistical analysis of your datasets
- **Visualization:** Request charts, graphs, and data visualizations  
- **Data Manipulation:** Get help organizing, filtering, and transforming data
- **CODAP Operations:** Assistance with CODAP-specific features and workflows
- **Educational Support:** Explanations of statistical concepts and methods

## Important Notes

- **Session expires in ${minutesRemaining} minutes** - You'll need to create a new session after that
- **Keep your session code private** - Don't share it publicly
- **One session at a time** - Each session code works with one AI conversation
- **Save your work** - Export important results before the session expires

${additionalInstructions ? `## Additional Instructions\n\n${additionalInstructions}\n` : ""}

${includeTroubleshooting ? `## Troubleshooting

**Connection Issues:**
- Verify the session code is entered correctly: ${code}
- Check that the relay URL is: ${relayBaseUrl}
- Make sure your session hasn't expired (${minutesRemaining} minutes remaining)

**AI Assistant Not Responding:**
- Try rephrasing your request
- Verify the AI assistant confirmed the connection
- Create a new session if the current one has expired

**Need Help?**
- Check the CODAP documentation for specific feature questions
- Verify your data is properly loaded in CODAP before asking for analysis
- Be specific about what you want to analyze or visualize

` : ""}

---
*Generated at ${new Date().toLocaleString()} • Session: ${code}*`;

  return prompt;
}

/**
 * Generates a simple session code copy text
 * @param sessionCode - The session code to format
 * @returns Formatted session code
 */
export function generateSessionCodeText(sessionCode: string): string {
  return sessionCode;
}

/**
 * Generates a minimal connection prompt for quick setup
 * @param sessionData - Session data from the API
 * @param relayBaseUrl - Base URL for the relay service
 * @returns Minimal prompt text
 */
export function generateMinimalPrompt(
  sessionData: SessionData,
  relayBaseUrl = "http://localhost:3000"
): string {
  const { code } = sessionData;
  
  return `Connect to CODAP session:
Session Code: ${code}
Relay URL: ${relayBaseUrl}

Please establish connection and help with CODAP data analysis.`;
}

/**
 * Generates a technical prompt for developers
 * @param sessionData - Session data from the API
 * @param config - Configuration for prompt generation
 * @returns Technical prompt text
 */
export function generateTechnicalPrompt(
  sessionData: SessionData,
  config: Partial<PromptConfig> = {}
): string {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { code, ttl, expiresAt } = sessionData;
  const { relayBaseUrl } = finalConfig;

  return `# CODAP Plugin Session Connection

## Connection Parameters
\`\`\`json
{
  "sessionCode": "${code}",
  "relayUrl": "${relayBaseUrl}",
  "ttl": ${ttl},
  "expiresAt": "${expiresAt}"
}
\`\`\`

## API Endpoints
- **Session Status:** GET ${relayBaseUrl}/api/sessions/${code}
- **Data Operations:** POST ${relayBaseUrl}/api/sessions/${code}/data
- **Commands:** POST ${relayBaseUrl}/api/sessions/${code}/commands

## Usage
Connect using the session code "${code}" and relay URL "${relayBaseUrl}".
Session expires in ${Math.ceil(ttl / 60)} minutes.

## Integration
Use these parameters to establish a connection with the CODAP plugin relay service.`;
}

/**
 * Validates session data for prompt generation
 * @param sessionData - Session data to validate
 * @returns Whether the session data is valid
 */
export function isValidSessionData(sessionData: any): sessionData is SessionData {
  return (
    sessionData !== null &&
    sessionData !== undefined &&
    typeof sessionData === "object" &&
    typeof sessionData.code === "string" &&
    sessionData.code.length === 8 &&
    typeof sessionData.ttl === "number" &&
    sessionData.ttl > 0 &&
    typeof sessionData.expiresAt === "string"
  );
} 
