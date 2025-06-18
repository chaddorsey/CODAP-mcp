/**
 * Tool Execution Status Component
 * Displays real-time tool execution information, queue status, and execution history
 */

import React, { useMemo } from "react";
import { ToolRequest, ToolResponse } from "../services/browserWorker";

/**
 * Tool execution state for display
 */
export interface ToolExecutionState {
  request: ToolRequest;
  status: "queued" | "running" | "completed" | "failed";
  response?: ToolResponse;
  startTime?: number;
  endTime?: number;
  queuePosition?: number;
}

/**
 * Props for ToolExecutionStatus component
 */
export interface ToolExecutionStatusProps {
  /** Currently executing and queued tools */
  executions: ToolExecutionState[];
  /** Whether tool execution is enabled */
  isEnabled: boolean;
  /** Current queue size */
  queueSize: number;
  /** Maximum number of recent executions to display */
  maxHistory?: number;
  /** Whether to show detailed execution information */
  showDetails?: boolean;
  /** CSS class name for styling */
  className?: string;
}

/**
 * Get execution icon based on status
 */
function getExecutionIcon(status: ToolExecutionState["status"]): string {
  switch (status) {
    case "queued":
      return "⏱️";
    case "running":
      return "⚙️";
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    default:
      return "❓";
  }
}

/**
 * Get execution status display text
 */
function getStatusText(execution: ToolExecutionState): string {
  switch (execution.status) {
    case "queued":
      return execution.queuePosition 
        ? `Queued (#${execution.queuePosition})`
        : "Queued";
    case "running":
      return "Running...";
    case "completed":
      return execution.response?.duration 
        ? `Completed (${execution.response.duration}ms)`
        : "Completed";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

/**
 * Format tool name for display
 */
function formatToolName(toolName: string): string {
  return toolName
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Calculate execution duration
 */
function getExecutionDuration(execution: ToolExecutionState): number | null {
  if (execution.response?.duration) {
    return execution.response.duration;
  }
  
  if (execution.startTime) {
    const endTime = execution.endTime || Date.now();
    return endTime - execution.startTime;
  }
  
  return null;
}

/**
 * Tool Execution Status Component
 */
export const ToolExecutionStatus: React.FC<ToolExecutionStatusProps> = ({
  executions,
  isEnabled,
  queueSize,
  maxHistory = 10,
  showDetails = false,
  className = ""
}) => {
  // Separate current and historical executions
  const { currentExecutions, historicalExecutions } = useMemo(() => {
    const current = executions.filter(exec => 
      exec.status === "queued" || exec.status === "running"
    );
    
    const historical = executions
      .filter(exec => exec.status === "completed" || exec.status === "failed")
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, maxHistory);
    
    return { currentExecutions: current, historicalExecutions: historical };
  }, [executions, maxHistory]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const completed = historicalExecutions.filter(exec => exec.status === "completed");
    const failed = historicalExecutions.filter(exec => exec.status === "failed");
    const total = completed.length + failed.length;
    
    const successRate = total > 0 ? (completed.length / total) * 100 : 0;
    
    const avgDuration = completed.length > 0 
      ? completed.reduce((sum, exec) => {
          const duration = getExecutionDuration(exec);
          return sum + (duration || 0);
        }, 0) / completed.length
      : 0;
    
    return {
      total,
      completed: completed.length,
      failed: failed.length,
      successRate,
      avgDuration
    };
  }, [historicalExecutions]);

  if (!isEnabled) {
    return (
      <div className={`tool-execution-status tool-execution-disabled ${className}`}>
        <div className="execution-header">
          <div className="execution-title">Tool Execution</div>
        </div>
        <div className="disabled-message">
          Tool execution is disabled. Enable browser worker to see execution status.
        </div>
      </div>
    );
  }

  return (
    <div className={`tool-execution-status ${className}`} data-testid="tool-execution-status">
      {/* Header with queue info */}
      <div className="execution-header">
        <div className="execution-title">Tool Execution</div>
        {queueSize > 0 && (
          <div className="queue-count" aria-label={`${queueSize} tools in queue`}>
            {queueSize}
          </div>
        )}
      </div>

      {/* Current executions */}
      {currentExecutions.length > 0 && (
        <div className="current-executions">
          <h5 className="section-title">Current Activity</h5>
          {currentExecutions.map((execution) => (
            <div
              key={execution.request.id}
              className={`execution-item execution-${execution.status}`}
              role="status"
              aria-live="polite"
            >
              <span 
                className="execution-icon" 
                role="img" 
                aria-label={execution.status}
              >
                {getExecutionIcon(execution.status)}
              </span>
              
              <div className="execution-details">
                <div className="tool-name">
                  {formatToolName(execution.request.tool)}
                </div>
                <div className="execution-time">
                  {getStatusText(execution)}
                </div>
              </div>

              <div className={`execution-status status-${execution.status}`}>
                {execution.status === "running" && (
                  <div className="spinner" aria-hidden="true">
                    <div className="bounce1"></div>
                    <div className="bounce2"></div>
                    <div className="bounce3"></div>
                  </div>
                )}
                {execution.status !== "running" && getStatusText(execution)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistics */}
      {statistics.total > 0 && (
        <div className="execution-statistics">
          <h5 className="section-title">Statistics</h5>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{statistics.total}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{statistics.successRate.toFixed(1)}%</div>
              <div className="stat-label">Success Rate</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{Math.round(statistics.avgDuration)}ms</div>
              <div className="stat-label">Avg Duration</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent executions history */}
      {showDetails && historicalExecutions.length > 0 && (
        <div className="execution-history">
          <h5 className="section-title">Recent Executions</h5>
          {historicalExecutions.map((execution) => (
            <div
              key={execution.request.id}
              className={`execution-item execution-${execution.status}`}
            >
              <span 
                className="execution-icon" 
                role="img" 
                aria-label={execution.status}
              >
                {getExecutionIcon(execution.status)}
              </span>
              
              <div className="execution-details">
                <div className="tool-name">
                  {formatToolName(execution.request.tool)}
                </div>
                <div className="execution-time">
                  {execution.endTime && new Date(execution.endTime).toLocaleTimeString()}
                </div>
              </div>

              <div className={`execution-status status-${execution.status}`}>
                {getStatusText(execution)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {currentExecutions.length === 0 && historicalExecutions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">📋</div>
          <div className="empty-message">No tool executions yet</div>
          <div className="empty-description">
            Tool execution history will appear here when LLM assistants start using tools.
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolExecutionStatus; 
 