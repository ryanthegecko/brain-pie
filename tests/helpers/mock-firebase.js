/**
 * mock-firebase.js
 *
 * Patches StorageAdapter.backupAdapter (and related StorageAdapter methods)
 * with a minimal in-memory mock after the page has loaded.
 *
 * All calls are logged to window.__firebasePushLog so tests can assert on them.
 * Pull responses are seeded via window.__firebasePullData.
 *
 * Call this AFTER page.goto() so that StorageAdapter is in scope.
 */

/**
 * Inject a Firebase mock as StorageAdapter.backupAdapter.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object|null} pullData
 *   Optional seed data to return from load* calls.
 *   Shape: { meta, pie, priorities }
 *   - meta:       object matching BrainPie meta format
 *   - pie:        object to return from loadPie() (single active pie)
 *   - priorities: array to return from loadPriorities()
 */
export async function injectFirebaseMock(page, pullData = null) {
    await page.evaluate((pull) => {
        // Log all push operations here — tests assert on length / contents
        window.__firebasePushLog = [];

        // Seed data for pull operations
        window.__firebasePullData = pull;

        // ----------------------------------------------------------------
        // Minimal Firebase-adapter-shaped mock
        // ----------------------------------------------------------------
        const mock = {
            // isConnected() must return true so StorageAdapter.hasFirebaseBackup()
            // and similar guards don't short-circuit
            isConnected: () => true,

            // Minimal user object (used by _updateBackupControls)
            user: {
                uid:         'test-uid',
                displayName: 'Test User',
                photoURL:    null,
                email:       'test@example.com',
            },

            // Minimal config (used by getProjectId etc.)
            config: { projectId: 'mock-project' },

            // Push methods — just log the call
            savePie: async (id, data) => {
                window.__firebasePushLog.push({ type: 'pie', id, data });
            },
            saveMeta: async (meta) => {
                window.__firebasePushLog.push({ type: 'meta', meta });
            },
            savePriorities: async (list, id) => {
                window.__firebasePushLog.push({ type: 'priorities', id, list });
            },

            // Pull methods — return seeded data or null
            loadPie:        async ()     => window.__firebasePullData?.pie        || null,
            loadMeta:       async ()     => window.__firebasePullData?.meta       || null,
            loadPriorities: async ()     => window.__firebasePullData?.priorities || null,

            // Stubs for methods StorageAdapter may call
            loadActivePieId: async () => null,
            getProjectId:    ()       => 'mock-project',
            generateShareURL: ()      => null,
        };

        // ----------------------------------------------------------------
        // Wire the mock into StorageAdapter
        // ----------------------------------------------------------------
        StorageAdapter.backupAdapter = mock;

        // Override hasFirebaseBackup so the "Back up now" button path opens
        StorageAdapter.hasFirebaseBackup = () => true;

        // Return null timestamp so the "never" → "now" transition is testable
        StorageAdapter.getLastBackupTimestamp = () => null;

    }, pullData);
}
