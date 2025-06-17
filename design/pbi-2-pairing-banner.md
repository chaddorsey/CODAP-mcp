# CODAP Plugin Pairing Banner Design Document

## Current Context
- CODAP MCP Plugin exists with basic interface for testing CODAP functions and MCP tools
- Relay API system (PBI 1) is complete and provides session creation endpoints
- Plugin uses React with TypeScript and @concord-consortium/codap-plugin-api
- Current App.tsx structure includes sections for "CODAP Functions" and "MCP Tools"
- Users currently have no way to pair with LLM sessions - missing critical UX piece

## Requirements

### Functional Requirements
- Display pairing banner prominently in CODAP plugin interface
- Show 8-character session code clearly
- Provide countdown timer showing remaining session time
- Enable copy-to-clipboard for session code and complete prompt
- Generate dynamic prompt text with session code, relay URL, and instructions
- Integrate seamlessly with existing App.tsx component structure
- Support session renewal and expiration handling

### Non-Functional Requirements
- WCAG AA accessibility compliance (color contrast ≥4.5:1, screen reader support)
- Responsive design working on desktop, tablet, and mobile
- Performance: Banner load time <200ms, timer updates <16ms
- Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- No memory leaks from timer or API calls
- Integration with CODAP design system aesthetics

## Design Decisions

### 1. React Component Architecture
Will implement **functional components with hooks** because:
- Aligns with modern React patterns used in existing codebase
- Easier state management with useState and useEffect
- Better performance with React.memo optimization
- Simpler testing with React Testing Library

### 2. Session Service Architecture  
Will implement **dedicated TypeScript service class** because:
- Separation of concerns from UI components
- Reusable across multiple components if needed
- Easier unit testing with mockable interface
- Type safety for all API interactions

### 3. Timer Implementation
Will use **custom React hook with setInterval** because:
- Encapsulates timer logic for reusability
- Automatic cleanup with useEffect return function
- Better testing with Jest fake timers
- No external timer library dependencies

### 4. Clipboard Implementation
Will use **navigator.clipboard with execCommand fallback** because:
- Modern API provides better security and UX
- Fallback ensures compatibility with older browsers
- Proper error handling for permission scenarios
- Native browser functionality requires no external dependencies

## Technical Design

### 1. Core Components

```typescript
// Main banner component
interface PairingBannerProps {
  relayBaseUrl?: string;
  onSessionCreated?: (session: SessionData) => void;
  onError?: (error: Error) => void;
}

export const PairingBanner: React.FC<PairingBannerProps> = ({ ... }) => {
  // Component implementation
};

// Session service for API communication
class SessionService {
  constructor(private baseUrl: string) {}
  
  async createSession(): Promise<SessionData>;
  async getSessionStatus(sessionId: string): Promise<SessionStatus>;
}

// Custom hooks
function useCountdown(initialSeconds: number): CountdownState;
function useClipboard(): ClipboardOperations;
```

### 2. Data Models

```typescript
interface SessionData {
  code: string;          // 8-character session code
  sessionId: string;     // Internal session ID
  expiresAt: number;     // Unix timestamp
  ttl: number;          // Time to live in seconds
}

interface CountdownState {
  remainingTime: number;
  formattedTime: string;
  status: 'active' | 'warning' | 'expired';
  reset: (newTime: number) => void;
}

interface ClipboardOperations {
  copyText: (text: string) => Promise<boolean>;
  copyCode: (code: string) => Promise<boolean>;
  copyPrompt: (session: SessionData, relayUrl: string) => Promise<boolean>;
  lastError: Error | null;
}
```

### 3. Integration Points
- **App.tsx Integration**: Banner component added to JSX structure above existing sections
- **Relay API**: Calls to POST /api/sessions endpoint from PBI 1
- **CODAP Plugin API**: No direct integration needed, inherits from App component
- **Clipboard API**: Browser native navigator.clipboard and document.execCommand

## Implementation Plan

1. **Phase 1: Core Infrastructure (Tasks 2-1, 2-2)**
   - Create SessionService with TypeScript types
   - Build basic PairingBanner component
   - Implement session creation and display
   - Expected timeline: 2-3 hours

2. **Phase 2: User Experience Features (Tasks 2-3, 2-4)**  
   - Add countdown timer with useCountdown hook
   - Implement copy-to-clipboard functionality
   - Add visual feedback and error handling
   - Expected timeline: 2-3 hours

3. **Phase 3: Integration & Polish (Tasks 2-5, 2-6, 2-7)**
   - Integrate banner into App.tsx
   - Add accessibility features and ARIA support
   - Implement responsive design and styling
   - Expected timeline: 3-4 hours

4. **Phase 4: Testing & Validation (Task 2-8)**
   - Create comprehensive E2E test suite
   - Verify all acceptance criteria
   - Cross-browser and accessibility testing
   - Expected timeline: 2-3 hours

## Testing Strategy

### Unit Tests
- SessionService API calls with mocked fetch responses
- PairingBanner component rendering with mocked dependencies
- useCountdown hook with Jest fake timers
- useClipboard hook with mocked navigator.clipboard
- Coverage target: >90% for all new components

### Integration Tests
- PairingBanner with real SessionService (mocked API)
- Component interactions and state management
- Error scenario handling and recovery
- Timer accuracy and cleanup verification

### E2E Tests
- Complete user journey from plugin load to session creation
- Copy functionality with real clipboard verification
- Accessibility testing with axe-core and screen readers
- Responsive design across device sizes
- Cross-browser compatibility verification

## Observability

### Logging
- Session creation attempts and results (info level)
- API errors and retry attempts (error level)
- Timer events and state changes (debug level)
- Clipboard operations and failures (info level)

### Metrics
- Session creation success/failure rates
- Timer accuracy measurements
- Component render performance
- Copy action success rates
- User interaction patterns

## Future Considerations

### Potential Enhancements
- Multiple concurrent session support
- Session history and management
- Custom prompt templates
- Advanced timer notifications
- Session sharing capabilities

### Known Limitations
- Single session limitation by design
- Clipboard permissions vary by browser
- Timer accuracy limited by JavaScript execution
- No offline session capability

## Dependencies

### Runtime Dependencies
- React 18+ with hooks support
- @concord-consortium/codap-plugin-api for CODAP integration
- TypeScript for type safety
- Modern browser with fetch API

### Development Dependencies
- Jest for unit testing
- React Testing Library for component testing
- Playwright for E2E testing
- ESLint for code quality
- TypeScript compiler for type checking

## Security Considerations
- Session codes have 40-bit entropy (per PBI 1 security requirements)
- No sensitive data stored in localStorage
- API calls use HTTPS in production
- Clipboard access respects browser permissions

## Rollout Strategy
1. **Development phase**: Local development and unit testing
2. **Integration testing**: Component integration with existing App
3. **Feature branch**: Complete implementation with E2E tests
4. **Review**: Code review and acceptance criteria verification
5. **Merge**: Integration into main branch
6. **Deployment**: Production deployment with monitoring

## References
- [PBI 2 PRD](../docs/delivery/2/prd.md)
- [PBI 1 Relay API Documentation](../docs/delivery/1/prd.md)
- [CODAP Plugin API](https://github.com/concord-consortium/codap-plugin-api)
- [WCAG AA Guidelines](https://www.w3.org/WAI/WCAG21/AA/) 