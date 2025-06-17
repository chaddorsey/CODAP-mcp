import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createSessionService, SessionService, SessionServiceError } from '../services';
import { PairingBannerProps, BannerState, PairingBannerState } from './types';
import { SessionData } from '../services/types';
import { useCountdown } from '../hooks/useCountdown';
import { TimerStatus } from '../utils/timeFormat';
import './PairingBanner.css';

/**
 * Default relay base URL - can be overridden via props
 */
const DEFAULT_RELAY_BASE_URL = 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app';

/**
 * PairingBanner component displays session information and manages session lifecycle
 */
export const PairingBanner: React.FC<PairingBannerProps> = ({
  relayBaseUrl = DEFAULT_RELAY_BASE_URL,
  onSessionCreated,
  onError,
  className = '',
  autoStart = true
}) => {
  // Component state using the defined state interface
  const [bannerState, setBannerState] = useState<PairingBannerState>({
    state: BannerState.IDLE,
    sessionData: null,
    errorMessage: null,
    retrying: false
  });

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
    bannerState.sessionData?.ttl || 0,
    {
      autoStart: false, // We'll start manually when session is created
      onExpire: () => {
        setBannerState(prev => ({
          ...prev,
          sessionData: null,
          errorMessage: 'Session has expired'
        }));
        onError?.(new Error('Session expired'));
      },
      onStatusChange: (status: TimerStatus) => {
        // Could add visual indicator changes based on timer status
        console.log('Timer status changed:', status);
      },
      onAnnouncement: (message: string) => {
        // Accessibility announcements
        console.log('Timer announcement:', message);
      }
    }
  );

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
        : 'Failed to create session';

      setBannerState({
        state: BannerState.ERROR,
        sessionData: null,
        errorMessage,
        retrying: false
      });

      // Call error callback if provided
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [sessionService, onSessionCreated, onError]);

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
   * Renders loading state
   */
  const renderLoadingState = () => (
    <div className="pairing-banner-content">
      <div className="pairing-banner-spinner" aria-label="Creating session">
        🔄
      </div>
      <div className="pairing-banner-message">
        {bannerState.retrying ? 'Retrying session creation...' : 'Creating session...'}
      </div>
    </div>
  );

  /**
   * Renders success state with session information
   */
  const renderSuccessState = () => {
    const { sessionData } = bannerState;
    if (!sessionData) return null;

    return (
      <div className="pairing-banner-content">
        <div className="pairing-banner-header">
          <span className="pairing-banner-icon">🔗</span>
          <span className="pairing-banner-title">Session Ready</span>
        </div>
        <div className="pairing-banner-session">
          <div className="pairing-banner-code-label">Session Code:</div>
          <div className="pairing-banner-code" role="text" aria-label={`Session code: ${sessionData.code}`}>
            {sessionData.code}
          </div>
        </div>
        <div className="pairing-banner-info">
          <div className={`pairing-banner-timer pairing-banner-timer--${countdown.time.status}`}>
            <span className="pairing-banner-timer-label">Time remaining:</span>
            <span className="pairing-banner-timer-display" aria-live="polite">
              {countdown.time.display}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders error state with retry option
   */
  const renderErrorState = () => (
    <div className="pairing-banner-content">
      <div className="pairing-banner-header">
        <span className="pairing-banner-icon">❌</span>
        <span className="pairing-banner-title">Session Error</span>
      </div>
      <div className="pairing-banner-error">
        {bannerState.errorMessage || 'An unknown error occurred'}
      </div>
      <div className="pairing-banner-actions">
        <button 
          className="pairing-banner-retry-btn"
          onClick={handleRetry}
          type="button"
          aria-label="Retry session creation"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  /**
   * Renders idle state with manual start option
   */
  const renderIdleState = () => (
    <div className="pairing-banner-content">
      <div className="pairing-banner-header">
        <span className="pairing-banner-icon">⚡</span>
        <span className="pairing-banner-title">CODAP MCP Pairing</span>
      </div>
      <div className="pairing-banner-message">
        Ready to create a new session for LLM pairing
      </div>
      <div className="pairing-banner-actions">
        <button 
          className="pairing-banner-start-btn"
          onClick={createSession}
          type="button"
          aria-label="Start session creation"
        >
          Create Session
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
      className={`pairing-banner pairing-banner--${bannerState.state} ${className}`}
      role="banner"
      aria-live="polite"
      aria-label="Session pairing banner"
    >
      {renderContent()}
    </div>
  );
};

export default PairingBanner; 