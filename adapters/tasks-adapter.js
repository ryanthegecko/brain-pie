/**
 * Tasks Adapter for Brain Pie
 * Handles Google Tasks API operations for importing voice-added tasks.
 *
 * Uses the same auth token as CalendarAdapter (Firebase or standalone Google Sign-In).
 * Requires tasks scope for read + delete.
 */
const TasksAdapter = {
    // Google Tasks API base URL
    API_BASE: 'https://tasks.googleapis.com/tasks/v1',

    /**
     * Check if Tasks API is available (same auth as Calendar)
     * @returns {boolean}
     */
    isAvailable() {
        return CalendarAdapter.isAvailable();
    },

    /**
     * Get access token (delegates to CalendarAdapter)
     * @returns {Promise<string|null>}
     */
    async getToken() {
        return CalendarAdapter.getToken();
    },

    /**
     * Get all task lists
     * @returns {Promise<Array|null>} Array of { id, title } objects
     */
    // Last error from API (for UI error messages)
    lastError: null,

    async getLists() {
        this.lastError = null;
        const token = await this.getToken();
        if (!token) {
            this.lastError = 'no-token';
            return null;
        }

        try {
            const response = await fetch(`${this.API_BASE}/users/@me/lists`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                Debug.log('TasksAdapter: Failed to fetch task lists:', response.status, error);
                if (response.status === 403 || response.status === 401) {
                    this.lastError = 'scope';
                } else {
                    this.lastError = 'api-error';
                }
                return null;
            }

            const data = await response.json();
            return data.items || [];
        } catch (e) {
            Debug.log('TasksAdapter: getLists error:', e.message);
            this.lastError = 'network';
            return null;
        }
    },

    /**
     * List tasks from a specific task list
     * @param {string} listId - Task list ID
     * @param {boolean} showCompleted - Include completed tasks
     * @returns {Promise<Array|null>} Array of task objects, or null on failure
     */
    async listTasks(listId, showCompleted = false) {
        const token = await this.getToken();
        if (!token) {
            Debug.log('TasksAdapter: No access token available');
            return null;
        }

        try {
            let allTasks = [];
            let pageToken = null;

            do {
                const params = new URLSearchParams({
                    maxResults: '100',
                    showCompleted: showCompleted ? 'true' : 'false',
                    showHidden: 'false'
                });
                if (pageToken) params.set('pageToken', pageToken);

                const response = await fetch(
                    `${this.API_BASE}/lists/${listId}/tasks?${params}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                if (!response.ok) {
                    const error = await response.json();
                    Debug.log('TasksAdapter: listTasks failed:', error.error?.message || response.status);
                    return null;
                }

                const data = await response.json();
                allTasks = allTasks.concat(data.items || []);
                pageToken = data.nextPageToken || null;
            } while (pageToken);

            Debug.log('TasksAdapter: listTasks returned', allTasks.length, 'tasks from list', listId);
            return allTasks;
        } catch (e) {
            Debug.log('TasksAdapter: listTasks error:', e.message);
            return null;
        }
    },

    /**
     * Delete a task from a specific task list
     * @param {string} listId - Task list ID
     * @param {string} taskId - Google Task ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteTask(listId, taskId) {
        const token = await this.getToken();
        if (!token) return false;

        try {
            const response = await fetch(
                `${this.API_BASE}/lists/${listId}/tasks/${taskId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok || response.status === 204) {
                Debug.log('TasksAdapter: Task deleted:', taskId);
                return true;
            }

            Debug.log('TasksAdapter: Delete task failed:', response.status);
            return false;
        } catch (e) {
            Debug.log('TasksAdapter: deleteTask error:', e.message);
            return false;
        }
    }
};

// Expose globally
window.TasksAdapter = TasksAdapter;
