/**
 * mock-file-api.js
 *
 * Injects a fake File System Access API before the page scripts run, replacing
 * showOpenFilePicker / showSaveFilePicker with in-memory implementations.
 *
 * The mock store is exposed as window.__mockFileStore so tests can read or
 * assert on it via page.evaluate().
 *
 * NOTE: addInitScript callbacks run in the browser context. They cannot close
 * over Node.js variables — pass data via the second argument (serialised by
 * Playwright as JSON).
 */

/**
 * Inject mock File System Access API.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object|null} initialContent
 *   The parsed JSON object to pre-seed the file with, or null for empty.
 *   Mirrors the BrainPie file format: { meta, pies, priorities }.
 */
export async function injectFileMock(page, initialContent = null) {
    await page.addInitScript((content) => {
        // ----------------------------------------------------------------
        // In-memory store — shared between openPicker and savePicker mocks
        // ----------------------------------------------------------------
        const store = {
            // The "file contents" as a parsed JS object (null = empty file)
            data: content,
            name: 'brainpie.json',
        };

        // Expose so tests can read/assert via page.evaluate()
        window.__mockFileStore = store;

        // ----------------------------------------------------------------
        // Factory that builds a FileSystemFileHandle-shaped mock object
        // ----------------------------------------------------------------
        const makeHandle = () => ({
            name: store.name,
            kind: 'file',

            // Permission queries must be plain functions (not async) so that
            // IndexedDB can clone the handle object without a DataCloneError.
            queryPermission:   () => Promise.resolve('granted'),
            requestPermission: () => Promise.resolve('granted'),

            // getFile() returns a File whose text is the serialised store data
            getFile: async () => new File(
                [store.data ? JSON.stringify(store.data) : ''],
                store.name,
                { type: 'application/json' }
            ),

            // createWritable() returns a writable-stream mock that parses
            // incoming text back into the store
            createWritable: async () => ({
                write: async (text) => {
                    // text may be a string or a Blob depending on caller
                    const raw = typeof text === 'string' ? text : await text.text();
                    store.data = JSON.parse(raw);
                },
                close: async () => {},
            }),
        });

        // ----------------------------------------------------------------
        // Replace the real File System Access API pickers with our mocks
        // ----------------------------------------------------------------

        // showOpenFilePicker is called by LocalFileAdapter.openFile()
        window.showOpenFilePicker = async (_opts) => [makeHandle()];

        // showSaveFilePicker is called by LocalFileAdapter.createFile()
        window.showSaveFilePicker = async (_opts) => makeHandle();

        // ----------------------------------------------------------------
        // Flag checked by the restoreHandle patch below
        // ----------------------------------------------------------------
        // Set to true by default so tests that don't care about restore
        // can skip the IndexedDB dance.
        window.__mockRestoreHandle = true;

    }, initialContent);
}

/**
 * Patch LocalFileAdapter.restoreHandle() after the page has loaded.
 *
 * The real implementation reads from IndexedDB (which is unavailable /
 * unreliable in headless tests). This replacement skips IndexedDB entirely
 * and honours window.__mockRestoreHandle instead.
 *
 * Call this AFTER page.goto() so that LocalFileAdapter is in scope.
 *
 * @param {import('@playwright/test').Page} page
 */
export async function patchRestoreHandle(page) {
    await page.evaluate(() => {
        // Replace restoreHandle with a version that reads the mock store
        // instead of IndexedDB.
        LocalFileAdapter.restoreHandle = async function () {
            if (!window.__mockRestoreHandle) return false;

            // Simulate retrieving the handle from storage
            const handles = await window.showOpenFilePicker();
            this._handle = handles[0];
            return true;
        };

        // IndexedDB cannot clone function objects (DataCloneError), so any
        // attempt to persist our mock handle will throw and abort createFile().
        // Stub out the save and load so they are no-ops in tests.
        LocalFileAdapter._saveHandleToDB = async function () {};
        LocalFileAdapter._loadHandleFromDB = async function () { return null; };
    });
}
