/**
 * local-file.spec.js
 *
 * Tests for the local file sync working mode (File System Access API path).
 *
 * All File System Access API calls (showOpenFilePicker, showSaveFilePicker) are
 * replaced with in-memory mocks via injectFileMock() before the page loads.
 * IndexedDB is bypassed by patching LocalFileAdapter.restoreHandle() after load.
 *
 * Settings are opened by calling UI.showSettings() directly via page.evaluate()
 * to avoid fragile gear-icon selector searches — the same code path as clicking
 * the button.
 */

import { test, expect } from '@playwright/test';
import { injectFileMock, patchRestoreHandle } from './helpers/mock-file-api.js';

// ---------------------------------------------------------------------------
// Global setup — runs before every test in this file
// ---------------------------------------------------------------------------

// Skip the tutorial before page load so the modal never blocks interactions.
// Mirrors what TutorialManager.skip() sets in localStorage.
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('brainPieTutorialCompleted', 'true');
    });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open the settings overlay by calling the same JS the gear button calls.
 * Returns when the overlay has the 'active' class (i.e. is visible).
 */
async function openSettings(page) {
    await page.evaluate(() => UI.showSettings());
    // settings-overlay gains class 'active' when open
    await page.locator('#settings-overlay.active').waitFor({ timeout: 3000 });
}

/**
 * Minimal valid BrainPie file payload with one category.
 * Used as seed data for "open existing file" and reload tests.
 */
function makeMinimalPayload(categoryName = 'Test Category') {
    const pieId = 'pie-test-001';
    return {
        meta: {
            pieIds:           [pieId],
            pieNames:         { [pieId]: 'Test Pie' },
            activePieId:      pieId,
            tombstonedPieIds: [],
        },
        pies: {
            [pieId]: {
                id:         pieId,
                name:       'Test Pie',
                categories: [
                    {
                        name:  categoryName,
                        color: '#4a90e2',
                        items: [{ name: 'First spoke', done: false }],
                    },
                ],
                categoryPercentageOverrides: {},
            },
        },
        priorities: {},
    };
}

// ---------------------------------------------------------------------------
// Test 1 — Enable local file mode: create new file
// ---------------------------------------------------------------------------

