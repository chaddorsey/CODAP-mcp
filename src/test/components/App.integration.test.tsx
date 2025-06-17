import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "../../components/App";

// Mock the PairingBanner component to focus on integration
jest.mock("../../components/PairingBanner", () => ({
  PairingBanner: ({ relayBaseUrl }: { relayBaseUrl: string }) => (
    <div data-testid="pairing-banner">
      <div>Pairing Banner Loaded</div>
      <div>Relay URL: { relayBaseUrl }</div>
    </div>
  )
}));

// Mock the CODAP plugin API
jest.mock("@concord-consortium/codap-plugin-api", () => ({
  initializePlugin: jest.fn().mockResolvedValue({}),
  sendMessage: jest.fn().mockResolvedValue({ success: true })
}));

describe("App Integration with PairingBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders PairingBanner component with correct props", async () => {
    render(<App />);

    // Wait for the banner to appear
    await waitFor(() => {
      expect(screen.getByTestId("pairing-banner")).toBeInTheDocument();
    });

    // Verify the banner is configured correctly
    expect(screen.getByText("Pairing Banner Loaded")).toBeInTheDocument();
    expect(screen.getByText("Relay URL: https://codap-mcp-cdorsey-concordorgs-projects.vercel.app")).toBeInTheDocument();
  });

  it("renders banner before existing sections", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("pairing-banner")).toBeInTheDocument();
    });

    // Verify the banner appears before existing sections
    const banner = screen.getByTestId("pairing-banner");
    const codapSection = screen.getByText("CODAP Functions");
    
    // Banner should appear before CODAP Functions section in the DOM
    expect(banner.compareDocumentPosition(codapSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("maintains existing App functionality", async () => {
    render(<App />);

    // Verify existing sections still exist
    expect(screen.getByText("CODAP MCP Plugin")).toBeInTheDocument();
    expect(screen.getByText("CODAP Functions")).toBeInTheDocument();
    expect(screen.getByText("CODAP Response")).toBeInTheDocument();
    expect(screen.getByText("Listener Notification")).toBeInTheDocument();
  });
}); 
