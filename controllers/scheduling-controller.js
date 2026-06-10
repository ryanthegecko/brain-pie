// Scheduling Controller — DateTime picker, calendar helpers, recurrence picker, spoke editor
Object.assign(UI, {
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
            if (existingSchedule.time) {
                const [hour, minute] = existingSchedule.time.split(':');
                document.getElementById('event-hour').value = hour;
                // Round minute to nearest 5-minute increment
                const roundedMinute = Math.round(parseInt(minute) / 5) * 5;
                document.getElementById('event-minute').value = String(roundedMinute).padStart(2, '0');
            } else {
                document.getElementById('event-hour').value = '09';
                document.getElementById('event-minute').value = '00';
            }
            document.getElementById('event-duration').value = existingSchedule.duration || '60';
            document.getElementById('event-location').value = existingSchedule.location || '';
            document.getElementById('event-notes').value = existingSchedule.notes || '';
            document.getElementById('event-invitees').value = (existingSchedule.invitees || []).join(', ');
            document.getElementById('event-allday').checked = !!existingSchedule.allDay;
            this.toggleAllDay();
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('event-date').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('event-hour').value = '09';
            document.getElementById('event-minute').value = '00';
            document.getElementById('event-duration').value = '60';
            document.getElementById('event-location').value = '';
            document.getElementById('event-notes').value = '';
            document.getElementById('event-invitees').value = '';
            document.getElementById('event-allday').checked = true;
            this.toggleAllDay();
        }

        // Update title, button text, and show reminder based on whether this is a reschedule
        const titleEl = document.getElementById('datetime-picker-title');
        const addButton = document.getElementById('calendar-submit-btn');
        const rescheduleReminder = document.getElementById('reschedule-reminder');

        if (titleEl) {
            const name = actionText || '';
            titleEl.textContent = existingSchedule ? `Reschedule: ${name}` : `Schedule: ${name}`;
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

        // Update star button state
        const dtStarBtn = document.getElementById('datetime-star-btn');
        if (dataLocation) {
            const starRef = dataLocation.childIndex != null
                ? { type: 'action', categoryId: dataLocation.categoryId, itemId: dataLocation.itemId, spokeIndex: dataLocation.spokeIndex, childIndex: dataLocation.childIndex }
                : { type: 'spoke', categoryId: dataLocation.categoryId, itemId: dataLocation.itemId, spokeIndex: dataLocation.spokeIndex };
            if (dtStarBtn) dtStarBtn.style.display = '';
            this.updateSchedulerStar('datetime-star-btn', starRef);
        } else {
            this.schedulerStarRef = null;
            if (dtStarBtn) { dtStarBtn.classList.remove('active'); dtStarBtn.style.display = 'none'; }
        }

        // Show modal
        document.getElementById('datetime-overlay').classList.add('active');
    },

    toggleAllDay() {
        const allDay = document.getElementById('event-allday').checked;
        document.getElementById('time-section').style.display = allDay ? 'none' : '';
        document.getElementById('duration-section').style.display = allDay ? 'none' : '';
    },

    closeDateTimePicker() {
        document.getElementById('datetime-overlay').classList.remove('active');
        this.pendingCalendarEvent = null;

        // Return to spoke editor if we came from there (action-level scheduling)
        if (this.pendingReturnToSpokeEditor && this.pendingSpokeEditor) {
            this.pendingReturnToSpokeEditor = false;
            document.getElementById('spoke-editor-overlay').classList.add('active');
            this.renderSpokeEditorActions();
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
        document.getElementById('datetime-overlay').classList.remove('active');
        this.pendingCalendarEvent = null;

        if (this.pendingReturnToSpokeEditor && this.pendingSpokeEditor) {
            this.pendingReturnToSpokeEditor = false;
            document.getElementById('spoke-editor-overlay').classList.add('active');
            this.renderSpokeEditorActions();
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
        // Action-level scheduling only (spoke-level scheduling handled by saveSpokeEditorSchedule)
        if (!this.pendingCalendarEvent) return;

        let actionText, spokeText, sliceName, categoryName, dataLocation;
        ({ actionText, spokeText, sliceName, categoryName, dataLocation } = this.pendingCalendarEvent);

        // Get user-selected date/time and optional fields
        const dateStr = document.getElementById('event-date').value;
        const allDay = document.getElementById('event-allday').checked;
        const hourStr = document.getElementById('event-hour').value;
        const minuteStr = document.getElementById('event-minute').value;
        const timeStr = allDay ? null : `${hourStr}:${minuteStr}`;
        const duration = allDay ? null : parseInt(document.getElementById('event-duration').value);
        const location = document.getElementById('event-location').value.trim();
        const notes = document.getElementById('event-notes').value.trim();
        const inviteesStr = document.getElementById('event-invitees').value.trim();
        const invitees = inviteesStr ? inviteesStr.split(',').map(e => e.trim()).filter(e => e) : [];

        if (!dateStr) {
            alert('Please select a date');
            return;
        }
        if (!allDay && (!hourStr || !minuteStr)) {
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
                    if (typeof spoke === 'object' && spoke.children && spoke.children[dataLocation.childIndex]) {
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
            allDay: allDay || null,
            location: location || null,
            notes: notes || null,
            invitees: invitees.length > 0 ? invitees : null
        };

        const provider = this.getCalendarProvider();

        // Build description with user notes first, then context
        let description = '';
        if (notes) {
            description += notes + '\n\n---\n\n';
        }
        description += `Action: ${actionText}\nSpoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`;
        const eventTitle = `${actionText} (${spokeText}/${sliceName}/${categoryName})`;

        // For Google, try API first, fall back to URL redirect.
        // Attempt token refresh before checking availability (handles expired tokens silently).
        if (provider === 'google' && typeof CalendarAdapter !== 'undefined') await CalendarAdapter.ensureAccessToken();
        if (provider === 'google' && typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
            const eventData = {
                title: eventTitle,
                date: dateStr,
                time: timeStr,
                duration: duration,
                allDay: allDay || null,
                location: location || null,
                description: description,
                attendees: invitees.length > 0 ? invitees : null
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
                if (allDay) {
                    this.openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, null, null, location, notes, true, dateStr);
                } else {
                    const startDate = new Date(`${dateStr}T${timeStr}`);
                    const endDate = new Date(startDate.getTime() + duration * 60000);
                    this.openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, location, notes);
                }
            }
        } else if (provider === 'apple') {
            if (allDay) {
                this.downloadAppleCalendarEvent(actionText, spokeText, sliceName, categoryName, null, null, null, location, notes, invitees, true, dateStr);
            } else {
                const startDate = new Date(`${dateStr}T${timeStr}`);
                const endDate = new Date(startDate.getTime() + duration * 60000);
                this.downloadAppleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, null, location, notes, invitees);
            }
        } else {
            // Google without API access - use URL redirect
            if (allDay) {
                this.openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, null, null, location, notes, true, dateStr);
            } else {
                const startDate = new Date(`${dateStr}T${timeStr}`);
                const endDate = new Date(startDate.getTime() + duration * 60000);
                this.openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, location, notes);
            }
        }

        // Save scheduled time to the data
        if (dataLocation) {
            const category = DataModel.categories.find(c => c.id === dataLocation.categoryId);
            if (category) {
                const item = category.items.find(i => i.id === dataLocation.itemId);
                if (item && item.subItems[dataLocation.spokeIndex]) {
                    const spoke = item.subItems[dataLocation.spokeIndex];
                    if (typeof spoke === 'object' && spoke.children && spoke.children[dataLocation.childIndex]) {
                        spoke.children[dataLocation.childIndex].scheduled = scheduledData;
                        DataModel.saveToStorage();
                    }
                }
            }
        }

        // Close and return to spoke editor if needed
        document.getElementById('datetime-overlay').classList.remove('active');
        this.pendingCalendarEvent = null;

        if (this.pendingReturnToSpokeEditor && this.pendingSpokeEditor) {
            this.pendingReturnToSpokeEditor = false;
            document.getElementById('spoke-editor-overlay').classList.add('active');
            this.renderSpokeEditorActions();
        } else {
            this.renderTab2Spokes();
            App.render();
        }

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('datetime-picker-closed');
        }
    },

    openGoogleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, location = null, notes = null, allDay = false, dateStr = null) {
        let dates;
        if (allDay && dateStr) {
            // All-day: use YYYYMMDD format, end date is next day
            const startFormatted = dateStr.replace(/-/g, '');
            const nextDay = new Date(dateStr);
            nextDay.setDate(nextDay.getDate() + 1);
            const endFormatted = nextDay.toISOString().split('T')[0].replace(/-/g, '');
            dates = `${startFormatted}/${endFormatted}`;
        } else {
            const formatDate = (date) => {
                return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            };
            dates = `${formatDate(startDate)}/${formatDate(endDate)}`;
        }

        // Build description with notes first, then context
        let details = '';
        let textString = '';
        const isAction = actionText !== spokeText;
        if (notes) {
            details += notes + '\n\n---\n\n';
        } if (isAction) {
            // Action
            details += `Action: ${actionText}\nSpoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`;
            textString += `${actionText} (${spokeText}/${sliceName}/${categoryName})`;
        } else {
            // Spoke
            details += `Spoke: ${spokeText}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`;
            textString += `${spokeText} (${sliceName}/${categoryName})`;
        }
        

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: textString,
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
    
    downloadAppleCalendarEvent(actionText, spokeText, sliceName, categoryName, startDate, endDate, rrule = null, location = null, notes = null, attendees = [], allDay = false, dateStr = null) {
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
            'BEGIN:VEVENT'
        ];

        if (allDay && dateStr) {
            const startFormatted = dateStr.replace(/-/g, '');
            const nextDay = new Date(dateStr);
            nextDay.setDate(nextDay.getDate() + 1);
            const endFormatted = nextDay.toISOString().split('T')[0].replace(/-/g, '');
            eventLines.push(`DTSTART;VALUE=DATE:${startFormatted}`);
            eventLines.push(`DTEND;VALUE=DATE:${endFormatted}`);
        } else {
            eventLines.push(`DTSTART:${formatICSDate(startDate)}`);
            eventLines.push(`DTEND:${formatICSDate(endDate)}`);
        }

        eventLines.push(
            `SUMMARY:${escapeICS(actionText)} (${escapeICS(categoryName)} - ${escapeICS(sliceName)})`,
            `DESCRIPTION:${description}`
        );

        // Add location if provided
        if (location) {
            eventLines.push(`LOCATION:${escapeICS(location)}`);
        }

        // Add attendees if provided
        if (attendees && attendees.length > 0) {
            attendees.forEach(email => {
                eventLines.push(`ATTENDEE;PARTSTAT=NEEDS-ACTION:mailto:${email}`);
            });
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

        // Hide star (no data location during initial creation)
        const recStarBtn = document.getElementById('recurrence-star-btn');
        if (recStarBtn) { recStarBtn.classList.remove('active'); recStarBtn.style.display = 'none'; }

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
                if (recurrence.startDate) {
                    const d = new Date(recurrence.startDate + 'T00:00:00');
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    desc += ` on ${months[d.getMonth()]} ${d.getDate()}`;
                }
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
                    if (recurrence.startDate) {
                        const d = new Date(recurrence.startDate + 'T00:00:00');
                        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        desc = `${months[d.getMonth()]} ${d.getDate()}, yearly`;
                    }
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

        // Update star button state for action
        this.updateSchedulerStar('recurrence-star-btn', { type: 'action', categoryId, itemId, spokeIndex, childIndex });

        document.getElementById('recurrence-overlay').classList.add('active');
    },

    // Spoke Configuration
    // ==========================================
    // Unified Spoke Editor
    // ==========================================

    pendingSpokeEditor: null,
    spokeEditorTab: 1,
    pendingScheduleData: { single: null, repeating: null },
    pendingReturnToSpokeEditor: false,

    showSpokeEditor(categoryId, itemId, spokeIndex) {
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;
        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;
        const spoke = item.subItems[spokeIndex];
        const spokeName = typeof spoke === 'string' ? spoke : spoke.text;

        this.pendingSpokeEditor = { categoryId, itemId, spokeIndex, spokeName, sliceName: item.name, categoryName: category.name };

        // Header
        document.getElementById('spoke-editor-breadcrumb').textContent = `${category.name} / ${item.name}`;
        document.getElementById('spoke-editor-name').textContent = spokeName;

        // Type buttons
        const spokeType = DataModel.getSpokeType(categoryId, itemId, spokeIndex) || 'static';
        document.querySelectorAll('#spoke-editor-type-btns .spoke-type-picker-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.spokeType === spokeType);
        });

        // Pre-populate schedule data from existing spoke
        this.pendingScheduleData = { single: null, repeating: null };
        if (typeof spoke === 'object' && spoke.scheduled && spoke.scheduled.date) {
            this.pendingScheduleData.single = { ...spoke.scheduled };
        }
        if (typeof spoke === 'object' && spoke.metadata && spoke.metadata.recurrence) {
            this.pendingScheduleData.repeating = { ...spoke.metadata.recurrence };
        }

        // Notes field
        const notesEl = document.getElementById('se-spoke-notes');
        if (notesEl) notesEl.value = (typeof spoke === 'object' && spoke.notes) ? spoke.notes : '';

        // Actions section for list type
        this._updateSpokeEditorActionsVisibility(spokeType);

        // Clear action input
        const input = document.getElementById('spoke-editor-new-action');
        if (input) input.value = '';

        // Star button
        this.updateSchedulerStar('spoke-editor-star-btn', { type: 'spoke', categoryId, itemId, spokeIndex });

        // If spoke has schedule data, open to Tab 2; otherwise Tab 1
        const hasSchedule = (spokeType === 'single' && this.pendingScheduleData.single) ||
                            (spokeType === 'repeating' && this.pendingScheduleData.repeating);
        this.switchSpokeEditorTab(hasSchedule ? 2 : 1);

        document.getElementById('spoke-editor-overlay').classList.add('active');

        // Notify tutorial
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('spoke-editor-opened');
        }
    },

    closeSpokeEditor() {
        document.getElementById('spoke-editor-overlay').classList.remove('active');
        this.pendingSpokeEditor = null;
        this.pendingScheduleData = { single: null, repeating: null };
        this.pendingReturnToSpokeEditor = false;

        if (document.getElementById('menu-overlay').classList.contains('active')) {
            this.renderTab2Spokes();
        }
        App.render();

        // Notify tutorial (spoke editor close acts like datetime-picker-closed)
        if (typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('datetime-picker-closed');
        }
    },

    deleteSpokeFromEditor() {
        const p = this.pendingSpokeEditor;
        if (!p) return;
        if (!confirm(`Remove "${p.spokeName}" and all its actions?`)) return;

        const { categoryId, itemId, spokeIndex } = p;

        // Close editor before modifying data
        document.getElementById('spoke-editor-overlay').classList.remove('active');
        this.pendingSpokeEditor = null;
        this.pendingScheduleData = { single: null, repeating: null };

        DataModel.removeSubItem(categoryId, itemId, spokeIndex);
        App.render();
    },

    switchSpokeEditorTab(tab) {
        this.spokeEditorTab = tab;
        document.querySelectorAll('.spoke-editor-tab').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.editorTab) === tab);
        });
        document.getElementById('spoke-editor-tab-1').classList.toggle('active', tab === 1);
        document.getElementById('spoke-editor-tab-2').classList.toggle('active', tab === 2);

        // Update bottom button: "Done" on schedule tab (skip scheduling), "Save" on type tab
        const saveBtn = document.getElementById('spoke-editor-save-btn');
        if (saveBtn) {
            const type = this._getSelectedSpokeEditorType();
            const isScheduleTab = tab === 2 && (type === 'single' || type === 'repeating');
            saveBtn.textContent = isScheduleTab ? 'Done' : 'Save';
        }

        if (tab === 2) this.populateSpokeEditorScheduleTab();
    },

    selectSpokeEditorType(type) {
        // Toggle button selection
        document.querySelectorAll('#spoke-editor-type-btns .spoke-type-picker-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.spokeType === type);
        });

        // Show/hide actions section
        this._updateSpokeEditorActionsVisibility(type);

        // Notify tutorial
        if (type === 'single' && typeof TutorialManager !== 'undefined') {
            TutorialManager.notifyEvent('single-type-selected');
        }

        // Auto-switch to Tab 2 for schedulable types
        if (type === 'single' || type === 'repeating') {
            this.switchSpokeEditorTab(2);
        }
    },

    _updateSpokeEditorActionsVisibility(type) {
        const section = document.getElementById('spoke-editor-actions-section');
        section.style.display = type === 'list' ? 'block' : 'none';
        if (type === 'list') this.renderSpokeEditorActions();

        // Hide Schedule tab for static/list, show for single/repeating
        const hasSchedule = type === 'single' || type === 'repeating';
        const tab2Btn = document.querySelector('.spoke-editor-tab[data-editor-tab="2"]');
        if (tab2Btn) tab2Btn.style.display = hasSchedule ? '' : 'none';

        // If on Tab 2 and switching to non-schedulable type, go back to Tab 1
        if (!hasSchedule && this.spokeEditorTab === 2) {
            this.switchSpokeEditorTab(1);
        }
    },

    _getSelectedSpokeEditorType() {
        const btn = document.querySelector('#spoke-editor-type-btns .spoke-type-picker-btn.selected');
        return btn ? btn.dataset.spokeType : 'static';
    },

    populateSpokeEditorScheduleTab() {
        const type = this._getSelectedSpokeEditorType();

        document.getElementById('spoke-editor-single-fields').style.display = 'none';
        document.getElementById('spoke-editor-repeating-fields').style.display = 'none';
        document.getElementById('spoke-editor-schedule-disabled').style.display = 'none';

        if (type === 'single') {
            document.getElementById('spoke-editor-single-fields').style.display = 'block';
            this._populateSingleFields();
        } else if (type === 'repeating') {
            document.getElementById('spoke-editor-repeating-fields').style.display = 'block';
            this._populateRepeatingFields();
        } else {
            document.getElementById('spoke-editor-schedule-disabled').style.display = 'block';
            document.getElementById('spoke-editor-schedule-disabled-text').textContent =
                type === 'list' ? 'List spokes use per-action scheduling.' : "Static spokes don't have schedules.";
        }
    },

    _populateSingleFields() {
        const data = this.pendingScheduleData.single;
        if (data && data.date) {
            document.getElementById('se-event-date').value = data.date;
            const [hour, minute] = (data.time || '09:00').split(':');
            document.getElementById('se-event-hour').value = hour;
            document.getElementById('se-event-minute').value = String(Math.round(parseInt(minute) / 15) * 15).padStart(2, '0');
            document.getElementById('se-event-duration').value = data.duration || '60';
            document.getElementById('se-event-location').value = data.location || '';
            document.getElementById('se-event-notes').value = data.notes || '';
            document.getElementById('se-event-invitees').value = (data.invitees || []).join(', ');
            document.getElementById('se-event-allday').checked = !!data.allDay;
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('se-event-date').value = tomorrow.toISOString().split('T')[0];
            document.getElementById('se-event-hour').value = '09';
            document.getElementById('se-event-minute').value = '00';
            document.getElementById('se-event-duration').value = '60';
            document.getElementById('se-event-location').value = '';
            document.getElementById('se-event-notes').value = '';
            document.getElementById('se-event-invitees').value = '';
            document.getElementById('se-event-allday').checked = true;
        }
        this.toggleSpokeEditorAllDay();
    },

    _populateRepeatingFields() {
        const data = this.pendingScheduleData.repeating;
        if (data) {
            document.getElementById('se-recurrence-interval').value = data.interval || 1;
            document.getElementById('se-recurrence-frequency').value = data.frequency || 'WEEKLY';
            document.getElementById('se-recurrence-start-date').value = data.startDate || new Date().toISOString().split('T')[0];
            document.getElementById('se-recurrence-all-day').checked = data.allDay !== false;
            document.getElementById('se-recurrence-time-picker').style.display = data.allDay !== false ? 'none' : 'flex';
            if (data.time) {
                const [h, m] = data.time.split(':');
                document.getElementById('se-recurrence-hour').value = h;
                document.getElementById('se-recurrence-minute').value = m;
            }
            document.getElementById('se-recurrence-duration').value = data.duration || 60;
            document.querySelectorAll('input[name="se-recurrence-day"]').forEach(cb => {
                cb.checked = data.byDay && data.byDay.includes(cb.value);
            });
            document.getElementById('se-recurrence-monthday').value = data.byMonthDay || 1;
            if (data.until) {
                document.querySelector('input[name="se-recurrence-end"][value="date"]').checked = true;
                document.getElementById('se-recurrence-end-date').value = data.until;
            } else if (data.count) {
                document.querySelector('input[name="se-recurrence-end"][value="count"]').checked = true;
                document.getElementById('se-recurrence-count').value = data.count;
            } else {
                document.querySelector('input[name="se-recurrence-end"][value="never"]').checked = true;
            }
        } else {
            document.getElementById('se-recurrence-interval').value = 1;
            document.getElementById('se-recurrence-frequency').value = 'WEEKLY';
            document.getElementById('se-recurrence-all-day').checked = true;
            document.getElementById('se-recurrence-time-picker').style.display = 'none';
            document.getElementById('se-recurrence-hour').value = '09';
            document.getElementById('se-recurrence-minute').value = '00';
            document.getElementById('se-recurrence-duration').value = '60';
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('se-recurrence-start-date').value = tomorrow.toISOString().split('T')[0];
            document.querySelectorAll('input[name="se-recurrence-day"]').forEach(cb => cb.checked = false);
            document.getElementById('se-recurrence-monthday').value = '1';
            document.querySelector('input[name="se-recurrence-end"][value="never"]').checked = true;
        }
        this.updateSpokeEditorRecurrenceOptions();
        this.updateSpokeEditorRecurrenceEndOptions();
    },

    toggleSpokeEditorAllDay() {
        const allDay = document.getElementById('se-event-allday').checked;
        document.getElementById('se-time-section').style.display = allDay ? 'none' : 'block';
        document.getElementById('se-duration-section').style.display = allDay ? 'none' : 'block';
    },

    toggleSpokeEditorRecurrenceTime() {
        const allDay = document.getElementById('se-recurrence-all-day').checked;
        document.getElementById('se-recurrence-time-picker').style.display = allDay ? 'none' : 'flex';
    },

    updateSpokeEditorRecurrenceOptions() {
        const freq = document.getElementById('se-recurrence-frequency').value;
        document.getElementById('se-recurrence-weekly-options').style.display = freq === 'WEEKLY' ? 'block' : 'none';
        document.getElementById('se-recurrence-monthly-options').style.display = freq === 'MONTHLY' ? 'block' : 'none';
    },

    updateSpokeEditorRecurrenceEndOptions() {
        const selected = document.querySelector('input[name="se-recurrence-end"]:checked');
        const val = selected ? selected.value : 'never';
        document.getElementById('se-recurrence-end-date').style.display = val === 'date' ? 'block' : 'none';
        document.getElementById('se-recurrence-count-input').style.display = val === 'count' ? 'block' : 'none';
    },

    _readSingleFieldsData() {
        const allDay = document.getElementById('se-event-allday').checked;
        const inviteesStr = document.getElementById('se-event-invitees').value.trim();
        return {
            date: document.getElementById('se-event-date').value,
            time: allDay ? null : `${document.getElementById('se-event-hour').value}:${document.getElementById('se-event-minute').value}`,
            duration: allDay ? null : parseInt(document.getElementById('se-event-duration').value),
            allDay: allDay || null,
            location: document.getElementById('se-event-location').value.trim() || null,
            notes: document.getElementById('se-event-notes').value.trim() || null,
            invitees: inviteesStr ? inviteesStr.split(',').map(e => e.trim()).filter(e => e) : null
        };
    },

    _readRepeatingFieldsData() {
        const allDay = document.getElementById('se-recurrence-all-day').checked;
        const byDay = [];
        document.querySelectorAll('input[name="se-recurrence-day"]:checked').forEach(cb => byDay.push(cb.value));
        const endSelected = document.querySelector('input[name="se-recurrence-end"]:checked');
        const endVal = endSelected ? endSelected.value : 'never';

        return {
            frequency: document.getElementById('se-recurrence-frequency').value,
            interval: parseInt(document.getElementById('se-recurrence-interval').value) || 1,
            startDate: document.getElementById('se-recurrence-start-date').value,
            byDay: byDay.length > 0 ? byDay : null,
            byMonthDay: document.getElementById('se-recurrence-frequency').value === 'MONTHLY' ? document.getElementById('se-recurrence-monthday').value : null,
            allDay: allDay,
            time: allDay ? null : `${document.getElementById('se-recurrence-hour').value}:${document.getElementById('se-recurrence-minute').value}`,
            duration: allDay ? null : parseInt(document.getElementById('se-recurrence-duration').value),
            until: endVal === 'date' ? document.getElementById('se-recurrence-end-date').value : null,
            count: endVal === 'count' ? parseInt(document.getElementById('se-recurrence-count').value) : null
        };
    },

    async saveSpokeEditorSchedule() {
        if (!this.pendingSpokeEditor) return;
        const type = this._getSelectedSpokeEditorType();
        const { categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName } = this.pendingSpokeEditor;

        // Set spoke notes before updateSpokeType fires its internal saveToStorage
        const notesValue = (document.getElementById('se-spoke-notes')?.value || '').trim() || null;
        const _notesCat = DataModel.categories.find(c => c.id === categoryId);
        const _notesItem = _notesCat?.items.find(i => i.id === itemId);
        if (_notesItem && typeof _notesItem.subItems[spokeIndex] === 'string') {
            _notesItem.subItems[spokeIndex] = {
                text: _notesItem.subItems[spokeIndex],
                type: 'static',
                notes: null,
                children: [],
                scheduled: null,
                metadata: { condition: null, calendarEventId: null, nextState: null, recurrence: null }
            };
        }
        const _noteSpoke = _notesItem?.subItems[spokeIndex];
        if (typeof _noteSpoke === 'object') _noteSpoke.notes = notesValue;

        if (type === 'single') {
            const data = this._readSingleFieldsData();
            if (!data.date) { alert('Please select a date'); return; }

            // Update type in model
            DataModel.updateSpokeType(categoryId, itemId, spokeIndex, 'single');

            // Save schedule to spoke
            const category = DataModel.categories.find(c => c.id === categoryId);
            const item = category.items.find(i => i.id === itemId);
            const spoke = item.subItems[spokeIndex];

            // Check for existing calendar event
            const existingEventId = typeof spoke === 'object' && spoke.scheduled ? spoke.scheduled.calendarEventId : null;
            const scheduledData = { ...data };

            // Calendar integration
            const provider = this.getCalendarProvider();
            const eventTitle = `${spokeName} (${categoryName}/${sliceName})`;
            let description = data.notes ? data.notes + '\n\n---\n\n' : '';
            description += `Spoke: ${spokeName}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`;

            if (provider === 'google' && typeof CalendarAdapter !== 'undefined') await CalendarAdapter.ensureAccessToken();
            if (provider === 'google' && typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                const eventData = { title: eventTitle, date: data.date, time: data.time, duration: data.duration, allDay: data.allDay, location: data.location, description, attendees: data.invitees };
                let event;
                if (existingEventId) {
                    event = await CalendarAdapter.updateEvent(existingEventId, eventData);
                    if (event && event.id) { scheduledData.calendarEventId = event.id; Storage.showStatus('Calendar event updated', 'success'); }
                }
                if (!event || !event.id) {
                    event = await CalendarAdapter.createEvent(eventData);
                    if (event && event.id) { scheduledData.calendarEventId = event.id; Storage.showStatus('Added to Google Calendar', 'success'); }
                }
                if (!event || !event.id) {
                    // Fallback to URL redirect
                    if (data.allDay) { this.openGoogleCalendarEvent(spokeName, spokeName, sliceName, categoryName, null, null, data.location, data.notes, true, data.date); }
                    else { const s = new Date(`${data.date}T${data.time}`); this.openGoogleCalendarEvent(spokeName, spokeName, sliceName, categoryName, s, new Date(s.getTime() + data.duration * 60000), data.location, data.notes); }
                }
            } else if (provider === 'apple') {
                if (data.allDay) { this.downloadAppleCalendarEvent(spokeName, spokeName, sliceName, categoryName, null, null, null, data.location, data.notes, data.invitees, true, data.date); }
                else { const s = new Date(`${data.date}T${data.time}`); this.downloadAppleCalendarEvent(spokeName, spokeName, sliceName, categoryName, s, new Date(s.getTime() + data.duration * 60000), null, data.location, data.notes, data.invitees); }
            } else {
                if (data.allDay) { this.openGoogleCalendarEvent(spokeName, spokeName, sliceName, categoryName, null, null, data.location, data.notes, true, data.date); }
                else { const s = new Date(`${data.date}T${data.time}`); this.openGoogleCalendarEvent(spokeName, spokeName, sliceName, categoryName, s, new Date(s.getTime() + data.duration * 60000), data.location, data.notes); }
            }

            spoke.scheduled = scheduledData;
            DataModel.saveToStorage();
            this.closeSpokeEditor();

        } else if (type === 'repeating') {
            const recurrence = this._readRepeatingFieldsData();
            if (!recurrence.startDate) { alert('Please select a start date'); return; }

            const category = DataModel.categories.find(c => c.id === categoryId);
            const item = category.items.find(i => i.id === itemId);
            const spoke = item.subItems[spokeIndex];

            // Delete old calendar event
            const oldEventId = typeof spoke === 'object' && spoke.metadata ? spoke.metadata.calendarEventId : null;
            if (typeof CalendarAdapter !== 'undefined') await CalendarAdapter.ensureAccessToken();
            if (oldEventId && typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                await CalendarAdapter.deleteEvent(oldEventId);
            }

            // Update type + metadata
            DataModel.updateSpokeType(categoryId, itemId, spokeIndex, 'repeating', { recurrence });

            // Create recurring calendar event
            if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                const rrule = CalendarAdapter.buildRRule(recurrence);
                const eventData = { title: `${spokeName} (${categoryName}/${sliceName})`, date: recurrence.startDate, description: `Repeating spoke: ${spokeName}\nSlice: ${sliceName}\nCategory: ${categoryName}\nCreated from Brain Pie`, rrule };
                if (recurrence.allDay) { eventData.allDay = true; } else { eventData.time = recurrence.time || '09:00'; eventData.duration = recurrence.duration || 60; }
                const event = await CalendarAdapter.createEvent(eventData);
                if (event && event.id) {
                    const updatedSpoke = item.subItems[spokeIndex];
                    if (typeof updatedSpoke === 'object') { if (!updatedSpoke.metadata) updatedSpoke.metadata = {}; updatedSpoke.metadata.calendarEventId = event.id; DataModel.saveToStorage(); }
                    Storage.showStatus('Recurring event added to calendar', 'success');
                }
            }

            this.closeSpokeEditor();
        }
    },

    async saveSpokeEditor() {
        if (!this.pendingSpokeEditor) return;
        const type = this._getSelectedSpokeEditorType();
        const { categoryId, itemId, spokeIndex } = this.pendingSpokeEditor;

        const notesValue = (document.getElementById('se-spoke-notes')?.value || '').trim() || null;

        // Resolve spoke — normalise string spokes to objects first so we can set notes
        // before any saveToStorage fires (updateSpokeType calls saveToStorage internally,
        // and we need notes already on the object at that point to avoid a race)
        const category = DataModel.categories.find(c => c.id === categoryId);
        const item = category?.items.find(i => i.id === itemId);
        if (item && typeof item.subItems[spokeIndex] === 'string') {
            // Convert legacy string spoke to object so notes can be attached
            item.subItems[spokeIndex] = {
                text: item.subItems[spokeIndex],
                type: 'static',
                notes: null,
                children: [],
                scheduled: null,
                metadata: { condition: null, calendarEventId: null, nextState: null, recurrence: null }
            };
        }
        const spoke = item?.subItems[spokeIndex];
        if (typeof spoke === 'object') {
            spoke.notes = notesValue;
        }

        // If on Tab 2 with Single/Repeating, "Done" saves type + any entered field data
        // (without touching the calendar — user can still "Add to Calendar" later)
        if (this.spokeEditorTab === 2 && (type === 'single' || type === 'repeating')) {
            DataModel.updateSpokeType(categoryId, itemId, spokeIndex, type);

            if (typeof spoke === 'object') {
                if (type === 'single') {
                    const data = this._readSingleFieldsData();
                    if (data.date) {
                        const existingEventId = spoke.scheduled?.calendarEventId ?? null;
                        spoke.scheduled = { ...data, calendarEventId: existingEventId };
                    }
                } else if (type === 'repeating') {
                    const recurrence = this._readRepeatingFieldsData();
                    if (recurrence.startDate) {
                        if (!spoke.metadata) spoke.metadata = {};
                        const existingEventId = spoke.metadata.calendarEventId ?? null;
                        spoke.metadata.recurrence = recurrence;
                        spoke.metadata.calendarEventId = existingEventId;
                    }
                }
                DataModel.saveToStorage();
            }

            this.closeSpokeEditor();
            return;
        }

        // Tab 1 path: update type (notes already set above before this call)
        DataModel.updateSpokeType(categoryId, itemId, spokeIndex, type);

        if (typeof spoke === 'object') {
            // For static type, clear spoke-level schedule
            if (type === 'static') {
                spoke.scheduled = null;
                if (spoke.metadata) spoke.metadata.recurrence = null;
            }
        }

        // updateSpokeType already called saveToStorage with notes on the object.
        // No second save needed.
        this.closeSpokeEditor();
    },

    // Action management within spoke editor (List type)
    renderSpokeEditorActions() {
        if (!this.pendingSpokeEditor) return;
        const container = document.getElementById('spoke-editor-existing-actions');
        container.innerHTML = '';
        const { categoryId, itemId, spokeIndex } = this.pendingSpokeEditor;

        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;
        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;

        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children || spoke.children.length === 0) {
            container.innerHTML = '<div style="color:#999;font-size:13px;padding:8px 0;">No actions yet. Add one below.</div>';
            return;
        }

        spoke.children.forEach((child, idx) => {
            const childText = typeof child === 'string' ? child : child.text;
            const hasSchedule = child.scheduled && child.scheduled.date && (child.scheduled.time || child.scheduled.allDay);

            let scheduleBtn = `<button type="button" class="small" style="background:#4285F4;" onclick="UI.rescheduleAction(${idx})" title="Schedule">📅</button>`;
            if (hasSchedule) {
                const actionBorder = UI.getScheduleBorderStyle(child.scheduled.date, child.scheduled.time);
                if (child.scheduled.allDay) {
                    const dateStr = new Date(child.scheduled.date + 'T00:00').toLocaleDateString([], { month: 'short', day: 'numeric' });
                    scheduleBtn = `<button type="button" class="small" style="background:#4CAF50;padding:3px 17px;${actionBorder}" onclick="UI.rescheduleAction(${idx})" title="Reschedule">${dateStr} (all day)</button>`;
                } else {
                    const schedDate = new Date(`${child.scheduled.date}T${child.scheduled.time}`);
                    const timeStr = schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const dateStr = schedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    scheduleBtn = `<button type="button" class="small" style="background:#4CAF50;padding:3px 17px;${actionBorder}" onclick="UI.rescheduleAction(${idx})" title="Reschedule">${dateStr} ${timeStr}</button>`;
                }
            }

            const isCompleted = child.completed || false;
            const isActionPrioritised = this.isPrioritised({type:'action', categoryId, itemId, spokeIndex, childIndex:idx});

            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:6px;';

            const star = document.createElement('button');
            star.className = `priority-star-btn ${isActionPrioritised ? 'active' : ''}`;
            star.innerHTML = '&#9733;';
            star.title = 'Add to priorities';
            star.style.flexShrink = '0';
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToPriorities({type:'action', categoryId, itemId, spokeIndex, childIndex:idx});
                star.classList.toggle('active', this.isPrioritised({type:'action', categoryId, itemId, spokeIndex, childIndex:idx}));
            });

            const entry = document.createElement('div');
            entry.className = 'spoke-action-entry';
            entry.style.cssText = 'flex:1;background:#f5f5f5;padding:8px 12px;border-radius:6px;';
            entry.innerHTML = `
                <input type="checkbox" class="action-checkbox"
                    onchange="UI.toggleActionCompleted('${categoryId}', '${itemId}', ${spokeIndex}, ${idx})"
                    ${isCompleted ? 'checked' : ''}>
                <div style="flex: 1;">
                    <div style="font-weight: 500;" class="${isCompleted ? 'action-completed' : ''}">${UI.linkifyUrls(childText)}</div>
                </div>
                ${scheduleBtn}
                <button type="button" class="small warn" onclick="UI.removeAction(${idx})" title="Remove">×</button>
            `;

            row.appendChild(star);
            row.appendChild(entry);
            container.appendChild(row);
        });
    },

    _addActionToSpoke() {
        if (!this.pendingSpokeEditor) return null;
        const input = document.getElementById('spoke-editor-new-action');
        const actionText = input.value.trim();
        if (!actionText) { alert('Please enter an action name'); return null; }

        const { categoryId, itemId, spokeIndex } = this.pendingSpokeEditor;
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return null;
        const item = category.items.find(i => i.id === itemId);
        if (!item) return null;

        if (typeof item.subItems[spokeIndex] === 'string') {
            item.subItems[spokeIndex] = { text: item.subItems[spokeIndex], type: 'list', children: [], scheduled: null, metadata: {} };
        }
        if (!item.subItems[spokeIndex].children) item.subItems[spokeIndex].children = [];

        const childIndex = item.subItems[spokeIndex].children.length;
        item.subItems[spokeIndex].children.push({ text: actionText, children: [], completed: false });
        item.subItems[spokeIndex].type = 'list';
        DataModel.saveToStorage();
        input.value = '';
        this.renderSpokeEditorActions();
        return { actionText, childIndex };
    },

    addSpokeEditorAction() {
        const result = this._addActionToSpoke();
        if (!result) return;
        App.render();
    },

    addAndScheduleSpokeEditorAction() {
        const result = this._addActionToSpoke();
        if (!result) return;
        const { categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName } = this.pendingSpokeEditor;
        document.getElementById('spoke-editor-overlay').classList.remove('active');
        this.pendingReturnToSpokeEditor = true;
        const dataLocation = { categoryId, itemId, spokeIndex, childIndex: result.childIndex };
        this.showDateTimePicker(result.actionText, spokeName, sliceName, categoryName, dataLocation);
    },

    rescheduleAction(childIndex) {
        if (!this.pendingSpokeEditor) return;
        const { categoryId, itemId, spokeIndex, spokeName, sliceName, categoryName } = this.pendingSpokeEditor;
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;
        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;
        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children || !spoke.children[childIndex]) return;
        const action = spoke.children[childIndex];
        const actionText = typeof action === 'string' ? action : action.text;

        document.getElementById('spoke-editor-overlay').classList.remove('active');
        this.pendingReturnToSpokeEditor = true;
        const dataLocation = { categoryId, itemId, spokeIndex, childIndex };
        this.showDateTimePicker(actionText, spokeName, sliceName, categoryName, dataLocation);
    },

    async removeAction(childIndex) {
        if (!this.pendingSpokeEditor) return;
        const { categoryId, itemId, spokeIndex } = this.pendingSpokeEditor;
        const category = DataModel.categories.find(c => c.id === categoryId);
        if (!category) return;
        const item = category.items.find(i => i.id === itemId);
        if (!item || !item.subItems[spokeIndex]) return;
        const spoke = item.subItems[spokeIndex];
        if (typeof spoke !== 'object' || !spoke.children) return;

        const action = spoke.children[childIndex];
        if (action && action.scheduled && action.scheduled.calendarEventId) {
            if (typeof CalendarAdapter !== 'undefined' && CalendarAdapter.isAvailable()) {
                const deleted = await CalendarAdapter.deleteEvent(action.scheduled.calendarEventId);
                if (deleted) Storage.showStatus('Calendar event deleted', 'success');
            }
        }

        spoke.children.splice(childIndex, 1);
        DataModel.saveToStorage();
        this.renderSpokeEditorActions();
    }
});
