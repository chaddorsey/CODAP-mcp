/**
 * React Hook for Browser Worker Management
 * Provides state management and lifecycle control for browser worker functionality
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  BrowserWorkerService, 
  BrowserWorkerServiceConfig,
  createBrowserWorkerService 
} from "../services/BrowserWorkerService";
import { 
  ConnectionStatus, 
  ConnectionState,
  ConnectionType,
  BrowserWorkerError,
  ErrorCategory,
  ErrorSeverity,
  ToolRequest,
  ToolResponse
} from "../services/browserWorker";

/**
 * Browser worker hook configuration
 */
export interface UseBrowserWorkerConfig extends BrowserWorkerServiceConfig {
  /** Whether to start automatically when component mounts */
  autoStart?: boolean;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Callback when tool execution starts */
  onToolStarted?: (request: ToolRequest) => void;
  /** Callback when tool execution completes */
  onToolCompleted?: (request: ToolRequest, response: ToolResponse) => void;
  /** Callback when error occurs */
  onError?: (error: BrowserWorkerError) => void;
}

/**
 * Browser worker hook state
 */
export interface BrowserWorkerState {
  /** Whether the browser worker is running */
  isRunning: boolean;
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Whether the service is starting */
  isStarting: boolean;
  /** Whether the service is stopping */
  isStopping: boolean;
  /** Last error that occurred */
  lastError: BrowserWorkerError | null;
  /** Whether service is configured and ready */
  isConfigured: boolean;
}

/**
 * Browser worker hook actions
 */
export interface BrowserWorkerActions {
  /** Start the browser worker service */
  start: () => Promise<void>;
  /** Stop the browser worker service */
  stop: () => Promise<void>;
  /** Restart the browser worker service */
  restart: () => Promise<void>;
  /** Update configuration */
  updateConfig: (config: Partial<BrowserWorkerServiceConfig>) => void;
  /** Clear last error */
  clearError: () => void;
}

/**
 * Browser worker hook return value
 */
export interface UseBrowserWorkerReturn extends BrowserWorkerState, BrowserWorkerActions {
  /** Browser worker service instance */
  service: BrowserWorkerService | null;
}

/**
 * React hook for managing browser worker functionality
 */
export function useBrowserWorker(config: UseBrowserWorkerConfig): UseBrowserWorkerReturn {
  // Service instance - memoized to prevent recreation
  // Only recreate if the core connection parameters change
  const service = useMemo(() => {
    if (!config.relayBaseUrl || !config.sessionCode) {
      return null;
    }
    const newService = createBrowserWorkerService({
      relayBaseUrl: config.relayBaseUrl,
      sessionCode: config.sessionCode,
      debug: config.debug,
      autoStart: config.autoStart
    });
    
    // If autoStart is enabled, start immediately
    if (config.autoStart && newService) {
      console.log("Auto-starting browser worker immediately");
      newService.start().catch(console.error);
    }
    
    return newService;
  }, [config.relayBaseUrl, config.sessionCode, config.debug, config.autoStart]);

  // Component state
  const [state, setState] = useState<BrowserWorkerState>({
    isRunning: false,
    connectionStatus: service?.getConnectionStatus() || {
      state: ConnectionState.DISCONNECTED,
      type: ConnectionType.SSE,
      retryCount: 0
    },
    isStarting: false,
    isStopping: false,
    lastError: null,
    isConfigured: Boolean(service)
  });

  // Refs for callbacks to prevent stale closure issues
  const callbacksRef = useRef({
    onStatusChange: config.onStatusChange,
    onToolStarted: config.onToolStarted,
    onToolCompleted: config.onToolCompleted,
    onError: config.onError
  });

  // Update callback refs when they change
  useEffect(() => {
    callbacksRef.current = {
      onStatusChange: config.onStatusChange,
      onToolStarted: config.onToolStarted,
      onToolCompleted: config.onToolCompleted,
      onError: config.onError
    };
  }, [config.onStatusChange, config.onToolStarted, config.onToolCompleted, config.onError]);

  /**
   * Start the browser worker service
   */
  const start = useCallback(async () => {
    if (!service || state.isRunning || state.isStarting) {
      return;
    }

    setState(prev => ({ ...prev, isStarting: true, lastError: null }));

    try {
      await service.start();
      setState(prev => ({
        ...prev,
        isRunning: true,
        isStarting: false,
        connectionStatus: service.getConnectionStatus()
      }));
    } catch (error) {
      const browserError = service.createError(
        ErrorCategory.NETWORK,
        ErrorSeverity.ERROR,
        "Failed to start browser worker",
        { error }
      );
      
      setState(prev => ({
        ...prev,
        isStarting: false,
        lastError: browserError
      }));

      callbacksRef.current.onError?.(browserError);
    }
  }, [service, state.isRunning, state.isStarting]);

  /**
   * Stop the browser worker service
   */
  const stop = useCallback(async () => {
    if (!service || !state.isRunning || state.isStopping) {
      return;
    }

    setState(prev => ({ ...prev, isStopping: true }));

    try {
      await service.stop();
      setState(prev => ({
        ...prev,
        isRunning: false,
        isStopping: false,
        connectionStatus: service.getConnectionStatus()
      }));
    } catch (error) {
      const browserError = service.createError(
        ErrorCategory.EXECUTION,
        ErrorSeverity.WARNING,
        "Failed to stop browser worker cleanly",
        { error }
      );
      
      setState(prev => ({
        ...prev,
        isStopping: false,
        lastError: browserError
      }));

      callbacksRef.current.onError?.(browserError);
    }
  }, [service, state.isRunning, state.isStopping]);

  /**
   * Restart the browser worker service
   */
  const restart = useCallback(async () => {
    if (!service) return;
    
    await stop();
    await start();
  }, [service, stop, start]);

  /**
   * Update service configuration
   */
  const updateConfig = useCallback((newConfig: Partial<BrowserWorkerServiceConfig>) => {
    if (!service) return;
    
    service.updateConfig(newConfig);
  }, [service]);

  /**
   * Clear last error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, lastError: null }));
  }, []);

  // Auto-start when service is available and autoStart is enabled
  useEffect(() => {
    if (config.autoStart && service && !state.isRunning && !state.isStarting) {
      start();
    }
  }, [config.autoStart, service, state.isRunning, state.isStarting, start]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (service && state.isRunning) {
        service.stop().catch(console.error);
      }
    };
  }, [service, state.isRunning]);

  // Update connection status when service changes
  useEffect(() => {
    if (!service) return;

    const checkStatus = () => {
      const currentStatus = service.getConnectionStatus();
      setState(prev => {
        if (JSON.stringify(prev.connectionStatus) !== JSON.stringify(currentStatus)) {
          callbacksRef.current.onStatusChange?.(currentStatus);
          return { ...prev, connectionStatus: currentStatus };
        }
        return prev;
      });
    };

    // Check status periodically
    const interval = setInterval(checkStatus, 1000);
    
    return () => clearInterval(interval);
  }, [service]);

  return {
    // State
    isRunning: state.isRunning,
    connectionStatus: state.connectionStatus,
    isStarting: state.isStarting,
    isStopping: state.isStopping,
    lastError: state.lastError,
    isConfigured: state.isConfigured,
    
    // Actions
    start,
    stop,
    restart,
    updateConfig,
    clearError,
    
    // Service instance
    service
  };
} 
