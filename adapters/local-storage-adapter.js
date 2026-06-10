/**
 * LocalStorageAdapter — Brain Pie storage backend interface over localStorage.
 *
 * Implements the same async interface as FirebaseAdapter so StorageAdapter
 * can delegate to either backend without per-method if/else branching.
 * All subscribe/unsubscribe methods are no-ops (localStorage has no real-time).
 */
const LocalStorageAdapter = {
    supportsRealtime: false,

    // --- Multi-pie CRUD ---

    async saveMeta(meta) {
        return Storage.saveMeta(meta);
    },

    async loadMeta() {
        return Storage.loadMeta();
    },

    async savePie(pieId, data) {
        return Storage.savePie(pieId, data);
    },

    async loadPie(pieId) {
        return Storage.loadPie(pieId);
    },

    async deletePie(pieId) {
        return Storage.deletePie(pieId);
    },

    async migrateToMultiPie() {
        return Storage.migrateToMultiPie();
    },

    // Priorities are stored inside the pie blob for localStorage — no separate path
    async savePriorities(priorityList, pieId) {},

    async loadPriorities(pieId) {
        return null; // loaded from pie blob
    },

    // Legacy single-pie methods (used by StorageAdapter.save/load)
    async save(data) {
        return Storage.save(data);
    },

    async load() {
        return Storage.load();
    },

    // Real-time subscription no-ops
    subscribeToPie(pieId, callback) {},
    subscribeToChanges(callback) {},
    unsubscribeFromChanges() {},
    subscribeToPriorityChanges(callback, pieId) {},
    unsubscribeFromPriorityChanges() {},
    subscribeToMeta(callback) {},
    unsubscribeFromMeta() {},

    isConnected() {
        return true; // localStorage is always available
    },

    getProjectId() {
        return null;
    },
};

window.LocalStorageAdapter = LocalStorageAdapter;
