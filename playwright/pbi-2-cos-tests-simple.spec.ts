import { expect } from "@playwright/test";
import { test } from "./fixtures";
import { CODAPHelpers } from "./utils/codap-helpers";

/**
 * Simplified PBI 2 E2E Tests
 * Tests the actual banner behavior and states
 */

test.describe("PBI 2: CODAP Plugin Pairing Banner - Simplified E2E Tests", () => {
  let codapHelpers: CODAPHelpers;

  test.beforeEach(async ({ page }) => {
    codapHelpers = new CODAPHelpers(page);
    
    // Set up viewport for testing
    await page.setViewportSize({ width: 1400, height: 800 });
    
    // Navigate to CODAP with plugin loaded
    await codapHelpers.navigateToCODAPWithPlugin();
    
    // Wait for plugin to be fully loaded
    await codapHelpers.waitForPluginLoad();
  });

  test("Basic banner visibility and structure", async () => {
    // Verify banner is visible
    const banner = codapHelpers.getPairingBanner();
    await expect(banner).toBeVisible();
    
    // Verify banner has proper ARIA attributes
    await expect(banner).toHaveAttribute("role", "region");
    await expect(banner).toHaveAttribute("aria-labelledby");
  });

  test("Banner shows idle state initially", async () => {
    const banner = codapHelpers.getPairingBanner();
    await expect(banner).toBeVisible();
    
    // Check for idle state class
    await expect(banner).toHaveClass(/pairing-banner--idle/);
    
    // Look for "Create Session" button in idle state
    const createButton = codapHelpers.getPluginFrame().locator(".pairing-banner-start-btn");
    await expect(createButton).toBeVisible();
    await expect(createButton).toContainText("Create Session");
  });

  test("Banner can transition to loading state", async () => {
    const banner = codapHelpers.getPairingBanner();
    await expect(banner).toBeVisible();
    
    // Click create session button
    const createButton = codapHelpers.getPluginFrame().locator(".pairing-banner-start-btn");
    await createButton.click();
    
    // Banner should transition to loading state
    await expect(banner).toHaveClass(/pairing-banner--loading/);
  });

  test("Banner handles session creation flow", async ({ page }) => {
    const banner = codapHelpers.getPairingBanner();
    await expect(banner).toBeVisible();
    
    // Click create session button
    const createButton = codapHelpers.getPluginFrame().locator(".pairing-banner-start-btn");
    await createButton.click();
    
    // Wait for either success or error state (with extended timeout)
    await page.waitForTimeout(5000);
    
    // Check if we got to success state (session created successfully)
    const isSuccess = await banner.locator(".pairing-banner--success").isVisible();
    const isError = await banner.locator(".pairing-banner--error").isVisible();
    
    // One of these states should be active
    expect(isSuccess || isError).toBe(true);
    
    if (isSuccess) {
      // If successful, verify session elements are present
      const sessionCode = codapHelpers.getPluginFrame().locator(".pairing-banner-session-code");
      const timer = codapHelpers.getPluginFrame().locator(".pairing-banner-timer");
      
      await expect(sessionCode).toBeVisible();
      await expect(timer).toBeVisible();
      
      // Verify copy buttons are present
      const copyCodeButton = codapHelpers.getPluginFrame().locator(".pairing-banner-copy-button--code");
      const copyPromptButton = codapHelpers.getPluginFrame().locator(".pairing-banner-copy-button--prompt");
      
      await expect(copyCodeButton).toBeVisible();
      await expect(copyPromptButton).toBeVisible();
    } else if (isError) {
      // If error, verify error message is shown
      const errorMessage = codapHelpers.getPluginFrame().locator(".pairing-banner-error");
      await expect(errorMessage).toBeVisible();
      
      // Verify retry button is present
      const retryButton = codapHelpers.getPluginFrame().locator(".pairing-banner-retry-btn");
      await expect(retryButton).toBeVisible();
    }
  });

  test("Banner is responsive", async ({ page }) => {
    const banner = codapHelpers.getPairingBanner();
    await expect(banner).toBeVisible();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(banner).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(banner).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(banner).toBeVisible();
  });

  test("Banner has proper accessibility attributes", async () => {
    const banner = codapHelpers.getPairingBanner();
    await expect(banner).toBeVisible();
    
    // Verify main accessibility attributes
    await expect(banner).toHaveAttribute("role", "region");
    await expect(banner).toHaveAttribute("aria-labelledby");
    await expect(banner).toHaveAttribute("aria-describedby");
    
    // Verify live region exists for announcements
    const liveRegion = codapHelpers.getPluginFrame().locator("[aria-live]");
    const count = await liveRegion.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Banner integrates properly with CODAP", async () => {
    // Verify CODAP iframe is present
    const iframe = codapHelpers.getPluginFrame();
    await expect(iframe.locator("body")).toBeVisible();
    
    // Verify our plugin app is loaded
    await expect(iframe.locator(".App")).toBeVisible();
    
    // Verify banner is part of the app
    const banner = codapHelpers.getPairingBanner();
    await expect(banner).toBeVisible();
    
    // Verify other CODAP plugin elements are also present
    await expect(iframe.locator(".title")).toContainText("CODAP MCP Plugin");
  });

  test("Banner performance - loads within reasonable time", async () => {
    const startTime = Date.now();
    
    const banner = codapHelpers.getPairingBanner();
    await expect(banner).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Banner should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
}); 
