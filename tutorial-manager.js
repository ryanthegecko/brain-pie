/**
 * TutorialManager - Guides first-time users through Brain Pie
 *
 * Flow:
 * 1. Welcome
 * 2. Show "Life Pie" (ExampleData) - explain whole-life organization
 * 3. Show "Team Pie" (ExampleData2) - explain team/project usage
 * 4. Offer calendar login for 2-way sync
 * 5. Load "Health Pie" (ExampleData3) - simple pie for hands-on learning
 * 6. Guide: Add new Sleep slice
 * 7. Guide: Add "Yoga class" spoke to Exercise
 * 8. Guide: Change spoke type to Single
 * 9. Guide: Schedule for next Wednesday 6:45pm
 * 10. Complete
 */
const TutorialManager = {
    COMPLETED_KEY: 'brainPieTutorialCompleted',
    STEP_KEY: 'brainPieTutorialStep',

    steps: [
        {
            id: 'welcome',
            type: 'modal',
            title: 'Welcome to Brain Pie! 🥧',
            content: "Brain Pie helps you visualize and organize everything on your mind. It's flexible—use it for life management, project tracking, team coordination, or anything else. Let me show you how.",
            buttons: [
                { text: 'Skip Tutorial', action: 'skip', class: 'secondary' },
                { text: "Let's Go!", action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'life-pie',
            type: 'modal',
            title: 'The Life Pie',
            content: 'This is a "whole life" pie. Categories like Home, Health, Learning, and Social help organize everything on your mind. Slices represent individual items in each category, and each Slice can be given Spokes, often representing steps needed, or more granular tasks.',
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
            content: "Sign in with Google to enable 2-way sync. When you move an event in Google Calendar, Brain Pie updates automatically. Without sign-in, events still go to your calendar, just one-way. You'll need to accept calendar permissions when prompted.",
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
            content: "Here's a simple Health pie. We want to start taking sleep more seriously - let's add a Sleep Slice to keep it on our radar.",
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
            content: 'Click "+ Add" to create a new Sleep Slice.',
            highlight: '.top-bar-right button:first-child',
            mobileHighlight: '.top-bar-right-mobile button:first-child',
            nextEvent: 'menu-opened'
        },
        {
            id: 'create-sleep-slice',
            type: 'spotlight',
            title: 'Add a Sleep Slice',
            content: 'Select the existing "Health" category, type "Sleep" as the Slice name, pick black for the color (for night time!), then click "Add Slice".',
            highlight: '#menu-tab-1',
            nextEvent: 'slice-added'
        },
        {
            id: 'slice-added-pause',
            type: 'modal',
            delay: 3000,
            onEnter: 'closeMenuForTutorial',
            title: 'Nice Work! 🌙',
            content: "You just added your first Slice! Ready to add a Spoke?",
            buttons: [
                { text: 'Skip', action: 'skip', class: 'secondary' },
                { text: 'Continue', action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'add-spoke',
            type: 'spotlight',
            title: 'Add a Yoga Class',
            content: 'We\'ve opened the Exercise Slice for you. Type "Yoga class" in the new Spoke input at the bottom and press Enter.',
            onEnter: 'openMenuForExercise',
            highlight: '#tab2-new-spoke',
            noSpotlight: true,
            nextEvent: 'spoke-added'
        },
        {
            id: 'change-spoke-type',
            type: 'spotlight',
            title: 'Make It Schedulable',
            content: 'Click the "Spoke type" button next to your new Spoke to make it a schedulable task.',
            highlightDynamic: true,
            noSpotlight: true,
            nextEvent: 'spoke-type-picker-opened'
        },
        {
            id: 'select-single-type',
            type: 'spotlight',
            title: 'Choose Single',
            content: 'Choose "Single" — this makes the Spoke itself a one-time schedulable task.',
            highlight: '.spoke-type-picker-btn[onclick*="single"]',
            noSpotlight: true,
            nextEvent: 'single-type-selected'
        },
        {
            id: 'calendar-done',
            type: 'spotlight',
            title: 'Schedule Your Yoga Class',
            content: "Set the date to next Wednesday, time to 6:45pm. You can add the studio's address in the Location field. Click 'Add to Calendar' or 'Skip' when done!",
            noSpotlight: true,
            nextEvent: 'datetime-picker-closed'
        },
        {
            id: 'close-menu',
            type: 'spotlight',
            title: 'Close the Menu',
            content: 'All done! Your event should soon appear in your calendar app. Click "Done" to see your scheduled Spoke on the pie. You can also make Spokes repeating (e.g. weekly yoga), or turn them into a list of individually scheduled actions.',
            highlight: '.menu-nav-buttons button:last-child',
            noSpotlight: true,
            nextEvent: 'menu-closed'
        },
        {
            id: 'summary-cards',
            type: 'modal',
            delay: 500,
            onEnter: 'scrollToSummaryCards',
            title: 'Edit From Here Too',
            content: "Scroll down to see summary cards for each category. From here you can remove spokes, slices, or whole categories, reorder items, and adjust percentages.",
            buttons: [
                { text: 'Got It!', action: 'next', class: 'primary' }
            ]
        },
        {
            id: 'complete',
            type: 'modal',
            title: "You're All Set! 🎉",
            content: "You've learned the basics! Your data is saved to your browser's local storage only—completely private. For cloud sync across devices, you can connect your own Firebase project in Settings. You can start fresh, or load one of the example pies below.",
            buttons: [
                { text: 'Load Life Pie', action: 'loadLifePie', class: 'secondary' },
                { text: 'Load Team Pie', action: 'loadTeamPie', class: 'secondary' },
                { text: 'Start Fresh', action: 'startFresh', class: 'primary' }
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
        const prevStep = this.steps[this.currentStepIndex];
        console.log(`[Tutorial] nextStep() from: ${prevStep ? prevStep.id : 'none'} (index ${this.currentStepIndex})`);
        this.hideAll();
        this.isExploring = false;
        this.currentStepIndex++;

        localStorage.setItem(this.STEP_KEY, this.currentStepIndex.toString());

        if (this.currentStepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        const nextStepObj = this.steps[this.currentStepIndex];
        console.log(`[Tutorial] → advancing to: ${nextStepObj ? nextStepObj.id : 'none'} (index ${this.currentStepIndex})`);
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
        if (!step) { console.log('[Tutorial] renderCurrentStep: no step found'); return; }

        console.log(`[Tutorial] renderCurrentStep: ${step.id} (type: ${step.type}, delay: ${step.delay || 0})`);

        // Execute onEnter action if defined
        if (step.onEnter) {
            console.log(`[Tutorial]   onEnter: ${step.onEnter}`);
            this[step.onEnter]();
        }

        // Support optional delay before showing the step
        if (step.delay) {
            console.log(`[Tutorial]   delaying showStep by ${step.delay}ms`);
            setTimeout(() => this.showStep(step), step.delay);
        } else {
            this.showStep(step);
        }
    },

    /**
     * Show a step (modal or spotlight)
     */
    showStep(step) {
        console.log(`[Tutorial] showStep: ${step.id} (type: ${step.type})`);
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
                case 'loadLifePie':
                    onclick = 'TutorialManager.finishWithLifePie()';
                    break;
                case 'loadTeamPie':
                    onclick = 'TutorialManager.finishWithTeamPie()';
                    break;
                case 'startFresh':
                    onclick = 'TutorialManager.startFresh()';
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
        console.log(`[Tutorial] showSpotlight: ${step.id}, selector: ${selector}, found: ${!!targetEl}, noSpotlight: ${!!step.noSpotlight}`);

        if (!targetEl) {
            console.warn('[Tutorial] Target element not found:', selector);
            this.showFloatingTooltip(step);
            return;
        }

        // noSpotlight: show floating tooltip without dark overlay (for steps inside menus)
        if (step.noSpotlight) {
            console.log(`[Tutorial]   using floating tooltip (noSpotlight)`);
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
        if (stepId === 'change-spoke-type') {
            // Find the spoke type button for the newly added spoke
            // Check Tab 2 first (menu flow), then bottom list
            const tab2Btns = document.querySelectorAll('.tab2-spoke-item .secondary[onclick*="showSpokeTypePicker"]');
            if (tab2Btns.length > 0) {
                return '.tab2-spoke-wrapper:last-child .tab2-spoke-item .secondary[onclick*="showSpokeTypePicker"]';
            }
            const btns = document.querySelectorAll('.spoke-item .secondary[onclick*="showSpokeTypePicker"]');
            if (btns.length > 0) {
                return '.spoke-item:last-child .secondary[onclick*="showSpokeTypePicker"]';
            }
        }
        return null;
    },

    /**
     * Show tooltip without spotlight (fallback)
     */
    showFloatingTooltip(step) {
        console.log(`[Tutorial] showFloatingTooltip: ${step.id}, title: "${step.title}"`);
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
        tooltip.style.top = '20px';
        tooltip.style.transform = 'translateX(-50%)';

        overlay.classList.add('active');
        console.log(`[Tutorial]   overlay.active: ${overlay.classList.contains('active')}, display: ${getComputedStyle(overlay).display}`);
    },

    /**
     * Position tooltip at the top of the screen, centered horizontally
     */
    positionTooltip(tooltip, targetRect) {
        const tooltipWidth = 320;
        const margin = 20;
        const viewportWidth = window.innerWidth;

        const left = Math.max(margin, Math.min((viewportWidth - tooltipWidth) / 2, viewportWidth - tooltipWidth - margin));
        const top = margin;

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
        const step = this.steps[this.currentStepIndex];
        console.log(`[Tutorial] notifyEvent: '${eventType}', active: ${this.isActive}, exploring: ${this.isExploring}, currentStep: ${step ? step.id : 'none'} (type: ${step ? step.type : '-'}), expecting: ${step ? step.nextEvent : '-'}`);

        if (!this.isActive || this.isExploring) return;
        if (!step || step.type !== 'spotlight') return;

        if (step.nextEvent === eventType) {
            console.log(`[Tutorial]   ✓ MATCH! Advancing in 300ms`);
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
     * Scroll to the summary cards section at the bottom
     */
    scrollToSummaryCards() {
        const el = document.getElementById('categories-list');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    /**
     * Close the menu automatically during tutorial
     */
    closeMenuForTutorial() {
        if (typeof UI !== 'undefined') {
            UI.closeMenu();
        }
    },

    /**
     * Open the Add menu with Health > Exercise pre-selected on Tab 2
     */
    openMenuForExercise() {
        if (typeof UI !== 'undefined') {
            // Find the Health category and Exercise slice
            const healthCat = DataModel.categories.find(c => c.name === 'Health');
            if (healthCat) {
                const exerciseSlice = healthCat.items.find(i => i.name === 'Exercise');
                if (exerciseSlice) {
                    UI.showMenuForSlice(healthCat.id, exerciseSlice.id);
                    return;
                }
            }
            // Fallback: just open the menu
            UI.showMenu();
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
    },

    /**
     * Complete tutorial and load the Life Pie
     */
    finishWithLifePie() {
        this.loadLifePie();
        this.complete();
    },

    /**
     * Complete tutorial and load the Team Pie
     */
    finishWithTeamPie() {
        this.loadTeamPie();
        this.complete();
    },

    /**
     * Complete tutorial and clear all data for a fresh start
     */
    startFresh() {
        DataModel.setCategories([]);
        DataModel.categoryPercentageOverrides = {};
        DataModel.saveToStorage();
        App.render();
        this.complete();
    }
};
