// Cloud Sync Controller — Firebase/cloud sync UI methods

Object.assign(UI, {

    // ==========================================
    // Cloud Sync / Firebase Methods
    // ==========================================

    /**
     * Enable cloud sync - show expanded UI
     */
    enableCloudSync() {
        document.getElementById('cloud-sync-collapsed').style.display = 'none';
        document.getElementById('cloud-sync-expanded').style.display = 'block';

        // Check for URL config parameter
        const urlConfig = FirebaseAdapter.parseConfigFromURL();
        if (urlConfig) {
            document.getElementById('firebase-config-input').value = JSON.stringify(urlConfig, null, 2);
            // Auto-connect if config found in URL
            this.connectFirebase();
        }
    },

    /**
     * Disable cloud sync
     */
    async disableCloudSync() {
        if (!confirm('Disable Cloud Sync? Your data will remain in localStorage.')) return;

        await StorageAdapter.disableCloudSync();

        document.getElementById('cloud-sync-collapsed').style.display = 'block';
        document.getElementById('cloud-sync-expanded').style.display = 'none';

        this.updateSyncStatus('offline', 'Disconnected');
        this.updateMainSyncIndicator(null, null);
    },

    /**
     * Connect to Firebase with config from textarea
     */
    async connectFirebase() {
        let configText = document.getElementById('firebase-config-input').value.trim();

        try {
            // Handle JavaScript object syntax (unquoted keys) from Firebase console
            // Convert {apiKey: "..."} to {"apiKey": "..."}
            // Only match keys at start of line or after { or , (not URLs like https:)
            configText = configText.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');

            const config = JSON.parse(configText);

            // Validate required fields
            if (!config.apiKey || !config.authDomain || !config.databaseURL || !config.projectId) {
                alert('Invalid Firebase config. Required fields: apiKey, authDomain, databaseURL, projectId');
                return;
            }

            this.updateSyncStatus('connecting', 'Connecting...');

            await FirebaseAdapter.init(config);
            FirebaseAdapter.saveConfigToLocal(config);

            // Set up auth change listener
            FirebaseAdapter.onAuthStateChanged(() => {
                this.updateAuthUI();
            });

            document.getElementById('firebase-config-form').style.display = 'none';
            document.getElementById('firebase-auth-section').style.display = 'block';

            this.generateShareURL();

        } catch (e) {
            console.error('Firebase connection error:', e);
            alert('Invalid Firebase config. Please paste valid JSON.\n\nError: ' + e.message);
            this.updateSyncStatus('error', 'Connection failed');
        }
    },

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            this.updateSyncStatus('connecting', 'Signing in...');
            // Prevent auto-sync — reloadDataFromFirebase() handles it
            StorageAdapter.skipSyncOnConnect = true;
            await FirebaseAdapter.signInWithGoogle();
            // Explicitly update UI after sign-in completes
            this.updateAuthUI();
        } catch (e) {
            console.error('Sign in error:', e);
            alert('Sign in failed: ' + e.message);
            this.updateSyncStatus('error', 'Sign in failed');
        }
    },

    /**
     * Sign out of Firebase
     */
    async signOutFirebase() {
        await FirebaseAdapter.signOut();
        this._hasReloadedFromFirebase = false;
        this.updateAuthUI();
        this.updateMainSyncIndicator(null, null);
    },

    /**
     * Update auth UI based on current user state
     */
    updateAuthUI() {
        const user = FirebaseAdapter.user;

        if (user) {
            document.getElementById('firebase-signed-out').style.display = 'none';
            document.getElementById('firebase-signed-in').style.display = 'block';

            const photoEl = document.getElementById('firebase-user-photo');
            const nameEl = document.getElementById('firebase-user-name');

            if (photoEl) photoEl.src = user.photoURL || '';
            if (nameEl) nameEl.textContent = user.displayName || user.email;

            document.getElementById('share-url-section').style.display = 'block';

            this.updateSyncStatus('online', 'Connected as ' + (user.displayName || user.email));

            // Enable cloud sync mode in StorageAdapter
            StorageAdapter.enableCloudSync(FirebaseAdapter.config);

            // Update main UI indicator
            this.updateMainSyncIndicator('synced', FirebaseAdapter.getProjectId());

            // Reload data from Firebase (only on first auth, not every Settings open)
            if (!this._hasReloadedFromFirebase) {
                this._hasReloadedFromFirebase = true;
                this.reloadDataFromFirebase();
            }

            // Sync calendar events (now that we have a fresh token)
            if (typeof App !== 'undefined' && App.syncCalendarEvents) {
                App.syncCalendarEvents();
            }

            this.updateCalendarImportButton();
        } else {
            document.getElementById('firebase-signed-out').style.display = 'block';
            document.getElementById('firebase-signed-in').style.display = 'none';
            document.getElementById('share-url-section').style.display = 'none';

            this.updateSyncStatus('offline', 'Not signed in');
            this.updateMainSyncIndicator(null, null);
            this.updateCalendarImportButton();
        }
    },

    /**
     * Reload data from Firebase after sign-in
     * Multi-pie aware: checks meta → pies, migrates old format, or offers first-time push
     */
    async reloadDataFromFirebase() {
        // Suppress listeners during sync to prevent stale data overwrites
        StorageAdapter._isSyncingMeta = true;
        StorageAdapter._isSyncingData = true;
        try {
            await this._doReloadDataFromFirebase();
        } finally {
            StorageAdapter._isSyncingMeta = false;
            StorageAdapter._isSyncingData = false;
        }
    },

    async _doReloadDataFromFirebase() {
        // 1. Check for multi-pie meta
        let meta = await FirebaseAdapter.loadMeta();

        if (!meta) {
            // 2. No meta — try migrating old single-blob format
            meta = await FirebaseAdapter.migrateToMultiPie();
        }

        if (meta && meta.pieIds) {
            // Firebase has multi-pie data — load it
            let pieIds = Array.isArray(meta.pieIds) ? meta.pieIds : Object.values(meta.pieIds);
            let pieNames = meta.pieNames || {};
            let tombstonedPieIds = meta.tombstonedPieIds || [];
            if (!Array.isArray(tombstonedPieIds)) tombstonedPieIds = Object.values(tombstonedPieIds);

            // Push any local-only pies to Firebase silently
            const merged = await StorageAdapter.pushLocalOnlyPies(pieIds, pieNames);
            pieIds = merged.pieIds;
            pieNames = merged.pieNames;

            // Preserve local active pie if valid, otherwise default to first
            let activePieId = DataModel.getActivePieId();
            if (!activePieId || !pieIds.includes(activePieId)) {
                activePieId = pieIds[0];
            }

            // Update local meta to match Firebase
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

                // Save to localStorage backup
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

            // Set up listeners for the correct pie
            StorageAdapter.setupFirebaseListener();

            App.render();
            Storage.showStatus('Synced from cloud', 'success');
            return;
        }

        // 3. Firebase is completely empty — offer to push local data
        const hasLocalData = DataModel.categories && DataModel.categories.length > 0;
        if (hasLocalData) {
            const shouldPush = confirm(
                'Firebase is empty but you have local data.\n\n' +
                'Would you like to upload your existing data to the cloud?\n\n' +
                'Click OK to upload, or Cancel to start fresh.'
            );

            if (shouldPush) {
                // Create multi-pie structure in Firebase from local data
                const pieId = DataModel.getActivePieId() || DataModel.generatePieId();
                const pieName = DataModel.currentPieName || 'My Pie';
                const newMeta = {
                    pieIds: [pieId],
                    pieNames: { [pieId]: pieName }
                };

                await FirebaseAdapter.saveMeta(newMeta);
                await FirebaseAdapter.savePie(pieId, {
                    id: pieId,
                    name: pieName,
                    categories: DataModel.categories,
                    categoryPercentageOverrides: DataModel.categoryPercentageOverrides || {}
                });

                // Update local meta
                DataModel.pieMeta = { ...newMeta, activePieId: pieId };
                DataModel.setActivePieId(pieId);
                Storage.saveMeta(DataModel.pieMeta);

                // Push priorities
                if (DataModel.priorityList && DataModel.priorityList.length > 0) {
                    await FirebaseAdapter.savePriorities(DataModel.priorityList, pieId);
                }

                StorageAdapter.setupFirebaseListener();
                App.render();
                Storage.showStatus('Local data uploaded to cloud', 'success');
            } else {
                DataModel.categories = [];
                DataModel.categoryPercentageOverrides = {};
                StorageAdapter.setupFirebaseListener();
                App.render();
                Storage.showStatus('Starting fresh', 'success');
            }
        } else {
            // No local data, no Firebase data — just set up listeners
            StorageAdapter.setupFirebaseListener();
        }
    },

    /**
     * Update sync status indicator in Settings
     * @param {string} state - 'online', 'offline', 'connecting', 'syncing', 'error'
     * @param {string} text - Status text to display
     */
    updateSyncStatus(state, text) {
        const indicator = document.querySelector('#cloud-sync-status .sync-indicator');
        const textEl = document.querySelector('#cloud-sync-status .sync-text');

        if (indicator) {
            indicator.className = 'sync-indicator ' + state;
        }
        if (textEl) {
            textEl.textContent = text;
        }
    },

    /**
     * Generate shareable URL with encoded config
     */
    generateShareURL() {
        const shareURL = FirebaseAdapter.generateShareURL();
        const input = document.getElementById('cloud-share-url');
        if (input && shareURL) {
            input.value = shareURL;
        }
    },

    /**
     * Copy share URL to clipboard
     */
    copyShareURL() {
        const input = document.getElementById('cloud-share-url');
        if (input) {
            input.select();
            input.setSelectionRange(0, 99999); // For mobile
            document.execCommand('copy');
            Storage.showStatus('URL copied to clipboard', 'success');
        }
    },

    /**
     * Export Firebase config as JSON file
     */
    exportFirebaseConfig() {
        const config = FirebaseAdapter.config;
        if (!config) {
            alert('No Firebase config to export');
            return;
        }

        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `firebase-config-${config.projectId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Storage.showStatus('Config exported', 'success');
    },

    /**
     * Load cloud sync state when Settings opened
     */
    loadCloudSyncState() {
        const cloudSyncEnabled = localStorage.getItem('cloudSyncEnabled') === 'true';

        if (cloudSyncEnabled && FirebaseAdapter.config) {
            document.getElementById('cloud-sync-collapsed').style.display = 'none';
            document.getElementById('cloud-sync-expanded').style.display = 'block';

            // Hide config form if already connected
            if (FirebaseAdapter.app) {
                document.getElementById('firebase-config-form').style.display = 'none';
                document.getElementById('firebase-auth-section').style.display = 'block';
            }

            this.updateAuthUI();
            this.generateShareURL();
        } else {
            document.getElementById('cloud-sync-collapsed').style.display = 'block';
            document.getElementById('cloud-sync-expanded').style.display = 'none';

            // Check for URL config (for first-time setup)
            const urlConfig = FirebaseAdapter.parseConfigFromURL();
            if (urlConfig) {
                // Pre-fill config and show expanded view
                document.getElementById('cloud-sync-collapsed').style.display = 'none';
                document.getElementById('cloud-sync-expanded').style.display = 'block';
                document.getElementById('firebase-config-input').value = JSON.stringify(urlConfig, null, 2);
            }
        }
    },

    /**
     * Update the main UI sync indicator in #storage-status area
     * @param {string|null} state - 'synced', 'syncing', 'offline', or null to hide
     * @param {string|null} projectName - Project ID to display, or null
     */
    updateMainSyncIndicator(state, projectName) {
        const statusEl = document.getElementById('storage-status');
        if (!statusEl) return;

        if (!state || !projectName) {
            // Clear the indicator (revert to normal status behavior)
            const existingBadge = statusEl.querySelector('.cloud-sync-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            return;
        }

        // Create or update the badge
        let badge = statusEl.querySelector('.cloud-sync-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'cloud-sync-badge';
            statusEl.innerHTML = ''; // Clear any existing status
            statusEl.appendChild(badge);
        }

        badge.className = 'cloud-sync-badge ' + state;
        badge.innerHTML = `
            <span class="sync-icon">🔄</span>
            <span class="sync-project">${projectName}</span>
        `;
    }

});
