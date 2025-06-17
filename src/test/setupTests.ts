import "@testing-library/jest-dom";

// Mock fetch for tests since it's not available in Node.js test environment
global.fetch = jest.fn();
