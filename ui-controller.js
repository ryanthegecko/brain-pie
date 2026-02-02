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

    showSettings() {
        document.getElementById('settings-overlay').classList.add('active');
        this.loadCalendarProvider();
    },
    
    closeSettings() {
        document.getElementById('settings-overlay').classList.remove('active');
    },
    
    saveCalendarProvider(provider) {
        localStorage.setItem('calendarProvider', provider);
    },
    
    loadCalendarProvider() {
        const provider = localStorage.getItem('calendarProvider') || 'google';
        const radio = document.querySelector(`input[name="calendar-provider"][value="${provider}"]`);
        if (radio) {
            radio.checked = true;
        }
    },
    
    getCalendarProvider() {
        return localStorage.getItem('calendarProvider') || 'google';
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
                                       style="width: 50px; height: 50px; border: 2px solid #ddd; border-radius: 4px; cursor: pointer;"
                                       onchange="App.updateItemColor('${category.id}', '${item.id}', this.value)">
                                <button class="warn" style="margin-left: 5px;" onclick="App.removeItem('${category.id}', '${item.id}')">
                                    <img width="15" height="15" src="./assets/trash.svg" />
                                </button>
                            </div>
                            <div class="item-percentage" style="display: flex; align-items: center; gap: 8px;">
                                <input type="number" 
                                    name="categoryPercentage"
                                       value="${item.percentage.toFixed(1)}" 
                                       min="0" 
                                       max="100" 
                                       step="0.1"
                                       style="width: 80px; padding: 4px; border: 1px solid #ddd; border-radius: 4px;"
                                       onchange="App.updateItemPercentage('${category.id}', '${item.id}', parseFloat(this.value))">
                                <span>% of category</span>
                            </div>
                            ${item.subItems.length > 0 
                                ? `<ul
                                    class="spoke-list"
                                    style="position: relative;">${item.subItems.map((sub, idx) => {
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
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;width: 100%; min-width: 50%;">
                                            <span class="sub-item-text" style="flex: 1;padding-right:1em">${subText}</span>
                                            <div style="display: flex; gap: 4px;">
                                                ${children.length > 0 ? `<span style="color: #2196F3; font-weight: bold; font-size: 18px;">(${children.length})</span>` : ''}
                                                <button class="" onclick="UI.showAddActionInput('${category.id}', '${item.id}', ${idx})" title="Add action">+</button>
                                                <button style="justify-self: flex-end;" class="warn" onclick="App.removeSubItem('${category.id}', '${item.id}', ${idx})" title="Remove spoke">
                                                    <img width="15" height="15" src="./assets/trash.svg" />
                                                </button>
                                            </div>
                                        </div>
                                        ${children.length > 0 ? `
                                            <ul class="action-list" 
                                            style="margin-left: 20px; font-size: 11px; margin-top: 6px;">
                                                ${children.map((child, childIdx) => {
                                                    const childText = typeof child === 'string' ? child : child.text;
                                                    const hasSchedule = child.scheduled && child.scheduled.date && child.scheduled.time;
                                                    let scheduleDisplay = '📅';
                                                    let buttonStyle = 'background: #4285F4; padding: 3px 12px;';
                                                    let buttonTitle = 'Add to calendar';

                                                    if (hasSchedule) {
                                                        const schedDate = new Date(child.scheduled.date + 'T' + child.scheduled.time);
                                                        const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                        const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                        scheduleDisplay = dateStr + ' ' + timeStr;
                                                        buttonStyle = 'background: #4CAF50; padding: 3px 8px; font-size: 10px;';
                                                        buttonTitle = 'Reschedule';
                                                    }

                                                    return `
                                                    <li style="cursor: default; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; padding: 4px; background: #f5f5f5; border-radius: 3px;">
                                                        <span style="flex: 1;margin-right: 1em;">${childText}</span>
                                                        <div style="display: flex; gap: 4px;">
                                                            <button class="small"
                                                                    style="${buttonStyle}"
                                                                    onclick="UI.openCalendarForActionWithLocation('${encodeURIComponent(childText)}', '${encodeURIComponent(subText)}', '${item.name}', '${encodeURIComponent(category.name)}', '${category.id}', '${item.id}', ${idx}, ${childIdx})"
                                                                    title="${buttonTitle}">${scheduleDisplay}</button>
                                                            <button class="small warn" onclick="App.removeSpokeChild('${category.id}', '${item.id}', ${idx}, ${childIdx})" title="Remove action">
                                                                <img width="15" height="20" src="./assets/trash.svg" />
                                                            </button>
                                                        </div>
                                                    </li>
                                                `}).join('')}
                                            </ul>
                                        ` : ''}
                                        <div id="add-action-${category.id}-${item.id}-${idx}" style="display: none; margin-top: 6px; margin-left: 20px;">
                                            <div style="display: flex; gap: 6px; align-items: center;">
                                                <input type="text" 
                                                       id="action-input-${category.id}-${item.id}-${idx}"
                                                       placeholder="Action name..." 
                                                       style="flex: 1; padding: 6px; border: 1px solid #2196F3; border-radius: 4px;"
                                                       onkeydown="if(event.key==='Enter') UI.submitAddAction('${category.id}', '${item.id}', ${idx})">
                                                <button class="small secondary" onclick="UI.submitAddAction('${category.id}', '${item.id}', ${idx})">Add</button>
                                                <button class="small warn" onclick="UI.hideAddActionInput('${category.id}', '${item.id}', ${idx})">
                                                    <img width="15" height="20" src="./assets/trash.svg" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                `}).join('')}</ul>`
                                : '<p style="color: #999; font-size: 12px; margin: 8px 0;">No Spokes</p>'}
                            <div class="add-spoke-input-container" 
                                style="margin-top: 10px; display: flex; gap: 8px; align-items: center;">
                                <input type="text" 
                                       id="new-subitem-${item.id}" 
                                       placeholder="New Spoke" 
                                       style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <button class="small secondary" onclick="App.addSubItem('${category.id}', '${item.id}')">+</button>
                                
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
                            <h2 contenteditable="true"
                                onblur="App.updateCategoryName('${category.id}', this.textContent)"
                                style="outline: none; padding: 2px; border-radius: 3px; cursor: text;"
                                onfocus="this.style.background='#f0f0f0'"
                                onblur="this.style.background='transparent'; App.updateCategoryName('${category.id}', this.textContent)"
                            >${category.name}</h2>
                            <div 
                                class="category-percentage-input-container"
                                style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                                <input type="number" 
                                        name="categoryPercentage"
                                       value="${displayPercentage}" 
                                       min="0" 
                                       max="100" 
                                       step="0.1"
                                       style="width: 70px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;"
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
                    <button style="margin-left: 5px;" onclick="UI.showMenu()">Add Slice</button>
                    <button class="warn" style="margin-left: 5px;" onclick="App.removeCategory('${category.id}')">
                        <img width="15" height="15" src="./assets/trash.svg" />
                    </button>
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

    showAddActionInput(categoryId, itemId, spokeIndex) {
        this.hideAllAddActionInputs();
        const inputDiv = document.getElementById(`add-action-${categoryId}-${itemId}-${spokeIndex}`);
        const input = document.getElementById(`action-input-${categoryId}-${itemId}-${spokeIndex}`);
        
        if (inputDiv && input) {
            inputDiv.style.display = 'block';
            input.focus();
        }
    },

    hideAllAddActionInputs() {
        const inputDivs = document.querySelectorAll('[id^="add-action-"]');
        
        inputDivs.forEach(inputDiv => {
            // Derive the matching input id from the div id
            const inputId = inputDiv.id.replace('add-action', 'action-input');
            const input = document.getElementById(inputId);

            if (input) {
            inputDiv.style.display = 'none';
            input.value = '';
            }
        });
    },
    
    submitAddAction(categoryId, itemId, spokeIndex) {
        const input = document.getElementById(`action-input-${categoryId}-${itemId}-${spokeIndex}`);
        const text = input.value.trim();
        
        if (text) {
            App.addSpokeChild(categoryId, itemId, spokeIndex, text);
            // this.hideAddActionInput(categoryId, itemId, spokeIndex);
            this.hideAllAddActionInputs();
        }
    },

    // Store pending calendar event data
    pendingCalendarEvent: null,
    // Queue for scheduling multiple actions
    actionScheduleQueue: [],

    showDateTimePicker(actionText, spokeText, sliceName, categoryName, dataLocation = null) {
        // Store event details including data location for saving
        this.pendingCalendarEvent = {
            actionText,
            spokeText,
            sliceName,
            categoryName,
            dataLocation // { categoryId, itemId, spokeIndex, childIndex }
        };

        // Show action details
        document.getElementById('action-name').textContent = actionText;
        document.getElementById('action-context').textContent = `${categoryName} → ${sliceName} → ${spokeText}`;

        // Check if action already has a scheduled time
        let existingSchedule = null;
        if (dataLocation) {
            const category = DataModel.categories.find(c => c.id === dataLocation.categoryId);
            if (category) {
                const item = category.items.find(i => i.id === dataLocation.itemId);
                if (item && item.subItems[dataLocation.spokeIndex]) {
                    const spoke = item.subItems[dataLocation.spokeIndex];
                    if (typeof spoke === 'object' && spoke.children && spoke.children[dataLocation.childIndex]) {
                        existingSchedule = spoke.children[dataLocation.childIndex].scheduled;
                    }
                }
            }
        }

        // Set date/time from existing schedule or default to tomorrow at 9 AM
        if (existingSchedule) {
            document.getElementById('event-date').value = existingSchedule.date;
            document.getElementById('event-time').value = existingSchedule.time;
            document.getElementById('event-duration').value = existingSchedule.duration || '60';
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('event-date').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('event-time').value = '09:00';
            document.getElementById('event-duration').value = '60';
        }

        // Update button text and show reminder based on whether this is a reschedule
        const addButton = document.getElementById('calendar-submit-btn');
        const rescheduleReminder = document.getElementById('reschedule-reminder');

        if (addButton) {
            if (existingSchedule) {
                addButton.textContent = '📅 Reschedule';
            } else {
                addButton.textContent = '📅 Add to Calendar';
            }
        }

        if (rescheduleReminder) {
            rescheduleReminder.style.display = existingSchedule ? 'block' : 'none';
        }

        // Show modal
        document.getElementById('datetime-overlay').classList.add('active');
    },

    closeDateTimePicker() {
        document.getElementById('datetime-overlay').classList.remove('active');
        this.pendingCalendarEvent = null;

        // Return to spoke config if we came from there
        if (this.pendingReturnToSpokeConfig && this.pendingSpokeConfig) {
            this.pendingReturnToSpokeConfig = false;
            document.getElementById('spoke-config-overlay').classList.add('active');
            this.renderExistingActions();
        } else {
            App.render();
        }
    },

    skipScheduling() {
        // Skip this action and return to spoke config or close
        document.getElementById('datetime-overlay').classList.remove('active');
        this.pendingCalendarEvent = null;

        if (this.pendingReturnToSpokeConfig && this.pendingSpokeConfig) {
            this.pendingReturnToSpokeConfig = false;
            document.getElementById('spoke-config-overlay').classList.add('active');
            this.renderExistingActions();
        } else {
            App.render();
        }
    },

    createCalendarEvent() {
        if (!this.pendingCalendarEvent) return;

        const { actionText, spokeText, sliceName, categoryName, dataLocation } = this.pendingCalendarEvent;

        // Get user-selected date/time
        const dateStr = document.getElementById('event-date').value;
        const timeStr = document.getElementById('event-time').value;
        const duration = parseInt(document.getElementById('event-duration').value);

        if (!dateStr || !timeStr) {
            alert('Please select both date and time');
            return;
        }

        // Save scheduled time to the action data
        if (dataLocation) {
            const category = DataModel.categories.find(c => c.id === dataLocation.categoryId);
            if (category) {
                const item = category.items.find(i => i.id === dataLocation.itemId);
                if (item && item.subItems[dataLocation.spokeIndex]) {
                    const spoke = item.subItems[dataLocation.spokeIndex];
                    if (typeof spoke === 'object' && spoke.children && spoke.children[dataLocation.childIndex]) {
                        spoke.children[dataLocation.childIndex].scheduled = {
                            date: dateStr,
                            time: timeStr,
                            duration: duration
                        };
                        DataModel.saveToStorage();
                    }
                }
            }
        }

        // Combine date and time
        const startDate = new Date(`${dateStr}T${timeStr}`);
        const endDate = new Date(startDate.getTime() + duration * 60000);

        const provider = this.getCalendarProvider();

        if (provider === 'apple') {
            this.downloadAppleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate);
        } else {
            this.openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate);
        }

        // Close and return to spoke config if needed
        document.getElementById('datetime-overlay').classList.remove('active');
        this.pendingCalendarEvent = null;

        if (this.pendingReturnToSpokeConfig && this.pendingSpokeConfig) {
            this.pendingReturnToSpokeConfig = false;
            document.getElementById('spoke-config-overlay').classList.add('active');
            this.renderExistingActions();
        } else {
            App.render();
        }
    },
    
    openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate) {
        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `${actionText} (${spokeText}/${sliceName}/${categoryName})`,
            details: `Action: ${actionText}\nSpoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`,
            dates: dates
        });
        
        const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
        window.open(calendarUrl, '_blank');
    },
    
    downloadAppleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate) {
        // Format dates for iCalendar format (local time, not UTC)
        const formatICSDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}${month}${day}T${hours}${minutes}${seconds}`;
        };
        
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Brain Pie//Calendar//EN',
            'BEGIN:VEVENT',
            `DTSTART:${formatICSDate(startDate)}`,
            `DTEND:${formatICSDate(endDate)}`,
            `SUMMARY:${actionText} (${categoryName} - ${sliceName})`,
            `DESCRIPTION:Category: ${categoryName}\\nSlice: ${sliceName}\\nSpoke: ${spokeText}\\nAction: ${actionText}\\n\\nCreated from Brain Pie`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');
        
        // Create blob and download
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${actionText}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
    
    openCalendarForAction(actionText, spokeText, sliceName, categoryName) {
        actionText = decodeURIComponent(actionText);
        spokeText = decodeURIComponent(spokeText);
        sliceName = decodeURIComponent(sliceName);
        categoryName = decodeURIComponent(categoryName);

        this.showDateTimePicker(actionText, spokeText, sliceName, categoryName);
    },

    openCalendarForActionWithLocation(actionText, spokeText, sliceName, categoryName, categoryId, itemId, spokeIndex, childIndex) {
        actionText = decodeURIComponent(actionText);
        spokeText = decodeURIComponent(spokeText);
        sliceName = decodeURIComponent(sliceName);
        categoryName = decodeURIComponent(categoryName);

        const dataLocation = { categoryId, itemId, spokeIndex, childIndex };
        this.showDateTimePicker(actionText, spokeText, sliceName, categoryName, dataLocation);
    },

    // Spoke Configuration
    pendingSpokeConfig: null,

    showSpokeConfig(categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName) {
        this.pendingSpokeConfig = {
            categoryId,
            itemId,
            spokeIndex,
            spokeName,
            sliceName,
            categoryName
        };

        // Show spoke details
        document.getElementById('spoke-config-name').textContent = spokeName;
        document.getElementById('spoke-config-context').textContent = `${categoryName} → ${sliceName}`;

        // Get current spoke type and metadata
        const spokeType = DataModel.getSpokeType(categoryId, itemId, spokeIndex) || 'static';

        // Set radio button
        const radio = document.querySelector(`input[name="spoke-type"][value="${spokeType}"]`);
        if (radio) {
            radio.checked = true;
        }

        // Clear and populate existing actions
        this.renderExistingActions();

        // Clear new action input
        const newActionInput = document.getElementById('new-spoke-action-input');
        if (newActionInput) newActionInput.value = '';

        // Show appropriate fields
        this.updateSpokeTypeFields(spokeType);

        // Show modal
        document.getElementById('spoke-config-overlay').classList.add('active');
    },

    closeSpokeConfig() {
        document.getElementById('spoke-config-overlay').classList.remove('active');
        this.pendingSpokeConfig = null;
        this.pendingReturnToSpokeConfig = false;

        // Reset form
        document.querySelector('input[name="spoke-type"][value="static"]').checked = true;
        document.getElementById('spoke-existing-actions').innerHTML = '';
        document.getElementById('spoke-actions-fields').style.display = 'none';
        const newActionInput = document.getElementById('new-spoke-action-input');
        if (newActionInput) newActionInput.value = '';

        App.render();
    },

    updateSpokeTypeFields(type) {
        // Show/hide actions section based on type
        const actionsFields = document.getElementById('spoke-actions-fields');
        actionsFields.style.display = type === 'action' ? 'block' : 'none';

        // Render existing actions when switching to action type
        if (type === 'action') {
            this.renderExistingActions();
        }
    },

    renderExistingActions() {
        if (!this.pendingSpokeConfig) return;

        const { categoryId, itemId, spokeIndex } = this.pendingSpokeConfig;
        const container = document.getElementById('spoke-existing-actions');
        container.innerHTML = '';

        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children || spoke.children.length === 0) {
            container.innerHTML = '<div style="color: #999; font-size: 13px; padding: 8px 0;">No actions yet. Add one below.</div>';
            return;
        }

        spoke.children.forEach((child, idx) => {
            const childText = typeof child === 'string' ? child : child.text;
            const hasSchedule = child.scheduled && child.scheduled.date && child.scheduled.time;

            let scheduleInfo = '<span style="color: #999;">Not scheduled</span>';
            if (hasSchedule) {
                const schedDate = new Date(`${child.scheduled.date}T${child.scheduled.time}`);
                const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                scheduleInfo = `<span style="color: #4CAF50; font-weight: 600;">${dateStr} ${timeStr}</span>`;
            }

            const entry = document.createElement('div');
            entry.className = 'spoke-action-entry';
            entry.style.background = '#f5f5f5';
            entry.style.padding = '8px 12px';
            entry.style.borderRadius = '6px';
            entry.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${childText}</div>
                    <div style="font-size: 12px; margin-top: 2px;">${scheduleInfo}</div>
                </div>
                <button type="button" class="small" style="background: #4285F4;"
                        onclick="UI.rescheduleAction(${idx})" title="Schedule">
                    ${hasSchedule ? '✏️' : '📅'}
                </button>
                <button type="button" class="small warn" onclick="UI.removeAction(${idx})" title="Remove">×</button>
            `;
            container.appendChild(entry);
        });
    },

    addAndScheduleAction() {
        if (!this.pendingSpokeConfig) return;

        const input = document.getElementById('new-spoke-action-input');
        const actionText = input.value.trim();

        if (!actionText) {
            alert('Please enter an action name');
            return;
        }

        const { categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName } = this.pendingSpokeConfig;

        // Ensure spoke is action type and an object
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return;

        // Convert spoke to object if needed
        if (typeof item.subItems[spokeIndex] === 'string') {
            item.subItems[spokeIndex] = {
                text: item.subItems[spokeIndex],
                type: 'action',
                children: [],
                metadata: {}
            };
        }

        // Ensure children array exists
        if (!item.subItems[spokeIndex].children) {
            item.subItems[spokeIndex].children = [];
        }

        // Add the new action
        const childIndex = item.subItems[spokeIndex].children.length;
        item.subItems[spokeIndex].children.push({
            text: actionText,
            children: []
        });

        // Set spoke type to action
        item.subItems[spokeIndex].type = 'action';
        DataModel.saveToStorage();

        // Clear input
        input.value = '';

        // Update display
        this.renderExistingActions();

        // Close spoke config temporarily and open scheduler
        document.getElementById('spoke-config-overlay').classList.remove('active');

        // Open scheduler with return-to-config flag
        this.pendingReturnToSpokeConfig = true;
        const dataLocation = { categoryId, itemId, spokeIndex, childIndex };
        this.showDateTimePicker(actionText, spokeName, sliceName, categoryName, dataLocation);
    },

    rescheduleAction(childIndex) {
        if (!this.pendingSpokeConfig) return;

        const { categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName } = this.pendingSpokeConfig;

        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children || !spoke.children[childIndex]) return;

        const action = spoke.children[childIndex];
        const actionText = typeof action === 'string' ? action : action.text;

        // Close spoke config temporarily
        document.getElementById('spoke-config-overlay').classList.remove('active');

        // Open scheduler with return-to-config flag
        this.pendingReturnToSpokeConfig = true;
        const dataLocation = { categoryId, itemId, spokeIndex, childIndex };
        this.showDateTimePicker(actionText, spokeName, sliceName, categoryName, dataLocation);
    },

    removeAction(childIndex) {
        if (!this.pendingSpokeConfig) return;

        const { categoryId, itemId, spokeIndex } = this.pendingSpokeConfig;

        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children) return;

        spoke.children.splice(childIndex, 1);
        DataModel.saveToStorage();

        this.renderExistingActions();
    },

    pendingReturnToSpokeConfig: false,

    saveSpokeConfig() {
        if (!this.pendingSpokeConfig) return;

        const { categoryId, itemId, spokeIndex } = this.pendingSpokeConfig;
        const selectedType = document.querySelector('input[name="spoke-type"]:checked').value;

        // Update the spoke type (actions are saved individually via addAndScheduleAction)
        DataModel.updateSpokeType(categoryId, itemId, spokeIndex, selectedType, {});

        this.closeSpokeConfig();
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