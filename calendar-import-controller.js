// Calendar Import Controller — Google Calendar import wizard
Object.assign(UI, {
    // ==========================================
    // Calendar Import
    // ==========================================

    calImportState: {
        events: [],         // Fetched calendar events
        selected: new Set(), // Selected event IDs
        targets: {},        // Per-event target overrides: { eventId: { categoryId, itemId } }
        defaultCategoryId: null,
        defaultItemId: null,
        step: 1
    },

    /**
     * Show the calendar import overlay, fetch events
     */
    async showCalendarImport() {
        if (!CalendarAdapter.isGoogleSignedIn()) {
            alert('Please sign in with Google first (Settings → Calendar Sync)');
            return;
        }

        // Ensure we have a valid access token (may trigger re-auth popup)
        if (!CalendarAdapter.isAvailable()) {
            const ok = await CalendarAdapter.ensureAccessToken();
            if (!ok) {
                alert('Could not refresh Google access. Please sign in again.');
                return;
            }
        }

        // Reset state
        this.calImportState = {
            events: [],
            selected: new Set(),
            targets: {},
            defaultCategoryId: null,
            defaultItemId: null,
            step: 1
        };

        // Populate category dropdown
        this.populateCalImportCategoryDropdown();

        // Reset step display
        this.updateCalImportSteps(1);

        // Reset range selection
        const radios = document.querySelectorAll('input[name="cal-import-range"]');
        radios.forEach(r => { r.checked = r.value === '30'; });
        document.getElementById('cal-import-custom-range').style.display = 'none';

        // Clear event list
        document.getElementById('cal-import-event-list').innerHTML = '';
        document.getElementById('cal-import-event-controls').style.display = 'none';
        document.getElementById('cal-import-continue-btn').disabled = true;

        // Show overlay
        document.getElementById('calendar-import-overlay').classList.add('active');

        // Close settings
        this.closeSettings();

        // Fetch events for default range (30 days)
        await this.fetchCalendarEvents();
    },

    closeCalendarImport() {
        document.getElementById('calendar-import-overlay').classList.remove('active');
    },

    calendarImportRangeChanged() {
        const value = document.querySelector('input[name="cal-import-range"]:checked').value;
        document.getElementById('cal-import-custom-range').style.display = value === 'custom' ? 'flex' : 'none';

        if (value !== 'custom') {
            this.fetchCalendarEvents();
        }
    },

    async fetchCalendarEvents() {
        const rangeValue = document.querySelector('input[name="cal-import-range"]:checked').value;
        let timeMin, timeMax;
        const now = new Date();

        if (rangeValue === 'custom') {
            const from = document.getElementById('cal-import-date-from').value;
            const to = document.getElementById('cal-import-date-to').value;
            if (!from || !to) {
                alert('Please select both start and end dates');
                return;
            }
            timeMin = from;
            timeMax = to;
        } else {
            const days = parseInt(rangeValue);
            const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            timeMin = past.toISOString().split('T')[0];
            timeMax = now.toISOString().split('T')[0];
        }

        // Show loading
        document.getElementById('cal-import-loading').style.display = 'block';
        document.getElementById('cal-import-event-list').innerHTML = '';
        document.getElementById('cal-import-event-controls').style.display = 'none';

        const events = await CalendarAdapter.listEvents(timeMin, timeMax);

        document.getElementById('cal-import-loading').style.display = 'none';

        if (!events) {
            document.getElementById('cal-import-event-list').innerHTML =
                '<div style="padding:20px; text-align:center; color:#999;">Failed to fetch events. Please try again.</div>';
            return;
        }

        // Filter out events already tracked in Brain Pie
        const existingIds = DataModel.getExistingCalendarEventIds();
        const filtered = events.filter(e => !existingIds.has(e.id));

        this.calImportState.events = filtered;
        this.calImportState.selected = new Set();

        this.renderCalendarEventList();
    },

    renderCalendarEventList() {
        const container = document.getElementById('cal-import-event-list');
        const events = this.calImportState.events;

        if (events.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">No new events found in this time range.</div>';
            document.getElementById('cal-import-event-controls').style.display = 'none';
            return;
        }

        document.getElementById('cal-import-event-controls').style.display = 'block';
        document.getElementById('cal-import-count').textContent = `${events.length} event${events.length !== 1 ? 's' : ''} found`;

        let html = '';
        for (const event of events) {
            const isSelected = this.calImportState.selected.has(event.id);
            const isRecurring = event.recurrence && event.recurrence.length > 0;
            const detail = this.formatCalEventDetail(event);

            html += `<div class="cal-import-event ${isSelected ? 'selected' : ''}" onclick="UI.toggleCalendarEventSelection('${event.id}')">
                <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); UI.toggleCalendarEventSelection('${event.id}')">
                <div class="cal-import-event-info">
                    <div class="cal-import-event-title">${this.escapeHtml(event.summary || '(No title)')}</div>
                    <div class="cal-import-event-detail">${detail}</div>
                </div>
                ${isRecurring ? '<span class="cal-import-event-badge recurring">🔁 Recurring</span>' : '<span class="cal-import-event-badge">📅 One-time</span>'}
            </div>`;
        }

        container.innerHTML = html;
        this.updateCalImportContinueBtn();
    },

    formatCalEventDetail(event) {
        if (event.recurrence && event.recurrence.length > 0) {
            // Recurring event — show recurrence summary
            const rrule = event.recurrence.find(r => r.startsWith('RRULE:')) || event.recurrence[0];
            const rec = CalendarAdapter.parseRecurrence(rrule, event);
            return this.formatRecurrenceSummary(rec);
        }

        // One-time event
        if (event.start?.date) {
            return this.formatDateReadable(event.start.date) + ' (all day)';
        }
        if (event.start?.dateTime) {
            const d = new Date(event.start.dateTime);
            return this.formatDateReadable(d.toISOString().split('T')[0]) + ', ' + this.formatTimeCompact(d.toTimeString().slice(0, 5));
        }
        return '';
    },

    formatRecurrenceSummary(rec) {
        const dayNames = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
        let parts = [];

        if (rec.frequency === 'DAILY') {
            parts.push(rec.interval > 1 ? `Every ${rec.interval} days` : 'Daily');
        } else if (rec.frequency === 'WEEKLY') {
            if (rec.byDay && rec.byDay.length > 0) {
                parts.push(rec.byDay.map(d => dayNames[d] || d).join(', '));
            } else {
                parts.push(rec.interval > 1 ? `Every ${rec.interval} weeks` : 'Weekly');
            }
        } else if (rec.frequency === 'MONTHLY') {
            parts.push(rec.interval > 1 ? `Every ${rec.interval} months` : 'Monthly');
        } else if (rec.frequency === 'YEARLY') {
            parts.push('Yearly');
        }

        if (rec.time && !rec.allDay) {
            parts.push(this.formatTimeCompact(rec.time));
        } else if (rec.allDay) {
            parts.push('(all day)');
        }

        return parts.join(' ');
    },

    formatDateReadable(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}`;
    },

    formatTimeCompact(time) {
        if (!time) return '';
        const [h, m] = time.split(':').map(Number);
        const suffix = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return m === 0 ? `${hour12}${suffix}` : `${hour12}:${String(m).padStart(2, '0')}${suffix}`;
    },

    toggleCalendarEventSelection(eventId) {
        if (this.calImportState.selected.has(eventId)) {
            this.calImportState.selected.delete(eventId);
        } else {
            this.calImportState.selected.add(eventId);
        }
        this.renderCalendarEventList();
    },

    calImportSelectAll() {
        for (const event of this.calImportState.events) {
            this.calImportState.selected.add(event.id);
        }
        this.renderCalendarEventList();
    },

    calImportDeselectAll() {
        this.calImportState.selected.clear();
        this.renderCalendarEventList();
    },

    updateCalImportContinueBtn() {
        const btn = document.getElementById('cal-import-continue-btn');
        btn.disabled = this.calImportState.selected.size === 0;
    },

    // --- Category/Slice target pickers ---

    populateCalImportCategoryDropdown() {
        const select = document.getElementById('cal-import-category');
        select.innerHTML = '<option value="">Select...</option>';
        DataModel.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            select.appendChild(opt);
        });

        // Reset slice dropdown
        const sliceSelect = document.getElementById('cal-import-slice');
        sliceSelect.innerHTML = '<option value="">Select category first...</option>';
        sliceSelect.disabled = true;
    },

    onCalImportCategoryChanged() {
        const catId = document.getElementById('cal-import-category').value;
        this.calImportState.defaultCategoryId = catId || null;
        this.calImportState.defaultItemId = null;

        const sliceSelect = document.getElementById('cal-import-slice');
        if (!catId) {
            sliceSelect.innerHTML = '<option value="">Select category first...</option>';
            sliceSelect.disabled = true;
            return;
        }

        const category = DataModel.categories.find(c => c.id === catId);
        sliceSelect.innerHTML = '<option value="">Select...</option>';
        if (category) {
            category.items.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.id;
                opt.textContent = item.name;
                sliceSelect.appendChild(opt);
            });
        }
        sliceSelect.disabled = false;
        sliceSelect.onchange = () => {
            this.calImportState.defaultItemId = sliceSelect.value || null;
        };
    },

    calImportNewCategory() {
        const name = prompt('New category name:');
        if (!name || !name.trim()) return;
        const catId = DataModel.addCategory(name.trim(), '#4CAF50');
        this.populateCalImportCategoryDropdown();
        document.getElementById('cal-import-category').value = catId;
        this.onCalImportCategoryChanged();
        App.render();
    },

    calImportNewSlice() {
        const catId = this.calImportState.defaultCategoryId;
        if (!catId) {
            alert('Please select a category first');
            return;
        }
        const name = prompt('New slice name:');
        if (!name || !name.trim()) return;
        const itemId = DataModel.addItem(catId, name.trim(), 20, '#2196F3');
        this.onCalImportCategoryChanged();
        document.getElementById('cal-import-slice').value = itemId;
        this.calImportState.defaultItemId = itemId;
        App.render();
    },

    // --- Step navigation ---

    updateCalImportSteps(step) {
        this.calImportState.step = step;

        document.querySelectorAll('#cal-import-steps .import-step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.remove('active', 'completed');
            if (s === step) el.classList.add('active');
            else if (s < step) el.classList.add('completed');
        });

        document.querySelectorAll('.cal-import-step-content').forEach(el => el.classList.remove('active'));
        document.getElementById(`cal-import-step-${step}`).classList.add('active');
    },

    calendarImportNextStep() {
        if (this.calImportState.selected.size === 0) {
            alert('Please select at least one event');
            return;
        }

        const catId = this.calImportState.defaultCategoryId;
        const itemId = this.calImportState.defaultItemId;
        if (!catId || !itemId) {
            alert('Please select a default category and slice first');
            return;
        }

        // Set default target for all selected events
        for (const eventId of this.calImportState.selected) {
            if (!this.calImportState.targets[eventId]) {
                this.calImportState.targets[eventId] = { categoryId: catId, itemId: itemId };
            }
        }

        this.updateCalImportSteps(2);
        this.renderCalendarImportReview();
    },

    calendarImportPrevStep() {
        this.updateCalImportSteps(1);
    },

    // --- Step 2: Review ---

    renderCalendarImportReview() {
        const container = document.getElementById('cal-import-review');
        const events = this.calImportState.events.filter(e => this.calImportState.selected.has(e.id));

        const btn = document.getElementById('cal-import-execute-btn');
        btn.textContent = `Import ${events.length} Event${events.length !== 1 ? 's' : ''}`;

        let html = `<p style="color:#666; margin-bottom:12px;">${events.length} event${events.length !== 1 ? 's' : ''} selected</p>`;

        for (const event of events) {
            const isRecurring = event.recurrence && event.recurrence.length > 0;
            const typeLabel = isRecurring ? 'Repeating' : (event.start?.date ? 'Single (all day)' : 'Single');
            const target = this.calImportState.targets[event.id];

            // Build category dropdown
            let catOptions = '';
            for (const cat of DataModel.categories) {
                const sel = cat.id === target?.categoryId ? ' selected' : '';
                catOptions += `<option value="${cat.id}"${sel}>${this.escapeHtml(cat.name)}</option>`;
            }

            // Build slice dropdown for current category
            let sliceOptions = '';
            const selectedCat = DataModel.categories.find(c => c.id === target?.categoryId);
            if (selectedCat) {
                for (const item of selectedCat.items) {
                    const sel = item.id === target?.itemId ? ' selected' : '';
                    sliceOptions += `<option value="${item.id}"${sel}>${this.escapeHtml(item.name)}</option>`;
                }
            }

            const eid = event.id;
            html += `<div class="cal-import-review-item">
                <div class="cal-import-review-title">${this.escapeHtml(event.summary || '(No title)')}</div>
                <div class="cal-import-review-type">${typeLabel}</div>
                <div class="cal-import-review-target">
                    <span>→</span>
                    <select onchange="UI.changeCalImportCategory('${eid}', this.value)">${catOptions}</select>
                    <button class="small secondary" onclick="UI.calImportNewCategoryForEvent('${eid}')">+</button>
                    <span>/</span>
                    <select id="cal-import-slice-${eid}" onchange="UI.changeCalImportSlice('${eid}', this.value)">${sliceOptions}</select>
                    <button class="small secondary" onclick="UI.calImportNewSliceForEvent('${eid}')">+</button>
                </div>
            </div>`;
        }

        container.innerHTML = html;
    },

    changeCalImportCategory(eventId, categoryId) {
        const target = this.calImportState.targets[eventId];
        if (target) {
            target.categoryId = categoryId;
            // Default to first slice in the new category
            const cat = DataModel.categories.find(c => c.id === categoryId);
            target.itemId = cat?.items[0]?.id || null;
        }

        // Rebuild slice dropdown for this event
        const sliceSelect = document.getElementById(`cal-import-slice-${eventId}`);
        if (sliceSelect) {
            const cat = DataModel.categories.find(c => c.id === categoryId);
            let opts = '';
            if (cat) {
                for (const item of cat.items) {
                    const sel = item.id === target?.itemId ? ' selected' : '';
                    opts += `<option value="${item.id}"${sel}>${this.escapeHtml(item.name)}</option>`;
                }
            }
            sliceSelect.innerHTML = opts;
        }
    },

    changeCalImportSlice(eventId, itemId) {
        const target = this.calImportState.targets[eventId];
        if (target) {
            target.itemId = itemId;
        }
    },

    calImportNewCategoryForEvent(eventId) {
        const name = prompt('New category name:');
        if (!name || !name.trim()) return;
        const catId = DataModel.addCategory(name.trim(), '#4CAF50');
        // Also create a default slice so the user has somewhere to put events
        const itemId = DataModel.addItem(catId, 'General', 100, '#2196F3');
        // Update this event's target
        this.calImportState.targets[eventId] = { categoryId: catId, itemId: itemId };
        // Re-render so all events can see the new category
        this.renderCalendarImportReview();
        App.render();
    },

    calImportNewSliceForEvent(eventId) {
        const target = this.calImportState.targets[eventId];
        if (!target?.categoryId) {
            alert('Please select a category first');
            return;
        }
        const name = prompt('New slice name:');
        if (!name || !name.trim()) return;
        const itemId = DataModel.addItem(target.categoryId, name.trim(), 20, '#2196F3');
        target.itemId = itemId;
        // Re-render so all events can see the new slice
        this.renderCalendarImportReview();
        App.render();
    },

    // --- Execute import ---

    async executeCalendarImport() {
        const events = this.calImportState.events.filter(e => this.calImportState.selected.has(e.id));
        let imported = 0;

        for (const event of events) {
            const target = this.calImportState.targets[event.id];
            if (!target) continue;

            const isRecurring = event.recurrence && event.recurrence.length > 0;
            const eventName = event.summary || 'Untitled Event';

            if (isRecurring) {
                // Create Repeating spoke
                DataModel.addSubItem(target.categoryId, target.itemId, eventName, 'repeating');

                // Find the newly added spoke (last in subItems)
                const category = DataModel.categories.find(c => c.id === target.categoryId);
                const item = category?.items.find(i => i.id === target.itemId);
                if (item) {
                    const spokeIndex = item.subItems.length - 1;
                    const rrule = event.recurrence.find(r => r.startsWith('RRULE:')) || event.recurrence[0];
                    const recurrence = CalendarAdapter.parseRecurrence(rrule, event);

                    // Build schedule data for repeating spoke
                    const startDate = event.start?.date || (event.start?.dateTime ? new Date(event.start.dateTime).toISOString().split('T')[0] : null);
                    const schedule = {
                        date: startDate,
                        time: recurrence.time || null,
                        duration: recurrence.duration || 60,
                        allDay: recurrence.allDay || false,
                        calendarEventId: event.id
                    };

                    DataModel.setSpokeSchedule(target.categoryId, target.itemId, spokeIndex, schedule);
                    DataModel.updateSpokeType(target.categoryId, target.itemId, spokeIndex, 'repeating', {
                        calendarEventId: event.id,
                        recurrence: recurrence
                    });
                }
            } else {
                // Create Single spoke
                DataModel.addSubItem(target.categoryId, target.itemId, eventName, 'single');

                const category = DataModel.categories.find(c => c.id === target.categoryId);
                const item = category?.items.find(i => i.id === target.itemId);
                if (item) {
                    const spokeIndex = item.subItems.length - 1;
                    const isAllDay = !!event.start?.date;

                    let date, time, duration;
                    if (isAllDay) {
                        date = event.start.date;
                        time = null;
                        duration = null;
                    } else {
                        const start = new Date(event.start.dateTime);
                        const end = event.end?.dateTime ? new Date(event.end.dateTime) : null;
                        date = start.toISOString().split('T')[0];
                        time = start.toTimeString().slice(0, 5);
                        duration = end ? Math.round((end - start) / 60000) : 60;
                    }

                    DataModel.setSpokeSchedule(target.categoryId, target.itemId, spokeIndex, {
                        date: date,
                        time: time || null,
                        duration: duration || null,
                        allDay: isAllDay,
                        calendarEventId: event.id
                    });
                }
            }

            imported++;
        }

        DataModel.saveToStorage();
        this.closeCalendarImport();
        App.render();

        Storage.showStatus(`Imported ${imported} calendar event${imported !== 1 ? 's' : ''}`);
    },

    /**
     * Update visibility of the calendar import button in Settings
     */
    updateCalendarImportButton() {
        const btn = document.getElementById('calendar-import-btn');
        if (btn) {
            btn.style.display = CalendarAdapter.isGoogleSignedIn() ? 'inline-block' : 'none';
        }
        this.updateTasksImportButton();
    }
});
