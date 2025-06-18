import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createSessionService, SessionService, SessionServiceError } from "../services";
import { PairingBannerProps, BannerState, PairingBannerState } from "./types";
import { useCountdown } from "../hooks/useCountdown";
import { TimerStatus } from "../utils/timeFormat";
import { useClipboard } from "../hooks/useClipboard";
import { generateSetupPrompt, generateSessionCodeText } from "../utils/promptGenerator";
import { 
  handleKeyboardActivation, 
  generateTimerAnnouncement, 
  generateCopyActionDescription,
  generateCopyFeedback,
  createAriaId,
  formatTimeForScreenReader
} from "../utils/accessibility";
import { useBrowserWorker } from "../hooks/useBrowserWorker";
import { ConnectionStatus } from "./ConnectionStatus";
import { ToolExecutionStatus } from "./ToolExecutionStatus";
import { ConnectionMetrics } from "./ConnectionMetrics";
import { useExecutionHistory } from "../hooks/useExecutionHistory";
import { usePerformanceMetrics } from "../hooks/usePerformanceMetrics";
import { ConnectionType } from "../services/browserWorker";
import "./PairingBanner.css";
import "../styles/browserWorker.scss";

/**
 * Default relay base URL - can be overridden via props
 */
const DEFAULT_RELAY_BASE_URL = "https://codap-mcp-cdorsey-concordorgs-projects.vercel.app";

/**
 * PairingBanner component displays session information and manages session lifecycle
 */
