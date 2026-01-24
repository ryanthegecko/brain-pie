const Controls = {
  HIDE_LABELS_KEY: 'hideSubitemLabels',

  init() {
    const checkbox = document.getElementById('hide-labels');
    const container = document.getElementById('chart-container');

    // Restore state from localStorage
    const stored = localStorage.getItem(this.HIDE_LABELS_KEY);
    const hide = stored === 'true';
    checkbox.checked = hide;
    container.classList.toggle('hide-subitem-labels', hide);

    // Toggle class + save state
    checkbox.addEventListener('change', (e) => {
      const shouldHide = e.target.checked;
      container.classList.toggle('hide-subitem-labels', shouldHide);
      localStorage.setItem(this.HIDE_LABELS_KEY, String(shouldHide));
    });
  }
};

const App = {
    init() {
        DataModel.loadFromStorageOrExample();
        ChartRenderer.init('chart-container');
        UI.clearInputs();
        UI.clearCategoryInputs();
        this.render();
        Controls.init();

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

    reorderCategories(fromIndex, toIndex, insertBefore) {
        DataModel.reorderCategories(fromIndex, toIndex, insertBefore);
        this.render();
    },

addItem() {
        const categoryId = document.getElementById('item-category').value;
        const name = document.getElementById('item-name').value.trim();
        let percentage = parseFloat(document.getElementById('item-percentage').value);
        const color = document.getElementById('item-color').value;
        // const subItemsText = document.getElementById('sub-items').value.trim();
        // const actionsText = document.getElementById('actions').value.trim();
        
        if (!categoryId) {
            alert('Please select a category');
            return;
        }
        
        if (!name) {
            alert('Please enter an item name');
            return;
        }
        
        // Default to 20% if no percentage is provided
        if (!percentage || percentage <= 0) {
            percentage = 20;
        }

        // Get spokes with actions from the builder
        const subItems = UI.getSpokesData();
        
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

    reorderItems(categoryId, fromIndex, toIndex) {
        DataModel.reorderItemsInCategory(categoryId, fromIndex, toIndex);
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

    addSpokeChild(categoryId, itemId, spokeIndex) {
        const text = prompt('Add an action:');
        if (text && text.trim()) {
            DataModel.addSpokeChild(categoryId, itemId, spokeIndex, text.trim());
            this.render();
        }
    },
    
    removeSpokeChild(categoryId, itemId, spokeIndex, childIndex) {
        DataModel.removeSpokeChild(categoryId, itemId, spokeIndex, childIndex);
        this.render();
    },
    
    toggleSpokeChildren(categoryId, itemId, spokeIndex) {
        this.addSpokeChild(categoryId, itemId, spokeIndex);
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
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});