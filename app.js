/**
 * Debug configuration for development and testing.
 * Set flags to true to enable specific debug behaviors.
 */
const Debug = {
    // Master switch - set to true to enable debug mode
    enabled: false,

    // Individual debug flags (only apply when enabled = true)
    flags: {
        // Allow multiple branch views to be open simultaneously for alignment checking
        allowMultipleBranches: true,
        // Firebase debug flags
        firebaseVerbose: false,      // Log all Firebase read/write operations
        skipFirebaseAuth: false,     // Allow anonymous access for testing
        forceOfflineMode: false,     // Simulate offline to test localStorage fallback
        showSyncConflicts: false,    // Log when sync conflicts are detected/resolved
    },

    // Check if a specific debug feature is active
    isActive(flag) {
        return this.enabled && this.flags[flag];
    },

    // Toggle debug mode on/off
    toggle() {
        this.enabled = !this.enabled;
        console.log(`Debug mode: ${this.enabled ? 'ON' : 'OFF'}`);
        return this.enabled;
    },

    // Log debug info (only when enabled)
    log(...args) {
        if (this.enabled) {
            console.log('[DEBUG]', ...args);
        }
    }
};

// Expose Debug globally for console access
window.Debug = Debug;

const License = {
    _active: false,
    WORKER_URL: 'https://brain-pie-license.brainpie.workers.dev/validate',

    // Called on app init — validates stored key against the Worker
    async init() {
        // Developer bypass: brainPie_pro flag skips network validation
        if (localStorage.getItem('brainPie_pro') === 'true') {
            this._active = true;
            return;
        }
        const storedKey = localStorage.getItem('brainPie_licenseKey');
        if (storedKey) {
            this._active = await this._validateRemote(storedKey);
            if (!this._active) {
                localStorage.removeItem('brainPie_licenseKey');
                Debug.log('License: stored key is invalid or revoked — cleared');
            }
        }
    },

    isActive() {
        return this._active;
    },

    async _validateRemote(key) {
        try {
            const resp = await fetch(this.WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });
            const { valid } = await resp.json();
            return valid === true;
        } catch {
            // Network error: fail open (trust stored key to avoid locking out users)
            Debug.log('License: network error during validation — failing open');
            return true;
        }
    },

    // Called from UI activate button
    async activate(key) {
        const valid = await this._validateRemote(key);
        if (valid) {
            localStorage.setItem('brainPie_licenseKey', key.trim());
            this._active = true;
        }
        return valid;
    },

    // Developer bypass — run License.activateDev() once in the browser console
    activateDev() {
        localStorage.setItem('brainPie_pro', 'true');
        this._active = true;
        console.log('Dev pro unlocked. Reloading…');
        location.reload();
    },

    deactivate() {
        localStorage.removeItem('brainPie_licenseKey');
        localStorage.removeItem('brainPie_pro');
        this._active = false;
        console.log('Pro removed. Reloading…');
        location.reload();
    }
};

window.License = License;

