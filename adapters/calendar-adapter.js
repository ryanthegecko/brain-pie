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
        const { title, date, time, duration, description, rrule, allDay, location, attendees } = eventData;

        const payload = {
            summary: title,
            description: description || `Created by Brain Pie`
        };

        // Add location if provided
        if (location) {
            payload.location = location;
        }

        if (allDay) {
            // All-day event uses date (not dateTime)
            payload.start = { date: date };
            payload.end = { date: date };
        } else {
            // Timed event
            const startDateTime = new Date(`${date}T${time}:00`);
            const endDateTime = new Date(startDateTime.getTime() + (duration || 60) * 60 * 1000);
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            payload.start = {
                dateTime: startDateTime.toISOString(),
                timeZone: timeZone
            };
            payload.end = {
                dateTime: endDateTime.toISOString(),
                timeZone: timeZone
            };
        }

        // Add recurrence if provided
        if (rrule) {
            payload.recurrence = [`RRULE:${rrule}`];
        }

        // Add attendees if provided
        if (attendees && attendees.length > 0) {
            payload.attendees = attendees.map(email => ({ email }));
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
            // Convert YYYY-MM-DD to YYYYMMDD format if needed
            const until = recurrence.until.replace(/-/g, '');
            parts.push(`UNTIL=${until}`);
        } else if (recurrence.count) {
            parts.push(`COUNT=${recurrence.count}`);
        }

        return parts.join(';');
    },

    /**
     * Get access token from FirebaseAdapter or GoogleAuthAdapter
     * Handles token refresh if needed
     * @returns {Promise<string|null>}
     */
    async getToken() {
        // Try FirebaseAdapter first (for Firebase users)
        if (typeof FirebaseAdapter !== 'undefined' && FirebaseAdapter.hasCalendarAccess()) {
            return await FirebaseAdapter.getAccessToken();
        }

        // Fall back to GoogleAuthAdapter (standalone calendar users)
        if (typeof GoogleAuthAdapter !== 'undefined' && GoogleAuthAdapter.hasCalendarAccess()) {
            return await GoogleAuthAdapter.getAccessToken();
        }

        return null;
    },

    /**
     * Check if Calendar API is available (has a valid access token right now)
     * @returns {boolean}
     */
    isAvailable() {
        // Check FirebaseAdapter
        if (typeof FirebaseAdapter !== 'undefined' && FirebaseAdapter.hasCalendarAccess()) {
            return true;
        }

        // Check GoogleAuthAdapter
        if (typeof GoogleAuthAdapter !== 'undefined' && GoogleAuthAdapter.hasCalendarAccess()) {
            return true;
        }

        return false;
    },

    /**
     * Check if user is signed into Google (regardless of token expiry).
     * Use this for showing UI buttons — the token can be refreshed on demand.
     * @returns {boolean}
     */
    isGoogleSignedIn() {
        if (typeof FirebaseAdapter !== 'undefined' && FirebaseAdapter.user) {
            return true;
        }
        if (typeof GoogleAuthAdapter !== 'undefined' && GoogleAuthAdapter.isSignedIn()) {
            return true;
        }
        return false;
    },

    /**
     * Ensure we have a valid access token, refreshing if needed.
     * @returns {Promise<boolean>} true if token is available
     */
    async ensureAccessToken() {
        if (this.isAvailable()) return true;

        // Try FirebaseAdapter refresh
        if (typeof FirebaseAdapter !== 'undefined' && FirebaseAdapter.user) {
            const token = await FirebaseAdapter.getAccessToken();
            if (token) return true;
        }

        return false;
    },

    /**
     * List events from Google Calendar within a time range
     * @param {string} timeMin - ISO date string for range start
     * @param {string} timeMax - ISO date string for range end
     * @returns {Promise<Array|null>} Array of event objects, or null on failure
     */
    async listEvents(timeMin, timeMax) {
        const token = await this.getToken();
        if (!token) {
            Debug.log('CalendarAdapter: No access token available');
            return null;
        }

        try {
            let allEvents = [];
            let pageToken = null;

            do {
                const params = new URLSearchParams({
                    timeMin: new Date(timeMin).toISOString(),
                    timeMax: new Date(timeMax).toISOString(),
                    singleEvents: 'false',
                    maxResults: '250',
                    orderBy: 'updated'
                });
                if (pageToken) params.set('pageToken', pageToken);

                const response = await fetch(
                    `${this.API_BASE}/calendars/primary/events?${params}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                if (!response.ok) {
                    const error = await response.json();
                    Debug.log('CalendarAdapter: listEvents failed:', error.error?.message || response.status);
                    return null;
                }

                const data = await response.json();
                allEvents = allEvents.concat(data.items || []);
                pageToken = data.nextPageToken || null;
            } while (pageToken);

            // Filter out cancelled events
            allEvents = allEvents.filter(e => e.status !== 'cancelled');

            Debug.log('CalendarAdapter: listEvents returned', allEvents.length, 'events');
            return allEvents;
        } catch (e) {
            Debug.log('CalendarAdapter: listEvents error:', e.message);
            return null;
        }
    },

    /**
     * Parse a Google Calendar RRULE string into Brain Pie's recurrence format.
     * Output matches the format used by buildRRule() and the recurrence picker UI:
     *   frequency: uppercase ('DAILY','WEEKLY','MONTHLY','YEARLY')
     *   byDay: array of RRULE day codes (['MO','TU',...])
     *   byMonthDay: number
     *   until/count: end conditions
     * @param {string} rruleString - RRULE string (with or without 'RRULE:' prefix)
     * @param {Object} event - The Google Calendar event (for start time info)
     * @returns {Object} Brain Pie recurrence object
     */
    parseRecurrence(rruleString, event) {
        const rule = rruleString.replace(/^RRULE:/, '');
        const parts = {};
        rule.split(';').forEach(part => {
            const [key, value] = part.split('=');
            parts[key] = value;
        });

        const recurrence = {
            frequency: parts.FREQ || 'WEEKLY',
            interval: parseInt(parts.INTERVAL) || 1,
            byDay: null,
            byMonthDay: null,
            time: null,
            duration: 60,
            allDay: false,
            startDate: null,
            until: null,
            count: null
        };

        // Parse BYDAY — keep as RRULE day codes (MO, TU, etc.)
        if (parts.BYDAY) {
            recurrence.byDay = parts.BYDAY.split(',');
        }

        // Parse BYMONTHDAY
        if (parts.BYMONTHDAY) {
            recurrence.byMonthDay = parseInt(parts.BYMONTHDAY);
        }

        // Parse end conditions
        if (parts.UNTIL) {
            const u = parts.UNTIL;
            recurrence.until = u.length >= 8 ? `${u.slice(0,4)}-${u.slice(4,6)}-${u.slice(6,8)}` : u;
        } else if (parts.COUNT) {
            recurrence.count = parseInt(parts.COUNT);
        }

        // Extract time, duration, and start date from event
        if (event) {
            if (event.start?.dateTime) {
                const start = new Date(event.start.dateTime);
                recurrence.time = start.toTimeString().slice(0, 5);
                recurrence.startDate = start.toISOString().split('T')[0];
                if (event.end?.dateTime) {
                    const end = new Date(event.end.dateTime);
                    recurrence.duration = Math.round((end - start) / 60000);
                }
            } else if (event.start?.date) {
                recurrence.allDay = true;
                recurrence.startDate = event.start.date;
            }
        }

        return recurrence;
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
                    if (typeof spoke !== 'object') continue;

                    // Sync spoke-level scheduled event (single/static spokes with a date)
                    const spokeEventId = spoke.scheduled?.calendarEventId;
                    if (spokeEventId) {
                        results.synced++;
                        try {
                            const event = await this.getEvent(spokeEventId);
                            if (!event || event.status === 'cancelled') {
                                Debug.log('CalendarAdapter: Spoke event deleted from calendar, removing spoke:', spokeEventId);
                                item.subItems.splice(spokeIndex, 1);
                                spokeIndex--;
                                results.deleted++;
                                hasChanges = true;
                                continue;
                            } else if (event.start?.dateTime) {
                                const eventStart = new Date(event.start.dateTime);
                                const eventEnd = new Date(event.end.dateTime);
                                const duration = Math.round((eventEnd - eventStart) / 60000);
                                const eventDate = eventStart.toISOString().split('T')[0];
                                const eventTime = eventStart.toTimeString().slice(0, 5);
                                if (spoke.scheduled.date !== eventDate ||
                                    spoke.scheduled.time !== eventTime ||
                                    spoke.scheduled.duration !== duration) {
                                    Debug.log('CalendarAdapter: Spoke event time changed:', spokeEventId);
                                    spoke.scheduled.date = eventDate;
                                    spoke.scheduled.time = eventTime;
                                    spoke.scheduled.duration = duration;
                                    results.updated++;
                                    hasChanges = true;
                                }
                            } else if (event.start?.date && spoke.scheduled.date !== event.start.date) {
                                spoke.scheduled.date = event.start.date;
                                results.updated++;
                                hasChanges = true;
                            }
                        } catch (e) {
                            Debug.log('CalendarAdapter: Error syncing spoke event:', spokeEventId, e.message);
                        }
                    }

                    // Sync spoke-level repeating event (metadata.calendarEventId)
                    const spokeRecurringEventId = spoke.metadata?.calendarEventId;
                    if (spokeRecurringEventId) {
                        results.synced++;
                        try {
                            const event = await this.getEvent(spokeRecurringEventId);
                            if (!event || event.status === 'cancelled') {
                                Debug.log('CalendarAdapter: Recurring spoke event deleted from calendar, removing spoke:', spokeRecurringEventId);
                                item.subItems.splice(spokeIndex, 1);
                                spokeIndex--;
                                results.deleted++;
                                hasChanges = true;
                                continue;
                            }
                        } catch (e) {
                            Debug.log('CalendarAdapter: Error syncing recurring spoke event:', spokeRecurringEventId, e.message);
                        }
                    }

                    // Sync child actions
                    if (!spoke.children) continue;

                    for (let childIndex = 0; childIndex < spoke.children.length; childIndex++) {
                        const action = spoke.children[childIndex];
                        if (!action || !action.scheduled || !action.scheduled.calendarEventId) continue;

                        results.synced++;
                        const eventId = action.scheduled.calendarEventId;

                        try {
                            const event = await this.getEvent(eventId);

                            if (!event || event.status === 'cancelled') {
                                Debug.log('CalendarAdapter: Event deleted from calendar, removing action:', eventId);
                                spoke.children.splice(childIndex, 1);
                                childIndex--;
                                results.deleted++;
                                hasChanges = true;
                            } else if (event.start && event.start.dateTime) {
                                const eventStart = new Date(event.start.dateTime);
                                const eventEnd = new Date(event.end.dateTime);
                                const duration = Math.round((eventEnd - eventStart) / 60000);

                                const eventDate = eventStart.toISOString().split('T')[0];
                                const eventTime = eventStart.toTimeString().slice(0, 5);

                                if (action.scheduled.date !== eventDate ||
                                    action.scheduled.time !== eventTime ||
                                    action.scheduled.duration !== duration) {
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
