const UI = {
    draggedElement: null,
    draggedData: null,

    // Menu tab state
    currentMenuTab: 1,
    selectedCategoryId: null,
    newlyAddedSliceIds: [],
    preselectedSliceId: null,

    showMenu() {
        // Reset state
        this.currentMenuTab = 1;
        this.selectedCategoryId = null;
        this.newlyAddedSliceIds = [];
        this.preselectedSliceId = null;
        this.expandedSpokeActions = {};

        // Clear Tab 2 state
        const tab2SpokesList = document.getElementById('tab2-spokes-list');
        if (tab2SpokesList) {
            tab2SpokesList.innerHTML = '<div class="tab2-spokes-empty">Select a slice to manage spokes</div>';
        }
        const spokesSection = document.getElementById('spokes-section');
        if (spokesSection) {
            spokesSection.style.opacity = '0.5';
            spokesSection.style.pointerEvents = 'none';
        }
        const tab2SliceSelect = document.getElementById('tab2-slice-select');
        if (tab2SliceSelect) {
            tab2SliceSelect.innerHTML = '<option value="">Select a slice...</option>';
        }

        // Reset tab display
        document.querySelectorAll('.menu-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === '1');
        });
        document.querySelectorAll('.menu-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === 'menu-tab-1');
        });

        // Reset category mode to "existing"
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;
        this.toggleCategoryMode('existing');

        // Reset slice section
        this.disableSliceSection();

        // Populate category dropdown
        this.populateCategoryDropdown();

        // Clear forms
        this.clearCategoryInputs();
        this.clearSliceInputs();

        document.getElementById('menu-overlay').classList.add('active');

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('menu-opened');
        }
    },

    closeMenu() {
        document.getElementById('menu-overlay').classList.remove('active');

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('menu-closed');
        }
        // Reset state
        this.currentMenuTab = 1;
        this.selectedCategoryId = null;
        this.newlyAddedSliceIds = [];
        App.render();
    },

    showMenuForCategory(categoryId) {
        // First show the menu normally
        this.showMenu();

        // Then pre-select the category
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;

        document.getElementById('item-category').value = categoryId;
        this.toggleCategoryMode('existing');
        this.onCategorySelected();
    },

    showMenuForSlice(categoryId, sliceId) {
        // First show the menu normally
        this.showMenu();

        // Pre-select the category
        this.selectedCategoryId = categoryId;
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;

        document.getElementById('item-category').value = categoryId;
        this.toggleCategoryMode('existing');
        this.onCategorySelected();

        // Set the slice to pre-select and switch to Tab 2
        this.preselectedSliceId = sliceId;
        this.switchMenuTab(2);
    },

    switchMenuTab(tabNumber) {
        this.currentMenuTab = tabNumber;

        // Update tab buttons
        document.querySelectorAll('.menu-tab').forEach(tab => {
            tab.classList.toggle('active', parseInt(tab.dataset.tab) === tabNumber);
        });

        // Update tab content
        document.querySelectorAll('.menu-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `menu-tab-${tabNumber}`);
        });

        // When switching to Tab 2, populate the slice dropdown
        if (tabNumber === 2) {
            // Reset expanded states
            this.expandedSpokeActions = {};
            this.populateTab2SliceDropdown();
        }
    },

    toggleCategoryMode(mode) {
        const newForm = document.getElementById('new-category-form');
        const existingForm = document.getElementById('existing-category-form');

        if (mode === 'new') {
            newForm.style.display = 'flex';
            existingForm.style.display = 'none';
            this.disableSliceSection();
            this.selectedCategoryId = null;
        } else {
            newForm.style.display = 'none';
            existingForm.style.display = 'flex';
            // Check if a category is already selected
            const categorySelect = document.getElementById('item-category');
            if (categorySelect.value) {
                this.onCategorySelected();
            } else {
                this.disableSliceSection();
            }
        }
    },

    populateCategoryDropdown() {
        const select = document.getElementById('item-category');
        select.innerHTML = '<option value="">Select category...</option>';

        DataModel.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    },

    onCategorySelected() {
        const select = document.getElementById('item-category');
        this.selectedCategoryId = select.value;

        if (this.selectedCategoryId) {
            this.enableSliceSection();
            this.renderSlicesForCategory(this.selectedCategoryId);
        } else {
            this.disableSliceSection();
        }
    },

    enableSliceSection() {
        const section = document.getElementById('slice-section');
        const hint = document.getElementById('slice-hint');
        const continueBtn = document.getElementById('continue-to-spokes-btn');

        section.style.opacity = '1';
        section.style.pointerEvents = 'auto';
        hint.textContent = '';

        // Enable continue button if there are slices
        const category = DataModel.categories.find(c => c.id === this.selectedCategoryId);
        continueBtn.disabled = !(category && category.items.length > 0);
    },

    disableSliceSection() {
        const section = document.getElementById('slice-section');
        const hint = document.getElementById('slice-hint');
        const slicesContainer = document.getElementById('slices-in-category');
        const continueBtn = document.getElementById('continue-to-spokes-btn');

        section.style.opacity = '0.5';
        section.style.pointerEvents = 'none';
        hint.textContent = 'Select or create a category first';
        slicesContainer.style.display = 'none';
        continueBtn.disabled = true;
    },

    addCategoryFromTab1() {
        const name = document.getElementById('new-category-name').value.trim();
        const color = document.getElementById('new-category-color').value;

        if (!name) {
            alert('Please enter a category name');
            return;
        }

        const categoryId = DataModel.addCategory(name, color);
        this.selectedCategoryId = categoryId;

        // Switch to existing category mode and select the new category
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;

        this.populateCategoryDropdown();
        document.getElementById('item-category').value = categoryId;
        this.toggleCategoryMode('existing');
        this.onCategorySelected();

        // Clear category inputs
        this.clearCategoryInputs();

        // Render to update the main UI
        App.render();
    },

    addSliceFromTab1() {
        if (!this.selectedCategoryId) {
            alert('Please select or create a category first');
            return;
        }

        const name = document.getElementById('item-name').value.trim();
        let percentage = parseFloat(document.getElementById('item-percentage').value);
        const color = document.getElementById('item-color').value;

        if (!name) {
            alert('Please enter a slice name');
            return;
        }

        // Default to 20% if no percentage is provided
        if (!percentage || percentage <= 0) {
            percentage = 20;
        }

        // Add slice without spokes (spokes will be added in Tab 2)
        const sliceId = DataModel.addItem(this.selectedCategoryId, name, percentage, color, []);

        // Track as newly added
        this.newlyAddedSliceIds.push(sliceId);

        // Refresh the slice list
        this.renderSlicesForCategory(this.selectedCategoryId);

        // Clear slice inputs
        this.clearSliceInputs();

        // Enable continue button
        document.getElementById('continue-to-spokes-btn').disabled = false;

        // Render to update the main UI
        App.render();

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('slice-added', { itemId: sliceId });
        }
    },

    clearSliceInputs() {
        document.getElementById('item-name').value = '';
        document.getElementById('item-percentage').value = '';
        document.getElementById('item-color').value = this.getRandomColor();
    },

    renderSlicesForCategory(categoryId) {
        const category = DataModel.categories.find(c => c.id === categoryId);
        const container = document.getElementById('slices-in-category');
        const list = document.getElementById('category-slices-list');

        if (!category || category.items.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        list.innerHTML = '';

        category.items.forEach(item => {
            const li = document.createElement('li');
            const isNew = this.newlyAddedSliceIds.includes(item.id);
            if (isNew) li.classList.add('newly-added');

            li.innerHTML = `
                <span class="slice-name">${item.name}</span>
                <span class="slice-percentage">${item.percentage.toFixed(1)}%</span>
                ${isNew ? '<span class="new-badge">New</span>' : ''}
                <span class="slice-edit-hint">Edit →</span>
            `;

            // Click to jump to Tab 2 with this slice selected
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => {
                this.selectSliceAndGoToTab2(categoryId, item.id);
            });

            list.appendChild(li);
        });
    },

    selectSliceAndGoToTab2(categoryId, itemId) {
        // Store the selection for Tab 2
        this.selectedCategoryId = categoryId;
        this.preselectedSliceId = itemId;

        // Switch to Tab 2
        this.switchMenuTab(2);
    },

    // Tab 2 methods
    populateTab2SliceDropdown() {
        const select = document.getElementById('tab2-slice-select');
        const categoryLabel = document.getElementById('tab2-category-name');
        const spokesSection = document.getElementById('spokes-section');
        const spokesList = document.getElementById('tab2-spokes-list');

        // Reset to default state first
        select.innerHTML = '<option value="">Select a slice...</option>';
        spokesSection.style.opacity = '0.5';
        spokesSection.style.pointerEvents = 'none';
        spokesList.innerHTML = '<div class="tab2-spokes-empty">Select a slice to manage spokes</div>';

        // If we have a selected category from Tab 1, use it
        if (this.selectedCategoryId) {
            const category = DataModel.categories.find(c => c.id === this.selectedCategoryId);
            if (category) {
                categoryLabel.textContent = `in ${category.name}`;

                let hasPreselection = false;
                category.items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = `${category.id}|${item.id}`;
                    option.textContent = item.name;

                    // Pre-select: first check for explicitly preselected slice (from clicking in list)
                    if (this.preselectedSliceId && item.id === this.preselectedSliceId) {
                        option.selected = true;
                        hasPreselection = true;
                    }
                    // Otherwise pre-select the most recently added slice
                    else if (!this.preselectedSliceId &&
                             this.newlyAddedSliceIds.length > 0 &&
                             item.id === this.newlyAddedSliceIds[this.newlyAddedSliceIds.length - 1]) {
                        option.selected = true;
                        hasPreselection = true;
                    }
                    select.appendChild(option);
                });

                // Clear preselection after using it
                this.preselectedSliceId = null;

                // If we have a preselection, trigger selection
                if (hasPreselection) {
                    this.onTab2SliceSelected();
                }
                return;
            }
        }

        // Otherwise, show all slices from all categories
        categoryLabel.textContent = '';
        DataModel.categories.forEach(category => {
            if (category.items.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = category.name;

                category.items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = `${category.id}|${item.id}`;
                    option.textContent = item.name;
                    optgroup.appendChild(option);
                });

                select.appendChild(optgroup);
            }
        });
    },

    onTab2SliceSelected() {
        const select = document.getElementById('tab2-slice-select');
        const spokesSection = document.getElementById('spokes-section');
        const spokesList = document.getElementById('tab2-spokes-list');

        if (!select.value) {
            spokesSection.style.opacity = '0.5';
            spokesSection.style.pointerEvents = 'none';
            spokesList.innerHTML = '<div class="tab2-spokes-empty">Select a slice to manage spokes</div>';
            return;
        }

        spokesSection.style.opacity = '1';
        spokesSection.style.pointerEvents = 'auto';

        // Reset expanded states when switching slices
        this.expandedSpokeActions = {};

        this.renderTab2Spokes();
    },

    getTab2SelectedSlice() {
        const select = document.getElementById('tab2-slice-select');
        if (!select.value) return null;

        const [categoryId, itemId] = select.value.split('|');
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return null;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return null;

        return { category, item, categoryId, itemId };
    },

    // Track which spokes have expanded action lists
    expandedSpokeActions: {},

    renderTab2Spokes() {
        const container = document.getElementById('tab2-spokes-list');
        const data = this.getTab2SelectedSlice();

        if (!data) {
            container.innerHTML = '<div class="tab2-spokes-empty">Select a slice to manage spokes</div>';
            return;
        }

        const { item, categoryId, itemId } = data;

        if (item.subItems.length === 0) {
            container.innerHTML = '<div class="tab2-spokes-empty">No spokes yet. Add one below.</div>';
            return;
        }

        container.innerHTML = '';

        item.subItems.forEach((spoke, idx) => {
            const spokeText = typeof spoke === 'string' ? spoke : spoke.text;
            const spokeType = DataModel.getSpokeType(categoryId, itemId, idx);
            const children = typeof spoke === 'object' ? spoke.children || [] : [];
            const hasChildScheduled = children.some(c => c.scheduled && c.scheduled.date);
            const isExpanded = this.expandedSpokeActions[idx];

            // Get spoke-level schedule for single/repeating types
            const spokeSchedule = typeof spoke === 'object' ? spoke.scheduled : null;
            const spokeRecurrence = typeof spoke === 'object' && spoke.metadata ? spoke.metadata.recurrence : null;

            const wrapper = document.createElement('div');
            wrapper.className = 'tab2-spoke-wrapper';

            const div = document.createElement('div');
            div.className = 'tab2-spoke-item';

            // Build the spoke type button based on current type and schedule state
            let spokeTypeButton = '';
            if (spokeType === 'single') {
                if (spokeSchedule && spokeSchedule.date) {
                    const schedDate = new Date(`${spokeSchedule.date}T${spokeSchedule.time || '00:00'}`);
                    const timeStr = spokeSchedule.time ? schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    spokeTypeButton = `<button style="background: #4CAF50;" onclick="UI.openSpokeScheduler('${categoryId}', '${itemId}', ${idx})" title="Reschedule">${dateStr}${timeStr ? ' ' + timeStr : ''}</button>`;
                } else {
                    spokeTypeButton = `<button style="background: #4CAF50;" onclick="UI.openSpokeScheduler('${categoryId}', '${itemId}', ${idx})" title="Schedule">📅 Schedule</button>`;
                }
            } else if (spokeType === 'repeating') {
                if (spokeRecurrence) {
                    const recurrenceText = this.formatRecurrenceDescriptionCompact(spokeRecurrence);
                    spokeTypeButton = `<button style="background: #4CAF50;" onclick="UI.openSpokeRecurrenceScheduler('${categoryId}', '${itemId}', ${idx})" title="Edit recurrence">${recurrenceText}</button>`;
                } else {
                    spokeTypeButton = `<button style="background: #4CAF50;" onclick="UI.openSpokeRecurrenceScheduler('${categoryId}', '${itemId}', ${idx})" title="Set recurrence">🔁 Set recurrence</button>`;
                }
            } else if (spokeType === 'list') {
                spokeTypeButton = `<button class="secondary" onclick="UI.openSpokeConfigFromTab2(${idx})" title="Manage actions">☑️ Actions</button>`;
            } else {
                // static - show type picker button
                spokeTypeButton = `<button class="secondary" onclick="UI.showSpokeTypePicker('${categoryId}', '${itemId}', ${idx})" title="Change spoke type">Spoke type</button>`;
            }

            div.innerHTML = `
                <span class="spoke-name">${spokeText}</span>
                ${children.length > 0 ? `<span class="spoke-actions-count clickable" onclick="UI.toggleSpokeActions(${idx})" title="Click to ${isExpanded ? 'collapse' : 'expand'}">${isExpanded ? '▼' : '▶'} (${children.length} action${children.length > 1 ? 's' : ''})</span>` : ''}
                ${hasChildScheduled ? '<span class="spoke-scheduled">Scheduled</span>' : ''}
                ${spokeTypeButton}
                <button class="warn" onclick="UI.removeSpokeFromTab2(${idx})" title="Remove spoke">×</button>
            `;
            wrapper.appendChild(div);

            // Render expanded action list if open
            if (isExpanded && children.length > 0) {
                const actionsList = document.createElement('div');
                actionsList.className = 'tab2-actions-expanded';
                actionsList.innerHTML = children.map((child, childIdx) => {
                    const childText = typeof child === 'string' ? child : child.text;
                    const hasSchedule = child.scheduled && child.scheduled.date && child.scheduled.time;
                    let scheduleDisplay = '';
                    if (hasSchedule) {
                        const schedDate = new Date(`${child.scheduled.date}T${child.scheduled.time}`);
                        const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                        scheduleDisplay = `<span class="action-schedule">${dateStr} ${timeStr}</span>`;
                    }
                    const isCompleted = child.completed || false;
                    return `
                        <div class="tab2-action-item">
                            <input type="checkbox" class="action-checkbox"
                                onchange="UI.toggleActionCompleted('${categoryId}', '${itemId}', ${idx}, ${childIdx})"
                                ${isCompleted ? 'checked' : ''}>
                            <span class="action-text ${isCompleted ? 'action-completed' : ''}">${childText}</span>
                            ${scheduleDisplay}
                            <button class="small warn" onclick="UI.removeActionFromTab2(${idx}, ${childIdx})" title="Remove action">×</button>
                        </div>
                    `;
                }).join('');
                wrapper.appendChild(actionsList);
            }

            container.appendChild(wrapper);
        });
    },

    toggleSpokeActions(spokeIndex) {
        this.expandedSpokeActions[spokeIndex] = !this.expandedSpokeActions[spokeIndex];
        this.renderTab2Spokes();
    },

    removeActionFromTab2(spokeIndex, actionIndex) {
        const data = this.getTab2SelectedSlice();
        if (!data) return;

        const { categoryId, itemId } = data;
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children) return;

        spoke.children.splice(actionIndex, 1);
        DataModel.saveToStorage();

        this.renderTab2Spokes();
        App.render();
    },

    addSpokeFromTab2() {
        const data = this.getTab2SelectedSlice();
        if (!data) {
            alert('Please select a slice first');
            return;
        }

        const input = document.getElementById('tab2-new-spoke');
        const spokeText = input.value.trim();

        if (!spokeText) {
            alert('Please enter a spoke name');
            return;
        }

        const { categoryId, itemId } = data;
        DataModel.addSubItem(categoryId, itemId, spokeText);

        input.value = '';
        this.renderTab2Spokes();
        App.render();

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('spoke-added');
        }
    },

    removeSpokeFromTab2(spokeIndex) {
        if (!confirm('Remove this spoke and all its actions?')) return;

        const data = this.getTab2SelectedSlice();
        if (!data) return;

        const { categoryId, itemId } = data;
        DataModel.removeSubItem(categoryId, itemId, spokeIndex);

        this.renderTab2Spokes();
        App.render();
    },

    openSpokeConfigFromTab2(spokeIndex) {
        const data = this.getTab2SelectedSlice();
        if (!data) return;

        const { category, item, categoryId, itemId } = data;
        const spoke = item.subItems[spokeIndex];
        const spokeName = typeof spoke === 'string' ? spoke : spoke.text;

        // Use existing spoke config popup
        this.showSpokeConfig(categoryId, itemId, spokeIndex, spokeName, item.name, category.name);
    },
    
    closeMenuIfOutside(event) {
        if (event.target.id === 'menu-overlay') {
            this.closeMenu();
        }
    },

    showSettings() {
        document.getElementById('settings-overlay').classList.add('active');
        this.loadCalendarProvider();
        this.loadCalendarSyncState();
        this.loadCloudSyncState();
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

    // ==========================================
    // Calendar Sync (Standalone Google Sign-In)
    // ==========================================

    /**
     * Load calendar sync state when Settings opened
     */
    loadCalendarSyncState() {
        const section = document.getElementById('calendar-sync-section');
        if (!section) return;

        // Hide if Firebase cloud sync is active (Firebase handles calendar auth)
        if (typeof StorageAdapter !== 'undefined' && StorageAdapter.isFirebaseMode()) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        this.updateCalendarSyncUI();
    },

    /**
     * Update calendar sync UI based on sign-in state
     */
    updateCalendarSyncUI() {
        const signedOutEl = document.getElementById('calendar-sync-signed-out');
        const signedInEl = document.getElementById('calendar-sync-signed-in');

        if (typeof GoogleAuthAdapter !== 'undefined' && GoogleAuthAdapter.isSignedIn()) {
            signedOutEl.style.display = 'none';
            signedInEl.style.display = 'block';

            const photoEl = document.getElementById('calendar-user-photo');
            const nameEl = document.getElementById('calendar-user-name');

            if (GoogleAuthAdapter.userInfo) {
                if (photoEl) photoEl.src = GoogleAuthAdapter.userInfo.picture || '';
                if (nameEl) nameEl.textContent = GoogleAuthAdapter.userInfo.name || GoogleAuthAdapter.userInfo.email;
            }
        } else {
            signedOutEl.style.display = 'block';
            signedInEl.style.display = 'none';
        }
    },

    /**
     * Sign in with Google for Calendar access only
     */
    async signInForCalendar() {
        try {
            if (typeof GoogleAuthAdapter === 'undefined') {
                alert('Google Auth not available');
                return;
            }

            await GoogleAuthAdapter.init();
            await GoogleAuthAdapter.signIn();

            this.updateCalendarSyncUI();
            Storage.showStatus('Calendar sync enabled', 'success');

            // Sync calendar events
            if (typeof App !== 'undefined' && App.syncCalendarEvents) {
                App.syncCalendarEvents();
            }
        } catch (e) {
            console.error('Calendar sign-in error:', e);
            alert('Sign in failed: ' + e.message);
        }
    },

    /**
     * Sign out of Calendar-only Google auth
     */
    signOutCalendar() {
        if (typeof GoogleAuthAdapter !== 'undefined') {
            GoogleAuthAdapter.signOut();
        }
        this.updateCalendarSyncUI();
        Storage.showStatus('Calendar sync disabled', 'success');
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

        container.innerHTML = '';

        categories.forEach((category, categoryIndex) => {
            
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
            
            card.addEventListener('dragleave', () => {
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
                            ${item.subItems && item.subItems.length > 0
                                ? `<ul
                                    class="spoke-list"
                                    style="position: relative;">${item.subItems.map((sub, idx) => {
                                    const subText = typeof sub === 'string' ? sub : sub.text;
                                    const spokeType = DataModel.getSpokeType(category.id, item.id, idx);
                                    const children = typeof sub === 'object' ? sub.children || [] : [];
                                    const spokeSchedule = typeof sub === 'object' ? sub.scheduled : null;
                                    const spokeRecurrence = typeof sub === 'object' && sub.metadata ? sub.metadata.recurrence : null;

                                    // Build spoke type button based on type
                                    let spokeTypeBtn = '';
                                    if (spokeType === 'single') {
                                        if (spokeSchedule && spokeSchedule.date) {
                                            const schedDate = new Date(spokeSchedule.date + 'T' + (spokeSchedule.time || '00:00'));
                                            const timeStr = spokeSchedule.time ? schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                            const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                            spokeTypeBtn = `<button class="small" style="background: #4CAF50; padding: 3px 8px;" onclick="UI.openSpokeScheduler('${category.id}', '${item.id}', ${idx})" title="Reschedule">${dateStr}${timeStr ? ' ' + timeStr : ''}</button>`;
                                        } else {
                                            spokeTypeBtn = `<button class="small" style="background: #4CAF50; padding: 3px 8px;" onclick="UI.openSpokeScheduler('${category.id}', '${item.id}', ${idx})" title="Schedule">📅</button>`;
                                        }
                                    } else if (spokeType === 'repeating') {
                                        if (spokeRecurrence) {
                                            spokeTypeBtn = `<button class="small" style="background: #4CAF50; padding: 3px 8px;" onclick="UI.openSpokeRecurrenceScheduler('${category.id}', '${item.id}', ${idx})" title="Edit recurrence">${UI.formatRecurrenceDescriptionCompact(spokeRecurrence)}</button>`;
                                        } else {
                                            spokeTypeBtn = `<button class="small" style="background: #4CAF50; padding: 3px 8px;" onclick="UI.openSpokeRecurrenceScheduler('${category.id}', '${item.id}', ${idx})" title="Set recurrence">🔁</button>`;
                                        }
                                    } else if (spokeType === 'list') {
                                        spokeTypeBtn = `<button class="" onclick="UI.showAddActionInput('${category.id}', '${item.id}', ${idx})" title="Add action">+</button>`;
                                    } else {
                                        // static - show type picker
                                        spokeTypeBtn = `<button class="secondary" onclick="UI.showSpokeTypePicker('${category.id}', '${item.id}', ${idx})" title="Set spoke type">+</button>`;
                                    }

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
                                            <span class="sub-item-text" contenteditable="true"
                                                style="flex: 1;padding-right:1em;outline:none;border-radius:3px;"
                                                onfocus="this.style.background='#f0f0f0'"
                                                onblur="this.style.background='transparent'; if(!UI.draggedData) App.renameSpoke('${category.id}', '${item.id}', ${idx}, this.textContent)"
                                                onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
                                            >${subText}</span>
                                            <div style="display: flex; gap: 4px;">
                                                ${children.length > 0 ? `<span style="color: #2196F3; font-weight: bold; font-size: 18px;">(${children.length})</span>` : ''}
                                                ${spokeTypeBtn}
                                                <button class="priority-star-btn ${UI.isPrioritised({type:'spoke', categoryId:category.id, itemId:item.id, spokeIndex:idx}) ? 'active' : ''}"
                                                    onclick="event.stopPropagation(); UI.addToPriorities({type:'spoke', categoryId:'${category.id}', itemId:'${item.id}', spokeIndex:${idx}})"
                                                    title="Add to priorities">&#9733;</button>
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
                                                    const hasRecurrence = child.recurrence;
                                                    let scheduleDisplay = '📅';
                                                    let buttonStyle = 'background: #4285F4; padding: 3px 12px;';
                                                    let buttonTitle = 'Add to calendar';

                                                    if (hasRecurrence) {
                                                        // Repeating action - show recurrence on green button
                                                        scheduleDisplay = UI.formatRecurrenceDescriptionCompact(child.recurrence);
                                                        buttonStyle = 'background: #4CAF50; padding: 3px 8px;';
                                                        buttonTitle = 'Repeating event';
                                                    } else if (hasSchedule) {
                                                        const schedDate = new Date(child.scheduled.date + 'T' + child.scheduled.time);
                                                        const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                        const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                        scheduleDisplay = dateStr + ' ' + timeStr;
                                                        buttonStyle = 'background: #4CAF50; padding: 3px 8px;';
                                                        buttonTitle = 'Reschedule';
                                                    }

                                                    const isActionCompleted = child.completed || false;
                                                    return `
                                                    <li style="cursor: default; display: flex; flex-direction: column; margin-bottom: 4px; padding: 4px; background: #f5f5f5; border-radius: 3px;">
                                                        <div style="display: flex; justify-content: space-between; align-items: center;width: 100%;">
                                                            <input type="checkbox" class="action-checkbox"
                                                                onchange="UI.toggleActionCompleted('${category.id}', '${item.id}', ${idx}, ${childIdx})"
                                                                ${isActionCompleted ? 'checked' : ''}>
                                                            <span style="flex: 1;margin-right: 1em;" class="${isActionCompleted ? 'action-completed' : ''}">${childText}</span>
                                                            <div style="display: flex; gap: 4px;">
                                                                <button class="small"
                                                                        style="${buttonStyle}"
                                                                        onclick="UI.openCalendarForActionWithLocation('${encodeURIComponent(childText)}', '${encodeURIComponent(subText)}', '${item.name}', '${encodeURIComponent(category.name)}', '${category.id}', '${item.id}', ${idx}, ${childIdx})"
                                                                        title="${buttonTitle}">${scheduleDisplay}</button>
                                                                <button class="priority-star-btn ${UI.isPrioritised({type:'action', categoryId:category.id, itemId:item.id, spokeIndex:idx, childIndex:childIdx}) ? 'active' : ''}"
                                                                    onclick="event.stopPropagation(); UI.addToPriorities({type:'action', categoryId:'${category.id}', itemId:'${item.id}', spokeIndex:${idx}, childIndex:${childIdx}})"
                                                                    title="Add to priorities">&#9733;</button>
                                                                <button class="small warn" onclick="App.removeSpokeChild('${category.id}', '${item.id}', ${idx}, ${childIdx})" title="Remove action">
                                                                    <img width="15" height="20" src="./assets/trash.svg" />
                                                                </button>
                                                            </div>
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
                                <button class="small" style="background: #4CAF50;" onclick="App.addSubItem('${category.id}', '${item.id}')">+</button>
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
                    <button style="margin-left: 5px;" onclick="UI.showMenuForCategory('${category.id}')">New Slice</button>
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
    
    handleDragEnd() {
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

    hideAddActionInput(categoryId, itemId, spokeIndex) {
        const inputDiv = document.getElementById(`add-action-${categoryId}-${itemId}-${spokeIndex}`);
        const input = document.getElementById(`action-input-${categoryId}-${itemId}-${spokeIndex}`);

        if (inputDiv) {
            inputDiv.style.display = 'none';
        }
        if (input) {
            input.value = '';
        }
    },
    
    submitAddAction(categoryId, itemId, spokeIndex) {
        const input = document.getElementById(`action-input-${categoryId}-${itemId}-${spokeIndex}`);
        const text = input.value.trim();

        if (text) {
            // Store pending action details and show type picker
            this.pendingActionAdd = {
                categoryId,
                itemId,
                spokeIndex,
                actionName: text
            };
            this.showActionTypePicker(text);
            this.hideAllAddActionInputs();
        }
    },

    // Action Type Picker
    pendingActionAdd: null,

    showActionTypePicker(actionName) {
        document.getElementById('action-type-action-name').textContent = actionName;
        document.getElementById('action-type-overlay').classList.add('active');
    },

    closeActionTypePicker() {
        document.getElementById('action-type-overlay').classList.remove('active');
        this.pendingActionAdd = null;
    },

    selectActionType(type) {
        if (!this.pendingActionAdd) return;

        const { categoryId, itemId, spokeIndex, actionName } = this.pendingActionAdd;

        // Get spoke and slice info for calendar
        const category = DataModel.categories.find(c => c.id === categoryId);
        const item = category ? category.items.find(i => i.id === itemId) : null;
        const spoke = item ? item.subItems[spokeIndex] : null;
        const spokeText = spoke ? (typeof spoke === 'string' ? spoke : spoke.text) : '';

        if (type === 'static') {
            // Just add the action, no calendar
            App.addSpokeChild(categoryId, itemId, spokeIndex, actionName);
            this.closeActionTypePicker();
        } else if (type === 'onetime') {
            // Add action then show date/time picker
            App.addSpokeChild(categoryId, itemId, spokeIndex, actionName);
            this.closeActionTypePicker();

            // Get the index of the newly added action
            const updatedSpoke = DataModel.categories
                .find(c => c.id === categoryId)?.items
                .find(i => i.id === itemId)?.subItems[spokeIndex];
            const childIndex = updatedSpoke?.children ? updatedSpoke.children.length - 1 : 0;

            // Show date picker
            const dataLocation = { categoryId, itemId, spokeIndex, childIndex };
            this.showDateTimePicker(actionName, spokeText, item?.name || '', category?.name || '', dataLocation);

            // Notify tutorial
            if (typeof TutorialManager !== 'undefined') {
                TutorialManager.notifyEvent('action-scheduled');
            }
        } else if (type === 'repeating') {
            // Show recurrence picker, then add with recurrence
            this.closeActionTypePicker();
            this.showRecurrencePicker(async (recurrence) => {
                // Add action with recurrence metadata
                App.addSpokeChild(categoryId, itemId, spokeIndex, actionName);

                // Get the newly added action and set its recurrence
                const updatedCategory = DataModel.categories.find(c => c.id === categoryId);
                const updatedItem = updatedCategory?.items.find(i => i.id === itemId);
                const updatedSpoke = updatedItem?.subItems[spokeIndex];

                if (updatedSpoke && typeof updatedSpoke === 'object' && updatedSpoke.children) {
                    const childIndex = updatedSpoke.children.length - 1;
                    const action = updatedSpoke.children[childIndex];

                    if (action) {
                        // Store recurrence in action
                        action.recurrence = recurrence;

                        // Create calendar event if available
                        if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                            const rrule = CalendarAdapter.buildRRule(recurrence);
                            const eventData = {
                                title: `${actionName} (${spokeText}/${item?.name}/${category?.name})`,
                                date: recurrence.startDate,
                                description: `Repeating action: ${actionName}\nSpoke: ${spokeText}\nSlice: ${item?.name}\nCategory: ${category?.name}\nCreated from Brain Pie`,
                                rrule: rrule
                            };

                            if (recurrence.allDay) {
                                eventData.allDay = true;
                            } else {
                                eventData.time = recurrence.time || '09:00';
                                eventData.duration = recurrence.duration || 60;
                            }

                            const event = await CalendarAdapter.createEvent(eventData);
                            if (event && event.id) {
                                action.calendarEventId = event.id;
                                Storage.showStatus('Recurring event added to calendar', 'success');
                            }
                        }

                        DataModel.saveToStorage();
                        App.render();
                    }
                }
            });
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
            const [hour, minute] = existingSchedule.time.split(':');
            document.getElementById('event-hour').value = hour;
            // Round minute to nearest 5-minute increment
            const roundedMinute = Math.round(parseInt(minute) / 5) * 5;
            document.getElementById('event-minute').value = String(roundedMinute).padStart(2, '0');
            document.getElementById('event-duration').value = existingSchedule.duration || '60';
            document.getElementById('event-location').value = existingSchedule.location || '';
            document.getElementById('event-notes').value = existingSchedule.notes || '';
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('event-date').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('event-hour').value = '09';
            document.getElementById('event-minute').value = '00';
            document.getElementById('event-duration').value = '60';
            document.getElementById('event-location').value = '';
            document.getElementById('event-notes').value = '';
        }

        // Update title, button text, and show reminder based on whether this is a reschedule
        const titleEl = document.getElementById('datetime-picker-title');
        const addButton = document.getElementById('calendar-submit-btn');
        const rescheduleReminder = document.getElementById('reschedule-reminder');

        if (titleEl) {
            titleEl.textContent = existingSchedule ? 'Reschedule Action' : 'Schedule Action';
        }

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
        this.pendingSpokeSchedule = null;

        // Return to spoke config if we came from there
        if (this.pendingReturnToSpokeConfig && this.pendingSpokeConfig) {
            this.pendingReturnToSpokeConfig = false;
            document.getElementById('spoke-config-overlay').classList.add('active');
            this.renderExistingActions();
        } else {
            this.renderTab2Spokes();
            App.render();
        }

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('datetime-picker-closed');
        }
    },

    skipScheduling() {
        // Skip this action and return to spoke config or close
        document.getElementById('datetime-overlay').classList.remove('active');
        this.pendingCalendarEvent = null;
        this.pendingSpokeSchedule = null;

        if (this.pendingReturnToSpokeConfig && this.pendingSpokeConfig) {
            this.pendingReturnToSpokeConfig = false;
            document.getElementById('spoke-config-overlay').classList.add('active');
            this.renderExistingActions();
        } else {
            this.renderTab2Spokes();
            App.render();
        }

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('datetime-picker-closed');
        }
    },

    async createCalendarEvent() {
        // Handle both action-level scheduling (pendingCalendarEvent) and spoke-level scheduling (pendingSpokeSchedule)
        const isSpokeLevel = !this.pendingCalendarEvent && this.pendingSpokeSchedule;

        if (!this.pendingCalendarEvent && !this.pendingSpokeSchedule) return;

        let actionText, spokeText, sliceName, categoryName, dataLocation;

        if (isSpokeLevel) {
            // Spoke-level scheduling (for Single type)
            const { spokeName, sliceName: sName, categoryName: cName, categoryId, itemId, spokeIndex } = this.pendingSpokeSchedule;
            actionText = spokeName; // For spoke-level, spoke is the "action"
            spokeText = spokeName;
            sliceName = sName;
            categoryName = cName;
            dataLocation = { categoryId, itemId, spokeIndex, isSpokeLevel: true };
        } else {
            // Action-level scheduling (existing behavior)
            ({ actionText, spokeText, sliceName, categoryName, dataLocation } = this.pendingCalendarEvent);
        }

        // Get user-selected date/time and optional fields
        const dateStr = document.getElementById('event-date').value;
        const hourStr = document.getElementById('event-hour').value;
        const minuteStr = document.getElementById('event-minute').value;
        const timeStr = `${hourStr}:${minuteStr}`;
        const duration = parseInt(document.getElementById('event-duration').value);
        const location = document.getElementById('event-location').value.trim();
        const notes = document.getElementById('event-notes').value.trim();

        if (!dateStr || !hourStr || !minuteStr) {
            alert('Please select date and time');
            return;
        }

        // Check for existing scheduled data (for reschedule case)
        let existingEventId = null;
        if (dataLocation) {
            const category = DataModel.categories.find(c => c.id === dataLocation.categoryId);
            if (category) {
                const item = category.items.find(i => i.id === dataLocation.itemId);
                if (item && item.subItems[dataLocation.spokeIndex]) {
                    const spoke = item.subItems[dataLocation.spokeIndex];
                    if (dataLocation.isSpokeLevel) {
                        // Spoke-level scheduling
                        if (typeof spoke === 'object' && spoke.scheduled && spoke.scheduled.calendarEventId) {
                            existingEventId = spoke.scheduled.calendarEventId;
                        }
                    } else if (typeof spoke === 'object' && spoke.children && spoke.children[dataLocation.childIndex]) {
                        // Action-level scheduling
                        const existingScheduled = spoke.children[dataLocation.childIndex].scheduled;
                        if (existingScheduled && existingScheduled.calendarEventId) {
                            existingEventId = existingScheduled.calendarEventId;
                        }
                    }
                }
            }
        }

        // Prepare scheduled data (will add calendarEventId if API succeeds)
        const scheduledData = {
            date: dateStr,
            time: timeStr,
            duration: duration,
            location: location || null,
            notes: notes || null
        };

        const provider = this.getCalendarProvider();

        // Build description with user notes first, then context
        // For spoke-level: "Spoke Name (Category/Slice)"
        // For action-level: "Action Name (Spoke/Slice/Category)"
        let description = '';
        if (notes) {
            description += notes + '\n\n---\n\n';
        }

        let eventTitle;
        if (isSpokeLevel) {
            description += `Spoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`;
            eventTitle = `${spokeText} (${categoryName}/${sliceName})`;
        } else {
            description += `Action: ${actionText}\nSpoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`;
            eventTitle = `${actionText} (${spokeText}/${sliceName}/${categoryName})`;
        }

        // For Google, try API first, fall back to URL redirect
        if (provider === 'google' && typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
            const eventData = {
                title: eventTitle,
                date: dateStr,
                time: timeStr,
                duration: duration,
                location: location || null,
                description: description
            };

            let event;
            if (existingEventId) {
                // Update existing event
                event = await CalendarAdapter.updateEvent(existingEventId, eventData);
                if (event && event.id) {
                    scheduledData.calendarEventId = event.id;
                    Storage.showStatus('Calendar event updated', 'success');
                } else {
                    // Update failed, try creating new
                    Debug.log('Calendar update failed, creating new event');
                    event = await CalendarAdapter.createEvent(eventData);
                    if (event && event.id) {
                        scheduledData.calendarEventId = event.id;
                        Storage.showStatus('Added to Google Calendar', 'success');
                    }
                }
            } else {
                // Create new event
                event = await CalendarAdapter.createEvent(eventData);
                if (event && event.id) {
                    scheduledData.calendarEventId = event.id;
                    Storage.showStatus('Added to Google Calendar', 'success');
                }
            }

            if (!event || !event.id) {
                // API failed, fall back to URL redirect
                Debug.log('Calendar API failed, falling back to URL redirect');
                const startDate = new Date(`${dateStr}T${timeStr}`);
                const endDate = new Date(startDate.getTime() + duration * 60000);
                this.openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, location, notes);
            }
        } else if (provider === 'apple') {
            const startDate = new Date(`${dateStr}T${timeStr}`);
            const endDate = new Date(startDate.getTime() + duration * 60000);
            this.downloadAppleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, null, location, notes);
        } else {
            // Google without API access - use URL redirect
            const startDate = new Date(`${dateStr}T${timeStr}`);
            const endDate = new Date(startDate.getTime() + duration * 60000);
            this.openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, location, notes);
        }

        // Save scheduled time to the data
        if (dataLocation) {
            const category = DataModel.categories.find(c => c.id === dataLocation.categoryId);
            if (category) {
                const item = category.items.find(i => i.id === dataLocation.itemId);
                if (item && item.subItems[dataLocation.spokeIndex]) {
                    const spoke = item.subItems[dataLocation.spokeIndex];
                    if (dataLocation.isSpokeLevel) {
                        // Spoke-level scheduling (for Single type)
                        if (typeof spoke === 'object') {
                            spoke.scheduled = scheduledData;
                            DataModel.saveToStorage();
                        } else {
                            // Convert string spoke to object
                            item.subItems[dataLocation.spokeIndex] = {
                                text: spoke,
                                type: 'single',
                                children: [],
                                scheduled: scheduledData,
                                metadata: {}
                            };
                            DataModel.saveToStorage();
                        }
                    } else if (typeof spoke === 'object' && spoke.children && spoke.children[dataLocation.childIndex]) {
                        // Action-level scheduling
                        spoke.children[dataLocation.childIndex].scheduled = scheduledData;
                        DataModel.saveToStorage();
                    }
                }
            }
        }

        // Close and return to spoke config if needed
        document.getElementById('datetime-overlay').classList.remove('active');
        this.pendingCalendarEvent = null;
        this.pendingSpokeSchedule = null;

        if (this.pendingReturnToSpokeConfig && this.pendingSpokeConfig) {
            this.pendingReturnToSpokeConfig = false;
            document.getElementById('spoke-config-overlay').classList.add('active');
            this.renderExistingActions();
        } else {
            this.renderTab2Spokes();
            App.render();
        }

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('datetime-picker-closed');
        }
    },

    openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, location = null, notes = null) {
        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const dates = `${formatDate(startDate)}/${formatDate(endDate)}`;

        // Build description with notes first, then context
        let details = '';
        if (notes) {
            details += notes + '\n\n---\n\n';
        }
        details += `Action: ${actionText}\nSpoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`;

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `${actionText} (${spokeText}/${sliceName}/${categoryName})`,
            details: details,
            dates: dates
        });

        // Add location if provided
        if (location) {
            params.set('location', location);
        }

        const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
        window.open(calendarUrl, '_blank');
    },
    
    downloadAppleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, rrule = null, location = null, notes = null) {
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

        // Escape special characters for ICS format
        const escapeICS = (str) => str ? str.replace(/[\\;,\n]/g, (m) => m === '\n' ? '\\n' : '\\' + m) : '';

        // Build description with notes first, then context
        let description = '';
        if (notes) {
            description += escapeICS(notes) + '\\n\\n---\\n\\n';
        }
        description += `Category: ${escapeICS(categoryName)}\\nSlice: ${escapeICS(sliceName)}\\nSpoke: ${escapeICS(spokeText)}\\nAction: ${escapeICS(actionText)}\\n\\nCreated from Brain Pie`;

        // Build event lines
        const eventLines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Brain Pie//Calendar//EN',
            'BEGIN:VEVENT',
            `DTSTART:${formatICSDate(startDate)}`,
            `DTEND:${formatICSDate(endDate)}`,
            `SUMMARY:${escapeICS(actionText)} (${escapeICS(categoryName)} - ${escapeICS(sliceName)})`,
            `DESCRIPTION:${description}`
        ];

        // Add location if provided
        if (location) {
            eventLines.push(`LOCATION:${escapeICS(location)}`);
        }

        // Add RRULE for recurring events
        if (rrule) {
            eventLines.push(`RRULE:${rrule}`);
        }

        eventLines.push('END:VEVENT', 'END:VCALENDAR');

        const icsContent = eventLines.join('\r\n');

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

    // Recurrence Picker
    pendingRecurrence: null,

    showRecurrencePicker(callback) {
        this.pendingRecurrence = { callback };

        // Set default start date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('recurrence-start-date').value = tomorrow.toISOString().split('T')[0];

        // Reset to defaults
        document.getElementById('recurrence-interval').value = 1;
        document.getElementById('recurrence-frequency').value = 'WEEKLY';

        // Reset time to all-day (default)
        document.getElementById('recurrence-all-day').checked = true;
        document.getElementById('recurrence-time-picker').style.display = 'none';
        document.getElementById('recurrence-hour').value = '09';
        document.getElementById('recurrence-minute').value = '00';
        document.getElementById('recurrence-duration').value = '60';

        // Reset day checkboxes
        document.querySelectorAll('input[name="recurrence-day"]').forEach(cb => cb.checked = false);

        // Reset monthly day
        document.getElementById('recurrence-monthday').value = '1';

        // Reset end options
        document.querySelector('input[name="recurrence-end"][value="never"]').checked = true;
        document.getElementById('recurrence-end-date').value = '';
        document.getElementById('recurrence-count').value = '10';

        // Update UI
        this.updateRecurrenceOptions();
        this.updateRecurrenceEndOptions();

        document.getElementById('recurrence-overlay').classList.add('active');
    },

    closeRecurrencePicker() {
        document.getElementById('recurrence-overlay').classList.remove('active');
        this.pendingRecurrence = null;
    },

    updateRecurrenceOptions() {
        const freq = document.getElementById('recurrence-frequency').value;
        const weeklyOptions = document.getElementById('recurrence-weekly-options');
        const monthlyOptions = document.getElementById('recurrence-monthly-options');

        // Show/hide frequency-specific options
        weeklyOptions.style.display = freq === 'WEEKLY' ? 'block' : 'none';
        monthlyOptions.style.display = freq === 'MONTHLY' ? 'block' : 'none';
    },

    toggleRecurrenceTime() {
        const allDay = document.getElementById('recurrence-all-day').checked;
        const timePicker = document.getElementById('recurrence-time-picker');
        timePicker.style.display = allDay ? 'none' : 'block';
    },

    updateRecurrenceEndOptions() {
        const endType = document.querySelector('input[name="recurrence-end"]:checked').value;
        const dateInput = document.getElementById('recurrence-end-date');
        const countInput = document.getElementById('recurrence-count-input');

        dateInput.style.display = endType === 'date' ? 'block' : 'none';
        countInput.style.display = endType === 'count' ? 'block' : 'none';

        // Set default end date if selecting date option
        if (endType === 'date' && !dateInput.value) {
            const futureDate = new Date();
            futureDate.setMonth(futureDate.getMonth() + 3);
            dateInput.value = futureDate.toISOString().split('T')[0];
        }
    },

    saveRecurrence() {
        const startDate = document.getElementById('recurrence-start-date').value;
        const frequency = document.getElementById('recurrence-frequency').value;
        const interval = parseInt(document.getElementById('recurrence-interval').value) || 1;
        const allDay = document.getElementById('recurrence-all-day').checked;

        if (!startDate) {
            alert('Please select a start date');
            return;
        }

        const recurrence = {
            startDate,
            frequency,
            interval,
            allDay: allDay
        };

        // Only include time and duration if not all-day
        if (!allDay) {
            const hour = document.getElementById('recurrence-hour').value;
            const minute = document.getElementById('recurrence-minute').value;
            const duration = parseInt(document.getElementById('recurrence-duration').value) || 60;
            recurrence.time = `${hour}:${minute}`;
            recurrence.duration = duration;
        }

        // Weekly: collect selected days
        if (frequency === 'WEEKLY') {
            const selectedDays = [];
            document.querySelectorAll('input[name="recurrence-day"]:checked').forEach(cb => {
                selectedDays.push(cb.value);
            });
            if (selectedDays.length > 0) {
                recurrence.byDay = selectedDays;
            }
        }

        // Monthly: get day of month
        if (frequency === 'MONTHLY') {
            recurrence.byMonthDay = parseInt(document.getElementById('recurrence-monthday').value);
        }

        // End options
        const endType = document.querySelector('input[name="recurrence-end"]:checked').value;
        if (endType === 'date') {
            recurrence.until = document.getElementById('recurrence-end-date').value;
        } else if (endType === 'count') {
            recurrence.count = parseInt(document.getElementById('recurrence-count').value) || 10;
        }

        // Call the callback with recurrence data
        if (this.pendingRecurrence && this.pendingRecurrence.callback) {
            this.pendingRecurrence.callback(recurrence);
        }

        this.closeRecurrencePicker();
    },

    formatRecurrenceDescription(recurrence) {
        if (!recurrence) return '';

        const freq = recurrence.frequency;
        const interval = recurrence.interval || 1;

        let desc = 'Every ';
        if (interval > 1) desc += interval + ' ';

        switch (freq) {
            case 'DAILY':
                desc += interval === 1 ? 'day' : 'days';
                break;
            case 'WEEKLY':
                desc += interval === 1 ? 'week' : 'weeks';
                if (recurrence.byDay && recurrence.byDay.length > 0) {
                    const dayNames = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
                    const days = recurrence.byDay.map(d => dayNames[d] || d).join(', ');
                    desc += ` on ${days}`;
                }
                break;
            case 'MONTHLY':
                desc += interval === 1 ? 'month' : 'months';
                if (recurrence.byMonthDay) {
                    desc += ` on the ${recurrence.byMonthDay}${this.getOrdinalSuffix(recurrence.byMonthDay)}`;
                }
                break;
            case 'YEARLY':
                desc += interval === 1 ? 'year' : 'years';
                break;
        }

        // Add time and duration
        if (recurrence.time) {
            desc += ` at ${recurrence.time}`;
            if (recurrence.duration && recurrence.duration !== 60) {
                const hrs = Math.floor(recurrence.duration / 60);
                const mins = recurrence.duration % 60;
                if (hrs && mins) {
                    desc += ` (${hrs}h ${mins}m)`;
                } else if (hrs) {
                    desc += ` (${hrs}h)`;
                } else {
                    desc += ` (${mins}m)`;
                }
            }
        }

        if (recurrence.until) {
            desc += ` until ${recurrence.until}`;
        } else if (recurrence.count) {
            desc += `, ${recurrence.count} times`;
        }

        return desc;
    },

    /**
     * Format recurrence for compact button display
     * e.g., "Every Wed 10:00" instead of "Every week on Wed at 10:00"
     */
    formatRecurrenceDescriptionCompact(recurrence) {
        if (!recurrence) return '🔁';

        const freq = recurrence.frequency;
        const interval = recurrence.interval || 1;
        const dayNames = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };

        let desc = 'Every ';

        // For weekly with specific days, show the day directly
        if (freq === 'WEEKLY' && recurrence.byDay && recurrence.byDay.length > 0) {
            if (interval > 1) desc += interval + ' ';
            const days = recurrence.byDay.map(d => dayNames[d] || d).join(', ');
            desc += days;
        } else {
            // For other frequencies, use shorter labels
            if (interval > 1) desc += interval + ' ';
            switch (freq) {
                case 'DAILY':
                    desc += interval === 1 ? 'day' : 'days';
                    break;
                case 'WEEKLY':
                    desc += interval === 1 ? 'week' : 'weeks';
                    break;
                case 'MONTHLY':
                    if (recurrence.byMonthDay) {
                        desc += recurrence.byMonthDay + this.getOrdinalSuffix(recurrence.byMonthDay);
                    } else {
                        desc += interval === 1 ? 'month' : 'months';
                    }
                    break;
                case 'YEARLY':
                    desc += interval === 1 ? 'year' : 'years';
                    break;
            }
        }

        // Add time (compact format, no "at")
        if (recurrence.time) {
            desc += ' ' + recurrence.time;
        }

        return desc;
    },

    getOrdinalSuffix(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
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

        // Check if this is a repeating action
        const category = DataModel.categories.find(c => c.id === categoryId);
        const item = category?.items.find(i => i.id === itemId);
        const spoke = item?.subItems[spokeIndex];
        const action = (typeof spoke === 'object' && spoke.children) ? spoke.children[childIndex] : null;

        if (action && action.recurrence) {
            // Repeating action - show recurrence picker for rescheduling
            this.showRecurrencePickerForReschedule(action, actionText, spokeText, sliceName, categoryName, categoryId, itemId, spokeIndex, childIndex);
        } else {
            // One-time action - show date/time picker
            const dataLocation = { categoryId, itemId, spokeIndex, childIndex };
            this.showDateTimePicker(actionText, spokeText, sliceName, categoryName, dataLocation);
        }
    },

    /**
     * Show recurrence picker pre-filled with existing values for rescheduling
     */
    async showRecurrencePickerForReschedule(action, actionText, spokeText, sliceName, categoryName, categoryId, itemId, spokeIndex, childIndex) {
        const recurrence = action.recurrence;

        // Pre-fill the form with current values
        document.getElementById('recurrence-interval').value = recurrence.interval || 1;
        document.getElementById('recurrence-frequency').value = recurrence.frequency || 'WEEKLY';

        // Time settings
        if (recurrence.allDay) {
            document.getElementById('recurrence-all-day').checked = true;
            document.getElementById('recurrence-time-picker').style.display = 'none';
        } else {
            document.getElementById('recurrence-all-day').checked = false;
            document.getElementById('recurrence-time-picker').style.display = 'flex';
            if (recurrence.time) {
                const [hour, minute] = recurrence.time.split(':');
                document.getElementById('recurrence-hour').value = hour;
                document.getElementById('recurrence-minute').value = minute;
            }
        }
        document.getElementById('recurrence-duration').value = recurrence.duration || 60;

        // Start date
        document.getElementById('recurrence-start-date').value = recurrence.startDate || new Date().toISOString().split('T')[0];

        // Day checkboxes for weekly
        document.querySelectorAll('input[name="recurrence-day"]').forEach(cb => {
            cb.checked = recurrence.byDay && recurrence.byDay.includes(cb.value);
        });

        // Monthly day
        document.getElementById('recurrence-monthday').value = recurrence.byMonthDay || 1;

        // End options
        if (recurrence.until) {
            document.querySelector('input[name="recurrence-end"][value="date"]').checked = true;
            document.getElementById('recurrence-end-date').value = recurrence.until;
        } else if (recurrence.count) {
            document.querySelector('input[name="recurrence-end"][value="count"]').checked = true;
            document.getElementById('recurrence-count').value = recurrence.count;
        } else {
            document.querySelector('input[name="recurrence-end"][value="never"]').checked = true;
        }

        // Update UI visibility
        this.updateRecurrenceOptions();
        this.updateRecurrenceEndOptions();

        // Set up callback for when user saves
        this.pendingRecurrence = {
            callback: async (newRecurrence) => {
                // Delete old calendar event if it exists
                if (action.calendarEventId && typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                    Debug.log('Deleting old recurring event:', action.calendarEventId);
                    await CalendarAdapter.deleteEvent(action.calendarEventId);
                }

                // Update action's recurrence
                action.recurrence = newRecurrence;

                // Create new calendar event
                if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                    const rrule = CalendarAdapter.buildRRule(newRecurrence);
                    const eventData = {
                        title: `${actionText} (${spokeText}/${sliceName}/${categoryName})`,
                        date: newRecurrence.startDate,
                        description: `Repeating action: ${actionText}\nSpoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`,
                        rrule: rrule
                    };

                    if (newRecurrence.allDay) {
                        eventData.allDay = true;
                    } else {
                        eventData.time = newRecurrence.time || '09:00';
                        eventData.duration = newRecurrence.duration || 60;
                    }

                    const event = await CalendarAdapter.createEvent(eventData);
                    if (event && event.id) {
                        action.calendarEventId = event.id;
                        Storage.showStatus('Recurring event rescheduled', 'success');
                    }
                }

                // Save changes and update UI
                DataModel.saveToStorage();
                App.render();
            }
        };

        document.getElementById('recurrence-overlay').classList.add('active');
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
        this.pendingRecurrenceData = null;

        // Reset form
        const staticRadio = document.querySelector('input[name="spoke-type"][value="static"]');
        if (staticRadio) staticRadio.checked = true;
        document.getElementById('spoke-existing-actions').innerHTML = '';
        document.getElementById('spoke-actions-fields').style.display = 'none';
        document.getElementById('spoke-repeating-fields').style.display = 'none';
        document.getElementById('recurrence-description').textContent = 'Not set';
        const newActionInput = document.getElementById('new-spoke-action-input');
        if (newActionInput) newActionInput.value = '';

        // Refresh Tab 2 spokes list if menu is open
        if (document.getElementById('menu-overlay').classList.contains('active')) {
            this.renderTab2Spokes();
        }

        App.render();
    },

    updateSpokeTypeFields(type) {
        // Show/hide sections based on type
        const actionsFields = document.getElementById('spoke-actions-fields');
        const repeatingFields = document.getElementById('spoke-repeating-fields');

        // List type shows actions fields
        actionsFields.style.display = type === 'list' ? 'block' : 'none';
        repeatingFields.style.display = type === 'repeating' ? 'block' : 'none';

        // Render existing actions when switching to list type
        if (type === 'list') {
            this.renderExistingActions();
        }

        // Load existing recurrence when switching to repeating type
        if (type === 'repeating' && this.pendingSpokeConfig) {
            this.loadExistingRecurrence();
        }
    },

    pendingRecurrenceData: null,

    loadExistingRecurrence() {
        if (!this.pendingSpokeConfig) return;

        const { categoryId, itemId, spokeIndex } = this.pendingSpokeConfig;
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke === 'object' && spoke.metadata && spoke.metadata.recurrence) {
            this.pendingRecurrenceData = spoke.metadata.recurrence;
            document.getElementById('recurrence-description').textContent =
                this.formatRecurrenceDescription(spoke.metadata.recurrence);
        } else {
            this.pendingRecurrenceData = null;
            document.getElementById('recurrence-description').textContent = 'Not set';
        }
    },

    openRecurrencePickerForSpoke() {
        this.showRecurrencePicker((recurrence) => {
            this.pendingRecurrenceData = recurrence;
            document.getElementById('recurrence-description').textContent =
                this.formatRecurrenceDescription(recurrence);
        });
    },

    renderExistingActions() {
        if (!this.pendingSpokeConfig) return;

        const container = document.getElementById('spoke-existing-actions');
        container.innerHTML = '';

        const { categoryId, itemId, spokeIndex } = this.pendingSpokeConfig;

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

            const isCompleted = child.completed || false;
            const entry = document.createElement('div');
            entry.className = 'spoke-action-entry';
            entry.style.background = '#f5f5f5';
            entry.style.padding = '8px 12px';
            entry.style.borderRadius = '6px';
            entry.innerHTML = `
                <input type="checkbox" class="action-checkbox"
                    onchange="UI.toggleActionCompleted('${categoryId}', '${itemId}', ${spokeIndex}, ${idx})"
                    ${isCompleted ? 'checked' : ''}>
                <div style="flex: 1;">
                    <div style="font-weight: 500;" class="${isCompleted ? 'action-completed' : ''}">${childText}</div>
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

    _addActionToSpoke() {
        if (!this.pendingSpokeConfig) return null;

        const input = document.getElementById('new-spoke-action-input');
        const actionText = input.value.trim();

        if (!actionText) {
            alert('Please enter an action name');
            return null;
        }

        const { categoryId, itemId, spokeIndex } = this.pendingSpokeConfig;

        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return null;

        const item = category.items.find(i => i.id === itemId);
        if (!item) return null;

        // Convert spoke to object if needed
        if (typeof item.subItems[spokeIndex] === 'string') {
            item.subItems[spokeIndex] = {
                text: item.subItems[spokeIndex],
                type: 'list',
                children: [],
                scheduled: null,
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
            children: [],
            completed: false
        });

        // Set spoke type to list (has children)
        item.subItems[spokeIndex].type = 'list';
        DataModel.saveToStorage();

        // Clear input
        input.value = '';

        // Update display
        this.renderExistingActions();

        return { actionText, childIndex };
    },

    addAction() {
        const result = this._addActionToSpoke();
        if (!result) return;
        App.render();
    },

    addAndScheduleAction() {
        const result = this._addActionToSpoke();
        if (!result) return;

        const { categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName } = this.pendingSpokeConfig;

        // Close spoke config temporarily and open scheduler
        document.getElementById('spoke-config-overlay').classList.remove('active');

        // Open scheduler with return-to-config flag
        this.pendingReturnToSpokeConfig = true;
        const dataLocation = { categoryId, itemId, spokeIndex, childIndex: result.childIndex };
        this.showDateTimePicker(result.actionText, spokeName, sliceName, categoryName, dataLocation);
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

    async removeAction(childIndex) {
        if (!this.pendingSpokeConfig) return;

        const { categoryId, itemId, spokeIndex } = this.pendingSpokeConfig;

        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children) return;

        // Check if action has a calendar event to delete
        const action = spoke.children[childIndex];
        if (action && action.scheduled && action.scheduled.calendarEventId) {
            if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                const deleted = await CalendarAdapter.deleteEvent(action.scheduled.calendarEventId);
                if (deleted) {
                    Storage.showStatus('Calendar event deleted', 'success');
                }
            }
        }

        spoke.children.splice(childIndex, 1);
        DataModel.saveToStorage();

        this.renderExistingActions();
    },

    pendingReturnToSpokeConfig: false,

    async saveSpokeConfig() {
        if (!this.pendingSpokeConfig) return;

        const selectedType = document.querySelector('input[name="spoke-type"]:checked').value;
        const { categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName } = this.pendingSpokeConfig;

        // Build metadata based on type
        const metadata = {};

        if (selectedType === 'repeating' && this.pendingRecurrenceData) {
            metadata.recurrence = this.pendingRecurrenceData;

            // Create recurring calendar event if calendar access is available
            if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                // Build RRULE string from recurrence data
                const rrule = CalendarAdapter.buildRRule(this.pendingRecurrenceData);

                const eventData = {
                    title: `${spokeName} (${sliceName}/${categoryName})`,
                    date: this.pendingRecurrenceData.startDate,
                    description: `Repeating spoke: ${spokeName}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`,
                    rrule: rrule
                };

                // Set time or all-day
                if (this.pendingRecurrenceData.allDay) {
                    eventData.allDay = true;
                } else {
                    eventData.time = this.pendingRecurrenceData.time || '09:00';
                    eventData.duration = this.pendingRecurrenceData.duration || 60;
                }

                const event = await CalendarAdapter.createEvent(eventData);
                if (event && event.id) {
                    metadata.calendarEventId = event.id;
                    Storage.showStatus('Recurring event added to calendar', 'success');
                }
            }
        }

        // Update the spoke type and metadata
        DataModel.updateSpokeType(categoryId, itemId, spokeIndex, selectedType, metadata);

        // Clear pending recurrence data
        this.pendingRecurrenceData = null;

        this.closeSpokeConfig();
    },

    // ==========================================
    // Spoke Type Picker (new flow for spoke type selection)
    // ==========================================

    pendingSpokeTypePicker: null,

    /**
     * Show the spoke type picker overlay
     */
    showSpokeTypePicker(categoryId, itemId, spokeIndex) {
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        const spokeName = typeof spoke === 'string' ? spoke : spoke.text;

        this.pendingSpokeTypePicker = {
            categoryId,
            itemId,
            spokeIndex,
            spokeName,
            sliceName: item.name,
            categoryName: category.name
        };

        // Show spoke name in picker
        document.getElementById('spoke-type-picker-name').textContent = spokeName;

        document.getElementById('spoke-type-picker-overlay').classList.add('active');

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('spoke-type-picker-opened');
        }
    },

    /**
     * Close the spoke type picker
     */
    closeSpokeTypePicker() {
        document.getElementById('spoke-type-picker-overlay').classList.remove('active');
        this.pendingSpokeTypePicker = null;
    },

    /**
     * Handle spoke type selection from the picker
     */
    selectSpokeType(type) {
        if (!this.pendingSpokeTypePicker) return;

        const { categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName } = this.pendingSpokeTypePicker;

        // Close the picker first
        this.closeSpokeTypePicker();

        // Update the spoke type
        DataModel.updateSpokeType(categoryId, itemId, spokeIndex, type);

        // Based on type, open appropriate follow-up UI
        if (type === 'single') {
            // Notify tutorial before opening scheduler
            if (typeof TutorialManager !== 'undefined') {
                TutorialManager.notifyEvent('single-type-selected');
            }
            // Open date/time picker for single spoke
            this.openSpokeScheduler(categoryId, itemId, spokeIndex);
        } else if (type === 'repeating') {
            // Open recurrence picker for repeating spoke
            this.openSpokeRecurrenceScheduler(categoryId, itemId, spokeIndex);
        } else if (type === 'list') {
            // Open spoke config to manage actions
            this.showSpokeConfig(categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName);
        }
        // For 'static', just close and update

        // Re-render
        this.renderTab2Spokes();
        App.render();
    },

    /**
     * Open the date/time scheduler for a Single spoke
     */
    openSpokeScheduler(categoryId, itemId, spokeIndex) {
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        const spokeName = typeof spoke === 'string' ? spoke : spoke.text;

        // Store pending data for when calendar event is created
        this.pendingSpokeSchedule = {
            categoryId,
            itemId,
            spokeIndex,
            spokeName,
            sliceName: item.name,
            categoryName: category.name
        };

        // Get existing schedule if any
        const existingSchedule = typeof spoke === 'object' ? spoke.scheduled : null;

        // Show action details (reusing datetime picker for spoke scheduling)
        document.getElementById('action-name').textContent = spokeName;
        document.getElementById('action-context').textContent = `${category.name} → ${item.name}`;

        // Set date/time from existing schedule or default to tomorrow at 9 AM
        if (existingSchedule && existingSchedule.date) {
            document.getElementById('event-date').value = existingSchedule.date;
            const [hour, minute] = (existingSchedule.time || '09:00').split(':');
            document.getElementById('event-hour').value = hour;
            document.getElementById('event-minute').value = String(Math.round(parseInt(minute) / 15) * 15).padStart(2, '0');
            document.getElementById('event-duration').value = existingSchedule.duration || '60';
            document.getElementById('event-location').value = existingSchedule.location || '';
            document.getElementById('event-notes').value = existingSchedule.notes || '';
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('event-date').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('event-hour').value = '09';
            document.getElementById('event-minute').value = '00';
            document.getElementById('event-duration').value = '60';
            document.getElementById('event-location').value = '';
            document.getElementById('event-notes').value = '';
        }

        // Update title, button text, and reminder
        const isReschedule = existingSchedule && existingSchedule.date;
        const titleEl = document.getElementById('datetime-picker-title');
        const addButton = document.getElementById('calendar-submit-btn');
        const rescheduleReminder = document.getElementById('reschedule-reminder');

        if (titleEl) {
            titleEl.textContent = isReschedule ? 'Reschedule Action' : 'Schedule Action';
        }
        if (addButton) {
            addButton.textContent = isReschedule ? '📅 Reschedule' : '📅 Add to Calendar';
        }
        if (rescheduleReminder) {
            rescheduleReminder.style.display = isReschedule ? 'block' : 'none';
        }

        // Clear action-level pending data and set spoke-level
        this.pendingCalendarEvent = null;

        document.getElementById('datetime-overlay').classList.add('active');
    },

    // Pending spoke schedule data
    pendingSpokeSchedule: null,

    /**
     * Open recurrence picker for a Repeating spoke
     */
    openSpokeRecurrenceScheduler(categoryId, itemId, spokeIndex) {
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        const spokeName = typeof spoke === 'string' ? spoke : spoke.text;
        const existingRecurrence = typeof spoke === 'object' && spoke.metadata ? spoke.metadata.recurrence : null;

        // Pre-fill recurrence picker if there's existing recurrence
        if (existingRecurrence) {
            document.getElementById('recurrence-interval').value = existingRecurrence.interval || 1;
            document.getElementById('recurrence-frequency').value = existingRecurrence.frequency || 'WEEKLY';

            if (existingRecurrence.allDay) {
                document.getElementById('recurrence-all-day').checked = true;
                document.getElementById('recurrence-time-picker').style.display = 'none';
            } else {
                document.getElementById('recurrence-all-day').checked = false;
                document.getElementById('recurrence-time-picker').style.display = 'flex';
                if (existingRecurrence.time) {
                    const [hour, minute] = existingRecurrence.time.split(':');
                    document.getElementById('recurrence-hour').value = hour;
                    document.getElementById('recurrence-minute').value = minute;
                }
            }
            document.getElementById('recurrence-duration').value = existingRecurrence.duration || 60;

            // Start date
            document.getElementById('recurrence-start-date').value = existingRecurrence.startDate || new Date().toISOString().split('T')[0];

            // Day checkboxes for weekly
            document.querySelectorAll('input[name="recurrence-day"]').forEach(cb => {
                cb.checked = existingRecurrence.byDay && existingRecurrence.byDay.includes(cb.value);
            });

            // Monthly day
            document.getElementById('recurrence-monthday').value = existingRecurrence.byMonthDay || 1;

            // End options
            if (existingRecurrence.until) {
                document.querySelector('input[name="recurrence-end"][value="date"]').checked = true;
                document.getElementById('recurrence-end-date').value = existingRecurrence.until;
            } else if (existingRecurrence.count) {
                document.querySelector('input[name="recurrence-end"][value="count"]').checked = true;
                document.getElementById('recurrence-count').value = existingRecurrence.count;
            } else {
                document.querySelector('input[name="recurrence-end"][value="never"]').checked = true;
            }
        } else {
            // Reset to defaults
            document.getElementById('recurrence-interval').value = 1;
            document.getElementById('recurrence-frequency').value = 'WEEKLY';
            document.getElementById('recurrence-all-day').checked = true;
            document.getElementById('recurrence-time-picker').style.display = 'none';
            document.getElementById('recurrence-hour').value = '09';
            document.getElementById('recurrence-minute').value = '00';
            document.getElementById('recurrence-duration').value = '60';
            // Default start date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('recurrence-start-date').value = tomorrow.toISOString().split('T')[0];
            document.querySelectorAll('input[name="recurrence-day"]').forEach(cb => cb.checked = false);
            document.getElementById('recurrence-monthday').value = '1';
            document.querySelector('input[name="recurrence-end"][value="never"]').checked = true;
        }

        this.updateRecurrenceOptions();
        this.updateRecurrenceEndOptions();

        // Update title and button based on whether this is an update
        const recTitleEl = document.getElementById('recurrence-picker-title');
        const recSubmitBtn = document.getElementById('recurrence-submit-btn');
        if (recTitleEl) {
            recTitleEl.textContent = existingRecurrence ? 'Update Recurrence' : 'Set Recurrence';
        }
        if (recSubmitBtn) {
            recSubmitBtn.textContent = existingRecurrence ? '🔁 Update Recurrence' : '🔁 Set Recurrence';
        }

        // Set up callback for when recurrence is saved
        this.pendingRecurrence = {
            callback: async (recurrence) => {
                // Delete old calendar event if it exists
                const oldEventId = typeof spoke === 'object' && spoke.metadata ? spoke.metadata.calendarEventId : null;
                if (oldEventId && typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                    await CalendarAdapter.deleteEvent(oldEventId);
                }

                // Update spoke metadata with recurrence
                DataModel.updateSpokeType(categoryId, itemId, spokeIndex, 'repeating', { recurrence });

                // Create calendar event
                if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                    const rrule = CalendarAdapter.buildRRule(recurrence);
                    const eventData = {
                        title: `${spokeName} (${category.name}/${item.name})`,
                        date: recurrence.startDate,
                        description: `Repeating spoke: ${spokeName}\nSlice: ${item.name}\nCategory: ${category.name}\nCreated from Brain Pie`,
                        rrule: rrule
                    };

                    if (recurrence.allDay) {
                        eventData.allDay = true;
                    } else {
                        eventData.time = recurrence.time || '09:00';
                        eventData.duration = recurrence.duration || 60;
                    }

                    const event = await CalendarAdapter.createEvent(eventData);
                    if (event && event.id) {
                        // Update calendarEventId
                        const updatedSpoke = item.subItems[spokeIndex];
                        if (typeof updatedSpoke === 'object') {
                            if (!updatedSpoke.metadata) updatedSpoke.metadata = {};
                            updatedSpoke.metadata.calendarEventId = event.id;
                            DataModel.saveToStorage();
                        }
                        Storage.showStatus('Recurring event added to calendar', 'success');
                    }
                }

                // Re-render
                this.renderTab2Spokes();
                App.render();
            }
        };

        document.getElementById('recurrence-overlay').classList.add('active');
    },

    clearInputs() {
        document.getElementById('item-name').value = '';
        document.getElementById('item-percentage').value = '';
        document.getElementById('item-category').value = '';
        document.getElementById('item-color').value = this.getRandomColor();
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
    },

    // ==========================================
    // Cloud Sync / Firebase Methods
    // ==========================================

    /**
     * Enable cloud sync - show expanded UI
     */
    enableCloudSync() {
        document.getElementById('cloud-sync-collapsed').style.display = 'none';
        document.getElementById('cloud-sync-expanded').style.display = 'block';

        // Check for URL config parameter
        const urlConfig = FirebaseAdapter.parseConfigFromURL();
        if (urlConfig) {
            document.getElementById('firebase-config-input').value = JSON.stringify(urlConfig, null, 2);
            // Auto-connect if config found in URL
            this.connectFirebase();
        }
    },

    /**
     * Disable cloud sync
     */
    async disableCloudSync() {
        if (!confirm('Disable Cloud Sync? Your data will remain in localStorage.')) return;

        await StorageAdapter.disableCloudSync();

        document.getElementById('cloud-sync-collapsed').style.display = 'block';
        document.getElementById('cloud-sync-expanded').style.display = 'none';

        this.updateSyncStatus('offline', 'Disconnected');
        this.updateMainSyncIndicator(null, null);
    },

    /**
     * Connect to Firebase with config from textarea
     */
    async connectFirebase() {
        let configText = document.getElementById('firebase-config-input').value.trim();

        try {
            // Handle JavaScript object syntax (unquoted keys) from Firebase console
            // Convert {apiKey: "..."} to {"apiKey": "..."}
            // Only match keys at start of line or after { or , (not URLs like https:)
            configText = configText.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');

            const config = JSON.parse(configText);

            // Validate required fields
            if (!config.apiKey || !config.authDomain || !config.databaseURL || !config.projectId) {
                alert('Invalid Firebase config. Required fields: apiKey, authDomain, databaseURL, projectId');
                return;
            }

            this.updateSyncStatus('connecting', 'Connecting...');

            await FirebaseAdapter.init(config);
            FirebaseAdapter.saveConfigToLocal(config);

            // Set up auth change listener
            FirebaseAdapter.onAuthStateChanged(() => {
                this.updateAuthUI();
            });

            document.getElementById('firebase-config-form').style.display = 'none';
            document.getElementById('firebase-auth-section').style.display = 'block';

            this.generateShareURL();

        } catch (e) {
            console.error('Firebase connection error:', e);
            alert('Invalid Firebase config. Please paste valid JSON.\n\nError: ' + e.message);
            this.updateSyncStatus('error', 'Connection failed');
        }
    },

    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            this.updateSyncStatus('connecting', 'Signing in...');
            await FirebaseAdapter.signInWithGoogle();
            // Explicitly update UI after sign-in completes
            this.updateAuthUI();
        } catch (e) {
            console.error('Sign in error:', e);
            alert('Sign in failed: ' + e.message);
            this.updateSyncStatus('error', 'Sign in failed');
        }
    },

    /**
     * Sign out of Firebase
     */
    async signOutFirebase() {
        await FirebaseAdapter.signOut();
        this.updateAuthUI();
        this.updateMainSyncIndicator(null, null);
    },

    /**
     * Update auth UI based on current user state
     */
    updateAuthUI() {
        const user = FirebaseAdapter.user;

        if (user) {
            document.getElementById('firebase-signed-out').style.display = 'none';
            document.getElementById('firebase-signed-in').style.display = 'block';

            const photoEl = document.getElementById('firebase-user-photo');
            const nameEl = document.getElementById('firebase-user-name');

            if (photoEl) photoEl.src = user.photoURL || '';
            if (nameEl) nameEl.textContent = user.displayName || user.email;

            document.getElementById('share-url-section').style.display = 'block';

            this.updateSyncStatus('online', 'Connected as ' + (user.displayName || user.email));

            // Enable cloud sync mode in StorageAdapter
            StorageAdapter.enableCloudSync(FirebaseAdapter.config);

            // Update main UI indicator
            this.updateMainSyncIndicator('synced', FirebaseAdapter.getProjectId());

            // Reload data from Firebase
            this.reloadDataFromFirebase();

            // Sync calendar events (now that we have a fresh token)
            if (typeof App !== 'undefined' && App.syncCalendarEvents) {
                App.syncCalendarEvents();
            }
        } else {
            document.getElementById('firebase-signed-out').style.display = 'block';
            document.getElementById('firebase-signed-in').style.display = 'none';
            document.getElementById('share-url-section').style.display = 'none';

            this.updateSyncStatus('offline', 'Not signed in');
            this.updateMainSyncIndicator(null, null);
        }
    },

    /**
     * Reload data from Firebase after sign-in
     * Handles first-time sync: if Firebase is empty but local data exists, offer to push
     */
    async reloadDataFromFirebase() {
        // First, try to load directly from Firebase (not through adapter)
        const firebaseData = await FirebaseAdapter.load();
        const localData = Storage.load();

        if (firebaseData && firebaseData.categories && firebaseData.categories.length > 0) {
            // Firebase has data - use it
            DataModel.categories = firebaseData.categories;
            DataModel.categoryPercentageOverrides = firebaseData.categoryPercentageOverrides || {};
            App.render();
            Storage.showStatus('Synced from cloud', 'success');
        } else if (localData && localData.categories && localData.categories.length > 0) {
            // Firebase is empty but we have local data - offer to push
            const shouldPush = confirm(
                'Firebase is empty but you have local data.\n\n' +
                'Would you like to upload your existing data to the cloud?\n\n' +
                'Click OK to upload, or Cancel to start fresh.'
            );

            if (shouldPush) {
                // Push local data to Firebase
                const success = await FirebaseAdapter.save({
                    categories: localData.categories,
                    categoryPercentageOverrides: localData.categoryPercentageOverrides || {},
                    settings: localData.settings || {},
                    lastModified: Date.now()
                });

                if (success) {
                    Storage.showStatus('Local data uploaded to cloud', 'success');
                } else {
                    Storage.showStatus('Failed to upload data', 'error');
                }
            } else {
                // User wants to start fresh - keep empty state
                DataModel.categories = [];
                DataModel.categoryPercentageOverrides = {};
                App.render();
                Storage.showStatus('Starting fresh', 'success');
            }
        }
        // If both are empty, just continue with whatever DataModel has (example data)
    },

    /**
     * Update sync status indicator in Settings
     * @param {string} state - 'online', 'offline', 'connecting', 'syncing', 'error'
     * @param {string} text - Status text to display
     */
    updateSyncStatus(state, text) {
        const indicator = document.querySelector('#cloud-sync-status .sync-indicator');
        const textEl = document.querySelector('#cloud-sync-status .sync-text');

        if (indicator) {
            indicator.className = 'sync-indicator ' + state;
        }
        if (textEl) {
            textEl.textContent = text;
        }
    },

    /**
     * Generate shareable URL with encoded config
     */
    generateShareURL() {
        const shareURL = FirebaseAdapter.generateShareURL();
        const input = document.getElementById('cloud-share-url');
        if (input && shareURL) {
            input.value = shareURL;
        }
    },

    /**
     * Copy share URL to clipboard
     */
    copyShareURL() {
        const input = document.getElementById('cloud-share-url');
        if (input) {
            input.select();
            input.setSelectionRange(0, 99999); // For mobile
            document.execCommand('copy');
            Storage.showStatus('URL copied to clipboard', 'success');
        }
    },

    /**
     * Export Firebase config as JSON file
     */
    exportFirebaseConfig() {
        const config = FirebaseAdapter.config;
        if (!config) {
            alert('No Firebase config to export');
            return;
        }

        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `firebase-config-${config.projectId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Storage.showStatus('Config exported', 'success');
    },

    /**
     * Load cloud sync state when Settings opened
     */
    loadCloudSyncState() {
        const cloudSyncEnabled = localStorage.getItem('cloudSyncEnabled') === 'true';

        if (cloudSyncEnabled && FirebaseAdapter.config) {
            document.getElementById('cloud-sync-collapsed').style.display = 'none';
            document.getElementById('cloud-sync-expanded').style.display = 'block';

            // Hide config form if already connected
            if (FirebaseAdapter.app) {
                document.getElementById('firebase-config-form').style.display = 'none';
                document.getElementById('firebase-auth-section').style.display = 'block';
            }

            this.updateAuthUI();
            this.generateShareURL();
        } else {
            document.getElementById('cloud-sync-collapsed').style.display = 'block';
            document.getElementById('cloud-sync-expanded').style.display = 'none';

            // Check for URL config (for first-time setup)
            const urlConfig = FirebaseAdapter.parseConfigFromURL();
            if (urlConfig) {
                // Pre-fill config and show expanded view
                document.getElementById('cloud-sync-collapsed').style.display = 'none';
                document.getElementById('cloud-sync-expanded').style.display = 'block';
                document.getElementById('firebase-config-input').value = JSON.stringify(urlConfig, null, 2);
            }
        }
    },

    /**
     * Update the main UI sync indicator in #storage-status area
     * @param {string|null} state - 'synced', 'syncing', 'offline', or null to hide
     * @param {string|null} projectName - Project ID to display, or null
     */
    updateMainSyncIndicator(state, projectName) {
        const statusEl = document.getElementById('storage-status');
        if (!statusEl) return;

        if (!state || !projectName) {
            // Clear the indicator (revert to normal status behavior)
            const existingBadge = statusEl.querySelector('.cloud-sync-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            return;
        }

        // Create or update the badge
        let badge = statusEl.querySelector('.cloud-sync-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'cloud-sync-badge';
            statusEl.innerHTML = ''; // Clear any existing status
            statusEl.appendChild(badge);
        }

        badge.className = 'cloud-sync-badge ' + state;
        badge.innerHTML = `
            <span class="sync-icon">🔄</span>
            <span class="sync-project">${projectName}</span>
        `;
    },

    // ==========================================
    // Import Preview UI
    // ==========================================

    importCurrentStep: 1,

    /**
     * Show the import overlay
     */
    showImportPreview(data) {
        ImportManager.init(data);

        this.importCurrentStep = 1;
        this.updateImportSteps();
        this.renderImportSelectionTree();

        document.getElementById('import-overlay').classList.add('active');
    },

    /**
     * Close the import overlay
     */
    closeImportPreview() {
        document.getElementById('import-overlay').classList.remove('active');
        this.importCurrentStep = 1;
    },

    /**
     * Navigate to next import step
     */
    importNextStep() {
        if (this.importCurrentStep < 2) {
            // Validate selection before going to confirm step
            if (this.importCurrentStep === 1 && !ImportManager.hasSelection()) {
                alert('Please select at least one item to import');
                return;
            }

            this.importCurrentStep++;
            this.updateImportSteps();

            if (this.importCurrentStep === 2) {
                this.renderImportSummary();
            }
        }
    },

    /**
     * Navigate to previous import step
     */
    importPrevStep() {
        if (this.importCurrentStep > 1) {
            this.importCurrentStep--;
            this.updateImportSteps();

            if (this.importCurrentStep === 1) {
                this.renderImportSelectionTree();
            }
        }
    },

    /**
     * Update step indicators and content visibility
     */
    updateImportSteps() {
        // Update step indicators
        document.querySelectorAll('.import-step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            if (stepNum === this.importCurrentStep) {
                step.classList.add('active');
            } else if (stepNum < this.importCurrentStep) {
                step.classList.add('completed');
            }
        });

        // Update step content visibility
        document.querySelectorAll('.import-step-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`import-step-${this.importCurrentStep}`).classList.add('active');
    },

    /**
     * Render the selection tree (Step 1) - with checkboxes
     */
    renderImportSelectionTree() {
        const container = document.getElementById('import-selection-tree');
        const tree = ImportManager.getSelectionTree();

        if (!tree || tree.length === 0) {
            container.innerHTML = '<div class="import-empty-message">No data to import</div>';
            return;
        }

        let html = '';

        for (const cat of tree) {
            const catClass = cat.selected ? '' : 'deselected';

            html += `
                <div class="import-tree-category ${catClass}">
                    <div class="import-tree-category-header" onclick="UI.toggleImportSelection('${cat.key}')">
                        <input type="checkbox" class="import-tree-checkbox" ${cat.selected ? 'checked' : ''}
                               onclick="event.stopPropagation(); UI.toggleImportSelection('${cat.key}')">
                        <div class="import-tree-category-color" style="background: ${cat.color || '#4CAF50'}"></div>
                        <span class="import-tree-category-name">${this.escapeHtml(cat.name)}</span>
                        ${cat.willMerge ? '<span class="import-tree-merge-badge">🔗 Will merge</span>' : ''}
                    </div>
                    <div class="import-tree-items">
            `;

            for (const item of cat.items) {
                const itemClass = item.selected ? '' : 'deselected';

                html += `
                    <div class="import-tree-item ${itemClass}">
                        <div class="import-tree-item-header" onclick="UI.toggleImportSelection('${cat.key}', '${item.key}')">
                            <input type="checkbox" class="import-tree-checkbox" ${item.selected ? 'checked' : ''}
                                   onclick="event.stopPropagation(); UI.toggleImportSelection('${cat.key}', '${item.key}')">
                            <div class="import-tree-item-color" style="background: ${item.color || '#2196F3'}"></div>
                            <span class="import-tree-item-name">${this.escapeHtml(item.name)}</span>
                            ${item.willMerge ? '<span class="import-tree-merge-badge">🔗 Merge</span>' : ''}
                        </div>
                `;

                if (item.spokes.length > 0) {
                    html += '<div class="import-tree-spokes">';
                    for (const spoke of item.spokes) {
                        const spokeClass = spoke.selected ? '' : 'deselected';
                        html += `
                            <div class="import-tree-spoke ${spokeClass}" onclick="UI.toggleImportSelection('${cat.key}', '${item.key}', ${spoke.index})">
                                <input type="checkbox" class="import-tree-checkbox" ${spoke.selected ? 'checked' : ''}
                                       onclick="event.stopPropagation(); UI.toggleImportSelection('${cat.key}', '${item.key}', ${spoke.index})">
                                <span class="import-tree-spoke-text">${this.escapeHtml(spoke.text)}</span>
                                ${spoke.actionsCount > 0 ? `<span class="import-tree-spoke-actions">(${spoke.actionsCount})</span>` : ''}
                                ${spoke.willMerge ? '<span class="import-tree-merge-badge">🔗</span>' : ''}
                            </div>
                        `;
                    }
                    html += '</div>';
                }

                html += '</div>';
            }

            html += '</div></div>';
        }

        container.innerHTML = html;
    },

    /**
     * Toggle selection state for an import item
     */
    toggleImportSelection(catKey, itemKey = null, spokeIdx = null) {
        ImportManager.toggleSelection(catKey, itemKey, spokeIdx);
        this.renderImportSelectionTree();
    },

    /**
     * Render the import summary (Step 3)
     */
    renderImportSummary() {
        const container = document.getElementById('import-summary');
        const summary = ImportManager.getImportSummary();

        if (summary.total === 0) {
            container.innerHTML = '<div class="import-empty-message">No items selected for import</div>';
            document.getElementById('import-execute-btn').disabled = true;
            return;
        }

        document.getElementById('import-execute-btn').disabled = false;

        let html = '';

        // Categories
        if (summary.categories.add > 0 || summary.categories.merge > 0) {
            html += `
                <div class="import-summary-section">
                    <div class="import-summary-title">Categories</div>
                    ${summary.categories.add > 0 ? `<div class="import-summary-row add"><span>New categories</span><span>+${summary.categories.add}</span></div>` : ''}
                    ${summary.categories.merge > 0 ? `<div class="import-summary-row merge"><span>Merge into existing</span><span>${summary.categories.merge}</span></div>` : ''}
                </div>
            `;
        }

        // Items (Slices)
        if (summary.items.add > 0 || summary.items.merge > 0) {
            html += `
                <div class="import-summary-section">
                    <div class="import-summary-title">Slices</div>
                    ${summary.items.add > 0 ? `<div class="import-summary-row add"><span>New slices</span><span>+${summary.items.add}</span></div>` : ''}
                    ${summary.items.merge > 0 ? `<div class="import-summary-row merge"><span>Merge into existing</span><span>${summary.items.merge}</span></div>` : ''}
                </div>
            `;
        }

        // Spokes
        if (summary.spokes.add > 0 || summary.spokes.merge > 0) {
            html += `
                <div class="import-summary-section">
                    <div class="import-summary-title">Spokes</div>
                    ${summary.spokes.add > 0 ? `<div class="import-summary-row add"><span>New spokes</span><span>+${summary.spokes.add}</span></div>` : ''}
                    ${summary.spokes.merge > 0 ? `<div class="import-summary-row merge"><span>Merge into existing</span><span>${summary.spokes.merge}</span></div>` : ''}
                </div>
            `;
        }

        // Total
        const totalNew = summary.categories.add + summary.items.add + summary.spokes.add;
        const totalMerge = summary.categories.merge + summary.items.merge + summary.spokes.merge;
        html += `
            <div class="import-summary-total">
                <span>Total: ${totalNew > 0 ? `${totalNew} new` : ''}${totalNew > 0 && totalMerge > 0 ? ', ' : ''}${totalMerge > 0 ? `${totalMerge} merged` : ''}</span>
            </div>
        `;

        container.innerHTML = html;
    },

    /**
     * Quick replace all data with import
     */
    async importQuickReplace() {
        if (!confirm('This will completely replace all existing data with the imported data. Continue?')) {
            return;
        }

        // Collect ALL existing calendar event IDs (they'll all be replaced)
        const allEventIds = this.getAllCalendarEventIds();

        // For quick replace, all data is new, so no need for "before" snapshot
        const success = ImportManager.quickReplace();
        if (success) {
            this.closeImportPreview();
            App.render();
            Storage.showStatus('Data replaced successfully', 'success');

            // Delete all old calendar events
            await this.deleteReplacedCalendarEvents(allEventIds);

            // Check for scheduled actions that need calendar events (all are "new")
            await this.createCalendarEventsForImport(null);
        } else {
            Storage.showStatus('Import failed', 'error');
        }
    },

    /**
     * Get all calendar event IDs from current data
     */
    getAllCalendarEventIds() {
        const eventIds = [];

        for (const category of DataModel.categories) {
            for (const item of category.items) {
                if (!item.subItems) continue;

                for (const spoke of item.subItems) {
                    if (typeof spoke !== 'object' || !spoke.children) continue;

                    for (const action of spoke.children) {
                        if (typeof action === 'object' &&
                            action.scheduled &&
                            action.scheduled.calendarEventId) {
                            eventIds.push(action.scheduled.calendarEventId);
                        }
                    }
                }
            }
        }

        return eventIds;
    },

    /**
     * Execute the selective import
     */
    async executeImport() {
        // Snapshot existing unlinked scheduled actions BEFORE import
        const beforeImport = this.getUnlinkedScheduledActionKeys();

        // Collect calendar event IDs that will be replaced (for deletion)
        const eventIdsToDelete = this.getCalendarEventIdsToReplace();

        const results = ImportManager.executeImport();

        this.closeImportPreview();
        App.render();

        const messages = [];
        if (results.added > 0) messages.push(`${results.added} added`);
        if (results.merged > 0) messages.push(`${results.merged} merged`);

        if (messages.length > 0) {
            Storage.showStatus(`Import complete: ${messages.join(', ')}`, 'success');
        } else {
            Storage.showStatus('Nothing imported', 'success');
        }

        // Delete old calendar events that were replaced
        await this.deleteReplacedCalendarEvents(eventIdsToDelete);

        // Check for NEW scheduled actions that need calendar events
        await this.createCalendarEventsForImport(beforeImport);
    },

    /**
     * Find calendar event IDs for actions that will be updated by import
     * (same action text exists with scheduled data in both existing and import)
     */
    getCalendarEventIdsToReplace() {
        const eventIds = [];

        if (!ImportManager.importData || !ImportManager.importData.categories) {
            return eventIds;
        }

        for (const importCat of ImportManager.importData.categories) {
            const existingCat = DataModel.findCategoryByName(importCat.name);
            if (!existingCat) continue;

            if (!importCat.items) continue;

            for (const importItem of importCat.items) {
                const existingItem = DataModel.findItemByName(existingCat.id, importItem.name);
                if (!existingItem) continue;

                if (!importItem.subItems) continue;

                for (const importSpoke of importItem.subItems) {
                    const spokeText = typeof importSpoke === 'string' ? importSpoke : importSpoke.text;
                    const existingSpokeResult = DataModel.findSpokeByText(existingCat.id, existingItem.id, spokeText);
                    if (!existingSpokeResult) continue;

                    const existingSpoke = existingSpokeResult.spoke;
                    const importChildren = typeof importSpoke === 'object' ? importSpoke.children || [] : [];

                    if (!importChildren.length) continue;
                    if (typeof existingSpoke === 'string' || !existingSpoke.children) continue;

                    // Check each imported action against existing actions
                    for (const importAction of importChildren) {
                        if (typeof importAction !== 'object' || !importAction.scheduled) continue;

                        const importActionText = importAction.text.toLowerCase().trim();

                        // Find matching existing action
                        for (const existingAction of existingSpoke.children) {
                            if (typeof existingAction !== 'object') continue;

                            const existingActionText = (existingAction.text || '').toLowerCase().trim();
                            if (existingActionText !== importActionText) continue;

                            // Found matching action - if it has a calendar event ID, collect it
                            if (existingAction.scheduled && existingAction.scheduled.calendarEventId) {
                                eventIds.push(existingAction.scheduled.calendarEventId);
                            }
                        }
                    }
                }
            }
        }

        return eventIds;
    },

    /**
     * Delete old calendar events that were replaced by import
     */
    async deleteReplacedCalendarEvents(eventIds) {
        if (!eventIds || eventIds.length === 0) return;
        if (typeof CalendarAdapter === 'undefined' || !CalendarAdapter.isAvailable()) return;

        let deleted = 0;
        for (const eventId of eventIds) {
            try {
                const success = await CalendarAdapter.deleteEvent(eventId);
                if (success) deleted++;
            } catch (e) {
                console.error('Failed to delete old calendar event:', eventId, e);
            }
        }

        if (deleted > 0) {
            Debug.log(`Deleted ${deleted} old calendar event(s) replaced by import`);
        }
    },

    /**
     * Get a Set of keys for all unlinked scheduled actions (for before/after comparison)
     */
    getUnlinkedScheduledActionKeys() {
        const keys = new Set();

        for (const category of DataModel.categories) {
            for (const item of category.items) {
                if (!item.subItems) continue;

                for (let spokeIdx = 0; spokeIdx < item.subItems.length; spokeIdx++) {
                    const spoke = item.subItems[spokeIdx];
                    if (typeof spoke !== 'object' || !spoke.children) continue;

                    for (let actionIdx = 0; actionIdx < spoke.children.length; actionIdx++) {
                        const action = spoke.children[actionIdx];
                        if (action.scheduled &&
                            action.scheduled.date &&
                            action.scheduled.time &&
                            !action.scheduled.calendarEventId) {
                            // Create unique key based on action text and schedule
                            const key = `${action.text}|${action.scheduled.date}|${action.scheduled.time}`;
                            keys.add(key);
                        }
                    }
                }
            }
        }

        return keys;
    },

    /**
     * Find all scheduled actions without a calendar event ID
     * @param {Set|null} excludeKeys - Keys to exclude (actions that existed before import)
     */
    findUnlinkedScheduledActions(excludeKeys = null) {
        const unlinked = [];

        for (const category of DataModel.categories) {
            for (const item of category.items) {
                if (!item.subItems) continue;

                for (let spokeIdx = 0; spokeIdx < item.subItems.length; spokeIdx++) {
                    const spoke = item.subItems[spokeIdx];
                    if (typeof spoke !== 'object' || !spoke.children) continue;

                    for (let actionIdx = 0; actionIdx < spoke.children.length; actionIdx++) {
                        const action = spoke.children[actionIdx];
                        if (action.scheduled &&
                            action.scheduled.date &&
                            action.scheduled.time &&
                            !action.scheduled.calendarEventId) {

                            // Skip if this action existed before import
                            if (excludeKeys) {
                                const key = `${action.text}|${action.scheduled.date}|${action.scheduled.time}`;
                                if (excludeKeys.has(key)) {
                                    continue;
                                }
                            }

                            unlinked.push({
                                categoryId: category.id,
                                itemId: item.id,
                                spokeIdx,
                                actionIdx,
                                action,
                                spokeName: spoke.text,
                                sliceName: item.name,
                                categoryName: category.name
                            });
                        }
                    }
                }
            }
        }

        return unlinked;
    },

    /**
     * Automatically create calendar events for imported scheduled actions
     * @param {Set|null} beforeImportKeys - Keys of actions that existed before import (to exclude)
     */
    async createCalendarEventsForImport(beforeImportKeys) {
        // Check if CalendarAdapter is available and user is signed in
        if (typeof CalendarAdapter === 'undefined' || !CalendarAdapter.isAvailable()) {
            return;
        }

        // Find only NEW unlinked scheduled actions (exclude those that existed before)
        const unlinked = this.findUnlinkedScheduledActions(beforeImportKeys);
        if (unlinked.length === 0) {
            return;
        }

        // Create calendar events for each unlinked action
        let created = 0;
        let failed = 0;

        for (const item of unlinked) {
            try {
                const eventData = {
                    title: `${item.action.text} (${item.spokeName}/${item.sliceName}/${item.categoryName})`,
                    date: item.action.scheduled.date,
                    time: item.action.scheduled.time,
                    duration: item.action.scheduled.duration || 60,
                    description: `Action: ${item.action.text}\nSpoke: ${item.spokeName}\nSlice: ${item.sliceName}\nCategory: ${item.categoryName}\nCreated from Brain Pie`
                };

                // Handle recurrence if present
                if (item.action.scheduled.recurrence) {
                    eventData.rrule = item.action.scheduled.recurrence.rrule;
                }

                const event = await CalendarAdapter.createEvent(eventData);

                if (event && event.id) {
                    // Store the calendar event ID
                    const category = DataModel.categories.find(c => c.id === item.categoryId);
                    if (category) {
                        const slice = category.items.find(i => i.id === item.itemId);
                        if (slice && slice.subItems[item.spokeIdx]) {
                            const spoke = slice.subItems[item.spokeIdx];
                            if (spoke.children && spoke.children[item.actionIdx]) {
                                spoke.children[item.actionIdx].scheduled.calendarEventId = event.id;
                                created++;
                            }
                        }
                    }
                } else {
                    failed++;
                }
            } catch (e) {
                console.error('Failed to create calendar event:', e);
                failed++;
            }
        }

        // Save changes
        if (created > 0) {
            DataModel.saveToStorage();
            App.render();
        }

        // Show result
        if (created > 0 && failed === 0) {
            Storage.showStatus(`Created ${created} calendar event${created !== 1 ? 's' : ''}`, 'success');
        } else if (created > 0 && failed > 0) {
            Storage.showStatus(`Created ${created}, failed ${failed} calendar events`, 'success');
        } else if (failed > 0) {
            Storage.showStatus(`Failed to create ${failed} calendar event${failed !== 1 ? 's' : ''}`, 'error');
        }
    },

    /**
     * HTML escape helper
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ==========================================
    // Export Selection UI
    // ==========================================

    // Export selection state: { categoryId: { selected: bool, items: { itemId: { selected: bool, spokes: { spokeIdx: bool } } } } }
    exportSelectedItems: {},

    /**
     * Show the export selection overlay
     */
    showExportPreview() {
        // Initialize selection state from current data (all selected by default)
        this.exportSelectedItems = {};

        for (const category of DataModel.categories) {
            this.exportSelectedItems[category.id] = {
                selected: true,
                items: {}
            };

            for (const item of category.items) {
                this.exportSelectedItems[category.id].items[item.id] = {
                    selected: true,
                    spokes: {}
                };

                if (item.subItems) {
                    for (let spokeIdx = 0; spokeIdx < item.subItems.length; spokeIdx++) {
                        this.exportSelectedItems[category.id].items[item.id].spokes[spokeIdx] = true;
                    }
                }
            }
        }

        // Reset include actions checkbox
        document.getElementById('export-include-actions').checked = true;

        this.renderExportTree();
        document.getElementById('export-overlay').classList.add('active');
    },

    /**
     * Close the export overlay
     */
    closeExportPreview() {
        document.getElementById('export-overlay').classList.remove('active');
    },

    /**
     * Render the export selection tree
     */
    renderExportTree() {
        const container = document.getElementById('export-selection-tree');
        const includeActions = document.getElementById('export-include-actions').checked;

        if (DataModel.categories.length === 0) {
            container.innerHTML = '<div class="import-empty-message">No data to export</div>';
            this.updateExportSummary();
            return;
        }

        let html = '';

        for (const category of DataModel.categories) {
            const catSelected = this.exportSelectedItems[category.id]?.selected ?? true;
            const catClass = catSelected ? '' : 'deselected';

            html += `
                <div class="import-tree-category ${catClass}">
                    <div class="import-tree-category-header" onclick="UI.toggleExportSelection('${category.id}')">
                        <input type="checkbox" class="import-tree-checkbox" ${catSelected ? 'checked' : ''}
                               onclick="event.stopPropagation(); UI.toggleExportSelection('${category.id}')">
                        <div class="import-tree-category-color" style="background: ${category.color || '#4CAF50'}"></div>
                        <span class="import-tree-category-name">${this.escapeHtml(category.name)}</span>
                        <span class="import-tree-category-count">${category.items.length} slice${category.items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="import-tree-items">
            `;

            for (const item of category.items) {
                const itemSelected = this.exportSelectedItems[category.id]?.items[item.id]?.selected ?? true;
                const itemClass = itemSelected ? '' : 'deselected';
                const spokeCount = item.subItems ? item.subItems.length : 0;

                html += `
                    <div class="import-tree-item ${itemClass}">
                        <div class="import-tree-item-header" onclick="UI.toggleExportSelection('${category.id}', '${item.id}')">
                            <input type="checkbox" class="import-tree-checkbox" ${itemSelected ? 'checked' : ''}
                                   onclick="event.stopPropagation(); UI.toggleExportSelection('${category.id}', '${item.id}')">
                            <div class="import-tree-item-color" style="background: ${item.color || '#2196F3'}"></div>
                            <span class="import-tree-item-name">${this.escapeHtml(item.name)}</span>
                            <span class="import-tree-item-percentage">${spokeCount} spoke${spokeCount !== 1 ? 's' : ''}</span>
                        </div>
                `;

                if (item.subItems && item.subItems.length > 0) {
                    html += '<div class="import-tree-spokes">';
                    for (let spokeIdx = 0; spokeIdx < item.subItems.length; spokeIdx++) {
                        const spoke = item.subItems[spokeIdx];
                        const spokeText = typeof spoke === 'string' ? spoke : spoke.text;
                        const spokeSelected = this.exportSelectedItems[category.id]?.items[item.id]?.spokes[spokeIdx] ?? true;
                        const spokeClass = spokeSelected ? '' : 'deselected';
                        const children = typeof spoke === 'object' ? spoke.children || [] : [];
                        const actionCount = children.length;

                        html += `
                            <div class="import-tree-spoke ${spokeClass}" onclick="UI.toggleExportSelection('${category.id}', '${item.id}', ${spokeIdx})">
                                <input type="checkbox" class="import-tree-checkbox" ${spokeSelected ? 'checked' : ''}
                                       onclick="event.stopPropagation(); UI.toggleExportSelection('${category.id}', '${item.id}', ${spokeIdx})">
                                <span class="import-tree-spoke-text">${this.escapeHtml(spokeText)}</span>
                                ${actionCount > 0 && includeActions ? `<span class="import-tree-spoke-actions">(${actionCount} action${actionCount !== 1 ? 's' : ''})</span>` : ''}
                            </div>
                        `;
                    }
                    html += '</div>';
                }

                html += '</div>';
            }

            html += '</div></div>';
        }

        container.innerHTML = html;
        this.updateExportSummary();
    },

    /**
     * Toggle export selection state
     */
    toggleExportSelection(categoryId, itemId = null, spokeIdx = null) {
        if (!this.exportSelectedItems[categoryId]) return;

        if (spokeIdx !== null && itemId !== null) {
            // Toggle spoke
            const currentState = this.exportSelectedItems[categoryId].items[itemId]?.spokes[spokeIdx];
            this.exportSelectedItems[categoryId].items[itemId].spokes[spokeIdx] = !currentState;
        } else if (itemId !== null) {
            // Toggle item and all its spokes
            const currentState = this.exportSelectedItems[categoryId].items[itemId]?.selected;
            const newState = !currentState;
            this.exportSelectedItems[categoryId].items[itemId].selected = newState;

            // Also toggle all spokes
            const spokeKeys = Object.keys(this.exportSelectedItems[categoryId].items[itemId].spokes);
            for (const spokeKey of spokeKeys) {
                this.exportSelectedItems[categoryId].items[itemId].spokes[spokeKey] = newState;
            }
        } else {
            // Toggle category and all its items/spokes
            const currentState = this.exportSelectedItems[categoryId].selected;
            const newState = !currentState;
            this.exportSelectedItems[categoryId].selected = newState;

            // Also toggle all items and spokes
            const itemKeys = Object.keys(this.exportSelectedItems[categoryId].items);
            for (const ik of itemKeys) {
                this.exportSelectedItems[categoryId].items[ik].selected = newState;
                const spokeKeys = Object.keys(this.exportSelectedItems[categoryId].items[ik].spokes);
                for (const spokeKey of spokeKeys) {
                    this.exportSelectedItems[categoryId].items[ik].spokes[spokeKey] = newState;
                }
            }
        }

        this.renderExportTree();
    },

    /**
     * Select all for export
     */
    exportSelectAll() {
        for (const categoryId of Object.keys(this.exportSelectedItems)) {
            this.exportSelectedItems[categoryId].selected = true;
            for (const itemId of Object.keys(this.exportSelectedItems[categoryId].items)) {
                this.exportSelectedItems[categoryId].items[itemId].selected = true;
                for (const spokeKey of Object.keys(this.exportSelectedItems[categoryId].items[itemId].spokes)) {
                    this.exportSelectedItems[categoryId].items[itemId].spokes[spokeKey] = true;
                }
            }
        }
        this.renderExportTree();
    },

    /**
     * Deselect all for export
     */
    exportDeselectAll() {
        for (const categoryId of Object.keys(this.exportSelectedItems)) {
            this.exportSelectedItems[categoryId].selected = false;
            for (const itemId of Object.keys(this.exportSelectedItems[categoryId].items)) {
                this.exportSelectedItems[categoryId].items[itemId].selected = false;
                for (const spokeKey of Object.keys(this.exportSelectedItems[categoryId].items[itemId].spokes)) {
                    this.exportSelectedItems[categoryId].items[itemId].spokes[spokeKey] = false;
                }
            }
        }
        this.renderExportTree();
    },

    /**
     * Update the export summary
     */
    updateExportSummary() {
        const container = document.getElementById('export-summary');
        const includeActions = document.getElementById('export-include-actions').checked;

        let categoryCount = 0;
        let sliceCount = 0;
        let spokeCount = 0;
        let actionCount = 0;

        for (const category of DataModel.categories) {
            const catSelected = this.exportSelectedItems[category.id]?.selected;
            let catHasSelectedItems = false;

            for (const item of category.items) {
                const itemSelected = this.exportSelectedItems[category.id]?.items[item.id]?.selected;
                let itemHasSelectedSpokes = false;

                if (item.subItems) {
                    for (let spokeIdx = 0; spokeIdx < item.subItems.length; spokeIdx++) {
                        const spokeSelected = this.exportSelectedItems[category.id]?.items[item.id]?.spokes[spokeIdx];
                        if (spokeSelected) {
                            itemHasSelectedSpokes = true;
                            spokeCount++;

                            if (includeActions) {
                                const spoke = item.subItems[spokeIdx];
                                const children = typeof spoke === 'object' ? spoke.children || [] : [];
                                actionCount += children.length;
                            }
                        }
                    }
                }

                if (itemSelected || itemHasSelectedSpokes) {
                    catHasSelectedItems = true;
                    sliceCount++;
                }
            }

            if (catSelected || catHasSelectedItems) {
                categoryCount++;
            }
        }

        const hasSelection = categoryCount > 0;
        document.getElementById('export-execute-btn').disabled = !hasSelection;

        if (!hasSelection) {
            container.innerHTML = '<span style="color: #999;">No items selected</span>';
            return;
        }

        let html = `
            <div class="export-summary-item">
                <span class="export-summary-count">${categoryCount}</span>
                <span>categor${categoryCount !== 1 ? 'ies' : 'y'}</span>
            </div>
            <div class="export-summary-item">
                <span class="export-summary-count">${sliceCount}</span>
                <span>slice${sliceCount !== 1 ? 's' : ''}</span>
            </div>
            <div class="export-summary-item">
                <span class="export-summary-count">${spokeCount}</span>
                <span>spoke${spokeCount !== 1 ? 's' : ''}</span>
            </div>
        `;

        if (includeActions) {
            html += `
                <div class="export-summary-item">
                    <span class="export-summary-count">${actionCount}</span>
                    <span>action${actionCount !== 1 ? 's' : ''}</span>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    /**
     * Execute the export with selected items
     */
    executeExport() {
        const includeActions = document.getElementById('export-include-actions').checked;
        const exportData = { categories: [] };

        for (const category of DataModel.categories) {
            const catSelected = this.exportSelectedItems[category.id]?.selected;

            // Check if category or any children are selected
            const exportItems = [];

            for (const item of category.items) {
                const itemSelected = this.exportSelectedItems[category.id]?.items[item.id]?.selected;

                // Check for selected spokes
                const exportSpokes = [];
                if (item.subItems) {
                    for (let spokeIdx = 0; spokeIdx < item.subItems.length; spokeIdx++) {
                        if (this.exportSelectedItems[category.id]?.items[item.id]?.spokes[spokeIdx]) {
                            let spoke = item.subItems[spokeIdx];

                            // If not including actions, strip children
                            if (!includeActions && typeof spoke === 'object') {
                                spoke = {
                                    ...spoke,
                                    children: []
                                };
                            }

                            exportSpokes.push(spoke);
                        }
                    }
                }

                if (itemSelected || exportSpokes.length > 0) {
                    exportItems.push({
                        id: item.id,
                        name: item.name,
                        percentage: item.percentage,
                        color: item.color,
                        subItems: exportSpokes
                    });
                }
            }

            if (catSelected || exportItems.length > 0) {
                exportData.categories.push({
                    id: category.id,
                    name: category.name,
                    color: category.color,
                    items: exportItems
                });
            }
        }

        // Include category percentage overrides for exported categories
        if (DataModel.categoryPercentageOverrides) {
            exportData.categoryPercentageOverrides = {};
            for (const cat of exportData.categories) {
                if (DataModel.categoryPercentageOverrides[cat.id] !== undefined) {
                    exportData.categoryPercentageOverrides[cat.id] = DataModel.categoryPercentageOverrides[cat.id];
                }
            }
        }

        this.closeExportPreview();
        Storage.exportToFile(exportData);
    },

    toggleActionCompleted(categoryId, itemId, spokeIndex, childIndex) {
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;

        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children || !spoke.children[childIndex]) return;

        const child = spoke.children[childIndex];
        if (typeof child === 'string') {
            spoke.children[childIndex] = { text: child, children: [], completed: true };
        } else {
            child.completed = !child.completed;
        }

        DataModel.saveToStorage();
        this.renderTab2Spokes();
        this.renderExistingActions();
        App.render();
    },

    // --- Prioritiser ---

    prioritiserShowAll: false,
    prioritiserDragState: null,

    togglePrioritiser() {
        const win = document.getElementById('prioritiser-window');
        if (win.classList.contains('active')) {
            this.closePrioritiser();
        } else {
            this.openPrioritiser();
        }
    },

    openPrioritiser() {
        const win = document.getElementById('prioritiser-window');
        win.classList.add('active');
        this.renderPriorityList();
        this.initPrioritiserDrag();
    },

    closePrioritiser() {
        document.getElementById('prioritiser-window').classList.remove('active');
    },

    isPrioritised(ref) {
        return DataModel.priorityList.some(p =>
            p.type === ref.type &&
            p.categoryId === ref.categoryId &&
            p.itemId === ref.itemId &&
            p.spokeIndex === ref.spokeIndex &&
            (ref.childIndex == null ? p.childIndex == null : p.childIndex === ref.childIndex)
        );
    },

    addToPriorities(ref) {
        const added = DataModel.addPriority(ref);
        if (added) {
            Storage.showStatus('Added to priorities');
            this.openPrioritiser();
        } else {
            Storage.showStatus('Already in priorities');
        }
        // Re-render cards to update star button state
        App.render();
    },

    renderPriorityList() {
        DataModel.validatePriorityList();
        const list = document.getElementById('prioritiser-list');
        const empty = document.getElementById('prioritiser-empty');
        const showAllBtn = document.getElementById('prioritiser-show-all');

        const priorities = DataModel.priorityList;
        const maxVisible = this.prioritiserShowAll ? priorities.length : 5;
        const visible = priorities.slice(0, maxVisible);

        if (priorities.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            showAllBtn.style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        showAllBtn.style.display = priorities.length > 5 ? 'block' : 'none';
        if (priorities.length > 5) {
            showAllBtn.querySelector('button').textContent = this.prioritiserShowAll ? 'Show top 5' : `Show all (${priorities.length})`;
        }

        list.innerHTML = visible.map((ref, idx) => {
            const resolved = DataModel.resolvePriority(ref);
            if (!resolved) return '';
            return `
                <div class="prioritiser-item" draggable="true"
                    data-priority-index="${idx}"
                    ondragstart="UI.handlePriorityDragStart(event, ${idx})"
                    ondragend="UI.handlePriorityDragEnd(event)"
                    ondragover="UI.handlePriorityDragOver(event)"
                    ondrop="UI.handlePriorityDrop(event, ${idx})">
                    <span class="priority-rank">${idx + 1}</span>
                    <span class="priority-color" style="background: ${resolved.color}"></span>
                    <div class="priority-info">
                        <div class="priority-name">${resolved.displayName}</div>
                        <div class="priority-context">${resolved.context}</div>
                    </div>
                    <button class="priority-remove" onclick="event.stopPropagation(); UI.removePriority(${idx})" title="Remove from priorities">&#10005;</button>
                </div>
            `;
        }).join('');
    },

    togglePrioritiserShowAll() {
        this.prioritiserShowAll = !this.prioritiserShowAll;
        this.renderPriorityList();
    },

    removePriority(index) {
        DataModel.removePriority(index);
        this.renderPriorityList();
        App.render();
    },

    // Priority item drag-to-reorder
    handlePriorityDragStart(event, index) {
        this.prioritiserDragState = { fromIndex: index };
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', index.toString());
    },

    handlePriorityDragEnd(event) {
        this.prioritiserDragState = null;
        event.target.classList.remove('dragging');
        document.querySelectorAll('.prioritiser-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    },

    handlePriorityDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const item = event.target.closest('.prioritiser-item');
        if (item) {
            document.querySelectorAll('.prioritiser-item.drag-over').forEach(el => el.classList.remove('drag-over'));
            item.classList.add('drag-over');
        }
    },

    handlePriorityDrop(event, toIndex) {
        event.preventDefault();
        document.querySelectorAll('.prioritiser-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (!this.prioritiserDragState) return;
        const fromIndex = this.prioritiserDragState.fromIndex;
        if (fromIndex !== toIndex) {
            DataModel.reorderPriority(fromIndex, toIndex);
            this.renderPriorityList();
        }
        this.prioritiserDragState = null;
    },

    // Draggable window
    initPrioritiserDrag() {
        const titlebar = document.getElementById('prioritiser-titlebar');
        const win = document.getElementById('prioritiser-window');
        if (titlebar._dragInit) return;
        titlebar._dragInit = true;

        let isDragging = false;
        let startX, startY, startLeft, startTop;

        const onStart = (clientX, clientY) => {
            isDragging = true;
            const rect = win.getBoundingClientRect();
            startX = clientX;
            startY = clientY;
            startLeft = rect.left;
            startTop = rect.top;
            win.style.transition = 'none';
        };

        const onMove = (clientX, clientY) => {
            if (!isDragging) return;
            const dx = clientX - startX;
            const dy = clientY - startY;
            win.style.left = (startLeft + dx) + 'px';
            win.style.top = (startTop + dy) + 'px';
            win.style.right = 'auto';
        };

        const onEnd = () => {
            isDragging = false;
            win.style.transition = '';
        };

        // Mouse events
        titlebar.addEventListener('mousedown', (e) => {
            e.preventDefault();
            onStart(e.clientX, e.clientY);
        });
        document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        document.addEventListener('mouseup', onEnd);

        // Touch events
        titlebar.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            onStart(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const t = e.touches[0];
            onMove(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchend', onEnd);
    }
};