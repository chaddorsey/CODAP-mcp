import {
  generateTimerAnnouncement,
  generateCopyActionDescription,
  generateCopyFeedback,
  handleKeyboardActivation,
  createAriaId,
  formatTimeForScreenReader,
  isFocusable,
  KEYBOARD_CODES,
  ARIA_LIVE_LEVELS,
  CONTRAST_RATIOS
} from "../../utils/accessibility";

describe("Accessibility Utils", () => {
  describe("generateTimerAnnouncement", () => {
    it("should generate expired announcement", () => {
      const result = generateTimerAnnouncement("00:00", "expired");
      expect(result).toBe("Session has expired. Please create a new session.");
    });

    it("should generate critical announcement", () => {
      const result = generateTimerAnnouncement("01:30", "critical");
      expect(result).toBe("Critical: Only 01:30 remaining in session");
    });

    it("should generate warning announcement", () => {
      const result = generateTimerAnnouncement("05:00", "warning");
      expect(result).toBe("Warning: Session expires in 05:00");
    });

    it("should generate milestone announcement for active state", () => {
      const result = generateTimerAnnouncement("08:00", "active", true);
      expect(result).toBe("Session time remaining: 08:00");
    });

    it("should return empty string for active state without milestone", () => {
      const result = generateTimerAnnouncement("08:00", "active", false);
      expect(result).toBe("");
    });
  });

  describe("generateCopyActionDescription", () => {
    it("should generate code copy description with session code", () => {
      const result = generateCopyActionDescription("code", "ABC123XY");
      expect(result).toBe("Copy session code ABC123XY to clipboard for sharing with AI assistant");
    });

    it("should generate code copy description without session code", () => {
      const result = generateCopyActionDescription("code");
      expect(result).toBe("Copy session code  to clipboard for sharing with AI assistant");
    });

    it("should generate instructions copy description", () => {
      const result = generateCopyActionDescription("instructions");
      expect(result).toBe("Copy complete setup instructions including session code and connection details to clipboard");
    });
  });

  describe("generateCopyFeedback", () => {
    it("should generate success feedback for code copy", () => {
      const result = generateCopyFeedback(true, "code");
      expect(result).toBe("Session code copied to clipboard successfully");
    });

    it("should generate success feedback for instructions copy", () => {
      const result = generateCopyFeedback(true, "instructions");
      expect(result).toBe("Setup instructions copied to clipboard successfully");
    });

    it("should generate error feedback for code copy", () => {
      const result = generateCopyFeedback(false, "code", "Permission denied");
      expect(result).toBe("Failed to copy session code: Permission denied");
    });

    it("should generate error feedback without specific error", () => {
      const result = generateCopyFeedback(false, "instructions");
      expect(result).toBe("Failed to copy setup instructions: Unknown error");
    });
  });

  describe("handleKeyboardActivation", () => {
    let mockCallback: jest.Mock;
    let mockEvent: Partial<React.KeyboardEvent>;

    beforeEach(() => {
      mockCallback = jest.fn();
      mockEvent = {
        preventDefault: jest.fn()
      };
    });

    it("should call callback on Enter key", () => {
      mockEvent.code = KEYBOARD_CODES.ENTER;
      handleKeyboardActivation(mockEvent as React.KeyboardEvent, mockCallback);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });

    it("should call callback on Space key", () => {
      mockEvent.code = KEYBOARD_CODES.SPACE;
      handleKeyboardActivation(mockEvent as React.KeyboardEvent, mockCallback);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalled();
    });

    it("should not call callback on other keys", () => {
      mockEvent.code = KEYBOARD_CODES.ESCAPE;
      handleKeyboardActivation(mockEvent as React.KeyboardEvent, mockCallback);
      
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe("createAriaId", () => {
    it("should create unique ID with prefix", () => {
      const id1 = createAriaId("test");
      const id2 = createAriaId("test");
      
      expect(id1).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it("should create unique ID with prefix and suffix", () => {
      const id = createAriaId("banner", "title");
      expect(id).toMatch(/^banner-\d+-[a-z0-9]+-title$/);
    });
  });

  describe("formatTimeForScreenReader", () => {
    it("should format MM:SS time display", () => {
      const result = formatTimeForScreenReader("09:45");
      expect(result).toBe("9 minutes and 45 seconds");
    });

    it("should format HH:MM:SS time display", () => {
      const result = formatTimeForScreenReader("01:30:15");
      expect(result).toBe("1 hours, 30 minutes and 15 seconds");
    });

    it("should handle single digit minutes and seconds", () => {
      const result = formatTimeForScreenReader("05:03");
      expect(result).toBe("5 minutes and 3 seconds");
    });

    it("should return original string for invalid format", () => {
      const result = formatTimeForScreenReader("invalid");
      expect(result).toBe("invalid");
    });
  });

  describe("isFocusable", () => {
    let mockElement: Partial<HTMLElement>;

    beforeEach(() => {
      mockElement = {
        tabIndex: 0,
        hasAttribute: jest.fn(),
        getAttribute: jest.fn(),
        tagName: "BUTTON"
      };
    });

    it("should return true for focusable button", () => {
      const result = isFocusable(mockElement as HTMLElement);
      expect(result).toBe(true);
    });

    it("should return false for negative tabIndex", () => {
      mockElement.tabIndex = -1;
      const result = isFocusable(mockElement as HTMLElement);
      expect(result).toBe(false);
    });

    it("should return false for disabled element", () => {
      (mockElement.hasAttribute as jest.Mock).mockImplementation((attr) => attr === "disabled");
      const result = isFocusable(mockElement as HTMLElement);
      expect(result).toBe(false);
    });

    it("should return false for aria-hidden element", () => {
      (mockElement.getAttribute as jest.Mock).mockImplementation((attr) => 
        attr === "aria-hidden" ? "true" : null
      );
      const result = isFocusable(mockElement as HTMLElement);
      expect(result).toBe(false);
    });

    it("should return true for div with positive tabIndex", () => {
      const divElement = {
        tabIndex: 1,
        hasAttribute: jest.fn().mockReturnValue(false),
        getAttribute: jest.fn().mockReturnValue(null),
        tagName: "DIV"
      } as unknown as HTMLElement;
      
      const result = isFocusable(divElement);
      expect(result).toBe(true);
    });
  });

  describe("Constants", () => {
    it("should have correct keyboard codes", () => {
      expect(KEYBOARD_CODES.ENTER).toBe("Enter");
      expect(KEYBOARD_CODES.SPACE).toBe(" ");
      expect(KEYBOARD_CODES.ESCAPE).toBe("Escape");
    });

    it("should have correct ARIA live levels", () => {
      expect(ARIA_LIVE_LEVELS.OFF).toBe("off");
      expect(ARIA_LIVE_LEVELS.POLITE).toBe("polite");
      expect(ARIA_LIVE_LEVELS.ASSERTIVE).toBe("assertive");
    });

    it("should have correct contrast ratios", () => {
      expect(CONTRAST_RATIOS.AA_NORMAL).toBe(4.5);
      expect(CONTRAST_RATIOS.AA_LARGE).toBe(3.0);
      expect(CONTRAST_RATIOS.AAA_NORMAL).toBe(7.0);
      expect(CONTRAST_RATIOS.AAA_LARGE).toBe(4.5);
    });
  });
}); 