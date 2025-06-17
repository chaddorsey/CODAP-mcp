/**
 * Time formatting utilities for countdown timer
 */

/**
 * Timer status enumeration
 */
export enum TimerStatus {
  ACTIVE = "active",
  WARNING = "warning", 
  CRITICAL = "critical",
  EXPIRED = "expired"
}

/**
 * Interface for formatted time display
 */
export interface FormattedTime {
  /** Formatted time string (e.g., "09:45", "1:23:45") */
  display: string;
  /** Current timer status based on remaining time */
  status: TimerStatus;
  /** Raw seconds remaining */
  seconds: number;
  /** Whether time should be announced to screen readers */
  shouldAnnounce: boolean;
}

/**
 * Formats seconds into MM:SS or HH:MM:SS format
 * @param totalSeconds - Total seconds to format
 * @returns Formatted time string
 */
export function formatTimeDisplay(totalSeconds: number): string {
  // Handle negative values or zero
  if (totalSeconds <= 0) {
    return "00:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format with leading zeros
  const formatNumber = (num: number): string => num.toString().padStart(2, "0");

  if (hours > 0) {
    return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(seconds)}`;
  } else {
    return `${formatNumber(minutes)}:${formatNumber(seconds)}`;
  }
}

/**
 * Determines timer status based on remaining time
 * @param remainingSeconds - Seconds remaining
 * @param totalSeconds - Total session duration
 * @returns Timer status
 */
export function getTimerStatus(remainingSeconds: number, totalSeconds: number): TimerStatus {
  if (remainingSeconds <= 0) {
    return TimerStatus.EXPIRED;
  }

  const percentRemaining = remainingSeconds / totalSeconds;

  if (percentRemaining <= 0.1) { // Less than 10% remaining
    return TimerStatus.CRITICAL;
  } else if (percentRemaining <= 0.25) { // Less than 25% remaining
    return TimerStatus.WARNING;
  } else {
    return TimerStatus.ACTIVE;
  }
}

/**
 * Determines if timer should announce to screen readers
 * @param remainingSeconds - Seconds remaining
 * @param previousSeconds - Previous seconds value
 * @returns Whether to announce time update
 */
export function shouldAnnounceTime(remainingSeconds: number, previousSeconds: number): boolean {
  // Announce at critical milestones
  const criticalTimes = [600, 300, 120, 60, 30, 10]; // 10min, 5min, 2min, 1min, 30s, 10s
  
  return criticalTimes.some(time => 
    previousSeconds > time && remainingSeconds <= time
  );
}

/**
 * Creates complete formatted time object with all necessary information
 * @param remainingSeconds - Seconds remaining
 * @param totalSeconds - Total session duration
 * @param previousSeconds - Previous seconds value for announcement logic
 * @returns Complete formatted time object
 */
export function formatTimer(
  remainingSeconds: number, 
  totalSeconds: number, 
  previousSeconds?: number
): FormattedTime {
  const display = formatTimeDisplay(remainingSeconds);
  const status = getTimerStatus(remainingSeconds, totalSeconds);
  const shouldAnnounce = previousSeconds !== undefined 
    ? shouldAnnounceTime(remainingSeconds, previousSeconds)
    : false;

  return {
    display,
    status,
    seconds: remainingSeconds,
    shouldAnnounce
  };
}

/**
 * Converts time remaining message for screen readers
 * @param formattedTime - Formatted time object
 * @returns Screen reader friendly message
 */
export function getAccessibleTimeMessage(formattedTime: FormattedTime): string {
  const { display, status, seconds } = formattedTime;
  
  if (status === TimerStatus.EXPIRED) {
    return "Session has expired";
  }

  if (status === TimerStatus.CRITICAL) {
    return `Warning: Only ${display} remaining in session`;
  }

  if (status === TimerStatus.WARNING) {
    return `Session expires in ${display}`;
  }

  // For ACTIVE status, provide appropriate messages
  if (seconds <= 120) { // 2 minutes or less, show exact time
    return `${display} remaining`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes} minutes remaining in session`;
} 
