/**
 * Firebase Adapter for Brain Pie
 * Handles Firebase Realtime Database sync for team collaboration.
 *
 * Usage:
 * 1. Team admin creates Firebase project with Realtime Database + Google Auth
 * 2. Admin pastes config into Brain Pie -> gets shareable URL
 * 3. Team members open URL -> auto-configured, sign in -> synced
 */
const FirebaseAdapter = {
    // Firebase instances
    app: null,
    db: null,
    auth: null,

    // Current user
    user: null,

    // Firebase config
    config: null,

    // Real-time listener unsubscribe function
    unsubscribeListener: null,

    // Per-user priority listener unsubscribe function
    unsubscribePriorityListener: null,

    // Connection state
    connected: false,

    // Google OAuth access token (for Calendar API)
    accessToken: null,
    accessTokenExpiry: null,

    // Callbacks
    onDataChangeCallback: null,
    onAuthChangeCallback: null,

    // localStorage keys
    CONFIG_KEY: 'brainPieFirebaseConfig',
    TOKEN_KEY: 'brainPieCalendarToken',

    /**
     * Parse Firebase config from URL parameter
     * URL format: ?config=base64EncodedJSON
     * @returns {Object|null} Firebase config object or null
     */
    parseConfigFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const configParam = urlParams.get('config');

            if (!configParam) return null;

            const decoded = atob(configParam);
            const config = JSON.parse(decoded);

            // Validate required fields
            if (!config.apiKey || !config.authDomain || !config.databaseURL || !config.projectId) {
                Debug.log('Firebase config missing required fields');
                return null;
            }

            Debug.log('Parsed Firebase config from URL:', config.projectId);
            return config;
        } catch (e) {
            Debug.log('Failed to parse Firebase config from URL:', e.message);
            return null;
        }
    },

    /**
     * Save Firebase config to localStorage
     * @param {Object} config - Firebase config object
     */
    saveConfigToLocal(config) {
        try {
            localStorage.setItem(this.CONFIG_KEY, JSON.stringify(config));
            Debug.log('Firebase config saved to localStorage');
        } catch (e) {
            Debug.log('Failed to save Firebase config:', e.message);
        }
    },

    /**
     * Load Firebase config from localStorage
     * @returns {Object|null} Firebase config object or null
     */
    loadConfigFromLocal() {
        try {
            const stored = localStorage.getItem(this.CONFIG_KEY);
            if (!stored) return null;

            const config = JSON.parse(stored);
            Debug.log('Loaded Firebase config from localStorage:', config.projectId);
            return config;
        } catch (e) {
            Debug.log('Failed to load Firebase config:', e.message);
            return null;
        }
    },

    /**
     * Clear Firebase config from localStorage
     */
    clearConfig() {
        localStorage.removeItem(this.CONFIG_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem('cloudSyncEnabled');
        this.config = null;
        this.accessToken = null;
        this.accessTokenExpiry = null;
        Debug.log('Firebase config cleared');
    },

    /**
     * Save Calendar access token to localStorage
     */
    saveTokenToLocal() {
        if (this.accessToken && this.accessTokenExpiry) {
            try {
                localStorage.setItem(this.TOKEN_KEY, JSON.stringify({
                    token: this.accessToken,
                    expiry: this.accessTokenExpiry
                }));
                Debug.log('Calendar token saved to localStorage');
            } catch (e) {
                Debug.log('Failed to save token:', e.message);
            }
        }
    },

    /**
     * Load Calendar access token from localStorage
     * @returns {boolean} True if valid token was loaded
     */
    loadTokenFromLocal() {
        try {
            const stored = localStorage.getItem(this.TOKEN_KEY);
            if (!stored) return false;

            const { token, expiry } = JSON.parse(stored);

            // Check if token is still valid (with 5 min buffer)
            if (expiry && Date.now() < expiry - (5 * 60 * 1000)) {
                this.accessToken = token;
                this.accessTokenExpiry = expiry;
                Debug.log('Calendar token loaded from localStorage');
                return true;
            } else {
                // Token expired, clean up
                localStorage.removeItem(this.TOKEN_KEY);
                Debug.log('Stored calendar token expired');
                return false;
            }
        } catch (e) {
            Debug.log('Failed to load token:', e.message);
            return false;
        }
    },

    /**
     * Dynamically load Firebase SDK
     * @returns {Promise} Resolves when SDK is loaded
     */
    async loadFirebaseSDK() {
        // Check if already loaded
        if (window.firebase) {
            Debug.log('Firebase SDK already loaded');
            return;
        }

        Debug.log('Loading Firebase SDK...');

        // Load Firebase App
        await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
        // Load Firebase Auth
        await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js');
        // Load Firebase Realtime Database
        await this.loadScript('https://www.gstatic.com/firebasejs/10.7.1/firebase-database-compat.js');

        Debug.log('Firebase SDK loaded');
    },

    /**
     * Helper to load a script
     * @param {string} src - Script URL
     * @returns {Promise}
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    },

    /**
     * Initialize Firebase with config
     * @param {Object} config - Firebase config object
     * @returns {Promise}
     */
    async init(config) {
        if (!config) {
            throw new Error('Firebase config is required');
        }

        this.config = config;

        // Load SDK first
        await this.loadFirebaseSDK();

        // Initialize Firebase app (or get existing)
        try {
            this.app = firebase.app();
            Debug.log('Using existing Firebase app');
        } catch (e) {
            this.app = firebase.initializeApp(config);
            Debug.log('Initialized new Firebase app:', config.projectId);
        }

        this.auth = firebase.auth();
        this.db = firebase.database();

        // Listen for auth state changes
        this.auth.onAuthStateChanged((user) => {
            this.user = user;
            this.connected = !!user;

            if (user) {
                Debug.log('Firebase auth: signed in as', user.displayName || user.email);
                // Try to load calendar token from localStorage (for page refreshes)
                this.loadTokenFromLocal();
                // Don't auto-subscribe to old data path here —
                // StorageAdapter.setupFirebaseListener() handles per-pie listeners
            } else {
                Debug.log('Firebase auth: signed out');
                this.unsubscribeFromChanges();
            }

            if (this.onAuthChangeCallback) {
                this.onAuthChangeCallback(user);
            }
        });

        Debug.log('Firebase initialized');
    },

    /**
     * Sign in with Google
     * Requests Calendar API scope for 2-way calendar sync
     * @returns {Promise<Object>} User object
     */
    async signInWithGoogle() {
        if (!this.auth) {
            throw new Error('Firebase not initialized');
        }

        // Check for debug skip auth flag
        if (typeof Debug !== 'undefined' && Debug.isActive('skipFirebaseAuth')) {
            Debug.log('Skipping Firebase auth (debug mode)');
            await this.auth.signInAnonymously();
            return this.auth.currentUser;
        }

        const provider = new firebase.auth.GoogleAuthProvider();

        // Request Calendar API scope for 2-way calendar sync
        provider.addScope('https://www.googleapis.com/auth/calendar.events');
        // Request Tasks API scope for Google Tasks import
        provider.addScope('https://www.googleapis.com/auth/tasks');

        try {
            const result = await this.auth.signInWithPopup(provider);

            // Capture OAuth access token for Calendar API
            if (result.credential) {
                this.accessToken = result.credential.accessToken;
                // Token expires in ~1 hour, store expiry time
                this.accessTokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes
                // Persist token to localStorage for page refreshes
                this.saveTokenToLocal();
                Debug.log('Google sign-in successful, calendar access granted:', result.user.displayName);
            } else {
                Debug.log('Google sign-in successful (no credential):', result.user.displayName);
            }

            return result.user;
        } catch (e) {
            Debug.log('Google sign-in failed:', e.message);
            throw e;
        }
    },

    /**
     * Get a valid access token for Calendar API
     * Tries: memory → localStorage → re-auth popup (last resort)
     * @returns {Promise<string|null>} Access token or null
     */
    async getAccessToken() {
        // Check if token exists in memory and is still valid
        if (this.accessToken && this.accessTokenExpiry && Date.now() < this.accessTokenExpiry) {
            return this.accessToken;
        }

        // Try loading from localStorage
        if (this.loadTokenFromLocal()) {
            return this.accessToken;
        }

        // Token expired or missing - need to re-authenticate
        if (!this.user) {
            Debug.log('Cannot refresh token: not signed in');
            return null;
        }

        // Note: This will show a popup - not truly silent
        // But it's the only way to get a fresh token for Calendar API
        try {
            Debug.log('Token expired, re-authenticating...');

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/calendar.events');
            provider.addScope('https://www.googleapis.com/auth/tasks');

            // Re-authenticate to get fresh token
            const result = await this.user.reauthenticateWithPopup(provider);

            if (result.credential) {
                this.accessToken = result.credential.accessToken;
                this.accessTokenExpiry = Date.now() + (55 * 60 * 1000);
                this.saveTokenToLocal();
                Debug.log('Access token refreshed');
                return this.accessToken;
            }
        } catch (e) {
            Debug.log('Failed to refresh access token:', e.message);
        }

        return null;
    },

    /**
     * Check if Calendar API access is available
     * @returns {boolean}
     */
    hasCalendarAccess() {
        // Check memory first
        if (this.accessToken && this.accessTokenExpiry && Date.now() < this.accessTokenExpiry) {
            return true;
        }
        // Try loading from localStorage
        return this.loadTokenFromLocal();
    },

    /**
     * Sign out
     * @returns {Promise}
     */
    async signOut() {
        if (!this.auth) return;

        this.unsubscribeFromChanges();
        this.unsubscribeFromPriorityChanges();
        this.unsubscribeFromMeta();
        await this.auth.signOut();
        this.user = null;
        this.connected = false;
        this.accessToken = null;
        this.accessTokenExpiry = null;
        localStorage.removeItem(this.TOKEN_KEY);
        Debug.log('Signed out of Firebase');
    },

    /**
     * Set auth state change callback
     * @param {Function} callback - Called with user object or null
     */
    onAuthStateChanged(callback) {
        this.onAuthChangeCallback = callback;
        // Call immediately with current state
        if (callback) {
            callback(this.user);
        }
    },

    // Real-time meta listener unsubscribe function
    unsubscribeMetaListener: null,

    /**
     * Get the database path for shared data (legacy single-pie)
     * @returns {string} Database path
     */
    getDataPath() {
        if (!this.user) {
            throw new Error('Not authenticated');
        }
        return `brainpie/${this.config.projectId}/data`;
    },

    /**
     * Get the database path for multi-pie meta
     * @returns {string} Database path
     */
    getMetaPath() {
        if (!this.user) {
            throw new Error('Not authenticated');
        }
        return `brainpie/${this.config.projectId}/meta`;
    },

    /**
     * Get the database path for a specific pie
     * @param {string} pieId - Pie identifier
     * @returns {string} Database path
     */
    getPiePath(pieId) {
        if (!this.user) {
            throw new Error('Not authenticated');
        }
        return `brainpie/${this.config.projectId}/pies/${pieId}`;
    },

    /**
     * Get the database path for the current user's priorities (per-pie)
     * @param {string} pieId - Optional pie ID; if omitted, returns the user root
     * @returns {string} Database path
     */
    getUserPriorityPath(pieId) {
        if (!this.user) {
            throw new Error('Not authenticated');
        }
        const base = `brainpie/${this.config.projectId}/userPriorities/${this.user.uid}`;
        return pieId ? `${base}/${pieId}` : base;
    },

    // --- Multi-pie meta and pie CRUD ---

    async saveMeta(meta) {
        if (!this.db || !this.user) return false;
        try {
            const path = this.getMetaPath();
            await this.db.ref(path).set(meta);
            Debug.log('Firebase: saved meta at', path);
            return true;
        } catch (e) {
            Debug.log('Firebase: saveMeta failed:', e.message);
            return false;
        }
    },

    async loadMeta() {
        if (!this.db || !this.user) return null;
        try {
            const path = this.getMetaPath();
            const snapshot = await this.db.ref(path).get();
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return null;
        } catch (e) {
            Debug.log('Firebase: loadMeta failed:', e.message);
            return null;
        }
    },

    async savePie(pieId, data) {
        if (!this.db || !this.user) return false;
        try {
            const path = this.getPiePath(pieId);
            // Strip priorityList — priorities are per-user
            const { priorityList, ...sharedData } = data;
            const dataWithMeta = {
                ...sharedData,
                lastModified: firebase.database.ServerValue.TIMESTAMP,
                lastModifiedBy: this.user.uid
            };
            await this.db.ref(path).set(dataWithMeta);
            Debug.log('Firebase: saved pie at', path);
            return true;
        } catch (e) {
            Debug.log('Firebase: savePie failed:', e.message);
            return false;
        }
    },

    async loadPie(pieId) {
        if (!this.db || !this.user) return null;
        try {
            const path = this.getPiePath(pieId);
            const snapshot = await this.db.ref(path).get();
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return null;
        } catch (e) {
            Debug.log('Firebase: loadPie failed:', e.message);
            return null;
        }
    },

    async deletePie(pieId) {
        if (!this.db || !this.user) return false;
        try {
            // Remove pie data
            await this.db.ref(this.getPiePath(pieId)).remove();
            // Remove current user's priorities for this pie
            await this.db.ref(this.getUserPriorityPath(pieId)).remove();
            Debug.log('Firebase: deleted pie', pieId);
            return true;
        } catch (e) {
            Debug.log('Firebase: deletePie failed:', e.message);
            return false;
        }
    },

    subscribeToMeta(callback) {
        if (!this.db || !this.user) return;
        this.unsubscribeFromMeta();

        try {
            const path = this.getMetaPath();
            const ref = this.db.ref(path);
            this.unsubscribeMetaListener = ref.on('value', (snapshot) => {
                if (snapshot.exists() && callback) {
                    callback(snapshot.val());
                }
            }, (error) => {
                Debug.log('Firebase meta listener error:', error.message);
            });
            Debug.log('Subscribed to Firebase meta at:', path);
        } catch (e) {
            Debug.log('Failed to subscribe to Firebase meta:', e.message);
        }
    },

    unsubscribeFromMeta() {
        if (this.unsubscribeMetaListener && this.db && this.user) {
            try {
                this.db.ref(this.getMetaPath()).off('value', this.unsubscribeMetaListener);
            } catch (e) {
                Debug.log('Error unsubscribing from meta:', e.message);
            }
        }
        this.unsubscribeMetaListener = null;
    },

    subscribeToPie(pieId, callback) {
        if (!this.db || !this.user) return;
        this.unsubscribeFromChanges();

        try {
            const path = this.getPiePath(pieId);
            const ref = this.db.ref(path);
            this.unsubscribeListener = ref.on('value', (snapshot) => {
                if (snapshot.exists() && callback) {
                    callback(snapshot.val());
                }
            }, (error) => {
                Debug.log('Firebase pie listener error:', error.message);
            });
            Debug.log('Subscribed to Firebase pie at:', path);
        } catch (e) {
            Debug.log('Failed to subscribe to Firebase pie:', e.message);
        }
    },

    /**
     * Migrate old Firebase format (single data blob) to multi-pie.
     * Returns meta if migration happened, null otherwise.
     */
    async migrateToMultiPie() {
        if (!this.db || !this.user) return null;

        try {
            // Check if meta already exists
            const metaSnap = await this.db.ref(this.getMetaPath()).get();
            if (metaSnap.exists()) return metaSnap.val();

            // Check for old data path
            const oldSnap = await this.db.ref(this.getDataPath()).get();
            if (!oldSnap.exists()) return null;

            const oldData = oldSnap.val();
            if (!oldData || !oldData.categories) return null;

            const pieId = 'pie-' + Date.now();
            const meta = {
                pieIds: [pieId],
                pieNames: { [pieId]: 'My Pie' }
            };

            // Write meta
            await this.db.ref(this.getMetaPath()).set(meta);

            // Write pie data (strip priorityList and internal metadata)
            const { priorityList, _saveId, _savedBy, lastModified, lastModifiedBy, lastModifiedByName, settings, ...pieData } = oldData;
            await this.db.ref(this.getPiePath(pieId)).set({
                id: pieId,
                name: 'My Pie',
                ...pieData,
                lastModified: firebase.database.ServerValue.TIMESTAMP,
                lastModifiedBy: this.user.uid
            });

            // Migrate per-user priorities: move from userPriorities/{uid} to userPriorities/{uid}/{pieId}
            const oldPriorityPath = `brainpie/${this.config.projectId}/userPriorities/${this.user.uid}`;
            const oldPrioritySnap = await this.db.ref(oldPriorityPath).get();
            if (oldPrioritySnap.exists()) {
                const oldPriorities = oldPrioritySnap.val();
                // Check if it's an array (old format) vs object with pie keys (new format)
                if (Array.isArray(oldPriorities) || (typeof oldPriorities === 'object' && oldPriorities[0] !== undefined)) {
                    const list = Array.isArray(oldPriorities) ? oldPriorities : Object.values(oldPriorities);
                    await this.db.ref(this.getUserPriorityPath(pieId)).set(list.length > 0 ? list : null);
                    // Clean up old format (overwrite with new structure)
                    await this.db.ref(oldPriorityPath).set({ [pieId]: list.length > 0 ? list : null });
                }
            }

            // Remove old data path
            await this.db.ref(this.getDataPath()).remove();

            Debug.log('Firebase: migrated to multi-pie format, pieId:', pieId);
            return meta;
        } catch (e) {
            Debug.log('Firebase: migrateToMultiPie failed:', e.message);
            return null;
        }
    },

    /**
     * Save data to Firebase Realtime Database
     * Strips priorityList from shared data (priorities are per-user)
     * @param {Object} data - Data to save
     * @returns {Promise}
     */
    async save(data) {
        if (!this.db || !this.user) {
            Debug.log('Cannot save to Firebase: not connected');
            return false;
        }

        // Check for debug offline mode
        if (typeof Debug !== 'undefined' && Debug.isActive('forceOfflineMode')) {
            Debug.log('Firebase save skipped (offline debug mode)');
            return false;
        }

        try {
            const path = this.getDataPath();
            // Strip priorityList from shared data — priorities are per-user
            const { priorityList, ...sharedData } = data;
            const dataWithMeta = {
                ...sharedData,
                lastModified: firebase.database.ServerValue.TIMESTAMP,
                lastModifiedBy: this.user.uid,
                lastModifiedByName: this.user.displayName || this.user.email
            };

            await this.db.ref(path).set(dataWithMeta);

            if (typeof Debug !== 'undefined' && Debug.isActive('firebaseVerbose')) {
                Debug.log('Firebase save successful:', path);
            }

            return true;
        } catch (e) {
            Debug.log('Firebase save failed:', e.message);
            return false;
        }
    },

    /**
     * Save priorities to per-user Firebase path
     * @param {Array} priorityList - Priority list array
     * @param {string} pieId - Optional pie ID for multi-pie
     * @returns {Promise<boolean>}
     */
    async savePriorities(priorityList, pieId) {
        if (!this.db || !this.user) {
            Debug.log('Cannot save priorities to Firebase: not connected');
            return false;
        }

        if (typeof Debug !== 'undefined' && Debug.isActive('forceOfflineMode')) {
            Debug.log('Firebase priority save skipped (offline debug mode)');
            return false;
        }

        try {
            const path = this.getUserPriorityPath(pieId);
            await this.db.ref(path).set(priorityList.length > 0 ? priorityList : null);

            if (typeof Debug !== 'undefined' && Debug.isActive('firebaseVerbose')) {
                Debug.log('Firebase priority save successful:', path);
            }

            return true;
        } catch (e) {
            Debug.log('Firebase priority save failed:', e.message);
            return false;
        }
    },

    /**
     * Load priorities from per-user Firebase path
     * @param {string} pieId - Optional pie ID for multi-pie
     * @returns {Promise<Array|null>}
     */
    async loadPriorities(pieId) {
        if (!this.db || !this.user) {
            Debug.log('Cannot load priorities from Firebase: not connected');
            return null;
        }

        if (typeof Debug !== 'undefined' && Debug.isActive('forceOfflineMode')) {
            Debug.log('Firebase priority load skipped (offline debug mode)');
            return null;
        }

        try {
            const path = this.getUserPriorityPath(pieId);
            const snapshot = await this.db.ref(path).get();

            if (snapshot.exists()) {
                const data = snapshot.val();
                const list = Array.isArray(data) ? data : Object.values(data || {});

                if (typeof Debug !== 'undefined' && Debug.isActive('firebaseVerbose')) {
                    Debug.log('Firebase priority load successful:', path, list);
                }

                return list;
            }

            Debug.log('Firebase: no priorities at path', path);
            return [];
        } catch (e) {
            Debug.log('Firebase priority load failed:', e.message);
            return null;
        }
    },

    /**
     * Subscribe to real-time priority changes (same user, other devices)
     * @param {Function} callback - Called with priority array when changes occur
     * @param {string} pieId - Optional pie ID for multi-pie
     */
    subscribeToPriorityChanges(callback, pieId) {
        if (!this.db || !this.user) {
            Debug.log('Cannot subscribe to priorities: not connected');
            return;
        }

        this.unsubscribeFromPriorityChanges();

        try {
            const path = this.getUserPriorityPath(pieId);
            const ref = this.db.ref(path);

            this.unsubscribePriorityListener = ref.on('value', (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const list = Array.isArray(data) ? data : Object.values(data || {});

                    if (typeof Debug !== 'undefined' && Debug.isActive('firebaseVerbose')) {
                        Debug.log('Firebase priority real-time update:', list);
                    }

                    if (callback) {
                        callback(list);
                    }
                } else {
                    if (callback) {
                        callback([]);
                    }
                }
            }, (error) => {
                Debug.log('Firebase priority listener error:', error.message);
            });

            Debug.log('Subscribed to Firebase priority changes at:', path);
        } catch (e) {
            Debug.log('Failed to subscribe to Firebase priorities:', e.message);
        }
    },

    /**
     * Unsubscribe from real-time priority changes
     */
    unsubscribeFromPriorityChanges() {
        if (this.unsubscribePriorityListener && this.db && this.user) {
            try {
                const path = this.getUserPriorityPath();
                this.db.ref(path).off('value', this.unsubscribePriorityListener);
                Debug.log('Unsubscribed from Firebase priority changes');
            } catch (e) {
                Debug.log('Error unsubscribing from priorities:', e.message);
            }
        }
        this.unsubscribePriorityListener = null;
    },

    /**
     * Load data from Firebase Realtime Database
     * @returns {Promise<Object|null>} Data object or null
     */
    async load() {
        if (!this.db || !this.user) {
            Debug.log('Cannot load from Firebase: not connected');
            return null;
        }

        // Check for debug offline mode
        if (typeof Debug !== 'undefined' && Debug.isActive('forceOfflineMode')) {
            Debug.log('Firebase load skipped (offline debug mode)');
            return null;
        }

        try {
            const path = this.getDataPath();
            const snapshot = await this.db.ref(path).get();

            if (snapshot.exists()) {
                const data = snapshot.val();

                if (typeof Debug !== 'undefined' && Debug.isActive('firebaseVerbose')) {
                    Debug.log('Firebase load successful:', path, data);
                }

                return data;
            }

            Debug.log('Firebase: no data at path', path);
            return null;
        } catch (e) {
            Debug.log('Firebase load failed:', e.message);
            return null;
        }
    },

    /**
     * Subscribe to real-time data changes
     * @param {Function} callback - Called with data when changes occur
     */
    subscribeToChanges(callback) {
        this.onDataChangeCallback = callback;

        if (!this.db || !this.user) {
            Debug.log('Cannot subscribe: not connected');
            return;
        }

        // Unsubscribe from any existing listener
        this.unsubscribeFromChanges();

        try {
            const path = this.getDataPath();
            const ref = this.db.ref(path);

            this.unsubscribeListener = ref.on('value', (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();

                    if (typeof Debug !== 'undefined' && Debug.isActive('firebaseVerbose')) {
                        Debug.log('Firebase real-time update:', data);
                    }

                    if (callback) {
                        callback(data);
                    }
                }
            }, (error) => {
                Debug.log('Firebase listener error:', error.message);
            });

            Debug.log('Subscribed to Firebase changes at:', path);
        } catch (e) {
            Debug.log('Failed to subscribe to Firebase:', e.message);
        }
    },

    /**
     * Unsubscribe from real-time data changes
     */
    unsubscribeFromChanges() {
        if (this.unsubscribeListener && this.db && this.user) {
            try {
                const path = this.getDataPath();
                this.db.ref(path).off('value', this.unsubscribeListener);
                Debug.log('Unsubscribed from Firebase changes');
            } catch (e) {
                Debug.log('Error unsubscribing:', e.message);
            }
        }
        this.unsubscribeListener = null;
    },

    /**
     * Check if connected and authenticated
     * @returns {boolean}
     */
    isConnected() {
        return this.connected && !!this.user && !!this.db;
    },

    /**
     * Get the project ID (for display)
     * @returns {string|null}
     */
    getProjectId() {
        return this.config ? this.config.projectId : null;
    },

    /**
     * Generate a shareable URL with encoded config
     * @returns {string}
     */
    generateShareURL() {
        if (!this.config) return null;

        const base64Config = btoa(JSON.stringify(this.config));
        const baseURL = window.location.origin + window.location.pathname;
        return `${baseURL}?config=${base64Config}`;
    }
};

// Expose globally
window.FirebaseAdapter = FirebaseAdapter;
