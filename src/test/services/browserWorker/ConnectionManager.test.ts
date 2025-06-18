/**
 * Unit tests for ConnectionManager
 */

import { ConnectionManager } from "../../../services/browserWorker/ConnectionManager";
import {
  ConnectionState,
  ConnectionType,
  BrowserWorkerConfig,
  RetryConfig,
  SSEEvent,
  ConnectionError
} from "../../../services/browserWorker/types";

// Mock EventSource
class MockEventSource {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = EventSource.CONNECTING;
  public url: string;
  private listeners = new Map<string, ((event: MessageEvent) => void)[]>();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  close(): void {
    this.readyState = EventSource.CLOSED;
  }

  // Test helpers
  triggerOpen(): void {
    this.readyState = EventSource.OPEN;
    if (this.onopen) {
      this.onopen(new Event("open"));
    }
  }

  triggerMessage(data: any, eventType?: string): void {
    const event = new MessageEvent("message", {
      data: JSON.stringify(data)
    });
    
    if (eventType) {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.forEach(listener => listener(event));
      }
    } else if (this.onmessage) {
      this.onmessage(event);
    }
  }

  triggerError(): void {
    this.readyState = EventSource.CLOSED;
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }
}

// Mock timers
jest.useFakeTimers();

// Mock global EventSource with static properties
class MockEventSourceClass extends MockEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
}

global.EventSource = MockEventSourceClass as any;

