# Brain Pie - Project Documentation

**Last Updated:** February 2026
**Current Version:** v0.10.1

## Overview
Brain Pie is a visual mind organization tool that uses a 4-layer pie chart system to help users organize thoughts, tasks, and actions. It's a completely client-side web application with no backend, ensuring privacy and offline functionality.

**Live Demo:** https://ryanthegecko.github.io/brain-pie/

## Core Concept
The app uses a hierarchical structure with four layers:
1. **Categories** - Top-level areas of life (outer ring)
2. **Slices** - Specific domains within categories (inner pie)
3. **Spokes** - Individual items or topics (radial lines extending outward)
4. **Actions** - Specific tasks or sub-items under spokes (branches from spokes)

## Technical Stack
- **Frontend:** Vanilla JavaScript (no framework)
- **Visualization:** D3.js v7.8.5
- **Storage:** Browser localStorage (default) or Firebase Realtime Database (cloud sync)
- **Styling:** CSS with responsive design
- **Optional:** Firebase for cloud sync/collaboration (user-provided project)

## File Structure

```
brain-pie/
├── index.html              # Main HTML structure, overlays, and modals
├── styles.css              # All styling including responsive breakpoints
├── app.js                  # Main application controller and initialization
├── data-model.js           # Data structure management and business logic
├── chart-renderer.js       # D3.js visualization and interactions
├── ui-controller.js        # UI state, overlays, and user interactions
├── storage.js              # localStorage persistence and import/export
├── import-manager.js       # Granular import/merge orchestration
├── tutorial-manager.js     # First-time user tutorial system
├── firebase-adapter.js     # Firebase Realtime Database integration
├── google-auth-adapter.js  # Standalone Google OAuth for calendar-only users
├── calendar-adapter.js     # Google Calendar API wrapper
├── storage-adapter.js      # Abstraction layer for localStorage/Firebase switching
└── assets/                 # Images and icons
    ├── og.png
    └── trash.svg
```

## Architecture Overview

### Data Flow
```
User Action → UI Controller → Data Model → Storage → Chart Renderer → Visual Update
```

### Key Components

#### 1. **DataModel** (`data-model.js`)
- Manages the core data structure
- Handles CRUD operations for categories, items (slices), spokes, and actions
- Manages percentage calculations and normalization
- Handles category percentage overrides (manual adjustments)
- Manages priority list (add, remove, reorder, resolve, validate references)

**Key Data Structure:**
```javascript
{
  categories: [
    {
      id: "unique-id",
      name: "Category Name",
      color: "#hexcolor",
      items: [
        {
          id: "item-id",
          name: "Slice Name",
          percentage: 33.33,
          color: "#hexcolor",
          subItems: [
            "Simple spoke string (legacy format)",
            {
              text: "Spoke with type",
              type: "single",  // 'static', 'single', 'repeating', 'list'

              // For Single type: spoke itself is the schedulable event
              scheduled: {
                date: "2026-02-15",
                time: "09:00",
                duration: 60,
                calendarEventId: null
              },

              // For Repeating type: spoke has recurrence pattern
              // (stored in metadata.recurrence)

              // For List type only: children array with actions
              children: [
                {
                  text: "Action 1",
                  children: [],
                  scheduled: {        // Optional: calendar scheduling
                    date: "2026-02-15",
                    time: "09:00",
                    duration: 60
                  }
                },
                { text: "Action 2", children: [] }
              ],

              metadata: {
                calendarEventId: null,  // For calendar sync (repeating spokes)
                recurrence: null        // For repeating spokes
              }
            }
          ]
        }
      ]
    }
  ],
  categoryPercentageOverrides: {
    "category-id": 45.5  // Manual percentage override
  },
  priorityList: [
    // Ordered array of item references (index 0 = highest priority)
    { type: "spoke", categoryId: "cat-id", itemId: "item-id", spokeIndex: 0 },
    { type: "action", categoryId: "cat-id", itemId: "item-id", spokeIndex: 1, childIndex: 0 },
    { type: "slice", categoryId: "cat-id", itemId: "item-id" }
  ]
}
```

#### 2. **ChartRenderer** (`chart-renderer.js`)
- Renders the D3.js visualization
- Handles responsive sizing
- Manages interactive states (hover, click, expand)
- Implements full-pie takeover expansion:
  - **Slice takeover** - Click inner slice → re-renders as full 360° pie with that single slice
  - **Category takeover** - Click outer ring → re-renders showing only that category's slices across 360°
  - **Drill-down** - In category view, click a slice to drill into slice takeover
  - **Action popup** - Click spoke with children to show action card near clicked item
- Back button (✕) and click-anywhere to collapse back to full pie
- Crossfade animation (300ms) between views

