/**
 * React Hook for Tool Execution History Management
 * Tracks tool executions, maintains history, and calculates performance metrics
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { ToolRequest, ToolResponse } from "../services/browserWorker";
import { ToolExecutionState } from "../components/ToolExecutionStatus";

/**
 * Execution history configuration
 */
export interface ExecutionHistoryConfig {
  /** Maximum number of executions to keep in history */
  maxHistorySize?: number;
  /** Whether to persist history in localStorage */
  persistHistory?: boolean;
  /** Key for localStorage persistence */
  storageKey?: string;
}

/**
 * Execution statistics
 */
export interface ExecutionStatistics {
  /** Total number of executions */
  total: number;
  /** Number of completed executions */
  completed: number;
  /** Number of failed executions */
  failed: number;
  /** Number of currently queued executions */
  queued: number;
  /** Number of currently running executions */
  running: number;
  /** Success rate percentage */
  successRate: number;
  /** Average execution duration in milliseconds */
  averageDuration: number;
  /** Total execution time in milliseconds */
  totalDuration: number;
  /** Most recent execution timestamp */
  lastExecutionTime?: number;
}

/**
 * Hook return value
 */
export interface UseExecutionHistoryReturn {
  /** Current executions (queued and running) */
  currentExecutions: ToolExecutionState[];
  /** Historical executions (completed and failed) */
  historicalExecutions: ToolExecutionState[];
  /** All executions */
  allExecutions: ToolExecutionState[];
  /** Execution statistics */
  statistics: ExecutionStatistics;
  /** Add a new tool request to tracking */
  addExecution: (request: ToolRequest) => void;
  /** Update execution status */
  updateExecution: (requestId: string, updates: Partial<ToolExecutionState>) => void;
  /** Complete an execution with response */
  completeExecution: (requestId: string, response: ToolResponse) => void;
  /** Mark execution as failed */
  failExecution: (requestId: string, error?: string) => void;
  /** Clear all history */
  clearHistory: () => void;
  /** Get execution by request ID */
  getExecution: (requestId: string) => ToolExecutionState | undefined;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ExecutionHistoryConfig> = {
  maxHistorySize: 100,
  persistHistory: true,
  storageKey: "browser-worker-execution-history"
};

/**
 * Load history from localStorage
 */
function loadHistoryFromStorage(storageKey: string): ToolExecutionState[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to load execution history from localStorage:", error);
    return [];
  }
}

/**
 * Save history to localStorage
 */
function saveHistoryToStorage(storageKey: string, executions: ToolExecutionState[]): void {
  try {
    // Only save completed/failed executions to reduce storage size
    const persistableExecutions = executions.filter(
      exec => exec.status === "completed" || exec.status === "failed"
    );
    localStorage.setItem(storageKey, JSON.stringify(persistableExecutions));
  } catch (error) {
    console.warn("Failed to save execution history to localStorage:", error);
  }
}

/**
 * React hook for managing tool execution history
 */
