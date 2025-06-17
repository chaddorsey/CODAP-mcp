/**
 * Type definitions for component props and interfaces
 */
import { SessionData } from "../services/types";

/**
 * Props interface for the PairingBanner component
 */
export interface PairingBannerProps {
  /** Optional custom base URL for the relay service */
  relayBaseUrl?: string;
  /** Callback function called when session is successfully created */
  onSessionCreated?: (sessionData: SessionData) => void;
  /** Callback function called when an error occurs */
  onError?: (error: Error) => void;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Whether to auto-start session creation on mount */
  autoStart?: boolean;
}

/**
 * Enumeration of possible banner states
 */
export enum BannerState {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error"
}

/**
 * Internal state interface for the PairingBanner component
 */
export interface PairingBannerState {
  /** Current banner state */
  state: BannerState;
  /** Session data when successfully created */
  sessionData: SessionData | null;
  /** Error message when state is ERROR */
  errorMessage: string | null;
  /** Whether a retry is in progress */
  retrying: boolean;
} 
