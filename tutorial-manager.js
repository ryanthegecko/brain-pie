/**
 * TutorialManager - Guides first-time users through Brain Pie
 *
 * Flow:
 * 1. Welcome
 * 2. Show "Life Pie" (ExampleData) - explain whole-life organization
 * 3. Show "Team Pie" (ExampleData2) - explain team/project usage
 * 4. Offer calendar login for 2-way sync
 * 5. Load "Health Pie" (ExampleData3) - simple pie for hands-on learning
 * 6. Guide: Add new "Yoga" slice
 * 7. Guide: Add spoke "Trial class"
 * 8. Guide: Schedule action for next Wednesday 6:45pm
 * 9. Complete
 */
const TutorialManager = {
    COMPLETED_KEY: 'brainPieTutorialCompleted',
    STEP_KEY: 'brainPieTutorialStep',

    steps: [
        {
            id: 'welcome',
            type: 'modal',
            title: 'Welcome to Brain Pie! 🥧',
            content: "I'll show you different ways people use Brain Pie, then we'll create something together.",
            buttons: [
                { text: 'Skip Tutorial', action: 'skip', class: 'secondary' },
                { text: "Let's Go!", action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'life-pie',
            type: 'modal',
            title: 'The Life Pie',
            content: 'This is a "whole life" pie. Categories like Home, Health, Learning, and Social help organize everything on your mind. Slices represent individual items in each category, and each slice can be given Spokes, often representing steps needed, or more granular tasks.',
            onEnter: 'loadLifePie',
            buttons: [
                { text: 'Skip', action: 'skip', class: 'secondary' },
                { text: 'Explore', action: 'explore', class: '' },
                { text: 'Next', action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'team-pie',
            type: 'modal',
            title: 'The Team Pie',
            content: "This is a project pie for a team. Each category is a team member (PM, Designer, Developer). It's clear who's doing what, what's done, and what's in progress. Everyone can add and update.",
            onEnter: 'loadTeamPie',
            buttons: [
                { text: 'Skip', action: 'skip', class: 'secondary' },
                { text: 'Explore', action: 'explore', class: '' },
                { text: 'Next', action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'calendar-login',
            type: 'modal',
            title: 'Calendar Sync',
            content: 'Sign in with Google to enable 2-way sync. When you move an event in Google Calendar, Brain Pie updates automatically. Without sign-in, events still go to your calendar, just one-way.',
            buttons: [
                { text: 'Skip', action: 'skip', class: 'secondary' },
                { text: 'Maybe Later', action: 'next', class: '' },
                { text: 'Sign In', action: 'signIn', class: 'primary' }
            ]
        },
        {
            id: 'health-pie-intro',
            type: 'modal',
            title: "Let's Build Together",
            content: "Here's a simple Health pie. We want to start taking sleep more seriously - let's add a Sleep slice to keep it on our radar.",
            onEnter: 'loadHealthPie',
            buttons: [
                { text: 'Skip', action: 'skip', class: 'secondary' },
                { text: "Let's Add It!", action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'open-menu',
            type: 'spotlight',
            title: 'Open the Menu',
            content: 'Click "+ Add" to create a new Sleep slice.',
            highlight: '.top-bar-right button:first-child',
            mobileHighlight: '.top-bar-right-mobile button:first-child',
            nextEvent: 'menu-opened'
        },
        {
            id: 'create-sleep-slice',
            type: 'spotlight',
            title: 'Add a Sleep Slice',
            content: 'Select the existing "Health" category, then type "Sleep" as the slice name and click "Add Slice".',
            highlight: '#menu-tab-1',
            nextEvent: 'slice-added'
        },
        {
            id: 'close-menu',
            type: 'spotlight',
            title: 'Close the Menu',
            content: 'Great! Close the menu to see your new Sleep slice.',
            highlight: '.menu-close',
            nextEvent: 'menu-closed'
        },
        {
            id: 'add-yoga-intro',
            type: 'modal',
            title: 'Now Add a Task',
            content: "Nice! Now imagine you saw an ad for a yoga class. Let's add it to the Exercise slice and schedule a trial.",
            buttons: [
                { text: 'Skip', action: 'skip', class: 'secondary' },
                { text: 'Continue', action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'add-spoke',
            type: 'spotlight',
            title: 'Add Yoga to Exercise',
            content: 'Find the Exercise slice below and type "Yoga" in the input field, then press Enter.',
            highlight: '.add-spoke-input',
            highlightDynamic: true,
            nextEvent: 'spoke-added'
        },
        {
            id: 'add-action',
            type: 'spotlight',
            title: 'Add a Trial Class',
            content: 'Click the + button next to Yoga to add "Trial class" as an action.',
            highlight: '.spoke-add-btn',
            highlightDynamic: true,
            nextEvent: 'action-added'
        },
        {
            id: 'schedule-action',
            type: 'spotlight',
            title: 'Schedule It',
            content: 'Choose "One-time" to schedule this. The trial class is next Wednesday at 6:45pm!',
            highlight: '.action-type-btn-onetime',
            nextEvent: 'action-scheduled'
        },
        {
            id: 'calendar-done',
            type: 'modal',
            title: 'Calendar Integration',
            content: "Set the date to next Wednesday, time to 6:45pm, and you can add the studio's address in the Location field. Click 'Add to Calendar' when ready!",
            buttons: [
                { text: 'Got It!', action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'complete',
            type: 'modal',
            title: "You're All Set! 🎉",
            content: "You've learned the basics: categories, slices, spokes, actions, and calendar sync. Restart this tutorial anytime from Settings. Now go organize your mind!",
            buttons: [
                { text: 'Finish', action: 'finish', class: 'primary' }
            ]
        }
    ],

    currentStepIndex: 0,
    isActive: false,
    isExploring: false,  // True when user clicked "Explore"

    /**
     * Check if tutorial should start
     */
    shouldStartTutorial() {
        if (localStorage.getItem(this.COMPLETED_KEY)) {
            return false;
        }
        return true;
    },

    /**
     * Start the tutorial
     */
    start() {
        const savedStep = localStorage.getItem(this.STEP_KEY);
        if (savedStep) {
            this.currentStepIndex = parseInt(savedStep, 10);
            if (this.currentStepIndex >= this.steps.length) {
                this.currentStepIndex = 0;
            }
        } else {
            this.currentStepIndex = 0;
        }

        this.isActive = true;
        this.isExploring = false;
        this.renderCurrentStep();
    },

    /**
     * Move to next step
     */
    nextStep() {
        this.hideAll();
        this.isExploring = false;
        this.currentStepIndex++;

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
        this.isExploring = false;
        localStorage.setItem(this.COMPLETED_KEY, 'true');
        localStorage.removeItem(this.STEP_KEY);
        // Load the life pie as default for new users
        this.loadLifePie();
    },

    /**
     * Complete the tutorial
     */
    complete() {
        this.hideAll();
        this.isActive = false;
        this.isExploring = false;
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
        this.isExploring = false;
        this.start();
    },

    /**
     * Let user explore current data (hide modal, show resume button)
     */
    explore() {
        this.hideModal();
        this.isExploring = true;
        this.showResumeButton();
    },

    /**
     * Resume from exploration
     */
    resumeFromExplore() {
        this.hideResumeButton();
        this.isExploring = false;
        this.renderCurrentStep();
    },

    /**
     * Show a floating "Continue Tutorial" button
     */
    showResumeButton() {
        let btn = document.getElementById('tutorial-resume-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'tutorial-resume-btn';
            btn.className = 'tutorial-resume-btn';
            btn.innerHTML = '📖 Continue Tutorial';
            btn.onclick = () => TutorialManager.resumeFromExplore();
            document.body.appendChild(btn);
        }
        btn.style.display = 'block';
    },

    /**
     * Hide the resume button
     */
    hideResumeButton() {
        const btn = document.getElementById('tutorial-resume-btn');
        if (btn) {
            btn.style.display = 'none';
        }
    },

    /**
     * Render the current step
     */
    renderCurrentStep() {
        const step = this.steps[this.currentStepIndex];
        if (!step) return;

        // Execute onEnter action if defined
        if (step.onEnter) {
            this[step.onEnter]();
        }

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

        // Build buttons from step config
        let buttonsHtml = '';
        for (const btn of (step.buttons || [])) {
            const btnClass = btn.class ? `tutorial-btn ${btn.class}` : 'tutorial-btn';
            let onclick = '';

            switch (btn.action) {
                case 'next':
                    onclick = 'TutorialManager.nextStep()';
                    break;
                case 'skip':
                    onclick = 'TutorialManager.skip()';
                    break;
                case 'finish':
                    onclick = 'TutorialManager.complete()';
                    break;
                case 'explore':
                    onclick = 'TutorialManager.explore()';
                    break;
                case 'signIn':
                    onclick = 'TutorialManager.signInForCalendar()';
                    break;
                default:
                    onclick = 'TutorialManager.nextStep()';
            }

            buttonsHtml += `<button class="${btnClass}" onclick="${onclick}">${btn.text}</button>`;
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

        let selector = step.highlight;

        if (step.mobileHighlight && window.innerWidth <= 768) {
            selector = step.mobileHighlight;
        }

        if (step.highlightDynamic) {
            selector = this.getDynamicSelector(step.id);
        }

        const targetEl = selector ? document.querySelector(selector) : null;
        if (!targetEl) {
            console.warn('Tutorial: Target element not found:', selector);
            this.showFloatingTooltip(step);
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        const padding = 8;

        spotlight.style.left = (rect.left - padding) + 'px';
        spotlight.style.top = (rect.top - padding) + 'px';
        spotlight.style.width = (rect.width + padding * 2) + 'px';
        spotlight.style.height = (rect.height + padding * 2) + 'px';

        title.textContent = step.title;
        content.textContent = step.content;
        buttons.innerHTML = `
            <button class="tutorial-btn secondary" onclick="TutorialManager.skip()">Skip</button>
        `;

        this.positionTooltip(tooltip, rect);
        overlay.classList.add('active');
    },

    /**
     * Get dynamic selector based on step and context
     */
    getDynamicSelector(stepId) {
        if (stepId === 'add-spoke') {
            // Find the Yoga slice's input (last slice added)
            const inputs = document.querySelectorAll('.add-spoke-input');
            if (inputs.length > 0) {
                return '.category-section .add-spoke-input';
            }
        }
        if (stepId === 'add-action') {
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

        spotlight.style.display = 'none';

        title.textContent = step.title;
        content.textContent = step.content;
        buttons.innerHTML = `
            <button class="tutorial-btn secondary" onclick="TutorialManager.skip()">Skip</button>
        `;

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
        const tooltipHeight = 150;
        const margin = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left, top;

        if (targetRect.bottom + margin + tooltipHeight < viewportHeight) {
            top = targetRect.bottom + margin;
            left = targetRect.left;
        } else if (targetRect.top - margin - tooltipHeight > 0) {
            top = targetRect.top - margin - tooltipHeight;
            left = targetRect.left;
        } else if (targetRect.right + margin + tooltipWidth < viewportWidth) {
            top = targetRect.top;
            left = targetRect.right + margin;
        } else {
            top = targetRect.top;
            left = targetRect.left - margin - tooltipWidth;
        }

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
        this.hideResumeButton();
    },

    /**
     * Called by app code when events happen
     */
    notifyEvent(eventType, data) {
        if (!this.isActive || this.isExploring) return;

        const step = this.steps[this.currentStepIndex];
        if (!step || step.type !== 'spotlight') return;

        if (step.nextEvent === eventType) {
            setTimeout(() => this.nextStep(), 300);
        }
    },

    // === Data Loading Methods ===

    /**
     * Load the "Life Pie" example data
     */
    loadLifePie() {
        if (typeof ExampleData !== 'undefined') {
            const data = ExampleData.get();
            DataModel.setCategories(data.categories);
            DataModel.categoryPercentageOverrides = data.categoryPercentageOverrides || {};
            DataModel.saveToStorage();
            App.render();
        }
    },

    /**
     * Load the "Team Pie" example data
     */
    loadTeamPie() {
        if (typeof ExampleData2 !== 'undefined') {
            const data = ExampleData2.get();
            DataModel.setCategories(data.categories);
            DataModel.categoryPercentageOverrides = data.categoryPercentageOverrides || {};
            DataModel.saveToStorage();
            App.render();
        }
    },

    /**
     * Load the "Health Pie" example data
     */
    loadHealthPie() {
        if (typeof ExampleData3 !== 'undefined') {
            const data = ExampleData3.get();
            DataModel.setCategories(data.categories);
            DataModel.categoryPercentageOverrides = data.categoryPercentageOverrides || {};
            DataModel.saveToStorage();
            App.render();
        }
    },

    /**
     * Sign in for calendar (wrapper for UI method)
     */
    signInForCalendar() {
        this.hideModal();
        if (typeof UI !== 'undefined' && UI.signInForCalendar) {
            UI.signInForCalendar();
        }
        // Move to next step after a delay
        setTimeout(() => this.nextStep(), 500);
    }
};
