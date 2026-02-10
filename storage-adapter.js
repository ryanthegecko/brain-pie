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

    /**
     * Initialize the storage adapter
     * Checks URL for Firebase config, checks localStorage for saved config
     * @returns {Promise}
     */
    async init() {
        if (this.initialized) return;

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
                    FirebaseAdapter.onAuthStateChanged(async (user) => {
                        if (user) {
                            this.currentMode = 'firebase';
                            Debug.log('StorageAdapter: switched to firebase mode');

                            // Sync Firebase data before setting up listeners
                            await this.syncOnConnect();
                        } else {
                            this.currentMode = 'local';
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
        try {
            // Check for multi-pie meta in Firebase
            let meta = await FirebaseAdapter.loadMeta();

            if (!meta) {
                // Try migrating old single-blob format
                meta = await FirebaseAdapter.migrateToMultiPie();
            }

            if (meta && meta.pieIds) {
                // Firebase has multi-pie data — use Firebase's pie structure
                const pieIds = Array.isArray(meta.pieIds) ? meta.pieIds : Object.values(meta.pieIds);

                // Use local activePieId if it's valid in Firebase, otherwise default to first
                let activePieId = DataModel.getActivePieId();
                if (!activePieId || !pieIds.includes(activePieId)) {
                    activePieId = pieIds[0];
                }

                DataModel.pieMeta = {
                    pieIds: pieIds,
                    pieNames: meta.pieNames || {},
                    activePieId: activePieId
                };
                DataModel.setActivePieId(activePieId);
                Storage.saveMeta(DataModel.pieMeta);

                // Load the active pie data from Firebase
                const pieData = await FirebaseAdapter.loadPie(activePieId);
                if (pieData && pieData.categories) {
                    DataModel.categories = pieData.categories;
                    DataModel.categoryPercentageOverrides = pieData.categoryPercentageOverrides || {};
                    DataModel.currentPieName = meta.pieNames?.[activePieId] || pieData.name || 'My Pie';
                    DataModel.normalizeAllSpokes();

                    Storage.savePie(activePieId, {
                        id: activePieId,
                        name: DataModel.currentPieName,
                        categories: DataModel.categories,
                        categoryPercentageOverrides: DataModel.categoryPercentageOverrides,
                        priorityList: DataModel.priorityList || []
                    });
                }

                // Load per-user priorities
                const priorities = await FirebaseAdapter.loadPriorities(activePieId);
                DataModel.priorityList = priorities || [];
                DataModel.validatePriorityList();

                if (typeof App !== 'undefined') App.render();
                Debug.log('StorageAdapter: synced from Firebase on connect');
            }
            // If Firebase is empty, keep local data as-is (will push on next save)
        } catch (e) {
            Debug.log('StorageAdapter: syncOnConnect failed:', e.message);
        }

        // Set up real-time listeners
        this.setupFirebaseListener();
    },

    /**
     * Set up Firebase real-time listeners for active pie + priorities + meta
     */
    setupFirebaseListener() {
        const activePieId = DataModel.getActivePieId();

        if (activePieId) {
            // Multi-pie mode: subscribe to active pie
            FirebaseAdapter.subscribeToPie(activePieId, (data) => {
                if (this.isSaving) return;
                Debug.log('StorageAdapter: Received remote pie update');
                if (this.updateCallback) {
                    this.updateCallback(data);
                }
            });

            // Subscribe to per-user priorities for active pie
            FirebaseAdapter.subscribeToPriorityChanges((priorityList) => {
                if (this.isSavingPriorities) return;
                Debug.log('StorageAdapter: Received remote priority update');
                if (this.priorityUpdateCallback) {
                    this.priorityUpdateCallback(priorityList);
                }
            }, activePieId);

            // Subscribe to meta changes (team members adding/deleting pies)
            FirebaseAdapter.subscribeToMeta((meta) => {
                Debug.log('StorageAdapter: Received remote meta update');
                if (this.metaUpdateCallback) {
                    this.metaUpdateCallback(meta);
                }
            });
        } else {
            // Legacy single-pie mode
            FirebaseAdapter.subscribeToChanges((data) => {
                if (this.isSaving) return;
                if (data._saveId && data._saveId === this.lastSaveId) return;
                Debug.log('StorageAdapter: Received remote update from', data._savedBy || 'unknown');
                if (this.updateCallback) {
                    this.updateCallback(data);
                }
            });

            FirebaseAdapter.subscribeToPriorityChanges((priorityList) => {
                if (this.isSavingPriorities) return;
                if (this.priorityUpdateCallback) {
                    this.priorityUpdateCallback(priorityList);
                }
            });
        }
    },

    /**
     * Switch pie listeners: detach old, attach new
     */
    switchPieListeners(pieId) {
        if (this.currentMode !== 'firebase' || !FirebaseAdapter.isConnected()) return;

        // Detach old listeners
        FirebaseAdapter.unsubscribeFromChanges();
        FirebaseAdapter.unsubscribeFromPriorityChanges();

        // Attach new listeners for the new pie
        FirebaseAdapter.subscribeToPie(pieId, (data) => {
            if (this.isSaving) return;
            Debug.log('StorageAdapter: Received remote pie update (switched)');
            if (this.updateCallback) {
                this.updateCallback(data);
            }
        });

        FirebaseAdapter.subscribeToPriorityChanges((priorityList) => {
            if (this.isSavingPriorities) return;
            if (this.priorityUpdateCallback) {
                this.priorityUpdateCallback(priorityList);
            }
        }, pieId);
    },

    // --- Multi-pie routing methods ---

    async saveMeta(meta) {
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            await FirebaseAdapter.saveMeta(meta);
            // Also save to localStorage for offline access
            Storage.saveMeta(meta);
        } else {
            Storage.saveMeta(meta);
        }
    },

    async loadMeta() {
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            const meta = await FirebaseAdapter.loadMeta();
            if (meta) return meta;
        }
        return Storage.loadMeta();
    },

    async savePie(pieId, data) {
        this.isSaving = true;
        try {
            if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
                await FirebaseAdapter.savePie(pieId, data);
                // Also save to localStorage as backup
                Storage.savePie(pieId, data);
            } else {
                Storage.savePie(pieId, data);
            }
            return true;
        } finally {
            setTimeout(() => { this.isSaving = false; }, 1000);
        }
    },

    async loadPie(pieId) {
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            const data = await FirebaseAdapter.loadPie(pieId);
            if (data) return data;
        }
        return Storage.loadPie(pieId);
    },

    async deletePie(pieId) {
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            await FirebaseAdapter.deletePie(pieId);
        }
        Storage.deletePie(pieId);
    },

    async migrateToMultiPie() {
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            return await FirebaseAdapter.migrateToMultiPie();
        }
        return Storage.migrateToMultiPie();
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

            // Mode will switch to 'firebase' when user signs in
            Debug.log('StorageAdapter: Cloud sync enabled');

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
        // Sign out of Firebase
        await FirebaseAdapter.signOut();

        // Clear config
        FirebaseAdapter.clearConfig();

        // Switch to local mode
        this.currentMode = 'local';

        Debug.log('StorageAdapter: Cloud sync disabled');
    },

    /**
     * Save data to storage
     * Uses Firebase if connected, otherwise localStorage
     * @param {Object} data - Data to save
     * @returns {Promise}
     */
    async save(data) {
        this.isSaving = true;

        // Generate unique save ID to identify our own updates
        this.lastSaveId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        try {
            if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
                // Add save ID to data so we can identify our own updates
                const dataWithSaveId = {
                    ...data,
                    _saveId: this.lastSaveId,
                    _savedBy: FirebaseAdapter.user?.uid
                };

                const success = await FirebaseAdapter.save(dataWithSaveId);

                if (success) {
                    Debug.log('StorageAdapter: Saved to Firebase with saveId:', this.lastSaveId);
                    // Also save to localStorage as backup (without the _saveId)
                    Storage.save(data);
                    return true;
                } else {
                    // Fallback to localStorage
                    Debug.log('StorageAdapter: Firebase save failed, using localStorage fallback');
                    Storage.save(data);
                    return true;
                }
            } else {
                // Local mode
                Storage.save(data);
                Debug.log('StorageAdapter: Saved to localStorage');
                return true;
            }
        } finally {
            // Small delay before allowing updates again
            setTimeout(() => {
                this.isSaving = false;
            }, 1000);
        }
    },

    /**
     * Load data from storage
     * Uses Firebase if connected, otherwise localStorage
     * @returns {Promise<Object|null>}
     */
    async load() {
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            const firebaseData = await FirebaseAdapter.load();

            if (firebaseData) {
                Debug.log('StorageAdapter: Loaded from Firebase');
                // Clean internal metadata before returning
                const { _saveId, _savedBy, ...cleanData } = firebaseData;
                return cleanData;
            }

            // Fallback to localStorage if Firebase is empty
            Debug.log('StorageAdapter: Firebase empty, trying localStorage');
        }

        // Load from localStorage
        const localData = Storage.load();
        Debug.log('StorageAdapter: Loaded from localStorage');
        return localData;
    },

    /**
     * Save priorities to per-user storage (per-pie in multi-pie mode)
     * @param {Array} priorityList - Priority list array
     * @param {string} pieId - Optional pie ID (defaults to active)
     * @returns {Promise}
     */
    async savePriorities(priorityList, pieId) {
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            this.isSavingPriorities = true;
            const activePieId = pieId || DataModel.getActivePieId();
            try {
                await FirebaseAdapter.savePriorities(priorityList, activePieId);
            } finally {
                setTimeout(() => {
                    this.isSavingPriorities = false;
                }, 1000);
            }
        }
        // localStorage: priorities are saved as part of the pie blob via savePie()
    },

    /**
     * Load priorities from per-user storage (per-pie in multi-pie mode)
     * @param {string} pieId - Optional pie ID (defaults to active)
     * @returns {Promise<Array|null>}
     */
    async loadPriorities(pieId) {
        if (this.currentMode === 'firebase' && FirebaseAdapter.isConnected()) {
            const activePieId = pieId || DataModel.getActivePieId();
            return await FirebaseAdapter.loadPriorities(activePieId);
        }
        return null;
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
        return this.currentMode === 'firebase' && FirebaseAdapter.isConnected();
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
        if (this.currentMode === 'firebase') {
            return FirebaseAdapter.getProjectId();
        }
        return null;
    }
};

// Expose globally
window.StorageAdapter = StorageAdapter;
