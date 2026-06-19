# Brain Pie - Project Documentation

**Last Updated:** June 2026
**Current Version:** v0.21

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
- **Storage:** Four modes: browser localStorage (default), local file (File System Access API), Firebase backup (on-demand), Firebase live sync
- **Styling:** CSS with responsive design
- **Testing:** Playwright e2e (20 tests across core, local-file, cloud-backup, settings-ui suites)

## File Structure

```
brain-pie/
├── index.html                          # Main HTML, overlays, modals, in-app docs
├── styles.css                          # All styling and responsive breakpoints
├── app.js                              # App controller and initialization
├── data-model.js                       # Data structure, CRUD, business logic
├── storage.js                          # localStorage persistence
├── example-data.js                     # Default example pie for new users
├── adapters/
│   ├── storage-adapter.js              # Routes storage calls to active backend
│   ├── local-storage-adapter.js        # localStorage backend
│   ├── local-file-adapter.js           # File System Access API backend (Chrome/Edge)
│   ├── firebase-adapter.js             # Firebase Realtime Database backend
│   ├── google-auth-adapter.js          # Standalone Google OAuth (calendar-only)
│   ├── calendar-adapter.js             # Google Calendar API wrapper
│   └── tasks-adapter.js                # Google Tasks API wrapper
├── controllers/
│   ├── ui-controller.js                # UI state, overlays, interactions
│   ├── chart-renderer.js               # D3.js visualization
│   ├── cloud-sync-controller.js        # Firebase backup + live sync settings UI
│   ├── local-file-sync-controller.js   # Local file settings UI
│   ├── calendar-import-controller.js   # Import from Google Calendar wizard
│   ├── import-export-controller.js     # Granular JSON import/export
│   ├── prioritiser-controller.js       # Priority window UI
│   ├── scheduling-controller.js        # Date/time and recurrence pickers
│   ├── tasks-import-controller.js      # Import from Google Tasks wizard
│   └── transform-controller.js         # AI-powered spoke transforms (pro)
├── managers/
│   ├── import-manager.js               # Import merge orchestration
│   └── tutorial-manager.js             # First-time user tutorial
├── tests/
│   ├── core.spec.js                    # Tests 1–7: localStorage, core CRUD, multi-pie, priorities
│   ├── local-file.spec.js              # Tests 1–12: local file mode
│   ├── cloud-backup.spec.js            # Tests 1–9: Firebase backup/live sync
│   └── settings-ui.spec.js             # Tests 1–10: settings panel UI
└── assets/
    ├── og.png
    ├── favicon.svg
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
- Manages priority list (add, remove, reorder, resolve, validate references, per-user Firebase save)
- Focus Prioritised filtering (`getFilteredCategories()` — deep-copy with `_originalIndex` annotations)
- Manages multi-pie meta state (pie list, active pie, pie names)
- Pie CRUD: create, delete, rename, switch, reorder

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
          id: "uuid-v4-string",   // crypto.randomUUID() — never use Date.now() (collision risk)
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
    // In Firebase mode: stored per-user at userPriorities/{uid}, NOT in shared blob
    // In localStorage mode: stored here as part of the main data blob
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
- Focus Prioritised empty state message when no priorities set
- ViewBox scaling for smaller viewports (see Responsive Design section)

#### 3. **UI Controller** (`ui-controller.js`)
- Manages all overlay states (menu, settings, datetime picker, spoke editor, disclaimer, documentation)
- Handles drag-and-drop reordering
- Builds the category/item list in the bottom section
- Manages the spoke builder for adding new items
- Calendar integration (Google Calendar & Apple iCal)
- Spoke configuration and action scheduling workflow
- Prioritiser window (draggable, toggle show/hide, drag-to-reorder items)
- Pie tab bar rendering, drag-to-reorder tabs, context menu (rename/delete)

**Overlays:**
- Add Slices Menu
- Settings (calendar provider selection, mobile: hide spokes + tree view toggles)
- Date/Time Picker (for scheduling actions)
- Spoke Editor (unified tabbed overlay: Type tab + Schedule tab, replaces spoke-type-picker and spoke-config)
- Prioritiser Window (fixed, draggable, with action buttons per spoke type)
- Disclaimer/About
- Documentation (8-page in-app reference with nav and prev/next)

#### 4. **Storage** (`storage.js`)
- Multi-key localStorage persistence: meta key + per-pie keys
- JSON import/export functionality (per active pie)
- Migration from old single-blob format to multi-pie
- Status notifications
- Error handling

#### 5. **App Controller** (`app.js`)
- Application initialization (multi-pie migration + active pie load)
- Delegates user actions to appropriate modules
- Coordinates between DataModel, UI, and ChartRenderer
- Pie switching, creation, deletion, renaming orchestration
- Handles window resize events
- Contains example data for first-time users (3 named pies: Life, Team, Health)

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
2. Click spoke on chart, or its button in summary cards, to open the **Spoke Editor**
3. The editor has two tabs:
   - **Type tab**: Choose between Static, Single, Repeating, and List. Selecting Single or Repeating auto-switches to Schedule tab.
   - **Schedule tab**: Embedded date/time fields for Single, recurrence fields for Repeating. Hidden for Static/List.
4. Schedule data persists across type switches (switch to Static and back to Single — your date is still there)
5. For List: action list appears below type buttons with Add/Add & Schedule
6. Scheduled spokes show green pill on chart. Click to reopen editor on Schedule tab.

**Calendar Event Naming:**
- **Single/Repeating spokes**: `Spoke Name (Category/Slice)`
- **List actions**: `Action Name (Spoke/Slice/Category)`

**Backwards Compatibility:**
- Existing `type: 'action'` spokes are treated as 'list'

### 5. Calendar Integration
- **Google Calendar** - Opens web interface with pre-filled event
- **Apple Calendar** - Downloads .ics file
- **Import from Google Calendar** - 2-step wizard to browse and import existing calendar events as spokes
- **Custom scheduling** - Date/time picker for actions
- **All-day events** - Checkbox to create all-day events (default for new events)
- **Invitees** - Comma-separated email addresses added as attendees
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

### 7. Storage Modes

**Browser localStorage (default):** No setup, single device, offline.

**Local file mode:** Saves to a `.json` file on disk via File System Access API (Chrome/Edge only). Handle persisted in IndexedDB — reconnects automatically on reload.

**Firebase backup (on-demand):** Coexists with localStorage or local file. Push/pull snapshots without switching primary storage. Activated via `firebaseBackupEnabled` in localStorage.

**Firebase live sync:** Replaces localStorage/file as primary backend. Real-time sync across devices/team. Google auth required. Activated via `cloudSyncEnabled` in localStorage.

Shared settings UI features:
- **URL-based config** - `?config=base64...` URL encodes Firebase config; Personal URL forces `mode: "personal"` (UID-scoped paths)
- **Copy Personal URL** - Always generates a personal-mode URL regardless of current config
- **Export config** - Download Firebase config as JSON
- **Visual indicator** - Shows storage mode + project name + sync status in main UI

**Firebase Path Structure:**

Two modes set via `"mode"` in `brainPieFirebaseConfig`:

*Personal mode (`"mode": "personal"`) — recommended. Each user's data isolated under their UID:*
```
brainpie/{projectId}/users/{uid}/
├── meta              ← pieIds, pieNames, activePieId
├── pies/{pieId}      ← categories, categoryPercentageOverrides
├── priorities/{pieId}← per-user priority array
└── userState         ← activePieId, UI state
```

*Shared mode (no `mode` field) — legacy. All users share pie data:*
```
brainpie/{projectId}/
├── meta              ← shared pieIds, pieNames
├── pies/{pieId}      ← shared categories + overrides
├── userPriorities/{uid}/{pieId}  ← per-user priorities
└── userState/{uid}   ← per-user UI state
```

"Copy Personal URL" in settings always forces `mode: "personal"`. "Copy URL" encodes the config as-is.

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
3. **Pending spoke type** - Not yet implemented
4. **Recurring event sync is one-way** - Changes made to recurring events in Google Calendar (moving single instances, moving all following events) won't sync back to Brain Pie. The app will continue showing the original recurrence pattern. Deleting the entire series from Google Calendar will remove the action locally.

### Known Behaviors
1. **Percentage normalization** sometimes unintuitive for users
2. **Mobile chart interactions** can be tricky with small slices
3. **Text overflow** on small slices not handled gracefully

## Changelog

### v0.20 (March 2026)
Tombstone system bug fixes, active pie persistence across refresh, and priority listener robustness:

**Tombstone Bug Fixes:**
- Trashing a pie now always creates a fresh "New Pie" and switches to it, regardless of whether other pies exist (previously only created a fresh pie when no siblings remained; with siblings it incorrectly stayed on the tombstoned pie)
- Tombstoned pies now appear greyed in the tab bar after trash — previously the tab bar showed no active (green) tab
- Restored pies now correctly propagate to Firebase — the `saveMeta` transaction previously union-merged `tombstonedPieIds`, making restores impossible; now uses local `tombstonedPieIds` as source of truth
- Opening Settings no longer resets the active pie to `pieIds[0]` — `syncOnConnect` now sets `UI._hasReloadedFromFirebase = true` so `updateAuthUI` skips its redundant `reloadDataFromFirebase` call
- `reloadDataFromFirebase` now preserves the locally selected active pie instead of always defaulting to `pieIds[0]`
- "Fresh pie" confirm text updated to "This will trash this pie, and start a fresh one"
- Tombstoned-pie name changed from "My Pie" to "New Pie" to match confirm text

**Active Pie Persistence Across Refresh:**
- `setActivePieId()` now also saves to Firebase at `userState/{uid}/activePieId` (fire-and-forget)
- `syncOnConnect()` reads Firebase `activePieId` first on page load, falls back to localStorage — same pie shown after browser refresh, across devices
- `syncOnConnect()` tombstone check now uses explicit `tombstonedPieIds` list instead of the old empty-categories heuristic (which incorrectly skipped newly created empty pies)
- Removed the fallback loop in `syncOnConnect` that overrode a valid empty active pie with a different pie

**Firebase Path Added:**
- `brainpie/{projectId}/userState/{uid}/activePieId` — per-user active pie tracking

**Priority Listener Fix:**
- All three priority listener callbacks now check `_isSyncingData` (in addition to `isSavingPriorities`), preventing remote priority updates from overwriting freshly-loaded priorities mid-sync — mirrors the existing guard on the pie data listener

---

### v0.19 (March 2026)
Firebase data-safety improvements, tombstone-on-empty pies, spoke schedule persistence, and recurrence pill improvements:

**Tombstone-On-Empty Pie (Firebase mode):**
- Empty `categories: []` is never written to Firebase — prevents bugs or stale data from blanking a shared pie
- When a pie is emptied, it is tombstoned in meta (`tombstonedPieIds`) and its Firebase data is preserved untouched
- If the last active pie is tombstoned, a fresh "My Pie" is automatically created and set as active
- Tombstoned tabs appear greyed and italic in the tab bar with tooltip "Empty — data preserved in cloud"
- Clicking a tombstoned tab shows a Restore / Delete context menu; the current active pie stays in view
- **Restore**: removes tombstone flag, switches to pie, reloads preserved data from Firebase
- **Delete**: the only path that explicitly clears `pies/{pieId}` from Firebase — confirmation required
- `tombstonedPieIds` syncs to Firebase via meta transaction (union-merge, so tombstones propagate across devices)
- Local mode unaffected: empty categories write freely to localStorage

**Firebase Sync Bug Fixes:**
- `?config=` URL guard moved to top of `loadFromStorageOrExample()` — previously reachable only after localStorage checks, allowing sibling-tab example data to contaminate Firebase sessions
- `pushLocalOnlyPies` removed from `syncOnConnect()` — on auto-connect Firebase is the source of truth; pushing local pies on page load could silently overwrite Firebase with stale data
- `unsubscribeFromChanges()` now uses `currentListenerRef` (the exact ref object stored at subscribe time) — previously always called `.off()` on the legacy `data/` path, silently doing nothing, causing listeners to stack on every pie switch

**Spoke Schedule Persistence (Done without Add to Calendar):**
- Clicking "Done" on spoke editor Tab 2 (Schedule) now saves the entered date/time/recurrence to the spoke, even if "Add to Calendar" was not clicked
- Previously the schedule data was discarded on Done; user had to add to calendar to persist it
- `calendarEventId` is preserved if a calendar event was previously linked
- "Add to Calendar" flow unchanged — still creates the calendar event and attaches the ID
- Schedule pill appears on chart after Done; spoke editor re-opens to Schedule tab pre-filled

**Biweekly Recurrence Pills:**
- Weekly events with interval > 1 (biweekly, etc.) now show the next occurrence date instead of just the day name
- Next occurrence within 6 days: "Next Thu 9AM"
- Next occurrence further away: "Thu 19th 9AM"
- Weekly every-week events with specific days unchanged: "Mon, Wed 9AM"

---

### v0.18 (February 2026)
Import from Google Calendar, smarter recurrence pills, clickable URLs in action popups, and bug fixes:

**Import from Google Calendar:**
- New "Import from Google Calendar" button in Settings → Data section (visible when signed into Google)
- 2-step wizard overlay: Step 1 (fetch & select events), Step 2 (review & assign targets)
- Time range picker: Last 30 days, Last 90 days, or Custom date range
- Default category/slice target with dropdown pickers and "+ New" inline creation
- Per-event target override in Step 2 with category/slice dropdowns and "+ New" buttons
- Events already tracked in Brain Pie are automatically excluded (no duplicate imports)
- Select All / Deselect All controls with event count
- One-time timed events → Single spokes with date, time, duration, and `calendarEventId`
- All-day events → Single spokes with `allDay: true` and `calendarEventId`
- Recurring events → Repeating spokes with parsed RRULE recurrence data and `calendarEventId`
- Existing calendar sync works on imported events (detect moves/deletes on next page load)

**New API Methods:**
- `CalendarAdapter.listEvents(timeMin, timeMax)` — fetches events with pagination, `singleEvents=false` for master recurring events
- `CalendarAdapter.parseRecurrence(rruleString, event)` — converts RRULE to Brain Pie's recurrence format (uppercase frequency, `byDay` codes, `byMonthDay`, `until`/`count`)
- `DataModel.getExistingCalendarEventIds()` — scans all spokes/actions for known calendar event IDs

**Smarter Recurrence Pills:**
- Weekly events with specific days: keep day names in pill (e.g. "Mon, Wed, Fri 9AM")
- Yearly events: show next occurrence date (e.g. "Feb 15")
- Monthly events: show next occurrence with ordinal (e.g. "1st Mar")
- Daily events: show next occurrence date (e.g. "Feb 12")
- Repeating icon already signals recurrence, so pill text focuses on *when* not *what*

**Yearly Date in Recurrence Descriptions:**
- Compact format: "Feb 15, yearly" (for pills in summary cards)
- Full format: "Every year on Feb 15" (for recurrence editor)
- Both formats include time if the event is timed

**Clickable URLs in Action Popup:**
- Action names containing URLs are now clickable links in the chart action popup
- Uses `foreignObject` with HTML rendering instead of SVG `<text>` (which can't contain links)
- Links open in new tab with `target="_blank"` and `rel="noopener noreferrer"`
- Checkbox completion toggle updates `color` style instead of SVG `fill` attribute

**Firebase Auth Fix:**
- Config URL sign-in banner no longer flashes for already-signed-in users
- Replaced 1500ms `setTimeout` with Firebase SDK's native `auth.onAuthStateChanged` callback
- Auth state resolves immediately from cache when user is already signed in

**Schedule Pill Null-Time Fix:**
- Clicking schedule pills on all-day events in summary cards no longer throws `Cannot read properties of undefined (reading 'split')`
- Date/time picker now handles `null` time gracefully, defaulting to 09:00

---

### v0.17 (February 2026)
Focus Prioritised toggle to filter pie/treemap to only show prioritised items:

**Focus Prioritised Toggle:**
- New "Focus ★" checkbox on desktop (top-right, after Treemap toggle) and mobile (Settings overlay)
- Desktop and mobile checkboxes stay in sync (same pattern as Hide Spokes and Treemap toggles)
- State persists to localStorage across page reloads
- When ON: pie/treemap/summary cards show only items referenced in the priority list
- When OFF: full unfiltered view restores immediately

**Visibility Rules:**
- Prioritised **spoke** → that spoke visible, parent slice + category visible
- Prioritised **action** → parent spoke visible (as container), parent slice + category visible
- Prioritised **slice** → slice visible with **all its spokes** (user prioritised the whole slice)
- Category visible only if it contains at least one visible slice
- Empty priority list with focus ON → empty state message: "No priorities set — use ★ to add items"

**Data Model — `getFilteredCategories()`:**
- New method builds a filtered deep copy of `categories` using `priorityList`
- Scans priority refs to build visibility sets (slice keys, spoke indices per slice)
- Filtered spokes annotated with `_originalIndex` property so chart/UI can reference the correct position in the original `subItems` array
- String spokes normalized to objects when annotated (preserves backward compatibility)

**Index Correctness:**
- Chart renderer (pie + treemap) and summary cards derive `spokeIndex` from `_originalIndex` when present, falling back to loop index
- All inline handlers (spoke editor, priority stars, rename, remove, calendar, drag data attributes) use the correct original index
- Prevents wrong-spoke-clicked and wrong-priority-star bugs when subItems are filtered

**Expanded View Safety:**
- If the user is in an expanded slice/category view and toggles focus ON, the expanded target is checked against filtered categories
- If the target is no longer visible, `expandedView` resets to `null` before rendering (prevents blank chart)

---

### v0.16 (February 2026)
Multi-pie support with tab-based switching, Firebase shared pies, and drag-to-reorder tabs:

**Multi-Pie System:**
- Users can now create, switch between, rename, and delete multiple independent pies
- Each pie has its own categories, slices, spokes, actions, and percentage overrides
- Pill-style tab bar below the title for switching between pies
- "+" button to create new pies, click active tab for rename/delete context menu
- Tab bar hidden when only one pie exists (no visual change from previous versions)
- Drag-and-drop reorder for pie tabs (HTML5 drag API)
- Tab bar capped at 25vw width (wraps on overflow), full width on mobile

**localStorage Multi-Pie Storage:**
- Meta key (`brainPie_meta`) stores pie list, active pie ID, and pie names
- Per-pie keys (`brainPie_pie_{id}`) store categories, overrides, and priorities independently
- `activePieId` tracked in meta (persists across page reloads)
- Automatic migration from old single-blob `brainPieChartData` format on first load

**Firebase Multi-Pie Storage:**
- Shared `meta` node: `{ pieIds, pieNames }` — all team members see the same set of pies
- Shared `pies/{pieId}` nodes: categories and percentage overrides per pie
- Per-user per-pie priorities: `userPriorities/{uid}/{pieId}` (extends v0.15 per-user model)
- `activePieId` stays in localStorage only (each user picks their own view)
- Real-time meta listener: new pies created by team members appear as tabs automatically
- Per-pie data + priority listeners: detach and reattach on pie switch
- Automatic migration from old single-blob `data/` format (first team member to load triggers)

**Pie Lifecycle:**
- **Create**: Generates unique ID, adds to meta, creates empty pie with default example data
- **Switch**: Saves current pie, loads target pie, re-renders chart and cards, reattaches Firebase listeners
- **Rename**: Updates meta and pie data, re-renders tab bar
- **Delete**: Removes from meta, deletes pie data + user priorities (Firebase: also cleans `userPriorities/{uid}/{pieId}`), switches to next pie or creates fresh default if last pie deleted

**Firebase Sync Fixes:**
- `enableCloudSync()` now registers auth listener and sets `currentMode = 'firebase'` immediately when called after `init()` (fixes first-time sign-in from Settings not syncing)
- `skipSyncOnConnect` flag prevents double-subscription when `reloadDataFromFirebase()` handles Firebase data
- Local-only pies silently pushed to Firebase on connect (pies not in Firebase meta are uploaded automatically)

**Tutorial Updates:**
- Example pies now named: "Life Pie", "Team Pie", "Health Pie" (appear in tab bar)
- `_nameActivePie(name)` sets pie name before `setCategories()` to prevent "My Pie" fallback
- Tutorial completion: "Continue With This Pie" as primary button (user stays on Health Pie)
- All `console.log('[Tutorial]')` messages moved to `Debug.log()` (only visible with debug mode)

**Import/Export:**
- Export filename includes active pie name (e.g., `brain-pie-life-pie-2026-02-10.json`)
- Import selection shows source/target pie context banner
- Quick Replace confirm dialog names the target pie
- Import/export operates on active pie only (same merge logic as before)

**Spoke Editor Fix:**
- Tab 2 (Schedule) bottom button now shows "Done" instead of "Save" to reduce confusion with "Add to Calendar"
- "Done" on Schedule tab saves the spoke type without triggering calendar scheduling

---

### v0.15 (February 2026)
Per-user priorities for Firebase team collaboration:

**Per-User Priority Storage:**
- Priority lists now stored per-user in Firebase at `userPriorities/{uid}` instead of in the shared data blob
- Each team member on a shared Firebase project sees only their own priorities
- Same-user multi-device sync: priority changes on one device appear on other devices (same user)
- Team members' categories/slices/spokes still sync as shared data — only priorities are personal
- localStorage mode unchanged: priorities remain in the main data blob (single user)

**Firebase Path Structure:**
- Shared data: `brainpie/{projectId}/data/` (categories, settings, overrides — no priorityList)
- Per-user priorities: `brainpie/{projectId}/userPriorities/{uid}/` (priority array)
- `FirebaseAdapter.save()` now strips `priorityList` from shared data before writing
- New methods: `getUserPriorityPath()`, `savePriorities()`, `loadPriorities()`, `subscribeToPriorityChanges()`, `unsubscribeFromPriorityChanges()`

**Storage Adapter Routing:**
- New `StorageAdapter.savePriorities()` routes to Firebase per-user path in Firebase mode, no-op in localStorage mode
- New `StorageAdapter.loadPriorities()` reads from per-user path in Firebase mode
- New `StorageAdapter.subscribeToPriorityChanges()` for real-time priority sync
- Firebase listener no longer overwrites `DataModel.priorityList` from shared data callback

**Data Model:**
- Priority CRUD methods (`addPriority`, `removePriority`, `reorderPriority`) now call `savePrioritiesToStorage()` for immediate Firebase writes
- New `savePrioritiesToStorage()` helper method

**Migration:**
- On first load after upgrade: if shared data contains `priorityList` but per-user path is empty, copies shared priorities to per-user path
- Shared blob's `priorityList` gets stripped on next save naturally
- Each team member gets the existing shared list as their starting point

---

### v0.14 (February 2026)
Unified spoke editor, schedule pill border states, expanded view sizing, clickable URLs, and scrollable scheduler:

**Unified Spoke Editor:**
- Merged 4 separate overlays (spoke-type-picker, spoke-config, plus spoke-level datetime/recurrence scheduling) into a single tabbed `#spoke-editor-overlay`
- **Tab 1 (Type):** 4 type buttons (Static, Single, Repeating, List) + action list section for List type
- **Tab 2 (Schedule):** Embedded date/time fields for Single, recurrence fields for Repeating. Tab hidden for Static/List types.
- Header shows breadcrumb (`Category / Slice`), spoke name, priority star, and close button
- Selecting Single or Repeating auto-switches to Schedule tab
- Schedule data persists in `pendingScheduleData` across type switches — switch to Static and back, your date is preserved
- Opening a spoke that already has a schedule focuses the Schedule tab automatically
- Standalone datetime/recurrence overlays kept for action-level scheduling from action popup
- All callers updated: chart spoke clicks, summary card buttons, Tab 2 buttons, prioritiser action buttons
- Tutorial updated with new selectors and event names
- Deleted methods: `showSpokeTypePicker`, `closeSpokeTypePicker`, `selectSpokeType`, `showSpokeConfig`, `closeSpokeConfig`, `saveSpokeConfig`, `selectSpokeConfigType`, `updateSpokeTypeFields`, `openSpokeScheduler`, `openSpokeRecurrenceScheduler`, `openRecurrencePickerForSpoke`, `loadExistingRecurrence`, `renderExistingActions`
- Deleted state: `pendingSpokeConfig`, `pendingSpokeTypePicker`, `pendingReturnToSpokeConfig`, `pendingRecurrenceData`, `pendingSpokeSchedule`
- Deleted HTML: `#spoke-config-overlay`, `#spoke-type-picker-overlay`
- Deleted CSS: `.spoke-config-overlay`, `.spoke-type-picker-overlay`, `.spoke-type-picker-content`
- `createCalendarEvent()` simplified to action-level only (spoke-level scheduling handled by `saveSpokeEditorSchedule`)