**Key Features:**
- Curved text along category arcs
- Radial text for slice labels
- Exponential spoke extension (longer near vertical axis)
- Dynamic color contrast detection for text readability
- Schedule pills on chart spokes with icon + text separation
- Compact time formatting (9AM, 1:30PM) and recurrence summaries (Mon, Wed, 5PM)
- Smooth transitions and animations
- Inline editable spoke names in summary cards
- Priority stars on chart spokes (gold ★, larger for top-5 items, clickable to bump)
- Hover fill lightening on slices (D3 mouseover, no CSS opacity — see SVG Opacity Pitfall)
- Spoke lines start at outer ring edge (only external portion visible)
- ViewBox scaling for smaller viewports (see Responsive Design section)

#### 3. **UI Controller** (`ui-controller.js`)
- Manages all overlay states (menu, settings, datetime picker, spoke config, disclaimer)
- Handles drag-and-drop reordering
- Builds the category/item list in the bottom section
- Manages the spoke builder for adding new items
- Calendar integration (Google Calendar & Apple iCal)
- Spoke configuration and action scheduling workflow
- Prioritiser window (draggable, toggle show/hide, drag-to-reorder items)

**Overlays:**
- Add Slices Menu
- Settings (calendar provider selection)
- Date/Time Picker (for scheduling actions)
- Spoke Configuration (set spoke type, add/schedule actions)
- Prioritiser Window (fixed, draggable, narrow sidebar)
- Disclaimer/About

#### 4. **Storage** (`storage.js`)
- localStorage persistence with auto-save
- JSON import/export functionality
- Status notifications
- Error handling

#### 5. **App Controller** (`app.js`)
- Application initialization
- Delegates user actions to appropriate modules
- Coordinates between DataModel, UI, and ChartRenderer
- Handles window resize events
- Contains example data for first-time users

## Key Features

### 1. Visual Organization
- **Pie chart visualization** showing hierarchical relationships
- **Color-coded** categories and slices
- **Percentage-based** sizing (auto or manual)
- **Responsive design** adapts to screen size

### 2. Interactive Editing
- **Inline editing** - Click to edit names directly
- **Drag-and-drop** reordering for categories, items, and spokes
- **Color pickers** for customization
- **Percentage adjustments** with automatic redistribution

### 3. Expansion Modes (Full-Pie Takeover)
Focus on specific areas with full 360° takeover:
- Click a **slice** → entire pie becomes that single slice at 360°, spokes radiate all around
- Click a **category** → pie shows only that category's slices across full 360°, outer ring is that category
- In category view, click a **slice** to drill down into slice takeover
- Click **✕ back button** or anywhere on expanded chart to return to full pie
- Click a **spoke with actions** to show action popup card near clicked item
- All transitions use 300ms crossfade animation

### 4. Spoke Type System
Spokes can have different types that affect their behavior:

| Type | Purpose | Has Children? | Calendar Integration |
|------|---------|---------------|---------------------|
| **Static** | Persistent reminders | No | None |
| **Single** | One-time schedulable task | No | Yes - spoke itself is the event |
| **Repeating** | Recurring schedulable task | No | Yes - spoke itself is recurring event |
| **List** | Container for multiple actions/steps | Yes | Actions have their own calendar events |

**Spoke Workflow:**
1. Add spoke using green "+" button → created as **Static** by default
2. Click blue "Spoke type" button to change type
3. Based on type selection:
   - **Static**: No change, stays as reminder
   - **Single**: Opens date/time picker to schedule spoke itself
   - **Repeating**: Opens recurrence picker to set up recurring event
   - **List**: Opens spoke config to manage multiple actions
4. For Single/Repeating: Green button shows schedule, click to reschedule
5. For List: Click "+" to add actions, each action has its own calendar button

**Calendar Event Naming:**
- **Single/Repeating spokes**: `Spoke Name (Category/Slice)`
- **List actions**: `Action Name (Spoke/Slice/Category)`

**Backwards Compatibility:**
- Existing `type: 'action'` spokes are treated as 'list'

### 5. Calendar Integration
- **Google Calendar** - Opens web interface with pre-filled event
- **Apple Calendar** - Downloads .ics file
- **Custom scheduling** - Date/time picker for actions
- **Configurable duration** - 15min to 4 hours
- **Reschedule support** - Update existing scheduled actions

### 6. Data Management
- **Auto-save** to localStorage
- **Granular Import** - Select which categories, slices, or spokes to import with merge detection
- **Granular Export** - Select what to export, with optional actions toggle
- **Smart Merge** - Imports automatically merge with existing items by name (case-insensitive)
- **Calendar Sync on Import** - Scheduled actions automatically create calendar events
- **Example data** loaded for new users
- **Privacy by default** - localStorage only unless cloud sync enabled

### 7. Cloud Sync (Firebase)
Optional real-time sync using Firebase Realtime Database:
- **URL-based config** - Share `?config=base64...` URL for easy setup
- **Google authentication** - Each user/team uses their own Firebase project
- **Real-time sync** - Changes appear instantly across all connected devices
- **First-time sync prompt** - Option to push local data or start fresh
- **Export Firebase config** - Download config as JSON for sharing
- **Offline fallback** - Automatically uses localStorage when disconnected
- **Visual indicator** - Shows project name and sync status in main UI

### 7. Responsive Design

**Pie ViewBox Scaling (key technique):**

