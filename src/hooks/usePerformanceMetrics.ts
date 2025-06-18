/**
 * React Hook for Connection Performance Metrics
 * Tracks connection performance, response times, and reliability metrics
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { ConnectionType } from "../services/browserWorker";
import { ConnectionMetrics } from "../components/ConnectionMetrics";

/**
 * Performance metrics configuration
 */
export interface PerformanceMetricsConfig {
  /** Sampling interval for metrics collection in milliseconds */
  samplingInterval?: number;
  /** Maximum number of data points to keep */
  maxDataPoints?: number;
  /** Whether to persist metrics in localStorage */
  persistMetrics?: boolean;
  /** Key for localStorage persistence */
  storageKey?: string;
}

/**
 * Connection event types for metrics tracking
 */
export type ConnectionEvent = 
  | "connect"
  | "disconnect" 
  | "reconnect"
  | "request_start"
  | "request_success"
  | "request_failure"
  | "response_received";

/**
 * Data point for metrics tracking
 */
interface MetricsDataPoint {
  timestamp: number;
  connectionType: ConnectionType;
  event: ConnectionEvent;
  responseTime?: number;
  success?: boolean;
  error?: string;
}

/**
 * Connection type specific metrics
 */
interface TypeSpecificMetrics {
  uptime: number;
  avgResponseTime: number;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
}

/**
 * Hook return value
 */
export interface UsePerformanceMetricsReturn {
  /** Current performance metrics */
  metrics: ConnectionMetrics;
  /** Record a connection event */
  recordEvent: (event: ConnectionEvent, data?: {
    responseTime?: number;
    success?: boolean;
    error?: string;
  }) => void;
  /** Set current connection type */
  setConnectionType: (type: ConnectionType) => void;
  /** Reset all metrics */
  resetMetrics: () => void;
  /** Get metrics for a specific time range */
  getMetricsForRange: (startTime: number, endTime: number) => MetricsDataPoint[];
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<PerformanceMetricsConfig> = {
  samplingInterval: 1000,
  maxDataPoints: 1000,
  persistMetrics: true,
  storageKey: "browser-worker-performance-metrics"
};

/**
 * Load metrics from localStorage
 */
function loadMetricsFromStorage(storageKey: string): MetricsDataPoint[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to load performance metrics from localStorage:", error);
    return [];
  }
}

/**
 * Save metrics to localStorage
 */
function saveMetricsToStorage(storageKey: string, dataPoints: MetricsDataPoint[]): void {
  try {
    // Only save recent data points to reduce storage size
    const recentDataPoints = dataPoints.slice(-500);
    localStorage.setItem(storageKey, JSON.stringify(recentDataPoints));
  } catch (error) {
    console.warn("Failed to save performance metrics to localStorage:", error);
  }
}

/**
 * Calculate metrics from data points
 */
function calculateMetrics(
  dataPoints: MetricsDataPoint[], 
  currentConnectionType: ConnectionType
): ConnectionMetrics {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const recentPoints = dataPoints.filter(point => now - point.timestamp < oneHour);
  
  // Calculate overall metrics
  const requestPoints = recentPoints.filter(point => 
    point.event === "request_success" || point.event === "request_failure"
  );
  
  const successfulRequests = requestPoints.filter(point => point.success);
  const failedRequests = requestPoints.filter(point => !point.success);
  
  const totalRequests = requestPoints.length;
  const successRate = totalRequests > 0 ? (successfulRequests.length / totalRequests) * 100 : 100;
  
  const responseTimes = successfulRequests
    .map(point => point.responseTime)
    .filter((time): time is number => typeof time === "number");
  
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    : 0;
  
  // Calculate uptime
  const connectionEvents = recentPoints.filter(point => 
    point.event === "connect" || point.event === "disconnect"
  );
  
  let uptime = 100;
  if (connectionEvents.length > 0) {
    const totalTime = oneHour;
    let connectedTime = 0;
    let lastConnectTime = now - oneHour;
    let isConnected = true;
    
    connectionEvents.forEach(event => {
      if (event.event === "disconnect" && isConnected) {
        connectedTime += event.timestamp - lastConnectTime;
        isConnected = false;
      } else if (event.event === "connect" && !isConnected) {
        lastConnectTime = event.timestamp;
        isConnected = true;
      }
    });
    
    if (isConnected) {
      connectedTime += now - lastConnectTime;
    }
    
    uptime = (connectedTime / totalTime) * 100;
  }
  
  // Calculate current response time
  const currentResponseTime = responseTimes.length > 0 
    ? responseTimes[responseTimes.length - 1] 
    : undefined;
  
  // Calculate type-specific metrics
  const typeMetrics: NonNullable<ConnectionMetrics["typeMetrics"]> = {};
  
  [ConnectionType.SSE, ConnectionType.POLLING].forEach(type => {
    const typePoints = recentPoints.filter(point => point.connectionType === type);
    const typeRequests = typePoints.filter(point => 
      point.event === "request_success" || point.event === "request_failure"
    );
    
    if (typeRequests.length > 0) {
      const typeSuccessful = typeRequests.filter(point => point.success);
      const typeResponseTimes = typeSuccessful
        .map(point => point.responseTime)
        .filter((time): time is number => typeof time === "number");
      
      const typeMetric: TypeSpecificMetrics = {
        uptime, // Simplified - use overall uptime
        avgResponseTime: typeResponseTimes.length > 0 
          ? typeResponseTimes.reduce((sum, time) => sum + time, 0) / typeResponseTimes.length 
          : 0,
        successRate: (typeSuccessful.length / typeRequests.length) * 100,
        totalRequests: typeRequests.length,
        failedRequests: typeRequests.length - typeSuccessful.length
      };
      
      if (type === ConnectionType.SSE) {
        typeMetrics.sse = typeMetric;
      } else {
        typeMetrics.polling = typeMetric;
      }
    }
  });
  
  return {
    uptime: Math.max(0, Math.min(100, uptime)),
    avgResponseTime,
    currentResponseTime,
    successRate: Math.max(0, Math.min(100, successRate)),
    totalRequests,
    failedRequests: failedRequests.length,
    typeMetrics: Object.keys(typeMetrics).length > 0 ? typeMetrics : undefined,
    lastUpdate: now
  };
}

