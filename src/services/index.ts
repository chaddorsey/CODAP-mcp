// Export SessionService and related types for external use
export { SessionService, createSessionService } from "./SessionService";
export type {
  SessionData,
  SessionServiceConfig,
  SessionServiceInterface,
  ApiErrorResponse,
  SessionErrorCode
} from "./types";
export { SessionServiceError, SESSION_ERROR_CODES } from "./types"; 

// Export Browser Worker service
export * from "./browserWorker"; 
