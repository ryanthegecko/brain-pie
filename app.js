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
  }
};

const App = {
    async init() {
        // Initialize StorageAdapter first (handles URL config parsing for Firebase)
        if (typeof StorageAdapter !== 'undefined') {
            await StorageAdapter.init();

            // Subscribe to real-time updates from Firebase
            StorageAdapter.subscribeToUpdates((data) => {
                if (data && data.categories) {
                    Debug.log('Received remote data update');
                    // Clean internal metadata
                    const { _saveId, _savedBy, ...cleanData } = data;
                    DataModel.categories = cleanData.categories;
                    DataModel.categoryPercentageOverrides = cleanData.categoryPercentageOverrides || {};

                    // Save to localStorage so it's up-to-date on next page load
                    Storage.save(cleanData);

                    this.render();
                    Storage.showStatus('Synced from cloud', 'success');

                    // Update main sync indicator
                    if (typeof UI !== 'undefined' && UI.updateMainSyncIndicator) {
                        UI.updateMainSyncIndicator('synced', StorageAdapter.getProjectId());
                    }
                }
            });
        }

        // Load data (now async to support Firebase)
        await DataModel.loadFromStorageOrExample();

        ChartRenderer.init('chart-container');
        UI.clearInputs();
        UI.clearCategoryInputs();
        this.render();
        Controls.init();

        // Update main sync indicator if in Firebase mode
        if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
            UI.updateMainSyncIndicator('synced', StorageAdapter.getProjectId());
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
        const data = { categories: DataModel.getCategories() };
        Storage.exportToFile(data);
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
                DataModel.setCategories(data.categories);
                this.render();
            }
        });

        // Reset file input
        event.target.value = '';
    },

    render() {
        const categories = DataModel.getCategories();
        ChartRenderer.render(categories);
        UI.renderCategoriesList(categories);
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
                            "subItems": ["Empty dishwasher", "Organize cupboards", "Wipe down surfaces"]
                        },
                        {
                            "id": "2",
                            "name": "Laundry",
                            "percentage": 33.33,
                            "color": "#00BCD4",
                            "subItems": ["Sort clothes", "Wash darks", "Fold and put away"]
                        },
                        {
                            "id": "3",
                            "name": "Garden",
                            "percentage": 33.33,
                            "color": "#4CAF50",
                            "subItems": ["Water plants", "Trim hedges", "Weed flower beds", "Mow lawn"]
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
                            "color": "#F44336",
                            "subItems": ["Morning jog", "Stretching routine", "Gym session"]
                        },
                        {
                            "id": "5",
                            "name": "Meal Prep",
                            "percentage": 25,
                            "color": "#E91E63",
                            "subItems": ["Plan weekly menu", "Food shopping", "Prep vegetables", "Cook batch meals"]
                        },
                        {
                            "id": "6",
                            "name": "Medical",
                            "percentage": 25,
                            "color": "#9C27B0",
                            "subItems": ["Schedule checkup", "Pick up prescription", "Update insurance"]
                        },
                        {
                            "id": "7",
                            "name": "Sleep",
                            "percentage": 25,
                            "color": "#673AB7",
                            "subItems": ["Set bedtime alarm", "Wind down routine"]
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
                            "subItems": ["Daily vocabulary", "Practice conversation", "Grammar exercises", "Watch foreign films"]
                        },
                        {
                            "id": "9",
                            "name": "Reading",
                            "percentage": 33.33,
                            "color": "#FF5722",
                            "subItems": ["Finish current book", "Take notes", "Join book club discussion"]
                        },
                        {
                            "id": "10",
                            "name": "Online Course",
                            "percentage": 33.33,
                            "color": "#795548",
                            "subItems": ["Watch lectures", "Complete assignments", "Participate in forum"]
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
                            "subItems": ["Text Sarah", "Plan coffee with Mike", "Group chat about zoo trip"]
                        },
                        {
                            "id": "12",
                            "name": "Family",
                            "percentage": 33.33,
                            "color": "#5E35B1",
                            "subItems": ["Call Mum", "Video chat with Steve", "Plan weekend visit", "Send photos"]
                        },
                        {
                            "id": "13",
                            "name": "Community",
                            "percentage": 33.33,
                            "color": "#512DA8",
                            "subItems": ["Help with school fundraiser","Volunteer event on 18th"]
                        }
                    ]
                }
            ],
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await App.init();
});