/**
 * Browser Worker Service
 * SSE connection management and tool execution for browser-based interactions
 */

export { ConnectionManager } from "./ConnectionManager";
export { PollingManager } from "./PollingManager";
export * from "./types";
export * from "./utils/exponentialBackoff";
export * from "./utils/requestDeduplication"; 
