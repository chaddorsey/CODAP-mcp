/**
 * Error Handler for Browser Worker
 * Comprehensive error classification and handling system
 */

import { 
  BrowserWorkerError, 
  BrowserWorkerErrorHandler, 
  ErrorHandlingResult, 
  ErrorCategory, 
  ErrorSeverity 
} from "./types";
import { exponentialBackoff } from "./utils/retry";

/**
 * Configuration for the error handling system
 */
export interface ErrorHandlerConfig {
  /** Maximum number of retry attempts for retryable errors */
  maxRetries: number;
  /** Base delay for retry attempts (ms) */
  retryBaseDelay: number;
  /** Maximum delay for retry attempts (ms) */
  retryMaxDelay: number;
  /** Whether to enable debug logging */
  debug: boolean;
  /** Custom error handlers */
  customHandlers: BrowserWorkerErrorHandler[];
  /** Error correlation tracking */
  enableCorrelation: boolean;
}

/**
 * Default error handler configuration
 */
export const DEFAULT_ERROR_HANDLER_CONFIG: ErrorHandlerConfig = {
  maxRetries: 3,
  retryBaseDelay: 1000,
  retryMaxDelay: 30000,
  debug: false,
  customHandlers: [],
  enableCorrelation: true
};

/**
 * Statistics for error handling
 */
export interface ErrorHandlerStatistics {
  /** Total errors processed */
  totalErrors: number;
  /** Errors by category */
  errorsByCategory: Record<ErrorCategory, number>;
  /** Errors by severity */
  errorsBySeverity: Record<ErrorSeverity, number>;
  /** Errors by component */
  errorsByComponent: Record<string, number>;
  /** Successful recoveries */
  successfulRecoveries: number;
  /** Failed recoveries */
  failedRecoveries: number;
  /** Average handling time (ms) */
  averageHandlingTime: number;
}

/**
 * Network error handler - handles connection and communication errors
 */
export class NetworkErrorHandler implements BrowserWorkerErrorHandler {
  canHandle(error: BrowserWorkerError): boolean {
    return error.category === ErrorCategory.NETWORK || 
           error.category === ErrorCategory.TIMEOUT;
  }

  getPriority(): number {
    return 10; // High priority for network errors
  }

  async handleError(error: BrowserWorkerError): Promise<ErrorHandlingResult> {
    console.warn(`[NetworkErrorHandler] Handling ${error.category} error:`, error.message);

    // For network errors, retry is usually appropriate
    if (error.retryable) {
      return {
        handled: true,
        propagate: false,
        action: "retry",
        retryDelay: exponentialBackoff(0, 1000, 10000)
      };
    }

    // For non-retryable network errors, escalate
    return {
      handled: true,
      propagate: true,
      action: "escalate",
      data: { reason: "non_retryable_network_error" }
    };
  }
}

/**
 * Authentication error handler - handles auth-related errors
 */
export class AuthenticationErrorHandler implements BrowserWorkerErrorHandler {
  canHandle(error: BrowserWorkerError): boolean {
    return error.category === ErrorCategory.AUTHENTICATION;
  }

  getPriority(): number {
    return 20; // Very high priority for auth errors
  }

  async handleError(error: BrowserWorkerError): Promise<ErrorHandlingResult> {
    console.error(`[AuthenticationErrorHandler] Authentication error:`, error.message);

    // Authentication errors are typically not retryable
    return {
      handled: true,
      propagate: true,
      action: "escalate",
      data: { 
        reason: "authentication_failure",
        requiresUserAction: true
      }
    };
  }
}

/**
 * Validation error handler - handles input validation errors
 */
export class ValidationErrorHandler implements BrowserWorkerErrorHandler {
  canHandle(error: BrowserWorkerError): boolean {
    return error.category === ErrorCategory.VALIDATION;
  }

  getPriority(): number {
    return 15; // High priority for validation errors
  }

  async handleError(error: BrowserWorkerError): Promise<ErrorHandlingResult> {
    console.warn(`[ValidationErrorHandler] Validation error:`, error.message);

    // Validation errors are usually not retryable
    return {
      handled: true,
      propagate: true,
      action: "ignore", // Log but don't crash the system
      data: { 
        reason: "invalid_input",
        details: error.details
      }
    };
  }
}

/**
 * Execution error handler - handles runtime execution errors
 */
export class ExecutionErrorHandler implements BrowserWorkerErrorHandler {
  canHandle(error: BrowserWorkerError): boolean {
    return error.category === ErrorCategory.EXECUTION;
  }

