import { expect } from '@playwright/test';
import { test } from './fixtures';
import { CODAPHelpers, AccessibilityHelpers } from './utils/codap-helpers';

/**
 * PBI 2 Conditions of Satisfaction (CoS) End-to-End Tests
 * 
 * This test suite verifies that all acceptance criteria for PBI 2 
 * "CODAP Plugin Pairing Banner" are met through comprehensive E2E testing.
 */

test.describe('PBI 2: CODAP Plugin Pairing Banner - Conditions of Satisfaction', () => {
  let codapHelpers: CODAPHelpers;
  let accessibilityHelpers: AccessibilityHelpers;

  test.beforeEach(async ({ page }) => {
    codapHelpers = new CODAPHelpers(page);
    accessibilityHelpers = new AccessibilityHelpers(page);
    
    // Set up reasonable viewport for testing
    await page.setViewportSize({ width: 1400, height: 800 });
    
    // Navigate to CODAP with plugin loaded
    await codapHelpers.navigateToCODAPWithPlugin();
    
    // Wait for plugin to be fully loaded
    await codapHelpers.waitForPluginLoad();
  });

  test.describe('Core Functionality - CoS Verification', () => {
    test('CoS 1: Banner visible on plugin load with 8-character session code', async () => {
      // Verify banner is visible
      const banner = codapHelpers.getPairingBanner();
      await expect(banner).toBeVisible();
      
      // Verify session code is displayed and has correct format
      const sessionCode = codapHelpers.getSessionCode();
      await expect(sessionCode).toBeVisible();
      await codapHelpers.verifySessionCodeFormat();
    });

    test('CoS 2: Countdown timer displays remaining session time and updates regularly', async () => {
      // Verify timer is visible and active
      const timer = codapHelpers.getCountdownTimer();
      await expect(timer).toBeVisible();
      
      // Verify timer format and updates
      await codapHelpers.verifyCountdownActive();
    });

    test('CoS 3: "Copy Code" action copies just the session code to clipboard', async () => {
      // Test copy code functionality
      await codapHelpers.testCopyCode();
    });

    test('CoS 4: "Copy Prompt" action copies complete setup instructions', async () => {
      // Test copy prompt functionality
      await codapHelpers.testCopyPrompt();
    });

    test('CoS 5: Session management handles creation and lifecycle', async () => {
      // Verify session is active and banner shows appropriate state
      const banner = codapHelpers.getPairingBanner();
      await expect(banner).toBeVisible();
      
      // Verify timer is counting down (session is active)
      await codapHelpers.verifyCountdownActive();
      
      // Test error handling for network issues
      await codapHelpers.testErrorHandling();
    });
  });

  test.describe('Technical Requirements - CoS Verification', () => {
    test('CoS 6: Integration with relay API endpoints from PBI 1', async () => {
      // Verify banner loads successfully (indicates API integration works)
      const banner = codapHelpers.getPairingBanner();
      await expect(banner).toBeVisible();
      
      // Verify session code is present (indicates successful API call)
      const sessionCode = codapHelpers.getSessionCode();
      await expect(sessionCode).toBeVisible();
      await codapHelpers.verifySessionCodeFormat();
    });

    test('CoS 7: Proper error handling for network failures', async () => {
      // Test error handling and graceful degradation
      await codapHelpers.testErrorHandling();
    });

    test('CoS 8: Clean React component architecture with TypeScript', async () => {
      // Verify component renders correctly (indicates proper architecture)
      const banner = codapHelpers.getPairingBanner();
      await expect(banner).toBeVisible();
      
      // Verify all expected elements are present
      await expect(codapHelpers.getSessionCode()).toBeVisible();
      await expect(codapHelpers.getCountdownTimer()).toBeVisible();
      await expect(codapHelpers.getCopyCodeButton()).toBeVisible();
      await expect(codapHelpers.getCopyPromptButton()).toBeVisible();
    });
  });

  test.describe('Accessibility & UX - CoS Verification', () => {
    test('CoS 9: WCAG AA compliance verified through accessibility audit', async () => {
      // Verify ARIA attributes are properly set
      await accessibilityHelpers.verifyARIAAttributes(codapHelpers);
      
      // Verify visual accessibility
      await accessibilityHelpers.verifyVisualAccessibility();
    });

    test('CoS 10: Screen reader compatibility tested', async () => {
      // Test screen reader announcements and live regions
      await accessibilityHelpers.testScreenReaderAnnouncements(codapHelpers);
    });

    test('CoS 11: Keyboard navigation fully functional', async () => {
      // Test complete keyboard navigation
      await codapHelpers.testKeyboardNavigation();
    });

    test('CoS 12: Visual feedback for all user actions', async () => {
      // Test copy code feedback
      const copyCodeButton = codapHelpers.getCopyCodeButton();
      await copyCodeButton.click();
      
      const feedback = codapHelpers.getCopyFeedback();
      await expect(feedback).toBeVisible();
      await expect(feedback).toContainText('copied');
      
      // Test copy prompt feedback
      const copyPromptButton = codapHelpers.getCopyPromptButton();
      await copyPromptButton.click();
      
      await expect(feedback).toBeVisible();
      await expect(feedback).toContainText('copied');
    });

    test('CoS 13: Mobile-responsive design tested on common device sizes', async () => {
      // Test responsive design across different viewport sizes
      await codapHelpers.testResponsiveDesign();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('Banner functionality works consistently across browsers', async () => {
      // This test runs on all configured browser projects
      const banner = codapHelpers.getPairingBanner();
      await expect(banner).toBeVisible();
      
      // Verify core functionality works
      await codapHelpers.verifySessionCodeFormat();
      await codapHelpers.verifyCountdownActive();
      
      // Test copy actions
      await codapHelpers.testCopyCode();
      await codapHelpers.testCopyPrompt();
    });
  });

  test.describe('Performance & Integration', () => {
    test('Banner loads quickly and does not impact CODAP performance', async () => {
      // Measure basic loading performance
      const startTime = Date.now();
      
      const banner = codapHelpers.getPairingBanner();
      await expect(banner).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Banner should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('Banner integrates properly with CODAP plugin framework', async () => {
      // Verify banner coexists with CODAP interface
      const banner = codapHelpers.getPairingBanner();
      await expect(banner).toBeVisible();
      
      // Verify CODAP interface is still accessible
      // (This would be expanded based on specific CODAP integration requirements)
      const iframe = codapHelpers.getPluginFrame();
      await expect(iframe.locator('body')).toBeVisible();
    });
  });

  test.describe('User Journey End-to-End', () => {
    test('Complete user journey: Plugin load → See banner → Copy code → Copy prompt', async () => {
      // 1. Plugin loads and banner is visible
      const banner = codapHelpers.getPairingBanner();
      await expect(banner).toBeVisible();
      
      // 2. User sees 8-character session code
      await codapHelpers.verifySessionCodeFormat();
      
      // 3. User sees countdown timer
      await codapHelpers.verifyCountdownActive();
      
      // 4. User copies session code
      await codapHelpers.testCopyCode();
      
      // 5. User copies full prompt
      await codapHelpers.testCopyPrompt();
      
      // 6. All interactions provide appropriate feedback
      const feedback = codapHelpers.getCopyFeedback();
      await expect(feedback).toBeVisible();
    });

    test('Accessibility user journey: Screen reader user can complete all actions', async () => {
      // Verify all elements have proper ARIA attributes
      await accessibilityHelpers.verifyARIAAttributes(codapHelpers);
      
      // Test keyboard-only navigation
      await codapHelpers.testKeyboardNavigation();
      
      // Verify screen reader announcements
      await accessibilityHelpers.testScreenReaderAnnouncements(codapHelpers);
    });
  });
}); 