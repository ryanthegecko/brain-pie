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
            StorageAdapter.subscribeToMetaUpdates((meta) => {
                Debug.log('Received remote meta update');
                // Preserve local activePieId (not synced via Firebase)
                const currentActive = DataModel.getActivePieId();
                // Normalize pieIds (Firebase may convert arrays to objects)
                if (meta.pieIds && !Array.isArray(meta.pieIds)) {
                    meta.pieIds = Object.values(meta.pieIds);
                }
                meta.activePieId = currentActive;
                DataModel.pieMeta = meta;
                // Save locally with activePieId
                Storage.saveMeta(meta);
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
        // Delay to let Firebase data settle first
        if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
            setTimeout(() => this.syncCalendarEvents(), 2000);
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
        if (!confirm('This will permanently delete all your data and start fresh. Are you sure?')) return;

        // Clear all categories
        DataModel.categories = [];
        DataModel.categoryPercentageOverrides = {};
        DataModel.saveToStorage();

        // Close settings and re-render
        UI.closeSettings();
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

const ExampleData = {
    get() {
        return {
            categories: [
                {
                    "id": "home",
                    "name": "Home",
                    "color": "#4ECDC4",
                    "items": [
                        {
                            "id": "1",
                            "name": "Kitchen",
                            "percentage": 33.33,
                            "color": "#2196F3",
                            "subItems": [
                                { text: "Empty dishwasher", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Deep clean fridge", type: "list", children: [
                                    { text: "Clear out expired food", children: [], completed: true },
                                    { text: "Remove shelves and drawers", children: [], completed: false },
                                    { text: "Scrub interior with baking soda", children: [], completed: false },
                                    { text: "Reorganize by shelf zone", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Organize cupboards", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "2",
                            "name": "Laundry",
                            "percentage": 33.33,
                            "color": "#00BCD4",
                            "subItems": [
                                { text: "Sort clothes", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Wash darks", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Wash lights", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Fold and put away", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "3",
                            "name": "Garden",
                            "percentage": 33.33,
                            "color": "#4CAF50",
                            "subItems": [
                                { text: "Water plants", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Spring planting", type: "list", children: [
                                    { text: "Buy seeds and compost", children: [], completed: true },
                                    { text: "Prepare raised beds", children: [], completed: false },
                                    { text: "Plant seedlings", children: [], completed: false, scheduled: { date: "2026-04-11", time: "10:00", duration: 120 } },
                                    { text: "Set up watering timer", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Trim hedges", type: "single", children: [], scheduled: { date: "2026-05-16", time: "09:00", duration: 120 }, metadata: {} },
                                { text: "Cut grass", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        }
                    ]
                },
                {
                    "id": "health",
                    "name": "Health",
                    "color": "#FF6B6B",
                    "items": [
                        {
                            "id": "4",
                            "name": "Exercise",
                            "percentage": 25,
                            "color": "#f05252",
                            "subItems": [
                                { text: "Morning jog", type: "repeating", children: [], scheduled: null, metadata: { recurrence: { frequency: "WEEKLY", interval: 1, byDay: ["MO","WE","FR"], time: "07:00", duration: 45, allDay: false, endType: "never" } } },
                                { text: "Stretching routine", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Sign up for 10K run", type: "single", children: [], scheduled: { date: "2026-09-20", time: "08:30", duration: 180 }, metadata: {} }
                            ]
                        },
                        {
                            "id": "5",
                            "name": "Meal Prep",
                            "percentage": 25,
                            "color": "#E91E63",
                            "subItems": [
                                { text: "Sunday batch cook", type: "list", children: [
                                    { text: "Check freezer stock", children: [], completed: true },
                                    { text: "Browse recipes for the week", children: [], completed: true },
                                    { text: "Write shopping list", children: [], completed: false },
                                    { text: "Do the food shop", children: [], completed: false },
                                    { text: "Prep vegetables", children: [], completed: false },
                                    { text: "Cook and portion meals", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Restock spice rack", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "6",
                            "name": "Medical",
                            "percentage": 25,
                            "color": "#9C27B0",
                            "subItems": [
                                { text: "Annual checkup", type: "single", children: [], scheduled: { date: "2026-08-14", time: "10:30", duration: 60 }, metadata: {} },
                                { text: "Eye test", type: "single", children: [], scheduled: { date: "2026-11-05", time: "14:00", duration: 45 }, metadata: {} },
                                { text: "Pick up prescription", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "7",
                            "name": "Sleep",
                            "percentage": 25,
                            "color": "#673AB7",
                            "subItems": [
                                { text: "Screens off by 10pm", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        }
                    ]
                },
                {
                    "id": "learning",
                    "name": "Learning",
                    "color": "#FFA726",
                    "items": [
                        {
                            "id": "8",
                            "name": "Language Study",
                            "percentage": 33.33,
                            "color": "#FF9800",
                            "subItems": [
                                { text: "Daily vocabulary", type: "repeating", children: [], scheduled: null, metadata: { recurrence: { frequency: "DAILY", interval: 1, time: "08:00", duration: 15, allDay: false, endType: "never" } } },
                                { text: "Practice conversation", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Grammar exercises", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Watch foreign film", type: "single", children: [], scheduled: { date: "2026-02-21", time: "20:00", duration: 120 }, metadata: {} }
                            ]
                        },
                        {
                            "id": "9",
                            "name": "Reading",
                            "percentage": 33.33,
                            "color": "#FF5722",
                            "subItems": [
                                { text: "Finish current book", type: "list", children: [
                                    { text: "Read chapters 8-12", children: [], completed: true },
                                    { text: "Read chapters 13-18", children: [], completed: false },
                                    { text: "Take notes on key themes", children: [], completed: false },
                                    { text: "Write short review", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Book club discussion", type: "single", children: [], scheduled: { date: "2026-03-08", time: "18:30", duration: 90 }, metadata: {} }
                            ]
                        },
                        {
                            "id": "10",
                            "name": "Online Course",
                            "percentage": 33.33,
                            "color": "#795548",
                            "subItems": [
                                { text: "Complete module 4", type: "list", children: [
                                    { text: "Watch lecture videos", children: [], completed: true },
                                    { text: "Do practice exercises", children: [], completed: true },
                                    { text: "Submit assignment", children: [], completed: false, scheduled: { date: "2026-02-28", time: "17:00", duration: 60 } },
                                    { text: "Review feedback", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Final exam", type: "single", children: [], scheduled: { date: "2026-06-15", time: "09:00", duration: 180 }, metadata: {} }
                            ]
                        }
                    ]
                },
                {
                    "id": "social",
                    "name": "Social",
                    "color": "#9575CD",
                    "items": [
                        {
                            "id": "11",
                            "name": "Friends",
                            "percentage": 33.33,
                            "color": "#7E57C2",
                            "subItems": [
                                { text: "Get back to Sarah", type: "static", children: [], scheduled: null, metadata: {} },
                                { text: "Coffee with Mike", type: "single", children: [], scheduled: { date: "2026-02-15", time: "11:00", duration: 60 }, metadata: {} },
                                { text: "Zoo trip", type: "list", children: [
                                    { text: "Pick a date in group chat", children: [], completed: true },
                                    { text: "Book tickets online", children: [], completed: false },
                                    { text: "Organize lift sharing", children: [], completed: false },
                                    { text: "Pack picnic and sunscreen", children: [], completed: false }
                                ], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "12",
                            "name": "Family",
                            "percentage": 33.33,
                            "color": "#5E35B1",
                            "subItems": [
                                { text: "Call Mum", type: "repeating", children: [], scheduled: null, metadata: { recurrence: { frequency: "WEEKLY", interval: 1, byDay: ["SU"], time: "11:00", duration: 30, allDay: false, endType: "never" } } },
                                { text: "Plan summer visit", type: "list", children: [
                                    { text: "Check everyone's availability", children: [], completed: false },
                                    { text: "Book train tickets", children: [], completed: false },
                                    { text: "Sort out guest room", children: [], completed: false }
                                ], scheduled: null, metadata: {} },
                                { text: "Send birthday photos", type: "static", children: [], scheduled: null, metadata: {} }
                            ]
                        },
                        {
                            "id": "13",
                            "name": "Community",
                            "percentage": 33.33,
                            "color": "#512DA8",
                            "subItems": [
                                { text: "School fundraiser", type: "list", children: [
                                    { text: "Attend planning meeting", children: [], completed: true },
                                    { text: "Design posters", children: [], completed: false },
                                    { text: "Print and distribute flyers", children: [], completed: false },
                                    { text: "Set up stall on the day", children: [], completed: false, scheduled: { date: "2026-05-09", time: "08:00", duration: 240 } }
                                ], scheduled: null, metadata: {} },
                                { text: "Volunteer at coding event", type: "single", children: [], scheduled: { date: "2026-07-18", time: "09:00", duration: 480 }, metadata: {} }
                            ]
                        }
                    ]
                }
            ],
        }
    }
}

const ExampleData2 = {
    
    get() {
        return {
            "categories": [
                {
                "id": "audette.-f-1770247590933",
                "name": "Audette. F (PM)",
                "color": "#107cb2",
                "items": [
                    {
                    "id": "1770247617961",
                    "name": "Finalise Launch date",
                    "percentage": 69.44444444444446,
                    "color": "#ff9800",
                    "subItems": [
                        {
                        "text": "Catch up with Ben",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        },
                        {
                        "text": "Collate Assets for Drive",
                        "type": "list",
                        "children": [
                            { "text": "Images", "children": [] },
                            { "text": "Text copy", "children": [] },
                            { "text": "Board profiles", "children": [] }
                        ],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    },
                    {
                    "id": "1770247639223",
                    "name": "Upload Assets to Drive",
                    "percentage": 13.888888888888888,
                    "color": "#9c27b0",
                    "subItems": []
                    },
                    {
                    "id": "1770247658920",
                    "name": "Call with HR",
                    "percentage": 16.666666666666664,
                    "color": "#2196f3",
                    "subItems": [
                        {
                        "text": "0845 222 4455",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    }
                ]
                },
                {
                "id": "sarah.-w-1770247542477",
                "name": "Sarah. W (Design)",
                "color": "#16e395",
                "items": [
                    {
                    "id": "1770248407666",
                    "name": "Home page",
                    "percentage": 43.847488198796995,
                    "color": "#b03030",
                    "subItems": [
                        {
                        "text": "Resize icons",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        },
                        {
                        "text": "Add new client to blog section",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        },
                        {
                        "text": "Link for scrolling reference",
                        "type": "list",
                        "children": [
                            {
                            "text": "https://uk.archetype.co/",
                            "children": []
                            }
                        ],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    },
                    {
                    "id": "1770247724945",
                    "name": "Testimonial page",
                    "percentage": 10.4532411865932,
                    "color": "#795548",
                    "subItems": []
                    },
                    {
                    "id": "1770247731097",
                    "name": "About page",
                    "percentage": 12.402018439873068,
                    "color": "#7e919a",
                    "subItems": [
                        {
                        "text": "Done",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    },
                    {
                    "id": "1770247738288",
                    "name": "Contact Us page",
                    "percentage": 14.740551143808906,
                    "color": "#ff5722",
                    "subItems": [
                        {
                        "text": "Done",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    },
                    {
                    "id": "1770248431674",
                    "name": "Services page",
                    "percentage": 18.556701030927837,
                    "color": "#076b00",
                    "subItems": [
                        {
                        "text": "Done",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    }
                ]
                },
                {
                "id": "elliot.-s-1770247552987",
                "name": "Elliot. S (Dev)",
                "color": "#607d8b",
                "items": [
                    {
                    "id": "1770247700263",
                    "name": "Home page",
                    "percentage": 8.470180899970122,
                    "color": "#b03030",
                    "subItems": []
                    },
                    {
                    "id": "1770248413605",
                    "name": "Testimonial Page",
                    "percentage": 17.356928073709266,
                    "color": "#795548",
                    "subItems": []
                    },
                    {
                    "id": "1770248417541",
                    "name": "About Page",
                    "percentage": 20.82831368845112,
                    "color": "#7e919a",
                    "subItems": [
                        {
                        "text": "Done",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    },
                    {
                    "id": "1770248425441",
                    "name": "Contact Us page",
                    "percentage": 24.993976426141348,
                    "color": "#ff5722",
                    "subItems": [
                        {
                        "text": "Done",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    },
                    {
                    "id": "1770247776932",
                    "name": "Services Page",
                    "percentage": 28.350600911728137,
                    "color": "#076b00",
                    "subItems": [
                        {
                        "text": "Add new navigation",
                        "type": "single",
                        "children": [],
                        "scheduled": {
                            "date": "2032-05-04",
                            "time": "10:00",
                            "duration": 60
                        },
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        },
                        {
                        "text": "Fix footer spacing",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        },
                        {
                        "text": "Finish Mobile view",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        },
                        {
                        "text": "Finish Tablet view",
                        "type": "static",
                        "children": [],
                        "metadata": {
                            "condition": null,
                            "calendarEventId": null,
                            "nextState": null,
                            "recurrence": null
                        }
                        }
                    ]
                    }
                ]
                }
            ],
            "categoryPercentageOverrides": {}
        }
    }

}

const ExampleData3 = {

    get() {
        return {
            categories: [
                {
                    "id": "health",
                    "name": "Health",
                    "color": "#FF6B6B",
                    "items": [
                        {
                            "id": "4",
                            "name": "Exercise",
                            "percentage": 33.33,
                            "color": "#f05252",
                            "subItems": ["Morning jog", "Stretching routine", "Gym session"]
                        },
                        {
                            "id": "5",
                            "name": "Meal Prep",
                            "percentage": 33.33,
                            "color": "#E91E63",
                            "subItems": ["Plan weekly menu", "Food shopping", "Prep vegetables", "Cook batch meals"]
                        },
                        {
                            "id": "6",
                            "name": "Medical",
                            "percentage": 33.33,
                            "color": "#9C27B0",
                            "subItems": ["Schedule checkup", "Pick up prescription", "Update insurance"]
                        }
                    ]
                },
            ],
        }
    }

}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await App.init();
});