export function useExecutionHistory(config: ExecutionHistoryConfig = {}): UseExecutionHistoryReturn {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Initialize state with persisted history if enabled
  const [executions, setExecutions] = useState<ToolExecutionState[]>(() => {
    if (finalConfig.persistHistory) {
      return loadHistoryFromStorage(finalConfig.storageKey);
    }
    return [];
  });

  // Persist to localStorage when executions change
  useEffect(() => {
    if (finalConfig.persistHistory) {
      saveHistoryToStorage(finalConfig.storageKey, executions);
    }
  }, [executions, finalConfig.persistHistory, finalConfig.storageKey]);

  // Separate current and historical executions
  const { currentExecutions, historicalExecutions } = useMemo(() => {
    const current = executions.filter(exec => 
      exec.status === "queued" || exec.status === "running"
    );
    
    const historical = executions
      .filter(exec => exec.status === "completed" || exec.status === "failed")
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, finalConfig.maxHistorySize);
    
    return { currentExecutions: current, historicalExecutions: historical };
  }, [executions, finalConfig.maxHistorySize]);

  // Calculate statistics
  const statistics = useMemo((): ExecutionStatistics => {
    const completed = executions.filter(exec => exec.status === "completed");
    const failed = executions.filter(exec => exec.status === "failed");
    const queued = executions.filter(exec => exec.status === "queued");
    const running = executions.filter(exec => exec.status === "running");
    
    const total = executions.length;
    const successRate = total > 0 ? (completed.length / (completed.length + failed.length)) * 100 : 0;
    
    const totalDuration = completed.reduce((sum, exec) => {
      const duration = exec.response?.duration || 0;
      return sum + duration;
    }, 0);
    
    const averageDuration = completed.length > 0 ? totalDuration / completed.length : 0;
    
    const lastExecutionTime = executions
      .filter(exec => exec.endTime)
      .reduce((latest, exec) => Math.max(latest, exec.endTime || 0), 0) || undefined;

    return {
      total,
      completed: completed.length,
      failed: failed.length,
      queued: queued.length,
      running: running.length,
      successRate,
      averageDuration,
      totalDuration,
      lastExecutionTime
    };
  }, [executions]);

  // Add a new execution
  const addExecution = useCallback((request: ToolRequest) => {
    const execution: ToolExecutionState = {
      request,
      status: "queued",
      startTime: Date.now(),
      queuePosition: currentExecutions.filter(e => e.status === "queued").length + 1
    };

    setExecutions(prev => [...prev, execution]);
  }, [currentExecutions]);

  // Update execution status
  const updateExecution = useCallback((requestId: string, updates: Partial<ToolExecutionState>) => {
    setExecutions(prev => prev.map(exec => 
      exec.request.id === requestId 
        ? { ...exec, ...updates }
        : exec
    ));
  }, []);

  // Complete an execution
  const completeExecution = useCallback((requestId: string, response: ToolResponse) => {
    setExecutions(prev => prev.map(exec => 
      exec.request.id === requestId 
        ? {
            ...exec,
            status: response.success ? "completed" : "failed",
            response,
            endTime: Date.now()
          }
        : exec
    ));
  }, []);

  // Mark execution as failed
  const failExecution = useCallback((requestId: string, error?: string) => {
    setExecutions(prev => prev.map(exec => 
      exec.request.id === requestId 
        ? {
            ...exec,
            status: "failed" as const,
            endTime: Date.now(),
            response: {
              requestId,
              success: false,
              error: {
                type: "execution_error" as const,
                message: error || "Execution failed"
              },
              timestamp: new Date().toISOString(),
              duration: exec.startTime ? Date.now() - exec.startTime : 0
            }
          }
        : exec
    ));
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setExecutions([]);
    if (finalConfig.persistHistory) {
      try {
        localStorage.removeItem(finalConfig.storageKey);
      } catch (error) {
        console.warn("Failed to clear execution history from localStorage:", error);
      }
    }
  }, [finalConfig.persistHistory, finalConfig.storageKey]);

  // Get execution by request ID
  const getExecution = useCallback((requestId: string): ToolExecutionState | undefined => {
    return executions.find(exec => exec.request.id === requestId);
  }, [executions]);

  // Cleanup old executions when limit is exceeded
  useEffect(() => {
    if (executions.length > finalConfig.maxHistorySize * 1.5) {
      setExecutions(prev => {
        const current = prev.filter(exec => 
          exec.status === "queued" || exec.status === "running"
        );
        const historical = prev
          .filter(exec => exec.status === "completed" || exec.status === "failed")
          .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
          .slice(0, finalConfig.maxHistorySize);
        
        return [...current, ...historical];
      });
    }
  }, [executions.length, finalConfig.maxHistorySize]);

  return {
    currentExecutions,
    historicalExecutions,
    allExecutions: executions,
    statistics,
    addExecution,
    updateExecution,
    completeExecution,
    failExecution,
    clearHistory,
    getExecution
  };
} 
