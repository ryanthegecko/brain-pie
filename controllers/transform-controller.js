/**
 * Transform Controller — UI mixin for within-pie hierarchy transforms.
 * Mixed into the UI object via Object.assign().
 */
Object.assign(UI, {

    transformState: {
        step: 1,
        selectedType: null,     // 'category', 'slice', 'spoke'
        selectedCategoryId: null,
        selectedItemId: null,
        selectedSpokeIndex: null,
        transformId: null,      // 'spoke-to-slice', etc.
        targetCategoryId: null,
        targetItemId: null,
        preview: null
    },

    showTransform() {
        // Reset state
        this.transformState = {
            step: 1,
            selectedType: null,
            selectedCategoryId: null,
            selectedItemId: null,
            selectedSpokeIndex: null,
            transformId: null,
            targetCategoryId: null,
            targetItemId: null,
            preview: null
        };

        // Close settings
        this.closeSettings();

        // Open overlay
        const overlay = document.getElementById('transform-overlay');
        if (overlay) overlay.classList.add('active');

        this.renderTransformStep();
    },

    closeTransform() {
        const overlay = document.getElementById('transform-overlay');
        if (overlay) overlay.classList.remove('active');
    },

    renderTransformStep() {
        const state = this.transformState;

        // Update step indicators
        const steps = document.querySelectorAll('#transform-steps .import-step');
        steps.forEach(s => {
            const stepNum = parseInt(s.dataset.step);
            s.classList.toggle('active', stepNum <= state.step);
        });

        // Show correct step content
        for (let i = 1; i <= 3; i++) {
            const el = document.getElementById('transform-step-' + i);
            if (el) el.classList.toggle('active', i === state.step);
        }

        if (state.step === 1) this.renderTransformSourceTree();
        else if (state.step === 2) this.renderTransformOptions();
        else if (state.step === 3) this.renderTransformPreview();
    },

    transformNextStep() {
        const state = this.transformState;
        if (state.step === 1 && state.selectedType) {
            state.step = 2;
            // Reset transform selection when going forward
            state.transformId = null;
            state.targetCategoryId = null;
            state.targetItemId = null;
        } else if (state.step === 2 && state.transformId) {
            state.step = 3;
        }
        this.renderTransformStep();
    },

    transformPrevStep() {
        const state = this.transformState;
        if (state.step > 1) {
            state.step--;
        }
        this.renderTransformStep();
    },

    renderTransformSourceTree() {
        const container = document.getElementById('transform-source-tree');
        if (!container) return;

        const state = this.transformState;
        let html = '';

        for (const cat of DataModel.categories) {
            const sliceCount = (cat.items || []).length;
            const isSelected = state.selectedType === 'category' && state.selectedCategoryId === cat.id;

            html += `<div class="transform-tree-item${isSelected ? ' selected' : ''}"
                          onclick="UI.selectTransformSource('category', '${cat.id}')">
                <div class="tree-color" style="background:${cat.color}"></div>
                <span class="tree-icon">📁</span>
                <span class="tree-name">${this._escapeHtml(cat.name)}</span>
                <span class="tree-badge">${sliceCount} slice${sliceCount !== 1 ? 's' : ''}</span>
            </div>`;

            for (const item of (cat.items || [])) {
                const spokeCount = (item.subItems || []).length;
                const isItemSelected = state.selectedType === 'slice' && state.selectedItemId === item.id;

                html += `<div class="transform-tree-item indent-1${isItemSelected ? ' selected' : ''}"
                              onclick="UI.selectTransformSource('slice', '${cat.id}', '${item.id}')">
                    <div class="tree-color" style="background:${item.color || cat.color}"></div>
                    <span class="tree-icon">🍕</span>
                    <span class="tree-name">${this._escapeHtml(item.name)}</span>
                    <span class="tree-badge">${spokeCount} spoke${spokeCount !== 1 ? 's' : ''}</span>
                </div>`;

                // Only show list spokes with children (eligible for spoke-to-slice)
                for (let si = 0; si < (item.subItems || []).length; si++) {
                    const spoke = item.subItems[si];
                    if (typeof spoke !== 'object') continue;
                    const spokeType = spoke.type === 'action' ? 'list' : (spoke.type || 'static');
                    if (spokeType !== 'list' || !spoke.children || spoke.children.length === 0) continue;

                    const isSpokeSelected = state.selectedType === 'spoke' &&
                        state.selectedCategoryId === cat.id &&
                        state.selectedItemId === item.id &&
                        state.selectedSpokeIndex === si;

                    html += `<div class="transform-tree-item indent-2${isSpokeSelected ? ' selected' : ''}"
                                  onclick="UI.selectTransformSource('spoke', '${cat.id}', '${item.id}', ${si})">
                        <span class="tree-icon">📌</span>
                        <span class="tree-name">${this._escapeHtml(spoke.text)}</span>
                        <span class="tree-badge">${spoke.children.length} action${spoke.children.length !== 1 ? 's' : ''}</span>
                    </div>`;
                }
            }
        }

        if (!html) {
            html = '<div style="padding:20px; text-align:center; color:#999;">No items available to transform.</div>';
        }

        container.innerHTML = html;
        this.updateTransformNextButton();
    },

    selectTransformSource(type, categoryId, itemId, spokeIndex) {
        const state = this.transformState;
        state.selectedType = type;
        state.selectedCategoryId = categoryId;
        state.selectedItemId = itemId || null;
        state.selectedSpokeIndex = (spokeIndex !== undefined) ? spokeIndex : null;

        // Reset downstream state
        state.transformId = null;
        state.targetCategoryId = null;
        state.targetItemId = null;

        this.renderTransformSourceTree();
    },

    renderTransformOptions() {
        const state = this.transformState;
        const container = document.getElementById('transform-options');
        const targetSection = document.getElementById('transform-target-section');
        if (!container || !targetSection) return;

        const transforms = DataModel.getAvailableTransforms(
            state.selectedType,
            state.selectedCategoryId,
            state.selectedItemId,
            state.selectedSpokeIndex
        );

        if (transforms.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">No transforms available for this item.</div>';
            targetSection.style.display = 'none';
            this.updateTransformNextButton();
            return;
        }

        let html = '';
        for (const t of transforms) {
            const isSelected = state.transformId === t.id;
            html += `<button class="transform-option${isSelected ? ' selected' : ''}" onclick="UI.selectTransformType('${t.id}')">
                <div class="option-label">${this._escapeHtml(t.label)}</div>
                <div class="option-desc">${this._escapeHtml(t.description)}</div>
            </button>`;
        }
        container.innerHTML = html;

        // Show target selector if current transform needs one
        const currentTransform = transforms.find(t => t.id === state.transformId);
        if (currentTransform && currentTransform.needsTarget) {
            this.renderTransformTargetSelector(currentTransform.targetType);
            targetSection.style.display = 'block';
        } else {
            targetSection.style.display = 'none';
            targetSection.innerHTML = '';
        }

        this.updateTransformNextButton();
    },

    selectTransformType(transformId) {
        const state = this.transformState;
        state.transformId = transformId;
        state.targetCategoryId = null;
        state.targetItemId = null;
        this.renderTransformOptions();
    },

    renderTransformTargetSelector(targetType) {
        const state = this.transformState;
        const container = document.getElementById('transform-target-section');
        if (!container) return;

        let html = '<div class="transform-target-selector">';

        if (targetType === 'slice') {
            html += '<label>Target Slice:</label><select id="transform-target-select" onchange="UI.onTransformTargetChanged()">';
            html += '<option value="">Select a slice...</option>';

            for (const cat of DataModel.categories) {
                for (const item of (cat.items || [])) {
                    // Exclude source slice
                    if (item.id === state.selectedItemId) continue;
                    const selected = (state.targetCategoryId === cat.id && state.targetItemId === item.id) ? ' selected' : '';
                    html += `<option value="${cat.id}|${item.id}"${selected}>${this._escapeHtml(cat.name)} / ${this._escapeHtml(item.name)}</option>`;
                }
            }

            html += '</select>';
        } else if (targetType === 'category') {
            html += '<label>Target Category:</label><select id="transform-target-select" onchange="UI.onTransformTargetChanged()">';
            html += '<option value="">Select a category...</option>';

            for (const cat of DataModel.categories) {
                if (cat.id === state.selectedCategoryId) continue;
                const selected = (state.targetCategoryId === cat.id) ? ' selected' : '';
                html += `<option value="${cat.id}"${selected}>${this._escapeHtml(cat.name)}</option>`;
            }

            html += '</select>';
        }

        html += '</div>';
        container.innerHTML = html;
    },

    onTransformTargetChanged() {
        const state = this.transformState;
        const select = document.getElementById('transform-target-select');
        if (!select) return;

        const val = select.value;
        if (!val) {
            state.targetCategoryId = null;
            state.targetItemId = null;
        } else if (val.includes('|')) {
            // slice target: "catId|itemId"
            const [catId, itemId] = val.split('|');
            state.targetCategoryId = catId;
            state.targetItemId = itemId;
        } else {
            // category target: "catId"
            state.targetCategoryId = val;
            state.targetItemId = null;
        }

        this.updateTransformNextButton();
    },

    renderTransformPreview() {
        const state = this.transformState;
        const sourceEl = document.getElementById('transform-preview-source');
        const resultEl = document.getElementById('transform-preview-result');
        if (!sourceEl || !resultEl) return;

        const params = {
            categoryId: state.selectedCategoryId,
            itemId: state.selectedItemId,
            spokeIndex: state.selectedSpokeIndex,
            targetCategoryId: state.targetCategoryId,
            targetItemId: state.targetItemId
        };

        const preview = DataModel.buildTransformPreview(state.transformId, params);
        state.preview = preview;

        if (!preview) {
            sourceEl.innerHTML = '<div style="color:#999;">Unable to generate preview.</div>';
            resultEl.innerHTML = '';
            return;
        }

        sourceEl.innerHTML = this.renderPreviewTree(preview.source, false, 0);
        resultEl.innerHTML = this.renderPreviewTree(preview.result, true, 0);
    },

    renderPreviewTree(node, showNew, depth) {
        if (!node) return '';

        const typeIcons = {
            category: '📁',
            slice: '🍕',
            spoke: '📌',
            action: '📎'
        };

        const icon = typeIcons[node.type] || '•';
        const newBadge = (showNew && node.isNew) ? '<span class="new-badge">NEW</span>' : '';

        let html = `<div class="preview-node depth-${Math.min(depth, 3)}">
            <span class="node-icon">${icon}</span>
            ${this._escapeHtml(node.name)}${newBadge}
        </div>`;

        if (node.children) {
            for (const child of node.children) {
                html += this.renderPreviewTree(child, showNew, depth + 1);
            }
        }

        return html;
    },

    executeTransform() {
        const state = this.transformState;

        const params = {
            categoryId: state.selectedCategoryId,
            itemId: state.selectedItemId,
            spokeIndex: state.selectedSpokeIndex,
            targetCategoryId: state.targetCategoryId,
            targetItemId: state.targetItemId
        };

        try {
            DataModel.executeTransform(state.transformId, params);

            // Reset expanded view (target may have been removed)
            if (typeof ChartRenderer !== 'undefined') {
                ChartRenderer.expandedView = null;
            }

            this.closeTransform();

            // Re-render
            if (typeof App !== 'undefined' && App.render) {
                App.render();
            }

            Storage.showStatus('Transform complete');
        } catch (e) {
            console.error('Transform failed:', e);
            Storage.showStatus('Transform failed: ' + e.message);
        }
    },

    updateTransformNextButton() {
        const state = this.transformState;

        // Step 1: need a selection
        const btn1 = document.getElementById('transform-next-1');
        if (btn1) {
            btn1.disabled = !state.selectedType;
        }

        // Step 2: need a transform (+ target if needed)
        const btn2 = document.getElementById('transform-next-2');
        if (btn2) {
            if (!state.transformId) {
                btn2.disabled = true;
            } else {
                const transforms = DataModel.getAvailableTransforms(
                    state.selectedType,
                    state.selectedCategoryId,
                    state.selectedItemId,
                    state.selectedSpokeIndex
                );
                const current = transforms.find(t => t.id === state.transformId);
                if (current && current.needsTarget) {
                    if (current.targetType === 'slice') {
                        btn2.disabled = !state.targetCategoryId || !state.targetItemId;
                    } else {
                        btn2.disabled = !state.targetCategoryId;
                    }
                } else {
                    btn2.disabled = false;
                }
            }
        }
    },

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
