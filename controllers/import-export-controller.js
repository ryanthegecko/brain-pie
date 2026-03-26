// Import/Export Controller — Import wizard, export wizard, and helpers
Object.assign(UI, {
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

        // Show source and target pie context
        const sourcePie = ImportManager.importData?.pieName;
        const targetPie = DataModel.currentPieName || 'My Pie';
        if (sourcePie) {
            html += `<div style="font-size:13px;color:#666;margin-bottom:10px;padding:6px 10px;background:#f5f5f5;border-radius:6px;">Importing from <strong>${this.escapeHtml(sourcePie)}</strong> into <strong>${this.escapeHtml(targetPie)}</strong></div>`;
        } else {
            html += `<div style="font-size:13px;color:#666;margin-bottom:10px;padding:6px 10px;background:#f5f5f5;border-radius:6px;">Importing into <strong>${this.escapeHtml(targetPie)}</strong></div>`;
        }

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
        const targetPie = DataModel.currentPieName || 'My Pie';
        if (!confirm(`This will completely replace all data in "${targetPie}" with the imported data. Continue?`)) {
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
        // Ensure data is normalized (Firebase may convert arrays to objects)
        DataModel.normalizeAllSpokes();

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
            const items = !category.items ? [] : Array.isArray(category.items) ? category.items : Object.values(category.items);
            for (const item of items) {
                if (!item.subItems) continue;

                for (let spokeIdx = 0; spokeIdx < item.subItems.length; spokeIdx++) {
                    const spoke = item.subItems[spokeIdx];
                    if (typeof spoke !== 'object' || !spoke.children) continue;

                    for (let actionIdx = 0; actionIdx < spoke.children.length; actionIdx++) {
                        const action = spoke.children[actionIdx];
                        if (action.scheduled &&
                            action.scheduled.date &&
                            (action.scheduled.time || action.scheduled.allDay) &&
                            !action.scheduled.calendarEventId) {
                            // Create unique key based on action text and schedule
                            const key = `${action.text}|${action.scheduled.date}|${action.scheduled.time || 'allday'}`;
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
        const exportData = {
            pieName: DataModel.currentPieName || 'My Pie',
            categories: []
        };

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
    }

});
