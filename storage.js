const Storage = {
    STORAGE_KEY: 'brainPieChartData',
    
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
        a.download = `brain-pie-chart-${new Date().toISOString().split('T')[0]}.json`;
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