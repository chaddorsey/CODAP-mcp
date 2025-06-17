import { useState, useEffect, useRef, useCallback } from 'react';
import { formatTimer, FormattedTime, TimerStatus } from '../utils/timeFormat';

/**
 * Configuration options for the countdown hook
 */
export interface CountdownConfig {
  /** Update interval in milliseconds (default: 1000) */
  interval?: number;
  /** Whether to auto-start the timer (default: true) */
  autoStart?: boolean;
  /** Callback when timer reaches zero */
  onExpire?: () => void;
  /** Callback when timer status changes */
  onStatusChange?: (status: TimerStatus) => void;
  /** Callback for accessibility announcements */
  onAnnouncement?: (message: string) => void;
}

/**
 * Interface for countdown hook return value
 */
export interface CountdownReturn {
  /** Current formatted time information */
  time: FormattedTime;
  /** Whether the timer is currently running */
  isRunning: boolean;
  /** Whether the timer has expired */
  isExpired: boolean;
  /** Start the countdown timer */
  start: () => void;
  /** Pause the countdown timer */
  pause: () => void;
  /** Reset timer to initial duration */
  reset: () => void;
  /** Update the timer with new remaining time */
  updateTimer: (newRemainingSeconds: number) => void;
}

/**
 * Custom hook for countdown timer functionality
 * @param initialSeconds - Initial time in seconds
 * @param config - Configuration options
 * @returns Countdown state and control functions
 */
export function useCountdown(
  initialSeconds: number,
  config: CountdownConfig = {}
): CountdownReturn {
  const {
    interval = 1000,
    autoStart = true,
    onExpire,
    onStatusChange,
    onAnnouncement
  } = config;

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart && initialSeconds > 0);
  const [totalSeconds] = useState(initialSeconds);
  
  // Use refs to store timer and previous values
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousSecondsRef = useRef<number>(initialSeconds);
  const previousStatusRef = useRef<TimerStatus>(TimerStatus.ACTIVE);

  /**
   * Clears the active timer interval
   */
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Starts the countdown timer
   */
  const start = useCallback(() => {
    if (remainingSeconds > 0) {
      setIsRunning(true);
    }
  }, [remainingSeconds]);

  /**
   * Pauses the countdown timer
   */
  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  /**
   * Resets timer to initial value
   */
  const reset = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds(initialSeconds);
    previousSecondsRef.current = initialSeconds;
    clearTimer();
  }, [initialSeconds, clearTimer]);

  /**
   * Updates timer with new remaining time (for session renewal)
   */
  const updateTimer = useCallback((newRemainingSeconds: number) => {
    const prevSeconds = remainingSeconds;
    setRemainingSeconds(newRemainingSeconds);
    previousSecondsRef.current = prevSeconds; // Store previous value for announcement logic
    
    // Auto-start if timer was running and new time is valid
    if (newRemainingSeconds > 0 && isRunning) {
      setIsRunning(true);
    }
  }, [remainingSeconds, isRunning]);

  /**
   * Timer tick effect - handles countdown logic
   */
  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          const newSeconds = Math.max(0, prev - 1);
          
          // Check if timer expired
          if (newSeconds === 0) {
            setIsRunning(false);
            onExpire?.();
          }
          
          return newSeconds;
        });
      }, interval);
    } else {
      clearTimer();
    }

    // Cleanup on unmount or when conditions change
    return () => clearTimer();
  }, [isRunning, remainingSeconds, interval, onExpire, clearTimer]);

  /**
   * Status change and announcement effect
   */
  useEffect(() => {
    const currentTime = formatTimer(remainingSeconds, totalSeconds, previousSecondsRef.current);
    
    // Check for status changes
    if (currentTime.status !== previousStatusRef.current) {
      previousStatusRef.current = currentTime.status;
      onStatusChange?.(currentTime.status);
    }
    
    // Handle accessibility announcements
    if (currentTime.shouldAnnounce && onAnnouncement) {
      import('../utils/timeFormat').then(({ getAccessibleTimeMessage }) => {
        const message = getAccessibleTimeMessage(currentTime);
        onAnnouncement(message);
      });
    }
    
    // Update previous seconds for next comparison
    previousSecondsRef.current = remainingSeconds;
  }, [remainingSeconds, totalSeconds, onStatusChange, onAnnouncement]);

  /**
   * Cleanup effect for component unmount
   */
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // Generate current time object
  const time = formatTimer(remainingSeconds, totalSeconds, previousSecondsRef.current);
  const isExpired = remainingSeconds <= 0;

  return {
    time,
    isRunning,
    isExpired,
    start,
    pause,
    reset,
    updateTimer
  };
} 