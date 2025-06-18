/**
 * Connection Metrics Component
 * Displays connection performance metrics, uptime statistics, and quality indicators
 */

import React, { useMemo } from "react";
import { ConnectionType } from "../services/browserWorker";

/**
 * Connection performance metrics
 */
export interface ConnectionMetrics {
  /** Connection uptime percentage */
  uptime: number;
  /** Average response time in milliseconds */
  avgResponseTime: number;
  /** Current response time in milliseconds */
  currentResponseTime?: number;
  /** Request success rate percentage */
  successRate: number;
  /** Total number of requests */
  totalRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Connection type performance comparison */
  typeMetrics?: {
    sse?: { uptime: number; avgResponseTime: number; successRate: number };
    polling?: { uptime: number; avgResponseTime: number; successRate: number };
  };
  /** Last update timestamp */
  lastUpdate: number;
}

/**
 * Props for ConnectionMetrics component
 */
export interface ConnectionMetricsProps {
  /** Connection performance metrics */
  metrics: ConnectionMetrics;
  /** Current connection type */
  currentConnectionType: ConnectionType;
  /** Whether to show detailed metrics */
  showDetails?: boolean;
  /** Whether metrics collection is enabled */
  isEnabled: boolean;
  /** CSS class name for styling */
  className?: string;
}

/**
 * Get performance grade based on metrics
 */
function getPerformanceGrade(metrics: ConnectionMetrics): {
  grade: "excellent" | "good" | "fair" | "poor";
  color: string;
  icon: string;
} {
  const score = (
    (metrics.uptime * 0.4) +
    (Math.max(0, 100 - (metrics.avgResponseTime / 10)) * 0.3) +
    (metrics.successRate * 0.3)
  );

  if (score >= 90) {
    return { grade: "excellent", color: "#16a34a", icon: "🟢" };
  } else if (score >= 75) {
    return { grade: "good", color: "#65a30d", icon: "🟡" };
  } else if (score >= 60) {
    return { grade: "fair", color: "#ca8a04", icon: "🟠" };
  } else {
    return { grade: "poor", color: "#dc2626", icon: "🔴" };
  }
}

/**
 * Format response time for display
 */
function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else {
    return `${(ms / 1000).toFixed(1)}s`;
  }
}

/**
 * Format uptime percentage
 */
