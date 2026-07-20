// Storage settings controller
// Handles two settings sections:
//   1. Working mode (local file sync)
//   2. Cloud backup (Firebase on-demand backup + optional live sync upgrade)
//
// The live Firebase sync path (connectFirebase, signInWithGoogle, updateAuthUI,
// reloadDataFromFirebase, etc.) continues to live in cloud-sync-controller.js.
// This controller adds the backup-specific UI on top of that.

Object.assign(UI, {

    // =========================================================================
    // Local file disconnect banner
    // =========================================================================
    // Wired to LocalFileAdapter.onDisconnect/onReconnect in StorageAdapter.init().
    // Reuses the existing #storage-status badge (see updateMainSyncIndicator in
    // cloud-sync-controller.js) rather than a separate banner component — same
    // spot the user already checks, one fewer new UI pattern to maintain.

    /**
     * Show the "local file sync disconnected" state in the main sync badge.
     * Clickable — retrying from here runs inside the click's user gesture, which
     * is what actually lets requestPermission() succeed (see reconnect() in
     * local-file-adapter.js and the comment in StorageAdapter.init()).
     * @param {string|null} fileName
     * @param {string} reason
     */
    showLocalFileDisconnected(fileName, reason) {
        const statusEl = document.getElementById('storage-status');
        if (!statusEl) return;

        let badge = statusEl.querySelector('.cloud-sync-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'cloud-sync-badge';
            statusEl.innerHTML = '';
            statusEl.appendChild(badge);
        }

        badge.className = 'cloud-sync-badge disconnected';
        badge.title = reason || 'Local file sync disconnected';
        badge.innerHTML = `
            <span class="sync-icon">⚠️</span>
            <span class="sync-project">${fileName ? 'Reconnect ' + fileName : 'Reconnect file sync'}</span>
        `;
        badge.onclick = () => this._reconnectLocalFile();
    },

    /**
     * Clear the disconnected state — either the reconnect succeeded, or a write
     * just went through fine so whatever was wrong isn't anymore.
     * @param {string|null} fileName
     */
    clearLocalFileDisconnected(fileName) {
        const statusEl = document.getElementById('storage-status');
        if (!statusEl) return;
        const badge = statusEl.querySelector('.cloud-sync-badge');
        if (badge && badge.classList.contains('disconnected')) {
            badge.remove();
        }
        if (typeof Storage !== 'undefined' && fileName) {
            Storage.showStatus('Reconnected to ' + fileName, 'success');
        }
    },

    /**
     * Click handler for the disconnected badge. Runs inside the click's gesture,
     * so requestPermission() (via LocalFileAdapter.reconnect()) can actually
     * prompt and succeed, unlike the automatic restore attempt on page load.
     */
    async _reconnectLocalFile() {
        const badge = document.querySelector('#storage-status .cloud-sync-badge.disconnected');
        if (badge) {
            badge.innerHTML = '<span class="sync-icon">🔄</span><span class="sync-project">Reconnecting…</span>';
        }

        const ok = await LocalFileAdapter.reconnect();
        if (ok) {
            StorageAdapter.currentMode = 'file';
            StorageAdapter.adapter = LocalFileAdapter;
            localStorage.setItem('localFileSyncEnabled', 'true');
            this._updateLocalFileStatus();
            // clearLocalFileDisconnected() already fires via onReconnect, but the
            // click itself should give instant feedback rather than waiting on
            // whatever the next background write happens to be.
        } else {
            alert('Could not reconnect. If your browser is asking for permission in a popup, grant it and click Reconnect again.');
        }
    },

    // =========================================================================
    // Section 1 — Working mode (local file)
    // =========================================================================

    /**
     * Called when the Settings panel opens.
     * Gates the local file toggle on browser support, then shows the correct state.
     */
    loadLocalFileSyncState() {
        const section      = document.getElementById('local-file-sync-section');
        const unsupported  = document.getElementById('local-file-unsupported');
        const collapsed    = document.getElementById('local-file-collapsed');
        const expanded     = document.getElementById('local-file-expanded');

        if (!section) return;

        const supportsFileAPI = typeof window.showOpenFilePicker === 'function';

        if (!supportsFileAPI) {
            if (collapsed)   collapsed.style.display   = 'none';
            if (expanded)    expanded.style.display    = 'none';
            if (unsupported) unsupported.style.display = 'block';
            return;
        }

        if (unsupported) unsupported.style.display = 'none';

        if (StorageAdapter.isLocalFileMode()) {
            this._showLocalFileExpanded();
        } else {
            this._showLocalFileCollapsed();
        }
    },

    /**
     * User clicked "Save to a local file" — expand the section.
     */
    enableLocalFileSync() {
        this._showLocalFileExpanded();
        this._updateLocalFileStatus();
    },

    /**
     * User clicked "Choose file" — open the file picker.
     */
    async openLocalFile() {
        try {
            await LocalFileAdapter.openFile();
            if (LocalFileAdapter.isConnected()) {
                await StorageAdapter.enableLocalFileSync();
                this._updateLocalFileStatus();
                this.updateMainSyncIndicator('synced', LocalFileAdapter.getFileName());
            }
        } catch (e) {
            console.error('LocalFileSync: openFile failed:', e);
            alert('Could not open the file: ' + e.message);
        }
    },

    /**
     * User clicked "New file" — open the save picker.
     */
    async createLocalFile() {
        try {
            await LocalFileAdapter.createFile();
            if (LocalFileAdapter.isConnected()) {
                await StorageAdapter.enableLocalFileSync();
                this._updateLocalFileStatus();
                this.updateMainSyncIndicator('synced', LocalFileAdapter.getFileName());
            }
        } catch (e) {
            console.error('LocalFileSync: createFile failed:', e);
            alert('Could not create the file: ' + e.message);
        }
    },

    /**
     * User clicked "Stop saving to file".
     */
    async disableLocalFileSync() {
        if (!confirm('Stop saving to the local file? Your data will remain in browser storage.')) return;

        await StorageAdapter.disableLocalFileSync();

        this._showLocalFileCollapsed();
        this.updateMainSyncIndicator(null, null);
    },

    // -----------------------------------------------------------------------
    // Local file UI helpers
    // -----------------------------------------------------------------------

    _showLocalFileCollapsed() {
        const collapsed = document.getElementById('local-file-collapsed');
        const expanded  = document.getElementById('local-file-expanded');
        if (collapsed) collapsed.style.display = 'block';
        if (expanded)  expanded.style.display  = 'none';
    },

    _showLocalFileExpanded() {
        const collapsed = document.getElementById('local-file-collapsed');
        const expanded  = document.getElementById('local-file-expanded');
        if (collapsed) collapsed.style.display = 'none';
        if (expanded)  expanded.style.display  = 'block';
        this._updateLocalFileStatus();
    },

    /**
     * Refresh the file status line.
     */
    _updateLocalFileStatus() {
        const indicator = document.querySelector('#local-file-status .sync-indicator');
        const textEl    = document.getElementById('local-file-status-text');
        if (!indicator || !textEl) return;

        const fileName = LocalFileAdapter.getFileName();
        if (fileName) {
            indicator.className = 'sync-indicator online';
            textEl.textContent  = fileName;
        } else {
            indicator.className = 'sync-indicator offline';
            textEl.textContent  = 'No file selected';
        }
    },

    // =========================================================================
    // Section 2 — Cloud backup
    // =========================================================================

    /**
     * Called when the Settings panel opens.
     * Determines which sub-panel to show based on StorageAdapter state.
     */
    loadCloudBackupState() {
        const isLive   = StorageAdapter.currentMode === 'firebase' && FirebaseAdapter.isConnected();
        const hasBackup = StorageAdapter.hasFirebaseBackup();
        const backupConfigured = localStorage.getItem('firebaseBackupEnabled') === 'true'
                              || localStorage.getItem('cloudSyncEnabled') === 'true';

        if (isLive) {
            this._showCloudBackupPanel('live');
            this._updateLiveSyncUI();
        } else if (hasBackup || backupConfigured) {
            this._showCloudBackupPanel('controls');
            this._updateBackupControls();
        } else {
            // Check for URL config (first-time setup via shared link)
            const urlConfig = FirebaseAdapter.parseConfigFromURL();
            if (urlConfig) {
                this._showCloudBackupPanel('config-form');
                const input = document.getElementById('firebase-config-input');
                if (input) input.value = JSON.stringify(urlConfig, null, 2);
            } else {
                this._showCloudBackupPanel('unconfigured');
            }
        }
    },

    /**
     * Show the "Configure Firebase" input form.
     */
    showFirebaseBackupConfig() {
        this._showCloudBackupPanel('config-form');
    },

    /**
     * Cancel the config form and return to unconfigured state.
     */
    hideFirebaseBackupConfig() {
        this._showCloudBackupPanel('unconfigured');
    },

    /**
     * User submitted the Firebase config form — connect as backup.
     */
    async connectFirebaseBackup() {
        let configText = (document.getElementById('firebase-config-input') || {}).value || '';
        configText = configText.trim();

        if (!configText) {
            alert('Please paste your Firebase config JSON first.');
            return;
        }

        try {
            // Handle JavaScript object syntax from Firebase console (unquoted keys)
            configText = configText.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
            const config = JSON.parse(configText);

            if (!config.apiKey || !config.authDomain || !config.databaseURL || !config.projectId) {
                alert('Invalid Firebase config. Required fields: apiKey, authDomain, databaseURL, projectId');
                return;
            }

            // Show auth panel while we initialise
            this._showCloudBackupPanel('auth');

            const ok = await StorageAdapter.configureFirebaseBackup(config);
            if (!ok) {
                alert('Could not connect to Firebase. Check the config and try again.');
                this._showCloudBackupPanel('config-form');
                return;
            }

            // Set up auth change listener so UI updates on sign-in
            FirebaseAdapter.onAuthStateChanged(() => {
                this._onFirebaseAuthChange();
            });

            // Show correct sub-panel based on auth state
            this._onFirebaseAuthChange();

        } catch (e) {
            console.error('Firebase backup connection error:', e);
            alert('Invalid Firebase config. Please paste valid JSON.\n\nError: ' + e.message);
        }
    },

    /**
     * Called on Firebase auth state changes (sign-in / sign-out).
     * Routes to the right backup sub-panel.
     */
    _onFirebaseAuthChange() {
        const isLive = StorageAdapter.currentMode === 'firebase';
        const user   = FirebaseAdapter.user;

        if (isLive && user) {
            this._showCloudBackupPanel('live');
            this._updateLiveSyncUI();
            this.updateMainSyncIndicator('synced', FirebaseAdapter.getProjectId());
            return;
        }

        if (user) {
            // Signed in but not live — backup mode
            this._showCloudBackupPanel('controls');
            this._updateBackupControls();
            // Ensure backup adapter is set
            if (!StorageAdapter.backupAdapter) {
                StorageAdapter.backupAdapter = FirebaseAdapter;
            }
        } else {
            // Not signed in — show auth panel
            if (FirebaseAdapter.app) {
                this._showCloudBackupPanel('auth');
            } else {
                this._showCloudBackupPanel('unconfigured');
            }
        }

        // Keep legacy updateAuthUI in sync (for signed-in/signed-out elements)
        if (typeof this._syncFirebaseUserElements === 'function') {
            this._syncFirebaseUserElements(FirebaseAdapter.user);
        }
    },

    /**
     * Update the backup controls panel (last backup timestamp, user info, share URL).
     */
    _updateBackupControls() {
        const ts = StorageAdapter.getLastBackupTimestamp();

        // Last backup timestamp
        const tsEl = document.getElementById('cloud-backup-last-ts');
        if (tsEl) {
            if (ts) {
                const d = new Date(ts);
                tsEl.textContent = 'Last backup: ' + d.toLocaleString();
            } else {
                tsEl.textContent = 'Last backup: never';
            }
        }

        // Sync indicator state
        const indicator = document.querySelector('#cloud-sync-status .sync-indicator');
        if (indicator) {
            indicator.className = ts ? 'sync-indicator online' : 'sync-indicator offline';
        }

        // User info strip inside the controls panel
        const user = FirebaseAdapter.user;
        const photoEl = document.getElementById('cloud-backup-user-photo');
        const nameEl  = document.getElementById('cloud-backup-user-name');
        if (user) {
            if (photoEl) { photoEl.src = user.photoURL || ''; photoEl.style.display = user.photoURL ? 'block' : 'none'; }
            if (nameEl)  nameEl.textContent = user.displayName || user.email;
        } else {
            if (nameEl) nameEl.textContent = '';
        }

        // Share URL (shown once signed in)
        const shareSection = document.getElementById('share-url-section');
        if (shareSection) {
            if (FirebaseAdapter.isConnected()) {
                shareSection.style.display = 'block';
                const input = document.getElementById('cloud-share-url');
                if (input) input.value = FirebaseAdapter.generateShareURL() || '';
            } else {
                shareSection.style.display = 'none';
            }
        }
    },

    /**
     * Update the live sync panel UI.
     */
    _updateLiveSyncUI() {
        const user = FirebaseAdapter.user;

        const signedInLive = document.getElementById('firebase-signed-in-live');
        if (signedInLive && user) {
            signedInLive.style.display = 'block';
            const photo = document.getElementById('firebase-user-photo-live');
            const name  = document.getElementById('firebase-user-name-live');
            if (photo) photo.src = user.photoURL || '';
            if (name)  name.textContent = user.displayName || user.email;
        }

        // Share URL in live panel
        const shareSection = document.getElementById('share-url-section-live');
        if (shareSection && FirebaseAdapter.isConnected()) {
            shareSection.style.display = 'block';
            const input = document.getElementById('cloud-share-url-live');
            if (input) input.value = FirebaseAdapter.generateShareURL() || '';
        }
    },

    /**
     * Switch between the cloud backup sub-panels.
     * @param {'unconfigured'|'config-form'|'auth'|'controls'|'live'} panel
     */
    _showCloudBackupPanel(panel) {
        const ids = {
            'unconfigured': 'cloud-backup-unconfigured',
            'config-form':  'cloud-backup-config-form',
            'auth':         'cloud-backup-auth',
            'controls':     'cloud-backup-controls',
            'live':         'cloud-sync-live-section'
        };
        Object.entries(ids).forEach(([key, id]) => {
            const el = document.getElementById(id);
            if (el) el.style.display = (key === panel) ? 'block' : 'none';
        });
    },

    // -----------------------------------------------------------------------
    // Cloud backup action buttons
    // -----------------------------------------------------------------------

    /**
     * "Back up now" button — push current state to Firebase.
     */
    async backupNow() {
        if (!StorageAdapter.hasFirebaseBackup() && StorageAdapter.currentMode !== 'firebase') {
            alert('Firebase is not connected. Please sign in first.');
            return;
        }

        const btn = document.querySelector('#cloud-backup-controls button[onclick*="backupNow"]');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Backing up...';
        }

        try {
            const ok = await StorageAdapter.pushToFirebase();
            if (ok) {
                this._updateBackupControls();
                if (typeof Storage !== 'undefined') Storage.showStatus('Backed up to Firebase', 'success');
            } else {
                alert('Backup failed. Make sure Firebase is connected.');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Back up now';
            }
        }
    },

    /**
     * "Restore from backup" button — pull latest snapshot from Firebase.
     */
    async restoreFromBackup() {
        await StorageAdapter.pullFromFirebase();
        // Update timestamp display after restore
        this._updateBackupControls();
    },

    /**
     * "Switch to live sync" button — promote backup to live Firebase mode.
     */
    async switchToLiveSync() {
        if (!confirm(
            'Switch to live Firebase sync?\n\n' +
            'Your data will sync in real-time across all devices. ' +
            'You can revert to backup-only mode by disabling live sync.'
        )) return;

        // Delegate to the existing cloud sync sign-in flow
        // enableLiveFirebaseSync() sets cloudSyncEnabled and calls enableCloudSync()
        const ok = await StorageAdapter.enableLiveFirebaseSync();
        if (ok) {
            this._showCloudBackupPanel('live');
            this._updateLiveSyncUI();
            this.loadLocalFileSyncState();
            this.updateMainSyncIndicator('synced', FirebaseAdapter.getProjectId());
        } else {
            alert('Could not enable live sync. Check Firebase config.');
        }
    },

    /**
     * "Remove backup" — clear Firebase backup config.
     */
    async disableFirebaseBackup() {
        if (!confirm('Disconnect Firebase config? Your data in Firebase is untouched. You can reconnect at any time.')) return;
        StorageAdapter.disableFirebaseBackup();
        this._showCloudBackupPanel('unconfigured');
        this.updateMainSyncIndicator(null, null);
    },

    // -----------------------------------------------------------------------
    // Live sync sign-in (wires up existing cloud-sync-controller flow)
    // -----------------------------------------------------------------------

    /**
     * Called from the "Sign in with Google" button in the cloud backup auth panel.
     * Delegates to the existing signInWithGoogle method which handles Firebase auth.
     */
    // signInWithGoogle is already defined in cloud-sync-controller.js and handles this.

    /**
     * "Disable live sync" — sign out and revert to backup-only mode.
     * Overrides the method in cloud-sync-controller.js to update the new UI.
     */
    async disableCloudSync() {
        if (!confirm('Disable live sync? Your data will be saved locally and you can still use on-demand backup.')) return;

        await StorageAdapter.disableCloudSync();

        // If backup config is still saved, go to controls; otherwise unconfigured
        const wasBackup = localStorage.getItem('firebaseBackupEnabled') === 'true';
        if (wasBackup && FirebaseAdapter.config) {
            this._showCloudBackupPanel('controls');
            this._updateBackupControls();
        } else {
            this._showCloudBackupPanel('unconfigured');
        }

        this.updateMainSyncIndicator(null, null);
    },

    /**
     * Copy share URL. Handles both backup-panel and live-panel URL inputs.
     * @param {'live'|undefined} variant
     */
    copyShareURL(variant) {
        const inputId = variant === 'live' ? 'cloud-share-url-live' : 'cloud-share-url';
        const input = document.getElementById(inputId);
        if (input) {
            input.select();
            input.setSelectionRange(0, 99999);
            document.execCommand('copy');
            if (typeof Storage !== 'undefined') Storage.showStatus('URL copied to clipboard', 'success');
        }
    },

    // -----------------------------------------------------------------------
    // Hook into showSettings
    // -----------------------------------------------------------------------

    /**
     * Load both sections when Settings opens.
     * Called via the patched showSettings below.
     */
    loadStorageSettings() {
        this.loadLocalFileSyncState();
        this.loadCloudBackupState();
    }

});

// -----------------------------------------------------------------------
// Patch showSettings to load storage settings on open.
// -----------------------------------------------------------------------
(function patchShowSettings() {
    const original = UI.showSettings.bind(UI);
    UI.showSettings = function () {
        original();
        this.loadStorageSettings();
    };
})();