The pie chart renders spoke labels, schedule pills, priority stars, and icons that extend well beyond the outer ring. At large viewport widths (≥1920px), everything fits naturally. At smaller widths, spoke text clips against the SVG edges.

The solution is **virtual canvas rendering with viewBox scaling** — the same technique browsers use for zoom. Rather than shrinking the pie radius (which keeps text at full size and creates a tiny pie with large text), we render the entire pie at a generous virtual size (1920px wide) and use the SVG `viewBox` attribute to scale everything down proportionally to fit the actual viewport. This shrinks the pie, text, pills, and stars together, maintaining the same visual proportions as a wider screen.

**How it works in `init()`:**
- **≥1920px wide**: Render at actual dimensions, no `viewBox` — everything fits naturally
- **<1920px wide**: Set internal `this.width`/`this.height` to a 1920px-wide virtual canvas (height scaled proportionally). The SVG element's `width`/`height` stay at actual container size, but `viewBox` is set to the virtual dimensions. The browser then scales the entire SVG coordinate system down to fit, shrinking all content uniformly
- **Treemap view**: Always renders at actual dimensions (no viewBox scaling needed since treemap content is bounded by slice rectangles)

**Why this approach was chosen:**
- Previous attempt: `autoResizeRadius()` — shrank the pie radius based on estimated text widths. Failed because text stayed at 12px while the pie shrank, creating a visual imbalance. The text width estimation was also fragile and hard to tune across different content.
- Previous attempt: `autoScaleViewBox()` — dynamically calculated needed viewBox from content reach. Worked but was over-engineered; the fixed 1920px virtual width is simpler and produces better results.
- The viewBox approach is simple, robust, and handles any content length. If a spoke has a very long name + schedule pill + priority star, it all just scales down together.

**TODO:** May need revisiting for mobile viewports (≤768px) where the scaling factor becomes large and text may become too small to read. Consider a different virtual width or a minimum font size at mobile breakpoints.

**CSS Breakpoints:**
- Desktop (>1024px): Full features, larger chart
- Tablet (≤1024px): Adjusted sizing, single-column lists
- Mobile (≤768px): Simplified layout, touch-friendly

## User Interactions

### Adding Content
1. **Add Category**: Settings overlay → "Add New Category"
2. **Add Slice**: Menu overlay → Select category → Fill form → "Add Slice"
3. **Add Spoke**: In category list → Type in "New Spoke" input
4. **Add Action**: Click "+" next to spoke → Enter action name

### Organizing
- **Drag categories** to reorder in the list
- **Drag slices** between categories or reorder within
- **Drag spokes** to reorder or move between slices
- **Edit percentages** to adjust visual weight

### Calendar Actions
1. Click on a spoke to open configuration popup
2. Select "Action(s)" type and add action name
3. Choose "Add & Schedule" to open date/time picker
4. Select date, time, and duration (or click "Skip")
5. Click "Add to Calendar" - opens Google Calendar or downloads .ics file
6. Repeat for additional actions

**Rescheduling:**
- Scheduled actions show date/time (green pill) instead of calendar icon
- Click to open reschedule popup
- Warning reminder to manually delete old calendar entry

## Current Limitations & Known Issues

### Limitations
1. **No spoke deletion from chart** - Must delete from list view
2. **No undo/redo** functionality
3. **Single document model** - Can't have multiple "pies"
4. **Pending spoke type** - Not yet implemented
5. **Recurring event sync is one-way** - Changes made to recurring events in Google Calendar (moving single instances, moving all following events) won't sync back to Brain Pie. The app will continue showing the original recurrence pattern. Deleting the entire series from Google Calendar will remove the action locally.

### Known Behaviors
1. **Percentage normalization** sometimes unintuitive for users
2. **Mobile chart interactions** can be tricky with small slices
3. **Text overflow** on small slices not handled gracefully

## Changelog

### v0.10.1 (February 2026)
Prioritiser interaction fixes:

**Action Popup Star:**
- Clicking star in action popup no longer closes the popup
- Star toggles fill color in place (gold/grey) without triggering full chart re-render

**Priority Bump/Remove:**
- Clicking star on #1 priority item now removes it from the list (can't bump what's already at top)
- All other positions still bump to top

**Completed Action Deprioritisation:**
- Checking off a list action (tickbox) automatically removes it from the priority list
- Unchecking does not re-add it

---

### v0.10 (February 2026)
ViewBox responsive scaling, priority stars on chart, hover rework, and UI polish:

**ViewBox Responsive Scaling:**
- Viewports <1920px: render pie at 1920px virtual canvas, scale down via SVG `viewBox` attribute
- Viewports ≥1920px: render at actual dimensions (unchanged behavior)
- Treemap always renders at actual dimensions (no scaling needed)
- Uniformly shrinks pie, text, pills, stars, and spoke lines together
- Previous approaches (radius shrinking, dynamic viewBox calculation) removed
- See Responsive Design section for full technical details