  getPriority(): number {
    return 12; // Medium-high priority for execution errors
  }

  async handleError(error: BrowserWorkerError): Promise<ErrorHandlingResult> {
    console.error(`[ExecutionErrorHandler] Execution error:`, error.message);

    // Some execution errors might be retryable (e.g., temporary CODAP issues)
    if (error.retryable && error.severity !== ErrorSeverity.CRITICAL) {
      return {
        handled: true,
        propagate: false,
        action: "retry",
        retryDelay: exponentialBackoff(0, 2000, 15000)
      };
    }

    // Critical execution errors should escalate
    return {
      handled: true,
      propagate: true,
      action: "escalate",
      data: { 
        reason: "execution_failure",
        component: error.component
      }
    };
  }
}

/**
 * Configuration error handler - handles configuration-related errors
 */
export class ConfigurationErrorHandler implements BrowserWorkerErrorHandler {
  canHandle(error: BrowserWorkerError): boolean {
    return error.category === ErrorCategory.CONFIGURATION;
  }

  getPriority(): number {
    return 25; // Highest priority for config errors
  }

  async handleError(error: BrowserWorkerError): Promise<ErrorHandlingResult> {
    console.error(`[ConfigurationErrorHandler] Configuration error:`, error.message);

    // Configuration errors are typically fatal and require immediate attention
    return {
      handled: true,
      propagate: true,
      action: "shutdown",
      data: { 
        reason: "invalid_configuration",
        requiresReconfiguration: true
      }
    };
  }
}

/**
 * Fallback error handler - handles any unhandled errors
 */
export class FallbackErrorHandler implements BrowserWorkerErrorHandler {
  canHandle(error: BrowserWorkerError): boolean {
    return true; // Always can handle as fallback
  }

  getPriority(): number {
    return 1; // Lowest priority - only used as fallback
  }

  async handleError(error: BrowserWorkerError): Promise<ErrorHandlingResult> {
    console.error(`[FallbackErrorHandler] Unhandled error:`, error);

    // For unknown errors, escalate for investigation
    return {
      handled: true,
      propagate: true,
      action: "escalate",
      data: { 
        reason: "unknown_error_type",
        originalError: error
      }
    };
  }
}

/**
 * Main error handling system
 * Coordinates error handling across all browser worker components
 */
