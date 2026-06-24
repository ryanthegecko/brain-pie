/**
 * pro-features.spec.js
 *
 * Tests for all Pro-tier feature gates in BrainPie.
 *
 * Pro features covered:
 *   1. Multiple Pies — creating a second pie requires Pro
 *   2. Transform — the Transform tool requires Pro
 *   3. Import from Google Calendar — requires Pro
 *   4. Import from Google Tasks — requires Pro
 *
 * Gate mechanism:
 *   - Free: License._active = false (default; no localStorage key set)
 *   - Pro:  localStorage.setItem('brainPie_pro', 'true') before load
 *             → License.init() sets _active = true
 *             → document.body gets class 'pro-active'
 *
 * For each feature we test two scenarios:
 *   a) Pro active — the feature opens / works
 *   b) Free tier — the license upgrade modal is shown instead
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Global setup — runs before every test in this file
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        // Start clean — no tutorial, no license key by default
        localStorage.clear();
        localStorage.setItem('brainPieTutorialCompleted', 'true');
    });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate and wait for the app to finish its async init.
 * Mirrors the helper used in core.spec.js.
 */
async function gotoApp(page) {
    await page.goto('http://localhost:3333');
    await page.waitForFunction(() =>
        typeof DataModel !== 'undefined' &&
        typeof DataModel.categories !== 'undefined',
        { timeout: 5000 }
    );
}

/**
 * Navigate to the app with Pro activated.
 * The 'brainPie_pro' key is the developer bypass — License.init() reads it
 * and sets _active = true without a network call.
 */
async function gotoAppPro(page) {
    // Must be set before the page loads so License.init() picks it up
    await page.addInitScript(() => {
        localStorage.setItem('brainPie_pro', 'true');
    });
    await gotoApp(page);
}

/**
 * Open Settings via the same JS the gear button calls.
 */
async function openSettings(page) {
    await page.evaluate(() => UI.showSettings());
    await page.locator('#settings-overlay.active').waitFor({ timeout: 3000 });
}

// ---------------------------------------------------------------------------
// Test 21 — Multiple Pies: Pro user can create a second pie
// ---------------------------------------------------------------------------

