import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PairingBanner } from "../../components/PairingBanner";
import { BannerState } from "../../components/types";
import { SessionData, SessionServiceError } from "../../services/types";

// Mock the session service
jest.mock("../../services", () => ({
  createSessionService: jest.fn(),
  SessionService: jest.fn(),
  SessionServiceError: jest.fn().mockImplementation((message, code) => {
    const error = new Error(message);
    (error as any).code = code;
    return error;
  })
}));

// Mock CSS import
jest.mock("../../components/PairingBanner.css", () => ({}));

describe("PairingBanner", () => {
  const mockSessionData: SessionData = {
    code: "ABCD1234",
    ttl: 600,
    expiresAt: new Date(Date.now() + 600000).toISOString()
  };

  const mockSessionService = {
    createSession: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { createSessionService } = require("../../services");
    createSessionService.mockReturnValue(mockSessionService);
    mockSessionService.createSession.mockResolvedValue(mockSessionData);
  });

  describe("Component Mounting", () => {
    it("renders without errors and initiates session creation by default", () => {
      render(<PairingBanner />);
      
      expect(screen.getByRole("region")).toBeInTheDocument();
      expect(screen.getByRole("region")).toHaveAttribute("aria-labelledby");
      
      // Should automatically start session creation
      waitFor(() => {
        expect(mockSessionService.createSession).toHaveBeenCalled();
      });
    });

    it("does not auto-start session creation when autoStart is false", () => {
      render(<PairingBanner autoStart={false} />);
      
      expect(screen.getByRole("region")).toBeInTheDocument();
      expect(mockSessionService.createSession).not.toHaveBeenCalled();
    });

    it("applies custom className when provided", () => {
      render(<PairingBanner className="custom-class" />);
      
      const banner = screen.getByRole("region");
      expect(banner).toHaveClass("custom-class");
    });


  });

  describe("Loading State", () => {
    it("shows loading indicators during session creation", async () => {
      // Make the service call hang
      mockSessionService.createSession.mockImplementation(() => new Promise(() => {}));
      
      render(<PairingBanner />);
      
      await waitFor(() => {
        expect(screen.getByLabelText("Creating session")).toBeInTheDocument();
        expect(screen.getByText("Creating session...")).toBeInTheDocument();
      });
    });

    it("shows retry indicator when retrying", async () => {
      // First call fails, second call hangs
      mockSessionService.createSession
        .mockRejectedValueOnce(new Error("Network error"))
        .mockImplementation(() => new Promise(() => {}));
      
      render(<PairingBanner />);
      
      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText("Session Error")).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByText("Try Again"));
      
      // Should show retry message
      await waitFor(() => {
        expect(screen.getByText("Retrying session creation...")).toBeInTheDocument();
      });
    });

    it("applies loading state CSS class", async () => {
      mockSessionService.createSession.mockImplementation(() => new Promise(() => {}));
      
      render(<PairingBanner />);
      
      await waitFor(() => {
        const banner = screen.getByRole("region");
        expect(banner).toHaveClass("pairing-banner--loading");
      });
    });
  });

  describe("Successful Session Display", () => {
    it("displays session code when API call succeeds", async () => {
      render(<PairingBanner />);
      
      await waitFor(() => {
        expect(screen.getByText("Session Ready")).toBeInTheDocument();
        expect(screen.getByText("ABCD1234")).toBeInTheDocument();
        expect(screen.getByText("Session Code:")).toBeInTheDocument();
      });
    });

    it("displays session expiration time", async () => {
      render(<PairingBanner />);
      
      await waitFor(() => {
        expect(screen.getByText("Time remaining:")).toBeInTheDocument();
        expect(screen.getByText("10:00")).toBeInTheDocument();
      });
    });

    it("has proper accessibility attributes for session code", async () => {
      render(<PairingBanner />);
      
      await waitFor(() => {
        // Look for the session code element by its role and content
        const codeElement = screen.getByRole("text");
        expect(codeElement).toBeInTheDocument();
        expect(codeElement).toHaveTextContent("ABCD1234");
        expect(codeElement).toHaveAttribute("aria-labelledby");
        expect(codeElement).toHaveAttribute("aria-describedby");
      });
    });

    it("applies success state CSS class", async () => {
      render(<PairingBanner />);
      
      await waitFor(() => {
        const banner = screen.getByRole("region");
        expect(banner).toHaveClass("pairing-banner--success");
      });
    });

    it("calls onSessionCreated callback when provided", async () => {
      const onSessionCreated = jest.fn();
      render(<PairingBanner onSessionCreated={onSessionCreated} />);
      
      await waitFor(() => {
        expect(onSessionCreated).toHaveBeenCalledWith(mockSessionData);
      });
    });
  });

  describe("Error Handling", () => {
    it("shows error message when session creation fails", async () => {
      const errorMessage = "Network connection failed";
      const mockError = new Error(errorMessage);
      (mockError as any).code = "NETWORK_ERROR";
      mockSessionService.createSession.mockRejectedValue(mockError);
      
      render(<PairingBanner />);
      
      await waitFor(() => {
        expect(screen.getByText("Session Error")).toBeInTheDocument();
        expect(screen.getByText("Failed to create session")).toBeInTheDocument();
      });
    });

    it("shows generic error message for non-SessionServiceError", async () => {
      mockSessionService.createSession.mockRejectedValue(new Error("Generic error"));
      
      render(<PairingBanner />);
      
      await waitFor(() => {
        expect(screen.getByText("Failed to create session")).toBeInTheDocument();
      });
    });

    it("applies error state CSS class", async () => {
      mockSessionService.createSession.mockRejectedValue(new Error("Test error"));
      
      render(<PairingBanner />);
      
      await waitFor(() => {
        const banner = screen.getByRole("region");
        expect(banner).toHaveClass("pairing-banner--error");
      });
    });

    it("calls onError callback when provided", async () => {
      const onError = jest.fn();
      const testError = new Error("Test error");
      mockSessionService.createSession.mockRejectedValue(testError);
      
      render(<PairingBanner onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe("Retry Functionality", () => {
    it("allows retry after failed session creation", async () => {
      mockSessionService.createSession
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValueOnce(mockSessionData);
      
      render(<PairingBanner />);
      
      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText("Session Error")).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByText("Try Again"));
      
      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText("Session Ready")).toBeInTheDocument();
        expect(screen.getByText("ABCD1234")).toBeInTheDocument();
      });
      
      expect(mockSessionService.createSession).toHaveBeenCalledTimes(2);
    });

    it("retry button has proper accessibility attributes", async () => {
      mockSessionService.createSession.mockRejectedValue(new Error("Test error"));
      
      render(<PairingBanner />);
      
      await waitFor(() => {
        const retryButton = screen.getByLabelText("Retry session creation");
        expect(retryButton).toBeInTheDocument();
        expect(retryButton).toHaveAttribute("type", "button");
      });
    });
  });

  describe("Idle State", () => {
    it("renders idle state when autoStart is false", () => {
      render(<PairingBanner autoStart={false} />);
      
      expect(screen.getByText("CODAP MCP Pairing")).toBeInTheDocument();
      expect(screen.getByText("Ready to create a new session for LLM pairing")).toBeInTheDocument();
      expect(screen.getByText("Create Session")).toBeInTheDocument();
    });

    it("allows manual session creation from idle state", async () => {
      render(<PairingBanner autoStart={false} />);
      
      fireEvent.click(screen.getByText("Create Session"));
      
      await waitFor(() => {
        expect(mockSessionService.createSession).toHaveBeenCalledTimes(1);
      });
    });

    it("applies idle state CSS class", () => {
      render(<PairingBanner autoStart={false} />);
      
      const banner = screen.getByRole("region");
      expect(banner).toHaveClass("pairing-banner--idle");
    });

    it("start button has proper accessibility attributes", () => {
      render(<PairingBanner autoStart={false} />);
      
      const startButton = screen.getByLabelText("Start session creation");
      expect(startButton).toBeInTheDocument();
      expect(startButton).toHaveAttribute("type", "button");
    });
  });

  describe("Component Cleanup", () => {
    it("renders consistently after multiple mounts and unmounts", () => {
      const { unmount } = render(<PairingBanner autoStart={false} />);
      
      expect(screen.getByText("CODAP MCP Pairing")).toBeInTheDocument();
      
      unmount();
      
      // Re-render as a new component instance
      render(<PairingBanner autoStart={false} />);
      
      expect(screen.getByText("CODAP MCP Pairing")).toBeInTheDocument();
    });
  });

  describe("Configuration", () => {
    it("uses custom relay base URL when provided", () => {
      const customUrl = "https://custom-relay.example.com";
      const { createSessionService } = require("../../services");
      
      render(<PairingBanner relayBaseUrl={customUrl} autoStart={false} />);
      
      expect(createSessionService).toHaveBeenCalledWith(customUrl, expect.any(Object));
    });

    it("uses default configuration for session service", () => {
      const { createSessionService } = require("../../services");
      
      render(<PairingBanner autoStart={false} />);
      
      expect(createSessionService).toHaveBeenCalledWith(
        "https://codap-mcp-cdorsey-concordorgs-projects.vercel.app",
        {
          timeout: 10000,
          maxRetries: 3,
          retryDelay: 1000
        }
      );
    });
  });

}); 
