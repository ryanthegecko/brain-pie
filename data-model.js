const DataModel = {
    categories: [],
    
    // Manual category percentages (when user overrides)
    categoryPercentageOverrides: {},
    
    // loadFromStorage() {
    //     const data = Storage.load();
    //     if (data && data.categories) {
    //         this.categories = data.categories;
    //     }
    //     if (data && data.categoryPercentageOverrides) {
    //         this.categoryPercentageOverrides = data.categoryPercentageOverrides;
    //     }
    // },

    loadFromStorageOrExample() {
        const data = Storage.load();

        if (data && data.categories) {
        // Returning user: use stored data
        this.categories = data.categories;
        this.categoryPercentageOverrides = data.categoryPercentageOverrides || {};
        return;
        }

        // First time: load example data
        const example = ExampleData.get();   // your own example object
        this.categories = example.categories;
        this.categoryPercentageOverrides = example.categoryPercentageOverrides || {};

        // Persist it so next visit is treated as “returning”
        Storage.save({
        categories: this.categories,
        categoryPercentageOverrides: this.categoryPercentageOverrides
        });
    },
    
    saveToStorage() {
        Storage.save({ 
            categories: this.categories,
            categoryPercentageOverrides: this.categoryPercentageOverrides
        });
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
    
    reorderCategories(fromIndex, toIndex, insertBefore) {
        console.log(fromIndex, toIndex, insertBefore )
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
    
    removeItem(categoryId, itemId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;
        
        category.items = category.items.filter(item => item.id !== itemId);
        this.normalizeItemsInCategory(categoryId);
        this.saveToStorage();
    },
    
    addSubItem(categoryId, itemId, subItemText) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;
        
        const item = category.items.find(i => i.id === itemId);
        if (!item) return;
        
        item.subItems.push(subItemText);
        this.saveToStorage();
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
    }
};