export const PairingBanner: React.FC<PairingBannerProps> = ({
  relayBaseUrl = DEFAULT_RELAY_BASE_URL,
  onSessionCreated,
  onError,
  className = "",
  autoStart = true
}) => {
  // Component state
  const [bannerState, setBannerState] = useState<PairingBannerState>({
    state: BannerState.IDLE,
    sessionData: null,
    errorMessage: null,
    retrying: false
  });

  // Accessibility state for announcements
  const [announcement, setAnnouncement] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<string>("");
  
  // Refs for ARIA relationships and focus management
  const bannerRef = useRef<HTMLDivElement>(null);
  const announcementRef = useRef<HTMLDivElement>(null);
  const copyFeedbackRef = useRef<HTMLDivElement>(null);
  
  // Generate unique IDs for ARIA relationships
  const ariaIds = useMemo(() => ({
    banner: createAriaId("pairing-banner"),
    title: createAriaId("banner-title"),
    description: createAriaId("banner-description"),
    timer: createAriaId("timer"),
    sessionCode: createAriaId("session-code"),
    actions: createAriaId("banner-actions"),
    announcement: createAriaId("announcement"),
    copyFeedback: createAriaId("copy-feedback")
  }), []);

  // Memoize the session service to prevent unnecessary recreations
  const sessionService = useMemo<SessionService>(() => {
    return createSessionService(relayBaseUrl, {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000
    });
  }, [relayBaseUrl]);

  // Initialize countdown timer with session TTL
  const countdown = useCountdown(
    600, // Default to 10 minutes (600 seconds) - will be updated when session is created
    {
      autoStart: false, // We'll start manually when session is created
      onExpire: () => {
        setBannerState(prev => ({
          ...prev,
          sessionData: null,
          errorMessage: "Session has expired"
        }));
        setAnnouncement("Session has expired. Please create a new session.");
        onError?.(new Error("Session expired"));
      },
      onStatusChange: (status: TimerStatus) => {
        // Generate accessibility announcements for status changes
        const timeDisplay = countdown.time?.display || "0:00";
        const timerAnnouncement = generateTimerAnnouncement(timeDisplay, status, true);
        if (timerAnnouncement) {
          setAnnouncement(timerAnnouncement);
        }
        console.log("Timer status changed:", status);
      },
      onAnnouncement: (message: string) => {
        // Enhanced accessibility announcements
        setAnnouncement(message);
        console.log("Timer announcement:", message);
      }
    }
  );

  // Initialize clipboard functionality
  const clipboard = useClipboard();

  // Browser Worker state management
  const [browserWorkerEnabled, setBrowserWorkerEnabled] = useState(false);
  const [showBrowserWorkerDetails, setShowBrowserWorkerDetails] = useState(false);

  // Initialize browser worker when session is available
  const browserWorker = useBrowserWorker({
    relayBaseUrl,
    sessionCode: bannerState.sessionData?.code || "",
    debug: false,
    autoStart: false, // Manual start when user enables it
    onStatusChange: (status) => {
      console.log("Browser worker status changed:", status);
    },
    onError: (error) => {
      console.error("Browser worker error:", error);
      setAnnouncement(`Browser worker error: ${error.message}`);
    }
  });

  // Initialize execution history tracking
  const executionHistory = useExecutionHistory({
    maxHistorySize: 50,
    persistHistory: true,
    storageKey: "browser-worker-execution-history"
  });

  // Initialize performance metrics tracking
  const performanceMetrics = usePerformanceMetrics({
    samplingInterval: 1000,
    maxDataPoints: 500,
    persistMetrics: true,
    storageKey: "browser-worker-performance-metrics"
  });

  /**
   * Copy session code to clipboard with accessibility support
   */
  const handleCopyCode = useCallback(async () => {
    if (!bannerState.sessionData) return;
    
    const codeText = generateSessionCodeText(bannerState.sessionData.code);
    const result = await clipboard.copyToClipboard(codeText);
    
    // Generate accessible feedback
    const feedback = generateCopyFeedback(result.success, "code", result.error);
    setCopyFeedback(feedback);
    
    // Clear feedback after 3 seconds
    setTimeout(() => setCopyFeedback(""), 3000);
  }, [bannerState.sessionData, clipboard]);

  /**
   * Copy complete setup prompt to clipboard with accessibility support
   */
  const handleCopyPrompt = useCallback(async () => {
    if (!bannerState.sessionData) return;
    
    const promptText = generateSetupPrompt(bannerState.sessionData, {
      relayBaseUrl,
      serviceName: "CODAP Plugin Assistant"
    });
    const result = await clipboard.copyToClipboard(promptText);
    
    // Generate accessible feedback
    const feedback = generateCopyFeedback(result.success, "instructions", result.error);
    setCopyFeedback(feedback);
    
    // Clear feedback after 3 seconds
    setTimeout(() => setCopyFeedback(""), 3000);
  }, [bannerState.sessionData, relayBaseUrl, clipboard]);

  /**
   * Keyboard-accessible copy code handler
   */
  const handleCopyCodeKeyboard = useCallback((event: React.KeyboardEvent) => {
    handleKeyboardActivation(event, handleCopyCode);
  }, [handleCopyCode]);

  /**
   * Keyboard-accessible copy prompt handler
   */
  const handleCopyPromptKeyboard = useCallback((event: React.KeyboardEvent) => {
    handleKeyboardActivation(event, handleCopyPrompt);
  }, [handleCopyPrompt]);

  /**
   * Enable browser worker functionality
   */
  const handleEnableBrowserWorker = useCallback(async () => {
    if (!bannerState.sessionData) return;
    
    setBrowserWorkerEnabled(true);
    try {
      await browserWorker.start();
      setAnnouncement("Browser worker enabled and starting connection");
    } catch (error) {
      console.error("Failed to start browser worker:", error);
      setBrowserWorkerEnabled(false);
      setAnnouncement("Failed to start browser worker");
    }
  }, [bannerState.sessionData, browserWorker]);

  /**
   * Disable browser worker functionality
   */
  const handleDisableBrowserWorker = useCallback(async () => {
    setBrowserWorkerEnabled(false);
    try {
      await browserWorker.stop();
      setAnnouncement("Browser worker disabled");
    } catch (error) {
      console.error("Failed to stop browser worker:", error);
    }
  }, [browserWorker]);

  /**
   * Toggle browser worker details visibility
   */
  const toggleBrowserWorkerDetails = useCallback(() => {
    setShowBrowserWorkerDetails(prev => !prev);
  }, []);

  /**
   * Creates a new session using the SessionService
   */
  const createSession = useCallback(async () => {
    setBannerState(prev => ({
      ...prev,
      state: BannerState.LOADING,
      errorMessage: null,
      retrying: prev.state === BannerState.ERROR
    }));

    try {
      const sessionData = await sessionService.createSession();
      
      setBannerState({
        state: BannerState.SUCCESS,
        sessionData,
        errorMessage: null,
        retrying: false
      });

      // Start countdown timer with session TTL
      countdown.updateTimer(sessionData.ttl);

      // Call success callback if provided
      onSessionCreated?.(sessionData);

    } catch (error) {
      const errorMessage = error instanceof SessionServiceError 
        ? error.message 
        : "Failed to create session";

      setBannerState({
        state: BannerState.ERROR,
        sessionData: null,
        errorMessage,
        retrying: false
      });

      // Call error callback if provided
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [sessionService, onSessionCreated, onError, countdown]);

  /**
   * Handles retry button click
   */
  const handleRetry = useCallback(() => {
    createSession();
  }, [createSession]);

  /**
   * Auto-start session creation on component mount if enabled
   */
  useEffect(() => {
    if (autoStart) {
      createSession();
    }
  }, [autoStart, createSession]);

  /**
   * Renders loading state with accessibility enhancements
   */
  const renderLoadingState = () => (
    <div className="pairing-banner-content" role="status" aria-live="polite">
      <div className="pairing-banner-header">
        <div 
          className="pairing-banner-spinner" 
          aria-label="Creating session"
          role="img"
          aria-describedby={ariaIds.description}
        >
          <span className="pairing-banner-spinner-icon" aria-hidden="true">🔄</span>
        </div>
        <h2 
          id={ariaIds.title}
          className="pairing-banner-title"
        >
          Session Creation
        </h2>
      </div>
      <div 
        id={ariaIds.description}
        className="pairing-banner-message"
        role="status"
        aria-live="polite"
      >
        {bannerState.retrying ? "Retrying session creation..." : "Creating session..."}
      </div>
    </div>
  );

  /**
   * Renders success state with comprehensive accessibility features
   */
  const renderSuccessState = () => {
    const { sessionData } = bannerState;
    if (!sessionData) return null;

    const codeDescription = generateCopyActionDescription("code", sessionData.code);
    const instructionsDescription = generateCopyActionDescription("instructions");

    return (
      <div className="pairing-banner-content">
        <div className="pairing-banner-header">
          <span 
            className="pairing-banner-icon" 
            role="img" 
            aria-label="Session ready"
            aria-hidden="true"
          >
            🔗
          </span>
          <h2 
            id={ariaIds.title}
            className="pairing-banner-title"
          >
            Session Ready
          </h2>
        </div>
        
        <div className="pairing-banner-session">
          <div className="pairing-banner-code-label" id={`${ariaIds.sessionCode}-label`}>
            Session Code:
          </div>
          <div 
            id={ariaIds.sessionCode}
            className="pairing-banner-code" 
            role="text" 
            aria-labelledby={`${ariaIds.sessionCode}-label`}
            aria-describedby={`${ariaIds.sessionCode}-description`}
          >
            {sessionData.code}
          </div>
          <div 
            id={`${ariaIds.sessionCode}-description`}
            className="pairing-banner-code-description sr-only"
          >
            Share this code with your AI assistant to establish a connection
          </div>
        </div>
        
        <div className="pairing-banner-info">
          <div className={`pairing-banner-timer pairing-banner-timer--${countdown.time.status}`}>
            <span className="pairing-banner-timer-label" id={`${ariaIds.timer}-label`}>
              Time remaining:
            </span>
            <span 
              id={ariaIds.timer}
              className="pairing-banner-timer-display" 
              aria-live="polite"
              aria-labelledby={`${ariaIds.timer}-label`}
              aria-describedby={`${ariaIds.timer}-description`}
            >
              {countdown.time.display}
            </span>
            <span 
              id={`${ariaIds.timer}-description`}
              className="sr-only"
            >
              {formatTimeForScreenReader(countdown.time.display)} until session expires
            </span>
          </div>
        </div>
        
        <div 
          id={ariaIds.actions}
          className="pairing-banner-actions"
          role="group"
          aria-labelledby={`${ariaIds.actions}-label`}
        >
          <div id={`${ariaIds.actions}-label`} className="sr-only">
            Copy actions
          </div>
          
          <button
            type="button"
            className="pairing-banner-copy-button pairing-banner-copy-button--code"
            onClick={handleCopyCode}
            onKeyDown={handleCopyCodeKeyboard}
            disabled={clipboard.state.isLoading}
            aria-label={`Copy session code ${sessionData.code} to clipboard`}
            aria-describedby={`${ariaIds.sessionCode}-copy-description`}
          >
            <span aria-hidden="true">
              {clipboard.state.isLoading ? "⏳" : "📋"}
            </span>
            <span>Copy Code</span>
          </button>
          <div 
            id={`${ariaIds.sessionCode}-copy-description`}
            className="sr-only"
          >
            {codeDescription}
          </div>
          
          <button
            type="button"
            className="pairing-banner-copy-button pairing-banner-copy-button--prompt"
            onClick={handleCopyPrompt}
            onKeyDown={handleCopyPromptKeyboard}
            disabled={clipboard.state.isLoading}
            aria-label="Copy complete setup instructions to clipboard"
            aria-describedby="instructions-copy-description"
          >
            <span aria-hidden="true">
              {clipboard.state.isLoading ? "⏳" : "📄"}
            </span>
            <span>Copy Instructions</span>
          </button>
          <div 
            id="instructions-copy-description"
            className="sr-only"
          >
            {instructionsDescription}
          </div>
        </div>

        {/* Browser Worker Section */}
        <div className="browser-worker-section">
          <div className="section-header">
            <h4>Real-time Tool Execution</h4>
            <button
              type="button"
              className="toggle-button"
              onClick={toggleBrowserWorkerDetails}
              aria-label={showBrowserWorkerDetails ? "Hide details" : "Show details"}
              data-testid="show-details"
            >
              {showBrowserWorkerDetails ? "Hide" : "Show"} Details
            </button>
          </div>
          
          <div className="worker-content">
            {!browserWorkerEnabled ? (
              <div className="worker-disabled">
                <p>Enable real-time tool execution to allow LLM assistants to interact directly with CODAP.</p>
                <button
                  type="button"
                  className="enable-button"
                  onClick={handleEnableBrowserWorker}
                  disabled={!bannerState.sessionData}
                  data-testid="enable-browser-worker"
                >
                  Enable Browser Worker
                </button>
              </div>
            ) : (
              <div className="worker-enabled">
                {/* Basic Status Display */}
                <ConnectionStatus
                  connectionStatus={browserWorker.connectionStatus}
                  isRunning={browserWorker.isRunning}
                  isStarting={browserWorker.isStarting}
                  isStopping={browserWorker.isStopping}
                  actions={{
                    start: browserWorker.start,
                    stop: handleDisableBrowserWorker,
                    restart: browserWorker.restart
                  }}
                  showControls={!showBrowserWorkerDetails}
                  className="worker-connection-status"
                />

                {/* Detailed Status Indicators (when details are shown) */}
                {showBrowserWorkerDetails && (
                  <div className="worker-detailed-status">
                    {/* Tool Execution Status */}
                    <ToolExecutionStatus
                      executions={executionHistory.allExecutions}
                      isEnabled={browserWorker.isRunning}
                      queueSize={executionHistory.statistics.queued}
                      maxHistory={10}
                      showDetails={true}
                      className="worker-execution-status"
                    />

                                         {/* Performance Metrics */}
                     <ConnectionMetrics
                       metrics={performanceMetrics.metrics}
                       currentConnectionType={ConnectionType.SSE}
                       showDetails={true}
                       isEnabled={browserWorker.isRunning}
                       className="worker-performance-metrics"
                     />
                  </div>
                )}
                
                {/* Summary View (when details are hidden) */}
                {!showBrowserWorkerDetails && (
                  <div className="worker-summary">
                    <div className="worker-status">
                      Status: {browserWorker.isRunning ? "🟢 Connected" : "🟡 Starting..."}
                    </div>
                    <div className="worker-stats">
                      <span>Queue: {executionHistory.statistics.queued}</span>
                      <span>Success: {executionHistory.statistics.successRate.toFixed(0)}%</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleDisableBrowserWorker}
                      data-testid="disable-browser-worker"
                    >
                      Disable
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders error state with accessibility enhancements
   */
  const renderErrorState = () => (
    <div className="pairing-banner-content" role="alert" aria-live="assertive">
      <div className="pairing-banner-header">
        <span 
          className="pairing-banner-icon" 
          role="img" 
          aria-label="Error"
          aria-hidden="true"
        >
          ❌
        </span>
        <h2 
          id={ariaIds.title}
          className="pairing-banner-title"
        >
          Session Error
        </h2>
      </div>
      <div 
        className="pairing-banner-error"
        id={ariaIds.description}
        role="alert"
      >
        {bannerState.errorMessage || "An unknown error occurred"}
      </div>
      <div className="pairing-banner-actions">
        <button 
          className="pairing-banner-retry-btn"
          onClick={handleRetry}
          onKeyDown={(event) => handleKeyboardActivation(event, handleRetry)}
          type="button"
          aria-label="Retry session creation"
          aria-describedby={ariaIds.description}
        >
          <span aria-hidden="true">🔄</span>
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );

  /**
   * Renders idle state with accessibility enhancements
   */
  const renderIdleState = () => (
    <div className="pairing-banner-content">
      <div className="pairing-banner-header">
        <span 
          className="pairing-banner-icon" 
          role="img" 
          aria-label="Ready to start"
          aria-hidden="true"
        >
          ⚡
        </span>
        <h2 
          id={ariaIds.title}
          className="pairing-banner-title"
        >
          CODAP MCP Pairing
        </h2>
      </div>
      <div 
        className="pairing-banner-message"
        id={ariaIds.description}
      >
        Ready to create a new session for LLM pairing
      </div>
      <div className="pairing-banner-actions">
        <button 
          className="pairing-banner-start-btn"
          onClick={createSession}
          onKeyDown={(event) => handleKeyboardActivation(event, createSession)}
          type="button"
          aria-label="Start session creation"
          aria-describedby={ariaIds.description}
        >
          <span aria-hidden="true">🚀</span>
          <span>Create Session</span>
        </button>
      </div>
    </div>
  );

  /**
   * Renders the appropriate content based on current state
   */
  const renderContent = () => {
    switch (bannerState.state) {
      case BannerState.LOADING:
        return renderLoadingState();
      case BannerState.SUCCESS:
        return renderSuccessState();
      case BannerState.ERROR:
        return renderErrorState();
      case BannerState.IDLE:
      default:
        return renderIdleState();
    }
  };

  return (
    <div 
      ref={bannerRef}
      id={ariaIds.banner}
      className={`pairing-banner pairing-banner--${bannerState.state} ${className}`}
      role="region"
      aria-labelledby={ariaIds.title}
      aria-describedby={ariaIds.description}
      data-testid="pairing-banner"
    >
      {renderContent()}
      
      {/* Accessibility announcement region */}
      <div
        ref={announcementRef}
        id={ariaIds.announcement}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {announcement}
      </div>
      
      {/* Copy feedback announcement region */}
      <div
        ref={copyFeedbackRef}
        id={ariaIds.copyFeedback}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
        role="status"
      >
        {copyFeedback}
      </div>
      
      {/* Visual copy feedback for sighted users */}
      {clipboard.state.lastResult && (
        <div 
          className={`pairing-banner-copy-feedback ${
            clipboard.state.lastResult.success 
              ? "pairing-banner-copy-feedback--success" 
              : "pairing-banner-copy-feedback--error"
          }`}
          role="status"
          aria-live="polite"
        >
          <span aria-hidden="true">
            {clipboard.state.lastResult.success ? "✅" : "❌"}
          </span>
          <span>
            {clipboard.state.lastResult.success 
              ? "Copied to clipboard!" 
              : `Copy failed: ${clipboard.state.lastResult.error}`
            }
          </span>
        </div>
      )}
    </div>
  );
};

export default PairingBanner; 
