// Cloud Sync Controller — Firebase/cloud sync UI methods

Object.assign(UI, {

    // ==========================================
    // Cloud Sync / Firebase Methods
    // ==========================================

    /**
     * Enable cloud sync - show expanded UI.
     * Delegates to the new backup panel in local-file-sync-controller.js.
     */
    enableCloudSync() {
        // If the new backup panel exists, delegate to it
        if (typeof this.showFirebaseBackupConfig === 'function') {
            this.showFirebaseBackupConfig();
            return;
        }

        // Fallback: legacy path
        const urlConfig = FirebaseAdapter.parseConfigFromURL();
        if (urlConfig) {
            const input = document.getElementById('firebase-config-input');
            if (input) input.value = JSON.stringify(urlConfig, null, 2);
            this.connectFirebase();
        }
    },

    /**
     * Disable cloud sync.
     * If the new panel is available, delegates to its override; otherwise falls back.
     * Note: local-file-sync-controller.js overrides this method via Object.assign after
     * cloud-sync-controller.js loads, so by the time users click the button the
     * override is in place. This version is only reached if the new controller
     * hasn't loaded yet (shouldn't happen in normal flow).
     */
    async _disableCloudSyncLegacy() {
        if (!confirm('Disable Cloud Sync? Your data will remain in localStorage.')) return;

        await StorageAdapter.disableCloudSync();
        this.updateSyncStatus('offline', 'Disconnected');
        this.updateMainSyncIndicator(null, null);
    },

    /**
     * Connect to Firebase with config from textarea.
     * In the new architecture this is the backup flow — delegates to connectFirebaseBackup().
     */
    async connectFirebase() {
        if (typeof this.connectFirebaseBackup === 'function') {
            return this.connectFirebaseBackup();
        }
        // Legacy fallback
        return this._connectFirebaseLegacy();
    },

    async _connectFirebaseLegacy() {
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

            const configForm = document.getElementById('firebase-config-form') || document.getElementById('cloud-backup-config-form');
            const authSection = document.getElementById('firebase-auth-section');
            if (configForm)   configForm.style.display   = 'none';
            if (authSection)  authSection.style.display  = 'block';

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
     * Update auth UI based on current user state.
     * Handles two modes:
     *   - Backup mode (firebaseBackupEnabled=true, currentMode != 'firebase'):
     *     Do NOT call enableCloudSync() — just record that auth is available.
     *   - Live sync mode (cloudSyncEnabled=true, currentMode='firebase'):
     *     Enable StorageAdapter firebase mode, reload data, etc. (original behaviour).
     */
    updateAuthUI() {
        const user = FirebaseAdapter.user;
        const isLiveMode = localStorage.getItem('cloudSyncEnabled') === 'true'
                        || StorageAdapter.currentMode === 'firebase';

        if (user) {
            // Sync signed-in user elements (IDs that may exist in backup or live panels)
            this._syncFirebaseUserElements(user);

            if (isLiveMode) {
                this.updateSyncStatus('online', 'Connected as ' + (user.displayName || user.email));

                // Enable live firebase mode in StorageAdapter
                StorageAdapter.enableCloudSync(FirebaseAdapter.config);

                // Update main UI indicator
                this.updateMainSyncIndicator('synced', FirebaseAdapter.getProjectId());

                // Reload data from Firebase (only on first auth, not every Settings open)
                if (!this._hasReloadedFromFirebase) {
                    this._hasReloadedFromFirebase = true;
                    this.reloadDataFromFirebase();
                }
            } else {
                // Backup mode — Firebase is available but we stay in local/file mode.
                // Mark the backup adapter ready.
                if (StorageAdapter.currentMode !== 'firebase') {
                    StorageAdapter.backupAdapter = FirebaseAdapter;
                }
                this.updateSyncStatus('online', 'Firebase connected (backup mode)');
            }

            // Sync calendar events (now that we have a fresh token)
            if (typeof App !== 'undefined' && App.syncCalendarEvents) {
                App.syncCalendarEvents();
            }

            this.updateCalendarImportButton();
        } else {
            // Signed out
            const signedOut = document.getElementById('firebase-signed-out');
            const signedIn  = document.getElementById('firebase-signed-in');
            if (signedOut) signedOut.style.display = 'block';
            if (signedIn)  signedIn.style.display  = 'none';

            const shareUrl = document.getElementById('share-url-section');
            if (shareUrl) shareUrl.style.display = 'none';

            this.updateSyncStatus('offline', 'Not signed in');
            this.updateMainSyncIndicator(null, null);
            this.updateCalendarImportButton();
        }
    },

    /**
     * Sync user photo/name into any firebase-user-photo/name elements that exist in the DOM.
     * Works with both the old single-instance IDs and the new duplicated backup/live panel IDs.
     * @param {Object|null} user
     */
    _syncFirebaseUserElements(user) {
        if (!user) return;
        // All elements with these IDs (there may be more than one in the new layout)
        document.querySelectorAll('#firebase-user-photo').forEach(el => { el.src = user.photoURL || ''; });
        document.querySelectorAll('#firebase-user-name').forEach(el => { el.textContent = user.displayName || user.email; });

        document.querySelectorAll('#firebase-signed-out').forEach(el => { el.style.display = 'none'; });
        document.querySelectorAll('#firebase-signed-in').forEach(el => { el.style.display = 'block'; });

        // Share URL section
        const shareSection = document.getElementById('share-url-section');
        if (shareSection) {
            shareSection.style.display = 'block';
            const input = document.getElementById('cloud-share-url');
            if (input) input.value = FirebaseAdapter.generateShareURL() || '';
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

            // Preserve local active pie if valid and not tombstoned, otherwise default to first non-tombstoned
            let activePieId = DataModel.getActivePieId();
            if (!activePieId || !pieIds.includes(activePieId) || tombstonedPieIds.includes(activePieId)) {
                activePieId = pieIds.find(id => !tombstonedPieIds.includes(id)) || pieIds[0];
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

        // 3. Firebase is completely empty — offer to push local data.
        // In personal mode, local data may belong to a different user (same device),
        // so skip the prompt and start fresh for this user.
        const hasLocalData = DataModel.categories && DataModel.categories.length > 0;
        if (hasLocalData && !FirebaseAdapter.isPersonalMode()) {
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
        } else if (FirebaseAdapter.isPersonalMode() && hasLocalData) {
            // Personal mode + empty Firebase: bootstrap this user's personal space
            // with local data (example data for a new user, or their own data on a
            // returning device). Skip the confirm — local data in personal mode
            // always belongs to this user's session.
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
            }
            StorageAdapter.setupFirebaseListener();
            App.render();
            Storage.showStatus('Data saved to your personal cloud', 'success');
        } else if (FirebaseAdapter.isPersonalMode()) {
            // Personal mode, no local data, no Firebase data — brand new user.
            // Initialise a default pie in memory and write meta to Firebase so
            // subsequent saves have a valid pie ID to write to.
            const pieId = DataModel.generatePieId ? DataModel.generatePieId() : ('pie-' + Date.now());
            const pieName = 'My Pie';
            const newMeta = { pieIds: [pieId], pieNames: { [pieId]: pieName } };
            DataModel.pieMeta = { ...newMeta, activePieId: pieId };
            DataModel.setActivePieId(pieId);
            DataModel.currentPieName = pieName;
            Storage.saveMeta(DataModel.pieMeta);
            await FirebaseAdapter.saveMeta(newMeta);
            StorageAdapter.setupFirebaseListener();
            App.render();
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
     * Load cloud sync state when Settings opened.
     * The new UI is handled by loadCloudBackupState() in local-file-sync-controller.js,
     * which is called via loadStorageSettings(). This method is kept for backwards
     * compatibility but delegates to the new handler if available.
     */
    loadCloudSyncState() {
        if (typeof this.loadCloudBackupState === 'function') {
            this.loadCloudBackupState();
            return;
        }
        // Fallback for environments where the new controller hasn't loaded
        this.updateAuthUI();
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
