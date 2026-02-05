/**
 * Google Auth Adapter for Brain Pie
 * Standalone Google Sign-In for Calendar access without Firebase.
 * Uses Google Identity Services (GIS) library.
 */
const GoogleAuthAdapter = {
    // OAuth Client ID for Brain Pie
    CLIENT_ID: '284728183380-mjodcpg751rfkerp3n48gml8737v9lbg.apps.googleusercontent.com',

    // Scopes needed
    SCOPES: 'https://www.googleapis.com/auth/calendar.events',

    // Token storage
    accessToken: null,
    accessTokenExpiry: null,
    userInfo: null,

    // localStorage key
    TOKEN_KEY: 'brainPieGoogleToken',

    // GIS client
    tokenClient: null,

    // Callbacks
    onSignInCallback: null,

    /**
     * Initialize the Google Identity Services library
     * @returns {Promise}
     */
    async init() {
        // Load GIS library if not already loaded
        if (!window.google?.accounts?.oauth2) {
            await this.loadGISLibrary();
        }

        // Try to load existing token
        this.loadTokenFromLocal();

        // Initialize token client
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (response) => this.handleTokenResponse(response)
        });

        Debug.log('GoogleAuthAdapter: Initialized');
    },

    /**
     * Load Google Identity Services library
     * @returns {Promise}
     */
    loadGISLibrary() {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts?.oauth2) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
            document.head.appendChild(script);
        });
    },

    /**
     * Sign in with Google
     * @returns {Promise}
     */
    async signIn() {
        if (!this.tokenClient) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            this.onSignInCallback = { resolve, reject };
            this.tokenClient.requestAccessToken();
        });
    },

    /**
     * Handle token response from Google
     * @param {Object} response - Token response
     */
    async handleTokenResponse(response) {
        if (response.error) {
            Debug.log('GoogleAuthAdapter: Token error:', response.error);
            if (this.onSignInCallback) {
                this.onSignInCallback.reject(new Error(response.error));
                this.onSignInCallback = null;
            }
            return;
        }

        this.accessToken = response.access_token;
        // Token expires in expires_in seconds (usually 3600 = 1 hour)
        this.accessTokenExpiry = Date.now() + ((response.expires_in - 300) * 1000); // 5 min buffer

        // Fetch user info
        await this.fetchUserInfo();

        // Save to localStorage
        this.saveTokenToLocal();

        Debug.log('GoogleAuthAdapter: Signed in as', this.userInfo?.name || this.userInfo?.email);

        if (this.onSignInCallback) {
            this.onSignInCallback.resolve(this.userInfo);
            this.onSignInCallback = null;
        }
    },

    /**
     * Fetch user info from Google
     */
    async fetchUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });

            if (response.ok) {
                this.userInfo = await response.json();
            }
        } catch (e) {
            Debug.log('GoogleAuthAdapter: Failed to fetch user info:', e.message);
        }
    },

    /**
     * Sign out
     */
    signOut() {
        if (this.accessToken && typeof google !== 'undefined' && google.accounts) {
            google.accounts.oauth2.revoke(this.accessToken);
        }

        this.accessToken = null;
        this.accessTokenExpiry = null;
        this.userInfo = null;
        localStorage.removeItem(this.TOKEN_KEY);

        Debug.log('GoogleAuthAdapter: Signed out');
    },

    /**
     * Save token to localStorage
     */
    saveTokenToLocal() {
        try {
            localStorage.setItem(this.TOKEN_KEY, JSON.stringify({
                token: this.accessToken,
                expiry: this.accessTokenExpiry,
                userInfo: this.userInfo
            }));
        } catch (e) {
            Debug.log('GoogleAuthAdapter: Failed to save token:', e.message);
        }
    },

    /**
     * Load token from localStorage
     * @returns {boolean} True if valid token was loaded
     */
    loadTokenFromLocal() {
        try {
            const stored = localStorage.getItem(this.TOKEN_KEY);
            if (!stored) return false;

            const { token, expiry, userInfo } = JSON.parse(stored);

            if (expiry && Date.now() < expiry) {
                this.accessToken = token;
                this.accessTokenExpiry = expiry;
                this.userInfo = userInfo;
                Debug.log('GoogleAuthAdapter: Token loaded from localStorage');
                return true;
            } else {
                localStorage.removeItem(this.TOKEN_KEY);
                return false;
            }
        } catch (e) {
            Debug.log('GoogleAuthAdapter: Failed to load token:', e.message);
            return false;
        }
    },

    /**
     * Get access token (refreshes if needed)
     * @returns {Promise<string|null>}
     */
    async getAccessToken() {
        // Check if we have a valid token
        if (this.accessToken && this.accessTokenExpiry && Date.now() < this.accessTokenExpiry) {
            return this.accessToken;
        }

        // Try loading from localStorage
        if (this.loadTokenFromLocal()) {
            return this.accessToken;
        }

        // Token expired - need to sign in again
        Debug.log('GoogleAuthAdapter: Token expired, need to sign in again');
        return null;
    },

    /**
     * Check if signed in with valid token
     * @returns {boolean}
     */
    isSignedIn() {
        if (this.accessToken && this.accessTokenExpiry && Date.now() < this.accessTokenExpiry) {
            return true;
        }
        return this.loadTokenFromLocal();
    },

    /**
     * Check if calendar access is available
     * @returns {boolean}
     */
    hasCalendarAccess() {
        return this.isSignedIn();
    }
};

// Expose globally
window.GoogleAuthAdapter = GoogleAuthAdapter;