test('Test 1: enable local file mode with a new file', async ({ page }) => {
    // Track uncaught JS errors throughout the test
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Inject the mock BEFORE the page loads so the API is available immediately
    await injectFileMock(page, null /* empty store */);

    await page.goto('http://localhost:3333');

    // Bypass IndexedDB in restoreHandle (no previously saved handle)
    await patchRestoreHandle(page);
    await page.evaluate(() => { window.__mockRestoreHandle = false; });

    await openSettings(page);

    // The collapsed view should be visible (not already in file mode)
    await expect(page.locator('#local-file-collapsed')).toBeVisible();

    // Click "Save to a local file" — this calls UI.enableLocalFileSync() which
    // shows the expanded panel (no file picked yet)
    await page.locator('#local-file-collapsed button').click();

    // Expanded panel should now be visible
    await expect(page.locator('#local-file-expanded')).toBeVisible();

    // Click "New file" — this calls UI.createLocalFile() → LocalFileAdapter.createFile()
    // which calls showSaveFilePicker() (our mock) and then writes current state
    await page.locator('#local-file-expanded button:has-text("New file")').click();

    // Wait for the status text to update (async createFile writes to the store)
    await expect(page.locator('#local-file-status-text')).not.toHaveText('No file selected', { timeout: 5000 });

    // Status line should show the filename from the mock
    const statusText = await page.locator('#local-file-status-text').textContent();
    expect(statusText).toContain('brainpie.json');

    // The mock store should have been written to (even empty data creates the structure)
    const storeData = await page.evaluate(() => window.__mockFileStore.data);
    expect(storeData).not.toBeNull();

    // localStorage should reflect that local file sync is enabled
    const lsFlag = await page.evaluate(() => localStorage.getItem('localFileSyncEnabled'));
    expect(lsFlag).toBe('true');

    // No uncaught JS errors
    expect(pageErrors).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Test 2 — Enable local file mode: open existing file
// ---------------------------------------------------------------------------

test('Test 2: enable local file mode with an existing file', async ({ page }) => {
    const payload = makeMinimalPayload('Test Category');

    // Seed the mock store with a valid BrainPie payload
    await injectFileMock(page, payload);

    await page.goto('http://localhost:3333');
    await patchRestoreHandle(page);
    await page.evaluate(() => { window.__mockRestoreHandle = false; });

    await openSettings(page);

    // Enable file mode (show expanded panel)
    await page.locator('#local-file-collapsed button').click();
    await expect(page.locator('#local-file-expanded')).toBeVisible();

    // Set up dialog handler BEFORE clicking so we catch the confirm dialog
    // that LocalFileAdapter.openFile() shows when the file already has data.
    // Playwright auto-accepts confirm() dialogs unless we override, but we
    // register explicitly to be sure.
    page.on('dialog', (dialog) => dialog.accept());

    // Click "Choose file" → showOpenFilePicker() → returns mock handle
    await page.locator('#local-file-expanded button:has-text("Choose file")').click();

    // After loading the file, the app should render "Test Category" somewhere
    // (DataModel.categories is updated and App.render() is called)
    await expect(page.locator('text=Test Category')).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 3 — Data persists across reload (mock store survives because we re-seed)
// ---------------------------------------------------------------------------

test('Test 3: data written to file is visible after reload', async ({ page }) => {
    // Start with empty store — the app will create initial structure
    await injectFileMock(page, null);

    await page.goto('http://localhost:3333');
    await patchRestoreHandle(page);
    await page.evaluate(() => { window.__mockRestoreHandle = false; });

    await openSettings(page);

    // Enable file mode and create a new file
    await page.locator('#local-file-collapsed button').click();
    await page.locator('#local-file-expanded button:has-text("New file")').click();
    await expect(page.locator('#local-file-status-text')).not.toHaveText('No file selected', { timeout: 5000 });

    // Programmatically add a category via DataModel + App.save()
    await page.evaluate(async () => {
        const newCat = {
            name:  'Reload Test Category',
            color: '#e24a4a',
            items: [],
        };
        DataModel.categories.push(newCat);
        // savePie persists to the active adapter (file in this case)
        const activePieId = DataModel.getActivePieId();
        await StorageAdapter.savePie(activePieId, {
            id:                          activePieId,
            name:                        DataModel.currentPieName,
            categories:                  DataModel.categories,
            categoryPercentageOverrides: DataModel.categoryPercentageOverrides || {},
            priorityList:                DataModel.priorityList || [],
        });
        App.render();
    });

    // Capture the store content so we can re-seed on reload
    const storedData = await page.evaluate(() => window.__mockFileStore.data);
    expect(storedData).not.toBeNull();
    expect(JSON.stringify(storedData)).toContain('Reload Test Category');

    // Reload the page, re-seeding the mock store AND restoreHandle so file mode
    // is automatically resumed (localFileSyncEnabled is already in localStorage)
    await injectFileMock(page, storedData);
    await page.reload();

    // After reload, patch restoreHandle to return true (simulating IndexedDB hit)
    await patchRestoreHandle(page);
    // __mockRestoreHandle is already true by default in injectFileMock

    // The category should be visible in the re-rendered pie
    await expect(page.locator('text=Reload Test Category')).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 4 — Unsupported browser: no showOpenFilePicker
// ---------------------------------------------------------------------------

test('Test 4: unsupported browser shows fallback, no JS errors', async ({ page }) => {
    // Track uncaught JS errors
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Remove the File System Access API BEFORE page load
    await page.addInitScript(() => {
        delete window.showOpenFilePicker;
        delete window.showSaveFilePicker;
    });

    await page.goto('http://localhost:3333');

    await openSettings(page);

    // The unsupported notice should be visible
    const unsupported = page.locator('#local-file-unsupported');
    await expect(unsupported).toBeVisible({ timeout: 3000 });

    // The collapsed panel (with the enable button) should be hidden
    const collapsed = page.locator('#local-file-collapsed');
    await expect(collapsed).not.toBeVisible();

    // No uncaught JS errors
    expect(pageErrors).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Test 5 — File is written on every save
// ---------------------------------------------------------------------------

test('Test 5: adding a category writes it to the mock file store', async ({ page }) => {
    await injectFileMock(page, null);

    await page.goto('http://localhost:3333');
    await patchRestoreHandle(page);
    await page.evaluate(() => { window.__mockRestoreHandle = false; });

    await openSettings(page);

    // Enable file mode + create new file
    await page.locator('#local-file-collapsed button').click();
    await page.locator('#local-file-expanded button:has-text("New file")').click();
    await expect(page.locator('#local-file-status-text')).not.toHaveText('No file selected', { timeout: 5000 });

    // Add a category via DataModel and save
    await page.evaluate(async () => {
        const newCat = {
            name:  'Save Test Category',
            color: '#4ae24a',
            items: [],
        };
        DataModel.categories.push(newCat);
        const activePieId = DataModel.getActivePieId();
        await StorageAdapter.savePie(activePieId, {
            id:                          activePieId,
            name:                        DataModel.currentPieName,
            categories:                  DataModel.categories,
            categoryPercentageOverrides: DataModel.categoryPercentageOverrides || {},
            priorityList:                DataModel.priorityList || [],
        });
    });

    // Verify the file store now contains the new category
    const storeData = await page.evaluate(() => window.__mockFileStore.data);
    expect(storeData).not.toBeNull();

    // The pies section of the file should contain our category name
    const rawJson = JSON.stringify(storeData);
    expect(rawJson).toContain('Save Test Category');
});
