// Prioritiser Controller — Prioritiser window, drag-to-reorder, star buttons
Object.assign(UI, {
    // --- Prioritiser ---

    prioritiserShowAll: false,
    prioritiserDragState: null,

    togglePrioritiser() {
        const win = document.getElementById('prioritiser-window');
        if (win.classList.contains('active')) {
            this.closePrioritiser();
        } else {
            this.openPrioritiser();
        }
    },

    openPrioritiser() {
        const win = document.getElementById('prioritiser-window');
        win.classList.add('active');
        this.renderPriorityList();
        this.initPrioritiserDrag();
        localStorage.setItem('brainPiePrioritiserOpen', 'true');
        // If the window is off-screen (e.g. saved position from a different viewport),
        // reset it to the default top-right position.
        requestAnimationFrame(() => {
            const rect = win.getBoundingClientRect();
            if (rect.right < 0 || rect.left > window.innerWidth || rect.bottom < 0 || rect.top > window.innerHeight) {
                win.style.left = '';
                win.style.top = '';
                win.style.right = '20px';
                localStorage.removeItem('brainPiePrioritiserPos');
            }
        });
    },

    closePrioritiser() {
        document.getElementById('prioritiser-window').classList.remove('active');
        localStorage.setItem('brainPiePrioritiserOpen', 'false');
    },

    restorePrioritiserState() {
        const win = document.getElementById('prioritiser-window');
        // Restore position
        const pos = localStorage.getItem('brainPiePrioritiserPos');
        if (pos) {
            try {
                const { left, top } = JSON.parse(pos);
                win.style.left = left + 'px';
                win.style.top = top + 'px';
                win.style.right = 'auto';
            } catch (e) {}
        }
        // Restore open state
        if (localStorage.getItem('brainPiePrioritiserOpen') === 'true') {
            this.openPrioritiser();
        }
    },

    savePrioritiserPosition() {
        const win = document.getElementById('prioritiser-window');
        const rect = win.getBoundingClientRect();
        localStorage.setItem('brainPiePrioritiserPos', JSON.stringify({ left: rect.left, top: rect.top }));
    },

    isPrioritised(ref) {
        return this.getPriorityIndex(ref) >= 0;
    },

    getPriorityIndex(ref) {
        return DataModel.priorityList.findIndex(p =>
            p.type === ref.type &&
            p.categoryId === ref.categoryId &&
            p.itemId === ref.itemId &&
            p.spokeIndex === ref.spokeIndex &&
            (ref.childIndex == null ? p.childIndex == null : p.childIndex === ref.childIndex)
        );
    },

    addToPriorities(ref) {
        const result = DataModel.addPriority(ref);
        if (result === 'added') {
            Storage.showStatus('Added to priorities');
        } else if (result === 'moved') {
            Storage.showStatus('Moved to top');
        }
        this.openPrioritiser();
        App.render();
    },

    togglePriority(ref) {
        const idx = this.getPriorityIndex(ref);
        if (idx >= 0) {
            DataModel.removePriority(idx);
            Storage.showStatus('Removed from priorities');
            this.renderPriorityList();
            App.render();
        } else {
            this.addToPriorities(ref);
        }
    },

    // Scheduler star support
    schedulerStarRef: null,

    updateSchedulerStar(btnId, ref) {
        this.schedulerStarRef = ref;
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.style.display = '';
        btn.classList.toggle('active', this.isPrioritised(ref));
    },

    toggleSchedulerStar(type) {
        if (!this.schedulerStarRef) return;
        const btnIds = { 'datetime': 'datetime-star-btn', 'recurrence': 'recurrence-star-btn', 'spoke-editor': 'spoke-editor-star-btn' };
        const btn = document.getElementById(btnIds[type]);
        this.addToPriorities(this.schedulerStarRef);
        if (btn) btn.classList.toggle('active', this.isPrioritised(this.schedulerStarRef));
    },

    renderPriorityList() {
        DataModel.validatePriorityList();
        const list = document.getElementById('prioritiser-list');
        const empty = document.getElementById('prioritiser-empty');
        const showAllBtn = document.getElementById('prioritiser-show-all');

        const priorities = DataModel.priorityList;
        const maxVisible = this.prioritiserShowAll ? priorities.length : 5;
        const visible = priorities.slice(0, maxVisible);

        if (priorities.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            showAllBtn.style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        showAllBtn.style.display = priorities.length > 5 ? 'block' : 'none';
        if (priorities.length > 5) {
            showAllBtn.querySelector('button').textContent = this.prioritiserShowAll ? 'Show top 5' : `Show all (${priorities.length})`;
        }

        list.innerHTML = visible.map((ref, idx) => {
            const resolved = DataModel.resolvePriority(ref);
            if (!resolved) return '';

            // Build action button based on spoke type
            let actionBtn = '';
            if (ref.type === 'spoke' || ref.type === 'action') {
                const category = DataModel.categories.find(c => c.id === ref.categoryId);
                const item = category ? category.items.find(i => i.id === ref.itemId) : null;
                if (item && item.subItems && ref.spokeIndex != null && ref.spokeIndex < item.subItems.length) {
                    const spoke = item.subItems[ref.spokeIndex];
                    const spokeType = DataModel.getSpokeType(ref.categoryId, ref.itemId, ref.spokeIndex);
                    if (spokeType === 'single') {
                        const sched = typeof spoke === 'object' ? spoke.scheduled : null;
                        if (sched && sched.date) {
                            const d = new Date(sched.date + 'T' + (sched.time || '00:00'));
                            const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                            const timeStr = sched.time ? ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                            const borderStyle = UI.getScheduleBorderStyle(sched.date, sched.time);
                            const opacity = UI.getSchedulePillOpacityForDate(sched.date, sched.time, true);
                            actionBtn = `<button class="small" style="padding:2px 6px;font-size:10px;border-radius:10px;opacity:${opacity};${borderStyle}cursor:pointer;" onclick="event.stopPropagation(); UI.showSpokeEditor('${ref.categoryId}','${ref.itemId}',${ref.spokeIndex})" title="Reschedule">${dateStr}${timeStr}</button>`;
                        } else {
                            actionBtn = `<button class="small" style="background:#4285F4;padding:2px 6px;font-size:12px;color:#fff;border-radius:10px;border:none;cursor:pointer;" onclick="event.stopPropagation(); UI.showSpokeEditor('${ref.categoryId}','${ref.itemId}',${ref.spokeIndex})" title="Schedule">📅</button>`;
                        }
                    } else if (spokeType === 'repeating') {
                        const recurrence = typeof spoke === 'object' && spoke.metadata ? spoke.metadata.recurrence : null;
                        if (recurrence) {
                            const recText = UI.formatRecurrenceDescriptionCompact(recurrence);
                            const recDate = ChartRenderer.getNextOccurrence(recurrence) || recurrence.startDate;
                            const recBorder = UI.getScheduleBorderStyle(recDate, recurrence.time);
                            const recOpacity = UI.getSchedulePillOpacityForDate(recDate, recurrence.time, true);
                            actionBtn = `<button class="small" style="padding:2px 6px;font-size:10px;border-radius:10px;opacity:${recOpacity};${recBorder}cursor:pointer;" onclick="event.stopPropagation(); UI.showSpokeEditor('${ref.categoryId}','${ref.itemId}',${ref.spokeIndex})" title="Edit recurrence">${recText}</button>`;
                        } else {
                            actionBtn = `<button class="small" style="background:#4285F4;padding:2px 6px;font-size:12px;color:#fff;border-radius:10px;border:none;cursor:pointer;" onclick="event.stopPropagation(); UI.showSpokeEditor('${ref.categoryId}','${ref.itemId}',${ref.spokeIndex})" title="Set recurrence">🔁</button>`;
                        }
                    } else if (spokeType === 'list') {
                        actionBtn = `<button class="small" style="background:#4285F4;padding:2px 6px;font-size:12px;color:#fff;border-radius:10px;border:none;cursor:pointer;" onclick="event.stopPropagation(); UI.navigateToPriority(${idx})" title="Edit actions">✏️</button>`;
                    }
                }
            }

            return `
                <div class="prioritiser-item" draggable="true"
                    data-priority-index="${idx}"
                    onclick="UI.navigateToPriority(${idx})"
                    ondragstart="UI.handlePriorityDragStart(event, ${idx})"
                    ondragend="UI.handlePriorityDragEnd(event)"
                    ondragover="UI.handlePriorityDragOver(event)"
                    ondrop="UI.handlePriorityDrop(event, ${idx})">
                    <span class="priority-rank">${idx + 1}</span>
                    <span class="priority-color" style="background: ${resolved.color}"></span>
                    <div class="priority-info" style="cursor: pointer">
                        <div class="priority-name">${UI.linkifyUrls(resolved.displayName)}</div>
                        <div class="priority-context">${resolved.context}</div>
                    </div>
                    ${actionBtn}
                    <button class="priority-star-btn active" onclick="event.stopPropagation(); UI.bumpPriority(${idx})" title="Move to top">&#9733;</button>
                    <button class="priority-remove" onclick="event.stopPropagation(); UI.removePriority(${idx})" title="Remove from priorities">&#10005;</button>
                </div>
            `;
        }).join('');
    },

    togglePrioritiserShowAll() {
        this.prioritiserShowAll = !this.prioritiserShowAll;
        this.renderPriorityList();
    },

    removePriority(index) {
        DataModel.removePriority(index);
        this.renderPriorityList();
        App.render();
    },

    bumpPriority(index) {
        if (index === 0) {
            this.removePriority(0);
            return;
        }
        DataModel.reorderPriority(index, 0);
        this.renderPriorityList();
    },

    navigateToPriority(index) {
        const ref = DataModel.priorityList[index];
        if (!ref) return;

        // Expand the slice in the pie view
        ChartRenderer.expandedView = { type: 'slice', categoryId: ref.categoryId, itemId: ref.itemId };
        App.render();

        // For action or spoke refs on list spokes, open the action popup after render
        if ((ref.type === 'action' || ref.type === 'spoke') && ref.spokeIndex != null) {
            const category = DataModel.categories.find(c => c.id === ref.categoryId);
            if (!category) return;
            const item = category.items.find(i => i.id === ref.itemId);
            if (!item) return;
            const spoke = (item.subItems || [])[ref.spokeIndex];
            if (!spoke || typeof spoke !== 'object' || !spoke.children || spoke.children.length === 0) return;
            const categoryName = category.name;
            const sliceName = item.name;
            requestAnimationFrame(() => {
                ChartRenderer.showActionPopup(null, spoke, categoryName, sliceName, ref.categoryId, ref.itemId, ref.spokeIndex);
            });
        }
    },

    // Priority item drag-to-reorder
    handlePriorityDragStart(event, index) {
        this.prioritiserDragState = { fromIndex: index };
        event.target.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', index.toString());
    },

    handlePriorityDragEnd(event) {
        this.prioritiserDragState = null;
        event.target.classList.remove('dragging');
        document.querySelectorAll('.prioritiser-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    },

    handlePriorityDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const item = event.target.closest('.prioritiser-item');
        if (item) {
            document.querySelectorAll('.prioritiser-item.drag-over').forEach(el => el.classList.remove('drag-over'));
            item.classList.add('drag-over');
        }
    },

    handlePriorityDrop(event, toIndex) {
        event.preventDefault();
        document.querySelectorAll('.prioritiser-item.drag-over').forEach(el => el.classList.remove('drag-over'));
        if (!this.prioritiserDragState) return;
        const fromIndex = this.prioritiserDragState.fromIndex;
        if (fromIndex !== toIndex) {
            DataModel.reorderPriority(fromIndex, toIndex);
            this.renderPriorityList();
        }
        this.prioritiserDragState = null;
    },

    // Draggable window
    initPrioritiserDrag() {
        const titlebar = document.getElementById('prioritiser-titlebar');
        const win = document.getElementById('prioritiser-window');
        if (titlebar._dragInit) return;
        titlebar._dragInit = true;

        let isDragging = false;
        let startX, startY, startLeft, startTop;

        const onStart = (clientX, clientY) => {
            isDragging = true;
            const rect = win.getBoundingClientRect();
            startX = clientX;
            startY = clientY;
            startLeft = rect.left;
            startTop = rect.top;
            win.style.transition = 'none';
        };

        const onMove = (clientX, clientY) => {
            if (!isDragging) return;
            const dx = clientX - startX;
            const dy = clientY - startY;
            win.style.left = (startLeft + dx) + 'px';
            win.style.top = (startTop + dy) + 'px';
            win.style.right = 'auto';
        };

        const onEnd = () => {
            if (isDragging) {
                UI.savePrioritiserPosition();
            }
            isDragging = false;
            win.style.transition = '';
        };

        // Mouse events
        titlebar.addEventListener('mousedown', (e) => {
            e.preventDefault();
            onStart(e.clientX, e.clientY);
        });
        document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
        document.addEventListener('mouseup', onEnd);

        // Touch events
        titlebar.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            onStart(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const t = e.touches[0];
            onMove(t.clientX, t.clientY);
        }, { passive: true });
        document.addEventListener('touchend', onEnd);
    }
});
