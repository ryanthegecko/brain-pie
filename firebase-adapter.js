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
                // Start listening for data changes
                this.subscribeToChanges(this.onDataChangeCallback);
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

    /**
     * Get the database path for the current user
     * @returns {string} Database path
     */
    getDataPath() {
        if (!this.user) {
            throw new Error('Not authenticated');
        }
        // Use a shared path based on the project (all team members share same data)
        // The project ID acts as the team identifier
        return `brainpie/${this.config.projectId}/data`;
    },

    /**
     * Get the database path for the current user's priorities
     * @returns {string} Database path
     */
    getUserPriorityPath() {
        if (!this.user) {
            throw new Error('Not authenticated');
        }
        return `brainpie/${this.config.projectId}/userPriorities/${this.user.uid}`;
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
     * @returns {Promise<boolean>}
     */
    async savePriorities(priorityList) {
        if (!this.db || !this.user) {
            Debug.log('Cannot save priorities to Firebase: not connected');
            return false;
        }

        if (typeof Debug !== 'undefined' && Debug.isActive('forceOfflineMode')) {
            Debug.log('Firebase priority save skipped (offline debug mode)');
            return false;
        }

        try {
            const path = this.getUserPriorityPath();
            // Use null instead of undefined for empty list (Firebase rejects undefined)
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
     * @returns {Promise<Array|null>}
     */
    async loadPriorities() {
        if (!this.db || !this.user) {
            Debug.log('Cannot load priorities from Firebase: not connected');
            return null;
        }

        if (typeof Debug !== 'undefined' && Debug.isActive('forceOfflineMode')) {
            Debug.log('Firebase priority load skipped (offline debug mode)');
            return null;
        }

        try {
            const path = this.getUserPriorityPath();
            const snapshot = await this.db.ref(path).get();

            if (snapshot.exists()) {
                const data = snapshot.val();
                // Firebase may convert arrays to objects — normalize
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
     */
    subscribeToPriorityChanges(callback) {
        if (!this.db || !this.user) {
            Debug.log('Cannot subscribe to priorities: not connected');
            return;
        }

        this.unsubscribeFromPriorityChanges();

        try {
            const path = this.getUserPriorityPath();
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
                    // No priorities yet — send empty array
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
