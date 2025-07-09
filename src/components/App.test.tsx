import React from "react";
import { App } from "./App";
import { render, screen } from "@testing-library/react";

describe("test load app", () => {
  it("renders without crashing", () => {
    render(<App/>);
    // Look for the loading spinner or loading text
    expect(screen.getByText((content) => content.includes("Initializing") || content.includes("CODAP"))).toBeDefined();
  });
});

