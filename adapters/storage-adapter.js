/**
 * Storage Adapter for Brain Pie
 * Abstracts storage layer to switch between localStorage and Firebase.
 *
 * Modes:
 * - 'local': Uses localStorage via Storage object (default)
 * - 'firebase': Uses Firebase Realtime Database via FirebaseAdapter
 */
const StorageAdapter = {
    // Current storage mode: 'local' or 'firebase'
    currentMode: 'local',

    // Active backend adapter — LocalStorageAdapter or FirebaseAdapter
    adapter: null,

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

    // Suppress meta listener during sync operations
    _isSyncingMeta: false,

    // Suppress pie data listener during sync operations
    _isSyncingData: false,

    /**
     * Initialize the storage adapter
     * Checks URL for Firebase config, checks localStorage for saved config
     * @returns {Promise}
     */
    async init() {
        if (this.initialized) return;

        this.adapter = LocalStorageAdapter;
        Debug.log('StorageAdapter initializing...');

        // Check if cloud sync is enabled
        const cloudSyncEnabled = localStorage.getItem('cloudSyncEnabled') === 'true';

        if (cloudSyncEnabled) {
            // Try to load config from URL first, then localStorage
            let config = FirebaseAdapter.parseConfigFromURL();

            if (!config) {
                config = FirebaseAdapter.loadConfigFromLocal();
            }

            if (config) {
                try {
                    await FirebaseAdapter.init(config);

                    // Set up auth state listener
                    this._authListenerRegistered = true;
                    FirebaseAdapter.onAuthStateChanged(async (user) => {
                        if (user) {
                            this.currentMode = 'firebase';
                            this.adapter = FirebaseAdapter;
                            Debug.log('StorageAdapter: switched to firebase mode');

                            // Sync Firebase data before setting up listeners
                            await this.syncOnConnect();
                        } else {
                            this.currentMode = 'local';
                            this.adapter = LocalStorageAdapter;
                            Debug.log('StorageAdapter: switched to local mode (not signed in)');
                        }
                    });

                    Debug.log('StorageAdapter: Firebase initialized, waiting for auth');
                } catch (e) {
                    Debug.log('StorageAdapter: Firebase init failed, using local:', e.message);
                    this.currentMode = 'local';
                }
            } else {
                Debug.log('StorageAdapter: No Firebase config found, using local');
                this.currentMode = 'local';
            }
        } else {
            // Check URL for config even if not enabled (for first-time setup)
            const urlConfig = FirebaseAdapter.parseConfigFromURL();
            if (urlConfig) {
                Debug.log('StorageAdapter: Found config in URL, ready for setup');
                // Don't auto-enable, just prepare for manual setup
            }

            this.currentMode = 'local';
            Debug.log('StorageAdapter: Cloud sync not enabled, using local');
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
                    tombstonedPieIds: tombstonedPieIds
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
     * Disable cloud sync
     */
    async disableCloudSync() {
        await FirebaseAdapter.signOut();
        FirebaseAdapter.clearConfig();
        this.currentMode = 'local';
        this.adapter = LocalStorageAdapter;
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
     * localStorage: no-op — priorities are saved inside the pie blob via savePie().
     */
    async savePriorities(priorityList, pieId) {
        if (!this.adapter.supportsRealtime) return;
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
    }
};

// Expose globally
window.StorageAdapter = StorageAdapter;
