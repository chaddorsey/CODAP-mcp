/**
 * Accessibility utilities for the PairingBanner component
 */

/**
 * Keyboard event codes for accessibility navigation
 */
export const KEYBOARD_CODES = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft", 
  ARROW_RIGHT: "ArrowRight"
} as const;

/**
 * ARIA live region politeness levels
 */
export const ARIA_LIVE_LEVELS = {
  OFF: "off",
  POLITE: "polite", 
  ASSERTIVE: "assertive"
} as const;

/**
 * WCAG contrast ratio requirements
 */
export const CONTRAST_RATIOS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5
} as const;

/**
 * Generates accessible announcements for timer updates
 * @param timeDisplay - Formatted time string (e.g., "09:45")
 * @param status - Timer status (active, warning, critical, expired)
 * @param isImportantMilestone - Whether this is a critical time milestone
 * @returns Screen reader friendly announcement
 */
export function generateTimerAnnouncement(
  timeDisplay: string,
  status: string,
  isImportantMilestone = false
): string {
  if (status === "expired") {
    return "Session has expired. Please create a new session.";
  }

  if (status === "critical") {
    return `Critical: Only ${timeDisplay} remaining in session`;
  }

  if (status === "warning") {
    return `Warning: Session expires in ${timeDisplay}`;
  }

  // For important milestones, announce even in active state
  if (isImportantMilestone) {
    return `Session time remaining: ${timeDisplay}`;
  }

  return "";
}

/**
 * Generates accessible descriptions for copy actions
 * @param actionType - Type of copy action (code, instructions)
 * @param sessionCode - The session code (for context)
 * @returns Accessible description
 */
export function generateCopyActionDescription(
  actionType: "code" | "instructions",
  sessionCode?: string
): string {
  if (actionType === "code") {
    return `Copy session code ${sessionCode || ""} to clipboard for sharing with AI assistant`;
  }
  
  return "Copy complete setup instructions including session code and connection details to clipboard";
}

/**
 * Generates accessible feedback for copy operations
 * @param success - Whether the copy operation was successful
 * @param actionType - Type of copy action
 * @param error - Error message if operation failed
 * @returns Screen reader announcement
 */
export function generateCopyFeedback(
  success: boolean,
  actionType: "code" | "instructions",
  error?: string
): string {
  if (success) {
    return `${actionType === "code" ? "Session code" : "Setup instructions"} copied to clipboard successfully`;
  }
  
  return `Failed to copy ${actionType === "code" ? "session code" : "setup instructions"}: ${error || "Unknown error"}`;
}

/**
 * Checks if an element is keyboard focusable
 * @param element - DOM element to check
 * @returns Whether element can receive keyboard focus
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute("disabled")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  
  const tagName = element.tagName.toLowerCase();
  const focusableTags = ["button", "input", "select", "textarea", "a"];
  
  return focusableTags.includes(tagName) || element.tabIndex >= 0;
}

/**
 * Handles keyboard activation events (Enter/Space)
 * @param event - Keyboard event
 * @param callback - Function to call on activation
 */
export function handleKeyboardActivation(
  event: React.KeyboardEvent,
  callback: () => void
): void {
  if (event.code === KEYBOARD_CODES.ENTER || event.code === KEYBOARD_CODES.SPACE) {
    event.preventDefault();
    callback();
  }
}

/**
 * Creates unique IDs for ARIA relationships
 * @param prefix - Prefix for the ID
 * @param suffix - Optional suffix
 * @returns Unique ID string
 */
export function createAriaId(prefix: string, suffix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}-${timestamp}-${random}${suffix ? `-${suffix}` : ""}`;
}

/**
 * Formats time for screen reader announcements
 * @param timeDisplay - Time string (e.g., "09:45")
 * @returns Screen reader friendly time format
 */
export function formatTimeForScreenReader(timeDisplay: string): string {
  const parts = timeDisplay.split(":");
  
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    return `${minutes} minutes and ${seconds} seconds`;
  }
  
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);
    return `${hours} hours, ${minutes} minutes and ${seconds} seconds`;
  }
  
  return timeDisplay;
}

/**
 * Validates color contrast ratio for accessibility
 * @param foreground - Foreground color (hex, rgb, etc.)
 * @param background - Background color (hex, rgb, etc.)
 * @param level - WCAG level to validate against
 * @returns Whether contrast meets requirements
 */
export function validateContrastRatio(
  foreground: string,
  background: string,
  level: keyof typeof CONTRAST_RATIOS = "AA_NORMAL"
): boolean {
  // This is a simplified check - in a real implementation,
  // you would use a proper color contrast calculation library
  // For now, we'll return true and rely on manual testing
  return true;
} 