const Controls = {
  HIDE_LABELS_KEY: 'hideSubitemLabels',

  init() {
    const checkboxDesktop = document.getElementById('hide-labels');
    const checkboxMobile = document.getElementById('hide-labels-mobile');
    const container = document.getElementById('chart-container');

    // Restore state from localStorage
    const stored = localStorage.getItem(this.HIDE_LABELS_KEY);
    const hide = stored === 'true';

    // Set both checkboxes to the stored state
    if (checkboxDesktop) checkboxDesktop.checked = hide;
    if (checkboxMobile) checkboxMobile.checked = hide;
    container.classList.toggle('hide-subitem-labels', hide);

    // Helper to sync both checkboxes and update state
    const updateState = (shouldHide) => {
      if (checkboxDesktop) checkboxDesktop.checked = shouldHide;
      if (checkboxMobile) checkboxMobile.checked = shouldHide;
      container.classList.toggle('hide-subitem-labels', shouldHide);
      localStorage.setItem(this.HIDE_LABELS_KEY, String(shouldHide));
      // Re-render so schedule pill positions are computed with correct visibility.
      // getBBox() returns zeros on hidden elements, placing pills at the pie edge.
      ChartRenderer.init('chart-container');
      App.render();
    };

    // Add change listeners to both checkboxes
    if (checkboxDesktop) {
      checkboxDesktop.addEventListener('change', (e) => updateState(e.target.checked));
    }
    if (checkboxMobile) {
      checkboxMobile.addEventListener('change', (e) => updateState(e.target.checked));
    }

    this.initViewMode();
    this.initFocusPrioritised();
  },

  VIEW_MODE_KEY: 'viewMode',

  initViewMode() {
    const checkboxDesktop = document.getElementById('view-mode-toggle');
    const checkboxMobile = document.getElementById('view-mode-toggle-mobile');
    const container = document.getElementById('chart-container');

    const stored = localStorage.getItem(this.VIEW_MODE_KEY);
    const isTree = stored ? stored === 'tree' : window.innerWidth < 960;

    if (checkboxDesktop) checkboxDesktop.checked = isTree;
    if (checkboxMobile) checkboxMobile.checked = isTree;
    ChartRenderer.viewMode = isTree ? 'tree' : 'pie';
    container.classList.toggle('tree-view', isTree);
    container.classList.toggle('pie-view', !isTree);

    const updateViewMode = (shouldBeTree) => {
      if (checkboxDesktop) checkboxDesktop.checked = shouldBeTree;
      if (checkboxMobile) checkboxMobile.checked = shouldBeTree;
      localStorage.setItem(this.VIEW_MODE_KEY, shouldBeTree ? 'tree' : 'pie');
      ChartRenderer.viewMode = shouldBeTree ? 'tree' : 'pie';
      container.classList.toggle('tree-view', shouldBeTree);
      container.classList.toggle('pie-view', !shouldBeTree);

      ChartRenderer.expandedView = null;
      ChartRenderer.collapseIfBranchExpanded();
      ChartRenderer.init('chart-container');
      App.render();
    };

    if (checkboxDesktop) {
      checkboxDesktop.addEventListener('change', (e) => updateViewMode(e.target.checked));
    }
    if (checkboxMobile) {
      checkboxMobile.addEventListener('change', (e) => updateViewMode(e.target.checked));
    }
  },

  FOCUS_PRIORITISED_KEY: 'focusPrioritised',

  initFocusPrioritised() {
    const checkboxDesktop = document.getElementById('focus-prioritised');
    const checkboxMobile = document.getElementById('focus-prioritised-mobile');

    const stored = localStorage.getItem(this.FOCUS_PRIORITISED_KEY);
    const focus = stored === 'true';

    if (checkboxDesktop) checkboxDesktop.checked = focus;
    if (checkboxMobile) checkboxMobile.checked = focus;

    const updateState = (shouldFocus) => {
      if (checkboxDesktop) checkboxDesktop.checked = shouldFocus;
      if (checkboxMobile) checkboxMobile.checked = shouldFocus;
      localStorage.setItem(this.FOCUS_PRIORITISED_KEY, String(shouldFocus));
      App.render();
    };

    if (checkboxDesktop) {
      checkboxDesktop.addEventListener('change', (e) => updateState(e.target.checked));
    }
    if (checkboxMobile) {
      checkboxMobile.addEventListener('change', (e) => updateState(e.target.checked));
    }
  }
};

