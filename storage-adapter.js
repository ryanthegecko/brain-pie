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

    // Track if we're currently saving (prevent feedback loops)
    isSaving: false,

    // Unique ID for each save to identify our own updates
    lastSaveId: null,

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
                    FirebaseAdapter.onAuthStateChanged((user) => {
                        if (user) {
                            this.currentMode = 'firebase';
                            Debug.log('StorageAdapter: switched to firebase mode');

                            // Subscribe to changes
                            this.setupFirebaseListener();
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

    /**
     * Set up Firebase real-time listener
     */
    setupFirebaseListener() {
        FirebaseAdapter.subscribeToChanges((data) => {
            // Skip if we just saved this data (prevent feedback loop)
            if (this.isSaving) {
                Debug.log('StorageAdapter: Skipping update (currently saving)');
                return;
            }

            // Skip if this is our own save coming back (check saveId)
            if (data._saveId && data._saveId === this.lastSaveId) {
                Debug.log('StorageAdapter: Skipping update (our own save)');
                return;
            }

            Debug.log('StorageAdapter: Received remote update from', data._savedBy || 'unknown');

            if (this.updateCallback) {
                this.updateCallback(data);
            }
        });
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
