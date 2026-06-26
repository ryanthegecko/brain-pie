/**
 * Storage Adapter for Brain Pie
 * Abstracts storage layer to switch between localStorage and Firebase.
 *
 * Modes:
 * - 'local':    Uses localStorage via LocalStorageAdapter (default)
 * - 'file':     Uses LocalFileAdapter (File System Access API)
 * - 'firebase': Uses FirebaseAdapter (live real-time sync)
 *
 * These modes are for the active working adapter. Firebase can additionally
 * be configured as an optional backup target (backupAdapter) independently
 * of which working mode is active.
 */
const StorageAdapter = {
    // Current storage mode: 'local', 'file', or 'firebase'
    currentMode: 'local',

    // Active backend adapter — LocalStorageAdapter, LocalFileAdapter, or FirebaseAdapter
    adapter: null,

    // Optional Firebase backup adapter (independent of currentMode).
    // Set when firebaseBackupEnabled is true but we are NOT in live firebase mode.
    backupAdapter: null,

    // Track if we're initialized
    initialized: false,

    // Callback for real-time updates
    updateCallback: null,

    // Callback for priority updates
    priorityUpdateCallback: null,

    // Track if we're currently saving (prevent feedback loops)
    isSaving: false,

    // Track if we're currently saving priorities (prevent feedback loops)
    isSavingPriorities: false,

    // Unique ID for each save to identify our own updates
    lastSaveId: null,

    // Skip auto-sync when manual sign-in will handle it
    skipSyncOnConnect: false,

    // Track if auth state listener is registered
    _authListenerRegistered: false,

    // Track if backup auth state listener is registered
    _backupAuthListenerRegistered: false,

    // Suppress meta listener during sync operations
    _isSyncingMeta: false,

    // Suppress pie data listener during sync operations
    _isSyncingData: false,

    /**
     * Initialize the storage adapter.
     *
     * Step 1 — Working mode (independent of backup):
     *   a. If 'localFileSyncEnabled' and File System Access API available → mode = 'file'
     *   b. Otherwise fall back to mode = 'local'
     *   c. If 'cloudSyncEnabled' → init Firebase + auth → mode = 'firebase'
     *      (takes precedence; file/local stay as fallback while waiting for auth)
     *
     * Step 2 — Firebase backup (independent of working mode):
     *   If 'firebaseBackupEnabled' is set and we are NOT already in live firebase mode,
     *   init a FirebaseAdapter instance for one-shot backup operations only.
     *   No auth listener is registered for the backup adapter.
     *
     * @returns {Promise}
     */
    async init() {
        if (this.initialized) return;

        this.adapter = LocalStorageAdapter;
        Debug.log('StorageAdapter initializing...');

        // --- Step 1a: Local File working mode ---
        const localFileSyncEnabled = localStorage.getItem('localFileSyncEnabled') === 'true';
        const supportsFileAPI = typeof window.showOpenFilePicker === 'function';

        if (localFileSyncEnabled && supportsFileAPI) {
            try {
                const ready = await LocalFileAdapter.restoreHandle();
                if (ready) {
                    this.currentMode = 'file';
                    this.adapter = LocalFileAdapter;
                    Debug.log('StorageAdapter: restored local file handle, using file mode');
                } else {
                    // Handle gone or permission revoked — fall back to local
                    localStorage.removeItem('localFileSyncEnabled');
                    Debug.log('StorageAdapter: local file handle could not be restored, reverting to local');
                }
            } catch (e) {
                Debug.log('StorageAdapter: local file restore failed, using local:', e.message);
            }
        }

        // --- Step 1b/c: Live Firebase working mode ---
        // cloudSyncEnabled overrides file/local as the active working adapter once auth succeeds.
        const cloudSyncEnabled = localStorage.getItem('cloudSyncEnabled') === 'true';

        if (cloudSyncEnabled) {
            let config = FirebaseAdapter.parseConfigFromURL();
            if (!config) {
                config = FirebaseAdapter.loadConfigFromLocal();
            }

            if (config) {
                try {
                    await FirebaseAdapter.init(config);

                    this._authListenerRegistered = true;
                    FirebaseAdapter.onAuthStateChanged(async (user) => {
                        if (user) {
                            this.currentMode = 'firebase';
                            this.adapter = FirebaseAdapter;
                            // If Firebase was acting as backup adapter, clear that role now
                            // (we're in live mode, backupAdapter is redundant)
                            this.backupAdapter = null;
                            Debug.log('StorageAdapter: switched to firebase mode');
                            await this.syncOnConnect();
                        } else {
                            // Revert to file or local while waiting for auth
                            if (localFileSyncEnabled && LocalFileAdapter.isConnected()) {
                                this.currentMode = 'file';
                                this.adapter = LocalFileAdapter;
                            } else {
                                this.currentMode = 'local';
                                this.adapter = LocalStorageAdapter;
                            }
                            Debug.log('StorageAdapter: switched to', this.currentMode, 'mode (not signed in)');
                        }
                    });

                    Debug.log('StorageAdapter: Firebase initialized, waiting for auth');
                } catch (e) {
                    Debug.log('StorageAdapter: Firebase init failed:', e.message);
                }
            } else {
                Debug.log('StorageAdapter: No Firebase config found, using', this.currentMode, 'mode');
                // Check URL for config even if not enabled (for first-time setup)
                const urlConfig = FirebaseAdapter.parseConfigFromURL();
                if (urlConfig) {
                    Debug.log('StorageAdapter: Found config in URL, ready for setup');
                }
            }
        } else {
            // Check URL for config (for first-time setup via shared link)
            const urlConfig = FirebaseAdapter.parseConfigFromURL();
            if (urlConfig) {
                Debug.log('StorageAdapter: Found config in URL, ready for setup');
            }
        }

        // --- Step 2: Firebase backup adapter (independent of working mode) ---
        const firebaseBackupEnabled = localStorage.getItem('firebaseBackupEnabled') === 'true';

        if (firebaseBackupEnabled && !cloudSyncEnabled) {
            // Firebase SDK may already be loaded from live-sync path above (no-op if so)
            const backupConfig = FirebaseAdapter.loadConfigFromLocal();
            if (backupConfig) {
                try {
                    // Re-use the same FirebaseAdapter instance (it handles duplicate init
                    // gracefully). We register a separate auth listener so the backup
                    // adapter is ready for REST-style pushes once the user is signed in.
                    if (!FirebaseAdapter.app) {
                        await FirebaseAdapter.init(backupConfig);
                    }

                    if (!this._backupAuthListenerRegistered) {
                        this._backupAuthListenerRegistered = true;
                        // Use onAuthStateChanged on the underlying auth; since FirebaseAdapter
                        // only supports one callback we piggy-back on the existing mechanism.
                        // We simply mark backupAdapter once auth is confirmed.
                        const checkBackupAuth = () => {
                            if (FirebaseAdapter.isConnected() && this.currentMode !== 'firebase') {
                                this.backupAdapter = FirebaseAdapter;
                                Debug.log('StorageAdapter: Firebase backup adapter ready');
                            }
                        };
                        // Check immediately (user may already be signed in from a prior session)
                        checkBackupAuth();
                        // Also register a proper listener in case auth fires later
                        FirebaseAdapter.onAuthStateChanged((user) => {
                            if (user && this.currentMode !== 'firebase') {
                                this.backupAdapter = FirebaseAdapter;
                                Debug.log('StorageAdapter: Firebase backup adapter ready (auth resolved)');
                            } else if (!user) {
                                // Don't clear backupAdapter immediately — the user may re-auth
                                Debug.log('StorageAdapter: Firebase backup adapter lost auth');
                            }
                        });
                    }
                } catch (e) {
                    Debug.log('StorageAdapter: Firebase backup init failed:', e.message);
                }
            } else {
                Debug.log('StorageAdapter: firebaseBackupEnabled but no config found, skipping backup init');
            }
        }

        this.initialized = true;
        Debug.log('StorageAdapter initialized in', this.currentMode, 'mode');
    },

    // Callback for meta updates (pie list changes)
    metaUpdateCallback: null,

    /**
     * Sync data from Firebase on auto-connect (page load with existing auth).
     * Loads Firebase meta/pies, migrates old format if needed, and aligns local state.
     */
    async syncOnConnect() {
        if (this.skipSyncOnConnect) {
            this.skipSyncOnConnect = false;
            // reloadDataFromFirebase() will handle sync and set up listeners
            return;
        }
        // Suppress listeners during sync to prevent race conditions
        this._isSyncingMeta = true;
        this._isSyncingData = true;
        try {
            // Personal mode: one-time migration from shared paths → UID-scoped paths.
            // No-op if already migrated or no shared data exists.
            if (FirebaseAdapter.isPersonalMode()) {
                await FirebaseAdapter.migrateSharedToPersonal();
            }

            // Fetch meta and per-user activePieId in parallel (independent reads)
            let [meta, firebaseActivePieId] = await Promise.all([
                FirebaseAdapter.loadMeta(),
                FirebaseAdapter.loadActivePieId()
            ]);

            if (!meta) {
                // Try migrating old single-blob format
                meta = await FirebaseAdapter.migrateToMultiPie();
            }

            if (meta && meta.pieIds) {
                // Firebase has multi-pie data — use Firebase's pie structure
                let pieIds = Array.isArray(meta.pieIds) ? meta.pieIds : Object.values(meta.pieIds);
                let pieNames = meta.pieNames || {};

                // NOTE: pushLocalOnlyPies is intentionally NOT called here.
                // On auto-connect (page load), Firebase is the source of truth.
                // Silently pushing local pies can contaminate Firebase with stale
                // or unrelated data (e.g. example data from a base-URL tab that
                // shares localStorage). Local-only pies are pushed only via the
                // manual sign-in flow (reloadDataFromFirebase), where the user has
                // explicitly confirmed the connection.

                // Prefer Firebase per-user activePieId, fall back to localStorage
                let activePieId = firebaseActivePieId || DataModel.getActivePieId();
                // If invalid or tombstoned, default to first non-tombstoned pie
                let tombstonedPieIds = meta.tombstonedPieIds || [];
                if (!Array.isArray(tombstonedPieIds)) tombstonedPieIds = Object.values(tombstonedPieIds);
                if (!activePieId || !pieIds.includes(activePieId) || tombstonedPieIds.includes(activePieId)) {
                    activePieId = pieIds.find(id => !tombstonedPieIds.includes(id)) || pieIds[0];
                }

                DataModel.pieMeta = {
                    pieIds: pieIds,
                    pieNames: pieNames,
                    activePieId: activePieId,
                    tombstonedPieIds: tombstonedPieIds,
                    // Carry theme from Firebase meta so it isn't silently dropped
                    theme: meta.theme || null
                };
                DataModel.setActivePieId(activePieId);
                Storage.saveMeta(DataModel.pieMeta);

                // Load active pie data and per-user priorities in parallel (independent reads)
                const [pieData, priorities] = await Promise.all([
                    FirebaseAdapter.loadPie(activePieId),
                    FirebaseAdapter.loadPriorities(activePieId)
                ]);

                if (pieData && pieData.categories) {
                    DataModel.categories = pieData.categories;
                    DataModel.categoryPercentageOverrides = pieData.categoryPercentageOverrides || {};
                    DataModel.currentPieName = pieNames[activePieId] || pieData.name || 'My Pie';
                    DataModel.normalizeAllSpokes();

                    Storage.savePie(activePieId, {
                        id: activePieId,
                        name: DataModel.currentPieName,
                        categories: DataModel.categories,
                        categoryPercentageOverrides: DataModel.categoryPercentageOverrides,
                        priorityList: DataModel.priorityList || []
                    });
                }

                DataModel.priorityList = priorities || [];
                DataModel.validatePriorityList();

                if (typeof App !== 'undefined') App.render();
                // Apply the Firebase-synced theme now that DataModel.pieMeta is populated.
                // This runs after App.render() so the chart is already painted before
                // the CSS custom properties update — pill colours reflow in one pass.
                if (DataModel.pieMeta && DataModel.pieMeta.theme) {
                    applyTheme(DataModel.pieMeta.theme);
                }
                // Mark as loaded so updateAuthUI() won't trigger reloadDataFromFirebase()
                if (typeof UI !== 'undefined') UI._hasReloadedFromFirebase = true;
                Debug.log('StorageAdapter: synced from Firebase on connect');
            } else if (FirebaseAdapter.isConnected()) {
                // Firebase is empty — bootstrap it with local meta + pies so future
                // loads can sync correctly. Without this, savePie() writes pie data
                // but never writes meta, so every page load finds Firebase "empty"
                // and falls back to localStorage indefinitely.
                const localMeta = Storage.loadMeta();
                if (localMeta && localMeta.pieIds) {
                    const pieIds = Array.isArray(localMeta.pieIds) ? localMeta.pieIds : Object.values(localMeta.pieIds);
                    const pieNames = localMeta.pieNames || {};
                    const tombstonedPieIds = Array.isArray(localMeta.tombstonedPieIds) ? localMeta.tombstonedPieIds : Object.values(localMeta.tombstonedPieIds || []);

                    await FirebaseAdapter.saveMeta({ pieIds, pieNames, tombstonedPieIds });

                    for (const pid of pieIds) {
                        if (tombstonedPieIds.includes(pid)) continue;
                        const pieData = Storage.loadPie(pid);
                        if (pieData && pieData.categories && pieData.categories.length > 0) {
                            await FirebaseAdapter.savePie(pid, pieData);
                        }
                    }

                    const activePieId = localMeta.activePieId || pieIds[0];
                    if (DataModel.priorityList && DataModel.priorityList.length > 0) {
                        await FirebaseAdapter.savePriorities(DataModel.priorityList, activePieId);
                    }

                    if (typeof UI !== 'undefined') UI._hasReloadedFromFirebase = true;
                    Debug.log('StorageAdapter: bootstrapped empty Firebase with local data');
                }
            }
        } catch (e) {
            Debug.log('StorageAdapter: syncOnConnect failed:', e.message);
        } finally {
            this._isSyncingMeta = false;
            this._isSyncingData = false;
        }

        // Set up real-time listeners
        this.setupFirebaseListener();
    },

    /**
     * Push any local-only pies to Firebase that aren't in the remote meta.
     * Silently uploads them and returns updated pieIds and pieNames.
     */
    async pushLocalOnlyPies(firebasePieIds, firebasePieNames) {
        const localMeta = Storage.loadMeta();
        if (!localMeta || !localMeta.pieIds) return { pieIds: firebasePieIds, pieNames: firebasePieNames };

        const localPieIds = Array.isArray(localMeta.pieIds) ? localMeta.pieIds : Object.values(localMeta.pieIds);
        const localPieNames = localMeta.pieNames || {};
        const unsyncedIds = localPieIds.filter(id => !firebasePieIds.includes(id));

        if (unsyncedIds.length === 0) return { pieIds: firebasePieIds, pieNames: firebasePieNames };

        // Load each unsynced pie from localStorage and check it has meaningful data
        const piesToPush = [];
        for (const id of unsyncedIds) {
            // Check if this pie was tombstoned on Firebase (deleted by another user)
            const isTombstoned = await FirebaseAdapter.isPieDeleted(id);
            if (isTombstoned) {
                Debug.log('StorageAdapter: skipping tombstoned pie', id);
                // Clean up local copy of deleted pie
                Storage.deletePie(id);
                continue;
            }

            const pieData = Storage.loadPie(id);
            if (pieData && pieData.categories && pieData.categories.length > 0) {
                // Only push if at least one category has items (not just empty shells)
                const hasContent = pieData.categories.some(c => c.items && c.items.length > 0);
                if (hasContent) {
                    piesToPush.push({ id, data: pieData, name: localPieNames[id] || pieData.name || 'My Pie' });
                }
            }
        }

        if (piesToPush.length === 0) return { pieIds: firebasePieIds, pieNames: firebasePieNames };

        // Upload pie data first
        for (const pie of piesToPush) {
            await FirebaseAdapter.savePie(pie.id, {
                id: pie.id,
                name: pie.name,
                categories: pie.data.categories,
                categoryPercentageOverrides: pie.data.categoryPercentageOverrides || {}
            });

            // Push priorities if any
            if (pie.data.priorityList && pie.data.priorityList.length > 0) {
                await FirebaseAdapter.savePriorities(pie.data.priorityList, pie.id);
            }
        }

        // Atomically add pies to Firebase meta (transaction prevents race conditions)
        const piesToAdd = piesToPush.map(p => ({ id: p.id, name: p.name }));
        const committedMeta = await FirebaseAdapter.addPiesToMeta(piesToAdd);

        if (committedMeta) {
            const pieIds = Array.isArray(committedMeta.pieIds) ? committedMeta.pieIds : Object.values(committedMeta.pieIds);
            Debug.log('StorageAdapter: pushed', piesToPush.length, 'local pies to Firebase');
            return { pieIds: pieIds, pieNames: committedMeta.pieNames || {} };
        }

        // Fallback: return what we expected
        const updatedPieIds = [...firebasePieIds, ...piesToPush.map(p => p.id)];
        const updatedPieNames = { ...firebasePieNames };
        for (const pie of piesToPush) { updatedPieNames[pie.id] = pie.name; }
        return { pieIds: updatedPieIds, pieNames: updatedPieNames };
    },

    /**
     * Set up real-time listeners for active pie + priorities + meta (adapter-routed)
     */
    setupFirebaseListener() {
        const activePieId = DataModel.getActivePieId();

        if (activePieId) {
            this.adapter.subscribeToPie(activePieId, (data) => {
                if (this.isSaving || this._isSyncingData) return;
                Debug.log('StorageAdapter: Received remote pie update');
                if (this.updateCallback) this.updateCallback(data);
            });

            this.adapter.subscribeToPriorityChanges((priorityList) => {
                if (this.isSavingPriorities || this._isSyncingData) return;
                Debug.log('StorageAdapter: Received remote priority update');
                if (this.priorityUpdateCallback) this.priorityUpdateCallback(priorityList);
            }, activePieId);

            this.adapter.subscribeToMeta((meta) => {
                if (this._isSyncingMeta) return;
                Debug.log('StorageAdapter: Received remote meta update');
                if (this.metaUpdateCallback) this.metaUpdateCallback(meta);
            });
        } else {
            // Legacy single-pie mode
            this.adapter.subscribeToChanges((data) => {
                if (this.isSaving) return;
                if (data._saveId && data._saveId === this.lastSaveId) return;
                Debug.log('StorageAdapter: Received remote update from', data._savedBy || 'unknown');
                if (this.updateCallback) this.updateCallback(data);
            });

            this.adapter.subscribeToPriorityChanges((priorityList) => {
                if (this.isSavingPriorities || this._isSyncingData) return;
                if (this.priorityUpdateCallback) this.priorityUpdateCallback(priorityList);
            });
        }
    },

    /**
     * Switch pie listeners: detach old, attach new
     */
    switchPieListeners(pieId) {
        if (!this.adapter.supportsRealtime) return;

        this.adapter.unsubscribeFromChanges();
        this.adapter.unsubscribeFromPriorityChanges();

        this.adapter.subscribeToPie(pieId, (data) => {
            if (this.isSaving || this._isSyncingData) return;
            Debug.log('StorageAdapter: Received remote pie update (switched)');
            if (this.updateCallback) this.updateCallback(data);
        });

        this.adapter.subscribeToPriorityChanges((priorityList) => {
            if (this.isSavingPriorities) return;
            if (this.priorityUpdateCallback) this.priorityUpdateCallback(priorityList);
        }, pieId);
    },

    // --- Multi-pie routing methods ---

    async saveMeta(meta) {
        await this.adapter.saveMeta(meta);
        if (this.currentMode === 'firebase') {
            LocalStorageAdapter.saveMeta(meta); // local backup for offline access
        }
    },

    async loadMeta() {
        const data = await this.adapter.loadMeta();
        if (!data && this.currentMode === 'firebase') {
            return LocalStorageAdapter.loadMeta(); // fallback if Firebase empty
        }
        return data;
    },

    async savePie(pieId, data) {
        this.isSaving = true;
        try {
            await this.adapter.savePie(pieId, data);
            if (this.currentMode === 'firebase') {
                LocalStorageAdapter.savePie(pieId, data); // local backup
            }
            return true;
        } finally {
            setTimeout(() => { this.isSaving = false; }, 1000);
        }
    },

    async loadPie(pieId) {
        const data = await this.adapter.loadPie(pieId);
        if (!data && this.currentMode === 'firebase') {
            return LocalStorageAdapter.loadPie(pieId); // fallback if Firebase empty
        }
        return data;
    },

    async deletePie(pieId) {
        if (this.currentMode === 'firebase') {
            // Atomically remove from meta before deleting data
            await FirebaseAdapter.removePieFromMeta(pieId);
        }
        await this.adapter.deletePie(pieId);
        if (this.currentMode === 'firebase') {
            LocalStorageAdapter.deletePie(pieId); // clean up local backup
        }
    },

    async migrateToMultiPie() {
        return this.adapter.migrateToMultiPie();
    },

    /**
     * Subscribe to meta updates (Firebase only — team pie list changes)
     */
    subscribeToMetaUpdates(callback) {
        this.metaUpdateCallback = callback;
    },

    /**
     * Enable cloud sync with Firebase
     * @param {Object} config - Firebase config object
     * @returns {Promise}
     */
    async enableCloudSync(config) {
        try {
            // Initialize Firebase if not already
            if (!FirebaseAdapter.app) {
                await FirebaseAdapter.init(config);
            } else {
                // App already initialized — ensure config is up to date
                FirebaseAdapter.config = config;
            }

            // Save config for future sessions
            FirebaseAdapter.saveConfigToLocal(config);
            localStorage.setItem('cloudSyncEnabled', 'true');

            // If user is already signed in, switch to firebase mode now
            if (FirebaseAdapter.isConnected()) {
                this.currentMode = 'firebase';
                this.adapter = FirebaseAdapter;
                Debug.log('StorageAdapter: Cloud sync enabled, already connected');
            } else {
                Debug.log('StorageAdapter: Cloud sync enabled, waiting for auth');
            }

            // Register auth state listener if not already set up
            // (needed when cloud sync is enabled after init)
            if (!this._authListenerRegistered) {
                this._authListenerRegistered = true;
                FirebaseAdapter.onAuthStateChanged(async (user) => {
                    if (user) {
                        this.currentMode = 'firebase';
                        this.adapter = FirebaseAdapter;
                        Debug.log('StorageAdapter: switched to firebase mode');
                        await this.syncOnConnect();
                    } else {
                        this.currentMode = 'local';
                        this.adapter = LocalStorageAdapter;
                        Debug.log('StorageAdapter: switched to local mode (not signed in)');
                    }
                });
            }

            return true;
        } catch (e) {
            Debug.log('StorageAdapter: Failed to enable cloud sync:', e.message);
            return false;
        }
    },

    /**
     * Disable live Firebase cloud sync.
     * Before switching away, push one final snapshot to backupAdapter if configured
     * so Firebase always holds the latest state.
     */
    async disableCloudSync() {
        // Auto-push final snapshot if there is a backup adapter distinct from live Firebase.
        // (In live mode the primary adapter IS Firebase, so we push directly before signing out.)
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            try {
                await this._pushSnapshotToFirebase();
                Debug.log('StorageAdapter: pushed final snapshot before disabling cloud sync');
            } catch (e) {
                Debug.log('StorageAdapter: final snapshot push failed (continuing):', e.message);
            }
        }

        await FirebaseAdapter.signOut();
        FirebaseAdapter.clearConfig();
        this.currentMode = 'local';
        this.adapter = LocalStorageAdapter;
        this.backupAdapter = null;
        this._authListenerRegistered = false;
        Debug.log('StorageAdapter: Cloud sync disabled');
    },

    /**
     * Save data to storage (legacy single-pie path).
     */
    async save(data) {
        this.isSaving = true;
        this.lastSaveId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
            if (this.currentMode === 'firebase') {
                const dataWithSaveId = {
                    ...data,
                    _saveId: this.lastSaveId,
                    _savedBy: this.adapter.user?.uid
                };
                const success = await this.adapter.save(dataWithSaveId);
                if (success) {
                    Debug.log('StorageAdapter: Saved to Firebase with saveId:', this.lastSaveId);
                } else {
                    Debug.log('StorageAdapter: Firebase save failed, using localStorage fallback');
                }
                LocalStorageAdapter.save(data); // always keep local backup
            } else {
                await this.adapter.save(data);
                Debug.log('StorageAdapter: Saved to localStorage');
            }
            return true;
        } finally {
            setTimeout(() => { this.isSaving = false; }, 1000);
        }
    },

    /**
     * Load data from storage (legacy single-pie path).
     */
    async load() {
        if (this.currentMode === 'firebase') {
            const firebaseData = await this.adapter.load();
            if (firebaseData) {
                Debug.log('StorageAdapter: Loaded from Firebase');
                const { _saveId, _savedBy, ...cleanData } = firebaseData;
                return cleanData;
            }
            Debug.log('StorageAdapter: Firebase empty, trying localStorage');
        }
        const localData = await LocalStorageAdapter.load();
        Debug.log('StorageAdapter: Loaded from localStorage');
        return localData;
    },

    /**
     * Save priorities to per-user storage (per-pie in multi-pie mode).
     * localStorage mode: no-op — priorities are saved inside the pie blob via savePie().
     * firebase mode: writes to per-user path in Firebase.
     * file mode: writes to the 'priorities' section of the local JSON file.
     */
    async savePriorities(priorityList, pieId) {
        // LocalStorageAdapter is a true no-op for priorities (they live inside the pie blob).
        // LocalFileAdapter and FirebaseAdapter both have real implementations, so we must
        // let those through even though supportsRealtime is false on LocalFileAdapter.
        if (!this.adapter.supportsRealtime && this.currentMode !== 'file') return;
        this.isSavingPriorities = true;
        const activePieId = pieId || DataModel.getActivePieId();
        try {
            await this.adapter.savePriorities(priorityList, activePieId);
        } finally {
            setTimeout(() => { this.isSavingPriorities = false; }, 1000);
        }
    },

    /**
     * Load priorities from per-user storage (per-pie in multi-pie mode).
     * localStorage: returns null — priorities are loaded from the pie blob.
     */
    async loadPriorities(pieId) {
        const activePieId = pieId || DataModel.getActivePieId();
        return this.adapter.loadPriorities(activePieId);
    },

    /**
     * Subscribe to per-user priority changes (Firebase only)
     * @param {Function} callback - Called with priority array when remote changes occur
     */
    subscribeToPriorityChanges(callback) {
        this.priorityUpdateCallback = callback;

        // If already connected, listener was set up in setupFirebaseListener
    },

    /**
     * Subscribe to real-time updates (Firebase only)
     * @param {Function} callback - Called with data when remote changes occur
     */
    subscribeToUpdates(callback) {
        this.updateCallback = callback;

        // If already connected, set up listener
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            this.setupFirebaseListener();
        }
    },

    /**
     * Check if using Firebase mode
     * @returns {boolean}
     */
    isFirebaseMode() {
        return this.currentMode === 'firebase' && this.adapter.isConnected();
    },

    /**
     * Get current mode
     * @returns {string} 'local' or 'firebase'
     */
    getMode() {
        return this.currentMode;
    },

    /**
     * Get project ID if in Firebase mode
     * @returns {string|null}
     */
    getProjectId() {
        return this.adapter.getProjectId();
    },

    /**
     * Enable local file sync.
     * Switches the active adapter to LocalFileAdapter and persists the choice.
     * If live Firebase sync was active, it is disabled first (with a final snapshot push).
     * Firebase can remain configured as a backup adapter independently.
     *
     * NOTE: The caller is responsible for calling LocalFileAdapter.openFile() or
     * LocalFileAdapter.createFile() BEFORE calling this method so that the handle
     * is already set on the adapter.
     */
    async enableLocalFileSync() {
        // Disable live Firebase sync if active (this also pushes a final snapshot)
        if (this.currentMode === 'firebase') {
            await this.disableCloudSync();
        }

        this.currentMode = 'file';
        this.adapter = LocalFileAdapter;
        localStorage.setItem('localFileSyncEnabled', 'true');
        Debug.log('StorageAdapter: local file sync enabled');
    },

    /**
     * Disable local file sync and revert to localStorage mode.
     * Before clearing the handle, push a final snapshot to backupAdapter if configured.
     */
    async disableLocalFileSync() {
        if (this.backupAdapter && this.currentMode === 'file') {
            try {
                await this._pushSnapshotToFirebase();
                Debug.log('StorageAdapter: pushed final snapshot before disabling local file sync');
            } catch (e) {
                Debug.log('StorageAdapter: final snapshot push failed (continuing):', e.message);
            }
        }

        await LocalFileAdapter.clearHandle();
        localStorage.removeItem('localFileSyncEnabled');
        this.currentMode = 'local';
        this.adapter = LocalStorageAdapter;
        Debug.log('StorageAdapter: local file sync disabled, reverted to local');
    },

    /**
     * Check if currently in local file sync mode with an active handle.
     * @returns {boolean}
     */
    isLocalFileMode() {
        return this.currentMode === 'file' && LocalFileAdapter.isConnected();
    },

    // -------------------------------------------------------------------------
    // Firebase backup methods (independent of live sync / working mode)
    // -------------------------------------------------------------------------

    /**
     * Configure Firebase as a backup target without switching the working mode.
     * Saves config, marks firebaseBackupEnabled, initialises FirebaseAdapter (SDK
     * load + app init only — does NOT call enableCloudSync() or change currentMode).
     *
     * @param {Object} config - Firebase config object
     * @returns {Promise<boolean>} true if init succeeded and auth resolved
     */
    async configureFirebaseBackup(config) {
        try {
            if (!FirebaseAdapter.app) {
                await FirebaseAdapter.init(config);
            } else {
                FirebaseAdapter.config = config;
            }

            FirebaseAdapter.saveConfigToLocal(config);
            localStorage.setItem('firebaseBackupEnabled', 'true');

            // Register backup auth listener (only once)
            if (!this._backupAuthListenerRegistered) {
                this._backupAuthListenerRegistered = true;
                FirebaseAdapter.onAuthStateChanged((user) => {
                    if (user && this.currentMode !== 'firebase') {
                        this.backupAdapter = FirebaseAdapter;
                        Debug.log('StorageAdapter: Firebase backup adapter ready');
                    }
                });
            }

            // If already connected, assign immediately
            if (FirebaseAdapter.isConnected() && this.currentMode !== 'firebase') {
                this.backupAdapter = FirebaseAdapter;
            }

            Debug.log('StorageAdapter: Firebase backup configured');
            return true;
        } catch (e) {
            Debug.log('StorageAdapter: configureFirebaseBackup failed:', e.message);
            return false;
        }
    },

    /**
     * Remove the Firebase backup configuration.
     * Does NOT sign the user out of live Firebase sync if that is active.
     */
    disableFirebaseBackup() {
        this.backupAdapter = null;
        localStorage.removeItem('firebaseBackupEnabled');
        this._backupAuthListenerRegistered = false;
        // If not in live firebase mode, also clear the stored config so init()
        // doesn't try to restore it on next page load
        if (this.currentMode !== 'firebase') {
            FirebaseAdapter.clearConfig();
        }
        Debug.log('StorageAdapter: Firebase backup disabled');
    },

    /**
     * Switch from backup mode to live Firebase sync.
     * Firebase must already be configured (via configureFirebaseBackup or saved config).
     * This calls enableCloudSync() which will change currentMode to 'firebase' once auth completes.
     *
     * @returns {Promise<boolean>}
     */
    async enableLiveFirebaseSync() {
        const config = FirebaseAdapter.config || FirebaseAdapter.loadConfigFromLocal();
        if (!config) {
            Debug.log('StorageAdapter: cannot enable live sync — no Firebase config');
            return false;
        }

        // Promote to live sync
        localStorage.setItem('cloudSyncEnabled', 'true');
        localStorage.removeItem('firebaseBackupEnabled');

        const ok = await this.enableCloudSync(config);
        if (ok) {
            // backupAdapter is superseded by live mode
            this.backupAdapter = null;
            this._backupAuthListenerRegistered = false;
        }
        return ok;
    },

    /**
     * Push full current state to Firebase as a one-shot snapshot.
     * Does NOT switch currentMode. Does NOT set up any real-time listeners.
     * Stores a lastFirebaseBackup timestamp in localStorage on success.
     *
     * @returns {Promise<boolean>} true if push succeeded
     */
    async pushToFirebase() {
        const target = this.currentMode === 'firebase' ? this.adapter : this.backupAdapter;
        if (!target || !target.isConnected()) {
            Debug.log('StorageAdapter: pushToFirebase — no connected Firebase adapter');
            return false;
        }

        try {
            const ok = await this._pushSnapshotToFirebase(target);
            if (ok) {
                const ts = new Date().toISOString();
                localStorage.setItem('lastFirebaseBackup', ts);
                Debug.log('StorageAdapter: pushed snapshot to Firebase, ts:', ts);
            }
            return ok;
        } catch (e) {
            Debug.log('StorageAdapter: pushToFirebase failed:', e.message);
            return false;
        }
    },

    /**
     * Internal helper — write meta + all pies + priorities to a FirebaseAdapter
     * instance in one go. Does not modify currentMode or backupAdapter.
     *
     * @param {Object} [target] - FirebaseAdapter instance to write to (defaults to backupAdapter or FirebaseAdapter)
     * @returns {Promise<boolean>}
     */
    async _pushSnapshotToFirebase(target) {
        target = target || this.backupAdapter || (FirebaseAdapter.isConnected() ? FirebaseAdapter : null);
        if (!target || !target.isConnected()) {
            Debug.log('StorageAdapter: _pushSnapshotToFirebase — no connected target');
            return false;
        }

        const meta = await this.adapter.loadMeta();
        if (!meta || !meta.pieIds) {
            Debug.log('StorageAdapter: _pushSnapshotToFirebase — no meta to push');
            return false;
        }

        const pieIds = Array.isArray(meta.pieIds) ? meta.pieIds : Object.values(meta.pieIds);

        // Write meta
        await target.saveMeta(meta);

        // Write each pie + priorities
        for (const pieId of pieIds) {
            const tombstoned = (meta.tombstonedPieIds || []).includes(pieId);
            if (tombstoned) continue;

            const pieData = await this.adapter.loadPie(pieId);
            if (pieData && pieData.categories) {
                await target.savePie(pieId, pieData);
            }

            const priorities = await this.adapter.loadPriorities(pieId);
            if (Array.isArray(priorities) && priorities.length > 0) {
                await target.savePriorities(priorities, pieId);
            }
        }

        return true;
    },

    /**
     * Pull latest snapshot from Firebase, replace current working data, and
     * write it into the active adapter (local file or localStorage).
     * Shows a confirm() dialog before overwriting.
     *
     * @returns {Promise<boolean>} true if pull and replace succeeded
     */
    async pullFromFirebase() {
        const source = this.currentMode === 'firebase' ? this.adapter : this.backupAdapter;
        if (!source || !source.isConnected()) {
            Debug.log('StorageAdapter: pullFromFirebase — no connected Firebase adapter');
            alert('Firebase is not connected. Please sign in first.');
            return false;
        }

        const confirmed = confirm(
            'This will replace your current working data with the latest Firebase snapshot.\n\n' +
            'Any changes made since the last backup will be overwritten. Continue?'
        );
        if (!confirmed) return false;

        try {
            const meta = await source.loadMeta();
            if (!meta || !meta.pieIds) {
                alert('No data found in Firebase.');
                return false;
            }

            const pieIds = Array.isArray(meta.pieIds) ? meta.pieIds : Object.values(meta.pieIds);
            const tombstonedPieIds = Array.isArray(meta.tombstonedPieIds) ? meta.tombstonedPieIds : Object.values(meta.tombstonedPieIds || []);
            const pieNames = meta.pieNames || {};

            // Determine active pie
            let activePieId = meta.activePieId || source.loadActivePieId && await source.loadActivePieId();
            if (!activePieId || !pieIds.includes(activePieId) || tombstonedPieIds.includes(activePieId)) {
                activePieId = pieIds.find(id => !tombstonedPieIds.includes(id)) || pieIds[0];
            }

            const metaObj = { pieIds, pieNames, activePieId, tombstonedPieIds };

            // Write into active adapter
            await this.adapter.saveMeta(metaObj);

            for (const pieId of pieIds) {
                if (tombstonedPieIds.includes(pieId)) continue;
                const pieData = await source.loadPie(pieId);
                if (pieData && pieData.categories) {
                    await this.adapter.savePie(pieId, pieData);
                }
                const priorities = await source.loadPriorities(pieId);
                if (Array.isArray(priorities)) {
                    await this.adapter.savePriorities(priorities, pieId);
                }
            }

            // Update DataModel + re-render
            if (typeof DataModel !== 'undefined') {
                DataModel.pieMeta = metaObj;
                DataModel.setActivePieId(activePieId);
                DataModel.currentPieName = pieNames[activePieId] || 'My Pie';

                const activePie = await this.adapter.loadPie(activePieId);
                if (activePie && activePie.categories) {
                    DataModel.categories = activePie.categories;
                    DataModel.categoryPercentageOverrides = activePie.categoryPercentageOverrides || {};
                    DataModel.normalizeAllSpokes && DataModel.normalizeAllSpokes();
                }

                const priorities = await this.adapter.loadPriorities(activePieId);
                DataModel.priorityList = Array.isArray(priorities) ? priorities : [];
                DataModel.validatePriorityList && DataModel.validatePriorityList();
            }

            if (typeof App !== 'undefined') App.render();
            if (typeof Storage !== 'undefined') Storage.showStatus('Restored from Firebase backup', 'success');

            Debug.log('StorageAdapter: pullFromFirebase complete');
            return true;
        } catch (e) {
            Debug.log('StorageAdapter: pullFromFirebase failed:', e.message);
            alert('Restore failed: ' + e.message);
            return false;
        }
    },

    /**
     * Returns true if a Firebase backup adapter is configured and connected.
     * @returns {boolean}
     */
    hasFirebaseBackup() {
        return !!(this.backupAdapter && this.backupAdapter.isConnected());
    },

    /**
     * Returns the last Firebase backup timestamp from localStorage, or null.
     * @returns {string|null} ISO timestamp string, or null if never backed up
     */
    getLastBackupTimestamp() {
        return localStorage.getItem('lastFirebaseBackup') || null;
    }
};

// Expose globally
window.StorageAdapter = StorageAdapter;
