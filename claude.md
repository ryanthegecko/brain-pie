# Brain Pie - Project Documentation

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
- **Storage:** Browser localStorage
- **Styling:** CSS with responsive design
- **No backend/database** - Everything runs client-side

## File Structure

```
brain-pie/
├── index.html           # Main HTML structure, overlays, and modals
├── styles.css           # All styling including responsive breakpoints
├── app.js               # Main application controller and initialization
├── data-model.js        # Data structure management and business logic
├── chart-renderer.js    # D3.js visualization and interactions
├── ui-controller.js     # UI state, overlays, and user interactions
├── storage.js           # localStorage persistence and import/export
└── assets/              # Images and icons
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
- **Import/Export** JSON files
- **Example data** loaded for new users
- **No cloud storage** - complete privacy

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
3. **Calendar sync is one-way** - Creating events only, no reading back
4. **No recurring events** support yet
5. **Single document model** - Can't have multiple "pies"

### Known Behaviors
1. **Expansion can feel cluttered** with many spokes/actions
2. **Percentage normalization** sometimes unintuitive for users
3. **Mobile chart interactions** can be tricky with small slices
4. **Text overflow** on small slices not handled gracefully

## Recently Implemented

### Spoke Type System (v1.1)
- ✅ Static and Action spoke types
- ✅ Spoke configuration popup
- ✅ Sequential action scheduling workflow (add → schedule/skip)
- ✅ Visual indicators for spoke types and action counts
- ✅ Scheduled time display in branch view and list view
- ✅ Reschedule functionality with reminder about old calendar entries
- ✅ Backward compatibility with legacy string-based spokes

## Planned Features (Next Steps)

### Priority 1: Complete Spoke Type System
Remaining spoke types to implement:
- **Repeating** - Recurring tasks with calendar integration
- **Pending** - Conditional tasks awaiting state change
- State management for pending → action/static transitions

### Priority 2: Expansion Refactor
Replace the "redraw expanded view" approach with:
- Smart hiding of non-relevant slices
- Transform/zoom on selected slice
- Reuse existing DOM elements (no duplication)
- Better performance and maintainability

### Priority 3: Two-Way Calendar Sync
- Store calendar event IDs with actions
- Detect existing events
- Allow editing existing events vs creating new
- Handle event updates and deletions

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

### Testing Checklist
- [ ] Add/edit/delete at each level
- [ ] Drag-and-drop reordering
- [ ] Percentage adjustments
- [ ] Import/export data
- [ ] Calendar integration
- [ ] Responsive behavior
- [ ] localStorage persistence
- [ ] Example data for new users
- [ ] Spoke type configuration (static ↔ action)
- [ ] Action scheduling workflow (add → schedule/skip)
- [ ] Scheduled time display in branch view
- [ ] Scheduled time display in list view
- [ ] Reschedule existing actions
- [ ] Legacy spoke format compatibility

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
- ✓ No data sent to servers
- ✓ No tracking or analytics
- ✓ No cookies
- ✓ No user accounts
- ✓ All data stored locally in browser
- ⚠️ Users responsible for their own data backups
- ⚠️ Clearing browser data will delete all content

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

**Last Updated:** February 2026
**Current Version:** 1.1 (spoke-types-basic)
