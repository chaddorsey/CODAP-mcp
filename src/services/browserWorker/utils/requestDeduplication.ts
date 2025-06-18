/**
 * Request deduplication utility for polling
 * Tracks processed request IDs to prevent duplicate execution
 */

import { RequestTracker, ToolRequest, DEFAULT_POLLING_CONFIG } from "../types";

/**
 * RequestDeduplicator manages tracking of processed requests
 */
export class RequestDeduplicator {
  private tracker: RequestTracker;

  constructor(maxTrackedIds: number = DEFAULT_POLLING_CONFIG.maxTrackedIds) {
    this.tracker = {
      processedIds: new Set<string>(),
      maxTrackedIds
    };
  }

  /**
   * Check if a request has already been processed
   * @param requestId - The request ID to check
   * @returns True if request has been processed before
   */
  isProcessed(requestId: string): boolean {
    return this.tracker.processedIds.has(requestId);
  }

  /**
   * Mark a request as processed
   * @param requestId - The request ID to mark as processed
   */
  markProcessed(requestId: string): void {
    this.tracker.processedIds.add(requestId);
    this.tracker.lastProcessedId = requestId;

    // Cleanup old IDs if we exceed the limit
    if (this.tracker.processedIds.size > this.tracker.maxTrackedIds) {
      this.cleanupOldIds();
    }
  }

  /**
   * Filter out already processed requests from a list
   * @param requests - Array of tool requests to filter
   * @returns Array of new (unprocessed) requests
   */
  filterNewRequests(requests: ToolRequest[]): ToolRequest[] {
    return requests.filter(request => !this.isProcessed(request.id));
  }

  /**
   * Get the last processed request ID
   * @returns The ID of the most recently processed request, or undefined
   */
  getLastProcessedId(): string | undefined {
    return this.tracker.lastProcessedId;
  }

  /**
   * Get the count of tracked request IDs
   * @returns Number of request IDs currently being tracked
   */
  getTrackedCount(): number {
    return this.tracker.processedIds.size;
  }

  /**
   * Clear all tracked request IDs
   */
  clear(): void {
    this.tracker.processedIds.clear();
    this.tracker.lastProcessedId = undefined;
  }

  /**
   * Set the last processed ID (useful for initialization)
   * @param requestId - The request ID to set as last processed
   */
  setLastProcessedId(requestId: string): void {
    this.tracker.lastProcessedId = requestId;
    this.tracker.processedIds.add(requestId);
  }

  /**
   * Clean up old request IDs to keep memory usage bounded
   */
  private cleanupOldIds(): void {
    const idsArray = Array.from(this.tracker.processedIds);
    const idsToRemove = idsArray.slice(0, Math.floor(this.tracker.maxTrackedIds * 0.2));
    
    idsToRemove.forEach(id => {
      this.tracker.processedIds.delete(id);
    });
  }

  /**
   * Export current tracker state (for persistence)
   * @returns Serializable tracker state
   */
  exportState(): { lastProcessedId?: string; processedIds: string[] } {
    return {
      lastProcessedId: this.tracker.lastProcessedId,
      processedIds: Array.from(this.tracker.processedIds)
    };
  }

  /**
   * Import tracker state (for restoration)
   * @param state - Previously exported tracker state
   */
  importState(state: { lastProcessedId?: string; processedIds: string[] }): void {
    this.tracker.lastProcessedId = state.lastProcessedId;
    this.tracker.processedIds = new Set(state.processedIds);
  }
}

/**
 * Utility function to create a request deduplicator
 * @param maxTrackedIds - Maximum number of request IDs to track
 * @returns New RequestDeduplicator instance
 */
export function createRequestDeduplicator(maxTrackedIds?: number): RequestDeduplicator {
  return new RequestDeduplicator(maxTrackedIds);
} 
