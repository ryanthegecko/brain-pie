const Storage = {
    STORAGE_KEY: 'brainPieChartData',
    META_KEY: 'brainPie_meta',
    PIE_KEY_PREFIX: 'brainPie_pie_',

    // --- Multi-pie localStorage methods ---

    saveMeta(meta) {
        try {
            localStorage.setItem(this.META_KEY, JSON.stringify(meta));
            return true;
        } catch (error) {
            console.error('Meta save error:', error);
            return false;
        }
    },

    loadMeta() {
        try {
            const json = localStorage.getItem(this.META_KEY);
            return json ? JSON.parse(json) : null;
        } catch (error) {
            console.error('Meta load error:', error);
            return null;
        }
    },

    savePie(pieId, data) {
        try {
            localStorage.setItem(this.PIE_KEY_PREFIX + pieId, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Pie save error:', error);
            return false;
        }
    },

    loadPie(pieId) {
        try {
            const json = localStorage.getItem(this.PIE_KEY_PREFIX + pieId);
            return json ? JSON.parse(json) : null;
        } catch (error) {
            console.error('Pie load error:', error);
            return null;
        }
    },

    deletePie(pieId) {
        localStorage.removeItem(this.PIE_KEY_PREFIX + pieId);
    },

    /**
     * Migrate old single-blob format to multi-pie format.
     * Returns the meta object if migration happened, null if no old data.
     */
    migrateToMultiPie() {
        // Already migrated?
        const existing = this.loadMeta();
        if (existing) return existing;

        // Check for old format
        const oldData = this.load();
        if (!oldData || !oldData.categories) return null;

        const pieId = 'pie-' + Date.now();
        const meta = { pieIds: [pieId], activePieId: pieId, pieNames: { [pieId]: 'My Pie' } };
        const pieData = {
            id: pieId,
            name: 'My Pie',
            categories: oldData.categories,
            categoryPercentageOverrides: oldData.categoryPercentageOverrides || {},
            priorityList: oldData.priorityList || []
        };

        this.saveMeta(meta);
        this.savePie(pieId, pieData);

        // Remove old key
        localStorage.removeItem(this.STORAGE_KEY);

        Debug.log('Migrated old localStorage data to multi-pie format, pieId:', pieId);
        return meta;
    },

    save(data) {
        try {
            const jsonData = JSON.stringify(data);
            localStorage.setItem(this.STORAGE_KEY, jsonData);
            this.showStatus('Data saved automatically', 'success');
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            this.showStatus('Failed to save data', 'error');
            return false;
        }
    },

    async loadInitialFileIfAny(dataModel) {
        // 1. Get previously saved handle (if any)
        const handle = await FileHandleStore.getHandle();
        if (!handle) return; // nothing to do

        // 2. Check permission
        const perm = await handle.queryPermission({ mode: 'read' });
        if (perm === 'denied') {
        // User revoked access; forget the handle
        await FileHandleStore.clearHandle();
        return;
        }
        if (perm === 'prompt') {
        const newPerm = await handle.requestPermission({ mode: 'read' });
        if (newPerm !== 'granted') return;
        }

        // 3. Read and parse the file
        try {
        const file = await handle.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.categories) {
            dataModel.setCategories(data.categories);
        }
        if (data.categoryPercentageOverrides) {
            dataModel.categoryPercentageOverrides = data.categoryPercentageOverrides;
        }

        Storage.showStatus('Data loaded from backup file', 'success');
        } catch (err) {
        console.error('Initial file load error:', err);
        Storage.showStatus('Failed to read backup file', 'error');
        }
    },
    
    load() {
        try {
            const jsonData = localStorage.getItem(this.STORAGE_KEY);
            if (jsonData) {
                this.showStatus('Data loaded from storage', 'success');
                return JSON.parse(jsonData);
            }
            return null;
        } catch (error) {
            console.error('Load error:', error);
            this.showStatus('Failed to load data', 'error');
            return null;
        }
    },
    
    exportToFile(data) {
        const jsonData = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const pieName = (typeof DataModel !== 'undefined' && DataModel.currentPieName)
            ? DataModel.currentPieName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase()
            : 'chart';
        a.download = `brain-pie-${pieName}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showStatus('Data exported successfully', 'success');
    },
    
    importFromFile(file, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                callback(data);
                this.showStatus('Data imported successfully', 'success');
            } catch (error) {
                console.error('Import error:', error);
                this.showStatus('Failed to import data - invalid JSON', 'error');
                alert('Failed to import data. Please check that the file is a valid JSON export.');
            }
        };
        reader.onerror = () => {
            this.showStatus('Failed to read file', 'error');
        };
        reader.readAsText(file);
    },
    
    showStatus(message, type) {
        const statusEl = document.getElementById('storage-status');
        statusEl.textContent = message;
        statusEl.className = `storage-status ${type}`;
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'storage-status';
        }, 3000);
    }
};