**Slice Hover Rework:**
- Replaced CSS `opacity` hover with D3 `mouseover`/`mouseout` fill-color lightening
- Categories lighten by 25%, inner slices by 20%, with 200ms D3 transitions
- New `lightenColor(hex, factor)` helper method
- Root cause: CSS opacity on SVG `<g>` elements creates compositing layers that cause text aliasing on hover (see SVG Opacity Pitfall in Development Notes)

**Spoke Lines:**
- Lines now start at outer ring edge instead of center
- Only the portion extending beyond the pie is visible (cleaner look)

**Priority Stars on Chart:**
- Gold stars (★) on prioritised spokes in both pie and treemap views
- Pie: star on inner side of spoke label (right-side: left of text, left-side: right of text)
- Treemap: star before icon/text, shifts content right by 12px
- Clickable to bump priority (same as star button elsewhere)
- Top-5 items get larger stars (pie: 16px vs 12px, treemap: 14px vs 10px)

**Prioritiser Enhancements:**
- Click star button to bump item to top of priority list
- Click priority item to navigate: expands parent slice, opens action popup for list spokes
- `addPriority()` now returns 'added', 'moved', or 'already-top' (bump-to-top on re-add)

**Scheduler Star Buttons:**
- Star buttons (★) on datetime picker, recurrence picker, spoke type picker, and spoke config overlays
- Positioned left of close button, grey when inactive, gold when active
- Hidden when no data location available (e.g. during initial recurrence creation)

**Spoke Config Redesign:**
- Replaced radio buttons with button-style type picker (matching spoke type picker popup)
- Blue border + light blue background for selected type
- `selectSpokeConfigType()` method for button toggle behavior

**Action Popup Enhancements:**
- Checkbox for action completion (green when checked, line-through on text)
- Star button for prioritiser (gold when active)
- Trash icon with red pill background
- Calendar schedule pill (green rounded pill with white text)
- Wider card (320px), taller rows (32px)
- Programmatic open support (centers popup when no mouse event)

**Dynamic Scheduler Titles:**
- Titles now include spoke/action name: "Schedule: {name}", "Reschedule: {name}"
- Recurrence: "Set Recurrence: {name}", "Update Recurrence: {name}"

**Crossfade Cleanup:**
- D3 crossfade transitions now clean up inline opacity via `.on('end')` callback
- Prevents stale compositing layers from persisting after view transitions

---

### v0.9 (February 2026)
Treemap polish, unified action popup, and prioritiser system:

**Treemap Slice Name Sizing:**
- Increased slice header font from 11px/600 to 14px/bold for better readability
- Added 8px padding beneath slice headers before spoke text begins
- Adjusted character truncation calculations for larger font

**Unified Action Popup:**
- Replaced pie-view branch expansion (radial fan-out with pie shrink/translate) and treemap modal with a single `showActionPopup()` method
- Popup card appears near the clicked spoke (positioned using click coordinates, clamped to SVG bounds)
- Works identically in both pie and treemap views
- Close button (✕) in card header top-right
- Click transparent dimmer to dismiss
- Document-level click-outside handler as fallback
- No overlay darkening — chart remains fully visible
- Removed old `expandBranch()` and `expandBranchTreemap()` methods (~360 lines removed)
- Simplified `collapseBranch()` — no longer restores pie transform

**Prioritiser System:**
- New `priorityList` array in data model (top-level, alongside `categories`)
- Each entry references a spoke, action, or slice by type + IDs + indices
- Array order = priority rank (index 0 = highest)
- CRUD methods: `addPriority()`, `removePriority()`, `reorderPriority()`, `resolvePriority()`
- `validatePriorityList()` discards orphaned references on load and before each render
- Persists to localStorage and syncs via Firebase

**Prioritiser Window UI:**
- Narrow fixed-position window (260px wide), z-index 500
- Draggable via title bar (mouse and touch support)
- Shows top 5 items by default, "Show all" toggle when more exist
- Each item shows rank number, color dot, name, context path, and remove button
- Drag-to-reorder priority items within the window
- "★ Priorities" toggle button in top bar (both desktop and mobile)
- Star buttons (★) next to every spoke and action in summary cards
- Stars highlight gold when item is already prioritised
- Empty state message when no priorities set

---

### v0.8 (February 2026)
Full-pie takeover expansion, UI polish, and editable spokes:

**Full-Pie Takeover Expansion:**
- Replaced overlay-based expansion with full 360° pie re-render approach
- Click a slice → entire pie becomes that single slice filling 360°, all spokes radiate around
- Click a category → pie re-renders showing only that category's slices across 360°
- Drill-down: in category view, clicking a slice expands it to full takeover
- Back button (✕) at top-center of chart when expanded
- Click anywhere on expanded chart to collapse back to full pie
- 300ms crossfade animation between views
- Removed old `expandSlice()`, `expandCategory()`, `collapseSlice()` overlay system
- New `expandedView` state replaces `currentExpanded`
- Branch expansion replaced with unified action popup in v0.9

