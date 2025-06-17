// Mock for @modelcontextprotocol/sdk
export const Client = jest.fn().mockImplementation(() => ({
  connect: jest.fn(),
  request: jest.fn(),
  notification: jest.fn(),
  close: jest.fn()
}));

export const StreamableHTTPClientTransport = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  send: jest.fn(),
  close: jest.fn()
}));

export default {
  Client,
  StreamableHTTPClientTransport
}; 
