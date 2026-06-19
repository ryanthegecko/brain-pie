/**
 * LocalFileAdapter — Brain Pie storage backend using the File System Access API.
 *
 * Lets users pick a local JSON file and read/write it directly in the browser.
 * No account, no backend, no Firebase required.
 *
 * File format — a single JSON object:
 * {
 *   "meta":       { "pieIds": [...], "pieNames": {}, "activePieId": "...", "tombstonedPieIds": [] },
 *   "pies":       { "<pieId>": { ...pie blob... } },
 *   "priorities": { "<pieId>": [ ...priority array... ] }
 * }
 *
 * The FileSystemFileHandle is persisted across page loads via IndexedDB because
 * handles are not serialisable as strings (so localStorage can't hold them).
 * On each page load, we retrieve the stored handle and re-request permission.
 *
 * Real-time subscriptions are not supported (supportsRealtime: false).
 * All subscribe/unsubscribe methods are intentional no-ops.
 */
const LocalFileAdapter = {
    supportsRealtime: false,

    // The active FileSystemFileHandle, or null if none is selected
    _handle: null,

    // IndexedDB database name and store where we persist the file handle
    _DB_NAME: 'BrainPieLocalFile',
    _DB_VERSION: 1,
    _STORE_NAME: 'handles',
    _HANDLE_KEY: 'activeHandle',

    // -----------------------------------------------------------------------
    // IndexedDB helpers
    // -----------------------------------------------------------------------

    /**
     * Open (or create) the IndexedDB database used to store file handles.
     * @returns {Promise<IDBDatabase>}
     */
    _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this._DB_NAME, this._DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this._STORE_NAME)) {
                    db.createObjectStore(this._STORE_NAME);
                }
            };

            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror  = (event) => reject(event.target.error);
        });
    },

    /**
     * Persist a FileSystemFileHandle to IndexedDB so it survives page reloads.
     * @param {FileSystemFileHandle} handle
     */
    async _saveHandleToDB(handle) {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const tx    = db.transaction(this._STORE_NAME, 'readwrite');
                const store = tx.objectStore(this._STORE_NAME);
                const req   = store.put(handle, this._HANDLE_KEY);
                req.onsuccess = () => resolve();
                req.onerror   = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.warn('LocalFileAdapter: could not save handle to IndexedDB:', e.message);
        }
    },

    /**
     * Retrieve the stored FileSystemFileHandle from IndexedDB.
     * Returns null if none exists or the database is unavailable.
     * @returns {Promise<FileSystemFileHandle|null>}
     */
    async _loadHandleFromDB() {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const tx    = db.transaction(this._STORE_NAME, 'readonly');
                const store = tx.objectStore(this._STORE_NAME);
                const req   = store.get(this._HANDLE_KEY);
                req.onsuccess = (e) => resolve(e.target.result || null);
                req.onerror   = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.warn('LocalFileAdapter: could not load handle from IndexedDB:', e.message);
            return null;
        }
    },

    /**
     * Remove the stored handle from IndexedDB (used when local file sync is disabled).
     */
    async _clearHandleFromDB() {
        try {
            const db = await this._openDB();
            return new Promise((resolve, reject) => {
                const tx    = db.transaction(this._STORE_NAME, 'readwrite');
                const store = tx.objectStore(this._STORE_NAME);
                const req   = store.delete(this._HANDLE_KEY);
                req.onsuccess = () => resolve();
                req.onerror   = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.warn('LocalFileAdapter: could not clear handle from IndexedDB:', e.message);
        }
    },

    // -----------------------------------------------------------------------
    // File permission helpers
    // -----------------------------------------------------------------------

    /**
     * Ensure readwrite permission is granted for the given handle.
     * Queries current permission; if not already 'granted', requests it.
     * Returns true if permission is granted, false otherwise.
     * @param {FileSystemFileHandle} handle
     * @returns {Promise<boolean>}
     */
    async _ensurePermission(handle) {
        try {
            const perm = await handle.queryPermission({ mode: 'readwrite' });
            if (perm === 'granted') return true;

            // Permission not yet granted — ask the user (requires a user gesture in
            // some browsers, so this call may silently fail outside one)
            const result = await handle.requestPermission({ mode: 'readwrite' });
            return result === 'granted';
        } catch (e) {
            console.warn('LocalFileAdapter: permission check failed:', e.message);
            return false;
        }
    },

    // -----------------------------------------------------------------------
    // File read / write
    // -----------------------------------------------------------------------

    /**
     * Read and parse the entire BrainPie JSON file.
     * Returns a normalised object { meta, pies, priorities } even if the file
     * is empty or missing those sections.
     * @returns {Promise<{meta: object|null, pies: object, priorities: object}>}
     */
    async _readFile() {
        if (!this._handle) throw new Error('No file handle — call openFile() or createFile() first');

        const file = await this._handle.getFile();
        const text = await file.text();

        let parsed = {};
        if (text.trim()) {
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                console.warn('LocalFileAdapter: file contains invalid JSON, treating as empty:', e.message);
            }
        }

        return {
            meta:       parsed.meta       || null,
            pies:       parsed.pies       || {},
            priorities: parsed.priorities || {}
        };
    },

    /**
     * Write the entire BrainPie JSON file (pretty-printed).
     * Always does a full read-modify-write so unmodified sections are preserved.
     * @param {object} patch - Partial object; keys in patch overwrite the file
     * @returns {Promise<void>}
     */
    async _writeFile(patch) {
        if (!this._handle) throw new Error('No file handle — call openFile() or createFile() first');

        // Read current contents so we only overwrite what changed
        const current = await this._readFile();
        const updated = { ...current, ...patch };

        const writable = await this._handle.createWritable();
        await writable.write(JSON.stringify(updated, null, 2));
        await writable.close();
    },

    // -----------------------------------------------------------------------
    // Handle lifecycle (restoreHandle / openFile / createFile)
    // -----------------------------------------------------------------------

    /**
     * Try to restore the file handle from IndexedDB after a page reload.
     * If a handle is found, re-requests readwrite permission.
     * Returns true if the handle is live and ready, false otherwise.
     *
     * Called by StorageAdapter.init() when localFileSyncEnabled is set.
     * @returns {Promise<boolean>}
     */
    async restoreHandle() {
        const handle = await this._loadHandleFromDB();
        if (!handle) return false;

        const granted = await this._ensurePermission(handle);
        if (!granted) {
            console.warn('LocalFileAdapter: permission not granted on restore — handle discarded');
            return false;
        }

        this._handle = handle;
        return true;
    },

    /**
     * Show the browser's "Open file" picker so the user can select an existing
     * BrainPie JSON file. After the user picks a file:
     *   - If it contains valid BrainPie data, offer to load it (replaces current data)
     *   - If it is empty/new, write the current localStorage data into it
     *
     * Stores the handle in IndexedDB and in this._handle.
     */
    async openFile() {
        let handles;
        try {
            handles = await window.showOpenFilePicker({
                types: [{
                    description: 'BrainPie data',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false
            });
        } catch (e) {
            // User cancelled the picker — not an error
            if (e.name === 'AbortError') return;
            throw e;
        }

        const handle  = handles[0];
        const granted = await this._ensurePermission(handle);
        if (!granted) {
            alert('BrainPie needs read and write access to the file. Please grant permission and try again.');
            return;
        }

        this._handle = handle;
        await this._saveHandleToDB(handle);

        // Read the picked file
        const data = await this._readFile();

        if (data.meta && data.meta.pieIds && data.meta.pieIds.length > 0) {
            // The file already contains BrainPie data — offer to load it
            const shouldLoad = confirm(
                `"${handle.name}" already contains BrainPie data.\n\n` +
                'Load it now? (Your current data will be replaced.)\n\n' +
                'Click Cancel to keep your current data and start syncing from this point forward.'
            );

            if (shouldLoad) {
                await this._loadFileIntoApp(data);
            }
            // Either way, we are now synced to this file
        } else {
            // Empty or unrecognised file — write current app state into it
            await this._writeCurrentStateToFile();
        }

        if (typeof Storage !== 'undefined') {
            Storage.showStatus('Syncing to ' + handle.name, 'success');
        }
    },

    /**
     * Show the browser's "Save file" picker so the user can create a new
     * BrainPie JSON file. Writes current app state into the new file immediately.
     */
    async createFile() {
        let handle;
        try {
            handle = await window.showSaveFilePicker({
                suggestedName: 'brainpie.json',
                types: [{
                    description: 'BrainPie data',
                    accept: { 'application/json': ['.json'] }
                }]
            });
        } catch (e) {
            if (e.name === 'AbortError') return;
            throw e;
        }

        const granted = await this._ensurePermission(handle);
        if (!granted) {
            alert('BrainPie needs read and write access to the file. Please grant permission and try again.');
            return;
        }

        this._handle = handle;
        await this._saveHandleToDB(handle);

        // Bootstrap the new file with current app state
        await this._writeCurrentStateToFile();

        if (typeof Storage !== 'undefined') {
            Storage.showStatus('Created ' + handle.name, 'success');
        }
    },

    /**
     * Load data from a parsed file object into the running app.
     * Used when the user picks an existing file and confirms they want to replace
     * current data with what's in it.
     * @param {{ meta: object, pies: object, priorities: object }} data
     */
    async _loadFileIntoApp(data) {
        if (!data.meta || !data.meta.pieIds) return;

        const pieIds          = Array.isArray(data.meta.pieIds) ? data.meta.pieIds : Object.values(data.meta.pieIds);
        const pieNames        = data.meta.pieNames    || {};
        const tombstonedPieIds = Array.isArray(data.meta.tombstonedPieIds) ? data.meta.tombstonedPieIds : Object.values(data.meta.tombstonedPieIds || []);
        const activePieId     = data.meta.activePieId || pieIds.find(id => !tombstonedPieIds.includes(id)) || pieIds[0];

        // Update local localStorage (DataModel reads from StorageAdapter, which will
        // delegate to this adapter's loadMeta/loadPie, but we also write a local
        // backup so the rest of the app can function if the file is unavailable)
        const metaObj = { pieIds, pieNames, activePieId, tombstonedPieIds };
        if (typeof Storage !== 'undefined') {
            Storage.saveMeta(metaObj);
        }

        // Save each pie to localStorage as backup
        for (const pieId of pieIds) {
            const pieData = data.pies[pieId];
            if (pieData && typeof Storage !== 'undefined') {
                Storage.savePie(pieId, pieData);
            }
        }

        // Update DataModel
        if (typeof DataModel !== 'undefined') {
            DataModel.pieMeta      = metaObj;
            DataModel.setActivePieId(activePieId);
            DataModel.currentPieName = pieNames[activePieId] || 'My Pie';

            const activePie = data.pies[activePieId];
            if (activePie && activePie.categories) {
                DataModel.categories                  = activePie.categories;
                DataModel.categoryPercentageOverrides = activePie.categoryPercentageOverrides || {};
            }

            const priorities = data.priorities[activePieId];
            DataModel.priorityList = Array.isArray(priorities) ? priorities : [];
            if (DataModel.validatePriorityList) DataModel.validatePriorityList();
        }

        if (typeof App !== 'undefined') App.render();
    },

    /**
     * Snapshot the current app state from DataModel / localStorage and write it
     * into the local file. Called when a new file is created, or when an empty
     * existing file is opened.
     */
    async _writeCurrentStateToFile() {
        // Pull current meta from localStorage (DataModel may not yet be initialised
        // when this runs for the first time)
        let meta       = null;
        let pies       = {};
        let priorities = {};

        if (typeof Storage !== 'undefined') {
            meta = Storage.loadMeta();
        }

        if (meta && meta.pieIds) {
            const pieIds = Array.isArray(meta.pieIds) ? meta.pieIds : Object.values(meta.pieIds);
            for (const pieId of pieIds) {
                const pieData = typeof Storage !== 'undefined' ? Storage.loadPie(pieId) : null;
                if (pieData) {
                    // Extract priorities from pie blob into the separate priorities section
                    const { priorityList, ...restPieData } = pieData;
                    pies[pieId] = restPieData;
                    if (Array.isArray(priorityList) && priorityList.length > 0) {
                        priorities[pieId] = priorityList;
                    }
                }
            }
        }

        // Overlay any in-memory priority list from DataModel
        if (typeof DataModel !== 'undefined' && DataModel.priorityList && DataModel.priorityList.length > 0) {
            const activePieId = meta && meta.activePieId;
            if (activePieId) {
                priorities[activePieId] = DataModel.priorityList;
            }
        }

        await this._writeFile({ meta, pies, priorities });
    },

    // -----------------------------------------------------------------------
    // Adapter interface — Meta
    // -----------------------------------------------------------------------

    async saveMeta(meta) {
        if (!this._handle) return false;
        try {
            await this._writeFile({ meta });
            // Keep localStorage in sync as a backup
            if (typeof Storage !== 'undefined') Storage.saveMeta(meta);
            return true;
        } catch (e) {
            console.error('LocalFileAdapter: saveMeta failed:', e.message);
            return false;
        }
    },

    async loadMeta() {
        if (!this._handle) return null;
        try {
            const data = await this._readFile();
            return data.meta || null;
        } catch (e) {
            console.error('LocalFileAdapter: loadMeta failed:', e.message);
            return null;
        }
    },

    // -----------------------------------------------------------------------
    // Adapter interface — Pies
    // -----------------------------------------------------------------------

    async savePie(pieId, pieData) {
        if (!this._handle) return false;
        try {
            const current = await this._readFile();
            // Strip priorityList from the shared pie blob — priorities live under
            // the separate "priorities" key so the format matches Firebase conventions
            const { priorityList, ...restPieData } = pieData;
            current.pies[pieId] = restPieData;

            await this._writeFile({ pies: current.pies });
            // Keep localStorage in sync
            if (typeof Storage !== 'undefined') Storage.savePie(pieId, pieData);
            return true;
        } catch (e) {
            console.error('LocalFileAdapter: savePie failed:', e.message);
            return false;
        }
    },

    async loadPie(pieId) {
        if (!this._handle) return null;
        try {
            const data = await this._readFile();
            return data.pies[pieId] || null;
        } catch (e) {
            console.error('LocalFileAdapter: loadPie failed:', e.message);
            return null;
        }
    },

    async deletePie(pieId) {
        if (!this._handle) return false;
        try {
            const current = await this._readFile();
            delete current.pies[pieId];
            delete current.priorities[pieId];
            await this._writeFile({ pies: current.pies, priorities: current.priorities });
            if (typeof Storage !== 'undefined') Storage.deletePie(pieId);
            return true;
        } catch (e) {
            console.error('LocalFileAdapter: deletePie failed:', e.message);
            return false;
        }
    },

    // -----------------------------------------------------------------------
    // Adapter interface — Priorities
    // -----------------------------------------------------------------------

    async savePriorities(priorityList, pieId) {
        if (!this._handle || !pieId) return false;
        try {
            const current = await this._readFile();
            if (priorityList && priorityList.length > 0) {
                current.priorities[pieId] = priorityList;
            } else {
                delete current.priorities[pieId];
            }
            await this._writeFile({ priorities: current.priorities });
            return true;
        } catch (e) {
            console.error('LocalFileAdapter: savePriorities failed:', e.message);
            return false;
        }
    },

    async loadPriorities(pieId) {
        if (!this._handle || !pieId) return null;
        try {
            const data = await this._readFile();
            const list = data.priorities[pieId];
            return Array.isArray(list) ? list : null;
        } catch (e) {
            console.error('LocalFileAdapter: loadPriorities failed:', e.message);
            return null;
        }
    },

    // -----------------------------------------------------------------------
    // Adapter interface — Legacy single-pie save/load
    // -----------------------------------------------------------------------

    /**
     * Legacy single-pie save (used by StorageAdapter.save()).
     * In file mode we have no meaningful single-pie path, so we just write the
     * data as a pie blob keyed by a sentinel value.
     */
    async save(data) {
        if (!this._handle) return false;
        // Delegate to LocalStorageAdapter.save() as well so legacy callers still work
        if (typeof LocalStorageAdapter !== 'undefined') LocalStorageAdapter.save(data);
        // Also persist to file via the current active pie
        const activePieId = typeof DataModel !== 'undefined' ? DataModel.getActivePieId() : null;
        if (activePieId) {
            await this.savePie(activePieId, data);
        }
        return true;
    },

    /**
     * Legacy single-pie load (used by StorageAdapter.load()).
     * Falls back to localStorage so we never return null unexpectedly.
     */
    async load() {
        if (typeof LocalStorageAdapter !== 'undefined') return LocalStorageAdapter.load();
        return null;
    },

    // -----------------------------------------------------------------------
    // Adapter interface — Migration
    // -----------------------------------------------------------------------

    /**
     * Migrate old single-blob localStorage format to multi-pie.
     * Delegates to LocalStorageAdapter (which handles the localStorage side),
     * then writes the result into the local file.
     */
    async migrateToMultiPie() {
        if (typeof LocalStorageAdapter !== 'undefined') {
            const result = LocalStorageAdapter.migrateToMultiPie();
            // After migration, write the current state into the file
            await this._writeCurrentStateToFile();
            return result;
        }
        return null;
    },

    // -----------------------------------------------------------------------
    // Adapter interface — Real-time subscriptions (all no-ops)
    // -----------------------------------------------------------------------

    subscribeToPie(pieId, callback)        {},
    subscribeToChanges(callback)           {},
    unsubscribeFromChanges()               {},
    subscribeToPriorityChanges(cb, pieId)  {},
    unsubscribeFromPriorityChanges()       {},
    subscribeToMeta(callback)              {},
    unsubscribeFromMeta()                  {},

    // -----------------------------------------------------------------------
    // Adapter interface — Status / metadata
    // -----------------------------------------------------------------------

    /**
     * Returns true if a file handle exists and readwrite permission is granted.
     * @returns {boolean}
     */
    isConnected() {
        return !!this._handle;
    },

    /**
     * No project ID concept for local files.
     * @returns {null}
     */
    getProjectId() {
        return null;
    },

    /**
     * Return the filename of the currently attached file, or null.
     * Useful for the Settings UI status line.
     * @returns {string|null}
     */
    getFileName() {
        return this._handle ? this._handle.name : null;
    },

    /**
     * Discard the active handle and remove it from IndexedDB.
     * Called by StorageAdapter.disableLocalFileSync().
     */
    async clearHandle() {
        this._handle = null;
        await this._clearHandleFromDB();
    }
};

window.LocalFileAdapter = LocalFileAdapter;