export class BrowserWorkerErrorSystem {
  private config: ErrorHandlerConfig;
  private handlers: BrowserWorkerErrorHandler[];
  private statistics: ErrorHandlerStatistics;
  private correlationMap = new Map<string, string[]>();
  private handlingTimes: number[] = [];

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_ERROR_HANDLER_CONFIG, ...config };
    
    // Initialize built-in handlers
    this.handlers = [
      new ConfigurationErrorHandler(),
      new AuthenticationErrorHandler(),
      new ValidationErrorHandler(),
      new ExecutionErrorHandler(),
      new NetworkErrorHandler(),
      new FallbackErrorHandler(),
      ...this.config.customHandlers
    ];

    // Sort handlers by priority (highest first)
    this.handlers.sort((a, b) => b.getPriority() - a.getPriority());

    // Initialize statistics
    this.statistics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByComponent: {},
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageHandlingTime: 0
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      this.statistics.errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      this.statistics.errorsBySeverity[severity] = 0;
    });

    if (this.config.debug) {
      console.log("[BrowserWorkerErrorSystem] Initialized with handlers:", 
        this.handlers.map(h => h.constructor.name));
    }
  }

  /**
   * Handle an error using the appropriate handler
   */
  async handleError(error: BrowserWorkerError): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    this.updateStatistics(error);

    if (this.config.debug) {
      console.log(`[BrowserWorkerErrorSystem] Handling error:`, {
        id: error.id,
        category: error.category,
        severity: error.severity,
        component: error.component,
        message: error.message
      });
    }

    // Track error correlation
    if (this.config.enableCorrelation && error.correlationId) {
      this.trackErrorCorrelation(error);
    }

    // Find the first handler that can handle this error
    for (const handler of this.handlers) {
      if (handler.canHandle(error)) {
        try {
          const result = await handler.handleError(error);
          
          const duration = Date.now() - startTime;
          this.updateHandlingTime(duration);

          if (result.handled) {
            if (result.action === "retry" || result.action === "failover") {
              this.statistics.successfulRecoveries++;
            }
            
            if (this.config.debug) {
              console.log(`[BrowserWorkerErrorSystem] Error handled by ${handler.constructor.name}:`, result);
            }
            
            return result;
          }
        } catch (handlerError) {
          console.error(`[BrowserWorkerErrorSystem] Handler ${handler.constructor.name} failed:`, handlerError);
          this.statistics.failedRecoveries++;
          // Continue to next handler
        }
      }
    }

    // If no handler could handle the error, use fallback
    const fallbackDuration = Date.now() - startTime;
    this.updateHandlingTime(fallbackDuration);
    this.statistics.failedRecoveries++;

    return {
      handled: false,
      propagate: true,
      action: "escalate",
      data: { reason: "no_handler_available" }
    };
  }

  /**
   * Create a standardized error object
   */
  createError(
    category: ErrorCategory,
    severity: ErrorSeverity,
    message: string,
    component: string,
    details?: Record<string, unknown>,
    originalError?: Error,
    correlationId?: string
  ): BrowserWorkerError {
    return {
      id: this.generateErrorId(),
      category,
      severity,
      message,
      component,
      details,
      originalError,
      timestamp: Date.now(),
      correlationId,
      retryable: this.isRetryableError(category, severity),
      recoveryActions: this.suggestRecoveryActions(category, severity)
    };
  }

  /**
   * Get current error handling statistics
   */
  getStatistics(): ErrorHandlerStatistics {
    return { ...this.statistics };
  }

  /**
   * Reset error handling statistics
   */
  resetStatistics(): void {
    this.statistics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      errorsByComponent: {},
      successfulRecoveries: 0,
      failedRecoveries: 0,
      averageHandlingTime: 0
    };

    Object.values(ErrorCategory).forEach(category => {
      this.statistics.errorsByCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      this.statistics.errorsBySeverity[severity] = 0;
    });

    this.handlingTimes = [];
  }

  /**
   * Add a custom error handler
   */
  addHandler(handler: BrowserWorkerErrorHandler): void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Remove a custom error handler
   */
  removeHandler(handler: BrowserWorkerErrorHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Determine if an error is retryable based on category and severity
   */
  private isRetryableError(category: ErrorCategory, severity: ErrorSeverity): boolean {
    if (severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    if (category === ErrorCategory.CONFIGURATION || 
        category === ErrorCategory.AUTHENTICATION) {
      return false;
    }

    return category === ErrorCategory.NETWORK || 
           category === ErrorCategory.TIMEOUT ||
           category === ErrorCategory.EXECUTION;
  }

  /**
   * Suggest recovery actions based on error type
   */
  private suggestRecoveryActions(category: ErrorCategory, severity: ErrorSeverity): string[] {
    const actions: string[] = [];

    switch (category) {
      case ErrorCategory.NETWORK:
        actions.push("Check network connectivity", "Retry connection");
        break;
      case ErrorCategory.AUTHENTICATION:
        actions.push("Verify credentials", "Re-authenticate");
        break;
      case ErrorCategory.CONFIGURATION:
        actions.push("Verify configuration", "Restart component");
        break;
      case ErrorCategory.EXECUTION:
        actions.push("Retry operation", "Check CODAP status");
        break;
      default:
        actions.push("Investigate error", "Check logs");
    }

    return actions;
  }

  /**
   * Update error statistics
   */
  private updateStatistics(error: BrowserWorkerError): void {
    this.statistics.totalErrors++;
    this.statistics.errorsByCategory[error.category]++;
    this.statistics.errorsBySeverity[error.severity]++;
    
    const component = error.component;
    this.statistics.errorsByComponent[component] = (this.statistics.errorsByComponent[component] || 0) + 1;
  }

  /**
   * Track error correlation for related errors
   */
  private trackErrorCorrelation(error: BrowserWorkerError): void {
    if (!error.correlationId) return;

    const existingErrors = this.correlationMap.get(error.correlationId) || [];
    existingErrors.push(error.id);
    this.correlationMap.set(error.correlationId, existingErrors);

    // Limit correlation tracking to prevent memory leaks
    if (this.correlationMap.size > 1000) {
      const oldestKey = this.correlationMap.keys().next().value;
      if (oldestKey !== undefined) {
        this.correlationMap.delete(oldestKey);
      }
    }
  }

  /**
   * Update handling time statistics
   */
  private updateHandlingTime(duration: number): void {
    this.handlingTimes.push(duration);
    
    // Keep only last 100 times for rolling average
    if (this.handlingTimes.length > 100) {
      this.handlingTimes.shift();
    }

    // Calculate average
    const sum = this.handlingTimes.reduce((acc, time) => acc + time, 0);
    this.statistics.averageHandlingTime = Math.round(sum / this.handlingTimes.length);
  }
} 
