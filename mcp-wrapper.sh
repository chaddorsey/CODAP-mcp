#!/bin/bash

# MCP Remote Wrapper Script
# This script ensures the correct Node.js environment and mcp-remote version

export NODE_OPTIONS="--experimental-global-web-streams"
export PATH="/opt/homebrew/bin:$PATH"

# Ensure we're using the correct Node.js version
NODE_VERSION=$(node --version)
echo "Using Node.js version: $NODE_VERSION" >&2

# Use the globally installed mcp-remote@0.1.15
exec mcp-remote "$@" 