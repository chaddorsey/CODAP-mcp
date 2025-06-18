/**
 * Browser Worker Service
 * SSE connection management and tool execution for browser-based interactions
 */

export { ConnectionManager } from "./ConnectionManager";
export { PollingManager } from "./PollingManager";
export { ToolRequestParser } from "./ToolRequestParser";
export { ToolExecutor } from "./ToolExecutor";
export { ExecutionQueue } from "./ExecutionQueue";
export { ResponseHandler } from "./ResponseHandler";

// Error handling and recovery exports
export { BrowserWorkerErrorSystem, NetworkErrorHandler, AuthenticationErrorHandler, ValidationErrorHandler, ExecutionErrorHandler, ConfigurationErrorHandler, FallbackErrorHandler } from "./ErrorHandler";
export { CircuitBreaker } from "./CircuitBreaker";

// Utility exports
export { RateLimiter } from "./utils/rateLimiter";
export { BatchProcessor } from "./utils/batchProcessor";
export * from "./utils/retry";

export * from "./types";
export * from "./utils/exponentialBackoff";
export * from "./utils/requestDeduplication";
export * from "./utils/validation";
export * from "./schemas/toolSchemas"; 
 