test('Test 21: Pro user can create a second pie', async ({ page }) => {
    await gotoAppPro(page);

    // Confirm Pro is active
    const isPro = await page.evaluate(() => License.isActive());
    expect(isPro).toBe(true);

    // There is already one pie from the example data.
    // Stub window.prompt so we don't need real keyboard input in the dialog.
    await page.evaluate(() => {
        window.prompt = () => 'My Second Pie';
    });

    // Click the '+' tab to trigger promptNewPie()
    await page.locator('.pie-tab-add').click();

    // Wait for the second pie to appear
    await page.waitForFunction(() =>
        DataModel.pieMeta && DataModel.pieMeta.pieIds.length >= 2,
        { timeout: 5000 }
    );

    const pieCount = await page.evaluate(() => DataModel.pieMeta.pieIds.length);
    expect(pieCount).toBeGreaterThanOrEqual(2);

    // The license modal should NOT have appeared
    const licenseVisible = await page.evaluate(() =>
        document.getElementById('license-overlay')?.classList.contains('active') ?? false
    );
    expect(licenseVisible).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 22 — Multiple Pies: free user sees upgrade modal on second pie attempt
// ---------------------------------------------------------------------------

test('Test 22: free user sees upgrade modal when trying to create a second pie', async ({ page }) => {
    await gotoApp(page); // No Pro key

    // Free tier is the default
    const isPro = await page.evaluate(() => License.isActive());
    expect(isPro).toBe(false);

    // The '+' tab should exist but have the upgrade-tooltip styling
    const addBtn = page.locator('.pie-tab-add');
    await expect(addBtn).toBeVisible({ timeout: 3000 });

    // Verify the button has the dimmed appearance (opacity set in renderPieTabs)
    const opacity = await addBtn.evaluate(el => el.style.opacity);
    expect(opacity).toBe('0.4');

    // Click the '+' tab — should open the license modal, NOT create a pie
    const pieCountBefore = await page.evaluate(() => DataModel.pieMeta.pieIds.length);

    await addBtn.click();

    // License overlay should now be active
    await expect(page.locator('#license-overlay.active')).toBeVisible({ timeout: 3000 });

    // Pie count should be unchanged
    const pieCountAfter = await page.evaluate(() => DataModel.pieMeta.pieIds.length);
    expect(pieCountAfter).toBe(pieCountBefore);
});

// ---------------------------------------------------------------------------
// Test 23 — Transform: Pro user can open the Transform overlay
// ---------------------------------------------------------------------------

test('Test 23: Pro user can open the Transform overlay', async ({ page }) => {
    await gotoAppPro(page);

    // Open Settings to access the Pro buttons
    await openSettings(page);

    // Target the specific Transform button in Settings by its pro-gate class.
    // (There is also a 'Transform' execute button inside the transform overlay,
    //  so we must avoid the ambiguous :has-text selector.)
    const transformBtn = page.locator('button.pro-gate:has-text("Transform")');
    await expect(transformBtn).toBeVisible({ timeout: 3000 });

    await transformBtn.click();

    // Transform overlay should become active; Settings should close
    await expect(page.locator('#transform-overlay.active')).toBeVisible({ timeout: 3000 });

    // License modal should NOT have appeared
    const licenseVisible = await page.evaluate(() =>
        document.getElementById('license-overlay')?.classList.contains('active') ?? false
    );
    expect(licenseVisible).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 24 — Transform: free user sees upgrade modal
// ---------------------------------------------------------------------------

test('Test 24: free user sees upgrade modal when clicking Transform', async ({ page }) => {
    await gotoApp(page);

    await openSettings(page);

    // Same specific selector as Test 23 — avoids the execute button collision
    const transformBtn = page.locator('button.pro-gate:has-text("Transform")');
    await expect(transformBtn).toBeVisible({ timeout: 3000 });

    await transformBtn.click();

    // License overlay must appear
    await expect(page.locator('#license-overlay.active')).toBeVisible({ timeout: 3000 });

    // Transform overlay must NOT have opened
    const transformActive = await page.evaluate(() =>
        document.getElementById('transform-overlay')?.classList.contains('active') ?? false
    );
    expect(transformActive).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 25 — Calendar Import: Pro user — requirePro calls showCalendarImport
// ---------------------------------------------------------------------------

test('Test 25: Pro user — requirePro calls showCalendarImport (not the license modal)', async ({ page }) => {
    await gotoAppPro(page);

    // Stub showCalendarImport so we can detect it was called without needing
    // a Google sign-in (that method exits early with an alert if not signed in)
    await page.evaluate(() => {
        window.__calendarImportCalled = false;
        UI.showCalendarImport = function () {
            window.__calendarImportCalled = true;
        };
    });

    // Call requirePro directly — same path as the button's onclick
    await page.evaluate(() => UI.requirePro('showCalendarImport'));

    const wasCalled = await page.evaluate(() => window.__calendarImportCalled);
    expect(wasCalled).toBe(true);

    // License modal should not have appeared
    const licenseVisible = await page.evaluate(() =>
        document.getElementById('license-overlay')?.classList.contains('active') ?? false
    );
    expect(licenseVisible).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 26 — Calendar Import: free user sees upgrade modal
// ---------------------------------------------------------------------------

test('Test 26: free user sees upgrade modal when trying to use Calendar Import', async ({ page }) => {
    await gotoApp(page);

    // Stub showCalendarImport so we can detect an incorrect call
    await page.evaluate(() => {
        window.__calendarImportCalled = false;
        UI.showCalendarImport = function () {
            window.__calendarImportCalled = true;
        };
    });

    await page.evaluate(() => UI.requirePro('showCalendarImport'));

    // License modal must appear
    await expect(page.locator('#license-overlay.active')).toBeVisible({ timeout: 3000 });

    // The actual import method must NOT have been called
    const wasCalled = await page.evaluate(() => window.__calendarImportCalled);
    expect(wasCalled).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 27 — Tasks Import: Pro user — requirePro calls showTasksImport
// ---------------------------------------------------------------------------

test('Test 27: Pro user — requirePro calls showTasksImport (not the license modal)', async ({ page }) => {
    await gotoAppPro(page);

    // Stub showTasksImport to detect the call without needing Google sign-in
    await page.evaluate(() => {
        window.__tasksImportCalled = false;
        UI.showTasksImport = function () {
            window.__tasksImportCalled = true;
        };
    });

    await page.evaluate(() => UI.requirePro('showTasksImport'));

    const wasCalled = await page.evaluate(() => window.__tasksImportCalled);
    expect(wasCalled).toBe(true);

    const licenseVisible = await page.evaluate(() =>
        document.getElementById('license-overlay')?.classList.contains('active') ?? false
    );
    expect(licenseVisible).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 28 — Tasks Import: free user sees upgrade modal
// ---------------------------------------------------------------------------

test('Test 28: free user sees upgrade modal when trying to use Tasks Import', async ({ page }) => {
    await gotoApp(page);

    await page.evaluate(() => {
        window.__tasksImportCalled = false;
        UI.showTasksImport = function () {
            window.__tasksImportCalled = true;
        };
    });

    await page.evaluate(() => UI.requirePro('showTasksImport'));

    await expect(page.locator('#license-overlay.active')).toBeVisible({ timeout: 3000 });

    const wasCalled = await page.evaluate(() => window.__tasksImportCalled);
    expect(wasCalled).toBe(false);
});

// ---------------------------------------------------------------------------
// Test 29 — Pro activation: brainPie_pro flag adds pro-active class to body
// ---------------------------------------------------------------------------

test('Test 29: brainPie_pro flag activates Pro and adds pro-active class to body', async ({ page }) => {
    await gotoAppPro(page);

    const bodyHasClass = await page.evaluate(() =>
        document.body.classList.contains('pro-active')
    );
    expect(bodyHasClass).toBe(true);

    const licenseActive = await page.evaluate(() => License.isActive());
    expect(licenseActive).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 30 — Free tier: body does not have pro-active class
// ---------------------------------------------------------------------------

test('Test 30: free tier does not add pro-active class to body', async ({ page }) => {
    await gotoApp(page); // No Pro key

    const bodyHasClass = await page.evaluate(() =>
        document.body.classList.contains('pro-active')
    );
    expect(bodyHasClass).toBe(false);

    const licenseActive = await page.evaluate(() => License.isActive());
    expect(licenseActive).toBe(false);
});
