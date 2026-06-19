/**
 * settings-ui.spec.js
 *
 * Tests for the settings overlay UI state — which panels are shown/hidden
 * based on storage configuration.
 *
 * These tests do NOT exercise any real storage operations. They only assert
 * that the correct DOM sections are visible or hidden depending on the
 * state of localStorage and the StorageAdapter at the time Settings opens.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('brainPieTutorialCompleted', 'true');
    });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open the Settings overlay via JS (same as clicking the gear button).
 */
async function openSettings(page) {
    await page.evaluate(() => UI.showSettings());
    await page.locator('#settings-overlay.active').waitFor({ timeout: 3000 });
}

// ---------------------------------------------------------------------------
// Test 10 — Working mode toggle shows/hides file controls
// ---------------------------------------------------------------------------

test('Test 10: local file toggle expands / collapses file controls', async ({ page }) => {
    // Remove the File System Access API so we don't accidentally rely on it
    // (we're just testing visibility toggling here — the actual file picker
    // is not called)
    await page.addInitScript(() => {
        // Keep the API present but make it a no-op so the toggle is enabled
        window.showOpenFilePicker  = async () => { throw new DOMException('User cancelled', 'AbortError'); };
        window.showSaveFilePicker  = async () => { throw new DOMException('User cancelled', 'AbortError'); };
    });

    await page.goto('http://localhost:3333');

    await openSettings(page);

    // Initially: collapsed panel visible, expanded panel hidden
    await expect(page.locator('#local-file-collapsed')).toBeVisible();
    await expect(page.locator('#local-file-expanded')).not.toBeVisible();

    // Click the toggle button ("Save to a local file")
    await page.locator('#local-file-collapsed button').click();

    // Now: expanded panel visible, collapsed panel hidden
    await expect(page.locator('#local-file-expanded')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('#local-file-collapsed')).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 11 — Cloud backup: unconfigured state
// ---------------------------------------------------------------------------

test('Test 11: unconfigured Firebase shows Configure button, hides Back up now', async ({ page }) => {
    // No Firebase config in localStorage (default state)
    await page.goto('http://localhost:3333');

    await openSettings(page);

    // "Configure Firebase" button should be visible (inside cloud-backup-unconfigured)
    const configureBtn = page.locator('#cloud-backup-unconfigured button:has-text("Configure Firebase")');
    await expect(configureBtn).toBeVisible({ timeout: 3000 });

    // The backup controls panel (which contains "Back up now") should NOT be visible
    await expect(page.locator('#cloud-backup-controls')).not.toBeVisible();

    // "Back up now" button should therefore not be visible
    const backupBtn = page.locator('button:has-text("Back up now")');
    await expect(backupBtn).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 12 — Cloud backup: configured + connected state
// ---------------------------------------------------------------------------

test('Test 12: configured Firebase shows Back up now and Restore from backup', async ({ page }) => {
    // Seed localStorage to simulate a previously configured + signed-in state
    await page.addInitScript(() => {
        localStorage.setItem('firebaseBackupEnabled', 'true');
        localStorage.setItem('brainPieFirebaseConfig', JSON.stringify({
            apiKey:        'fake-api-key',
            authDomain:    'mock-project.firebaseapp.com',
            databaseURL:   'https://mock-project-default-rtdb.firebaseio.com',
            projectId:     'mock-project',
            storageBucket: 'mock-project.appspot.com',
        }));
    });

    await page.goto('http://localhost:3333');

    // Inject Firebase mock so hasFirebaseBackup() returns true
    await page.evaluate(() => {
        window.__firebasePushLog = [];
        const mock = {
            isConnected:     () => true,
            user:            { uid: 'test-uid', displayName: 'Test User', photoURL: null, email: 'test@example.com' },
            config:          { projectId: 'mock-project' },
            savePie:         async (id, data) => window.__firebasePushLog.push({ type: 'pie', id, data }),
            saveMeta:        async (meta)      => window.__firebasePushLog.push({ type: 'meta', meta }),
            savePriorities:  async (list, id)  => window.__firebasePushLog.push({ type: 'priorities', id, list }),
            loadPie:         async ()          => null,
            loadMeta:        async ()          => null,
            loadPriorities:  async ()          => null,
            loadActivePieId: async ()          => null,
            getProjectId:    ()                => 'mock-project',
            generateShareURL: ()               => null,
        };
        StorageAdapter.backupAdapter      = mock;
        StorageAdapter.hasFirebaseBackup  = () => true;
        StorageAdapter.getLastBackupTimestamp = () => null;
    });

    // Force the controls panel to show (bypasses the auth flow which won't
    // complete without a real Firebase SDK)
    await page.evaluate(() => {
        UI._showCloudBackupPanel('controls');
        UI._updateBackupControls();
    });

    await openSettings(page);

    // Controls panel should be visible (it was forced above)
    await expect(page.locator('#cloud-backup-controls')).toBeVisible({ timeout: 3000 });

    // Both action buttons should be visible
    await expect(page.locator('button:has-text("Back up now")')).toBeVisible();
    await expect(page.locator('button:has-text("Restore from backup")')).toBeVisible();

    // The unconfigured panel should NOT be visible
    await expect(page.locator('#cloud-backup-unconfigured')).not.toBeVisible();
});
