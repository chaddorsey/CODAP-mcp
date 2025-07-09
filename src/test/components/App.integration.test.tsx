import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { App } from "../../components/App";

// Mock the CODAP plugin API
jest.mock("@concord-consortium/codap-plugin-api", () => ({
  initializePlugin: jest.fn().mockResolvedValue({}),
  sendMessage: jest.fn().mockResolvedValue({ success: true })
}));

// Mock the session service to resolve immediately
jest.mock("../../services", () => {
  const original = jest.requireActual("../../services");
  return {
    ...original,
    createSessionService: () => ({
      createSession: jest.fn().mockResolvedValue({ code: "TESTCODE", capabilities: [] })
    })
  };
});

describe("App Integration with ClaudeConnectionPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders ClaudeConnectionPanel with correct session code and status", async () => {
    render(<App />);

    // Wait for the session code to appear
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes("TESTCODE"))).toBeInTheDocument();
    });

    // Check for relay and Claude status indicators
    const relayLabels = screen.getAllByText((content) => content === "Relay");
    expect(relayLabels.some(el => el.className.includes("status-label"))).toBe(true);
    const claudeLabels = screen.getAllByText((content) => content === "Claude");
    expect(claudeLabels.some(el => el.className.includes("status-label"))).toBe(true);

    // Check for the copy prompt button
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });
}); 