**Schedule Pill Border States (complete):**
- Past events: pill background turns orange (`#FF9800`) with red border (`#e65100`)
- Today's events: orange border (`#FF9800`)
- Tomorrow's events: black border (`#000000`)
- Future events: white border (default)
- Applied to both pie chart SVG pills (`addSchedulePill`) and treemap inline pills
- Previously only summary card pills and some button pills had border states

**Expanded View Sizing:**
- Clicking into a slice or category view now renders the pie 30% smaller (`outerRadius * 0.7`)
- Spoke extensions increased: base 15→40, max 46→90 when expanded
- Label font size increased from 12px to 18px when expanded
- Schedule pill font size increased from 12px to 16px when expanded
- Creates a more readable zoomed-in view with longer spokes and larger text

**Clickable URLs in Action Text:**
- URLs in action names automatically become clickable links
- Applied to Tab 2 action lists, summary card actions, spoke editor actions, and prioritiser item names
- New `linkifyUrls()` helper method on UI object
- Links open in new tab with `target="_blank"` and `rel="noopener noreferrer"`
- Only applied to actions (not spoke names, where it's less practical)

**Scrollable Datetime Picker:**
- Date/time picker overlay now has `max-height: 90vh` with `overflow-y: auto`
- Prevents clipping on smaller screens when all fields (date, time, duration, location, notes, invitees) are visible

**In-App Docs Update:**
- "Spokes & Actions" page updated to document the new Spoke Editor (replacing old "Changing Spoke Type" section)
- Schedule Indicators section now documents pill border states (tomorrow, today, past)

**Completed Action Calendar Hiding (from stash):**
- Calendar icon / schedule pill hidden for completed (checked) actions in the chart action popup
- Wraps the calendar group render in an `if(!isCompleted)` guard

---

### v0.13 (February 2026)
In-app documentation and prioritiser persistence:

**Full Documentation Popup:**
- New 7-page in-app documentation accessible from Settings → Help → "Full Documentation"
- Pill-style page navigation buttons (green active state) with prev/next footer
- Pages cover: Overview, Getting Started, Spokes & Actions, Calendar, Priorities, Cloud Sync, Import/Export
- Scrollable page content within fixed-height overlay
- Click outside or ✕ to close
- Mobile responsive: nav pills wrap, content fits 90vh
- Follows existing overlay pattern (disclaimer-style fixed overlay with `.active` toggle)

**Prioritiser State Persistence:**
- Prioritiser window open/closed state and position now restore on page load
- `restorePrioritiserState()` called during app initialization

---

### v0.12 (February 2026)
Calendar enhancements, tutorial UX improvements, and action popup fixes:

**All-Day Events:**
- New "All day" checkbox in datetime picker between Date and Time fields
- When checked, Time and Duration sections are hidden
- New events default to all-day (unchecking reveals time picker defaulting to 9AM)
- All-day state persists in `scheduled.allDay` and pre-fills on reschedule
- Google Calendar API: uses `{ date }` format (already supported in `buildEventPayload`)
- Google Calendar URL redirect: uses `YYYYMMDD/YYYYMMDD` date format
- Apple .ics: uses `DTSTART;VALUE=DATE:YYYYMMDD` format (no time component)
- Schedule display shows "Feb 15 (all day)" across all views (summary cards, action popup, spoke editor)

**Invitees / Attendees:**
- New "Invitees" text input in datetime picker (comma-separated emails)
- Invitees persist in `scheduled.invitees` array and pre-fill on reschedule
- Google Calendar API: added as `payload.attendees = [{ email }]`
- Apple .ics: added as `ATTENDEE;PARTSTAT=NEEDS-ACTION:mailto:email` lines

**Skip Scheduling Cleanup:**
- "Skip" button no longer saves partial date/time data to the model
- Previously, skipping saved defaults as if scheduled, showing misleading green pills
- Skip now simply closes the picker without side effects

**Action Popup Bottom-Edge Fix:**
- Popup now flips above the click point when it would clip the bottom edge of the SVG
- Calculates both below (clickY + 15) and above (clickY - cardHeight - 15) positions
- Chooses below if it fits, otherwise above

**Hide Schedule on Completed Actions:**
- Calendar icon / schedule pill hidden for completed (checked) actions in the action popup
- Checked actions no longer show scheduling controls

**Tutorial UX Improvements:**
- "Skip Tutorial" button moved to fixed bottom-right position (all tutorial steps)
- Removed inline Skip buttons from every modal/tooltip step
- New `.tutorial-skip-fixed` CSS class (fixed position, z-index 10002)
- Auto-progress on two tutorial steps: "Nice Work" (3s) and "Edit From Here Too" (5s)
- Auto-progress timers cleared on skip, next, and complete
- Tutorial example data now saves to localStorage only (not Firebase) to prevent pushing tutorial data to cloud sync

---

### v0.11 (February 2026)
Responsive layout overhaul, prioritiser enhancements, star consistency, and tutorial safety:

**Responsive Layout Overhaul:**
- Top-bar panels flush to corners (top: 0, left/right: 0) with white background and box-shadow
- H1 responsive scaling: 38px → 32px (≤1920) → 30px (≤1024) → 24px (≤960)
- Emoji pie icon moved before title text with vertical alignment
- Info icon (ⓘ) wrapped in transparent `.blank` button class
- Container padding adjusts per breakpoint: 20px (desktop) → 55px top (≤1024) → 25px top (≤960) → 5px (≤768)
- Cards outer section gets horizontal padding on small screens (≤960px)
- Categories grid min-width increased from 460px to 500px
- Category cards reduced padding on mobile (≤768px)
- Mobile top bar: fixed position, compact button row with flexbox and gap spacing
- Mobile "Hide spokes" and "Tree view" toggles moved from top bar into Settings overlay (new `.settings-section-mobile` block, hidden on desktop)
- Mobile Priorities button moved into compact top bar row (star icon only)
- Info icon scales down at ≤1440px (18px)

**Treemap Improvements:**
- Slice header font increased from 14px → 16px bold
- More padding below slice headers (spokeStartY 30 → 36)
- Increased spoke line height (13 → 15) and spacing between spokes (3 → 6)
- Overflow "+N more" text enlarged from 9px to 12px
- Character width estimate for title truncation updated for larger font (8.5 → 9.5)
- Empty state message font increased (16px → 18px)
- `.treemap-slice` CSS rule with 18px base font size

**Prioritiser Window:**
- Width increased from 260px → 320px (mobile: 220px → 280px)
- Action buttons added between info and star for each priority item:
  - **Single unscheduled**: 📅 calendar icon → opens scheduler
  - **Single scheduled**: green pill with date/time → opens rescheduler
  - **Repeating unscheduled**: 🔁 icon → opens recurrence scheduler
  - **Repeating scheduled**: green pill with recurrence text → opens editor
  - **List spoke/action**: ✏️ pencil → navigates to spoke (opens action popup)
  - **Static/slice**: no action button

**Summary Card Stars:**
- Spoke stars moved to far left of row (before text), replacing the blue dot pseudo-element
- Slice headers now have a priority star before the slice name
- Action stars moved outside the grey `#f5f5f5` background to the left
- Blue dot pseudo-element removed (`content: none` on `.sub-item-text:before`)

**Action Popup Star:**
- Star moved to far left of each action row (before checkbox)
- Star character changed from ✳ (`\u2733`) to ★ (`\u2605`) for consistency with rest of app
- Row order: Star → Checkbox → Title → Trash → Calendar (was: Checkbox → Title → Calendar → Star → Trash)
- Star now calls `UI.addToPriorities()` (was calling `DataModel.addPriority()` directly)

**Auto-Open Prioritiser:**
- Clicking any star to add a priority now opens the prioritiser window if not already visible
- All star click paths now flow through `UI.addToPriorities()` which calls `openPrioritiser()`

**Tutorial Skip Safety:**
- Skipping tutorial before example data loads no longer overwrites existing localStorage data
- New check: if user has categories but no stash (skipped before `loadLifePie` ran), re-renders their existing pie instead of loading example data

**CSS Cleanup:**
- Consistent formatting throughout (whitespace before nested `@media`, proper indentation)
- Removed commented-out background/border-radius on top-bar-left
- Compact CSS selectors (`+span`, `>` child combinators)
- Expanded keyframe animations for readability

---

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
- Star buttons (★) on datetime picker, recurrence picker, and spoke editor overlays
- Positioned left of close button, grey when inactive, gold when active
- Hidden when no data location available (e.g. during initial recurrence creation)

**Spoke Editor (unified overlay):**
- Replaced separate spoke-type-picker and spoke-config overlays with single tabbed spoke editor
- Tab 1 (Type): type buttons + action list for List type
- Tab 2 (Schedule): embedded date/time or recurrence fields
- Blue border + light blue background for selected type

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

### Firebase `undefined` Pitfall — NEVER use `undefined` in data objects
Firebase Realtime Database's `ref.set()` **throws an error** if any property in the data tree is `undefined`. Unlike `JSON.stringify()` (which silently drops `undefined`), Firebase rejects the entire write. The error message is: `set failed: value argument contains undefined in property '...'`.

**Never do:** Set properties to `undefined` in objects that will be saved to Firebase:
```javascript
// BAD — Firebase will reject this
{ scheduled: someValue ? { ...someValue } : undefined }
```

**Instead:** Use `null` (which Firebase accepts and treats as "delete this key"):
```javascript
// GOOD — Firebase accepts null
{ scheduled: someValue ? { ...someValue } : null }
```

**Also:** Avoid blind `{ ...obj }` spreads on objects that may contain `undefined` values (e.g. data loaded from localStorage or imported files). Explicitly construct objects with known fields instead.

### Google Cloud APIs — Must Be Enabled Per Firebase Project
Each Firebase project has its own Google Cloud project, and Google APIs must be explicitly enabled per project. Calendar and Tasks integration will silently fail (403 Forbidden) if the APIs aren't enabled — the error only appears in debug mode.

**Required APIs for full functionality:**
- **Google Calendar API** (`calendar-json.googleapis.com`) — needed for creating/updating/deleting calendar events and importing from Google Calendar
- **Google Tasks API** (`tasks.googleapis.com`) — needed for Google Tasks import

**To enable:** Go to [Google Cloud Console](https://console.cloud.google.com) → select the Firebase project → APIs & Services → Library → search for and enable each API.

**Symptom of missing API:** `CalendarAdapter: Create event failed: Google Calendar API has not been used in project {id} before or it is disabled.` (only visible with `Debug.toggle()`)

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
- [ ] **Scheduler stars**: Star button on datetime picker, recurrence picker, spoke editor
- [ ] **Spoke editor**: Opens with Type tab for static/unscheduled spokes
- [ ] **Spoke editor**: Opens with Schedule tab for scheduled single/repeating spokes
- [ ] **Spoke editor**: Tab 2 hidden for static/list types
- [ ] **Spoke editor**: Type buttons highlight selected type
- [ ] **Spoke editor**: Selecting Single/Repeating auto-switches to Schedule tab
- [ ] **Spoke editor**: Schedule data persists across type switches
- [ ] **Spoke editor**: Action list works for List type (add, remove, schedule)
- [ ] **Spoke editor**: Save writes correct type + schedule to model
- [ ] **Spoke editor**: All callers route through showSpokeEditor (chart, summary cards, prioritiser, tab 2)
- [ ] **Action popup**: Checkbox for completion
- [ ] **Action popup**: Star for prioritiser
- [ ] **Action popup**: Programmatic open (from prioritiser navigation)
- [ ] **Prioritiser**: Action buttons show correct state per spoke type (single/repeating/list)
- [ ] **Prioritiser**: Action buttons open correct scheduler/navigator
- [ ] **Summary card stars**: Spoke star on far left (no blue dot)
- [ ] **Summary card stars**: Slice header has star before name
- [ ] **Summary card stars**: Action star outside grey background
- [ ] **Action popup star**: Star on far left (before checkbox), uses ★ character
- [ ] **Auto-open prioritiser**: Adding any priority opens the prioritiser window
- [ ] **Tutorial skip**: Skipping before example data preserves existing localStorage
- [ ] **Responsive**: Top bar panels flush to corners at all breakpoints
- [ ] **Responsive**: Mobile toggles in Settings overlay, not top bar
- [ ] **Responsive**: Container padding correct at 1024px, 960px, 768px breakpoints
- [ ] **Treemap**: Larger slice titles (16px), more spoke spacing, readable at all sizes
- [ ] **All-day**: Checkbox defaults to checked for new events
- [ ] **All-day**: Time and Duration sections hide when checked
- [ ] **All-day**: Unchecking shows time picker with 9AM default
- [ ] **All-day**: All-day state persists on reschedule (pre-fills checkbox)
- [ ] **All-day**: Google Calendar creates all-day event (date bar, not timed)
- [ ] **All-day**: Apple .ics creates all-day event (VALUE=DATE format)
- [ ] **All-day**: Schedule display shows "Feb 15 (all day)" in summary cards
- [ ] **All-day**: Schedule display shows "Feb 15 (all day)" in action popup
- [ ] **All-day**: Chart schedule pills show date only (no time)
- [ ] **Invitees**: Input field in datetime picker accepts comma-separated emails
- [ ] **Invitees**: Invitees pre-fill on reschedule
- [ ] **Invitees**: Google Calendar event includes attendees
- [ ] **Invitees**: Apple .ics includes ATTENDEE lines
- [ ] **Skip scheduling**: Does not save any data (no misleading green pills)
- [ ] **Action popup**: Flips above click point when near bottom edge
- [ ] **Action popup**: Completed actions hide calendar/schedule controls
- [ ] **Tutorial**: Skip button fixed to bottom-right on all steps
- [ ] **Tutorial**: Auto-progress on "Nice Work" and "Edit From Here Too" steps
- [ ] **Tutorial**: Example data saved to localStorage only (not Firebase)
- [ ] **Docs popup**: Opens from Settings → Help → "Full Documentation"
- [ ] **Docs popup**: 8 pages with pill-style nav buttons (Overview, Getting Started, Spokes & Actions, Calendar, Priorities, Storage, Cloud Sync, Import/Export)
- [ ] **Docs popup**: Previous hidden on page 1, Next hidden on page 8
- [ ] **Docs popup**: Click outside or ✕ to close
- [ ] **Docs popup**: Content scrolls when exceeding viewport height
- [ ] **Docs popup**: Mobile responsive (nav wraps, fits 90vh)
- [ ] **Docs popup**: All page content accurate and covers app features
- [ ] **Prioritiser state**: Window open/closed and position restored on page load
- [ ] **Per-user priorities (localStorage)**: Priorities save/load as before (no regression)
- [ ] **Per-user priorities (Firebase)**: Priorities written to `userPriorities/{uid}`, not in shared `data/`
- [ ] **Per-user priorities (multi-device)**: Change priority on one device → appears on other device (same user)
- [ ] **Per-user priorities (team isolation)**: User A's priorities don't appear for User B
- [ ] **Per-user priorities (migration)**: Existing shared `priorityList` copied to user path on first load
- [ ] **Per-user priorities (shared sync)**: Categories, spokes, schedules still sync between team members
- [ ] **Per-user priorities (orphan cleanup)**: `validatePriorityList()` runs after load/sync
- [ ] **Per-user priorities (import/export)**: Priorities included in export, imported to user path
- [ ] **Multi-pie (localStorage)**: Old single-blob data auto-migrates on first load
- [ ] **Multi-pie (localStorage)**: Meta, per-pie keys created correctly
- [ ] **Multi-pie (Firebase)**: Old `data/` blob auto-migrates to `meta` + `pies/{id}`
- [ ] **Multi-pie (tab bar)**: Tabs show all pies, active highlighted green
- [ ] **Multi-pie (tab bar)**: Tab bar hidden when only 1 pie
- [ ] **Multi-pie (tab bar)**: "+" button creates new pie and switches to it
- [ ] **Multi-pie (tab bar)**: Click active tab shows rename/delete context menu
- [ ] **Multi-pie (tab bar)**: Drag-and-drop reorder tabs
- [ ] **Multi-pie (tab bar)**: Max 25vw width, wraps on overflow
- [ ] **Multi-pie (tab bar)**: Mobile full width
- [ ] **Multi-pie (switch)**: Switching pies loads correct categories, spokes, priorities
- [ ] **Multi-pie (switch)**: Chart and summary cards re-render correctly
- [ ] **Multi-pie (rename)**: Tab label updates, pie data updated
- [ ] **Multi-pie (delete)**: Pie removed from meta and storage
- [ ] **Multi-pie (delete)**: Switches to another pie after deletion
- [ ] **Multi-pie (delete)**: Delete last pie creates fresh default
- [ ] **Multi-pie (Firebase)**: Shared meta syncs (new pie on one device appears on others)
- [ ] **Multi-pie (Firebase)**: Per-pie data syncs between team members
- [ ] **Multi-pie (Firebase)**: Per-user per-pie priorities (extends v0.15)
- [ ] **Multi-pie (Firebase)**: Local-only pies pushed to Firebase on connect
- [ ] **Multi-pie (Firebase)**: First-time sign-in from Settings syncs correctly
- [ ] **Multi-pie (Firebase)**: Pie deletion cleans up `userPriorities/{uid}/{pieId}`
- [ ] **Multi-pie (import/export)**: Export filename includes pie name
- [ ] **Multi-pie (import/export)**: Import shows source/target pie context
- [ ] **Multi-pie (tutorial)**: Example pies named Life Pie, Team Pie, Health Pie
- [ ] **Multi-pie (tutorial)**: Pie names appear in tab bar
- [ ] **Multi-pie (tutorial)**: Tutorial console messages only in debug mode
- [ ] **Focus Prioritised**: Toggle visible on desktop (top-right, after Treemap)
- [ ] **Focus Prioritised**: Toggle visible on mobile (Settings overlay)
- [ ] **Focus Prioritised**: Desktop/mobile checkboxes stay in sync
- [ ] **Focus Prioritised**: State persists across page reload (localStorage)
- [ ] **Focus Prioritised (ON)**: Only prioritised spokes/actions/slices visible in pie view
- [ ] **Focus Prioritised (ON)**: Only prioritised items visible in treemap view
- [ ] **Focus Prioritised (OFF)**: Full unfiltered view restores
- [ ] **Focus Prioritised**: Prioritised spoke → parent slice + category shown
- [ ] **Focus Prioritised**: Prioritised action → parent spoke + slice + category shown
- [ ] **Focus Prioritised**: Prioritised slice → all its spokes shown
- [ ] **Focus Prioritised**: No priorities → empty state message in chart
- [ ] **Focus Prioritised**: Expanded view collapses if target not in filtered set
- [ ] **Focus Prioritised**: Summary cards only show filtered items
- [ ] **Focus Prioritised**: Spoke clicks open correct spoke editor (original index preserved)
- [ ] **Focus Prioritised**: Priority stars match correctly in filtered view
- [ ] **Focus Prioritised**: Works alongside hide-spokes and treemap toggles
- [ ] **Calendar Import**: Button visible in Settings when signed into Google
- [ ] **Calendar Import**: Button hidden when no Google auth
- [ ] **Calendar Import**: Fetching shows loading state, handles API errors
- [ ] **Calendar Import**: Events already tracked in Brain Pie excluded from list
- [ ] **Calendar Import**: Select All / Deselect All work
- [ ] **Calendar Import**: Time range radio buttons refetch events
- [ ] **Calendar Import**: Default target dropdowns populate correctly
- [ ] **Calendar Import**: "+ New" category/slice inline creation works (Step 1 and Step 2)
- [ ] **Calendar Import**: Step 2 shows correct event count and assignments
- [ ] **Calendar Import**: Per-event target override with dropdowns works
- [ ] **Calendar Import**: One-off timed events → Single spokes with correct schedule
- [ ] **Calendar Import**: All-day events → Single spokes with allDay flag
- [ ] **Calendar Import**: Recurring events → Repeating spokes with parsed recurrence
- [ ] **Calendar Import**: Imported spokes appear in correct category/slice
- [ ] **Calendar Import**: Schedule pills show on chart after import
- [ ] **Calendar Import**: Re-importing excludes previously imported events
- [ ] **Calendar Import**: Works with both Firebase auth and standalone Google auth
- [ ] **Recurrence pills**: Weekly shows day names (Mon, Wed, Fri 9AM)
- [ ] **Recurrence pills**: Yearly shows next occurrence date (Feb 15)
- [ ] **Recurrence pills**: Monthly shows ordinal + month (1st Mar)
- [ ] **Recurrence pills**: Daily shows next occurrence date
- [ ] **Yearly recurrence**: Compact description shows "Feb 15, yearly"
- [ ] **Yearly recurrence**: Full description shows "Every year on Feb 15"
- [ ] **Action popup**: URLs in action names are clickable links
- [ ] **Action popup**: Completion checkbox toggles link style correctly
- [ ] **Firebase auth**: Config URL doesn't flash sign-in banner when already logged in
- [ ] **Schedule pills**: Clicking all-day event pill opens picker without error
- [ ] **Tombstone (empty pie)**: Deleting last category in Firebase mode tombstones pie, does not write empty data to Firebase
- [ ] **Tombstone (last pie)**: Tombstoning last active pie auto-creates a fresh "My Pie"
- [ ] **Tombstone (tab)**: Tombstoned tab appears greyed/italic with tooltip
- [ ] **Tombstone (tab click)**: Clicking tombstoned tab shows Restore/Delete menu, active pie stays in view
- [ ] **Tombstone (restore)**: Restore removes tombstone, switches to pie, loads preserved Firebase data
- [ ] **Tombstone (delete)**: Delete confirms, clears `pies/{id}` from Firebase, removes tab
- [ ] **Tombstone (multi-device)**: Tombstone in meta syncs to other devices via real-time listener
- [ ] **Tombstone (local mode)**: Emptying a pie in local mode works normally (no tombstone)
- [ ] **Spoke editor Done**: Entering date/time and clicking Done (no Add to Calendar) saves schedule to spoke
- [ ] **Spoke editor Done**: Schedule pill appears on chart after Done without calendar entry
- [ ] **Spoke editor Done**: Re-opening editor pre-fills Schedule tab with saved data
- [ ] **Spoke editor Done**: Existing calendarEventId preserved when saving via Done
- [ ] **Recurrence pills**: Biweekly event within 6 days shows "Next Thu 9AM"
- [ ] **Recurrence pills**: Biweekly event further away shows "Thu 19th 9AM"
- [ ] **Recurrence pills**: Weekly every-week events unchanged ("Mon, Wed 9AM")

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
6. ~~Multiple document support~~ (implemented in v0.16)

## License
[Add license information]

## Credits
Created by Ryan (ryanthegecko)
Built with D3.js

---