/**
 * React hook for managing connection performance metrics
 */
export function usePerformanceMetrics(config: PerformanceMetricsConfig = {}): UsePerformanceMetricsReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // State
  const [dataPoints, setDataPoints] = useState<MetricsDataPoint[]>(() => {
    if (finalConfig.persistMetrics) {
      return loadMetricsFromStorage(finalConfig.storageKey);
    }
    return [];
  });
  
  const [currentConnectionType, setCurrentConnectionType] = useState<ConnectionType>(ConnectionType.SSE);
  
  // Persist to localStorage when data points change
  useEffect(() => {
    if (finalConfig.persistMetrics) {
      saveMetricsToStorage(finalConfig.storageKey, dataPoints);
    }
  }, [dataPoints, finalConfig.persistMetrics, finalConfig.storageKey]);
  
  // Calculate current metrics
  const metrics = useMemo(() => {
    return calculateMetrics(dataPoints, currentConnectionType);
  }, [dataPoints, currentConnectionType]);
  
  // Record a connection event
  const recordEvent = useCallback((
    event: ConnectionEvent, 
    data: { responseTime?: number; success?: boolean; error?: string } = {}
  ) => {
    const dataPoint: MetricsDataPoint = {
      timestamp: Date.now(),
      connectionType: currentConnectionType,
      event,
      responseTime: data.responseTime,
      success: data.success,
      error: data.error
    };
    
    setDataPoints(prev => {
      const newDataPoints = [...prev, dataPoint];
      
      // Trim old data points if we exceed the maximum
      if (newDataPoints.length > finalConfig.maxDataPoints) {
        return newDataPoints.slice(-finalConfig.maxDataPoints);
      }
      
      return newDataPoints;
    });
  }, [currentConnectionType, finalConfig.maxDataPoints]);
  
  // Set connection type
  const setConnectionType = useCallback((type: ConnectionType) => {
    setCurrentConnectionType(type);
  }, []);
  
  // Reset all metrics
  const resetMetrics = useCallback(() => {
    setDataPoints([]);
    if (finalConfig.persistMetrics) {
      try {
        localStorage.removeItem(finalConfig.storageKey);
      } catch (error) {
        console.warn("Failed to clear performance metrics from localStorage:", error);
      }
    }
  }, [finalConfig.persistMetrics, finalConfig.storageKey]);
  
  // Get metrics for a specific time range
  const getMetricsForRange = useCallback((startTime: number, endTime: number): MetricsDataPoint[] => {
    return dataPoints.filter(point => 
      point.timestamp >= startTime && point.timestamp <= endTime
    );
  }, [dataPoints]);
  
  // Cleanup old data points periodically
  useEffect(() => {
    const cleanup = () => {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      setDataPoints(prev => prev.filter(point => point.timestamp > cutoffTime));
    };
    
    const interval = setInterval(cleanup, finalConfig.samplingInterval * 60); // Cleanup every minute
    return () => clearInterval(interval);
  }, [finalConfig.samplingInterval]);
  
  return {
    metrics,
    recordEvent,
    setConnectionType,
    resetMetrics,
    getMetricsForRange
  };
} 
