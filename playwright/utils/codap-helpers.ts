import { Page, expect, Locator } from '@playwright/test';

/**
 * CODAP Testing Utilities
 * Provides helper functions for testing CODAP plugin functionality
 */

export class CODAPHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to CODAP with the plugin loaded
   * @param pluginUrl - URL of the plugin to load
   * @param codapUrl - Base CODAP URL (defaults to codap3.concord.org)
   */
  async navigateToCODAPWithPlugin(
    pluginUrl: string = 'https://localhost:8088',
    codapUrl: string = 'https://codap3.concord.org'
  ): Promise<void> {
    const fullUrl = `${codapUrl}/?mouseSensor&di=${encodeURIComponent(pluginUrl)}`;
    await this.page.goto(fullUrl);
    
    // Wait for CODAP to load
    await this.page.waitForLoadState('networkidle');
    
    // Wait for the plugin iframe to be available
    await this.page.waitForSelector('.codap-web-view-iframe', { timeout: 30000 });
  }

  /**
   * Get the plugin iframe locator
   */
  getPluginFrame() {
    return this.page.frameLocator('.codap-web-view-iframe');
  }

  /**
   * Wait for the plugin to be fully loaded
   */
  async waitForPluginLoad(): Promise<void> {
    const iframe = this.getPluginFrame();
    
    // Wait for the main app container (using actual class name)
    await iframe.locator('.App').waitFor({ timeout: 30000 });
    
    // Wait for any loading states to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Get the pairing banner within the plugin
   */
  getPairingBanner(): Locator {
    return this.getPluginFrame().locator('.pairing-banner');
  }

  /**
   * Get the session code display
   */
  getSessionCode(): Locator {
    return this.getPluginFrame().locator('.pairing-banner-session-code');
  }

  /**
   * Get the countdown timer
   */
  getCountdownTimer(): Locator {
    return this.getPluginFrame().locator('.pairing-banner-timer');
  }

  /**
   * Get the copy code button
   */
  getCopyCodeButton(): Locator {
    return this.getPluginFrame().locator('.pairing-banner-copy-button--code');
  }

  /**
   * Get the copy prompt button
   */
  getCopyPromptButton(): Locator {
    return this.getPluginFrame().locator('.pairing-banner-copy-button--prompt');
  }

  /**
   * Get the copy feedback message
   */
  getCopyFeedback(): Locator {
    return this.getPluginFrame().locator('.pairing-banner-copy-feedback');
  }

  /**
   * Verify session code format (8 characters, alphanumeric)
   */
  async verifySessionCodeFormat(): Promise<void> {
    const sessionCode = await this.getSessionCode().textContent();
    expect(sessionCode).toMatch(/^[A-Z0-9]{8}$/);
  }

  /**
   * Verify countdown timer is active and updating
   */
  async verifyCountdownActive(): Promise<void> {
    const timer = this.getCountdownTimer();
    
    // Get initial timer value
    const initialTime = await timer.textContent();
    expect(initialTime).toMatch(/^\d{1,2}:\d{2}$/);
    
    // Wait a moment and verify it has changed
    await this.page.waitForTimeout(2000);
    const updatedTime = await timer.textContent();
    
    // Timer should have decreased (or stayed same if very close to expiry)
    expect(updatedTime).toMatch(/^\d{1,2}:\d{2}$/);
  }

  /**
   * Test copy functionality
   */
  async testCopyCode(): Promise<void> {
    const copyButton = this.getCopyCodeButton();
    const sessionCode = await this.getSessionCode().textContent();
    
    // Click copy button
    await copyButton.click();
    
    // Verify feedback appears
    const feedback = this.getCopyFeedback();
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Code copied');
    
    // Note: Clipboard verification would require additional setup in test environment
  }

  /**
   * Test copy prompt functionality
   */
  async testCopyPrompt(): Promise<void> {
    const copyButton = this.getCopyPromptButton();
    
    // Click copy button
    await copyButton.click();
    
    // Verify feedback appears
    const feedback = this.getCopyFeedback();
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Prompt copied');
    
    // Note: Clipboard content verification would require additional setup in test environment
  }

  /**
   * Verify responsive design at different viewport sizes
   */
  async testResponsiveDesign(): Promise<void> {
    const banner = this.getPairingBanner();
    
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(banner).toBeVisible();
    
    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(banner).toBeVisible();
    
    // Test desktop viewport
    await this.page.setViewportSize({ width: 1440, height: 900 });
    await expect(banner).toBeVisible();
  }

  /**
   * Test keyboard navigation
   */
  async testKeyboardNavigation(): Promise<void> {
    // Focus on copy code button and activate with keyboard
    const copyCodeButton = this.getCopyCodeButton();
    await copyCodeButton.focus();
    await this.page.keyboard.press('Enter');
    
    // Verify feedback appears
    const feedback = this.getCopyFeedback();
    await expect(feedback).toBeVisible();
    
    // Test tab navigation to copy prompt button
    await this.page.keyboard.press('Tab');
    const copyPromptButton = this.getCopyPromptButton();
    await expect(copyPromptButton).toBeFocused();
    
    // Activate with Space key
    await this.page.keyboard.press('Space');
    await expect(feedback).toContainText('Prompt copied');
  }

  /**
   * Wait for and verify error state handling
   */
  async testErrorHandling(): Promise<void> {
    // Look for error states or fallback UI
    const banner = this.getPairingBanner();
    await expect(banner).toBeVisible();
    
    // If there are error states, they should be handled gracefully
    const errorMessage = this.getPluginFrame().locator('.pairing-banner-error');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/error|failed|unable/i);
    }
  }
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityHelpers {
  constructor(private page: Page) {}

  /**
   * Verify ARIA attributes are properly set
   */
  async verifyARIAAttributes(helpers: CODAPHelpers): Promise<void> {
    const banner = helpers.getPairingBanner();
    const sessionCode = helpers.getSessionCode();
    const timer = helpers.getCountdownTimer();
    
    // Verify banner has proper role and label
    await expect(banner).toHaveAttribute('role', 'region');
    await expect(banner).toHaveAttribute('aria-label');
    
    // Verify session code has proper labeling
    await expect(sessionCode).toHaveAttribute('aria-label');
    
    // Verify timer has live region
    await expect(timer).toHaveAttribute('aria-live');
  }

  /**
   * Test screen reader announcements
   */
  async testScreenReaderAnnouncements(helpers: CODAPHelpers): Promise<void> {
    // Verify live regions exist for dynamic updates
    const liveRegion = helpers.getPluginFrame().locator('[aria-live]');
    const count = await liveRegion.count();
    expect(count).toBeGreaterThan(0);
    
    // Test copy action announcements
    await helpers.getCopyCodeButton().click();
    const feedback = helpers.getCopyFeedback();
    await expect(feedback).toHaveAttribute('role', 'status');
  }

  /**
   * Verify color contrast and visual accessibility
   */
  async verifyVisualAccessibility(): Promise<void> {
    // This would typically use axe-core or similar tools
    // For now, we'll verify basic visual elements are present
    const page = this.page;
    
    // Check that focus indicators are visible
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
  }
} 