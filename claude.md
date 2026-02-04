# Brain Pie - Project Documentation

**Last Updated:** February 2026
**Current Version:** v0.6

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
              text: "Spoke with type and actions",
              type: "action",  // 'static', 'action', 'repeating', 'pending'
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
                condition: null,        // For pending spokes
                calendarEventId: null,  // For calendar sync
                nextState: null,        // For pending → action transitions
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
  }
}
```

#### 2. **ChartRenderer** (`chart-renderer.js`)
- Renders the D3.js visualization
- Handles responsive sizing
- Manages interactive states (hover, click, expand)
- Implements three expansion modes:
  - **Slice expansion** - Click an inner slice to expand it
  - **Category expansion** - Click an outer ring to expand category
  - **Branch expansion** - Click spoke with children to show action tree

**Key Features:**
- Curved text along category arcs
- Radial text for slice labels
- Exponential spoke extension (longer near vertical axis)
- Dynamic color contrast detection for text readability
- Smooth transitions and animations

#### 3. **UI Controller** (`ui-controller.js`)
- Manages all overlay states (menu, settings, datetime picker, spoke config, disclaimer)
- Handles drag-and-drop reordering
- Builds the category/item list in the bottom section
- Manages the spoke builder for adding new items
- Calendar integration (Google Calendar & Apple iCal)
- Spoke configuration and action scheduling workflow

**Overlays:**
- Add Slices Menu
- Settings (calendar provider selection)
- Date/Time Picker (for scheduling actions)
- Spoke Configuration (set spoke type, add/schedule actions)
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

### 3. Expansion Modes
Three ways to focus on specific areas:
- Click a **slice** to expand it (30-60% of view)
- Click a **category** to expand it with all slices
- Click a **spoke with actions** to show branch tree

### 4. Spoke Type System
Spokes can have different types that affect their behavior:
- **Static** (default) - Persistent reminders that stay on your mind
- **Action** - One-time tasks with calendar integration and scheduling
- **Repeating** - Recurring tasks (planned, not yet implemented)
- **Pending** - Conditional tasks awaiting state change (planned, not yet implemented)

**Action Scheduling Workflow:**
1. Click on a spoke to open configuration popup
2. Select "Action(s)" type
3. Add action name → Schedule or Skip → Repeat for more actions
4. Scheduled actions show date/time instead of calendar icon
5. Clicking scheduled action opens reschedule popup with reminder to delete old calendar entry

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
Breakpoints:
- Desktop: Full features, larger chart
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
1. **Expansion can feel cluttered** with many spokes/actions
2. **Percentage normalization** sometimes unintuitive for users
3. **Mobile chart interactions** can be tricky with small slices
4. **Text overflow** on small slices not handled gracefully

## Changelog

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

### Priority 1: Complete Spoke Type System
- **Pending** - Conditional tasks awaiting state change
- State management for pending → action/static transitions

### Priority 2: Expansion Refactor
Replace the "redraw expanded view" approach with:
- Smart hiding of non-relevant slices
- Transform/zoom on selected slice
- Reuse existing DOM elements (no duplication)

### Priority 3: Enhanced Repeating Spokes
- Edit recurrence pattern after creation
- Update/delete recurring calendar events
- Sync recurring event changes from calendar

## Development Notes

### Adding New Features
1. Update **data-model.js** for data structure changes
2. Add UI elements in **index.html** and **styles.css**
3. Add rendering logic in **chart-renderer.js**
4. Add interaction handlers in **ui-controller.js**
5. Wire up in **app.js**
6. Test storage persistence

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
- [ ] Spoke type configuration (static ↔ action ↔ repeating)
- [ ] Action scheduling workflow (add → schedule/skip)
- [ ] Scheduled time display in branch view
- [ ] Scheduled time display in list view
- [ ] Reschedule existing actions
- [ ] Legacy spoke format compatibility
- [ ] Repeating spokes with recurrence picker
- [ ] Recurring events in Google Calendar
- [ ] RRULE in Apple Calendar .ics files
- [ ] 2-way calendar sync (moved/deleted events)

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