**Chart Schedule Pills Redesign:**
- Schedule icon rendered outside the pill (separate SVG element)
- Pill shows text-only (date/time or recurrence summary)
- Icons: calendar (single), repeat (repeating), checkmark (list)
- Icons rendered at 16px for better visibility
- 8px gap between icon and pill
- Compact time formatting: "09:00" → "9AM", "13:30" → "1:30PM"
- Recurrence pill text: short format like "Mon, Wed, 5PM"
- Single scheduled pills now show time
- Pills hidden when "hide spokes" toggle is active

**Editable Spoke Names:**
- Spoke names in summary cards are now `contenteditable`
- Click to edit, blur to save
- Drag-safe: blur handler checks `UI.draggedData` to prevent conflicts during drag-and-drop
- New `DataModel.renameSpoke()` method handles both string and object spoke formats
- New `App.renameSpoke()` pass-through

**Dynamic Scheduler Titles:**
- Date/time picker shows "Reschedule Action" when editing existing schedule
- Recurrence picker shows "Update Recurrence" / "Update" when editing existing pattern
- New schedule shows "Schedule Action" / "Set Recurrence" / "Save"

**Branch View Cleanup:**
- Removed trunk line from branch view
- Single child branches positioned 20px from spoke label (closer, cleaner)

**Tutorial Improvements:**
- "Continue With This Pie" option at tutorial completion (primary button)
- "Start Fresh" demoted to secondary option
- New "Click Done" spotlight step highlighting Tab 1 Done button
- Both tutorial delays set to 2500ms
- Delay fires before `onEnter` hooks (not after)
- Summary cards step uses transparent backdrop (no page fade)
- Scroll target changed to `.categories-section` so h2 title is visible

**Add Slices Menu:**
- Done button on Tab 1 now always visible (not just during tutorial)
- Allows adding slices without proceeding to spoke creation

---

### v0.7 (February 2026)
Spoke type restructure - spokes can now be actionable items themselves:

**New Spoke Types:**
| Type | Purpose | Has Children? | Calendar Integration |
|------|---------|---------------|---------------------|
| **Static** | Persistent reminders | No | None |
| **Single** | One-time schedulable task | No | Yes - spoke itself is the event |
| **Repeating** | Recurring schedulable task | No | Yes - spoke itself is recurring event |
| **List** | Container for multiple actions/steps | Yes | Actions have their own calendar events |

**Key Changes:**
- Spokes now added as **Static** by default (not immediately prompted for type)
- Blue "Spoke type" button appears next to new spokes to change type
- **Single** type: spoke itself is the schedulable event (opens date/time picker)
- **Repeating** type: spoke itself is the recurring event (opens recurrence picker)
- **List** type: backwards compatible with old 'action' type, manages child actions
- Recurrence picker now includes **start date** field (defaults to tomorrow)
- Button colors: blue = unscheduled, green = scheduled/calendar types

**Calendar Event Naming:**
- Single/Repeating spokes: `Spoke Name (Category/Slice)`
- List actions: `Action Name (Spoke/Slice/Category)`

**Backwards Compatibility:**
- Existing `type: 'action'` spokes automatically treated as 'list'
- String spokes normalized to 'static' type

**UI Updates:**
- "Add spoke" button changed from blue to green
- Spoke type picker overlay for selecting type after creation
- Chart click behavior varies by spoke type (type picker, date picker, recurrence picker, or branch expansion)

---

### v0.6 (February 2026)
First-time user tutorial:

**Tutorial System:**
- Interactive guided walkthrough for new users
- Spotlight highlighting with tooltip guidance
- Modal dialogs for welcome and completion
- Step-by-step flow: Open menu → Create slice → Add spoke → Add action → Schedule → Calendar sync
- Detects first-time users automatically (separate from example data)
- Progress saved to localStorage (resumes if interrupted)
- "Restart Tutorial" button in Settings

**New Files:**
- `tutorial-manager.js` - Tutorial state machine, spotlight/modal rendering

---

### v0.5 (February 2026)
Granular import/export with smart merge:

**Granular Export:**
- Selection tree to choose categories, slices, and spokes to export
- "Include Actions" toggle to export with or without action details
- Select All / Deselect All controls
- Real-time summary of selected items

**Granular Import:**
- 2-step wizard: Select → Confirm
- Selection tree with merge indicators (shows which items will merge vs. add)
- Name-based matching (case-insensitive) to detect existing items
- Smart merge: imported items merge with existing by name
  - Categories: add imported slices to existing category
  - Slices: add imported spokes to existing slice
  - Spokes: add imported actions to existing spoke
- Automatic calendar event creation for imported scheduled actions
- Old calendar events deleted when schedule times change on import
- Quick Replace option for full data replacement

**New Files:**
- `import-manager.js` - Orchestrates import analysis, selection, and execution

---

### v0.4 (February 2026)
Repeating actions with recurring calendar events:

**Action Type Picker:**
- New flow: name action first → choose type (Static, One-time, Repeating)
- Simplified spoke buttons: just + and trash (removed pencil)
- Static actions stay as reminders (no calendar)
- One-time actions get date/time scheduling
- Repeating actions get recurrence picker

