/**
 * Calendar Adapter for Brain Pie
 * Handles Google Calendar API operations for 2-way calendar sync.
 *
 * Requires FirebaseAdapter to be initialized with calendar scope.
 * Uses primary calendar for all operations.
 */
const CalendarAdapter = {
    // Google Calendar API base URL
    API_BASE: 'https://www.googleapis.com/calendar/v3',

    /**
     * Create a new calendar event
     * @param {Object} eventData - Event details
     * @param {string} eventData.title - Event title/summary
     * @param {string} eventData.date - Date in YYYY-MM-DD format
     * @param {string} eventData.time - Time in HH:mm format
     * @param {number} eventData.duration - Duration in minutes
     * @param {string} eventData.description - Optional description
     * @param {string} eventData.rrule - Optional RRULE for recurring events
     * @returns {Promise<Object|null>} Created event with id, or null on failure
     */
    async createEvent(eventData) {
        const token = await this.getToken();
        if (!token) {
            Debug.log('CalendarAdapter: No access token available');
            return null;
        }

        try {
            const payload = this.buildEventPayload(eventData);

            const response = await fetch(`${this.API_BASE}/calendars/primary/events`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                Debug.log('CalendarAdapter: Create event failed:', error.error?.message || response.status);
                return null;
            }

            const event = await response.json();
            Debug.log('CalendarAdapter: Event created:', event.id);
            return event;

        } catch (e) {
            Debug.log('CalendarAdapter: Create event error:', e.message);
            return null;
        }
    },

    /**
     * Update an existing calendar event
     * @param {string} eventId - Google Calendar event ID
     * @param {Object} eventData - Updated event details
     * @returns {Promise<Object|null>} Updated event or null on failure
     */
    async updateEvent(eventId, eventData) {
        const token = await this.getToken();
        if (!token) {
            Debug.log('CalendarAdapter: No access token available');
            return null;
        }

        try {
            const payload = this.buildEventPayload(eventData);

            const response = await fetch(`${this.API_BASE}/calendars/primary/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                Debug.log('CalendarAdapter: Update event failed:', error.error?.message || response.status);
                return null;
            }

            const event = await response.json();
            Debug.log('CalendarAdapter: Event updated:', event.id);
            return event;

        } catch (e) {
            Debug.log('CalendarAdapter: Update event error:', e.message);
            return null;
        }
    },

    /**
     * Delete a calendar event
     * @param {string} eventId - Google Calendar event ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteEvent(eventId) {
        const token = await this.getToken();
        if (!token) {
            Debug.log('CalendarAdapter: No access token available');
            return false;
        }

        try {
            const response = await fetch(`${this.API_BASE}/calendars/primary/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // 204 No Content = success, 410 Gone = already deleted
            if (response.ok || response.status === 204 || response.status === 410) {
                Debug.log('CalendarAdapter: Event deleted:', eventId);
                return true;
            }

            const error = await response.json();
            Debug.log('CalendarAdapter: Delete event failed:', error.error?.message || response.status);
            return false;

        } catch (e) {
            Debug.log('CalendarAdapter: Delete event error:', e.message);
            return false;
        }
    },

    /**
     * Get an existing calendar event
     * @param {string} eventId - Google Calendar event ID
     * @returns {Promise<Object|null>} Event object or null
     */
    async getEvent(eventId) {
        const token = await this.getToken();
        if (!token) {
            return null;
        }

        try {
            const response = await fetch(`${this.API_BASE}/calendars/primary/events/${eventId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                Debug.log('CalendarAdapter: getEvent response not ok:', response.status);
                return null;
            }

            const event = await response.json();
            Debug.log('CalendarAdapter: getEvent result:', event.id, 'status:', event.status);
            return event;

        } catch (e) {
            Debug.log('CalendarAdapter: Get event error:', e.message);
            return null;
        }
    },

    /**
     * Build Google Calendar event payload
     * @param {Object} eventData - Event details
     * @returns {Object} Google Calendar API event object
     */
    buildEventPayload(eventData) {
        const { title, date, time, duration, description, rrule } = eventData;

        // Build start datetime
        const startDateTime = new Date(`${date}T${time}:00`);

        // Build end datetime (start + duration)
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

        // Get timezone
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const payload = {
            summary: title,
            description: description || `Created by Brain Pie`,
            start: {
                dateTime: startDateTime.toISOString(),
                timeZone: timeZone
            },
            end: {
                dateTime: endDateTime.toISOString(),
                timeZone: timeZone
            }
        };

        // Add recurrence if provided
        if (rrule) {
            payload.recurrence = [`RRULE:${rrule}`];
        }

        return payload;
    },

    /**
     * Build RRULE string from recurrence options
     * @param {Object} recurrence - Recurrence configuration
     * @param {string} recurrence.frequency - DAILY, WEEKLY, MONTHLY, YEARLY
     * @param {number} recurrence.interval - Every N frequency units (default: 1)
     * @param {string[]} recurrence.byDay - For weekly: ['MO', 'TU', 'WE', ...]
     * @param {number} recurrence.byMonthDay - For monthly: day of month (1-31)
     * @param {string} recurrence.until - End date in YYYYMMDD format
     * @param {number} recurrence.count - Or end after N occurrences
     * @returns {string} RRULE string (without 'RRULE:' prefix)
     */
    buildRRule(recurrence) {
        const parts = [`FREQ=${recurrence.frequency}`];

        if (recurrence.interval && recurrence.interval > 1) {
            parts.push(`INTERVAL=${recurrence.interval}`);
        }

        if (recurrence.byDay && recurrence.byDay.length > 0) {
            parts.push(`BYDAY=${recurrence.byDay.join(',')}`);
        }

        if (recurrence.byMonthDay) {
            parts.push(`BYMONTHDAY=${recurrence.byMonthDay}`);
        }

        if (recurrence.until) {
            parts.push(`UNTIL=${recurrence.until}`);
        } else if (recurrence.count) {
            parts.push(`COUNT=${recurrence.count}`);
        }

        return parts.join(';');
    },

    /**
     * Get access token from FirebaseAdapter
     * Handles token refresh if needed
     * @returns {Promise<string|null>}
     */
    async getToken() {
        if (typeof FirebaseAdapter !== 'undefined') {
            return await FirebaseAdapter.getAccessToken();
        }
        return null;
    },

    /**
     * Check if Calendar API is available
     * @returns {boolean}
     */
    isAvailable() {
        return typeof FirebaseAdapter !== 'undefined' && FirebaseAdapter.hasCalendarAccess();
    },

    /**
     * Sync all scheduled actions with Google Calendar
     * Fetches current state of events and updates local data
     * @returns {Promise<Object>} Summary of sync results
     */
    async syncFromCalendar() {
        if (!this.isAvailable()) {
            Debug.log('CalendarAdapter: Cannot sync - not available');
            return { synced: 0, updated: 0, deleted: 0 };
        }

        const results = { synced: 0, updated: 0, deleted: 0 };
        let hasChanges = false;

        // Iterate through all categories, items, spokes, and actions
        for (const category of DataModel.categories) {
            for (const item of category.items) {
                if (!item.subItems) continue;

                for (let spokeIndex = 0; spokeIndex < item.subItems.length; spokeIndex++) {
                    const spoke = item.subItems[spokeIndex];
                    if (typeof spoke !== 'object' || !spoke.children) continue;

                    for (let childIndex = 0; childIndex < spoke.children.length; childIndex++) {
                        const action = spoke.children[childIndex];
                        if (!action || !action.scheduled || !action.scheduled.calendarEventId) continue;

                        results.synced++;
                        const eventId = action.scheduled.calendarEventId;

                        try {
                            const event = await this.getEvent(eventId);

                            if (!event || event.status === 'cancelled') {
                                // Event was deleted from calendar
                                // For non-recurring actions, delete the entire action
                                // (Recurring events will be handled differently in Phase 2)
                                Debug.log('CalendarAdapter: Event deleted from calendar, removing action:', eventId);
                                spoke.children.splice(childIndex, 1);
                                childIndex--; // Adjust index since we removed an item
                                results.deleted++;
                                hasChanges = true;
                            } else if (event.start && event.start.dateTime) {
                                // Event exists - check if time changed
                                const eventStart = new Date(event.start.dateTime);
                                const eventEnd = new Date(event.end.dateTime);
                                const duration = Math.round((eventEnd - eventStart) / 60000);

                                const eventDate = eventStart.toISOString().split('T')[0];
                                const eventTime = eventStart.toTimeString().slice(0, 5);

                                if (action.scheduled.date !== eventDate ||
                                    action.scheduled.time !== eventTime ||
                                    action.scheduled.duration !== duration) {
                                    // Time changed - update local data
                                    Debug.log('CalendarAdapter: Event time changed:', eventId);
                                    action.scheduled.date = eventDate;
                                    action.scheduled.time = eventTime;
                                    action.scheduled.duration = duration;
                                    results.updated++;
                                    hasChanges = true;
                                }
                            }
                        } catch (e) {
                            Debug.log('CalendarAdapter: Error syncing event:', eventId, e.message);
                        }
                    }
                }
            }
        }

        if (hasChanges) {
            // Save to both localStorage AND Firebase
            DataModel.saveToStorage();
            Debug.log('CalendarAdapter: Sync complete -', results);
        }

        return results;
    }
};

// Expose globally
window.CalendarAdapter = CalendarAdapter;
