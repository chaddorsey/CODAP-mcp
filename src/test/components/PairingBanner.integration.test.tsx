import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PairingBanner } from "../../components/PairingBanner";
import { createSessionService } from "../../services";

// Mock CSS import
jest.mock("../../components/PairingBanner.css", () => ({}));

// Mock fetch for HTTP integration tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("PairingBanner Integration Tests", () => {
  const mockRelayBaseUrl = "https://test-relay.example.com";
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("SessionService Integration", () => {
    it("integrates correctly with real SessionService instance", async () => {
      // Mock successful API response with valid Base32 code
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: "ABCDEFGH",
          ttl: 600,
          expiresAt: new Date(Date.now() + 600000).toISOString()
        })
      });

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      // Should make HTTP request through real SessionService
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `${mockRelayBaseUrl}/api/sessions`,
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              "Content-Type": "application/json"
            }),
            signal: expect.any(AbortSignal)
          })
        );
      });

      // Should display the session data
      await waitFor(() => {
        expect(screen.getByText("Session Ready")).toBeInTheDocument();
        expect(screen.getByText("ABCDEFGH")).toBeInTheDocument();
      });
    });

    it("handles HTTP error responses through SessionService", async () => {
      // Mock HTTP error response for all attempts (1 initial + 3 retries)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" })
      });

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      // Should display error state after all retries exhausted
      await waitFor(() => {
        expect(screen.getByText("Session Error")).toBeInTheDocument();
        expect(screen.getByText(/session after 3 attempts/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });

    it("handles network timeouts through SessionService", async () => {
      // Mock timeout for all attempts
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Request timeout")), 50)
        )
      );

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      await waitFor(() => {
        expect(screen.getByText("Session Error")).toBeInTheDocument();
        expect(screen.getByText(/session after 3 attempts/i)).toBeInTheDocument();
      }, { timeout: 10000 });
    });
  });

  describe("Component with Real SessionService Configuration", () => {
    it("creates SessionService with correct configuration", () => {
      const consoleLog = jest.spyOn(console, "log").mockImplementation();
      
      // Test that component can create real SessionService
      const service = createSessionService(mockRelayBaseUrl, {
        timeout: 5000,
        maxRetries: 2,
        retryDelay: 500
      });

      expect(service).toBeDefined();
      expect(typeof service.createSession).toBe("function");
      expect(typeof service.isValidSession).toBe("function");
      
      consoleLog.mockRestore();
    });

    it("validates session codes correctly with real service", async () => {
      const service = createSessionService(mockRelayBaseUrl);
      
      // Test valid Base32 codes
      expect(service.isValidSession("ABCDEFGH")).toBe(true);
      expect(service.isValidSession("A2B3C4D5")).toBe(true);
      expect(service.isValidSession("ZZZZZZZZ")).toBe(true);
      
      // Test invalid codes
      expect(service.isValidSession("ABCD123")).toBe(false); // Too short
      expect(service.isValidSession("ABCD12345")).toBe(false); // Too long
      expect(service.isValidSession("ABCD123I")).toBe(false); // Invalid character I
      expect(service.isValidSession("ABCD1230")).toBe(false); // Invalid character 0
      expect(service.isValidSession("")).toBe(false); // Empty
    });
  });

  describe("API Contract Compliance", () => {
    it("sends correct request format to relay API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: "TEST1234",
          ttl: 600,
          expiresAt: new Date().toISOString()
        })
      });

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          `${mockRelayBaseUrl}/api/sessions`,
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            signal: expect.any(AbortSignal)
          })
        );
      });
    });

    it("processes expected API response format", async () => {
      const mockResponse = {
        code: "A2B3C4D5",
        ttl: 300,
        expiresAt: new Date(Date.now() + 300000).toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      await waitFor(() => {
        expect(screen.getByText("Session Ready")).toBeInTheDocument();
        expect(screen.getByText("A2B3C4D5")).toBeInTheDocument();
        expect(screen.getByText("Expires in: 5 minutes")).toBeInTheDocument();
      });
    });

    it("handles malformed API responses gracefully", async () => {
      // Mock response missing required fields
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ invalid: "response" })
      });

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      await waitFor(() => {
        expect(screen.getByText("Session Error")).toBeInTheDocument();
      });
    });
  });

  describe("Error Recovery Integration", () => {
    it("retries failed requests with exponential backoff", async () => {
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            code: "RETRY567",
            ttl: 600,
            expiresAt: new Date(Date.now() + 600000).toISOString()
          })
        });

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText("Session Ready")).toBeInTheDocument();
        expect(screen.getByText("RETRY567")).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should have made 3 attempts (1 initial + 2 retries before success)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("gives up after max retries and shows error", async () => {
      // All calls fail
      mockFetch.mockRejectedValue(new Error("Persistent network error"));

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      await waitFor(() => {
        expect(screen.getByText("Session Error")).toBeInTheDocument();
      }, { timeout: 10000 });

      // Should have made maximum attempts (as shown in error: "after 3 attempts")
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      }, { timeout: 8000 });
    });
  });

  describe("Real-world Scenarios", () => {
    it("handles slow network responses gracefully", async () => {
      // Mock slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            status: 200,
            json: async () => ({
              code: "SLOWTEST",
              ttl: 600,
              expiresAt: new Date(Date.now() + 600000).toISOString()
            })
          }), 2000)
        )
      );

      render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      // Should show loading state initially
      expect(screen.getByText("Creating session...")).toBeInTheDocument();

      // Should eventually show success
      await waitFor(() => {
        expect(screen.getByText("Session Ready")).toBeInTheDocument();
        expect(screen.getByText("SLOWTEST")).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it("handles component unmounting during async operation", async () => {
      // Mock hanging request
      const hangingPromise = new Promise(() => {}); // Never resolves
      mockFetch.mockReturnValueOnce(hangingPromise);

      const { unmount } = render(<PairingBanner relayBaseUrl={mockRelayBaseUrl} />);

      // Should show loading
      expect(screen.getByText("Creating session...")).toBeInTheDocument();

      // Unmount component during async operation
      unmount();

      // Should not cause errors or memory leaks
      // If component properly cleans up, this test passes without errors
    });
  });
}); 
