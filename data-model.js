const DataModel = {
    categories: [],

    // Manual category percentages (when user overrides)
    categoryPercentageOverrides: {},

    // Priority list - ordered array of item references (index 0 = highest)
    priorityList: [],

    // Multi-pie meta: { pieIds: [...], activePieId: "..." }
    pieMeta: null,

    // Current pie name
    currentPieName: 'My Pie',

    // --- Multi-pie methods ---

    generatePieId() {
        return 'pie-' + Date.now();
    },

    /**
     * Load meta from storage (localStorage or Firebase).
     * Handles migration from old format.
     * Returns meta object.
     */
    async loadMeta() {
        let meta;
        if (typeof StorageAdapter !== 'undefined' && (StorageAdapter.isFirebaseMode() || StorageAdapter.isLocalFileMode())) {
            // Route through StorageAdapter so Firebase and local-file adapters both
            // serve meta from their own source of truth rather than stale localStorage.
            meta = await StorageAdapter.loadMeta();
            if (!meta) {
                meta = await StorageAdapter.migrateToMultiPie();
            }
        } else {
            meta = Storage.loadMeta();
            if (!meta) {
                meta = Storage.migrateToMultiPie();
            }
        }

        if (meta) {
            // Normalize pieIds (Firebase may convert arrays to objects)
            if (meta.pieIds && !Array.isArray(meta.pieIds)) {
                meta.pieIds = Object.values(meta.pieIds);
            }
            // Normalize tombstonedPieIds
            if (!meta.tombstonedPieIds) {
                meta.tombstonedPieIds = [];
            } else if (!Array.isArray(meta.tombstonedPieIds)) {
                meta.tombstonedPieIds = Object.values(meta.tombstonedPieIds);
            }
            this.pieMeta = meta;
            // Restore activePieId from localStorage (per-user, not synced)
            const storedActive = this.loadActivePieId();
            if (storedActive && meta.pieIds && meta.pieIds.includes(storedActive)) {
                this.pieMeta.activePieId = storedActive;
            } else if (!this.pieMeta.activePieId && meta.pieIds && meta.pieIds.length > 0) {
                this.pieMeta.activePieId = meta.pieIds[0];
            }
        }
        return meta;
    },

    saveMeta() {
        if (!this.pieMeta) return;
        // Save activePieId to localStorage only
        if (this.pieMeta.activePieId) {
            localStorage.setItem('brainPie_activePieId', this.pieMeta.activePieId);
        }
        // For Firebase, strip activePieId (it's per-user, not shared)
        const metaForStorage = {
            pieIds: this.pieMeta.pieIds,
            pieNames: this.pieMeta.pieNames || {},
            tombstonedPieIds: this.pieMeta.tombstonedPieIds || []
        };
        if (typeof StorageAdapter !== 'undefined') {
            StorageAdapter.saveMeta(metaForStorage).catch(e => {
                console.error('saveMeta failed:', e);
            });
        } else {
            // localStorage saves the full meta including activePieId
            Storage.saveMeta(this.pieMeta);
        }
    },

    getActivePieId() {
        if (!this.pieMeta) return null;
        // activePieId stored in localStorage only (each user picks their own view)
        return this.pieMeta.activePieId || (this.pieMeta.pieIds && this.pieMeta.pieIds[0]) || null;
    },

    setActivePieId(pieId) {
        if (!this.pieMeta) return;
        this.pieMeta.activePieId = pieId;
        localStorage.setItem('brainPie_activePieId', pieId);
        // Also persist to Firebase per-user so refresh restores the same pie
        if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
            FirebaseAdapter.saveActivePieId(pieId).catch(() => {});
        }
    },

    loadActivePieId() {
        return localStorage.getItem('brainPie_activePieId');
    },

    getPieName(pieId) {
        if (this.pieMeta && this.pieMeta.pieNames && this.pieMeta.pieNames[pieId]) {
            return this.pieMeta.pieNames[pieId];
        }
        return this.currentPieName || 'My Pie';
    },

    getPieList() {
        if (!this.pieMeta) return [];
        // Normalize pieIds (Firebase may convert arrays to objects)
        let ids = this.pieMeta.pieIds || [];
        if (!Array.isArray(ids)) ids = Object.values(ids);
        const activeId = this.getActivePieId();
        const tombstoned = this.pieMeta.tombstonedPieIds || [];
        return ids.map(id => ({
            id,
            name: this.getPieName(id),
            active: id === activeId,
            tombstoned: tombstoned.includes(id)
        }));
    },

    isPieTombstoned(pieId) {
        return (this.pieMeta?.tombstonedPieIds || []).includes(pieId);
    },

    restorePie(pieId) {
        if (!this.pieMeta) return;
        if (!this.pieMeta.tombstonedPieIds) return;
        this.pieMeta.tombstonedPieIds = this.pieMeta.tombstonedPieIds.filter(id => id !== pieId);
        this.saveMeta();
    },

    async _handleEmptyPie(pieId) {
        if (!this.pieMeta) return;
        if (!this.pieMeta.tombstonedPieIds) this.pieMeta.tombstonedPieIds = [];
        if (this.pieMeta.tombstonedPieIds.includes(pieId)) return;

        this.pieMeta.tombstonedPieIds.push(pieId);

        // Only create a fresh pie if no active (non-tombstoned) pies remain
        const activePies = (this.pieMeta.pieIds || []).filter(
            id => !(this.pieMeta.tombstonedPieIds || []).includes(id)
        );

        if (activePies.length === 0) {
            const newId = this.generatePieId();
            this.pieMeta.pieIds = [...(this.pieMeta.pieIds || []), newId];
            if (!this.pieMeta.pieNames) this.pieMeta.pieNames = {};
            this.pieMeta.pieNames[newId] = 'New Pie';
            this.setActivePieId(newId);
            this.categories = [];
            this.categoryPercentageOverrides = {};
            this.priorityList = [];
            this.currentPieName = 'New Pie';
            if (typeof StorageAdapter !== 'undefined') {
                await StorageAdapter.savePie(newId, {
                    id: newId, name: 'New Pie', categories: [],
                    categoryPercentageOverrides: {}, priorityList: []
                });
            }
        }

        this.saveMeta();
        // Callers (removeAllData, saveToStorage) handle rendering.
    },

    async createPie(name) {
        const pieId = this.generatePieId();
        if (!this.pieMeta) {
            this.pieMeta = { pieIds: [], activePieId: null, pieNames: {} };
        }
        this.pieMeta.pieIds.push(pieId);
        if (!this.pieMeta.pieNames) this.pieMeta.pieNames = {};
        this.pieMeta.pieNames[pieId] = name;
        this.saveMeta();

        // Save empty pie data
        const emptyPie = {
            id: pieId,
            name: name,
            categories: [],
            categoryPercentageOverrides: {},
            priorityList: []
        };
        if (typeof StorageAdapter !== 'undefined') {
            await StorageAdapter.savePie(pieId, emptyPie);
        } else {
            Storage.savePie(pieId, emptyPie);
        }

        return pieId;
    },

    async deletePie(pieId) {
        if (!this.pieMeta) return;
        this.pieMeta.pieIds = this.pieMeta.pieIds.filter(id => id !== pieId);
        if (this.pieMeta.pieNames) delete this.pieMeta.pieNames[pieId];
        // Also remove from tombstoned list if present
        if (this.pieMeta.tombstonedPieIds) {
            this.pieMeta.tombstonedPieIds = this.pieMeta.tombstonedPieIds.filter(id => id !== pieId);
        }

        // Delete pie storage (StorageAdapter.deletePie handles Firebase meta removal via transaction)
        if (typeof StorageAdapter !== 'undefined') {
            await StorageAdapter.deletePie(pieId);
        } else {
            Storage.deletePie(pieId);
        }

        // If we deleted the active pie, switch to the first remaining one
        if (this.pieMeta.activePieId === pieId) {
            if (this.pieMeta.pieIds.length > 0) {
                await this.switchPie(this.pieMeta.pieIds[0]);
            } else {
                // No pies left — create a fresh default
                const newId = await this.createPie('My Pie');
                await this.switchPie(newId);
                // Load example data into the fresh pie
                const example = ExampleData.get();
                this.categories = example.categories;
                this.categoryPercentageOverrides = example.categoryPercentageOverrides || {};
                this.priorityList = [];
                this.saveToStorage();
            }
        }

        // Save local meta (Firebase meta already updated by transaction in StorageAdapter.deletePie)
        if (this.pieMeta.activePieId) {
            localStorage.setItem('brainPie_activePieId', this.pieMeta.activePieId);
        }
        Storage.saveMeta(this.pieMeta);
    },

    async renamePie(pieId, newName) {
        if (!this.pieMeta) return;
        if (!this.pieMeta.pieNames) this.pieMeta.pieNames = {};
        this.pieMeta.pieNames[pieId] = newName;

        // Also update name in the pie data itself
        if (pieId === this.pieMeta.activePieId) {
            this.currentPieName = newName;
        }

        this.saveMeta();
        // Save pie data with updated name if it's active
        if (pieId === this.pieMeta.activePieId) {
            this.saveToStorage();
        }
    },

    /**
     * Save current pie data, load target pie, update activePieId.
     */
    async switchPie(pieId) {
        if (!this.pieMeta) return;
        if (this.pieMeta.activePieId === pieId) return;

        // Save current pie data (but skip the empty-pie tombstone path —
        // navigating away from an empty pie shouldn't tombstone it).
        this._isSwitchingPie = true;
        this.saveToStorage();
        this._isSwitchingPie = false;

        // Update active
        this.setActivePieId(pieId);

        // Load target pie
        let pieData;
        if (typeof StorageAdapter !== 'undefined') {
            pieData = await StorageAdapter.loadPie(pieId);
        } else {
            pieData = Storage.loadPie(pieId);
        }

        if (pieData) {
            this.categories = pieData.categories || [];
            this.categoryPercentageOverrides = pieData.categoryPercentageOverrides || {};
            this.priorityList = pieData.priorityList || [];
            this.currentPieName = pieData.name || this.getPieName(pieId);
            this.normalizeAllSpokes();
            this.validatePriorityList();
        } else {
            // Pie data missing — start empty
            this.categories = [];
            this.categoryPercentageOverrides = {};
            this.priorityList = [];
            this.currentPieName = this.getPieName(pieId);
        }

        // Switch Firebase listeners if in Firebase mode
        if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
            StorageAdapter.switchPieListeners(pieId);

            // Load per-user priorities for this pie
            const userPriorities = await StorageAdapter.loadPriorities(pieId);
            if (userPriorities !== null && userPriorities.length > 0) {
                this.priorityList = userPriorities;
                this.validatePriorityList();
            }
        }
    },

    async loadFromStorageOrExample() {
        // If loading with a Firebase config URL (and NOT in file mode), skip local
        // caches entirely. Firebase will provide the authoritative data after sign-in.
        // Skipping localStorage prevents contamination from a sibling tab that
        // loaded the base URL (no config) and wrote example data to localStorage.
        // We do NOT save this empty state to localStorage/Firebase — it is
        // in-memory only until syncOnConnect() fills it with real Firebase data.
        // Exception: if file mode is active, the ?config= URL is irrelevant — load
        // normally from the file/localStorage.
        const localFileSyncEnabled = localStorage.getItem('localFileSyncEnabled') === 'true';
        if (new URLSearchParams(window.location.search).has('config') && !localFileSyncEnabled) {
            this.pieMeta = { pieIds: [], activePieId: null, pieNames: {} };
            this.currentPieName = '';
            this.categories = [];
            this.priorityList = [];
            return;
        }

        // --- Multi-pie path ---
        const meta = await this.loadMeta();

        if (meta && meta.activePieId) {
            // Load active pie — route through adapter for Firebase and file modes
            let pieData;
            if (typeof StorageAdapter !== 'undefined' && (StorageAdapter.isFirebaseMode() || StorageAdapter.isLocalFileMode())) {
                pieData = await StorageAdapter.loadPie(meta.activePieId);
            } else {
                pieData = Storage.loadPie(meta.activePieId);
            }

            if (pieData && pieData.categories) {
                this.categories = pieData.categories;
                this.categoryPercentageOverrides = pieData.categoryPercentageOverrides || {};
                this.priorityList = pieData.priorityList || [];
                this.currentPieName = pieData.name || this.getPieName(meta.activePieId);
                this.normalizeAllSpokes();
                this.validatePriorityList();
                return;
            }
        }

        // --- Legacy single-blob fallback (Firebase without multi-pie meta) ---
        let data;
        if (typeof StorageAdapter !== 'undefined') {
            data = await StorageAdapter.load();
        } else {
            data = Storage.load();
        }

        if (data && data.categories) {
            this.categories = data.categories;
            this.categoryPercentageOverrides = data.categoryPercentageOverrides || {};
            this.priorityList = data.priorityList || [];
            this.normalizeAllSpokes();
            this.validatePriorityList();

            // Migrate to multi-pie on the fly
            if (!this.pieMeta) {
                const pieId = this.generatePieId();
                this.pieMeta = { pieIds: [pieId], activePieId: pieId, pieNames: { [pieId]: 'My Pie' } };
                this.currentPieName = 'My Pie';
                this.saveMeta();
                this.saveToStorage();
            }
            return;
        }

        if (data && data.settings) {
            if (data.settings.calendarProvider) {
                localStorage.setItem('calendarProvider', data.settings.calendarProvider);
            }
        }

        // First time: create default pie with example data
        const pieId = this.generatePieId();
        this.pieMeta = { pieIds: [pieId], activePieId: pieId, pieNames: { [pieId]: 'My Pie' } };
        this.currentPieName = 'My Pie';

        const example = ExampleData.get();
        this.categories = example.categories;
        this.categoryPercentageOverrides = example.categoryPercentageOverrides || {};
        this.priorityList = [];

        this.saveMeta();
        this.saveToStorage();
    },

    /**
     * Normalize all spokes in all categories.
     * Firebase drops null values and empty arrays, so spokes loaded from
     * Firebase may be missing children, scheduled, metadata fields.
     * This restores them to the expected format.
     */
    normalizeAllSpokes() {
        if (!Array.isArray(this.categories)) {
            this.categories = Object.values(this.categories || {});
        }
        for (const category of this.categories) {
            if (!category.items) { category.items = []; continue; }
            if (!Array.isArray(category.items)) {
                category.items = Object.values(category.items);
            }
            for (const item of category.items) {
                if (!item.subItems) { item.subItems = []; continue; }
                if (!Array.isArray(item.subItems)) {
                    item.subItems = Object.values(item.subItems);
                }
                for (let i = 0; i < item.subItems.length; i++) {
                    item.subItems[i] = this.normalizeSpoke(item.subItems[i]);
                }
            }
        }
    },

    saveToStorage() {
        if (this._batchSaveDepth > 0) return;
        const pieId = this.getActivePieId();

        // In Firebase mode: never write empty categories — tombstone the pie instead.
        // This prevents bugs or stale data from blanking out a shared Firebase pie.
        // Skip during switchPie — navigating away from an empty pie shouldn't tombstone it.
        if (this.categories.length === 0 &&
            typeof StorageAdapter !== 'undefined' &&
            StorageAdapter.isFirebaseMode() &&
            pieId &&
            !this.isPieTombstoned(pieId) &&
            !this._isSwitchingPie) {
            this._handleEmptyPie(pieId); // async, fire-and-forget
            // Still write empty state to localStorage backup (safe for local)
            Storage.savePie(pieId, {
                id: pieId, name: this.currentPieName || 'My Pie',
                categories: [], categoryPercentageOverrides: {},
                priorityList: [], lastModified: Date.now()
            });
            return;
        }

        const pieData = {
            id: pieId,
            name: this.currentPieName || 'My Pie',
            categories: this.categories,
            categoryPercentageOverrides: this.categoryPercentageOverrides,
            priorityList: this.priorityList,
            lastModified: Date.now()
        };

        if (typeof StorageAdapter !== 'undefined') {
            if (pieId) {
                StorageAdapter.savePie(pieId, pieData).catch(e => {
                    console.error('StorageAdapter.savePie failed:', e);
                });
            } else {
                // No active pie ID yet — save to localStorage only.
                // Never write to the legacy Firebase data/ path; pieMeta
                // will be set shortly and the next save will use savePie().
                Storage.save(pieData);
            }
        } else {
            if (pieId) {
                Storage.savePie(pieId, pieData);
            } else {
                Storage.save(pieData);
            }
        }
    },

    addCategory(name, color) {
        const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        this.categories.push({
            id,
            name,
            color,
            items: []
        });
        this.saveToStorage();
        return id;
    },

    removeCategory(categoryId) {
        this.categories = this.categories.filter(cat => cat.id !== categoryId);
        delete this.categoryPercentageOverrides[categoryId];
        this.saveToStorage();
    },

    updateCategoryPercentage(categoryId, newPercentage) {
        // Store the override percentage for this category
        const oldPercentage = this.categoryPercentageOverrides[categoryId] || this.getCategoryPercentage(categoryId);
        this.categoryPercentageOverrides[categoryId] = newPercentage;

        const difference = newPercentage - oldPercentage;

        // Get all other categories
        const otherCategories = this.categories.filter(c => c.id !== categoryId);

        if (otherCategories.length === 0) {
            this.saveToStorage();
            return;
        }

        // Calculate current total of other categories
        let otherTotal = 0;
        otherCategories.forEach(cat => {
            otherTotal += this.getCategoryPercentage(cat.id);
        });

        // Redistribute proportionally among other categories
        const targetOtherTotal = 100 - newPercentage;

        if (otherTotal > 0 && targetOtherTotal > 0) {
            // Scale each other category proportionally
            otherCategories.forEach(cat => {
                const currentPercentage = this.getCategoryPercentage(cat.id);
                const proportion = currentPercentage / otherTotal;
                const newCatPercentage = targetOtherTotal * proportion;
                this.categoryPercentageOverrides[cat.id] = newCatPercentage;
            });
        } else if (targetOtherTotal > 0) {
            // If other total is 0, distribute evenly
            const evenShare = targetOtherTotal / otherCategories.length;
            otherCategories.forEach(cat => {
                this.categoryPercentageOverrides[cat.id] = evenShare;
            });
        } else {
            // If target is 0 or negative, set all others to 0
            otherCategories.forEach(cat => {
                this.categoryPercentageOverrides[cat.id] = 0;
            });
        }

        this.saveToStorage();
    },
    getCategoryPercentage(categoryId) {
        // If there's an override, use it
        if (this.categoryPercentageOverrides[categoryId] !== undefined) {
            return this.categoryPercentageOverrides[categoryId];
        }

        // Otherwise calculate based on item count
        const category = this.getCategory(categoryId);
        if (!category) return 0;

        const totalItems = this.categories.reduce((sum, cat) => sum + cat.items.length, 0);
        if (totalItems === 0) return 0;

        return (category.items.length / totalItems) * 100;
    },

    updateCategoryColor(categoryId, newColor) {
        const category = this.getCategory(categoryId);
        if (!category) return;

        category.color = newColor;
        this.saveToStorage();
    },
    updateCategoryName(categoryId, newName) {
        const category = this.getCategory(categoryId);
        if (!category) return;

        category.name = newName.trim();
        this.saveToStorage();
    },
    reorderCategories(fromIndex, toIndex, insertBefore) {
        const [movedCategory] = this.categories.splice(fromIndex, 1);

        // Adjust target index if moving down
        let actualToIndex = toIndex;
        if (fromIndex < toIndex && !insertBefore) {
            actualToIndex = toIndex;
        } else if (fromIndex < toIndex && insertBefore) {
            actualToIndex = toIndex - 1;
        } else if (fromIndex > toIndex && !insertBefore) {
            actualToIndex = toIndex + 1;
        } else {
            actualToIndex = toIndex;
        }

        this.categories.splice(actualToIndex, 0, movedCategory);
        this.saveToStorage();
    },

    addItem(categoryId, name, percentage, color, subItems) {
        const category = this.getCategory(categoryId);
        if (!category) return null;

        const id = crypto.randomUUID();
        category.items.push({
            id,
            name,
            percentage,
            color,
            subItems: subItems || []
        });

        this.normalizeItemsInCategory(categoryId);
        this.saveToStorage();
        return id;
    },

    updateItemName(categoryId, itemId, newName) {
        const item = this.getItem(categoryId, itemId);
        if (!item) return;

        item.name = newName.trim();
        this.saveToStorage();
    },

    renameSpoke(categoryId, itemId, spokeIndex, newName) {
        const item = this.getItem(categoryId, itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke === 'string') {
            item.subItems[spokeIndex] = newName.trim();
        } else {
            spoke.text = newName.trim();
        }
        this.saveToStorage();
    },

    updateItemPercentage(categoryId, itemId, newPercentage) {
        const category = this.getCategory(categoryId);
        const item = this.getItem(categoryId, itemId);
        if (!category || !item) return;

        const oldPercentage = item.percentage;
        item.percentage = newPercentage;

        // Redistribute the difference among other items
        const otherItems = category.items.filter(i => i.id !== itemId);
        const difference = oldPercentage - newPercentage;

        if (otherItems.length > 0) {
            const redistributeAmount = difference / otherItems.length;
            otherItems.forEach(otherItem => {
                otherItem.percentage += redistributeAmount;
            });
        }

        // Normalize to ensure total is 100%
        this.normalizeItemsInCategory(categoryId);
        this.saveToStorage();
    },

    updateItemColor(categoryId, itemId, newColor) {
        const item = this.getItem(categoryId, itemId);
        if (!item) return;

        item.color = newColor;
        this.saveToStorage();
    },

    moveItem(fromCategoryId, itemId, toCategoryId) {
        const fromCategory = this.getCategory(fromCategoryId);
        const toCategory = this.getCategory(toCategoryId);

        if (!fromCategory || !toCategory) return;

        const itemIndex = fromCategory.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        const [item] = fromCategory.items.splice(itemIndex, 1);
        toCategory.items.push(item);

        // Normalize percentages in both categories
        this.normalizeItemsInCategory(fromCategoryId);
        this.normalizeItemsInCategory(toCategoryId);

        this.saveToStorage();
    },

    reorderItemsInCategory(categoryId, fromIndex, toIndex) {
        const category = this.getCategory(categoryId);
        if (!category) return;

        const [movedItem] = category.items.splice(fromIndex, 1);
        category.items.splice(toIndex, 0, movedItem);

        this.saveToStorage();
    },

    removeItem(categoryId, itemId) {
        const category = this.getCategory(categoryId);
        if (!category) return;

        category.items = category.items.filter(item => item.id !== itemId);
        this.normalizeItemsInCategory(categoryId);
        this.saveToStorage();
    },

    addSubItem(categoryId, itemId, subItemText, spokeType = 'static') {
        const item = this.getItem(categoryId, itemId);
        if (!item) return;

        // Create spoke object with type
        // Types: 'static', 'single', 'repeating', 'list'
        const spoke = {
            text: subItemText,
            type: spokeType,
            children: [],
            scheduled: null, // For single/repeating: spoke-level scheduling
            metadata: {
                condition: null,        // For pending spokes (future)
                calendarEventId: null,  // For syncing with calendar
                nextState: null,        // For pending → other type transitions (future)
                recurrence: null        // For repeating spokes
            }
        };

        item.subItems.push(spoke);
        this.saveToStorage();
    },

    updateSpokeType(categoryId, itemId, spokeIndex, spokeType, metadata = {}) {
        const item = this.getItem(categoryId, itemId);
        if (!item) return;

        const spoke = item.subItems[spokeIndex];
        if (!spoke) return;

        // Convert to object if it's still a string (legacy data)
        if (typeof spoke === 'string') {
            item.subItems[spokeIndex] = {
                text: spoke,
                type: spokeType,
                children: [],
                scheduled: null,
                metadata: {
                    condition: metadata.condition || null,
                    calendarEventId: metadata.calendarEventId || null,
                    nextState: metadata.nextState || null,
                    recurrence: metadata.recurrence || null
                }
            };
        } else {
            // Handle type migration: clear irrelevant data when type changes
            const oldType = spoke.type;
            spoke.type = spokeType;

            // If changing from list to single/repeating, clear children
            if ((oldType === 'list' || oldType === 'action') &&
                (spokeType === 'single' || spokeType === 'repeating')) {
                // Children are no longer relevant for single/repeating
                // Keep them but they won't be displayed
            }

            // If changing from single/repeating to list/static, clear spoke-level schedule
            if ((oldType === 'single' || oldType === 'repeating') &&
                (spokeType === 'list' || spokeType === 'static')) {
                spoke.scheduled = null;
            }

            spoke.metadata = {
                ...(spoke.metadata || {}),
                ...metadata
            };
        }

        this.saveToStorage();
    },

    getSpokeType(categoryId, itemId, spokeIndex) {
        const spoke = this.getSpoke(categoryId, itemId, spokeIndex);
        if (!spoke) return null;

        if (typeof spoke === 'string') return 'static'; // Legacy spokes

        // Backwards compat: 'action' → 'list', and untyped spokes with children → 'list'
        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';
        if (type === 'static' && spoke.children && spoke.children.length > 0) type = 'list';
        return type;
    },

    getSpokeMetadata(categoryId, itemId, spokeIndex) {
        const spoke = this.getSpoke(categoryId, itemId, spokeIndex);
        if (!spoke || typeof spoke === 'string') return null;

        return spoke.metadata || {};
    },

    moveSubItem(fromCategoryId, fromItemId, fromIndex, toCategoryId, toItemId, toIndex) {
        const fromItem = this.getItem(fromCategoryId, fromItemId);
        const toItem = this.getItem(toCategoryId, toItemId);

        if (!fromItem || !toItem) return;

        // Remove from source
        const [subItem] = fromItem.subItems.splice(fromIndex, 1);

        // Add to target (insert at position)
        toItem.subItems.splice(toIndex, 0, subItem);

        this.saveToStorage();
    },

    removeSubItem(categoryId, itemId, subItemIndex) {
        const item = this.getItem(categoryId, itemId);
        if (!item) return;

        item.subItems.splice(subItemIndex, 1);
        this.saveToStorage();
    },

    addSpokeChild(categoryId, itemId, spokeIndex, childText) {
        const item = this.getItem(categoryId, itemId);
        if (!item) return;

        // Ensure spoke exists and has children array
        if (!item.subItems[spokeIndex]) return;

        // Convert spoke to object if it's still a string
        if (typeof item.subItems[spokeIndex] === 'string') {
            item.subItems[spokeIndex] = {
                text: item.subItems[spokeIndex],
                type: 'list', // Has children, so it's a list spoke
                children: [],
                scheduled: null,
                metadata: {
                    condition: null,
                    calendarEventId: null,
                    nextState: null,
                    recurrence: null
                }
            };
        }

        // Ensure children array exists
        if (!item.subItems[spokeIndex].children) {
            item.subItems[spokeIndex].children = [];
        }

        // If spoke was single/repeating, convert to list now that it has children
        if (item.subItems[spokeIndex].type === 'single' ||
            item.subItems[spokeIndex].type === 'repeating') {
            item.subItems[spokeIndex].type = 'list';
        }

        item.subItems[spokeIndex].children.push({
            text: childText,
            children: []
        });

        this.saveToStorage();
    },

    removeSpokeChild(categoryId, itemId, spokeIndex, childIndex) {
        const item = this.getItem(categoryId, itemId);
        if (!item) return;

        if (typeof item.subItems[spokeIndex] === 'object' && item.subItems[spokeIndex].children) {
            item.subItems[spokeIndex].children.splice(childIndex, 1);
            this.saveToStorage();
        }
    },

    // --- Batch Save ---
    _batchSaveDepth: 0,

    batchSave(fn) {
        this._batchSaveDepth++;
        try {
            fn();
        } finally {
            this._batchSaveDepth--;
            if (this._batchSaveDepth === 0) {
                this.saveToStorage();
            }
        }
    },

    // --- Accessor Helpers ---

    getCategory(categoryId) {
        return this.categories.find(c => c.id === categoryId);
    },

    getItem(categoryId, itemId) {
        const cat = this.getCategory(categoryId);
        return cat ? cat.items.find(i => i.id === itemId) : null;
    },

    getSpoke(categoryId, itemId, spokeIndex) {
        const item = this.getItem(categoryId, itemId);
        return item ? (item.subItems || [])[spokeIndex] : null;
    },

    getAction(categoryId, itemId, spokeIndex, childIndex) {
        const spoke = this.getSpoke(categoryId, itemId, spokeIndex);
        return spoke?.children?.[childIndex] || null;
    },

    normalizeItemsInCategory(categoryId) {
        const category = this.getCategory(categoryId);
        if (!category || category.items.length === 0) return;

        const total = category.items.reduce((sum, item) => sum + item.percentage, 0);
        if (total > 0 && total !== 100) {
            category.items.forEach(item => {
                item.percentage = (item.percentage / total) * 100;
            });
        }
    },

    getCategories() {
        return this.categories;
    },

    getFilteredCategories() {
        if (this.priorityList.length === 0) return [];

        // Build sets of what's visible from priorityList
        const visibleSlices = new Set(); // "categoryId:itemId" — show all spokes
        const visibleSpokes = new Map(); // "categoryId:itemId" → Set of spokeIndices

        for (const ref of this.priorityList) {
            const sliceKey = `${ref.categoryId}:${ref.itemId}`;
            if (ref.type === 'slice') {
                visibleSlices.add(sliceKey);
            } else if (ref.type === 'spoke' || ref.type === 'action') {
                if (!visibleSlices.has(sliceKey)) {
                    if (!visibleSpokes.has(sliceKey)) {
                        visibleSpokes.set(sliceKey, new Set());
                    }
                    visibleSpokes.get(sliceKey).add(ref.spokeIndex);
                }
            }
        }

        const filtered = [];
        for (const cat of this.categories) {
            const filteredItems = [];
            for (const item of (cat.items || [])) {
                const sliceKey = `${cat.id}:${item.id}`;
                if (visibleSlices.has(sliceKey)) {
                    // Prioritised slice — include all spokes
                    filteredItems.push({ ...item, subItems: [...(item.subItems || [])] });
                } else if (visibleSpokes.has(sliceKey)) {
                    // Only include specific spokes, annotated with original index
                    const indices = visibleSpokes.get(sliceKey);
                    const filteredSubItems = [];
                    (item.subItems || []).forEach((spoke, idx) => {
                        if (indices.has(idx)) {
                            const s = typeof spoke === 'string' ? { text: spoke, _originalIndex: idx } : { ...spoke, _originalIndex: idx };
                            filteredSubItems.push(s);
                        }
                    });
                    if (filteredSubItems.length > 0) {
                        filteredItems.push({ ...item, subItems: filteredSubItems });
                    }
                }
            }
            if (filteredItems.length > 0) {
                filtered.push({ ...cat, items: filteredItems });
            }
        }
        return filtered;
    },

    setCategories(categories) {
        this.categories = categories;
        this.categoryPercentageOverrides = {};
        this.saveToStorage();
    },

    // ==========================================
    // Merge utilities for granular import
    // ==========================================

    /**
     * Find a category by name (case-insensitive)
     */
    findCategoryByName(name) {
        const normalizedName = name.toLowerCase().trim();
        return this.categories.find(cat =>
            cat.name.toLowerCase().trim() === normalizedName
        );
    },

    /**
     * Find an item (slice) by name within a category (case-insensitive)
     */
    findItemByName(categoryId, name) {
        const category = this.getCategory(categoryId);
        if (!category) return null;

        const normalizedName = name.toLowerCase().trim();
        return category.items.find(item =>
            item.name.toLowerCase().trim() === normalizedName
        );
    },

    /**
     * Find a spoke by text within an item (case-insensitive)
     */
    findSpokeByText(categoryId, itemId, text) {
        const item = this.getItem(categoryId, itemId);
        if (!item || !item.subItems) return null;

        const normalizedText = text.toLowerCase().trim();
        const index = item.subItems.findIndex(spoke => {
            const spokeText = typeof spoke === 'string' ? spoke : spoke.text;
            return spokeText.toLowerCase().trim() === normalizedText;
        });

        return index >= 0 ? { spoke: item.subItems[index], index } : null;
    },

    /**
     * Generate a unique category ID
     */
    generateCategoryId(name) {
        return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    },

    /**
     * Generate a unique item ID
     */
    generateItemId() {
        return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Normalize a spoke to object format (handles legacy string format)
     * New types: 'static', 'single', 'repeating', 'list'
     * Backwards compat: 'action' type treated as 'list'
     */
    normalizeSpoke(spoke) {
        if (typeof spoke === 'string') {
            return {
                text: spoke,
                type: 'static',
                notes: null,
                children: [],
                scheduled: null,
                metadata: {
                    condition: null,
                    calendarEventId: null,
                    nextState: null,
                    recurrence: null
                }
            };
        }

        // Backwards compatibility: treat 'action' as 'list'
        let type = spoke.type || 'static';
        if (type === 'action') {
            type = 'list';
        }

        // Ensure all expected fields exist
        return {
            text: spoke.text || '',
            type: type,
            notes: spoke.notes || null,
            children: (Array.isArray(spoke.children) ? spoke.children : Object.values(spoke.children || {})).map(child => {
                if (typeof child === 'string') return { text: child, children: [], completed: false };
                return {
                    text: child.text || '',
                    children: child.children || [],
                    completed: child.completed || false,
                    scheduled: child.scheduled || null,
                    recurrence: child.recurrence || null
                };
            }),
            scheduled: spoke.scheduled || null, // For single/repeating: spoke-level scheduling
            metadata: {
                condition: spoke.metadata?.condition || null,
                calendarEventId: spoke.metadata?.calendarEventId || null,
                nextState: spoke.metadata?.nextState || null,
                recurrence: spoke.metadata?.recurrence || null
            }
        };
    },

    /**
     * Get spoke-level schedule data (for single/repeating spokes)
     */
    getSpokeSchedule(categoryId, itemId, spokeIndex) {
        const spoke = this.getSpoke(categoryId, itemId, spokeIndex);
        if (!spoke || typeof spoke === 'string') return null;

        return spoke.scheduled || null;
    },

    /**
     * Set spoke-level schedule data (for single/repeating spokes)
     */
    setSpokeSchedule(categoryId, itemId, spokeIndex, scheduleData) {
        const item = this.getItem(categoryId, itemId);
        if (!item) return;

        // Convert spoke to object if needed
        if (typeof item.subItems[spokeIndex] === 'string') {
            item.subItems[spokeIndex] = this.normalizeSpoke(item.subItems[spokeIndex]);
        }

        item.subItems[spokeIndex].scheduled = scheduleData;
        this.saveToStorage();
    },

    /**
     * Add or merge a category from import data
     * Returns: { action: 'added'|'merged', categoryId: string }
     */
    addOrMergeCategory(importedCategory, skipSave = false) {
        const existing = this.findCategoryByName(importedCategory.name);

        if (existing) {
            // Merge: add imported slices to existing category
            if (importedCategory.items && importedCategory.items.length > 0) {
                for (const importedItem of importedCategory.items) {
                    this.addOrMergeItem(existing.id, importedItem, true);
                }
            }
            if (!skipSave) this.saveToStorage();
            return { action: 'merged', categoryId: existing.id };
        }

        // Add new category with regenerated ID
        const newId = this.generateCategoryId(importedCategory.name);
        const newCategory = {
            id: newId,
            name: importedCategory.name,
            color: importedCategory.color || '#4CAF50',
            items: []
        };
        this.categories.push(newCategory);

        // Add all items
        if (importedCategory.items && importedCategory.items.length > 0) {
            for (const importedItem of importedCategory.items) {
                this.addOrMergeItem(newId, importedItem, true);
            }
        }

        if (!skipSave) this.saveToStorage();
        return { action: 'added', categoryId: newId };
    },

    /**
     * Add or merge an item (slice) from import data
     * Returns: { action: 'added'|'merged', itemId: string }
     */
    addOrMergeItem(categoryId, importedItem, skipSave = false) {
        const category = this.getCategory(categoryId);
        if (!category) return null;

        const existing = this.findItemByName(categoryId, importedItem.name);

        if (existing) {
            // Merge: add imported spokes to existing item
            if (importedItem.subItems && importedItem.subItems.length > 0) {
                for (const importedSpoke of importedItem.subItems) {
                    this.addOrMergeSpoke(categoryId, existing.id, importedSpoke, true);
                }
            }
            // Normalize percentages
            this.normalizeItemsInCategory(categoryId);
            if (!skipSave) this.saveToStorage();
            return { action: 'merged', itemId: existing.id };
        }

        // Add new item with regenerated ID
        const newId = this.generateItemId();
        const newItem = {
            id: newId,
            name: importedItem.name,
            percentage: importedItem.percentage || 20,
            color: importedItem.color || '#2196F3',
            subItems: []
        };
        category.items.push(newItem);

        // Add all spokes
        if (importedItem.subItems && importedItem.subItems.length > 0) {
            for (const importedSpoke of importedItem.subItems) {
                this.addOrMergeSpoke(categoryId, newId, importedSpoke, true);
            }
        }

        // Normalize percentages
        this.normalizeItemsInCategory(categoryId);
        if (!skipSave) this.saveToStorage();
        return { action: 'added', itemId: newId };
    },

    /**
     * Add or merge a spoke from import data
     * Returns: { action: 'added'|'merged'|'skipped' }
     */
    addOrMergeSpoke(categoryId, itemId, importedSpoke, skipSave = false) {
        const item = this.getItem(categoryId, itemId);
        if (!item) return null;

        // Ensure subItems array exists
        if (!item.subItems) item.subItems = [];

        const normalizedImported = this.normalizeSpoke(importedSpoke);
        const existing = this.findSpokeByText(categoryId, itemId, normalizedImported.text);

        if (existing) {
            // Merge: add new actions to existing spoke (avoid duplicates)
            // Always normalize existing spoke (Firebase drops empty arrays/null values)
            item.subItems[existing.index] = this.normalizeSpoke(existing.spoke);

            // Merge children (actions)
            if (normalizedImported.children && normalizedImported.children.length > 0) {
                for (const importedAction of normalizedImported.children) {
                    const actionText = typeof importedAction === 'string'
                        ? importedAction
                        : importedAction.text;

                    // Check for existing action with same text
                    const existingActionIndex = item.subItems[existing.index].children.findIndex(a => {
                        const aText = typeof a === 'string' ? a : a.text;
                        return aText.toLowerCase().trim() === actionText.toLowerCase().trim();
                    });

                    if (existingActionIndex >= 0) {
                        // Update existing action's scheduled data if imported has it
                        if (typeof importedAction === 'object' && importedAction.scheduled) {
                            const existingAction = item.subItems[existing.index].children[existingActionIndex];
                            // Convert to object if it was a string
                            if (typeof existingAction === 'string') {
                                item.subItems[existing.index].children[existingActionIndex] = {
                                    text: existingAction,
                                    children: [],
                                    scheduled: { ...importedAction.scheduled, calendarEventId: null }
                                };
                            } else {
                                // Update scheduled data (clear calendar event ID so it can be recreated)
                                item.subItems[existing.index].children[existingActionIndex].scheduled = {
                                    ...importedAction.scheduled,
                                    calendarEventId: null
                                };
                            }
                        }
                    } else {
                        // Add new action (preserve scheduling info but clear calendar event ID)
                        const newAction = typeof importedAction === 'string'
                            ? { text: importedAction, children: [] }
                            : {
                                text: importedAction.text,
                                children: importedAction.children || [],
                                scheduled: importedAction.scheduled
                                    ? { ...importedAction.scheduled, calendarEventId: null }
                                    : null
                            };
                        item.subItems[existing.index].children.push(newAction);
                    }
                }
            }

            if (!skipSave) this.saveToStorage();
            return { action: 'merged' };
        }

        // Add new spoke (clear calendar event IDs to avoid conflicts)
        const newSpoke = {
            ...normalizedImported,
            metadata: {
                ...normalizedImported.metadata,
                calendarEventId: null
            },
            children: normalizedImported.children.map(child => {
                if (typeof child === 'string') return { text: child, children: [] };
                return {
                    ...child,
                    scheduled: child.scheduled
                        ? { ...child.scheduled, calendarEventId: null }
                        : null
                };
            })
        };

        item.subItems.push(newSpoke);
        if (!skipSave) this.saveToStorage();
        return { action: 'added' };
    },

    // --- Priority List Methods ---

    /**
     * Save priorities to per-user storage (Firebase) in addition to main blob
     */
    savePrioritiesToStorage() {
        if (typeof StorageAdapter !== 'undefined') {
            StorageAdapter.savePriorities(this.priorityList).catch(e => {
                console.error('StorageAdapter.savePriorities failed:', e);
            });
        }
    },

    addPriority(ref) {
        // Check for duplicates
        const existingIdx = this.priorityList.findIndex(p =>
            p.type === ref.type &&
            p.categoryId === ref.categoryId &&
            p.itemId === ref.itemId &&
            p.spokeIndex === ref.spokeIndex &&
            p.childIndex === ref.childIndex
        );

        if (existingIdx >= 0) {
            // Already exists — move to top
            if (existingIdx === 0) return 'already-top';
            this.priorityList.splice(existingIdx, 1);
            this.priorityList.unshift(ref);
            this.saveToStorage();
            this.savePrioritiesToStorage();
            return 'moved';
        }

        // Add to top of list
        this.priorityList.unshift(ref);
        this.saveToStorage();
        this.savePrioritiesToStorage();
        return 'added';
    },

    removePriority(index) {
        if (index >= 0 && index < this.priorityList.length) {
            this.priorityList.splice(index, 1);
            this.saveToStorage();
            this.savePrioritiesToStorage();
        }
    },

    reorderPriority(fromIdx, toIdx) {
        if (fromIdx < 0 || fromIdx >= this.priorityList.length) return;
        if (toIdx < 0 || toIdx >= this.priorityList.length) return;
        const [item] = this.priorityList.splice(fromIdx, 1);
        this.priorityList.splice(toIdx, 0, item);
        this.saveToStorage();
        this.savePrioritiesToStorage();
    },

    resolvePriority(ref) {
        const category = this.getCategory(ref.categoryId);
        if (!category) return null;

        const item = this.getItem(ref.categoryId, ref.itemId);
        if (!item) return null;

        if (ref.type === 'slice') {
            return { displayName: item.name, context: category.name, color: item.color || category.color };
        }

        const subItems = item.subItems || [];
        if (ref.spokeIndex == null || ref.spokeIndex >= subItems.length) return null;

        const spoke = subItems[ref.spokeIndex];
        const spokeName = typeof spoke === 'string' ? spoke : (spoke.text || '');

        if (ref.type === 'spoke') {
            return { displayName: spokeName, context: `${item.name} / ${category.name}`, color: item.color || category.color };
        }

        if (ref.type === 'action') {
            if (typeof spoke !== 'object' || !spoke.children) return null;
            if (ref.childIndex == null || ref.childIndex >= spoke.children.length) return null;
            const child = spoke.children[ref.childIndex];
            const childName = typeof child === 'string' ? child : (child.text || '');
            return { displayName: childName, context: `${spokeName} / ${item.name}`, color: item.color || category.color };
        }

        return null;
    },

    validatePriorityList() {
        this.priorityList = this.priorityList.filter(ref => this.resolvePriority(ref) !== null);
    },

    /**
     * Scan all spokes and actions for existing calendarEventIds.
     * Returns a Set of known IDs (for filtering already-imported events).
     */
    getExistingCalendarEventIds() {
        const ids = new Set();
        for (const category of this.categories) {
            for (const item of (category.items || [])) {
                for (const spoke of (item.subItems || [])) {
                    if (typeof spoke !== 'object') continue;
                    // Spoke-level calendarEventId (single/repeating)
                    if (spoke.scheduled?.calendarEventId) {
                        ids.add(spoke.scheduled.calendarEventId);
                    }
                    if (spoke.metadata?.calendarEventId) {
                        ids.add(spoke.metadata.calendarEventId);
                    }
                    // Action-level calendarEventIds (list type)
                    for (const child of (spoke.children || [])) {
                        if (typeof child === 'object' && child.scheduled?.calendarEventId) {
                            ids.add(child.scheduled.calendarEventId);
                        }
                    }
                }
            }
        }
        return ids;
    },

    // --- Transform Methods ---

    /**
     * Get available transforms for a selected item.
     * Returns array of { id, label, description, needsTarget, targetType }
     */
    getAvailableTransforms(type, categoryId, itemId, spokeIndex) {
        const transforms = [];

        if (type === 'spoke') {
            const spoke = this.getSpoke(categoryId, itemId, spokeIndex);
            if (!spoke || typeof spoke === 'string') return transforms;
            const spokeType = spoke.type === 'action' ? 'list' : (spoke.type || 'static');
            if (spokeType === 'list' && spoke.children && spoke.children.length > 0) {
                transforms.push({
                    id: 'spoke-to-slice',
                    label: 'Promote to Slice',
                    description: 'Actions become spokes on a new slice in the same category',
                    needsTarget: false,
                    targetType: null
                });
            }
        } else if (type === 'slice') {
            const item = this.getItem(categoryId, itemId);
            if (!item) return transforms;

            // Find other slices in other categories for demotion target
            const otherSlicesExist = this.categories.some(cat =>
                cat.items && cat.items.length > 0 && (cat.id !== categoryId || cat.items.some(i => i.id !== itemId))
            );

            if (otherSlicesExist) {
                transforms.push({
                    id: 'slice-to-spoke',
                    label: 'Demote to Spoke',
                    description: 'Spokes become actions on a new list spoke in the target slice',
                    needsTarget: true,
                    targetType: 'slice'
                });
            }

            transforms.push({
                id: 'slice-to-category',
                label: 'Promote to Category',
                description: 'Slice becomes a category, spokes become slices, actions become spokes',
                needsTarget: false,
                targetType: null
            });
        } else if (type === 'category') {
            const category = this.getCategory(categoryId);
            if (!category) return transforms;

            // Need at least one other category as target
            const otherCategories = this.categories.filter(c => c.id !== categoryId);
            if (category.items && category.items.length > 0 && otherCategories.length > 0) {
                transforms.push({
                    id: 'category-to-slice',
                    label: 'Demote to Slice',
                    description: 'Category becomes a slice on the target category, slices become list spokes',
                    needsTarget: true,
                    targetType: 'category'
                });
            }
        }

        return transforms;
    },

    /**
     * Build a preview of the transform result.
     * Returns { source, result } tree objects for display.
     */
    buildTransformPreview(transformId, params) {
        switch (transformId) {
            case 'spoke-to-slice': return this._previewSpokeToSlice(params);
            case 'slice-to-spoke': return this._previewSliceToSpoke(params);
            case 'slice-to-category': return this._previewSliceToCategory(params);
            case 'category-to-slice': return this._previewCategoryToSlice(params);
            default: return null;
        }
    },

    _previewSpokeToSlice(params) {
        const { categoryId, itemId, spokeIndex } = params;
        const category = this.getCategory(categoryId);
        const item = this.getItem(categoryId, itemId);
        const spoke = this.getSpoke(categoryId, itemId, spokeIndex);
        if (!category || !item || !spoke) return null;

        const spokeName = typeof spoke === 'string' ? spoke : spoke.text;
        const children = (typeof spoke === 'object' && spoke.children) ? spoke.children : [];

        const source = {
            name: category.name, type: 'category', children: [{
                name: item.name, type: 'slice', children: [{
                    name: spokeName, type: 'spoke',
                    children: children.map(c => ({ name: typeof c === 'string' ? c : c.text, type: 'action' }))
                }]
            }]
        };

        const result = {
            name: category.name, type: 'category', children: [{
                name: spokeName, type: 'slice', isNew: true,
                children: children.map(c => ({
                    name: typeof c === 'string' ? c : c.text, type: 'spoke', isNew: true
                }))
            }]
        };

        return { source, result };
    },

    _previewSliceToSpoke(params) {
        const { categoryId, itemId, targetCategoryId, targetItemId } = params;
        const category = this.getCategory(categoryId);
        const item = this.getItem(categoryId, itemId);
        const targetCat = this.getCategory(targetCategoryId);
        const targetItem = this.getItem(targetCategoryId, targetItemId);
        if (!category || !item || !targetCat || !targetItem) return null;

        const spokes = (item.subItems || []).map(s => {
            const name = typeof s === 'string' ? s : s.text;
            const children = (typeof s === 'object' && s.children) ? s.children : [];
            return { name, children: children.map(c => ({ name: typeof c === 'string' ? c : c.text, type: 'action' })), type: 'spoke' };
        });

        const source = {
            name: category.name, type: 'category', children: [{
                name: item.name, type: 'slice', children: spokes
            }]
        };

        // Flatten spokes into actions
        const flatActions = [];
        for (const s of (item.subItems || [])) {
            const flat = this._flattenSpokeToActions(s);
            flatActions.push(...flat.map(a => ({ name: a.text, type: 'action', isNew: true })));
        }

        const result = {
            name: targetCat.name, type: 'category', children: [{
                name: targetItem.name, type: 'slice', children: [{
                    name: item.name, type: 'spoke', isNew: true,
                    children: flatActions
                }]
            }]
        };

        return { source, result };
    },

    _previewSliceToCategory(params) {
        const { categoryId, itemId } = params;
        const category = this.getCategory(categoryId);
        const item = this.getItem(categoryId, itemId);
        if (!category || !item) return null;

        const spokes = (item.subItems || []).map(s => {
            const name = typeof s === 'string' ? s : s.text;
            const children = (typeof s === 'object' && s.children) ? s.children : [];
            return { name, children: children.map(c => ({ name: typeof c === 'string' ? c : c.text, type: 'action' })), type: 'spoke' };
        });

        const source = {
            name: category.name, type: 'category', children: [{
                name: item.name, type: 'slice', children: spokes
            }]
        };

        // Spokes become slices, actions become spokes
        const newSlices = (item.subItems || []).map(s => {
            const name = typeof s === 'string' ? s : s.text;
            const children = (typeof s === 'object' && s.children) ? s.children : [];
            return {
                name, type: 'slice', isNew: true,
                children: children.map(c => ({ name: typeof c === 'string' ? c : c.text, type: 'spoke', isNew: true }))
            };
        });

        const result = {
            name: item.name, type: 'category', isNew: true,
            children: newSlices
        };

        return { source, result };
    },

    _previewCategoryToSlice(params) {
        const { categoryId, targetCategoryId } = params;
        const category = this.getCategory(categoryId);
        const targetCat = this.getCategory(targetCategoryId);
        if (!category || !targetCat) return null;

        const sliceNodes = (category.items || []).map(item => {
            const spokeNodes = (item.subItems || []).map(s => {
                const name = typeof s === 'string' ? s : s.text;
                const children = (typeof s === 'object' && s.children) ? s.children : [];
                return { name, type: 'spoke', children: children.map(c => ({ name: typeof c === 'string' ? c : c.text, type: 'action' })) };
            });
            return { name: item.name, type: 'slice', children: spokeNodes };
        });

        const source = {
            name: category.name, type: 'category', children: sliceNodes
        };

        // Each slice becomes a list spoke, spokes flattened to actions
        const newSpokes = (category.items || []).map(item => {
            const flatActions = [];
            for (const s of (item.subItems || [])) {
                const flat = this._flattenSpokeToActions(s);
                flatActions.push(...flat.map(a => ({ name: a.text, type: 'action', isNew: true })));
            }
            return { name: item.name, type: 'spoke', isNew: true, children: flatActions };
        });

        const result = {
            name: targetCat.name, type: 'category', children: [{
                name: category.name, type: 'slice', isNew: true,
                children: newSpokes
            }]
        };

        return { source, result };
    },

    /**
     * Flatten a spoke + its children into a flat array of action objects.
     * The spoke text becomes the first action, followed by child texts.
     * Preserves scheduled/calendarEventId data.
     */
    _flattenSpokeToActions(spoke) {
        const actions = [];
        const name = typeof spoke === 'string' ? spoke : spoke.text;
        const scheduled = (typeof spoke === 'object') ? spoke.scheduled : null;
        const calendarEventId = (typeof spoke === 'object') ? (spoke.metadata?.calendarEventId || spoke.scheduled?.calendarEventId || null) : null;

        // The spoke itself becomes an action
        actions.push({
            text: name,
            children: [],
            scheduled: scheduled || null,
            completed: false
        });

        // Its children become sibling actions after the parent
        if (typeof spoke === 'object' && spoke.children) {
            for (const child of spoke.children) {
                const childText = typeof child === 'string' ? child : child.text;
                actions.push({
                    text: childText,
                    children: [],
                    scheduled: (typeof child === 'object' && child.scheduled) ? child.scheduled : null,
                    completed: (typeof child === 'object') ? (child.completed || false) : false
                });
            }
        }

        return actions;
    },

    /**
     * Execute a transform.
     */
    executeTransform(transformId, params) {
        switch (transformId) {
            case 'spoke-to-slice': return this.transformSpokeToSlice(params);
            case 'slice-to-spoke': return this.transformSliceToSpoke(params);
            case 'slice-to-category': return this.transformSliceToCategory(params);
            case 'category-to-slice': return this.transformCategoryToSlice(params);
            default: throw new Error('Unknown transform: ' + transformId);
        }
    },

    transformSpokeToSlice(params) {
        const { categoryId, itemId, spokeIndex } = params;
        this.batchSave(() => {
            const category = this.getCategory(categoryId);
            const item = this.getItem(categoryId, itemId);
            const spoke = item.subItems[spokeIndex];
            if (!category || !item || !spoke) return;

            const spokeName = typeof spoke === 'string' ? spoke : spoke.text;
            const children = (typeof spoke === 'object' && spoke.children) ? spoke.children : [];

            // Build new slice with actions as spokes
            const newSliceId = this.generateItemId();
            const newSlice = {
                id: newSliceId,
                name: spokeName,
                percentage: 20,
                color: item.color || category.color,
                subItems: children.map(child => {
                    const childText = typeof child === 'string' ? child : child.text;
                    const childScheduled = (typeof child === 'object' && child.scheduled) ? child.scheduled : null;
                    return {
                        text: childText,
                        type: childScheduled ? 'single' : 'static',
                        children: [],
                        scheduled: childScheduled,
                        metadata: {
                            condition: null,
                            calendarEventId: (typeof child === 'object' && child.scheduled?.calendarEventId) ? child.scheduled.calendarEventId : null,
                            nextState: null,
                            recurrence: null
                        }
                    };
                })
            };

            // Build priority remappings before modifying data
            const remappings = [];

            // Actions on old spoke → spokes on new slice
            for (let ci = 0; ci < children.length; ci++) {
                remappings.push({
                    from: { type: 'action', categoryId, itemId, spokeIndex, childIndex: ci },
                    to: { type: 'spoke', categoryId, itemId: newSliceId, spokeIndex: ci }
                });
            }

            // Old spoke priority → new slice priority
            remappings.push({
                from: { type: 'spoke', categoryId, itemId, spokeIndex },
                to: { type: 'slice', categoryId, itemId: newSliceId }
            });

            // Remove the spoke from source
            item.subItems.splice(spokeIndex, 1);

            // Remap priorities for spokes that shifted down
            for (let si = spokeIndex; si < item.subItems.length; si++) {
                remappings.push({
                    from: { type: 'spoke', categoryId, itemId, spokeIndex: si + 1 },
                    to: { type: 'spoke', categoryId, itemId, spokeIndex: si }
                });
                // Also shift action refs for remaining spokes
                const s = item.subItems[si];
                if (typeof s === 'object' && s.children) {
                    for (let ci = 0; ci < s.children.length; ci++) {
                        remappings.push({
                            from: { type: 'action', categoryId, itemId, spokeIndex: si + 1, childIndex: ci },
                            to: { type: 'action', categoryId, itemId, spokeIndex: si, childIndex: ci }
                        });
                    }
                }
            }

            // Add new slice to category
            category.items.push(newSlice);
            this.normalizeItemsInCategory(categoryId);

            // Apply priority remappings
            this.remapPriorityRefs(remappings);
        });
    },

    transformSliceToSpoke(params) {
        const { categoryId, itemId, targetCategoryId, targetItemId } = params;
        this.batchSave(() => {
            const category = this.getCategory(categoryId);
            const item = this.getItem(categoryId, itemId);
            const targetItem = this.getItem(targetCategoryId, targetItemId);
            if (!category || !item || !targetItem) return;

            // Flatten all spokes into actions
            const flatActions = [];
            for (const s of (item.subItems || [])) {
                const flat = this._flattenSpokeToActions(s);
                flatActions.push(...flat);
            }

            // Build new list spoke on target slice
            const newSpokeIndex = (targetItem.subItems || []).length;
            const newSpoke = {
                text: item.name,
                type: flatActions.length > 0 ? 'list' : 'static',
                children: flatActions,
                scheduled: null,
                metadata: {
                    condition: null,
                    calendarEventId: null,
                    nextState: null,
                    recurrence: null
                }
            };

            // Build priority remappings before modifying data
            const remappings = [];

            // Old slice priority → new spoke priority
            remappings.push({
                from: { type: 'slice', categoryId, itemId },
                to: { type: 'spoke', categoryId: targetCategoryId, itemId: targetItemId, spokeIndex: newSpokeIndex }
            });

            // Map old spoke/action priorities to new action indices
            let actionIdx = 0;
            for (let si = 0; si < (item.subItems || []).length; si++) {
                const s = item.subItems[si];
                // Spoke itself becomes an action
                remappings.push({
                    from: { type: 'spoke', categoryId, itemId, spokeIndex: si },
                    to: { type: 'action', categoryId: targetCategoryId, itemId: targetItemId, spokeIndex: newSpokeIndex, childIndex: actionIdx }
                });
                actionIdx++;

                // Children become subsequent actions
                if (typeof s === 'object' && s.children) {
                    for (let ci = 0; ci < s.children.length; ci++) {
                        remappings.push({
                            from: { type: 'action', categoryId, itemId, spokeIndex: si, childIndex: ci },
                            to: { type: 'action', categoryId: targetCategoryId, itemId: targetItemId, spokeIndex: newSpokeIndex, childIndex: actionIdx }
                        });
                        actionIdx++;
                    }
                }
            }

            // Remove source slice
            const itemIndex = category.items.findIndex(i => i.id === itemId);
            if (itemIndex >= 0) {
                category.items.splice(itemIndex, 1);
            }

            // Add new spoke to target
            if (!targetItem.subItems) targetItem.subItems = [];
            targetItem.subItems.push(newSpoke);

            this.normalizeItemsInCategory(categoryId);
            this.normalizeItemsInCategory(targetCategoryId);

            // Apply priority remappings
            this.remapPriorityRefs(remappings);
        });
    },

    transformSliceToCategory(params) {
        const { categoryId, itemId } = params;
        this.batchSave(() => {
            const category = this.getCategory(categoryId);
            const item = this.getItem(categoryId, itemId);
            if (!category || !item) return;

            // Build new category: spokes become slices, actions become spokes
            const newCategoryId = this.generateCategoryId(item.name);
            const newCategory = {
                id: newCategoryId,
                name: item.name,
                color: item.color || category.color,
                items: []
            };

            const remappings = [];

            // Old slice → new category (no direct mapping, but handle slice priority)
            // Slice priority doesn't map cleanly — remove it
            remappings.push({
                from: { type: 'slice', categoryId, itemId },
                to: null // Will be removed
            });

            for (let si = 0; si < (item.subItems || []).length; si++) {
                const spoke = item.subItems[si];
                const spokeName = typeof spoke === 'string' ? spoke : spoke.text;
                const spokeScheduled = (typeof spoke === 'object') ? spoke.scheduled : null;
                const children = (typeof spoke === 'object' && spoke.children) ? spoke.children : [];

                const newSliceId = this.generateItemId();
                const newSlice = {
                    id: newSliceId,
                    name: spokeName,
                    percentage: 100 / Math.max((item.subItems || []).length, 1),
                    color: item.color || category.color,
                    subItems: children.map(child => {
                        const childText = typeof child === 'string' ? child : child.text;
                        const childScheduled = (typeof child === 'object' && child.scheduled) ? child.scheduled : null;
                        return {
                            text: childText,
                            type: childScheduled ? 'single' : 'static',
                            children: [],
                            scheduled: childScheduled,
                            metadata: {
                                condition: null,
                                calendarEventId: (typeof child === 'object' && child.scheduled?.calendarEventId) ? child.scheduled.calendarEventId : null,
                                nextState: null,
                                recurrence: null
                            }
                        };
                    })
                };

                newCategory.items.push(newSlice);

                // Old spoke → new slice
                remappings.push({
                    from: { type: 'spoke', categoryId, itemId, spokeIndex: si },
                    to: { type: 'slice', categoryId: newCategoryId, itemId: newSliceId }
                });

                // Old actions → new spokes
                for (let ci = 0; ci < children.length; ci++) {
                    remappings.push({
                        from: { type: 'action', categoryId, itemId, spokeIndex: si, childIndex: ci },
                        to: { type: 'spoke', categoryId: newCategoryId, itemId: newSliceId, spokeIndex: ci }
                    });
                }
            }

            // Remove source slice from category
            const itemIndex = category.items.findIndex(i => i.id === itemId);
            if (itemIndex >= 0) {
                category.items.splice(itemIndex, 1);
            }

            // Add new category
            this.categories.push(newCategory);
            this.normalizeItemsInCategory(categoryId);

            // Apply priority remappings
            this.remapPriorityRefs(remappings);
        });
    },

    transformCategoryToSlice(params) {
        const { categoryId, targetCategoryId } = params;
        this.batchSave(() => {
            const category = this.getCategory(categoryId);
            const targetCat = this.getCategory(targetCategoryId);
            if (!category || !targetCat) return;

            // Build new slice: each old slice becomes a list spoke with flattened actions
            const newSliceId = this.generateItemId();
            const newSlice = {
                id: newSliceId,
                name: category.name,
                percentage: 20,
                color: category.color,
                subItems: []
            };

            const remappings = [];

            for (let ii = 0; ii < (category.items || []).length; ii++) {
                const item = category.items[ii];

                // Flatten spokes into actions
                const flatActions = [];
                for (const s of (item.subItems || [])) {
                    const flat = this._flattenSpokeToActions(s);
                    flatActions.push(...flat);
                }

                const newSpokeIndex = newSlice.subItems.length;
                const newSpoke = {
                    text: item.name,
                    type: flatActions.length > 0 ? 'list' : 'static',
                    children: flatActions,
                    scheduled: null,
                    metadata: {
                        condition: null,
                        calendarEventId: null,
                        nextState: null,
                        recurrence: null
                    }
                };
                newSlice.subItems.push(newSpoke);

                // Old slice → new spoke
                remappings.push({
                    from: { type: 'slice', categoryId, itemId: item.id },
                    to: { type: 'spoke', categoryId: targetCategoryId, itemId: newSliceId, spokeIndex: newSpokeIndex }
                });

                // Map old spoke/action priorities to new action indices
                let actionIdx = 0;
                for (let si = 0; si < (item.subItems || []).length; si++) {
                    const s = item.subItems[si];
                    remappings.push({
                        from: { type: 'spoke', categoryId, itemId: item.id, spokeIndex: si },
                        to: { type: 'action', categoryId: targetCategoryId, itemId: newSliceId, spokeIndex: newSpokeIndex, childIndex: actionIdx }
                    });
                    actionIdx++;

                    if (typeof s === 'object' && s.children) {
                        for (let ci = 0; ci < s.children.length; ci++) {
                            remappings.push({
                                from: { type: 'action', categoryId, itemId: item.id, spokeIndex: si, childIndex: ci },
                                to: { type: 'action', categoryId: targetCategoryId, itemId: newSliceId, spokeIndex: newSpokeIndex, childIndex: actionIdx }
                            });
                            actionIdx++;
                        }
                    }
                }
            }

            // Remove source category
            this.categories = this.categories.filter(c => c.id !== categoryId);
            delete this.categoryPercentageOverrides[categoryId];

            // Add new slice to target category
            targetCat.items.push(newSlice);
            this.normalizeItemsInCategory(targetCategoryId);

            // Apply priority remappings
            this.remapPriorityRefs(remappings);
        });
    },

    /**
     * Atomically remap priority refs and deduplicate.
     * remappings: array of { from: ref, to: ref|null }
     * null `to` means remove that priority.
     */
    remapPriorityRefs(remappings) {
        if (!remappings || remappings.length === 0) return;

        for (const mapping of remappings) {
            const idx = this.priorityList.findIndex(p =>
                p.type === mapping.from.type &&
                p.categoryId === mapping.from.categoryId &&
                p.itemId === mapping.from.itemId &&
                p.spokeIndex === mapping.from.spokeIndex &&
                p.childIndex === mapping.from.childIndex
            );
            if (idx >= 0) {
                if (mapping.to === null) {
                    this.priorityList.splice(idx, 1);
                } else {
                    this.priorityList[idx] = { ...mapping.to };
                }
            }
        }

        // Deduplicate by composite key
        const seen = new Set();
        this.priorityList = this.priorityList.filter(p => {
            const key = `${p.type}:${p.categoryId}:${p.itemId}:${p.spokeIndex ?? ''}:${p.childIndex ?? ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        this.validatePriorityList();
    },

    /**
     * Scan all spokes for existing googleTaskIds (for dedup on Tasks import).
     * Returns a Set of known Google Task IDs.
     */
    getExistingGoogleTaskIds() {
        const ids = new Set();
        for (const category of this.categories) {
            for (const item of (category.items || [])) {
                // Check slice-level metadata (unmatched tasks imported as slices)
                if (item.metadata?.googleTaskId) {
                    ids.add(item.metadata.googleTaskId);
                }
                // Check spoke-level metadata (matched tasks imported as spokes)
                for (const spoke of (item.subItems || [])) {
                    if (typeof spoke !== 'object') continue;
                    if (spoke.metadata?.googleTaskId) {
                        ids.add(spoke.metadata.googleTaskId);
                    }
                }
            }
        }
        return ids;
    }
};
