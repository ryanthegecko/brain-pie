// Tasks Import Controller — Google Tasks import wizard
Object.assign(UI, {
    // ========================================
    // Google Tasks Import
    // ========================================

    tasksImportState: {
        lists: [],         // All Google Tasks lists
        selectedLists: new Set(),  // List IDs to import
        defaultListId: null,
        tasksByList: {},   // listId → [tasks]
        selected: new Set(),       // Task IDs selected for import (default list)
        parsed: {},        // taskId → parsed result (default list only)
        targets: {},       // taskId → { categoryId, itemId } (user overrides, default list)
        step: 1
    },

    updateTasksImportButton() {
        const btn = document.getElementById('tasks-import-btn');
        if (btn) {
            btn.style.display = (typeof TasksAdapter !== 'undefined' && TasksAdapter.isAvailable()) ? 'inline-block' : 'none';
        }
    },

    async showTasksImport() {
        if (typeof TasksAdapter === 'undefined' || !TasksAdapter.isAvailable()) {
            alert('Please sign in with Google first (Settings → Calendar Sync)');
            return;
        }

        // Reset state
        this.tasksImportState = {
            lists: [],
            selectedLists: new Set(),
            defaultListId: null,
            tasksByList: {},
            selected: new Set(),
            parsed: {},
            targets: {},
            step: 1
        };

        // Reset step display
        this.updateTasksImportSteps(1);

        // Reset completed toggle
        const completedCheckbox = document.getElementById('tasks-import-completed');
        if (completedCheckbox) completedCheckbox.checked = false;

        // Clear list
        document.getElementById('tasks-import-list').innerHTML = '';
        document.getElementById('tasks-import-lists').style.display = 'none';
        document.getElementById('tasks-import-controls').style.display = 'none';
        document.getElementById('tasks-import-continue-btn').disabled = true;

        // Show overlay
        document.getElementById('tasks-import-overlay').classList.add('active');

        // Close settings
        this.closeSettings();

        // Fetch lists and tasks
        await this.fetchGoogleTasks();
    },

    closeTasksImport() {
        document.getElementById('tasks-import-overlay').classList.remove('active');
    },

    async tasksImportReauth() {
        this.closeTasksImport();

        if (typeof FirebaseAdapter !== 'undefined' && FirebaseAdapter.hasCalendarAccess()) {
            // Force re-consent with new scopes via Firebase
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                provider.addScope('https://www.googleapis.com/auth/calendar.events');
                provider.addScope('https://www.googleapis.com/auth/tasks');
                provider.setCustomParameters({ prompt: 'consent' });

                const result = await FirebaseAdapter.auth.signInWithPopup(provider);
                if (result.credential) {
                    FirebaseAdapter.accessToken = result.credential.accessToken;
                    FirebaseAdapter.accessTokenExpiry = Date.now() + (55 * 60 * 1000);
                    FirebaseAdapter.saveTokenToLocal();
                }
                Storage.showStatus('Tasks access granted! Try importing again.');
                this.updateCalendarImportButton();
            } catch (e) {
                Debug.log('Tasks reauth error:', e);
                Storage.showStatus('Re-authentication cancelled');
            }
        } else if (typeof GoogleAuthAdapter !== 'undefined' && GoogleAuthAdapter.isSignedIn()) {
            // For standalone Google auth, sign out and re-sign in (GIS will prompt for new scopes)
            GoogleAuthAdapter.signOut();
            try {
                await GoogleAuthAdapter.signIn();
                Storage.showStatus('Tasks access granted! Try importing again.');
                this.updateCalendarImportButton();
            } catch (e) {
                Storage.showStatus('Sign-in cancelled');
            }
        }
    },

    async fetchGoogleTasks() {
        const showCompleted = document.getElementById('tasks-import-completed')?.checked || false;

        // Show loading
        document.getElementById('tasks-import-loading').style.display = 'block';
        document.getElementById('tasks-import-list').innerHTML = '';
        document.getElementById('tasks-import-lists').style.display = 'none';
        document.getElementById('tasks-import-controls').style.display = 'none';

        // Fetch all lists
        const lists = await TasksAdapter.getLists();

        if (!lists || lists.length === 0) {
            document.getElementById('tasks-import-loading').style.display = 'none';
            if (TasksAdapter.lastError === 'scope') {
                document.getElementById('tasks-import-list').innerHTML =
                    `<div style="padding:20px; text-align:center;">
                        <p style="color:#e65100; margin-bottom:12px;">Google Tasks API access denied (403).</p>
                        <p style="color:#666; font-size:13px; margin-bottom:8px;"><strong>Most likely:</strong> The Tasks API is not enabled in your Google Cloud project.</p>
                        <p style="color:#666; font-size:13px; margin-bottom:12px;">Go to <a href="https://console.cloud.google.com/apis/library/tasks.googleapis.com" target="_blank" rel="noopener noreferrer">Google Cloud Console → Tasks API</a> and click <strong>Enable</strong>.</p>
                        <p style="color:#999; font-size:12px; margin-bottom:12px;">If already enabled, try re-authenticating to grant the Tasks scope:</p>
                        <button class="secondary" onclick="UI.tasksImportReauth()">Re-authenticate</button>
                    </div>`;
            } else {
                document.getElementById('tasks-import-list').innerHTML =
                    '<div style="padding:20px; text-align:center; color:#999;">No task lists found. Please try again.</div>';
            }
            return;
        }

        this.tasksImportState.lists = lists;
        this.tasksImportState.defaultListId = lists[0].id;

        // Pre-select the default list
        if (!this.tasksImportState.selectedLists.size) {
            this.tasksImportState.selectedLists = new Set([lists[0].id]);
        }

        // Fetch tasks for all selected lists
        const existingIds = DataModel.getExistingGoogleTaskIds();

        for (const list of lists) {
            if (this.tasksImportState.selectedLists.has(list.id)) {
                const tasks = await TasksAdapter.listTasks(list.id, showCompleted);
                const filtered = tasks ? tasks.filter(t => !existingIds.has(t.id)) : [];
                this.tasksImportState.tasksByList[list.id] = filtered;
            } else {
                this.tasksImportState.tasksByList[list.id] = null; // Not fetched
            }
        }

        document.getElementById('tasks-import-loading').style.display = 'none';

        // Parse default list tasks
        this.tasksImportState.selected = new Set();
        this.tasksImportState.parsed = {};
        const defaultTasks = this.tasksImportState.tasksByList[this.tasksImportState.defaultListId] || [];
        for (const task of defaultTasks) {
            this.tasksImportState.parsed[task.id] = this.parseTaskName(task.title || '');
        }

        // Render list selector and task list
        this.renderTasksListSelector();
        this.renderTasksList();
    },

    renderTasksListSelector() {
        const container = document.getElementById('tasks-import-lists');
        const lists = this.tasksImportState.lists;

        if (lists.length <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        let html = '<h3 style="margin:8px 0 6px; font-size:14px;">Task lists</h3>';

        for (const list of lists) {
            const isDefault = list.id === this.tasksImportState.defaultListId;
            const isChecked = this.tasksImportState.selectedLists.has(list.id);
            const taskCount = this.tasksImportState.tasksByList[list.id]?.length;
            const countLabel = taskCount != null ? ` (${taskCount} task${taskCount !== 1 ? 's' : ''})` : '';
            const defaultLabel = isDefault ? ' <span style="color:#4CAF50; font-size:11px;">DEFAULT — parsed into current pie</span>' : ' <span style="color:#FF9800; font-size:11px;">→ new pie</span>';

            const lid = list.id.replace(/'/g, "\\'");
            html += `<label class="radio-option" style="display:block; margin:3px 0;">
                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="UI.toggleTaskList('${lid}')">
                <span><strong>${this.escapeHtml(list.title)}</strong>${countLabel}${defaultLabel}</span>
            </label>`;
        }

        container.innerHTML = html;
    },

    async toggleTaskList(listId) {
        if (this.tasksImportState.selectedLists.has(listId)) {
            this.tasksImportState.selectedLists.delete(listId);
            this.tasksImportState.tasksByList[listId] = null;
        } else {
            this.tasksImportState.selectedLists.add(listId);

            // Fetch tasks for this list if not already fetched
            if (!this.tasksImportState.tasksByList[listId]) {
                const showCompleted = document.getElementById('tasks-import-completed')?.checked || false;
                document.getElementById('tasks-import-loading').style.display = 'block';
                const tasks = await TasksAdapter.listTasks(listId, showCompleted);
                const existingIds = DataModel.getExistingGoogleTaskIds();
                this.tasksImportState.tasksByList[listId] = tasks ? tasks.filter(t => !existingIds.has(t.id)) : [];
                document.getElementById('tasks-import-loading').style.display = 'none';
            }
        }

        this.renderTasksListSelector();
        this.renderTasksList();
    },

    /**
     * Parse a task title into Category / Slice / Spoke using greedy matching.
     * Format: "Category Slice SpokeName"
     */
    parseTaskName(title) {
        const words = title.trim().split(/\s+/);
        if (words.length === 0 || (words.length === 1 && !words[0])) {
            return {
                categoryId: null, categoryName: 'Imported',
                itemId: null, itemName: title || 'Task',
                spokeName: title || 'Task',
                isNewCategory: true, isNewSlice: true
            };
        }

        const categories = DataModel.categories;

        // Try matching category (greedy: longest match first)
        let catMatch = null, catWords = 0;
        for (let n = Math.min(words.length, 4); n >= 1; n--) {
            const candidate = words.slice(0, n).join(' ');
            const cat = categories.find(c => c.name.toLowerCase() === candidate.toLowerCase());
            if (cat) { catMatch = cat; catWords = n; break; }
        }

        if (!catMatch) {
            // No category match → whole title as a slice in "Imported" (no spoke)
            return {
                categoryId: null, categoryName: 'Imported',
                itemId: null, itemName: title.trim(),
                spokeName: null,
                isNewCategory: true, isNewSlice: true
            };
        }

        // Try matching slice within matched category
        const remaining = words.slice(catWords);
        if (remaining.length === 0) {
            // Only category name, nothing else
            return {
                categoryId: catMatch.id, categoryName: catMatch.name,
                itemId: null, itemName: catMatch.name,
                spokeName: catMatch.name,
                isNewCategory: false, isNewSlice: true
            };
        }

        let sliceMatch = null, sliceWords = 0;
        for (let n = Math.min(remaining.length, 4); n >= 1; n--) {
            const candidate = remaining.slice(0, n).join(' ');
            const item = catMatch.items.find(i => i.name.toLowerCase() === candidate.toLowerCase());
            if (item) { sliceMatch = item; sliceWords = n; break; }
        }

        if (sliceMatch) {
            const spokeName = remaining.slice(sliceWords).join(' ') || sliceMatch.name;
            return {
                categoryId: catMatch.id, categoryName: catMatch.name,
                itemId: sliceMatch.id, itemName: sliceMatch.name,
                spokeName: spokeName,
                isNewCategory: false, isNewSlice: false
            };
        }

        // Category matched but no slice → next word = new slice
        const sliceName = remaining[0] || 'General';
        const spokeName = remaining.length > 1 ? remaining.slice(1).join(' ') : sliceName;
        return {
            categoryId: catMatch.id, categoryName: catMatch.name,
            itemId: null, itemName: sliceName,
            spokeName: spokeName,
            isNewCategory: false, isNewSlice: true
        };
    },

    renderTasksList() {
        const container = document.getElementById('tasks-import-list');
        const defaultListId = this.tasksImportState.defaultListId;
        const selectedLists = this.tasksImportState.selectedLists;

        // Collect all visible tasks: default list tasks (individually selectable)
        // and non-default list tasks (selected with their list)
        let html = '';
        let totalCount = 0;

        // Default list tasks (with individual selection + parsing)
        if (selectedLists.has(defaultListId)) {
            const defaultTasks = this.tasksImportState.tasksByList[defaultListId] || [];
            if (defaultTasks.length > 0) {
                const defaultListName = this.tasksImportState.lists.find(l => l.id === defaultListId)?.title || 'My Tasks';
                html += `<div style="font-weight:600; font-size:13px; padding:8px 0 4px; color:#333; border-bottom:1px solid #eee; margin-bottom:4px;">
                    📋 ${this.escapeHtml(defaultListName)} — parsed into current pie
                </div>`;

                for (const task of defaultTasks) {
                    html += this.renderDefaultListTask(task);
                    totalCount++;
                }
            }
        }

        // Non-default lists (all tasks imported as flat slices in new pies)
        for (const list of this.tasksImportState.lists) {
            if (list.id === defaultListId) continue;
            if (!selectedLists.has(list.id)) continue;

            const tasks = this.tasksImportState.tasksByList[list.id] || [];
            if (tasks.length === 0) continue;

            html += `<div style="font-weight:600; font-size:13px; padding:8px 0 4px; color:#333; border-bottom:1px solid #eee; margin-bottom:4px; margin-top:12px;">
                📋 ${this.escapeHtml(list.title)} → new pie "${this.escapeHtml(list.title)}"
                <span style="color:#FF9800; font-size:11px;">(${tasks.length} task${tasks.length !== 1 ? 's' : ''} as slices in "Imported" category)</span>
            </div>`;

            for (const task of tasks) {
                const hasDue = !!task.due;
                const dueInfo = hasDue ? ` · Due: ${this.formatDateReadable(task.due.split('T')[0])}` : '';
                const isCompleted = task.status === 'completed';

                html += `<div class="cal-import-event" style="opacity:0.85; cursor:default;">
                    <div class="cal-import-event-info">
                        <div class="cal-import-event-title">${this.escapeHtml(task.title || '(No title)')}</div>
                        <div class="cal-import-event-detail">→ Slice in Imported category${dueInfo}${isCompleted ? ' · ✓ Completed' : ''}</div>
                    </div>
                </div>`;
                totalCount++;
            }
        }

        if (totalCount === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">No new tasks found in selected lists.</div>';
            document.getElementById('tasks-import-controls').style.display = 'none';
            return;
        }

        // Show controls only for default list
        const defaultTasks = this.tasksImportState.tasksByList[defaultListId] || [];
        if (selectedLists.has(defaultListId) && defaultTasks.length > 0) {
            document.getElementById('tasks-import-controls').style.display = 'block';
            document.getElementById('tasks-import-count').textContent = `${defaultTasks.length} task${defaultTasks.length !== 1 ? 's' : ''} in default list`;
        } else {
            document.getElementById('tasks-import-controls').style.display = 'none';
        }

        container.innerHTML = html;
        this.updateTasksImportContinueBtn();
    },

    renderDefaultListTask(task) {
        const isSelected = this.tasksImportState.selected.has(task.id);
        const parsed = this.tasksImportState.parsed[task.id];
        const target = this.tasksImportState.targets[task.id];
        const isCompleted = task.status === 'completed';
        const hasDue = !!task.due;

        const catClass = parsed.isNewCategory ? 'task-parsed-new' : 'task-parsed-match';
        const sliceClass = parsed.isNewSlice ? 'task-parsed-new' : 'task-parsed-match';

        let displayCatName = parsed.categoryName;
        let displaySliceName = parsed.itemName;
        if (target) {
            const cat = DataModel.categories.find(c => c.id === target.categoryId);
            if (cat) displayCatName = cat.name;
            const item = cat?.items.find(i => i.id === target.itemId);
            if (item) displaySliceName = item.name;
        }

        const typeLabel = hasDue ? 'Single (scheduled)' : 'Static';
        const dueInfo = hasDue ? ` · Due: ${this.formatDateReadable(task.due.split('T')[0])}` : '';

        // Category dropdown
        let catOptions = '<option value="">Imported (new)</option>';
        for (const cat of DataModel.categories) {
            const selCatId = target?.categoryId || parsed.categoryId;
            const sel = cat.id === selCatId ? ' selected' : '';
            catOptions += `<option value="${cat.id}"${sel}>${this.escapeHtml(cat.name)}</option>`;
        }

        // Slice dropdown
        let sliceOptions = '';
        const activeCatId = target?.categoryId || parsed.categoryId;
        const activeCat = DataModel.categories.find(c => c.id === activeCatId);
        if (activeCat) {
            sliceOptions += `<option value="">${this.escapeHtml(parsed.itemName)} (new)</option>`;
            for (const item of activeCat.items) {
                const selItemId = target?.itemId || parsed.itemId;
                const sel = item.id === selItemId ? ' selected' : '';
                sliceOptions += `<option value="${item.id}"${sel}>${this.escapeHtml(item.name)}</option>`;
            }
        } else {
            sliceOptions = `<option value="">${this.escapeHtml(parsed.itemName)} (new)</option>`;
        }

        const tid = task.id.replace(/'/g, "\\'");

        return `<div class="cal-import-event ${isSelected ? 'selected' : ''}" onclick="UI.toggleTaskSelection('${tid}')">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); UI.toggleTaskSelection('${tid}')">
            <div class="cal-import-event-info">
                <div class="cal-import-event-title">
                    <span class="${catClass}">${this.escapeHtml(displayCatName)}</span>
                    <span class="task-parsed-arrow">/</span>
                    <span class="${sliceClass}">${this.escapeHtml(displaySliceName)}</span>
                    ${parsed.spokeName ? `<span class="task-parsed-arrow">→</span><span class="task-parsed-spoke">${this.escapeHtml(parsed.spokeName)}</span>` : ''}
                </div>
                <div class="cal-import-event-detail">${typeLabel}${dueInfo}${isCompleted ? ' · ✓ Completed' : ''}</div>
                <div class="tasks-import-task-target" onclick="event.stopPropagation()">
                    <select onchange="UI.changeTaskCategory('${tid}', this.value)">${catOptions}</select>
                    <button class="small secondary" onclick="UI.tasksImportNewCategoryForTask('${tid}')">+</button>
                    <span>/</span>
                    <select id="tasks-import-slice-${task.id}" onchange="UI.changeTaskSlice('${tid}', this.value)">${sliceOptions}</select>
                    <button class="small secondary" onclick="UI.tasksImportNewSliceForTask('${tid}')">+</button>
                </div>
            </div>
            <span class="cal-import-event-badge">${hasDue ? '📅' : '📌'} ${typeLabel.split(' ')[0]}</span>
        </div>`;
    },

    toggleTaskSelection(taskId) {
        if (this.tasksImportState.selected.has(taskId)) {
            this.tasksImportState.selected.delete(taskId);
        } else {
            this.tasksImportState.selected.add(taskId);
        }
        this.renderTasksList();
    },

    tasksImportSelectAll() {
        const defaultTasks = this.tasksImportState.tasksByList[this.tasksImportState.defaultListId] || [];
        for (const task of defaultTasks) {
            this.tasksImportState.selected.add(task.id);
        }
        this.renderTasksList();
    },

    tasksImportDeselectAll() {
        this.tasksImportState.selected.clear();
        this.renderTasksList();
    },

    updateTasksImportContinueBtn() {
        const btn = document.getElementById('tasks-import-continue-btn');
        // Enable if any default list tasks selected OR any non-default lists are selected
        const hasDefaultSelected = this.tasksImportState.selected.size > 0;
        const hasOtherLists = Array.from(this.tasksImportState.selectedLists)
            .some(id => id !== this.tasksImportState.defaultListId &&
                (this.tasksImportState.tasksByList[id]?.length || 0) > 0);
        btn.disabled = !hasDefaultSelected && !hasOtherLists;
    },

    changeTaskCategory(taskId, categoryId) {
        if (!this.tasksImportState.targets[taskId]) {
            const parsed = this.tasksImportState.parsed[taskId];
            this.tasksImportState.targets[taskId] = {
                categoryId: parsed.categoryId,
                itemId: parsed.itemId
            };
        }
        const target = this.tasksImportState.targets[taskId];
        target.categoryId = categoryId || null;

        if (categoryId) {
            const cat = DataModel.categories.find(c => c.id === categoryId);
            target.itemId = cat?.items[0]?.id || null;
        } else {
            target.itemId = null;
        }

        this.renderTasksList();
    },

    changeTaskSlice(taskId, itemId) {
        if (!this.tasksImportState.targets[taskId]) {
            const parsed = this.tasksImportState.parsed[taskId];
            this.tasksImportState.targets[taskId] = {
                categoryId: parsed.categoryId,
                itemId: parsed.itemId
            };
        }
        this.tasksImportState.targets[taskId].itemId = itemId || null;
    },

    tasksImportNewCategoryForTask(taskId) {
        const name = prompt('New category name:');
        if (!name || !name.trim()) return;
        const catId = DataModel.addCategory(name.trim(), '#4CAF50');
        const itemId = DataModel.addItem(catId, 'General', 100, '#2196F3');
        this.tasksImportState.targets[taskId] = { categoryId: catId, itemId: itemId };
        this.renderTasksList();
        App.render();
    },

    tasksImportNewSliceForTask(taskId) {
        const target = this.tasksImportState.targets[taskId] || this.tasksImportState.parsed[taskId];
        const catId = target?.categoryId;
        if (!catId) {
            alert('Please select a category first');
            return;
        }
        const name = prompt('New slice name:');
        if (!name || !name.trim()) return;
        const itemId = DataModel.addItem(catId, name.trim(), 20, '#2196F3');
        if (!this.tasksImportState.targets[taskId]) {
            this.tasksImportState.targets[taskId] = { categoryId: catId, itemId: null };
        }
        this.tasksImportState.targets[taskId].itemId = itemId;
        this.renderTasksList();
        App.render();
    },

    // --- Step navigation ---

    updateTasksImportSteps(step) {
        this.tasksImportState.step = step;

        document.querySelectorAll('#tasks-import-steps .import-step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove('active', 'completed');
            if (s === step) el.classList.add('active');
            else if (s < step) el.classList.add('completed');
        });

        document.querySelectorAll('#tasks-import-overlay .cal-import-step-content').forEach(el => el.classList.remove('active'));
        document.getElementById(`tasks-import-step-${step}`).classList.add('active');
    },

    tasksImportNextStep() {
        const hasDefaultSelected = this.tasksImportState.selected.size > 0;
        const hasOtherLists = Array.from(this.tasksImportState.selectedLists)
            .some(id => id !== this.tasksImportState.defaultListId &&
                (this.tasksImportState.tasksByList[id]?.length || 0) > 0);

        if (!hasDefaultSelected && !hasOtherLists) {
            alert('Please select at least one task or task list');
            return;
        }

        // Resolve targets for default list tasks
        for (const taskId of this.tasksImportState.selected) {
            const target = this.tasksImportState.targets[taskId];
            const parsed = this.tasksImportState.parsed[taskId];

            if (!target) {
                this.tasksImportState.targets[taskId] = {
                    categoryId: parsed.categoryId,
                    itemId: parsed.itemId,
                    newCategoryName: parsed.isNewCategory ? parsed.categoryName : null,
                    newSliceName: parsed.isNewSlice ? parsed.itemName : null,
                    spokeName: parsed.spokeName
                };
            } else {
                target.spokeName = parsed.spokeName;
                if (!target.categoryId) {
                    target.newCategoryName = parsed.categoryName;
                }
                if (!target.itemId) {
                    target.newSliceName = parsed.itemName;
                }
            }
        }

        this.updateTasksImportSteps(2);
        this.renderTasksImportReview();
    },

    tasksImportPrevStep() {
        this.updateTasksImportSteps(1);
    },

    // --- Step 2: Review ---

    renderTasksImportReview() {
        const container = document.getElementById('tasks-import-review');
        const defaultListId = this.tasksImportState.defaultListId;

        let html = '';

        // Default list tasks — grouped by target
        const defaultTasks = (this.tasksImportState.tasksByList[defaultListId] || [])
            .filter(t => this.tasksImportState.selected.has(t.id));

        if (defaultTasks.length > 0) {
            const groups = {};
            for (const task of defaultTasks) {
                const target = this.tasksImportState.targets[task.id];
                const parsed = this.tasksImportState.parsed[task.id];
                const catName = target?.categoryId
                    ? (DataModel.categories.find(c => c.id === target.categoryId)?.name || 'Unknown')
                    : (target?.newCategoryName || parsed.categoryName);
                const sliceName = target?.itemId
                    ? (DataModel.categories.find(c => c.id === target.categoryId)?.items.find(i => i.id === target.itemId)?.name || 'Unknown')
                    : (target?.newSliceName || parsed.itemName);

                const key = `${catName}|||${sliceName}`;
                if (!groups[key]) groups[key] = { catName, sliceName, tasks: [] };
                groups[key].tasks.push({ task, parsed, target });
            }

            html += `<p style="color:#333; font-weight:600; margin-bottom:8px;">Default list → Current pie (${defaultTasks.length} task${defaultTasks.length !== 1 ? 's' : ''})</p>`;

            for (const key of Object.keys(groups)) {
                const group = groups[key];
                html += `<div class="cal-import-review-item" style="margin-bottom:8px;">
                    <div style="font-weight:600; margin-bottom:2px; font-size:13px;">
                        <span class="task-parsed-match">${this.escapeHtml(group.catName)}</span>
                        <span class="task-parsed-arrow">/</span>
                        <span class="task-parsed-match">${this.escapeHtml(group.sliceName)}</span>
                    </div>`;

                for (const { task, parsed } of group.tasks) {
                    const hasDue = !!task.due;
                    const dueInfo = hasDue ? ` · ${this.formatDateReadable(task.due.split('T')[0])}` : '';
                    if (parsed.spokeName) {
                        const typeLabel = hasDue ? 'Single' : 'Static';
                        html += `<div style="padding:1px 0 1px 12px; font-size:13px;">
                            → <strong>${this.escapeHtml(parsed.spokeName)}</strong>
                            <span style="color:#999; font-size:12px;">(${typeLabel}${dueInfo})</span>
                        </div>`;
                    } else {
                        html += `<div style="padding:1px 0 1px 12px; font-size:13px;">
                            <span style="color:#999; font-size:12px;">(slice only${dueInfo})</span>
                        </div>`;
                    }
                }

                html += `</div>`;
            }
        }

        // Non-default lists → new pies
        for (const list of this.tasksImportState.lists) {
            if (list.id === defaultListId) continue;
            if (!this.tasksImportState.selectedLists.has(list.id)) continue;

            const tasks = this.tasksImportState.tasksByList[list.id] || [];
            if (tasks.length === 0) continue;

            html += `<p style="color:#FF9800; font-weight:600; margin:12px 0 6px;">📋 "${this.escapeHtml(list.title)}" → New pie (${tasks.length} task${tasks.length !== 1 ? 's' : ''})</p>`;
            html += `<div style="padding-left:12px; font-size:13px; color:#666;">`;
            for (const task of tasks) {
                html += `<div style="padding:1px 0;">• ${this.escapeHtml(task.title || '(No title)')}</div>`;
            }
            html += `</div>`;
        }

        // Count total
        let totalCount = defaultTasks.length;
        for (const list of this.tasksImportState.lists) {
            if (list.id === defaultListId) continue;
            if (!this.tasksImportState.selectedLists.has(list.id)) continue;
            totalCount += (this.tasksImportState.tasksByList[list.id] || []).length;
        }

        const btn = document.getElementById('tasks-import-execute-btn');
        btn.textContent = `Import ${totalCount} Task${totalCount !== 1 ? 's' : ''}`;

        container.innerHTML = html;
    },

    // --- Execute import ---

    async executeTasksImport() {
        const defaultListId = this.tasksImportState.defaultListId;
        const deleteAfter = document.getElementById('tasks-import-delete-after')?.checked || false;
        let imported = 0;
        const tasksToDelete = []; // { listId, taskId }

        // --- Import default list tasks into current pie ---
        const defaultTasks = (this.tasksImportState.tasksByList[defaultListId] || [])
            .filter(t => this.tasksImportState.selected.has(t.id));

        if (defaultTasks.length > 0) {
            // First pass: create needed categories and slices
            const createdCategories = {};
            const createdSlices = {};

            for (const task of defaultTasks) {
                const target = this.tasksImportState.targets[task.id];
                if (!target) continue;

                if (!target.categoryId && target.newCategoryName) {
                    const cacheKey = target.newCategoryName.toLowerCase();
                    if (!createdCategories[cacheKey]) {
                        createdCategories[cacheKey] = DataModel.addCategory(target.newCategoryName, '#4CAF50');
                    }
                    target.categoryId = createdCategories[cacheKey];
                }

                if (target.categoryId && !target.itemId && target.newSliceName) {
                    const cacheKey = `${target.categoryId}|||${target.newSliceName.toLowerCase()}`;
                    if (!createdSlices[cacheKey]) {
                        createdSlices[cacheKey] = DataModel.addItem(target.categoryId, target.newSliceName, 20, '#2196F3');
                    }
                    target.itemId = createdSlices[cacheKey];
                }
            }

            // Second pass: create spokes (or slice-only for unmatched tasks)
            for (const task of defaultTasks) {
                const target = this.tasksImportState.targets[task.id];
                const parsed = this.tasksImportState.parsed[task.id];
                if (!target?.categoryId || !target?.itemId) continue;

                const spokeName = target.spokeName || parsed.spokeName;

                if (!spokeName) {
                    // No spoke — slice-only import (unmatched task title = slice name)
                    // Store googleTaskId on the slice for dedup
                    const category = DataModel.categories.find(c => c.id === target.categoryId);
                    const item = category?.items.find(i => i.id === target.itemId);
                    if (item) {
                        if (!item.metadata) item.metadata = {};
                        item.metadata.googleTaskId = task.id;
                    }
                } else {
                    // Matched task — create spoke
                    const hasDue = !!task.due;
                    const spokeType = hasDue ? 'single' : 'static';

                    DataModel.addSubItem(target.categoryId, target.itemId, spokeName, spokeType);

                    const category = DataModel.categories.find(c => c.id === target.categoryId);
                    const item = category?.items.find(i => i.id === target.itemId);
                    if (item) {
                        const spokeIndex = item.subItems.length - 1;
                        const spoke = item.subItems[spokeIndex];

                        if (typeof spoke === 'object') {
                            if (!spoke.metadata) spoke.metadata = {};
                            spoke.metadata.googleTaskId = task.id;
                        }

                        if (hasDue) {
                            DataModel.setSpokeSchedule(target.categoryId, target.itemId, spokeIndex, {
                                date: task.due.split('T')[0],
                                time: null,
                                duration: null,
                                allDay: true,
                                calendarEventId: null
                            });
                        }
                    }
                }

                imported++;
                if (deleteAfter) tasksToDelete.push({ listId: defaultListId, taskId: task.id });
            }

            DataModel.saveToStorage();
        }

        // --- Import non-default lists as new pies ---
        const originalPieId = DataModel.getActivePieId();

        for (const list of this.tasksImportState.lists) {
            if (list.id === defaultListId) continue;
            if (!this.tasksImportState.selectedLists.has(list.id)) continue;

            const tasks = this.tasksImportState.tasksByList[list.id] || [];
            if (tasks.length === 0) continue;

            // Create new pie
            const pieId = await DataModel.createPie(list.title);
            await DataModel.switchPie(pieId);

            // Create "Imported" category
            const catId = DataModel.addCategory('Imported', '#9C27B0');

            // Each task becomes a slice with a single spoke (the task title)
            for (const task of tasks) {
                const sliceName = task.title || 'Untitled';
                const itemId = DataModel.addItem(catId, sliceName, 20, '#2196F3');

                // Add a spoke with the task title
                DataModel.addSubItem(catId, itemId, sliceName, task.due ? 'single' : 'static');

                const category = DataModel.categories.find(c => c.id === catId);
                const item = category?.items.find(i => i.id === itemId);
                if (item) {
                    const spokeIndex = item.subItems.length - 1;
                    const spoke = item.subItems[spokeIndex];

                    if (typeof spoke === 'object') {
                        if (!spoke.metadata) spoke.metadata = {};
                        spoke.metadata.googleTaskId = task.id;
                    }

                    if (task.due) {
                        DataModel.setSpokeSchedule(catId, itemId, spokeIndex, {
                            date: task.due.split('T')[0],
                            time: null,
                            duration: null,
                            allDay: true,
                            calendarEventId: null
                        });
                    }
                }

                imported++;
                if (deleteAfter) tasksToDelete.push({ listId: list.id, taskId: task.id });
            }

            DataModel.saveToStorage();
        }

        // Switch back to original pie
        if (DataModel.getActivePieId() !== originalPieId) {
            await DataModel.switchPie(originalPieId);
        }

        // Optionally delete tasks from Google Tasks
        if (deleteAfter) {
            for (const { listId, taskId } of tasksToDelete) {
                await TasksAdapter.deleteTask(listId, taskId);
            }
        }

        this.closeTasksImport();
        ChartRenderer.init('chart-container');
        App.render();
        UI.renderPieTabs();

        Storage.showStatus(`Imported ${imported} task${imported !== 1 ? 's' : ''} from Google Tasks`);
    }

});
