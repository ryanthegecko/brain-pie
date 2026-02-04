/**
 * TutorialManager - Guides first-time users through Brain Pie
 *
 * Flow: Welcome → Create Slice → Add Spoke → Add Action → Schedule → Calendar Sync → Complete
 */
const TutorialManager = {
    COMPLETED_KEY: 'brainPieTutorialCompleted',
    STEP_KEY: 'brainPieTutorialStep',

    steps: [
        {
            id: 'welcome',
            type: 'modal',
            title: 'Welcome to Brain Pie!',
            content: 'Let me show you how to organize your mind in a few simple steps.',
            nextAction: 'click-next'
        },
        {
            id: 'open-menu',
            type: 'spotlight',
            title: 'Open the Menu',
            content: 'Click the "+ Add" button to create your first slice.',
            highlight: '.top-bar-right button:first-child',
            mobileHighlight: '.top-bar-right-mobile button:first-child',
            nextEvent: 'menu-opened'
        },
        {
            id: 'create-slice',
            type: 'spotlight',
            title: 'Create a Slice',
            content: 'Select a category (or create one), then type a slice name like "Morning Routine" and click "Add Slice".',
            highlight: '#menu-tab-1',
            nextEvent: 'slice-added'
        },
        {
            id: 'close-menu',
            type: 'spotlight',
            title: 'Close the Menu',
            content: 'Great! Now close the menu by clicking the X or outside the menu.',
            highlight: '.menu-close',
            nextEvent: 'menu-closed'
        },
        {
            id: 'add-spoke',
            type: 'spotlight',
            title: 'Add a Spoke',
            content: 'Find your new slice in the list below and type a spoke (task) in the input field.',
            highlight: '.add-spoke-input',
            highlightDynamic: true,
            nextEvent: 'spoke-added'
        },
        {
            id: 'add-action',
            type: 'spotlight',
            title: 'Add an Action',
            content: 'Click the + button next to your spoke to add a specific action.',
            highlight: '.spoke-add-btn',
            highlightDynamic: true,
            nextEvent: 'action-added'
        },
        {
            id: 'schedule-action',
            type: 'spotlight',
            title: 'Schedule Your Action',
            content: 'Choose "One-time" to add this action to your calendar.',
            highlight: '.action-type-btn-onetime',
            nextEvent: 'action-scheduled'
        },
        {
            id: 'calendar-sync',
            type: 'modal',
            title: 'Calendar Magic!',
            content: 'Your action is now on your calendar! Try moving it in Google Calendar - when you come back, Brain Pie will detect the change automatically.',
            nextAction: 'click-next',
            showSyncButton: true
        },
        {
            id: 'complete',
            type: 'modal',
            title: "You're All Set!",
            content: 'You now know the basics. Explore categories, slices, spokes, and actions to organize your mind your way. You can restart this tutorial anytime from Settings.',
            nextAction: 'finish'
        }
    ],

    currentStepIndex: 0,
    isActive: false,
    createdSliceId: null,  // Track the slice user creates for highlighting

    /**
     * Check if tutorial should start
     */
    shouldStartTutorial() {
        // Don't start if already completed
        if (localStorage.getItem(this.COMPLETED_KEY)) {
            return false;
        }
        // Only start for first-time users (no stored data before example loaded)
        // This is indicated by DataModel having example data
        return true;
    },

    /**
     * Start the tutorial
     */
    start() {
        // Check for saved progress
        const savedStep = localStorage.getItem(this.STEP_KEY);
        if (savedStep) {
            this.currentStepIndex = parseInt(savedStep, 10);
            // Validate saved step
            if (this.currentStepIndex >= this.steps.length) {
                this.currentStepIndex = 0;
            }
        } else {
            this.currentStepIndex = 0;
        }

        this.isActive = true;
        this.renderCurrentStep();
    },

    /**
     * Move to next step
     */
    nextStep() {
        this.hideAll();
        this.currentStepIndex++;

        // Save progress
        localStorage.setItem(this.STEP_KEY, this.currentStepIndex.toString());

        if (this.currentStepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        this.renderCurrentStep();
    },

    /**
     * Skip the tutorial
     */
    skip() {
        this.hideAll();
        this.isActive = false;
        localStorage.setItem(this.COMPLETED_KEY, 'true');
        localStorage.removeItem(this.STEP_KEY);
    },

    /**
     * Complete the tutorial
     */
    complete() {
        this.hideAll();
        this.isActive = false;
        localStorage.setItem(this.COMPLETED_KEY, 'true');
        localStorage.removeItem(this.STEP_KEY);
        Storage.showStatus('Tutorial complete!', 'success');
    },

    /**
     * Restart the tutorial (from Settings)
     */
    restart() {
        localStorage.removeItem(this.COMPLETED_KEY);
        localStorage.removeItem(this.STEP_KEY);
        this.currentStepIndex = 0;
        this.isActive = false;
        this.createdSliceId = null;
        this.start();
    },

    /**
     * Render the current step
     */
    renderCurrentStep() {
        const step = this.steps[this.currentStepIndex];
        if (!step) return;

        if (step.type === 'modal') {
            this.showModal(step);
        } else if (step.type === 'spotlight') {
            this.showSpotlight(step);
        }
    },

    /**
     * Show a modal step
     */
    showModal(step) {
        const overlay = document.getElementById('tutorial-modal-overlay');
        const title = document.getElementById('tutorial-modal-title');
        const text = document.getElementById('tutorial-modal-text');
        const buttons = document.getElementById('tutorial-modal-buttons');

        title.textContent = step.title;
        text.textContent = step.content;

        // Build buttons
        let buttonsHtml = '';

        if (step.nextAction === 'finish') {
            buttonsHtml = `
                <button class="tutorial-btn primary" onclick="TutorialManager.complete()">Finish</button>
            `;
        } else {
            buttonsHtml = `
                <button class="tutorial-btn secondary" onclick="TutorialManager.skip()">Skip Tutorial</button>
            `;

            if (step.showSyncButton) {
                buttonsHtml += `
                    <button class="tutorial-btn" onclick="TutorialManager.checkCalendarSync()">Check for Changes</button>
                `;
            }

            buttonsHtml += `
                <button class="tutorial-btn primary" onclick="TutorialManager.nextStep()">
                    ${this.currentStepIndex === 0 ? "Let's Go!" : 'Next'}
                </button>
            `;
        }

        buttons.innerHTML = buttonsHtml;
        overlay.classList.add('active');
    },

    /**
     * Hide modal
     */
    hideModal() {
        const overlay = document.getElementById('tutorial-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    /**
     * Show a spotlight step
     */
    showSpotlight(step) {
        const overlay = document.getElementById('tutorial-overlay');
        const spotlight = document.getElementById('tutorial-spotlight');
        const tooltip = document.getElementById('tutorial-tooltip');
        const title = document.getElementById('tutorial-title');
        const content = document.getElementById('tutorial-content');
        const buttons = document.getElementById('tutorial-buttons');

        // Find the element to highlight
        let selector = step.highlight;

        // Use mobile selector if on mobile
        if (step.mobileHighlight && window.innerWidth <= 768) {
            selector = step.mobileHighlight;
        }

        // For dynamic highlights (e.g., newly created elements)
        if (step.highlightDynamic) {
            selector = this.getDynamicSelector(step.id);
        }

        const targetEl = document.querySelector(selector);
        if (!targetEl) {
            // Element not found, skip to next step or wait
            console.warn('Tutorial: Target element not found:', selector);
            // For some steps, we can just show the tooltip without spotlight
            this.showFloatingTooltip(step);
            return;
        }

        // Position spotlight over target
        const rect = targetEl.getBoundingClientRect();
        const padding = 8;

        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';

        // Set tooltip content
        title.textContent = step.title;
        content.textContent = step.content;
        buttons.innerHTML = `
            <button class="tutorial-btn secondary" onclick="TutorialManager.skip()">Skip</button>
        `;

        // Position tooltip near spotlight
        this.positionTooltip(tooltip, rect);

        overlay.classList.add('active');
    },

    /**
     * Get dynamic selector based on step and context
     */
    getDynamicSelector(stepId) {
        if (stepId === 'add-spoke') {
            // Find the last category's last item's input
            const inputs = document.querySelectorAll('.add-spoke-input');
            if (inputs.length > 0) {
                return '.category-section:last-child .add-spoke-input';
            }
        }
        if (stepId === 'add-action') {
            // Find the last spoke's + button
            const btns = document.querySelectorAll('.spoke-add-btn');
            if (btns.length > 0) {
                return '.spoke-item:last-child .spoke-add-btn';
            }
        }
        return null;
    },

    /**
     * Show tooltip without spotlight (fallback)
     */
    showFloatingTooltip(step) {
        const overlay = document.getElementById('tutorial-overlay');
        const spotlight = document.getElementById('tutorial-spotlight');
        const tooltip = document.getElementById('tutorial-tooltip');
        const title = document.getElementById('tutorial-title');
        const content = document.getElementById('tutorial-content');
        const buttons = document.getElementById('tutorial-buttons');

        // Hide spotlight
        spotlight.style.display = 'none';

        // Set tooltip content
        title.textContent = step.title;
        content.textContent = step.content;
        buttons.innerHTML = `
            <button class="tutorial-btn secondary" onclick="TutorialManager.skip()">Skip</button>
        `;

        // Center tooltip
        tooltip.style.left = '50%';
        tooltip.style.top = '30%';
        tooltip.style.transform = 'translate(-50%, -50%)';

        overlay.classList.add('active');
    },

    /**
     * Position tooltip near the spotlight
     */
    positionTooltip(tooltip, targetRect) {
        const tooltipWidth = 320;
        const tooltipHeight = 150; // Approximate
        const margin = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left, top;

        // Prefer positioning below the target
        if (targetRect.bottom + margin + tooltipHeight < viewportHeight) {
            top = targetRect.bottom + margin;
            left = targetRect.left;
        }
        // Try above
        else if (targetRect.top - margin - tooltipHeight > 0) {
            top = targetRect.top - margin - tooltipHeight;
            left = targetRect.left;
        }
        // Try to the right
        else if (targetRect.right + margin + tooltipWidth < viewportWidth) {
            top = targetRect.top;
            left = targetRect.right + margin;
        }
        // Try to the left
        else {
            top = targetRect.top;
            left = targetRect.left - margin - tooltipWidth;
        }

        // Keep within viewport
        left = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));
        top = Math.max(margin, Math.min(top, viewportHeight - tooltipHeight - margin));

        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        tooltip.style.transform = 'none';
    },

    /**
     * Hide spotlight
     */
    hideSpotlight() {
        const overlay = document.getElementById('tutorial-overlay');
        const spotlight = document.getElementById('tutorial-spotlight');
        if (overlay) {
            overlay.classList.remove('active');
        }
        if (spotlight) {
            spotlight.style.display = 'block';
        }
    },

    /**
     * Hide all tutorial UI
     */
    hideAll() {
        this.hideModal();
        this.hideSpotlight();
    },

    /**
     * Called by app code when events happen
     */
    notifyEvent(eventType, data) {
        if (!this.isActive) return;

        const step = this.steps[this.currentStepIndex];
        if (!step || step.type !== 'spotlight') return;

        // Check if this event advances the current step
        if (step.nextEvent === eventType) {
            // Store context if needed
            if (eventType === 'slice-added' && data && data.itemId) {
                this.createdSliceId = data.itemId;
            }

            // Small delay to let UI update before advancing
            setTimeout(() => this.nextStep(), 300);
        }
    },

    /**
     * Check calendar for changes (calendar sync step)
     */
    async checkCalendarSync() {
        if (typeof App !== 'undefined' && App.syncCalendarEvents) {
            Storage.showStatus('Checking calendar...', 'default');
            const results = await App.syncCalendarEvents();
            if (results && (results.updated > 0 || results.deleted > 0)) {
                Storage.showStatus(`Found ${results.updated + results.deleted} change(s)!`, 'success');
            } else {
                Storage.showStatus('No changes found', 'default');
            }
        }
        this.nextStep();
    }
};
