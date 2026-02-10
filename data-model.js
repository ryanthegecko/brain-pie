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
        if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
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
            pieNames: this.pieMeta.pieNames || {}
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
        // Only persist activePieId to localStorage (not Firebase)
        localStorage.setItem('brainPie_activePieId', pieId);
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
        return ids.map(id => ({
            id,
            name: this.getPieName(id),
            active: id === activeId
        }));
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

        // Delete pie storage
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

        this.saveMeta();
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

        // Save current pie first
        this.saveToStorage();

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
        // --- Multi-pie path ---
        const meta = await this.loadMeta();

        if (meta && meta.activePieId) {
            // Load active pie
            let pieData;
            if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
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
        const pieId = this.getActivePieId();

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
                // Fallback: no multi-pie yet, use old save path
                StorageAdapter.save(pieData).catch(e => {
                    console.error('StorageAdapter.save failed:', e);
                });
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return 0;

        const totalItems = this.categories.reduce((sum, cat) => sum + cat.items.length, 0);
        if (totalItems === 0) return 0;

        return (category.items.length / totalItems) * 100;
    },

    updateCategoryColor(categoryId, newColor) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        category.color = newColor;
        this.saveToStorage();
    },
    updateCategoryName(categoryId, newName) {
        const category = this.categories.find(cat => cat.id === categoryId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return null;

        const id = Date.now().toString();
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return;

        item.name = newName.trim();
        this.saveToStorage();
    },

    renameSpoke(categoryId, itemId, spokeIndex, newName) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return;

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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return;

        item.color = newColor;
        this.saveToStorage();
    },

    moveItem(fromCategoryId, itemId, toCategoryId) {
        const fromCategory = this.categories.find(cat => cat.id === fromCategoryId);
        const toCategory = this.categories.find(cat => cat.id === toCategoryId);

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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const [movedItem] = category.items.splice(fromIndex, 1);
        category.items.splice(toIndex, 0, movedItem);

        this.saveToStorage();
    },

    removeItem(categoryId, itemId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        category.items = category.items.filter(item => item.id !== itemId);
        this.normalizeItemsInCategory(categoryId);
        this.saveToStorage();
    },

    addSubItem(categoryId, itemId, subItemText, spokeType = 'static') {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return null;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return null;

        const spoke = item.subItems[spokeIndex];
        if (!spoke) return null;

        if (typeof spoke === 'string') return 'static'; // Legacy spokes

        // Backwards compat: 'action' → 'list'
        let type = spoke.type || 'static';
        if (type === 'action') type = 'list';
        return type;
    },

    getSpokeMetadata(categoryId, itemId, spokeIndex) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return null;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return null;

        const spoke = item.subItems[spokeIndex];
        if (!spoke || typeof spoke === 'string') return null;

        return spoke.metadata || {};
    },

    moveSubItem(fromCategoryId, fromItemId, fromIndex, toCategoryId, toItemId, toIndex) {
        const fromCategory = this.categories.find(cat => cat.id === fromCategoryId);
        const toCategory = this.categories.find(cat => cat.id === toCategoryId);

        if (!fromCategory || !toCategory) return;

        const fromItem = fromCategory.items.find(i => i.id === fromItemId);
        const toItem = toCategory.items.find(i => i.id === toItemId);

        if (!fromItem || !toItem) return;

        // Remove from source
        const [subItem] = fromItem.subItems.splice(fromIndex, 1);

        // Add to target (insert at position)
        toItem.subItems.splice(toIndex, 0, subItem);

        this.saveToStorage();
    },

    removeSubItem(categoryId, itemId, subItemIndex) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return;

        item.subItems.splice(subItemIndex, 1);
        this.saveToStorage();
    },

    addSpokeChild(categoryId, itemId, spokeIndex, childText) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return;

        if (typeof item.subItems[spokeIndex] === 'object' && item.subItems[spokeIndex].children) {
            item.subItems[spokeIndex].children.splice(childIndex, 1);
            this.saveToStorage();
        }
    },

    normalizeItemsInCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return null;

        const item = category.items.find(i => i.id === itemId);
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
            children: (Array.isArray(spoke.children) ? spoke.children : Object.values(spoke.children || {})).map(child => {
                if (typeof child === 'string') return { text: child, children: [], completed: false };
                return {
                    text: child.text || '',
                    children: child.children || [],
                    completed: child.completed || false,
                    scheduled: child.scheduled || null
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return null;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return null;

        const spoke = item.subItems[spokeIndex];
        if (!spoke || typeof spoke === 'string') return null;

        return spoke.scheduled || null;
    },

    /**
     * Set spoke-level schedule data (for single/repeating spokes)
     */
    setSpokeSchedule(categoryId, itemId, spokeIndex, scheduleData) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
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
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return null;

        const item = category.items.find(i => i.id === itemId);
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
        const category = this.categories.find(c => c.id === ref.categoryId);
        if (!category) return null;

        if (ref.type === 'slice') {
            const item = category.items.find(i => i.id === ref.itemId);
            if (!item) return null;
            return { displayName: item.name, context: category.name, color: item.color || category.color };
        }

        const item = category.items.find(i => i.id === ref.itemId);
        if (!item) return null;
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
    }
};