**Repeating Actions:**
- Recurrence picker UI with flexible options:
  - Frequency: Daily, Weekly, Monthly, Yearly
  - Interval: Every N days/weeks/months/years
  - Weekly day selection (M T W T F S S)
  - Monthly day-of-month selection
  - Time picker with 15-minute increments (matches Google Calendar)
  - Duration selector (15min to 4 hours)
  - All-day option (default)
  - End options: Never, On date, After N occurrences
- Green button with compact recurrence text (e.g., "Every Wed 10:00")
- RRULE support for Google Calendar recurring events
- RRULE support for Apple Calendar .ics files

**Reschedule Repeating Events:**
- Click green button on repeating action to reschedule
- Pre-fills recurrence picker with current settings
- Deletes old calendar event and creates new one
- Note: Changes made in Google Calendar don't sync back (documented limitation)

**Integration:**
- Repeating actions create recurring calendar events
- Calendar events include proper RRULE for recurrence
- Works with both Google Calendar API and Apple .ics download

---

### v0.3 (February 2026)
Google Calendar API integration for true 2-way calendar sync:

**Calendar API Features:**
- Create events via Google Calendar API (not URL redirect)
- Update events on reschedule (no more duplicate events)
- Delete events when actions are removed
- 2-way sync: detect moved/deleted events from Google Calendar
- Standalone Google Sign-In for calendar (no Firebase required)
- Token persistence in localStorage for page refreshes
- Automatic calendar sync on page load

**New Files:**
- `calendar-adapter.js` - Google Calendar API wrapper
- `google-auth-adapter.js` - Standalone OAuth for calendar-only users

**How it works:**
- With Firebase: Calendar access via Firebase Google Sign-In
- Without Firebase: Standalone "Sign in with Google" in Settings → Calendar Sync
- Events synced on page load (2 second delay to let Firebase settle)
- Deleted calendar events remove the action from Brain Pie
- Moved calendar events update the scheduled time in Brain Pie

**Apple Calendar:**
- Still uses .ics download (no API available)
- RRULE support for recurring events (added in v0.4)

**Future options for Apple Calendar:**
- `webcal://` protocol for direct Calendar.app launch
- CalDAV integration (requires iCloud credentials - privacy concerns)
- Native iOS/macOS companion app with EventKit (full parity)

---

### v0.2 (February 2026)
Firebase Cloud Sync for real-time collaboration across devices:

**Cloud Sync Features:**
- Firebase Realtime Database integration for syncing across devices
- URL-based config sharing (`?config=base64EncodedConfig`)
- Google authentication per Firebase project
- Real-time sync across all connected devices
- First-time sync prompt (push local data or start fresh)
- Export Firebase config as downloadable JSON
- Permanent sync indicator showing project name and status
- Graceful offline fallback to localStorage

**New Files:**
- `firebase-adapter.js` - Firebase SDK, auth, and database operations
- `storage-adapter.js` - Abstraction layer for storage switching

**New Debug Flags:**
- `firebaseVerbose` - Log all Firebase operations
- `skipFirebaseAuth` - Anonymous access for testing
- `forceOfflineMode` - Test offline fallback
- `showSyncConflicts` - Log conflict resolution

**Bug Fixes:**
- Fixed null checks for `subItems` when loading from Firebase

---

### v0.1 (February 2026)
Initial public release with core functionality:

**Core Features:**
- 4-layer pie chart visualization (Categories, Slices, Spokes, Actions)
- Spoke Type System with Static and Action types
- Calendar integration (Google Calendar & Apple iCal)
- Action scheduling workflow with date/time picker
- Reschedule functionality for existing actions

**UI/UX:**
- Tabbed "Add Stuff" menu with progressive save flow
  - Tab 1: Create/select categories and add slices
  - Tab 2: Add spokes and actions to existing slices
- Expandable action lists in spokes section
- Remove action button in expanded action lists
- Responsive design with mobile-optimized controls
- Split top-bar layout (left: title, right: buttons)
- Hide spokes toggle with synced desktop/mobile checkboxes
- Pie chart scales 30% larger when spokes are hidden
- Custom time picker with 5-minute increments (cross-browser)

**Data Management:**
- Auto-save to localStorage
- JSON import/export
- Example data for new users
- Debug mode for development

## Planned Features (Next Steps)

### Priority 1: Pending Spoke Type (potential 5th type)
- **Pending** - Conditional tasks awaiting state change
- Would be 5th spoke type alongside Static, Single, Repeating, List
- State management for pending → single/list transitions
- UI for setting/clearing pending conditions

### Priority 2: Enhanced Repeating Spokes
- Edit recurrence pattern after creation
- Update/delete recurring calendar events
- Sync recurring event changes from calendar

### Priority 3: Responsive Label Sizing (partially addressed)
The ViewBox scaling approach (v0.10) solves spoke label clipping at smaller viewports by rendering at 1920px virtual width and scaling down. This uniformly shrinks all text. Remaining work:

**Slice Labels:**
- Detect max character count across ALL slices in the pie
- Apply CSS classes based on max length: `.slice-chars-20plus`, `.slice-chars-15plus`, etc.
- All slices use the same font size (determined by the longest label)
- Ensures visual consistency while fitting longest text

