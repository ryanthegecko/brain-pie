/**
 * ImportManager - Orchestrates the granular import/merge process
 *
 * Flow:
 * 1. init(data) - Initialize with parsed JSON from file
 * 2. analyzeImportData() - Build selection tree, detect potential merges
 * 3. toggleSelection() - User selects/deselects items
 * 4. getImportSummary() - Get counts of what will be added/merged
 * 5. executeImport() - Perform the import for selected items
 */
const ImportManager = {
    // Parsed JSON from import file
    importData: null,

    // Selection state: { categoryId: { selected: bool, items: { itemId: { selected: bool, spokes: { spokeIdx: bool } } } } }
    selectedItems: {},

    // Items that will merge with existing data (same name found)
    mergeTargets: {
        categories: {},  // { importCatId: existingCatId }
        items: {},       // { importCatId_importItemId: existingItemId }
        spokes: {}       // { importCatId_importItemId_spokeIdx: existingSpokeIdx }
    },

    /**
     * Initialize with import data
     */
    init(data) {
        this.importData = data;
        this.selectedItems = {};
        this.mergeTargets = {
            categories: {},
            items: {},
            spokes: {}
        };

        if (data && data.categories) {
            this.analyzeImportData();
        }
    },

    /**
     * Analyze import data to detect merge targets and build selection tree
     */
    analyzeImportData() {
        if (!this.importData || !this.importData.categories) return;

        for (const importCat of this.importData.categories) {
            const catKey = importCat.id || importCat.name;

            // Check if category exists (by name)
            const existingCat = DataModel.findCategoryByName(importCat.name);
            if (existingCat) {
                this.mergeTargets.categories[catKey] = existingCat.id;
            }

            // Initialize selection state for category (default: selected)
            this.selectedItems[catKey] = {
                selected: true,
                items: {}
            };

            if (importCat.items) {
                for (const importItem of importCat.items) {
                    const itemKey = importItem.id || importItem.name;

                    // Check if item exists within the target category
                    if (existingCat) {
                        const existingItem = DataModel.findItemByName(existingCat.id, importItem.name);
                        if (existingItem) {
                            this.mergeTargets.items[`${catKey}_${itemKey}`] = existingItem.id;
                        }
                    }

                    // Initialize selection state for item
                    this.selectedItems[catKey].items[itemKey] = {
                        selected: true,
                        spokes: {}
                    };

                    // Analyze spokes
                    if (importItem.subItems) {
                        for (let spokeIdx = 0; spokeIdx < importItem.subItems.length; spokeIdx++) {
                            const spoke = importItem.subItems[spokeIdx];
                            const spokeText = typeof spoke === 'string' ? spoke : spoke.text;

                            // Check if spoke exists
                            if (existingCat) {
                                const existingItemId = this.mergeTargets.items[`${catKey}_${itemKey}`];
                                if (existingItemId) {
                                    const existingSpoke = DataModel.findSpokeByText(existingCat.id, existingItemId, spokeText);
                                    if (existingSpoke) {
                                        // Store true (not index) to avoid falsy 0 issue
                                        this.mergeTargets.spokes[`${catKey}_${itemKey}_${spokeIdx}`] = true;
                                    }
                                }
                            }

                            // Initialize selection state for spoke
                            this.selectedItems[catKey].items[itemKey].spokes[spokeIdx] = true;
                        }
                    }
                }
            }
        }
    },

    /**
     * Get the selection tree for UI rendering
     * Returns structured data with merge indicators
     */
    getSelectionTree() {
        if (!this.importData || !this.importData.categories) return [];

        const tree = [];

        for (const importCat of this.importData.categories) {
            const catKey = importCat.id || importCat.name;
            const willMerge = !!this.mergeTargets.categories[catKey];

            const catNode = {
                key: catKey,
                name: importCat.name,
                color: importCat.color,
                selected: this.selectedItems[catKey]?.selected ?? true,
                willMerge,
                items: []
            };

            if (importCat.items) {
                for (const importItem of importCat.items) {
                    const itemKey = importItem.id || importItem.name;
                    const itemWillMerge = !!this.mergeTargets.items[`${catKey}_${itemKey}`];

                    const itemNode = {
                        key: itemKey,
                        name: importItem.name,
                        color: importItem.color,
                        percentage: importItem.percentage,
                        selected: this.selectedItems[catKey]?.items[itemKey]?.selected ?? true,
                        willMerge: itemWillMerge,
                        spokes: []
                    };

                    if (importItem.subItems) {
                        for (let spokeIdx = 0; spokeIdx < importItem.subItems.length; spokeIdx++) {
                            const spoke = importItem.subItems[spokeIdx];
                            const spokeText = typeof spoke === 'string' ? spoke : spoke.text;
                            const spokeWillMerge = !!this.mergeTargets.spokes[`${catKey}_${itemKey}_${spokeIdx}`];
                            const children = typeof spoke === 'object' ? spoke.children || [] : [];

                            itemNode.spokes.push({
                                index: spokeIdx,
                                text: spokeText,
                                actionsCount: children.length,
                                selected: this.selectedItems[catKey]?.items[itemKey]?.spokes[spokeIdx] ?? true,
                                willMerge: spokeWillMerge
                            });
                        }
                    }

                    catNode.items.push(itemNode);
                }
            }

            tree.push(catNode);
        }

        return tree;
    },

    /**
     * Toggle selection state for an item
     */
    toggleSelection(catKey, itemKey = null, spokeIdx = null) {
        if (!this.selectedItems[catKey]) return;

        if (spokeIdx !== null && itemKey !== null) {
            // Toggle spoke
            const currentState = this.selectedItems[catKey].items[itemKey]?.spokes[spokeIdx];
            this.selectedItems[catKey].items[itemKey].spokes[spokeIdx] = !currentState;
        } else if (itemKey !== null) {
            // Toggle item and all its spokes
            const currentState = this.selectedItems[catKey].items[itemKey]?.selected;
            const newState = !currentState;
            this.selectedItems[catKey].items[itemKey].selected = newState;

            // Also toggle all spokes
            const spokeKeys = Object.keys(this.selectedItems[catKey].items[itemKey].spokes);
            for (const spokeKey of spokeKeys) {
                this.selectedItems[catKey].items[itemKey].spokes[spokeKey] = newState;
            }
        } else {
            // Toggle category and all its items/spokes
            const currentState = this.selectedItems[catKey].selected;
            const newState = !currentState;
            this.selectedItems[catKey].selected = newState;

            // Also toggle all items and spokes
            const itemKeys = Object.keys(this.selectedItems[catKey].items);
            for (const ik of itemKeys) {
                this.selectedItems[catKey].items[ik].selected = newState;
                const spokeKeys = Object.keys(this.selectedItems[catKey].items[ik].spokes);
                for (const spokeKey of spokeKeys) {
                    this.selectedItems[catKey].items[ik].spokes[spokeKey] = newState;
                }
            }
        }
    },

    /**
     * Select all items
     */
    selectAll() {
        for (const catKey of Object.keys(this.selectedItems)) {
            this.selectedItems[catKey].selected = true;
            for (const itemKey of Object.keys(this.selectedItems[catKey].items)) {
                this.selectedItems[catKey].items[itemKey].selected = true;
                for (const spokeKey of Object.keys(this.selectedItems[catKey].items[itemKey].spokes)) {
                    this.selectedItems[catKey].items[itemKey].spokes[spokeKey] = true;
                }
            }
        }
    },

    /**
     * Deselect all items
     */
    deselectAll() {
        for (const catKey of Object.keys(this.selectedItems)) {
            this.selectedItems[catKey].selected = false;
            for (const itemKey of Object.keys(this.selectedItems[catKey].items)) {
                this.selectedItems[catKey].items[itemKey].selected = false;
                for (const spokeKey of Object.keys(this.selectedItems[catKey].items[itemKey].spokes)) {
                    this.selectedItems[catKey].items[itemKey].spokes[spokeKey] = false;
                }
            }
        }
    },

    /**
     * Check if anything is selected
     */
    hasSelection() {
        for (const catKey of Object.keys(this.selectedItems)) {
            if (this.selectedItems[catKey].selected) return true;
            for (const itemKey of Object.keys(this.selectedItems[catKey].items)) {
                if (this.selectedItems[catKey].items[itemKey].selected) return true;
                for (const spokeKey of Object.keys(this.selectedItems[catKey].items[itemKey].spokes)) {
                    if (this.selectedItems[catKey].items[itemKey].spokes[spokeKey]) return true;
                }
            }
        }
        return false;
    },

    /**
     * Get summary of what will be imported
     */
    getImportSummary() {
        const summary = {
            categories: { add: 0, merge: 0 },
            items: { add: 0, merge: 0 },
            spokes: { add: 0, merge: 0 },
            total: 0
        };

        if (!this.importData || !this.importData.categories) return summary;

        for (const importCat of this.importData.categories) {
            const catKey = importCat.id || importCat.name;
            const catSelected = this.selectedItems[catKey]?.selected;
            const catWillMerge = !!this.mergeTargets.categories[catKey];

            // Count category if selected OR if any of its children are selected
            let catHasSelectedChildren = false;

            if (importCat.items) {
                for (const importItem of importCat.items) {
                    const itemKey = importItem.id || importItem.name;
                    const itemSelected = this.selectedItems[catKey]?.items[itemKey]?.selected;
                    const itemWillMerge = !!this.mergeTargets.items[`${catKey}_${itemKey}`];

                    // Count item if selected OR if any spokes selected
                    let itemHasSelectedSpokes = false;

                    if (importItem.subItems) {
                        for (let spokeIdx = 0; spokeIdx < importItem.subItems.length; spokeIdx++) {
                            const spokeSelected = this.selectedItems[catKey]?.items[itemKey]?.spokes[spokeIdx];
                            const spokeWillMerge = !!this.mergeTargets.spokes[`${catKey}_${itemKey}_${spokeIdx}`];

                            if (spokeSelected) {
                                itemHasSelectedSpokes = true;
                                if (spokeWillMerge) {
                                    summary.spokes.merge++;
                                } else {
                                    summary.spokes.add++;
                                }
                            }
                        }
                    }

                    if (itemSelected || itemHasSelectedSpokes) {
                        catHasSelectedChildren = true;
                        if (itemWillMerge) {
                            summary.items.merge++;
                        } else {
                            summary.items.add++;
                        }
                    }
                }
            }

            if (catSelected || catHasSelectedChildren) {
                if (catWillMerge) {
                    summary.categories.merge++;
                } else {
                    summary.categories.add++;
                }
            }
        }

        summary.total = summary.categories.add + summary.categories.merge +
                        summary.items.add + summary.items.merge +
                        summary.spokes.add + summary.spokes.merge;

        return summary;
    },

    /**
     * Execute the import for selected items
     * Returns: { added: number, merged: number, skipped: number }
     */
    executeImport() {
        const results = { added: 0, merged: 0, skipped: 0 };

        if (!this.importData || !this.importData.categories) return results;

        for (const importCat of this.importData.categories) {
            const catKey = importCat.id || importCat.name;
            const catSelected = this.selectedItems[catKey]?.selected;

            // Check if category or any children are selected
            let hasSelectedItems = false;
            const selectedItemsForCat = [];

            if (importCat.items) {
                for (const importItem of importCat.items) {
                    const itemKey = importItem.id || importItem.name;
                    const itemSelected = this.selectedItems[catKey]?.items[itemKey]?.selected;

                    // Check for selected spokes
                    const selectedSpokes = [];
                    if (importItem.subItems) {
                        for (let spokeIdx = 0; spokeIdx < importItem.subItems.length; spokeIdx++) {
                            if (this.selectedItems[catKey]?.items[itemKey]?.spokes[spokeIdx]) {
                                selectedSpokes.push(importItem.subItems[spokeIdx]);
                            }
                        }
                    }

                    if (itemSelected || selectedSpokes.length > 0) {
                        hasSelectedItems = true;
                        selectedItemsForCat.push({
                            ...importItem,
                            subItems: selectedSpokes
                        });
                    }
                }
            }

            if (!catSelected && !hasSelectedItems) {
                results.skipped++;
                continue;
            }

            // Build the category object with only selected items
            const categoryToImport = {
                ...importCat,
                items: selectedItemsForCat
            };

            // Import the category
            const result = DataModel.addOrMergeCategory(categoryToImport, true);
            if (result.action === 'added') {
                results.added++;
            } else if (result.action === 'merged') {
                results.merged++;
            }
        }

        // Update pie name from imported data if current pie is still the default
        this._updatePieNameFromImport();

        // Save once at the end
        DataModel.saveToStorage();

        return results;
    },

    /**
     * Update the active pie name from imported data
     */
    _updatePieNameFromImport() {
        const importedName = this.importData && (this.importData.pieName || this.importData.name);
        if (!importedName) return;

        const pieId = DataModel.getActivePieId();
        if (pieId && DataModel.pieMeta && DataModel.pieMeta.pieNames) {
            DataModel.pieMeta.pieNames[pieId] = importedName;
            DataModel.currentPieName = importedName;
            DataModel.saveMeta();
        }
    },

    quickReplace() {
        if (this.importData && this.importData.categories) {
            DataModel.setCategories(this.importData.categories);
            if (this.importData.categoryPercentageOverrides) {
                DataModel.categoryPercentageOverrides = this.importData.categoryPercentageOverrides;
            }
            this._updatePieNameFromImport();
            DataModel.saveToStorage();
            return true;
        }
        return false;
    }
};