function formatUptime(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

/**
 * Get connection type display name
 */
function getConnectionTypeName(type: ConnectionType): string {
  switch (type) {
    case ConnectionType.SSE:
      return "Server-Sent Events";
    case ConnectionType.POLLING:
      return "HTTP Polling";
    default:
      return "Unknown";
  }
}

/**
 * Connection Metrics Component
 */
export const ConnectionMetrics: React.FC<ConnectionMetricsProps> = ({
  metrics,
  currentConnectionType,
  showDetails = false,
  isEnabled,
  className = ""
}) => {
  const performance = useMemo(() => getPerformanceGrade(metrics), [metrics]);

  const timeAgo = useMemo(() => {
    const diff = Date.now() - metrics.lastUpdate;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ago`;
    } else {
      return `${Math.floor(seconds / 3600)}h ago`;
    }
  }, [metrics.lastUpdate]);

  if (!isEnabled) {
    return (
      <div className={`connection-metrics connection-metrics-disabled ${className}`}>
        <div className="metrics-header">
          <div className="metrics-title">Connection Metrics</div>
        </div>
        <div className="disabled-message">
          Metrics collection is disabled. Enable browser worker to see performance data.
        </div>
      </div>
    );
  }

  return (
    <div className={`connection-metrics ${className}`}>
      {/* Header */}
      <div className="metrics-header">
        <div className="metrics-title">Connection Metrics</div>
        <div className="metrics-update">
          Updated {timeAgo}
        </div>
      </div>

      {/* Performance Grade */}
      <div className="performance-grade">
        <div className="grade-indicator">
          <span 
            className="grade-icon" 
            role="img" 
            aria-label={`Performance grade: ${performance.grade}`}
          >
            {performance.icon}
          </span>
          <div className="grade-info">
            <div className="grade-label" style={{ color: performance.color }}>
              {performance.grade.charAt(0).toUpperCase() + performance.grade.slice(1)}
            </div>
            <div className="grade-description">
              Overall connection performance
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="key-metrics">
        <div className="metric-item">
          <div className="metric-value">{formatUptime(metrics.uptime)}</div>
          <div className="metric-label">Uptime</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{formatResponseTime(metrics.avgResponseTime)}</div>
          <div className="metric-label">Avg Response</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{metrics.successRate.toFixed(1)}%</div>
          <div className="metric-label">Success Rate</div>
        </div>
      </div>

      {/* Current Connection Type */}
      <div className="current-connection">
        <div className="connection-type-label">Current Connection:</div>
        <div className="connection-type-value">
          {getConnectionTypeName(currentConnectionType)}
        </div>
        {metrics.currentResponseTime && (
          <div className="current-response-time">
            ({formatResponseTime(metrics.currentResponseTime)})
          </div>
        )}
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="detailed-metrics">
          <div className="detail-section">
            <h5 className="detail-title">Request Statistics</h5>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-value">{metrics.totalRequests}</div>
                <div className="detail-label">Total Requests</div>
              </div>
              <div className="detail-item">
                <div className="detail-value">{metrics.failedRequests}</div>
                <div className="detail-label">Failed Requests</div>
              </div>
              <div className="detail-item">
                <div className="detail-value">
                  {metrics.totalRequests - metrics.failedRequests}
                </div>
                <div className="detail-label">Successful Requests</div>
              </div>
            </div>
          </div>

          {/* Connection Type Comparison */}
          {metrics.typeMetrics && (
            <div className="detail-section">
              <h5 className="detail-title">Connection Type Performance</h5>
              
              {metrics.typeMetrics.sse && (
                <div className="type-metrics">
                  <div className="type-header">Server-Sent Events (SSE)</div>
                  <div className="type-stats">
                    <div className="type-stat">
                      <span className="stat-label">Uptime:</span>
                      <span className="stat-value">
                        {formatUptime(metrics.typeMetrics.sse.uptime)}
                      </span>
                    </div>
                    <div className="type-stat">
                      <span className="stat-label">Avg Response:</span>
                      <span className="stat-value">
                        {formatResponseTime(metrics.typeMetrics.sse.avgResponseTime)}
                      </span>
                    </div>
                    <div className="type-stat">
                      <span className="stat-label">Success Rate:</span>
                      <span className="stat-value">
                        {metrics.typeMetrics.sse.successRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {metrics.typeMetrics.polling && (
                <div className="type-metrics">
                  <div className="type-header">HTTP Polling</div>
                  <div className="type-stats">
                    <div className="type-stat">
                      <span className="stat-label">Uptime:</span>
                      <span className="stat-value">
                        {formatUptime(metrics.typeMetrics.polling.uptime)}
                      </span>
                    </div>
                    <div className="type-stat">
                      <span className="stat-label">Avg Response:</span>
                      <span className="stat-value">
                        {formatResponseTime(metrics.typeMetrics.polling.avgResponseTime)}
                      </span>
                    </div>
                    <div className="type-stat">
                      <span className="stat-label">Success Rate:</span>
                      <span className="stat-value">
                        {metrics.typeMetrics.polling.successRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Performance Recommendations */}
          <div className="detail-section">
            <h5 className="detail-title">Recommendations</h5>
            <div className="recommendations">
              {metrics.avgResponseTime > 2000 && (
                <div className="recommendation warning">
                  ⚠️ High response times detected. Consider checking network connectivity.
                </div>
              )}
              {metrics.successRate < 90 && (
                <div className="recommendation warning">
                  ⚠️ Low success rate. There may be connectivity issues.
                </div>
              )}
              {metrics.uptime < 95 && (
                <div className="recommendation warning">
                  ⚠️ Frequent disconnections detected. Check network stability.
                </div>
              )}
              {performance.grade === "excellent" && (
                <div className="recommendation success">
                  ✅ Connection performance is excellent. No issues detected.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state for new connections */}
      {metrics.totalRequests === 0 && (
        <div className="empty-metrics">
          <div className="empty-icon" aria-hidden="true">📊</div>
          <div className="empty-message">Collecting metrics...</div>
          <div className="empty-description">
            Performance data will appear here after some connection activity.
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionMetrics; 