**Category Labels (outer ring):**
- Currently uses browser-width-based offset for curved text
- Longer labels need less offset to appear centered
- Apply offset adjustment per individual label based on character count
- Keep to two sets of values (short vs long) for reliable responsive behavior

**Mobile (≤768px):**
- ViewBox scaling may make text too small at mobile widths
- May need a smaller virtual width or alternative approach for mobile

### Completed
- ~~Expansion Refactor~~ - Implemented as full-pie takeover in v0.8 (re-render approach with data override, not DOM transform)
- ~~Prioritiser System~~ - Implemented in v0.9 (separate `priorityList` array, draggable window UI, star buttons)
- ~~Spoke Label Clipping~~ - Implemented as ViewBox scaling in v0.10 (render at 1920px virtual canvas, scale down via SVG viewBox for viewports <1920px)

## Development Notes

### Adding New Features
1. Update **data-model.js** for data structure changes
2. Add UI elements in **index.html** and **styles.css**
3. Add rendering logic in **chart-renderer.js**
4. Add interaction handlers in **ui-controller.js**
5. Wire up in **app.js**
6. Test storage persistence

### SVG Opacity Pitfall — NO CSS opacity hover on SVG groups
CSS `opacity` changes on SVG `<g>` elements (e.g. `.outer-slice:hover { opacity: 0.85 }`) cause **visible text aliasing/shifting** because the browser creates a compositing layer for the group and re-rasterizes all text within it on every hover.

**Never do:** Use CSS `:hover { opacity }` or CSS `transition: opacity` on SVG `<g>` elements that contain text.

**Instead:** Use D3 `mouseover`/`mouseout` to change the `fill` attribute of the child `<path>` directly. This modifies pixel color without creating compositing layers:
```javascript
group.on('mouseover', (event, d) => {
    d3.select(event.currentTarget).select('path')
        .attr('fill', ChartRenderer.lightenColor(d.data.color, 0.25));
}).on('mouseout', (event, d) => {
    d3.select(event.currentTarget).select('path')
        .attr('fill', d.data.color);
});
```

**Also:** When using D3 opacity transitions on parent `<g>` elements (e.g. crossfade animations), always clean up the inline style after completion with `.on('end', () => { el.style('opacity', null); })` to avoid leaving a compositing layer active.

### Code Style
- ES6+ JavaScript
- No build process (runs directly in browser)
- Modular structure with namespaced objects
- Event delegation where possible
- localStorage for persistence

### Debug Mode
The app includes a debug system for development and testing. Access via browser console:

```javascript
// Toggle debug mode on/off
Debug.toggle()

// Check if debug mode is enabled
Debug.enabled

// Check if a specific flag is active
Debug.isActive('allowMultipleBranches')

// Log debug messages (only shown when enabled)
Debug.log('message', data)
```

**Available Debug Flags:**
| Flag | Description |
|------|-------------|
| `allowMultipleBranches` | Allow multiple branch views open simultaneously for alignment checking |
| `firebaseVerbose` | Log all Firebase read/write operations to console |
| `skipFirebaseAuth` | Allow anonymous Firebase access for testing |
| `forceOfflineMode` | Simulate offline to test localStorage fallback |
| `showSyncConflicts` | Log when sync conflicts are detected/resolved |

**Adding New Debug Flags:**
1. Add flag to `Debug.flags` object in `app.js`
2. Use `Debug.isActive('flagName')` in code to check
3. Document the flag in this table