const App = {
    async init() {
        // Initialize StorageAdapter first (handles URL config parsing for Firebase)
        if (typeof StorageAdapter !== 'undefined') {
            await StorageAdapter.init();

            // Subscribe to real-time updates from Firebase (shared pie data — no priorities)
            StorageAdapter.subscribeToUpdates((data) => {
                if (data && data.categories) {
                    Debug.log('Received remote data update');
                    const { _saveId, _savedBy, priorityList: _ignoredPriorities, lastModified, lastModifiedBy, ...cleanData } = data;

                    // Reject remote updates with no content (stale/empty data)
                    const hasContent = cleanData.categories.some(c =>
                        c.items && c.items.length > 0
                    );
                    const localHasContent = DataModel.categories.some(c =>
                        c.items && c.items.length > 0
                    );
                    if (!hasContent && localHasContent) {
                        Debug.log('StorageAdapter: Rejecting remote update — remote has empty categories but local has data');
                        return;
                    }

                    DataModel.categories = cleanData.categories || [];
                    DataModel.categoryPercentageOverrides = cleanData.categoryPercentageOverrides || {};
                    DataModel.normalizeAllSpokes();
                    DataModel.validatePriorityList();

                    // Save to localStorage backup
                    const pieId = DataModel.getActivePieId();
                    if (pieId) {
                        Storage.savePie(pieId, { ...cleanData, priorityList: DataModel.priorityList });
                    }

                    this.render();
                    Storage.showStatus('Synced from cloud', 'success');

                    if (typeof UI !== 'undefined' && UI.updateMainSyncIndicator) {
                        UI.updateMainSyncIndicator('synced', StorageAdapter.getProjectId());
                    }
                }
            });

            // Subscribe to per-user priority changes (same user, other devices)
            StorageAdapter.subscribeToPriorityChanges((priorityList) => {
                Debug.log('Received remote priority update');
                DataModel.priorityList = priorityList || [];
                DataModel.validatePriorityList();
                this.render();
            });

            // Subscribe to meta updates (team members adding/renaming/deleting pies)
            StorageAdapter.subscribeToMetaUpdates((remoteMeta) => {
                Debug.log('Received remote meta update');
                // Normalize pieIds (Firebase may convert arrays to objects)
                let remotePieIds = remoteMeta.pieIds || [];
                if (!Array.isArray(remotePieIds)) remotePieIds = Object.values(remotePieIds);
                const remotePieNames = remoteMeta.pieNames || {};
                let remoteTombstoned = remoteMeta.tombstonedPieIds || [];
                if (!Array.isArray(remoteTombstoned)) remoteTombstoned = Object.values(remoteTombstoned);

                // Preserve local activePieId (not synced via Firebase)
                const currentActive = DataModel.getActivePieId();

                // Use remote meta as source of truth (it came from Firebase)
                DataModel.pieMeta = {
                    pieIds: remotePieIds,
                    pieNames: remotePieNames,
                    activePieId: currentActive,
                    tombstonedPieIds: remoteTombstoned
                };

                // Save locally
                Storage.saveMeta(DataModel.pieMeta);
                UI.renderPieTabs();
            });
        }

        // Initialize Firebase from URL config BEFORE loading data, so that
        // loadFromStorageOrExample() can detect the config URL and skip example data.
        // Also allows cached auth to resolve before data loading.
        if (typeof FirebaseAdapter !== 'undefined') {
            const urlConfig = FirebaseAdapter.parseConfigFromURL();
            if (urlConfig) {
                try {
                    if (!FirebaseAdapter.app) {
                        await FirebaseAdapter.init(urlConfig);
                    }
                    await StorageAdapter.enableCloudSync(urlConfig);
                } catch (e) {
                    Debug.log('Firebase init from URL config failed:', e.message);
                }
            }
        }

        // Load data (now async to support Firebase)
        await DataModel.loadFromStorageOrExample();

        // Per-user priorities: load from Firebase user path if available (per-pie)
        if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
            const activePieId = DataModel.getActivePieId();
            const userPriorities = await StorageAdapter.loadPriorities(activePieId);
            if (userPriorities !== null && userPriorities.length > 0) {
                DataModel.priorityList = userPriorities;
                DataModel.validatePriorityList();
            } else if (DataModel.priorityList.length > 0) {
                Debug.log('Migrating shared priorities to per-user path');
                await StorageAdapter.savePriorities(DataModel.priorityList, activePieId);
            }
        }

        await License.init();
        if (License.isActive()) document.body.classList.add('pro-active');
        Controls.init();
        ChartRenderer.init('chart-container');
        UI.clearInputs();
        UI.clearCategoryInputs();
        this.render();

        // Restore prioritiser window state (open/closed + position)
        UI.restorePrioritiserState();

        if (typeof TutorialManager !== 'undefined' && TutorialManager.shouldStartTutorial()) {
            setTimeout(() => TutorialManager.start(), 500);
        }

        // Show sign-in banner if loaded with a Firebase config URL but not yet signed in
        if (typeof FirebaseAdapter !== 'undefined' && FirebaseAdapter.auth) {
            const urlConfig = FirebaseAdapter.parseConfigFromURL();
            if (urlConfig) {
                const unsubAuth = FirebaseAdapter.auth.onAuthStateChanged((user) => {
                    if (!user) {
                        UI.showConfigSignInBanner();
                    }
                    unsubAuth(); // Only need the first callback
                });
            }
        }

        // Update main sync indicator if in Firebase mode
        if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
            UI.updateMainSyncIndicator('synced', StorageAdapter.getProjectId());
        }

        // Sync calendar events on load (if calendar access available)
        // Short delay to let Firebase data settle first
        if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
            setTimeout(() => this.syncCalendarEvents(), 500);
        }

        // Add resize listener
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                ChartRenderer.init('chart-container');
                this.render();
            }, 250);
        });
    },

    addCategory() {
        const name = document.getElementById('new-category-name').value.trim();
        const color = document.getElementById('new-category-color').value;

        if (!name) {
            alert('Please enter a category name');
            return;
        }

        DataModel.addCategory(name, color);
        UI.clearCategoryInputs();
        this.render();
    },

    removeCategory(categoryId) {
        if (!confirm('Remove this category and all its items?')) return;
        DataModel.removeCategory(categoryId);
        this.render();
    },

    updateCategoryPercentage(categoryId, newPercentage) {
        DataModel.updateCategoryPercentage(categoryId, newPercentage);
        this.render();
    },

    updateCategoryColor(categoryId, newColor) {
        DataModel.updateCategoryColor(categoryId, newColor);
        this.render();
    },

    updateCategoryName(categoryId, newName) {
        DataModel.updateCategoryName(categoryId, newName);
        this.render();
    },

    reorderCategories(fromIndex, toIndex, insertBefore) {
        DataModel.reorderCategories(fromIndex, toIndex, insertBefore);
        this.render();
    },

    // Note: Slices are now added via UI.addSliceFromTab1() which calls DataModel.addItem() directly
    // This method is kept for potential programmatic use
    addItem(categoryId, name, percentage, color, subItems = []) {
        if (!categoryId || !name) {
            return null;
        }

        // Default to 20% if no percentage is provided
        if (!percentage || percentage <= 0) {
            percentage = 20;
        }

        const itemId = DataModel.addItem(categoryId, name, percentage, color, subItems);
        this.render();
        return itemId;
    },

    updateItemName(categoryId, itemId, newName) {
        DataModel.updateItemName(categoryId, itemId, newName);
        this.render();
    },

    renameSpoke(categoryId, itemId, spokeIndex, newName) {
        DataModel.renameSpoke(categoryId, itemId, spokeIndex, newName);
        this.render();
    },

    updateItemPercentage(categoryId, itemId, newPercentage) {
        DataModel.updateItemPercentage(categoryId, itemId, newPercentage);
        this.render();
    },

    updateItemColor(categoryId, itemId, newColor) {
        DataModel.updateItemColor(categoryId, itemId, newColor);
        this.render();
    },

    moveItem(fromCategoryId, itemId, toCategoryId) {
        DataModel.moveItem(fromCategoryId, itemId, toCategoryId);
        this.render();
    },

    reorderItems(categoryId, fromIndex, toIndex) {
        DataModel.reorderItemsInCategory(categoryId, fromIndex, toIndex);
        this.render();
    },

    removeItem(categoryId, itemId) {
        if (!confirm('Remove this Slice and all it\'s Spokes & Actions?')) return;
        DataModel.removeItem(categoryId, itemId);
        this.render();
    },


    addSubItem(categoryId, itemId) {
        const input = document.getElementById(`new-subitem-${itemId}`);
        const text = input.value.trim();

        if (!text) {
            alert('Please enter a sub-item');
            return;
        }

        DataModel.addSubItem(categoryId, itemId, text);
        input.value = '';
        this.render();

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('spoke-added');
        }
    },

    moveSubItem(fromCategoryId, fromItemId, fromIndex, toCategoryId, toItemId, toIndex) {
        DataModel.moveSubItem(fromCategoryId, fromItemId, fromIndex, toCategoryId, toItemId, toIndex);
        this.render();
    },

    removeSubItem(categoryId, itemId, subItemIndex) {
        if (!confirm('Remove this spoke and all its actions?')) return;
        DataModel.removeSubItem(categoryId, itemId, subItemIndex);
        this.render();
    },

    addSpokeChild(categoryId, itemId, spokeIndex, text) {
        if (text && text.trim()) {
            DataModel.addSpokeChild(categoryId, itemId, spokeIndex, text.trim());
            this.render();

            // Notify tutorial
            if (typeof TutorialManager !== 'undefined') {
                TutorialManager.notifyEvent('action-added');
            }
        }
    },

    
    async removeSpokeChild(categoryId, itemId, spokeIndex, childIndex) {
        if (!confirm('Remove this action?')) return;

        // Check if action has a calendar event to delete
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (category) {
            const item = category.items.find(i => i.id === itemId);
            if (item && item.subItems[spokeIndex]) {
                const spoke = item.subItems[spokeIndex];
                if (typeof spoke === 'object' && spoke.children && spoke.children[childIndex]) {
                    const action = spoke.children[childIndex];
                    if (action && action.scheduled && action.scheduled.calendarEventId) {
                        if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                            const deleted = await CalendarAdapter.deleteEvent(action.scheduled.calendarEventId);
                            if (deleted) {
                                Storage.showStatus('Calendar event deleted', 'success');
                            }
                        }
                    }
                }
            }
        }

        DataModel.removeSpokeChild(categoryId, itemId, spokeIndex, childIndex);
        this.render();
    },

    exportData() {
        // Show export selection overlay
        UI.showExportPreview();
    },

    removeAllData() {
        if (!confirm('This will trash this pie, and start a fresh one. Are you sure?')) return;

        // Clear all categories
        DataModel.categories = [];
        DataModel.categoryPercentageOverrides = {};
        DataModel.saveToStorage();

        // Close settings and re-render
        UI.closeSettings();
        UI.renderPieTabs();
        this.render();
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        Storage.importFromFile(file, (data) => {
            if (data.categories) {
                // Show import preview instead of direct replace
                UI.showImportPreview(data);
            }
        });

        // Reset file input
        event.target.value = '';
    },

    async switchPie(pieId) {
        await DataModel.switchPie(pieId);
        ChartRenderer.expandedView = null;
        ChartRenderer.collapseIfBranchExpanded();
        ChartRenderer.init('chart-container');
        this.render();
    },

    async createPie(name) {
        const pieId = await DataModel.createPie(name);
        await this.switchPie(pieId);
        UI.renderPieTabs();
    },

    async deletePie(pieId) {
        await DataModel.deletePie(pieId);
        ChartRenderer.expandedView = null;
        ChartRenderer.collapseIfBranchExpanded();
        ChartRenderer.init('chart-container');
        this.render();
        UI.renderPieTabs();
    },

    async renamePie(pieId, name) {
        await DataModel.renamePie(pieId, name);
        UI.renderPieTabs();
    },

    async restorePie(pieId) {
        DataModel.restorePie(pieId);
        await this.switchPie(pieId);
        UI.renderPieTabs();
    },

    render() {
        const focusMode = localStorage.getItem(Controls.FOCUS_PRIORITISED_KEY) === 'true';
        const categories = focusMode ? DataModel.getFilteredCategories() : DataModel.getCategories();
        ChartRenderer.render(categories);
        UI.renderCategoriesList(categories);
        UI.renderPieTabs();
        if (document.getElementById('prioritiser-window').classList.contains('active')) {
            UI.renderPriorityList();
        }
    },

    /**
     * Sync calendar events from Google Calendar
     * Updates local data if events were moved or deleted
     */
    async syncCalendarEvents() {
        if (typeof CalendarAdapter === 'undefined' || !CalendarAdapter.isAvailable()) {
            return;
        }

        Debug.log('Syncing calendar events...');
        const results = await CalendarAdapter.syncFromCalendar();

        if (results.updated > 0 || results.deleted > 0) {
            this.render();
            const msg = [];
            if (results.updated > 0) msg.push(`${results.updated} updated`);
            if (results.deleted > 0) msg.push(`${results.deleted} removed`);
            Storage.showStatus(`Calendar: ${msg.join(', ')}`, 'success');
        }
    }
};

// ExampleData, ExampleData3 are defined in example-data.js

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await App.init();
});