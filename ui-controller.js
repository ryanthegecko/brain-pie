const UI = {
    draggedElement: null,
    draggedData: null,
    
    showMenu() {
        document.getElementById('menu-overlay').classList.add('active');
    },
    
    closeMenu() {
        document.getElementById('menu-overlay').classList.remove('active');
    },
    
    closeMenuIfOutside(event) {
        if (event.target.id === 'menu-overlay') {
            this.closeMenu();
        }
    },
    
    // Helper to determine if a color is dark
    isColorDark(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128;
    },
    
    renderCategoriesList(categories) {
        const container = document.getElementById('categories-list');
        const select = document.getElementById('item-category');
        
        container.innerHTML = '';
        select.innerHTML = '<option value="">Select category...</option>';
        
        categories.forEach((category, categoryIndex) => {
            // Update select dropdown
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
            
            // Create category card
            const card = document.createElement('div');
            card.className = 'category-card';
            card.style.borderLeftColor = category.color;
            card.dataset.categoryId = category.id;
            card.dataset.categoryIndex = categoryIndex;
            card.draggable = true;
            card.style.cursor = 'move';
            
            // Category drag events
            card.addEventListener('dragstart', this.handleCategoryDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
            card.addEventListener('dragover', this.handleCategoryDragOver.bind(this));
            card.addEventListener('drop', this.handleCategoryDrop.bind(this));
            
            // Item drop zone
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.draggedData && this.draggedData.type === 'item') {
                    card.style.background = '#e8f5e9';
                }
            });
            
            card.addEventListener('dragleave', (e) => {
                if (this.draggedData && this.draggedData.type === 'item') {
                    card.style.background = '';
                }
            });
            
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.style.background = '';
                
                if (this.draggedData && this.draggedData.type === 'item') {
                    const fromCategoryId = this.draggedData.categoryId;
                    const itemId = this.draggedData.itemId;
                    const toCategoryId = category.id;
                    
                    if (fromCategoryId !== toCategoryId) {
                        App.moveItem(fromCategoryId, itemId, toCategoryId);
                    }
                }
            });
            
            // Get the actual percentage (from overrides or auto-calculated)
            const displayPercentage = DataModel.getCategoryPercentage(category.id).toFixed(1);
            
            const itemsHTML = category.items.length > 0
                ? `<div class="items-in-category">
                    ${category.items.map(item => `
                        <div class="item-card" 
                             style="border-left-color: ${item.color}" 
                             draggable="true"
                             data-category-id="${category.id}"
                             data-item-id="${item.id}"
                             ondragstart="UI.handleItemDragStart(event)"
                             ondragend="UI.handleDragEnd(event)"
                             ondragover="UI.handleItemDragOver(event)"
                            ondrop="UI.handleItemDrop(event)"
                             >
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; gap: 10px;">
                                <h3 contenteditable="true" 
                                    onblur="App.updateItemName('${category.id}', '${item.id}', this.textContent)"
                                    style="flex: 1; outline: none; padding: 2px; border-radius: 3px;"
                                    onfocus="this.style.background='#f0f0f0'"
                                    onblur="this.style.background='transparent'"
                                >${item.name}</h3>
                                <input type="color" 
                                       value="${item.color}" 
                                       title="Change color"
                                       style="width: 40px; height: 30px; border: 2px solid #ddd; border-radius: 4px; cursor: pointer;"
                                       onchange="App.updateItemColor('${category.id}', '${item.id}', this.value)">
                            </div>
                            <div class="percentage" style="display: flex; align-items: center; gap: 8px;">
                                <input type="number" 
                                       value="${item.percentage.toFixed(1)}" 
                                       min="0" 
                                       max="100" 
                                       step="0.1"
                                       style="width: 60px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;"
                                       onchange="App.updateItemPercentage('${category.id}', '${item.id}', parseFloat(this.value))">
                                <span>% of category</span>
                            </div>
                            ${item.subItems.length > 0 
                                ? `<ul style="position: relative;">${item.subItems.map((sub, idx) => {
                                    const subText = typeof sub === 'string' ? sub : sub.text;
                                    const children = typeof sub === 'object' ? sub.children || [] : [];
                                    
                                    return `
                                    <li draggable="true"
                                        data-category-id="${category.id}"
                                        data-item-id="${item.id}"
                                        data-subitem-index="${idx}"
                                        ondragstart="UI.handleSubItemDragStart(event)"
                                        ondragend="UI.handleDragEnd(event)"
                                        ondragover="UI.handleSubItemDragOver(event)"
                                        ondrop="UI.handleSubItemDrop(event)"
                                        style="cursor: move;">
                                        <span class="sub-item-text">${subText}</span>
                                        ${children.length > 0 ? ` <span style="color: #2196F3; font-weight: bold;">(${children.length})</span>` : ''}
                                        <button class="small" onclick="App.toggleSpokeChildren('${category.id}', '${item.id}', ${idx})">+</button>
                                        <button class="small" onclick="App.removeSubItem('${category.id}', '${item.id}', ${idx})">✕</button>
                                        ${children.length > 0 ? `
                                            <ul style="margin-left: 20px; font-size: 11px;">
                                                ${children.map((child, childIdx) => `
                                                    <li style="cursor: default; display: flex; justify-content: space-between; align-items: center;">
                                                        <span>${typeof child === 'string' ? child : child.text}</span>
                                                        <div style="display: flex; gap: 4px;">
                                                            <button class="small" 
                                                                    style="background: #4285F4; padding: 3px 8px;" 
                                                                    onclick="UI.openCalendarForAction('${encodeURIComponent(typeof child === 'string' ? child : child.text)}', '${encodeURIComponent(typeof sub === 'string' ? sub : sub.text)}', '${item.name}')">📅</button>
                                                            <button class="small" onclick="App.removeSpikeChild('${category.id}', '${item.id}', ${idx}, ${childIdx})">✕</button>
                                                        </div>
                                                    </li>
                                                `).join('')}
                                            </ul>
                                        ` : ''}         
                                    </li>
                                `}).join('')}</ul>`
                                : '<p style="color: #999; font-size: 12px; margin: 8px 0;">No Spokes</p>'}
                            <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center;">
                                <input type="text" 
                                       id="new-subitem-${item.id}" 
                                       placeholder="New Spoke" 
                                       style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;">
                                <button class="small secondary" onclick="App.addSubItem('${category.id}', '${item.id}')">+ Add</button>
                                <button onclick="App.removeItem('${category.id}', '${item.id}')">Remove Slice</button>
                            </div>
                        </div>
                    `).join('')}
                   </div>`
                : '<div class="empty-category">No items yet</div>';
            
            card.innerHTML = `
                <div class="category-header" style="cursor: move;">
                    <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px; color: #999;">⋮⋮</span>
                        <div style="flex: 1;">
                            <h2>${category.name}</h2>
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                                <input type="number" 
                                       value="${displayPercentage}" 
                                       min="0" 
                                       max="100" 
                                       step="0.1"
                                       style="width: 70px; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                                       onchange="App.updateCategoryPercentage('${category.id}', parseFloat(this.value))">
                                <span class="auto-percentage">% (${category.items.length} items)</span>
                            </div>
                        </div>
                        <input type="color" 
                               value="${category.color}" 
                               title="Change category color"
                               style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer;"
                               onchange="App.updateCategoryColor('${category.id}', this.value)">
                    </div>
                    <button onclick="App.removeCategory('${category.id}')">Remove Category</button>
                </div>
                ${itemsHTML}
            `;
            
            container.appendChild(card);
            
            // Add drag event listeners to item cards after they're added to DOM
            card.querySelectorAll('.item-card').forEach(itemCard => {
                itemCard.addEventListener('dragstart', this.handleItemDragStart.bind(this));
                itemCard.addEventListener('dragend', this.handleDragEnd.bind(this));
            });
        });
    },
    
    handleCategoryDragStart(event) {
        const card = event.currentTarget;
        this.draggedElement = card;
        this.draggedData = {
            type: 'category',
            categoryId: card.dataset.categoryId,
            categoryIndex: parseInt(card.dataset.categoryIndex)
        };
        card.style.opacity = '0.5';
    },
    
    handleCategoryDragOver(event) {
        if (this.draggedData && this.draggedData.type === 'category') {
            event.preventDefault();
            const card = event.currentTarget;
            const rect = card.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (event.clientY < midpoint) {
                card.style.borderTop = '3px solid #4CAF50';
                card.style.borderBottom = '';
            } else {
                card.style.borderBottom = '3px solid #4CAF50';
                card.style.borderTop = '';
            }
        }
    },
    
    handleCategoryDrop(event) {
        event.preventDefault();
        
        if (this.draggedData && this.draggedData.type === 'category') {
            const targetCard = event.currentTarget;
            const targetIndex = parseInt(targetCard.dataset.categoryIndex);
            const sourceIndex = this.draggedData.categoryIndex;
            
            if (sourceIndex !== targetIndex) {
                const rect = targetCard.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const insertBefore = event.clientY < midpoint;
                
                App.reorderCategories(sourceIndex, targetIndex, insertBefore);
            }
            
            targetCard.style.borderTop = '';
            targetCard.style.borderBottom = '';
        }
    },
    
    handleItemDragStart(event) {
        const itemCard = event.currentTarget;
        const categoryCard = itemCard.closest('.category-card');
        const itemIndex = Array.from(categoryCard.querySelectorAll('.item-card')).indexOf(itemCard);
        
        this.draggedElement = itemCard;
        this.draggedData = {
            type: 'item',
            categoryId: itemCard.dataset.categoryId,
            itemId: itemCard.dataset.itemId,
            itemIndex: itemIndex
        };
        itemCard.style.opacity = '0.5';
        event.stopPropagation();
    },

    handleItemDragOver(event) {
        if (this.draggedData && this.draggedData.type === 'item') {
            event.preventDefault();
            const card = event.currentTarget;
            const rect = card.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (event.clientY < midpoint) {
                card.style.borderTop = '3px solid #2196F3';
                card.style.borderBottom = '';
            } else {
                card.style.borderBottom = '3px solid #2196F3';
                card.style.borderTop = '';
            }
        }
    },
    
    handleItemDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (this.draggedData && this.draggedData.type === 'item') {
            const targetCard = event.currentTarget;
            const targetCategoryId = targetCard.dataset.categoryId;
            const sourceCategoryId = this.draggedData.categoryId;
            const sourceItemId = this.draggedData.itemId;
            
            const categoryCard = targetCard.closest('.category-card');
            const allItemCards = Array.from(categoryCard.querySelectorAll('.item-card'));
            const targetIndex = allItemCards.indexOf(targetCard);
            
            if (sourceCategoryId === targetCategoryId) {
                // Reordering within same category
                const sourceIndex = this.draggedData.itemIndex;
                if (sourceIndex !== targetIndex) {
                    const rect = targetCard.getBoundingClientRect();
                    const midpoint = rect.top + rect.height / 2;
                    const insertAfter = event.clientY >= midpoint;
                    const finalIndex = insertAfter ? targetIndex : targetIndex;
                    
                    App.reorderItems(sourceCategoryId, sourceIndex, finalIndex);
                }
            } else {
                // Moving between categories
                App.moveItem(sourceCategoryId, sourceItemId, targetCategoryId);
            }
            
            targetCard.style.borderTop = '';
            targetCard.style.borderBottom = '';
        }
    },
    
    handleSubItemDragStart(event) {
        const li = event.currentTarget;
        this.draggedElement = li;
        this.draggedData = {
            type: 'subitem',
            categoryId: li.dataset.categoryId,
            itemId: li.dataset.itemId,
            subItemIndex: parseInt(li.dataset.subitemIndex)
        };
        li.style.opacity = '0.5';
        event.stopPropagation();
    },
    
    handleSubItemDragOver(event) {
        event.preventDefault();
        const li = event.currentTarget;
        if (this.draggedData && this.draggedData.type === 'subitem') {
            li.style.borderTop = '2px solid #4CAF50';
        }
    },
    
    handleSubItemDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const targetLi = event.currentTarget;
        targetLi.style.borderTop = '';
        
        if (this.draggedData && this.draggedData.type === 'subitem') {
            const fromCategoryId = this.draggedData.categoryId;
            const fromItemId = this.draggedData.itemId;
            const fromIndex = this.draggedData.subItemIndex;
            
            const toCategoryId = targetLi.dataset.categoryId;
            const toItemId = targetLi.dataset.itemId;
            const toIndex = parseInt(targetLi.dataset.subitemIndex);
            
            App.moveSubItem(fromCategoryId, fromItemId, fromIndex, toCategoryId, toItemId, toIndex);
        }
    },
    
    handleDragEnd(event) {
        if (this.draggedElement) {
            this.draggedElement.style.opacity = '';
        }
        this.draggedElement = null;
        this.draggedData = null;
        
        // Clean up any visual indicators
        document.querySelectorAll('.category-card').forEach(card => {
            card.style.background = '';
            card.style.borderTop = '';
            card.style.borderBottom = '';
        });
        document.querySelectorAll('.item-card').forEach(card => {
            card.style.borderTop = '';
            card.style.borderBottom = '';
        });
        document.querySelectorAll('li').forEach(li => {
            li.style.borderTop = '';
        });
    },

    // Initialize spoke builder with one empty entry
    initSpokesBuilder() {
        const builder = document.getElementById('spokes-builder');
        builder.innerHTML = '';
        this.addSpokeEntry();
    },
    
    addSpokeEntry() {
        const builder = document.getElementById('spokes-builder');
        const entryId = `spoke-${Date.now()}`;
        
        const entry = document.createElement('div');
        entry.className = 'spoke-entry';
        entry.id = entryId;
        entry.innerHTML = `
            <input type="text" 
                   placeholder="Spoke name (press Enter for next)" 
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); UI.addSpokeEntry(); this.nextElementSibling?.focus();}"
                   data-spoke-input>
            <button class="add-actions-btn" onclick="UI.toggleActions('${entryId}')">+ Actions</button>
            <button class="remove-btn" onclick="UI.removeSpokeEntry('${entryId}')">×</button>
        `;
        
        builder.appendChild(entry);
        
        // Focus the new input
        const input = entry.querySelector('input');
        input.focus();
    },
    
    removeSpokeEntry(entryId) {
        const entry = document.getElementById(entryId);
        if (entry) entry.remove();
    },
    
    toggleActions(entryId) {
        const entry = document.getElementById(entryId);
        let actionsContainer = entry.querySelector('.actions-list');
        
        if (actionsContainer) {
            // Toggle visibility
            actionsContainer.style.display = actionsContainer.style.display === 'none' ? 'block' : 'none';
        } else {
            // Create actions container
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'actions-list';
            
            const actionsWrapper = document.createElement('div');
            actionsWrapper.innerHTML = `
                <div style="margin-bottom: 8px; font-size: 12px; color: #666; font-weight: 600;">Actions for this spoke:</div>
                <div class="actions-entries" data-actions-container></div>
                <button class="small secondary" onclick="UI.addActionEntry('${entryId}')" style="margin-top: 5px;">+ Add Action</button>
            `;
            actionsContainer.appendChild(actionsWrapper);
            
            entry.appendChild(actionsContainer);
            
            // Add first action entry
            this.addActionEntry(entryId);
        }
    },
    
    addActionEntry(spokeEntryId) {
        const entry = document.getElementById(spokeEntryId);
        const actionsContainer = entry.querySelector('[data-actions-container]');
        
        const actionId = `action-${Date.now()}`;
        const actionEntry = document.createElement('div');
        actionEntry.className = 'action-entry';
        actionEntry.id = actionId;
        actionEntry.innerHTML = `
            <input type="text" 
                   placeholder="Action name (press Enter for next)" 
                   onkeydown="if(event.key==='Enter'){event.preventDefault(); UI.addActionEntry('${spokeEntryId}');}"
                   data-action-input>
            <button class="remove-action-btn" onclick="UI.removeActionEntry('${actionId}')">×</button>
        `;
        
        actionsContainer.appendChild(actionEntry);
        
        // Focus the new action input
        actionEntry.querySelector('input').focus();
    },
    
    removeActionEntry(actionId) {
        const entry = document.getElementById(actionId);
        if (entry) entry.remove();
    },
    
    getSpokesData() {
        const builder = document.getElementById('spokes-builder');
        const spokeEntries = builder.querySelectorAll('.spoke-entry');
        const spokes = [];
        
        spokeEntries.forEach(entry => {
            const spokeInput = entry.querySelector('[data-spoke-input]');
            const spokeName = spokeInput.value.trim();
            
            if (!spokeName) return; // Skip empty spokes
            
            const actionsContainer = entry.querySelector('[data-actions-container]');
            const actions = [];
            
            if (actionsContainer) {
                const actionInputs = actionsContainer.querySelectorAll('[data-action-input]');
                actionInputs.forEach(actionInput => {
                    const actionName = actionInput.value.trim();
                    if (actionName) {
                        actions.push({
                            text: actionName,
                            children: []
                        });
                    }
                });
            }
            
            if (actions.length > 0) {
                spokes.push({
                    text: spokeName,
                    children: actions
                });
            } else {
                spokes.push(spokeName); // Just a string if no actions
            }
        });
        
        return spokes;
    },

    openCalendarForAction(actionText, spokeText, sliceName) {
        actionText = decodeURIComponent(actionText);
        spokeText = decodeURIComponent(spokeText);
        
        // Get default dates (tomorrow at 9am, 1 hour duration)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        
        const endTime = new Date(tomorrow);
        endTime.setHours(10, 0, 0, 0);
        
        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const dates = `${formatDate(tomorrow)}/${formatDate(endTime)}`;
        
        // Build calendar URL
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `${actionText} (${sliceName} - ${spokeText})`,
            details: `Action: ${actionText}\nSpoke: ${spokeText}\nSlice: ${sliceName} \nCreated from Brain Pie`,
            dates: dates
        });
        
        const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
        window.open(calendarUrl, '_blank');
    },
    
    clearInputs() {
        document.getElementById('item-name').value = '';
        document.getElementById('item-percentage').value = '';
        document.getElementById('item-category').value = '';
        document.getElementById('item-color').value = this.getRandomColor();
        this.initSpokesBuilder(); // Reset the builder
    },
    
    clearCategoryInputs() {
        document.getElementById('new-category-name').value = '';
        document.getElementById('new-category-color').value = this.getRandomColor();
    },
    
    getRandomColor() {
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FFEB3B', '#FF5722', '#795548', '#607D8B'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    showDisclaimer() {
        document.getElementById('disclaimer-overlay').classList.add('active');
    },
    
    closeDisclaimer() {
        document.getElementById('disclaimer-overlay').classList.remove('active');
    }
};