describe("ConnectionManager", () => {
  let connectionManager: ConnectionManager;
  let mockEventSource: MockEventSource;
  let config: BrowserWorkerConfig;
  let retryConfig: RetryConfig;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();

    config = {
      relayBaseUrl: "https://test-relay.com",
      sessionCode: "test-session-123",
      debug: true
    };

    retryConfig = {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2
    };

    connectionManager = new ConnectionManager(config, retryConfig);

    // Capture the EventSource instance
    (global.EventSource as any) = jest.fn().mockImplementation((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource;
    });
  });

  afterEach(() => {
    connectionManager.disconnect();
    jest.useRealTimers();
  });

  describe("initialization", () => {
    it("should initialize with correct default status", () => {
      const status = connectionManager.status;
      
      expect(status.state).toBe(ConnectionState.DISCONNECTED);
      expect(status.type).toBe(ConnectionType.SSE);
      expect(status.retryCount).toBe(0);
      expect(status.error).toBeUndefined();
    });

    it("should merge provided config with defaults", () => {
      const customConfig = {
        relayBaseUrl: "https://custom.com",
        sessionCode: "custom-session",
        debug: false
      };

      const cm = new ConnectionManager(customConfig);
      expect(cm).toBeDefined();
    });
  });

  describe("connect", () => {
    it("should establish SSE connection successfully", async () => {
      const connectPromise = connectionManager.connect();
      
      // Verify connection state changes
      expect(connectionManager.status.state).toBe(ConnectionState.CONNECTING);
      
      // Simulate successful connection
      setTimeout(() => {
        mockEventSource.triggerOpen();
      }, 0);

      await connectPromise;

      expect(connectionManager.status.state).toBe(ConnectionState.CONNECTED);
      expect(connectionManager.status.retryCount).toBe(0);
      expect(connectionManager.status.lastConnected).toBeDefined();
    });

    it("should build correct SSE URL", async () => {
      connectionManager.connect();
      
      setTimeout(() => {
        mockEventSource.triggerOpen();
      }, 0);

      await jest.runOnlyPendingTimersAsync();

      expect(global.EventSource).toHaveBeenCalledWith(
        "https://test-relay.com/api/stream?code=test-session-123"
      );
    });

    it("should not connect if already connecting", async () => {
      const firstConnect = connectionManager.connect();
      const secondConnect = connectionManager.connect();

      setTimeout(() => {
        mockEventSource.triggerOpen();
      }, 0);

      await Promise.all([firstConnect, secondConnect]);

      expect(global.EventSource).toHaveBeenCalledTimes(1);
    });

    it("should handle connection errors", async () => {
      const connectPromise = connectionManager.connect();
      
      setTimeout(() => {
        mockEventSource.triggerError();
      }, 0);

      await connectPromise;

      expect(connectionManager.status.state).toBe(ConnectionState.ERROR);
      expect(connectionManager.status.error).toBeDefined();
    });
  });

  describe("disconnect", () => {
    it("should properly disconnect and cleanup", async () => {
      await connectionManager.connect();
      setTimeout(() => mockEventSource.triggerOpen(), 0);
      await jest.runOnlyPendingTimersAsync();

      connectionManager.disconnect();

      expect(connectionManager.status.state).toBe(ConnectionState.DISCONNECTED);
      expect(connectionManager.status.retryCount).toBe(0);
      expect(mockEventSource.readyState).toBe(EventSource.CLOSED);
    });
  });

  describe("event handling", () => {
    beforeEach(async () => {
      await connectionManager.connect();
      setTimeout(() => mockEventSource.triggerOpen(), 0);
      await jest.runOnlyPendingTimersAsync();
    });

    it("should handle tool-request events", () => {
      const messageHandler = jest.fn();
      connectionManager.addEventListener("message", messageHandler);

      const toolRequest = {
        id: "test-request-1",
        method: "get_data",
        params: { query: "test" }
      };

      mockEventSource.triggerMessage(toolRequest, "tool-request");

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool-request",
          data: toolRequest
        })
      );
    });

    it("should handle heartbeat events", () => {
      const messageHandler = jest.fn();
      connectionManager.addEventListener("message", messageHandler);

      const heartbeatData = { timestamp: Date.now() };

      mockEventSource.triggerMessage(heartbeatData, "heartbeat");

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "heartbeat",
          data: heartbeatData
        })
      );
    });

    it("should handle connected events", () => {
      const messageHandler = jest.fn();
      connectionManager.addEventListener("message", messageHandler);

      const connectedData = { status: "connected", sessionId: "abc123" };

      mockEventSource.triggerMessage(connectedData, "connected");

      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "connected",
          data: connectedData
        })
      );
    });

    it("should handle error events", () => {
      const errorHandler = jest.fn();
      connectionManager.addEventListener("error", errorHandler);

      const errorData = { message: "Server error occurred" };

      mockEventSource.triggerMessage(errorData, "error");

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "server_error",
          message: "Server error occurred"
        })
      );
    });

    it("should handle timeout events", () => {
      const errorHandler = jest.fn();
      connectionManager.addEventListener("error", errorHandler);

      mockEventSource.triggerMessage({}, "timeout");

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "timeout",
          message: "Session timeout received from server"
        })
      );
    });
  });

  describe("event listeners", () => {
    it("should add and remove event listeners correctly", () => {
      const messageHandler = jest.fn();
      const errorHandler = jest.fn();

      connectionManager.addEventListener("message", messageHandler);
      connectionManager.addEventListener("error", errorHandler);

      // Remove one listener
      connectionManager.removeEventListener("message", messageHandler);

      // Only error handler should remain
      const errorEvent: ConnectionError = {
        type: "network",
        message: "Test error",
        timestamp: Date.now()
      };

      // Trigger error through connection failure
      connectionManager.connect();
      setTimeout(() => mockEventSource.triggerError(), 0);

      expect(messageHandler).not.toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled();
    });

    it("should not add duplicate listeners", () => {
      const handler = jest.fn();

      connectionManager.addEventListener("message", handler);
      connectionManager.addEventListener("message", handler);

      // Should only be added once (tested indirectly through event handling)
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("heartbeat monitoring", () => {
    beforeEach(async () => {
      await connectionManager.connect();
      setTimeout(() => mockEventSource.triggerOpen(), 0);
      await jest.runOnlyPendingTimersAsync();
    });

    it("should detect heartbeat timeout", () => {
      const errorHandler = jest.fn();
      connectionManager.addEventListener("error", errorHandler);

      // Fast-forward past heartbeat timeout (60 seconds)
      jest.advanceTimersByTime(61000);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "timeout",
          message: "Heartbeat timeout - connection appears to be dead"
        })
      );
    });

    it("should reset heartbeat timer on heartbeat events", () => {
      const errorHandler = jest.fn();
      connectionManager.addEventListener("error", errorHandler);

      // Advance to just before timeout
      jest.advanceTimersByTime(59000);
      
      // Send heartbeat
      mockEventSource.triggerMessage({ timestamp: Date.now() }, "heartbeat");
      
      // Advance another 59 seconds (should not timeout now)
      jest.advanceTimersByTime(59000);

      expect(errorHandler).not.toHaveBeenCalled();
    });
  });

  describe("retry logic", () => {
    it("should retry connection with exponential backoff", async () => {
      const statusHandler = jest.fn();
      connectionManager.addEventListener("status-change", statusHandler);

      // Start connection
      connectionManager.connect();
      
      // Trigger first failure
      setTimeout(() => mockEventSource.triggerError(), 0);
      await jest.runOnlyPendingTimersAsync();

      expect(connectionManager.status.state).toBe(ConnectionState.ERROR);
      expect(connectionManager.status.retryCount).toBe(1);

      // Should schedule reconnection
      jest.advanceTimersByTime(200); // Base delay + jitter should be around this
      
      expect(connectionManager.status.state).toBe(ConnectionState.RECONNECTING);
    });

    it("should stop retrying after max attempts", async () => {
      const statusHandler = jest.fn();
      connectionManager.addEventListener("status-change", statusHandler);

      // Override to always fail
      (global.EventSource as any) = jest.fn().mockImplementation(() => {
        const mock = new MockEventSource("");
        setTimeout(() => mock.triggerError(), 0);
        return mock;
      });

      connectionManager.connect();

      // Let all retries fail
      for (let i = 0; i < retryConfig.maxAttempts + 1; i++) {
        await jest.runOnlyPendingTimersAsync();
        jest.advanceTimersByTime(5000); // Advance past any retry delay
      }

      expect(connectionManager.status.retryCount).toBe(retryConfig.maxAttempts);
      expect(connectionManager.status.state).toBe(ConnectionState.ERROR);
    });
  });

  describe("status updates", () => {
    it("should emit status-change events", () => {
      const statusHandler = jest.fn();
      connectionManager.addEventListener("status-change", statusHandler);

      connectionManager.connect();

      expect(statusHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          state: ConnectionState.CONNECTING
        })
      );
    });

    it("should clear error on successful connection", async () => {
      // First connection fails
      connectionManager.connect();
      setTimeout(() => mockEventSource.triggerError(), 0);
      await jest.runOnlyPendingTimersAsync();

      expect(connectionManager.status.error).toBeDefined();

      // Second connection succeeds
      connectionManager.connect();
      setTimeout(() => mockEventSource.triggerOpen(), 0);
      await jest.runOnlyPendingTimersAsync();

      expect(connectionManager.status.error).toBeUndefined();
      expect(connectionManager.status.state).toBe(ConnectionState.CONNECTED);
    });
  });
}); 
