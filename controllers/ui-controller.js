const UI = {
    draggedElement: null,
    draggedData: null,

    // Menu tab state
    currentMenuTab: 1,
    selectedCategoryId: null,
    newlyAddedSliceIds: [],
    preselectedSliceId: null,

    // Convert URLs in text to clickable links (for HTML contexts)
    linkifyUrls(text) {
        if (!text) return text;
        return text.replace(/(https?:\/\/[^\s<>"']+)/g, '<a href="$1" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:#1a73e8;text-decoration:underline;">$1</a>');
    },

    // Returns inline CSS border + background string for schedule pills based on date proximity
    getScheduleBorderStyle(dateStr, timeStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T' + (timeStr || '00:00'));
        if (ChartRenderer.isPast(date)) return 'background: #D32F2F; border: 2px solid #D32F2F;';
        if (ChartRenderer.isToday(date)) return 'background: #F57C00; border: 2px solid #D32F2F;';
        if (ChartRenderer.isTomorrow(date)) return 'border: 2px solid #F57C00;';
        if (ChartRenderer.isThisWeek(date)) return 'border: 2px solid #000000;';
        return 'border: 1.5px solid #fff;';
    },

    // Get the relevant date string for a spoke's schedule (single or repeating)
    getSpokeDateInfo(spoke) {
        if (typeof spoke !== 'object') return { dateStr: null, timeStr: null };
        const type = (spoke.type === 'action' ? 'list' : spoke.type) || 'static';
        if (type === 'single' && spoke.scheduled && spoke.scheduled.date) {
            return { dateStr: spoke.scheduled.date, timeStr: spoke.scheduled.time };
        }
        if (type === 'repeating' && spoke.metadata && spoke.metadata.recurrence) {
            const rec = spoke.metadata.recurrence;
            if (rec.startDate) {
                const nextDate = ChartRenderer.getNextOccurrence(rec);
                return { dateStr: nextDate || rec.startDate, timeStr: rec.time };
            }
        }
        return { dateStr: null, timeStr: null };
    },

    showConfigSignInBanner() {
        const banner = document.createElement('div');
        banner.id = 'config-signin-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10000;background:#1a73e8;color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 20px;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
        banner.innerHTML = `
            <span>Sign in with Google to sync data from the cloud</span>
            <button onclick="UI.signInWithGoogle().then(()=>{document.getElementById('config-signin-banner')?.remove()}).catch(()=>{})"
                style="background:#fff;color:#1a73e8;border:none;padding:8px 20px;border-radius:4px;font-weight:bold;cursor:pointer;font-size:14px;">Sign in with Google</button>
            <button onclick="this.parentElement.remove()"
                style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;padding:0 4px;opacity:0.7;">\u2715</button>
        `;
        document.body.prepend(banner);
    },

    showMenu(skipExpandedCheck) {
        // If zoomed into a category or slice, pre-select it
        if (!skipExpandedCheck) {
            const ev = ChartRenderer.expandedView;
            if (ev) {
                if (ev.type === 'slice' && ev.itemId) {
                    return this.showMenuForSlice(ev.categoryId, ev.itemId);
                }
                if (ev.type === 'category' && ev.categoryId) {
                    return this.showMenuForCategory(ev.categoryId);
                }
            }
        }

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
        this.showMenu(true);

        // Then pre-select the category
        const existingRadio = document.querySelector('input[name="category-mode"][value="existing"]');
        if (existingRadio) existingRadio.checked = true;

        document.getElementById('item-category').value = categoryId;
        this.toggleCategoryMode('existing');
        this.onCategorySelected();
    },

    showMenuForSlice(categoryId, sliceId) {
        // First show the menu normally
        this.showMenu(true);

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
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:8px;';

            const star = document.createElement('button');
            star.className = `priority-star-btn ${this.isPrioritised({type:'slice', categoryId, itemId:item.id}) ? 'active' : ''}`;
            star.innerHTML = '&#9733;';
            star.title = 'Add to priorities';
            star.style.flexShrink = '0';
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToPriorities({type:'slice', categoryId, itemId:item.id});
                star.classList.toggle('active', this.isPrioritised({type:'slice', categoryId, itemId:item.id}));
            });

            const li = document.createElement('li');
            const isNew = this.newlyAddedSliceIds.includes(item.id);
            if (isNew) li.classList.add('newly-added');
            li.style.cssText = 'flex:1;cursor:pointer;';

            li.innerHTML = `
                <span class="slice-name">${item.name}</span>
                <span class="slice-percentage">${item.percentage.toFixed(1)}%</span>
                ${isNew ? '<span class="new-badge">New</span>' : ''}
                <span class="slice-edit-hint">Edit →</span>
            `;

            li.addEventListener('click', () => {
                this.selectSliceAndGoToTab2(categoryId, item.id);
            });

            row.appendChild(star);
            row.appendChild(li);
            list.appendChild(row);
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
            wrapper.style.cssText = 'display:flex;align-items:start;gap:4px;';

            const spokeStar = document.createElement('button');
            spokeStar.className = `priority-star-btn ${this.isPrioritised({type:'spoke', categoryId, itemId, spokeIndex:idx}) ? 'active' : ''}`;
            spokeStar.innerHTML = '&#9733;';
            spokeStar.title = 'Add to priorities';
            spokeStar.style.cssText = 'flex-shrink:0;margin-top:8px;';
            spokeStar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToPriorities({type:'spoke', categoryId, itemId, spokeIndex:idx});
                spokeStar.classList.toggle('active', this.isPrioritised({type:'spoke', categoryId, itemId, spokeIndex:idx}));
            });
            wrapper.appendChild(spokeStar);

            const div = document.createElement('div');
            div.className = 'tab2-spoke-item';
            div.style.flex = '1';

            // Build the spoke type button based on current type and schedule state
            let spokeTypeButton = '';
            if (spokeType === 'single') {
                if (spokeSchedule && spokeSchedule.date) {
                    const schedDate = new Date(`${spokeSchedule.date}T${spokeSchedule.time || '00:00'}`);
                    const timeStr = spokeSchedule.time ? schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    const borderStyle = UI.getScheduleBorderStyle(spokeSchedule.date, spokeSchedule.time);
                    spokeTypeButton = `<button style="background: #4CAF50; ${borderStyle}" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Reschedule">${dateStr}${timeStr ? ' ' + timeStr : ''}</button>`;
                } else {
                    spokeTypeButton = `<button style="background: #4CAF50;" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Schedule">📅 Schedule</button>`;
                }
            } else if (spokeType === 'repeating') {
                if (spokeRecurrence) {
                    const recurrenceText = this.formatRecurrenceDescriptionCompact(spokeRecurrence);
                    const recBorder = UI.getScheduleBorderStyle(ChartRenderer.getNextOccurrence(spokeRecurrence) || spokeRecurrence.startDate, spokeRecurrence.time);
                    spokeTypeButton = `<button style="background: #4CAF50; ${recBorder}" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Edit recurrence">${recurrenceText}</button>`;
                } else {
                    spokeTypeButton = `<button style="background: #4CAF50;" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Set recurrence">🔁 Set recurrence</button>`;
                }
            } else if (spokeType === 'list') {
                spokeTypeButton = `<button style="background:#4CAF50;" onclick="UI.showAddActionInput('${categoryId}', '${itemId}', ${idx})" title="Add action">+</button><button class="secondary" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Manage actions"><img width="17" height="17" src="./assets/gear.svg"></button>`;
            } else {
                // static - show type picker button
                spokeTypeButton = `<button class="secondary" onclick="UI.showSpokeEditor('${categoryId}', '${itemId}', ${idx})" title="Change spoke type"><img width="17" height="17" src="./assets/gear.svg"></button>`;
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
                    const hasSchedule = child.scheduled && child.scheduled.date && (child.scheduled.time || child.scheduled.allDay);
                    let scheduleDisplay = '';
                    if (hasSchedule) {
                        const actionBorder = UI.getScheduleBorderStyle(child.scheduled.date, child.scheduled.time);
                        if (child.scheduled.allDay) {
                            const dateStr = new Date(child.scheduled.date + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
                            scheduleDisplay = `<span class="action-schedule" style="${actionBorder}">${dateStr} (all day)</span>`;
                        } else {
                            const schedDate = new Date(`${child.scheduled.date}T${child.scheduled.time}`);
                            const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                            scheduleDisplay = `<span class="action-schedule" style="${actionBorder}">${dateStr} ${timeStr}</span>`;
                        }
                    }
                    const isCompleted = child.completed || false;
                    const isActionPrioritised = UI.isPrioritised({type:'action', categoryId, itemId, spokeIndex:idx, childIndex:childIdx});
                    return `
                        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
                            <button class="priority-star-btn ${isActionPrioritised ? 'active' : ''}"
                                onclick="event.stopPropagation(); UI.addToPriorities({type:'action', categoryId:'${categoryId}', itemId:'${itemId}', spokeIndex:${idx}, childIndex:${childIdx}}); this.classList.toggle('active', UI.isPrioritised({type:'action', categoryId:'${categoryId}', itemId:'${itemId}', spokeIndex:${idx}, childIndex:${childIdx}}))"
                                title="Add to priorities" style="flex-shrink:0;">&#9733;</button>
                            <div class="tab2-action-item" style="flex:1;margin-bottom:0;">
                                <input type="checkbox" class="action-checkbox"
                                    onchange="UI.toggleActionCompleted('${categoryId}', '${itemId}', ${idx}, ${childIdx})"
                                    ${isCompleted ? 'checked' : ''}>
                                <span class="action-text ${isCompleted ? 'action-completed' : ''}">${UI.linkifyUrls(childText)}</span>
                                ${scheduleDisplay}
                                <button class="small warn" onclick="UI.removeActionFromTab2(${idx}, ${childIdx})" title="Remove action">×</button>
                            </div>
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

        this.showSpokeEditor(categoryId, itemId, spokeIndex);
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
        this.updateCalendarImportButton();
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
            this.updateCalendarImportButton();
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
        this.updateCalendarImportButton();
        Storage.showStatus('Calendar sync disabled', 'success');
    },
    
    // Helper to determine if a color is dark
    isColorDark(hexColor) {
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 170;
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
            // Only allow drag from the grip handle, not inputs/editable areas
            card.addEventListener('mousedown', (e) => {
                if (e.target.closest('.category-drag-handle')) {
                    card.draggable = true;
                } else {
                    card.draggable = false;
                }
            });

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
                             data-category-id="${category.id}"
                             data-item-id="${item.id}"
                             onmousedown="var h=event.target.closest('.item-drag-handle'); this.draggable=!!h;"
                             ondragstart="UI.handleItemDragStart(event)"
                             ondragend="UI.handleDragEnd(event)"
                             ondragover="UI.handleItemDragOver(event)"
                            ondrop="UI.handleItemDrop(event)"
                             >
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; gap: 10px;">
                                <span class="item-drag-handle" style="font-size: 16px; color: #999; cursor: move; padding: 2px 4px; margin-top: 2px;">⋮⋮</span>
                                <button class="priority-star-btn ${UI.isPrioritised({type:'slice', categoryId:category.id, itemId:item.id}) ? 'active' : ''}"
                                    onclick="event.stopPropagation(); UI.addToPriorities({type:'slice', categoryId:'${category.id}', itemId:'${item.id}'})"
                                    title="Add to priorities" style="flex-shrink:0;margin-top:-4px;">&#9733;</button>
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
                                <button style="background: #4CAF50; margin-left: 5px;" onclick="UI.showAddSpokeInput('${category.id}', '${item.id}')" title="Add spoke">+ <span class="btn-label">New Spoke</span></button>
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
                                    const spokeIndex = (typeof sub === 'object' && sub._originalIndex != null) ? sub._originalIndex : idx;
                                    const subText = typeof sub === 'string' ? sub : sub.text;
                                    const spokeType = DataModel.getSpokeType(category.id, item.id, spokeIndex);
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
                                            const borderStyle = UI.getScheduleBorderStyle(spokeSchedule.date, spokeSchedule.time);
                                            spokeTypeBtn = `<button class="small" style="background: #4CAF50; padding: 3px 17px; ${borderStyle}" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Reschedule">${dateStr}${timeStr ? ' ' + timeStr : ''}</button>`;
                                        } else {
                                            spokeTypeBtn = `<button class="small" style="background: #4CAF50; padding: 3px 17px;" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Schedule">📅</button>`;
                                        }
                                    } else if (spokeType === 'repeating') {
                                        if (spokeRecurrence) {
                                            const recBorder = UI.getScheduleBorderStyle(ChartRenderer.getNextOccurrence(spokeRecurrence) || spokeRecurrence.startDate, spokeRecurrence.time);
                                            spokeTypeBtn = `<button class="small" style="background: #4CAF50; padding: 3px 17px; ${recBorder}" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Edit recurrence">${UI.formatRecurrenceDescriptionCompact(spokeRecurrence)}</button>`;
                                        } else {
                                            spokeTypeBtn = `<button class="small" style="background: #4CAF50; padding: 3px 17px;" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Set recurrence">🔁</button>`;
                                        }
                                    } else if (spokeType === 'list') {
                                        spokeTypeBtn = `<button style="background:#4CAF50;" onclick="UI.showAddActionInput('${category.id}', '${item.id}', ${spokeIndex})" title="Add action">+</button><button class="secondary" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Manage actions"><img width="17" height="17" src="./assets/gear.svg"></button>`;
                                    } else {
                                        // static - show type picker
                                        spokeTypeBtn = `<button class="secondary" onclick="UI.showSpokeEditor('${category.id}', '${item.id}', ${spokeIndex})" title="Change spoke type"><img width="17" height="17" src="./assets/gear.svg"></button>`;
                                    }

                                    return `
                                    <li draggable="true"
                                        data-category-id="${category.id}"
                                        data-item-id="${item.id}"
                                        data-subitem-index="${spokeIndex}"
                                        ondragstart="UI.handleSubItemDragStart(event)"
                                        ondragend="UI.handleDragEnd(event)"
                                        ondragover="UI.handleSubItemDragOver(event)"
                                        ondrop="UI.handleSubItemDrop(event)"
                                        style="cursor: move;">
                                        <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 4px; width: 100%; overflow: hidden;">
                                            <button class="priority-star-btn ${UI.isPrioritised({type:'spoke', categoryId:category.id, itemId:item.id, spokeIndex}) ? 'active' : ''}"
                                                onclick="event.stopPropagation(); UI.addToPriorities({type:'spoke', categoryId:'${category.id}', itemId:'${item.id}', spokeIndex:${spokeIndex}})"
                                                title="Add to priorities" style="flex-shrink:0;">&#9733;</button>
                                            <span class="sub-item-text" contenteditable="true"
                                                style="flex: 1; min-width: 0; word-break: break-word; white-space: normal; padding-right: 4px; outline: none; border-radius: 3px;"
                                                onfocus="this.style.background='#f0f0f0'"
                                                onblur="this.style.background='transparent'; if(!UI.draggedData) App.renameSpoke('${category.id}', '${item.id}', ${spokeIndex}, this.textContent)"
                                                onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
                                            >${subText}</span>
                                            <div style="display: flex; gap: 4px;">
                                                ${children.length > 0 ? `<span style="color: #2196F3; font-weight: bold; font-size: 18px;">(${children.length})</span>` : ''}
                                                ${spokeTypeBtn}
                                                <button style="justify-self: flex-end;" class="warn" onclick="App.removeSubItem('${category.id}', '${item.id}', ${spokeIndex})" title="Remove spoke">
                                                    <img width="15" height="15" src="./assets/trash.svg" />
                                                </button>
                                            </div>
                                        </div>
                                        ${(typeof sub === 'object' && sub.notes) ? `<div class="spoke-notes-preview">${sub.notes.replace(/</g, '&lt;')}</div>` : ''}
                                        ${children.length > 0 ? `
                                            <ul class="action-list"
                                            style="margin-left: 20px; font-size: 11px; margin-top: 6px;">
                                                ${children.map((child, childIdx) => {
                                                    const childText = typeof child === 'string' ? child : child.text;
                                                    const hasSchedule = child.scheduled && child.scheduled.date && (child.scheduled.time || child.scheduled.allDay);
                                                    const hasRecurrence = child.recurrence;
                                                    let scheduleDisplay = '📅';
                                                    let buttonStyle = 'background: #4285F4; padding: 3px 12px;';
                                                    let buttonTitle = 'Add to calendar';

                                                    if (hasRecurrence) {
                                                        // Repeating action - show recurrence on green button
                                                        scheduleDisplay = UI.formatRecurrenceDescriptionCompact(child.recurrence);
                                                        const recBorder = UI.getScheduleBorderStyle(ChartRenderer.getNextOccurrence(child.recurrence) || child.recurrence.startDate, child.recurrence.time);
                                                        buttonStyle = 'background: #4CAF50; padding: 3px 17px; ' + recBorder;
                                                        buttonTitle = 'Repeating event';
                                                    } else if (hasSchedule) {
                                                        if (child.scheduled.allDay) {
                                                            const dateStr = new Date(child.scheduled.date + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                            scheduleDisplay = dateStr + ' (all day)';
                                                        } else {
                                                            const schedDate = new Date(child.scheduled.date + 'T' + child.scheduled.time);
                                                            const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                            const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                                                            scheduleDisplay = dateStr + ' ' + timeStr;
                                                        }
                                                        const actionBorder = UI.getScheduleBorderStyle(child.scheduled.date, child.scheduled.time);
                                                        buttonStyle = 'background: #4CAF50; padding: 3px 17px; ' + actionBorder;
                                                        buttonTitle = 'Reschedule';
                                                    }

                                                    const isActionCompleted = child.completed || false;
                                                    return `
                                                    <li style="cursor: default; display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
                                                        <button class="priority-star-btn ${UI.isPrioritised({type:'action', categoryId:category.id, itemId:item.id, spokeIndex, childIndex:childIdx}) ? 'active' : ''}"
                                                            onclick="event.stopPropagation(); UI.addToPriorities({type:'action', categoryId:'${category.id}', itemId:'${item.id}', spokeIndex:${spokeIndex}, childIndex:${childIdx}})"
                                                            title="Add to priorities" style="flex-shrink:0;">&#9733;</button>
                                                        <div class="action-container">
                                                            <input type="checkbox" class="action-checkbox"
                                                                onchange="UI.toggleActionCompleted('${category.id}', '${item.id}', ${spokeIndex}, ${childIdx})"
                                                                ${isActionCompleted ? 'checked' : ''}>
                                                            <span style="flex: 1;margin-right: 6px;" class="${isActionCompleted ? 'action-completed' : ''}">${UI.linkifyUrls(childText)}</span>
                                                            <div style="display: flex; gap: 4px;">
                                                                ${!isActionCompleted ? `<button class="small"
                                                                        style="${buttonStyle}"
                                                                        onclick="UI.openCalendarForActionWithLocation('${encodeURIComponent(childText)}', '${encodeURIComponent(subText)}', '${item.name}', '${encodeURIComponent(category.name)}', '${category.id}', '${item.id}', ${spokeIndex}, ${childIdx})"
                                                                        title="${buttonTitle}">${scheduleDisplay}</button>` : ''}
                                                                <button class="small warn" onclick="App.removeSpokeChild('${category.id}', '${item.id}', ${spokeIndex}, ${childIdx})" title="Remove action">
                                                                    <img width="15" height="20" src="./assets/trash.svg" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </li>
                                                `}).join('')}
                                            </ul>
                                        ` : ''}
                                        <div id="add-action-${category.id}-${item.id}-${spokeIndex}" style="display: none; margin-top: 6px; margin-left: 20px;">
                                            <div style="display: flex; gap: 6px; align-items: center;">
                                                <input type="text"
                                                       id="action-input-${category.id}-${item.id}-${spokeIndex}"
                                                       placeholder="Action name..."
                                                       style="flex: 1; padding: 6px; border: 1px solid #2196F3; border-radius: 4px;"
                                                       onkeydown="if(event.key==='Enter') UI.submitAddAction('${category.id}', '${item.id}', ${spokeIndex})">
                                                <button class="small secondary" onclick="UI.submitAddAction('${category.id}', '${item.id}', ${spokeIndex})">Add</button>
                                                <button class="small warn" onclick="UI.hideAddActionInput('${category.id}', '${item.id}', ${spokeIndex})">
                                                    <img width="15" height="20" src="./assets/trash.svg" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                `}).join('')}</ul>`
                                : '<p style="color: #999; font-size: 12px; margin: 8px 0;">No Spokes</p>'}
                            <div id="add-spoke-${category.id}-${item.id}" class="add-spoke-input-container"
                                style="margin-top: 10px; display: none; gap: 8px; align-items: center;">
                                <input type="text"
                                       id="new-subitem-${item.id}"
                                       placeholder="New Spoke"
                                       style="flex: 1; padding: 8px; border: 1px solid #4CAF50; border-radius: 4px;"
                                       onkeydown="if(event.key==='Enter') App.addSubItem('${category.id}', '${item.id}')">
                                <button class="small" style="background: #4CAF50;" onclick="App.addSubItem('${category.id}', '${item.id}')">Add</button>
                                <button class="small warn" onclick="UI.hideAddSpokeInput('${category.id}', '${item.id}')">
                                    <img width="15" height="20" src="./assets/trash.svg" />
                                </button>
                            </div>
                        </div>
                    `).join('')}
                   </div>`
                : '<div class="empty-category">No items yet</div>';
            
            card.innerHTML = `
                <div class="category-header">
                    <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                        <span class="category-drag-handle" style="font-size: 20px; color: #999; cursor: move; padding: 4px;">⋮⋮</span>
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
                    <button style="margin-left: 5px;" onclick="UI.showMenuForCategory('${category.id}')">+ <span class="btn-label">New Slice</span></button>
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

    showAddSpokeInput(categoryId, itemId) {
        this.hideAllAddSpokeInputs();
        const inputDiv = document.getElementById(`add-spoke-${categoryId}-${itemId}`);
        const input = document.getElementById(`new-subitem-${itemId}`);
        if (inputDiv && input) {
            inputDiv.style.display = 'flex';
            input.focus();
        }
    },

    hideAddSpokeInput(categoryId, itemId) {
        const inputDiv = document.getElementById(`add-spoke-${categoryId}-${itemId}`);
        const input = document.getElementById(`new-subitem-${itemId}`);
        if (inputDiv) inputDiv.style.display = 'none';
        if (input) input.value = '';
    },

    hideAllAddSpokeInputs() {
        document.querySelectorAll('[id^="add-spoke-"]').forEach(div => {
            div.style.display = 'none';
            const input = div.querySelector('input[type="text"]');
            if (input) input.value = '';
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

    showPrivacy() {
        document.getElementById('privacy-overlay').classList.add('active');
    },

    closePrivacy() {
        document.getElementById('privacy-overlay').classList.remove('active');
    },

    // ==========================================
    // Documentation Popup
    // ==========================================

    docsCurrentPage: 1,
    docsTotalPages: 7,

    openDocs() {
        document.getElementById('docs-overlay').classList.add('active');
        this.switchDocsPage(1);
    },

    closeDocs() {
        document.getElementById('docs-overlay').classList.remove('active');
    },

    switchDocsPage(pageNum) {
        this.docsCurrentPage = pageNum;
        document.querySelectorAll('.docs-page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.docs-nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('docs-page-' + pageNum).classList.add('active');
        document.querySelector('.docs-nav-btn[data-page="' + pageNum + '"]').classList.add('active');
        document.querySelector('.docs-prev').style.visibility = pageNum === 1 ? 'hidden' : 'visible';
        document.querySelector('.docs-next').style.visibility = pageNum === this.docsTotalPages ? 'hidden' : 'visible';
        // Scroll page content to top
        document.getElementById('docs-page-' + pageNum).scrollTop = 0;
    },

    docsPagePrev() {
        if (this.docsCurrentPage > 1) this.switchDocsPage(this.docsCurrentPage - 1);
    },

    docsPageNext() {
        if (this.docsCurrentPage < this.docsTotalPages) this.switchDocsPage(this.docsCurrentPage + 1);
    },
    toggleActionCompleted(categoryId, itemId, spokeIndex, childIndex, skipRender = false) {
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

        // Remove from priorities when completed
        const nowCompleted = typeof spoke.children[childIndex] === 'object' && spoke.children[childIndex].completed;
        if (nowCompleted) {
            const ref = { type: 'action', categoryId, itemId, spokeIndex, childIndex };
            const prioIdx = this.getPriorityIndex(ref);
            if (prioIdx >= 0) DataModel.removePriority(prioIdx);
        }

        DataModel.saveToStorage();
        if (!skipRender) {
            this.renderTab2Spokes();
            this.renderSpokeEditorActions();
            App.render();
        }
    },
    // --- Multi-pie tab UI ---

    renderPieTabs() {
        const container = document.getElementById('pie-tabs');
        if (!container) return;

        const pies = DataModel.getPieList();

        if (pies.length === 0) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = '';

        pies.forEach(pie => {
            const btn = document.createElement('button');
            btn.className = 'pie-tab' + (pie.active ? ' active' : '') + (pie.tombstoned ? ' tombstoned' : '');
            btn.textContent = pie.name;
            btn.title = pie.tombstoned ? 'Empty — data preserved in cloud' : '';
            btn.dataset.pieId = pie.id;
            btn.draggable = !pie.tombstoned;

            btn.addEventListener('click', (e) => {
                if (pie.tombstoned) {
                    // Show restore/delete menu; keep current pie in view
                    this.showTombstonedPieContextMenu(pie.id, e, btn);
                } else if (pie.active) {
                    this.showPieContextMenu(pie.id, e, btn);
                } else {
                    App.switchPie(pie.id);
                }
            });

            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (pie.tombstoned) {
                    this.showTombstonedPieContextMenu(pie.id, e);
                } else {
                    this.showPieContextMenu(pie.id, e);
                }
            });

            // Drag-and-drop reorder
            btn.addEventListener('dragstart', (e) => {
                btn.classList.add('dragging');
                e.dataTransfer.setData('text/plain', pie.id);
                e.dataTransfer.effectAllowed = 'move';
            });
            btn.addEventListener('dragend', () => {
                btn.classList.remove('dragging');
                container.querySelectorAll('.pie-tab').forEach(t => t.classList.remove('drag-over'));
            });
            btn.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                // Only highlight pie tabs, not the "+" button
                if (btn.dataset.pieId && !btn.classList.contains('dragging')) {
                    btn.classList.add('drag-over');
                }
            });
            btn.addEventListener('dragleave', () => {
                btn.classList.remove('drag-over');
            });
            btn.addEventListener('drop', (e) => {
                e.preventDefault();
                btn.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                if (draggedId && draggedId !== pie.id) {
                    this.reorderPie(draggedId, pie.id);
                }
            });

            // Long-press for mobile context menu
            let longPressTimer = null;
            btn.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    this.showPieContextMenu(pie.id, e.touches[0]);
                }, 600);
            }, { passive: false });
            btn.addEventListener('touchend', () => clearTimeout(longPressTimer));
            btn.addEventListener('touchmove', () => clearTimeout(longPressTimer), { passive: true });

            container.appendChild(btn);
        });

        // Add "+ New" button — greyed out on free tier with upgrade tooltip
        const addBtn = document.createElement('button');
        addBtn.className = 'pie-tab pie-tab-add';
        addBtn.textContent = '+';
        const isPro = License.isActive() || pies.length < 1;
        if (isPro) {
            addBtn.title = 'New pie';
        } else {
            addBtn.title = 'Upgrade to Pro for multiple pies';
            addBtn.style.opacity = '0.4';
            addBtn.style.cursor = 'pointer';
        }
        addBtn.addEventListener('click', () => this.promptNewPie());
        container.appendChild(addBtn);
    },

    reorderPie(draggedId, targetId) {
        if (!DataModel.pieMeta || !DataModel.pieMeta.pieIds) return;
        const ids = [...DataModel.pieMeta.pieIds];
        const fromIdx = ids.indexOf(draggedId);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, draggedId);
        DataModel.pieMeta.pieIds = ids;
        DataModel.saveMeta();
        this.renderPieTabs();
    },

    showPieContextMenu(pieId, event, anchorEl) {
        // Remove any existing context menu
        this.closePieContextMenu();

        const menu = document.createElement('div');
        menu.className = 'pie-context-menu';

        if (anchorEl) {
            // Position below the tab button
            const rect = anchorEl.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 4) + 'px';
        } else {
            menu.style.left = (event.clientX || event.pageX) + 'px';
            menu.style.top = (event.clientY || event.pageY) + 'px';
        }

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.addEventListener('click', () => {
            this.closePieContextMenu();
            this.promptRenamePie(pieId);
        });
        menu.appendChild(renameBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'danger';
        deleteBtn.addEventListener('click', () => {
            this.closePieContextMenu();
            this.confirmDeletePie(pieId);
        });
        menu.appendChild(deleteBtn);

        document.body.appendChild(menu);

        // Close on click outside
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                this.closePieContextMenu();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    },

    showTombstonedPieContextMenu(pieId, event, anchorEl) {
        this.closePieContextMenu();

        const menu = document.createElement('div');
        menu.className = 'pie-context-menu';

        if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            menu.style.left = rect.left + 'px';
            menu.style.top = (rect.bottom + 4) + 'px';
        } else {
            menu.style.left = (event.clientX || event.pageX) + 'px';
            menu.style.top = (event.clientY || event.pageY) + 'px';
        }

        const restoreBtn = document.createElement('button');
        restoreBtn.textContent = 'Restore';
        restoreBtn.addEventListener('click', () => {
            this.closePieContextMenu();
            App.restorePie(pieId);
        });
        menu.appendChild(restoreBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'danger';
        deleteBtn.addEventListener('click', () => {
            this.closePieContextMenu();
            this.confirmDeletePie(pieId);
        });
        menu.appendChild(deleteBtn);

        document.body.appendChild(menu);

        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                this.closePieContextMenu();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    },

    closePieContextMenu() {
        const existing = document.querySelector('.pie-context-menu');
        if (existing) existing.remove();
    },

    promptNewPie() {
        const pieCount = (DataModel.pieMeta?.pieIds || []).length;
        if (pieCount >= 1 && !License.isActive()) {
            this.showLicenseModal();
            return;
        }
        const name = prompt('New pie name:');
        if (name && name.trim()) {
            App.createPie(name.trim());
        }
    },

    requirePro(method) {
        if (License.isActive()) {
            this[method]();
        } else {
            this.showLicenseModal();
        }
    },

    showLicenseModal() {
        const overlay = document.getElementById('license-overlay');
        if (overlay) {
            overlay.classList.add('active');
            const input = document.getElementById('license-key-input');
            if (input) input.value = '';
            const status = document.getElementById('license-status');
            if (status) { status.textContent = ''; status.className = ''; }
        }
    },

    closeLicenseModal(event) {
        if (event && event.target !== event.currentTarget) return;
        document.getElementById('license-overlay')?.classList.remove('active');
    },

    async activateLicense() {
        const input = document.getElementById('license-key-input');
        const status = document.getElementById('license-status');
        const btn = document.getElementById('license-activate-btn');
        const key = input?.value?.trim();
        if (!key) return;

        if (btn) btn.disabled = true;
        if (status) { status.textContent = 'Validating…'; status.className = ''; }

        const valid = await License.activate(key);

        if (valid) {
            if (status) { status.textContent = '✓ License activated! Reloading…'; status.className = 'license-status-ok'; }
            setTimeout(() => location.reload(), 1000);
        } else {
            if (status) { status.textContent = '✗ Invalid or revoked license key.'; status.className = 'license-status-err'; }
            if (btn) btn.disabled = false;
        }
    },

    promptRenamePie(pieId) {
        const currentName = DataModel.getPieName(pieId);
        const name = prompt('Rename pie:', currentName);
        if (name && name.trim() && name.trim() !== currentName) {
            App.renamePie(pieId, name.trim());
        }
    },

    confirmDeletePie(pieId) {
        const name = DataModel.getPieName(pieId);
        if (confirm(`Delete "${name}" and all its data? This cannot be undone.`)) {
            App.deletePie(pieId);
        }
    }
};
