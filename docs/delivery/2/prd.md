# PBI-2: CODAP Plugin Pairing Banner

## Overview

This PBI implements the user-facing pairing experience in the CODAP plugin to enable seamless connection between end users and LLM sessions. The pairing banner provides an intuitive interface for users to establish communication with AI assistants through the relay system implemented in PBI 1.

[View in Backlog](../backlog.md#user-content-2)

## Problem Statement

Currently, the CODAP plugin lacks a user interface for pairing with LLM sessions. While the relay infrastructure (PBI 1) provides the backend functionality, users have no way to:
- See the pairing code needed to connect with an LLM
- Copy the appropriate prompt text to share with their AI assistant
- Track the status and remaining time of their session
- Understand how to initiate the pairing process

This creates a significant barrier to adoption, as users cannot easily discover or use the MCP relay functionality.

## User Stories

**Primary User Story:**
As an end user, I want the CODAP plugin to display a pairing banner with copy-prompt/code actions so that I can easily connect an LLM session.

**Supporting User Stories:**
- As an end user, I want to see an 8-character pairing code clearly displayed so I can share it with my LLM
- As an end user, I want a countdown timer so I know how much time remains in my session
- As an end user, I want to copy a complete prompt that includes instructions, so I don't have to remember complex setup steps
- As an end user, I want the banner to be accessible to assistive technologies so all users can benefit

## Technical Approach

### Architecture
- **Component Location**: Browser-side CODAP plugin interface
- **Session Management**: Integrate with relay API endpoints from PBI 1
- **State Management**: React state for session lifecycle, timer updates, and UI interactions
- **API Integration**: REST calls to relay endpoints for session creation and status

### Key Components
1. **Pairing Banner Component**: Main UI container with session information
2. **Session Service**: API client for relay communication
3. **Timer Component**: Countdown display with automatic updates
4. **Copy Prompt Component**: Text generation and clipboard integration
5. **Accessibility Layer**: ARIA attributes and screen reader support

### Data Flow
1. Plugin loads → Request new session from relay API
2. Display banner with received session code and TTL
3. Start countdown timer with periodic updates
4. User interactions: copy code, copy full prompt
5. Handle session expiration and renewal

## UX/UI Considerations

### Visual Design
- **Placement**: Prominent position within CODAP interface, non-intrusive
- **Styling**: Consistent with CODAP design system and theming
- **Information Hierarchy**: Code prominently displayed, secondary actions clearly accessible
- **State Indicators**: Clear visual feedback for session status (active, expiring, expired)

### Interaction Design
- **Copy Actions**: Single-click copy with visual confirmation feedback
- **Responsive Design**: Functional across different screen sizes and orientations
- **Loading States**: Appropriate feedback during API calls
- **Error Handling**: Clear messaging for network or session errors

### Accessibility
- **WCAG AA Compliance**: Color contrast ratios ≥4.5:1
- **Screen Reader Support**: ARIA-live announcements for timer updates and status changes
- **Keyboard Navigation**: Full functionality available via keyboard shortcuts
- **Focus Management**: Logical tab order and visible focus indicators

## Acceptance Criteria

### Core Functionality
- ✅ Banner visible on plugin load with 8-character session code
- ✅ Countdown timer displays remaining session time and updates regularly
- ✅ "Copy Code" action copies just the session code to clipboard
- ✅ "Copy Prompt" action copies complete setup instructions including code and relay URL
- ✅ Session automatically renews or handles expiration gracefully

### Technical Requirements
- ✅ Integration with relay API endpoints from PBI 1
- ✅ Proper error handling for network failures
- ✅ Clean React component architecture with appropriate state management
- ✅ TypeScript implementation with proper type definitions

### Accessibility & UX
- ✅ WCAG AA compliance verified through accessibility audit
- ✅ Screen reader compatibility tested with at least one assistive technology
- ✅ Keyboard navigation fully functional
- ✅ Visual feedback for all user actions (copy confirmations, loading states)
- ✅ Mobile-responsive design tested on common device sizes

## Dependencies

### Internal Dependencies
- **PBI 1**: Relay API endpoints must be operational and accessible
- **CODAP Plugin Framework**: Understanding of plugin integration patterns
- **Design System**: Access to CODAP styling guidelines and component library

### External Dependencies
- **Clipboard API**: Browser support for programmatic clipboard access
- **React/TypeScript**: Current versions compatible with CODAP ecosystem
- **Accessibility Testing Tools**: For WCAG compliance verification

## Open Questions

1. **Session Renewal Strategy**: Should sessions auto-renew, or require user action?
2. **Multiple Sessions**: How should the UI handle multiple concurrent LLM sessions?
3. **Prompt Customization**: Should users be able to customize the generated prompt text?
4. **Error Recovery**: What's the best UX for recovering from network/API failures?
5. **Analytics**: Should we track usage patterns for pairing success rates?

## Related Tasks

Tasks for this PBI are documented in [tasks.md](./tasks.md). 