### Testing Checklist
- [ ] Add/edit/delete at each level
- [ ] Drag-and-drop reordering
- [ ] Percentage adjustments
- [ ] Import/export data
- [ ] Calendar integration
- [ ] Responsive behavior
- [ ] localStorage persistence
- [ ] Example data for new users
- [ ] **Spoke types**: Static, Single, Repeating, List
- [ ] **Single spoke**: Schedule spoke itself, reschedule, calendar event
- [ ] **Repeating spoke**: Set recurrence, calendar recurring event
- [ ] **List spoke**: Add actions, schedule individual actions
- [ ] Spoke type picker from chart click
- [ ] Spoke type button colors (blue=unscheduled, green=scheduled)
- [ ] Legacy 'action' type treated as 'list'
- [ ] Calendar event naming: Single/Repeating = "Spoke (Category/Slice)"
- [ ] Calendar event naming: List actions = "Action (Spoke/Slice/Category)"
- [ ] Repeating events in Google Calendar with RRULE
- [ ] RRULE in Apple Calendar .ics files
- [ ] 2-way calendar sync (moved/deleted events)
- [ ] **Full-pie takeover**: Click slice → 360° single slice view
- [ ] **Full-pie takeover**: Click category → 360° category view with all slices
- [ ] **Full-pie takeover**: Drill-down from category view to slice view
- [ ] **Full-pie takeover**: Back button (✕) collapses to full pie
- [ ] **Full-pie takeover**: Click anywhere on expanded chart collapses
- [ ] **Full-pie takeover**: Crossfade animation between views
- [ ] **Full-pie takeover**: Spokes/pills work correctly in expanded view
- [ ] **Full-pie takeover**: Branch expansion still works from expanded view
- [ ] **Schedule pills**: Icon outside pill, text inside pill
- [ ] **Schedule pills**: Compact time format (9AM, 1:30PM)
- [ ] **Schedule pills**: Recurrence summary text (Mon, Wed, 5PM)
- [ ] **Schedule pills**: Hidden when "hide spokes" toggle is active
- [ ] **Editable spokes**: Click spoke name in summary card to edit
- [ ] **Editable spokes**: Blur saves changes
- [ ] **Editable spokes**: No conflicts during drag-and-drop
- [ ] **Dynamic titles**: "Reschedule Action" vs "Schedule Action" in date picker
- [ ] **Dynamic titles**: "Update Recurrence" vs "Set Recurrence" in recurrence picker
- [ ] **Tutorial**: "Continue With This Pie" option at completion
- [ ] **Tutorial**: "Click Done" spotlight step works
- [ ] **Tab 1 Done button**: Always visible (not just tutorial)
- [ ] **Treemap slice names**: Larger font (14px bold) with padding beneath
- [ ] **Action popup**: Appears near clicked spoke in pie view
- [ ] **Action popup**: Appears near clicked spoke in treemap view
- [ ] **Action popup**: Close via ✕ button
- [ ] **Action popup**: Close via clicking outside card
- [ ] **Action popup**: Action rows open calendar/schedule pickers
- [ ] **Action popup**: Toggle same spoke to close
- [ ] **Action popup**: Clamped within SVG bounds at edges
- [ ] **Prioritiser**: Toggle window via "★ Priorities" button
- [ ] **Prioritiser**: Drag window by title bar (mouse and touch)
- [ ] **Prioritiser**: Close button dismisses window
- [ ] **Prioritiser**: Star button adds spoke to priority list
- [ ] **Prioritiser**: Star button adds action to priority list
- [ ] **Prioritiser**: Duplicate detection (can't add same item twice)
- [ ] **Prioritiser**: Remove item via ✕ in list
- [ ] **Prioritiser**: Drag-to-reorder items
- [ ] **Prioritiser**: Top 5 visible, "Show all" toggle
- [ ] **Prioritiser**: Stars highlight gold for prioritised items
- [ ] **Prioritiser**: Orphan cleanup on load (deleted items removed)
- [ ] **Prioritiser**: Persists across page reload
- [ ] **Prioritiser**: Syncs via Firebase
- [ ] **ViewBox scaling**: Pie renders correctly at 1440px, 1600px, 1920px+ widths
- [ ] **ViewBox scaling**: Text, pills, stars all scale proportionally at <1920px
- [ ] **ViewBox scaling**: Treemap unaffected (no scaling)
- [ ] **Slice hover**: Categories lighten on hover (fill change, no aliasing)
- [ ] **Slice hover**: Inner slices lighten on hover (fill change, no aliasing)
- [ ] **Slice hover**: 200ms smooth transition in and out
- [ ] **Spoke lines**: Only visible outside the pie (no line through slices)
- [ ] **Priority stars (chart)**: Gold stars on prioritised spokes in pie view
- [ ] **Priority stars (chart)**: Gold stars on prioritised spokes in treemap view
- [ ] **Priority stars (chart)**: Top-5 items have larger stars
- [ ] **Priority stars (chart)**: Click star to bump priority
- [ ] **Prioritiser**: Click item to navigate to chart location
- [ ] **Prioritiser**: Click star to bump item to top
- [ ] **Scheduler stars**: Star button on datetime picker, recurrence picker, spoke type picker, spoke config
- [ ] **Spoke config**: Button-style type picker (not radio buttons)
- [ ] **Spoke config**: Blue border on selected type
- [ ] **Action popup**: Checkbox for completion
- [ ] **Action popup**: Star for prioritiser
- [ ] **Action popup**: Programmatic open (from prioritiser navigation)

## Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (including .ics download)
- **Mobile browsers**: Works with touch events

**Requirements:**
- ES6 support
- localStorage API
- D3.js (loaded from CDN)

## Privacy & Security

**Default (localStorage only):**
- ✓ No data sent to servers
- ✓ No tracking or analytics
- ✓ No cookies
- ✓ No user accounts
- ✓ All data stored locally in browser
- ⚠️ Users responsible for their own data backups
- ⚠️ Clearing browser data will delete all content

**With Cloud Sync (Firebase):**
- Data synced to user's own Firebase project (not ours)
- Google authentication required
- Firebase config visible in shared URL (user controls their own project)
- Users must configure their own Firebase security rules
- Recommended rule: `".read": "auth != null", ".write": "auth != null"`

## Contributing
The project is currently in active development. Key areas for improvement:
1. Mobile experience optimization
2. Accessibility improvements (keyboard navigation, ARIA labels)
3. Performance optimization for large datasets
4. Additional export formats (CSV, Markdown, PDF)
5. Undo/redo system
6. Multiple document support

## License
[Add license information]

## Credits
Created by Ryan (ryanthegecko)
Built with D3.js

---
