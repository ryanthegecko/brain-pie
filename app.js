const App = {
    init() {
        DataModel.loadFromStorage();
        ChartRenderer.init('chart-container');
        UI.clearInputs();
        UI.clearCategoryInputs();
        this.render();
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
    
    reorderCategories(fromIndex, toIndex, insertBefore) {
        DataModel.reorderCategories(fromIndex, toIndex, insertBefore);
        this.render();
    },
    
    addItem() {
        const categoryId = document.getElementById('item-category').value;
        const name = document.getElementById('item-name').value.trim();
        let percentage = parseFloat(document.getElementById('item-percentage').value);
        const color = document.getElementById('item-color').value;
        const subItemsText = document.getElementById('sub-items').value.trim();
        
        if (!categoryId) {
            alert('Please select a category');
            return;
        }
        
        if (!name) {
            alert('Please enter an item name');
            return;
        }
        
        // Default to 10% if no percentage is provided
        if (!percentage || percentage <= 0) {
            percentage = 10;
        }
        
        const subItems = subItemsText
            .split('\n')
            .map(item => item.trim())
            .filter(item => item.length > 0);
        
        DataModel.addItem(categoryId, name, percentage, color, subItems);
        UI.clearInputs();
        this.render();
        UI.closeMenu();
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

    removeItem(categoryId, itemId) {
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
        DataModel.removeSubItem(categoryId, itemId, subItemIndex);
        this.render();
    },
    
    exportData() {
        const data = { categories: DataModel.getCategories() };
        Storage.exportToFile(data);
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});