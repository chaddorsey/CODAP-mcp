/**
 * Connection Status Component
 * Displays browser worker connection status with visual indicators and controls
 */

import React, { useCallback } from "react";
import { ConnectionState, ConnectionType, ConnectionStatus as BrowserConnectionStatus } from "../services/browserWorker";
import { BrowserWorkerActions } from "../hooks/useBrowserWorker";

/**
 * Props for ConnectionStatus component
 */
export interface ConnectionStatusProps {
  /** Current connection status */
  connectionStatus: BrowserConnectionStatus;
  /** Whether the browser worker is running */
  isRunning: boolean;
  /** Whether the service is starting */
  isStarting: boolean;
  /** Whether the service is stopping */
  isStopping: boolean;
  /** Browser worker actions */
  actions: Pick<BrowserWorkerActions, "start" | "stop" | "restart">;
  /** Whether to show detailed controls */
  showControls?: boolean;
  /** CSS class name for styling */
  className?: string;
}

/**
 * Get status display information based on connection state
 */
function getStatusDisplay(status: BrowserConnectionStatus, isStarting: boolean, isStopping: boolean) {
  if (isStarting) {
    return {
      color: "yellow",
      text: "Starting...",
      icon: "⏳",
      description: "Browser worker is starting up"
    };
  }

  if (isStopping) {
    return {
      color: "yellow", 
      text: "Stopping...",
      icon: "⏸️",
      description: "Browser worker is shutting down"
    };
  }

  switch (status.state) {
    case ConnectionState.CONNECTED:
      return {
        color: "green",
        text: `Connected (${status.type.toUpperCase()})`,
        icon: "✅",
        description: `Connected via ${status.type === ConnectionType.SSE ? "Server-Sent Events" : "Polling"}`
      };
    
    case ConnectionState.CONNECTING:
    case ConnectionState.RECONNECTING:
      return {
        color: "yellow",
        text: status.state === ConnectionState.CONNECTING ? "Connecting..." : "Reconnecting...",
        icon: "🔄",
        description: `Attempting to establish ${status.type} connection`
      };
    
    case ConnectionState.ERROR:
      return {
        color: "red",
        text: "Connection Error",
        icon: "❌",
        description: status.error?.message || "Connection failed"
      };
    
    case ConnectionState.DISCONNECTED:
    default:
      return {
        color: "gray",
        text: "Disconnected",
        icon: "⚪",
        description: "Browser worker is not connected"
      };
  }
}

/**
 * Connection Status Component
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connectionStatus,
  isRunning,
  isStarting,
  isStopping,
  actions,
  showControls = true,
  className = ""
}) => {
  const statusDisplay = getStatusDisplay(connectionStatus, isStarting, isStopping);

  const handleStart = useCallback(async () => {
    try {
      await actions.start();
    } catch (error) {
      console.error("Failed to start browser worker:", error);
    }
  }, [actions]);

  const handleStop = useCallback(async () => {
    try {
      await actions.stop();
    } catch (error) {
      console.error("Failed to stop browser worker:", error);
    }
  }, [actions]);

  const handleRestart = useCallback(async () => {
    try {
      await actions.restart();
    } catch (error) {
      console.error("Failed to restart browser worker:", error);
    }
  }, [actions]);

  const isLoading = isStarting || isStopping;
  const canStart = !isRunning && !isLoading;
  const canStop = isRunning && !isLoading;
  const canRestart = isRunning && !isLoading;

  return (
    <div className={`connection-status ${className}`} data-testid="connection-status">
      {/* Status Indicator */}
      <div className={`status-indicator status-${statusDisplay.color}`} data-testid="browser-worker-status">
        <span className="status-icon" role="img" aria-label={statusDisplay.text}>
          {statusDisplay.icon}
        </span>
        <div className="status-text">
          <div className="status-label">{statusDisplay.text}</div>
          <div className="status-description">{statusDisplay.description}</div>
        </div>
      </div>

      {/* Connection Details */}
      {connectionStatus.state === ConnectionState.CONNECTED && connectionStatus.lastConnected && (
        <div className="connection-details">
          <small>
            Connected: {new Date(connectionStatus.lastConnected).toLocaleTimeString()}
          </small>
        </div>
      )}

      {/* Retry Information */}
      {connectionStatus.retryCount > 0 && (
        <div className="retry-info">
          <small>Retry attempts: {connectionStatus.retryCount}</small>
        </div>
      )}

      {/* Error Details */}
      {connectionStatus.error && (
        <div className="error-details">
          <div className="error-message">{connectionStatus.error.message}</div>
          {connectionStatus.error.statusCode && (
            <small>Status Code: {connectionStatus.error.statusCode}</small>
          )}
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div className="connection-controls">
          {canStart && (
            <button
              type="button"
              onClick={handleStart}
              className="btn btn-primary btn-sm"
              disabled={isLoading}
            >
              Start
            </button>
          )}
          
          {canStop && (
            <button
              type="button"
              onClick={handleStop}
              className="btn btn-secondary btn-sm"
              disabled={isLoading}
            >
              Stop
            </button>
          )}
          
          {canRestart && (
            <button
              type="button"
              onClick={handleRestart}
              className="btn btn-outline btn-sm"
              data-testid="restart-browser-worker"
              disabled={isLoading}
            >
              Restart
            </button>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="spinner" role="status" aria-label="Loading">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus; 
