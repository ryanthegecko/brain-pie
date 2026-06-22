# BrainPie — Agent Integration Guide

This guide is written for AI agents arriving cold at brainpie.app or at a repo that uses it. It covers everything needed to read, write, and maintain BrainPie data programmatically, plus a section of improvement suggestions for the developer.

---

## 1. What BrainPie Is

BrainPie is a privacy-first visual task manager that displays work as a layered pie chart. The user sees a set of coloured wedges (categories) each subdivided into inner spokes (items), which in turn carry individual task lines (subItems). Data lives entirely in the user's browser by default, with optional sync to a local JSON file or Firebase. There is no server-side API, no accounts, and no network requests unless cloud features are explicitly enabled. Agents interact with it purely through the JSON data file — either on disk (file mode) or via Firebase REST (cloud mode).

---

## 2. Storage Modes

### Detecting which mode is active

Check `context/about.md` → `## Brain Pie` → `Sync mode:`:

```
Sync mode: file      → local file mode (default at work)
Sync mode: firebase  → Firebase cloud mode
```

### File mode (local)

BrainPie uses the browser File System Access API to hold `context/brainpie.json` open. When an agent writes to that file, BrainPie picks up the change immediately — no reload needed.

**Agent action:** Read and write `context/brainpie.json` directly. No network calls required.

```bash
# Read
cat context/brainpie.json | python3 -m json.tool

# Write (update lastModified first — see §5)
python3 -c "
import json, time
with open('context/brainpie.json') as f:
    data = json.load(f)
# ... make changes ...
pie_id = data['meta']['activePieId']
data['pies'][pie_id]['lastModified'] = int(time.time() * 1000)
with open('context/brainpie.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
"
```

### Firebase mode (cloud)

BrainPie syncs to a Firebase Realtime Database. `context/brainpie.json` is kept as a local cache — always update it after a Firebase read.

Firebase credentials live in `context/about.md` → `## Brain Pie`. See §10 for full REST API reference.

---

## 3. Full Data Structure

### Top level

```json
{
  "meta": { ... },
  "pies": { "<pieId>": { ... } },
  "priorities": { "<pieId>": [ ... ] }
}
```

| Field | Type | Description |
|---|---|---|
| `meta` | object | Metadata about which pies exist and which is active |
| `pies` | object | Keyed by pie ID; contains the full pie data |
| `priorities` | object | Keyed by pie ID; ordered priority list for the active pie |

### `meta`

```json
{
  "pieIds": ["pie-1779793204736"],
  "pieNames": { "pie-1779793204736": "Work" },
  "activePieId": "pie-1779793204736",
  "tombstonedPieIds": []
}
```

| Field | Description |
|---|---|
| `pieIds` | Ordered list of all pie IDs |
| `pieNames` | Display name per pie ID |
| `activePieId` | The pie currently shown in the app |
| `tombstonedPieIds` | Pies marked as deleted but not yet purged |

### Pie object

```json
{
  "id": "pie-1779793204736",
  "name": "Work",
  "lastModified": 1782125951927,
  "categories": [ ... ],
  "categoryPercentageOverrides": {
    "qvc-1781093699600": 30,
    "smf-1781093699601": 30,
    "apac-1781093699601": 20,
    "elastic-1781093699601": 12,
    "shopify-1781093699601": 8,
    "pipeline-8b54582a": 5
  }
}
```

| Field | Description |
|---|---|
| `id` | Matches the key in `pies` |
| `name` | Display name |
| `lastModified` | Epoch ms — **must be updated on every write** so the app knows the data is fresh |
| `categories` | Array of category objects (the outer wedges of the pie) |
| `categoryPercentageOverrides` | Optional map of category ID → percentage of the pie. Categories absent from this map split the remaining percentage equally. |

### Category object

```json
{
  "id": "qvc-1781093699600",
  "name": "QVC",
  "color": "#D97706",
  "items": [ ... ]
}
```

| Field | Description |
|---|---|
| `id` | Unique string. Convention: `<semantic-slug>-<timestamp>` or UUID |
| `name` | Displayed as the category label on the pie |
| `color` | Hex colour for the outer ring segment |
| `items` | Array of item (spoke) objects within this category |

### Item (spoke) object

```json
{
  "id": "1781093699601-yt0go0a3x",
  "name": "Plugin Updates",
  "color": "#F59E0B",
  "percentage": 56.25,
  "subItems": [ ... ]
}
```

| Field | Description |
|---|---|
| `id` | Unique string. Convention: `<timestamp>-<random8chars>` or UUID |
| `name` | Displayed as the spoke/wedge label (2–5 words max) |
| `color` | Hex colour for this wedge |
| `percentage` | Share of the category's pie segment occupied by this item. Values across all items in a category should sum to ~100. The app normalises them — if they don't sum to 100 the app redistributes proportionally. |
| `subItems` | Array of task/action objects. May be empty `[]`. |

### SubItem object (task/action)

```json
{
  "text": "Anonymous page access",
  "type": "static",
  "notes": null,
  "children": [],
  "scheduled": null,
  "metadata": {
    "condition": null,
    "calendarEventId": null,
    "nextState": null,
    "recurrence": null
  }
}
```

| Field | Type | Description |
|---|---|---|
| `text` | string | The task label shown in the app |
| `type` | string | One of `static`, `single`, `repeating`, `list` — see below |
| `notes` | string \| null | Optional freetext notes attached to the task |
| `children` | array | Only populated for `list` type — see child object below |
| `scheduled` | object \| null | Date info — see scheduled object below |
| `metadata.condition` | null | Reserved for future conditional logic (always null in current data) |
| `metadata.calendarEventId` | string \| null | Google/Apple Calendar event ID if synced |
| `metadata.nextState` | null | Reserved for future state machine use (always null in current data) |
| `metadata.recurrence` | object \| null | Recurrence rule for `repeating` type |

### Scheduled object

```json
{ "allDay": true, "date": "2026-06-30" }
```

| Field | Description |
|---|---|
| `allDay` | Boolean. `true` for date-only tasks (no time component) |
| `date` | ISO 8601 date string `YYYY-MM-DD` |

### Spoke types

| Type | When to use | `scheduled` | `children` |
|---|---|---|---|
| `static` | Standing task with no deadline — the default | `null` | `[]` |
| `single` | One-off event or deadline on a specific date | Required | `[]` |
| `repeating` | Recurring task (daily, weekly, monthly, etc.) | Required | `[]` |
| `list` | Multi-step task with named sub-steps | Optional | Array of child objects |

### Child object (inside `list` subItems)

Children of a `list` spoke have a **different structure** from subItems — no `type`, no `metadata` wrapper:

```json
{
  "text": "Ask Andy: does Archie need APAC-specific content?",
  "children": [],
  "completed": false,
  "scheduled": null,
  "recurrence": null
}
```

| Field | Description |
|---|---|
| `text` | Step label |
| `children` | Always `[]` (no further nesting) |
| `completed` | Boolean — whether this step is ticked off |
| `scheduled` | Date object or null — same format as subItem scheduled |
| `recurrence` | Recurrence rule or null — note: this is a **direct field**, not nested inside `metadata` |

### Priorities

```json
{
  "pie-1779793204736": [
    { "categoryId": "qvc-1781093699600", "itemId": "1781093699601-yt0go0a3x", "type": "slice" },
    { "categoryId": "smf-1781093699601", "itemId": "1781093699601-ook3ptp3j", "type": "spoke", "spokeIndex": 0 }
  ]
}
```

| Field | Description |
|---|---|
| `categoryId` | ID of the category (outer ring segment) |
| `itemId` | ID of the item (spoke/wedge) within that category |
| `type` | `"slice"` = the whole spoke is prioritised; `"spoke"` = a specific subItem within the spoke |
| `spokeIndex` | 0-based index of the subItem within `subItems[]`. Only present when `type: "spoke"` |

⚠️ **`spokeIndex` drift warning:** `spokeIndex` is positional. If subItems are reordered in the pie (by the user or by an agent), the index silently points to the wrong task. When adding or removing subItems, check whether any priority entries reference that spoke and update their `spokeIndex` accordingly.

---

## 4. Reading the Pie

### File mode

```python
import json

with open('context/brainpie.json') as f:
    data = json.load(f)

meta = data['meta']
active_pie_id = meta['activePieId']
pie = data['pies'][active_pie_id]
categories = pie['categories']
priorities = data.get('priorities', {}).get(active_pie_id, [])
```

### Firebase mode

```bash
DB="https://ryan-atlas-brainpie-default-rtdb.europe-west1.firebasedatabase.app"
PROJ="ryan-atlas-brainpie"
FUID="FUID_REDACTED"  # ⚠️ Use FUID not UID (UID is a reserved shell variable)
SECRET="SECRET_REDACTED"

# Get active pie ID
curl -s "${DB}/brainpie/${PROJ}/users/${FUID}/meta.json?auth=${SECRET}"

# Read pie (substitute actual pie ID)
PIE_ID="pie-1779793204736"
curl -s "${DB}/brainpie/${PROJ}/users/${FUID}/pies/${PIE_ID}.json?auth=${SECRET}"

# Read priorities
curl -s "${DB}/brainpie/${PROJ}/users/${FUID}/priorities/${PIE_ID}.json?auth=${SECRET}"
```

After any Firebase read, write the result back to `context/brainpie.json` to keep the local cache current.

---

## 5. Writing the Pie

**Always read before writing.** Never reconstruct from scratch — the user may have made changes in the app that aren't in your context.

**Always update `lastModified`** to the current epoch ms before writing. BrainPie uses this to detect that the file has changed.

### File mode

```python
import json, time

with open('context/brainpie.json') as f:
    data = json.load(f)

pie_id = data['meta']['activePieId']
pie = data['pies'][pie_id]

# --- make your changes to pie ---

pie['lastModified'] = int(time.time() * 1000)
data['pies'][pie_id] = pie

with open('context/brainpie.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
```

BrainPie holds the file handle open and picks up the write immediately.

### Firebase mode

```bash
# Write pie (PUT replaces the full blob)
curl -s -X PUT "${DB}/brainpie/${PROJ}/users/${FUID}/pies/${PIE_ID}.json?auth=${SECRET}" \
  -H "Content-Type: application/json" \
  -d '<updated pie JSON with new lastModified>'

# Write priorities
curl -s -X PUT "${DB}/brainpie/${PROJ}/users/${FUID}/priorities/${PIE_ID}.json?auth=${SECRET}" \
  -H "Content-Type: application/json" \
  -d '<priority array JSON>'
```

After writing to Firebase, also write the updated data back to `context/brainpie.json`.

---

## 6. Adding a New Spoke (Item)

A "spoke" is an `item` entry inside a `category.items[]` array.

### Step 1 — Generate a UUID

```bash
python3 -c "import uuid; print(uuid.uuid4())"
# e.g. 99038772-30e7-4091-aae0-988269769322
```

### Step 2 — Build the item object

**Static spoke** (no deadline, standing task):
```json
{
  "id": "<generated-uuid>",
  "name": "Chase DNS update",
  "color": "#10B981",
  "percentage": 25,
  "subItems": [
    {
      "text": "Ask Andy about bfcminsights.com DNS",
      "type": "static",
      "notes": null,
      "children": [],
      "scheduled": null,
      "metadata": {
        "condition": null,
        "calendarEventId": null,
        "nextState": null,
        "recurrence": null
      }
    }
  ]
}
```

**Single (dated) spoke** (one-off event):
```json
{
  "id": "<generated-uuid>",
  "name": "Thomas Work Experience",
  "color": "#A78BFA",
  "percentage": 33,
  "subItems": [
    {
      "text": "In office Tue 30 Jun–Thu 2 Jul",
      "type": "single",
      "notes": null,
      "children": [],
      "scheduled": { "allDay": true, "date": "2026-06-30" },
      "metadata": {
        "condition": null,
        "calendarEventId": null,
        "nextState": null,
        "recurrence": null
      }
    }
  ]
}
```

**List spoke** (multi-step task):
```json
{
  "id": "<generated-uuid>",
  "name": "Deploy checklist",
  "color": "#6366F1",
  "percentage": 25,
  "subItems": [
    {
      "text": "Run Playwright tests",
      "type": "list",
      "notes": null,
      "children": [
        { "text": "npm test passes locally", "children": [], "completed": false, "scheduled": null, "recurrence": null },
        { "text": "Staging deploy verified", "children": [], "completed": false, "scheduled": null, "recurrence": null }
      ],
      "scheduled": null,
      "metadata": {
        "condition": null,
        "calendarEventId": null,
        "nextState": null,
        "recurrence": null
      }
    }
  ]
}
```

### Step 3 — Insert and adjust percentages

Append the new item to the target `category.items[]` array. Existing `percentage` values are preserved. The new item gets a reasonable starting value (e.g. 25–33). The app normalises percentages on render, so they don't need to sum to exactly 100 — but keep them in the right ballpark.

### Step 4 — Write back (update `lastModified`)

---

## 7. Adding a New Category (Slice)

A category is a top-level entry in `pie.categories[]`.

```json
{
  "id": "internal-<timestamp>",
  "name": "Internal",
  "color": "#6366F1",
  "items": []
}
```

ID convention: `<semantic-slug>-<epoch-ms>` (e.g. `internal-1782125951927`). UUIDs are also acceptable.

After adding the category, add its share to `categoryPercentageOverrides`:

```json
"categoryPercentageOverrides": {
  "existing-cat-id": 30,
  "new-cat-id": 10
}
```

Categories absent from `categoryPercentageOverrides` share the remaining percentage equally. If all categories are listed, the values should sum to 100.

---

## 8. Removing a Spoke

1. Remove the item object from `category.items[]`.
2. Check `priorities[pieId]` — remove any entry whose `itemId` matches the deleted item.
3. Do **not** re-add a spoke that's absent from the pie — absence means the user deleted it intentionally. Only add new spokes for tasks that genuinely did not exist before.
4. Log the removal in the relevant project context file under `## Recent changes`:
   ```
   - 2026-06-22 Deleted: "Plugin Updates" from QVC slice
   ```

---

## 9. Priorities

The `priorities` object maps pie IDs to ordered arrays. The order of the array is the display order in the app's priority panel.

```json
"priorities": {
  "pie-1779793204736": [
    { "categoryId": "smf-1781093699601", "itemId": "1781093699601-ook3ptp3j", "type": "slice" },
    { "categoryId": "elastic-1781093699601", "itemId": "1781093699601-3llxperg6", "type": "spoke", "spokeIndex": 0 }
  ]
}
```

- `type: "slice"` — the whole spoke (item) is highlighted as a priority; omit `spokeIndex`
- `type: "spoke"` — a specific subItem within the spoke is highlighted; include `spokeIndex` (0-based position in `subItems[]`)

**To add a priority:** append an entry to the array.
**To remove a priority:** splice the entry out.
**To reorder:** reorder the array elements.

⚠️ `spokeIndex` drift: if subItems are reordered or a new subItem is inserted before the indexed position, update all affected `spokeIndex` values. Failing to do so silently highlights the wrong task.

---

## 10. Firebase REST API Reference

⚠️ **Use `FUID`, not `UID`.** `UID` is a reserved shell variable on most Unix systems and will cause "operation not permitted" errors. Always assign the Firebase UID to `FUID`.

```bash
DB="https://ryan-atlas-brainpie-default-rtdb.europe-west1.firebasedatabase.app"
PROJ="ryan-atlas-brainpie"
FUID="FUID_REDACTED"
SECRET="SECRET_REDACTED"
PIE_ID="pie-1779793204736"
```

| Operation | Method | URL | Headers |
|---|---|---|---|
| Read meta | GET | `${DB}/brainpie/${PROJ}/users/${FUID}/meta.json?auth=${SECRET}` | — |
| Read pie | GET | `${DB}/brainpie/${PROJ}/users/${FUID}/pies/${PIE_ID}.json?auth=${SECRET}` | — |
| Write pie | PUT | `${DB}/brainpie/${PROJ}/users/${FUID}/pies/${PIE_ID}.json?auth=${SECRET}` | `Content-Type: application/json` |
| Read priorities | GET | `${DB}/brainpie/${PROJ}/users/${FUID}/priorities/${PIE_ID}.json?auth=${SECRET}` | — |
| Write priorities | PUT | `${DB}/brainpie/${PROJ}/users/${FUID}/priorities/${PIE_ID}.json?auth=${SECRET}` | `Content-Type: application/json` |

PUT replaces the full blob at that path. There is no PATCH endpoint — always read first, modify in memory, then PUT the full object.

---

## 11. Gaps and Improvement Suggestions for the Developer

These are issues noticed during analysis of the live data and the agent command spec. They are offered constructively for the BrainPie developer to consider.

### 11.1 No schema version field

There is no `version` or `schemaVersion` in the JSON root or in pie objects. If the data format evolves (new fields, renamed keys, structural changes), agents and importers have no way to detect which version they're working with. A `"schemaVersion": 2` at the top level would solve this.

### 11.2 Terminology mismatch between UI and JSON

The app UI (and its marketing copy) describes a 4-layer hierarchy: Categories → Slices → Spokes → Actions. The JSON uses `categories → items → subItems`. The Atlas command spec uses "slice" and "spoke" inconsistently with JSON key names. An authoritative terminology map in the docs (or a comment block in the schema) would prevent agents and developers from talking past each other.

Suggested canonical mapping:
- UI "Category" = JSON `categories[]` = Atlas "slice"
- UI "Slice/Spoke" = JSON `categories[].items[]` = Atlas "spoke/item"
- UI "Action" = JSON `categories[].items[].subItems[]` = Atlas "subItem/task"

### 11.3 Inconsistent child vs subItem structure

SubItems of type `list` have a `children[]` array. Each child has `{ text, children, completed, scheduled, recurrence }`. However, top-level subItems have `{ text, type, notes, children, scheduled, metadata: { ..., recurrence } }`. The child format:
- Has no `type` field
- Has no `notes` field
- Has `recurrence` as a direct field rather than inside a `metadata` wrapper

This means agents must handle two different object shapes depending on nesting depth. A unified structure (or explicit documentation that children are intentionally simpler) would reduce error surface.

### 11.4 `metadata.condition` and `metadata.nextState` are undocumented

Both fields are present in every subItem and always `null` in the live data. Their intended purpose is unclear. If they're reserved for future features, a comment or stub in the schema would help agents know not to worry about them (vs. accidentally overlooking them when they become meaningful).

### 11.5 ID format inconsistency

Three different ID conventions appear in the live data:
- `qvc-1781093699600` — semantic prefix + epoch ms
- `1781093699601-yt0go0a3x` — epoch ms + random suffix
- `99038772-30e7-4091-aae0-988269769322` — standard UUID v4

The agent command doc says "generate a UUID", but the app-generated IDs use the `timestamp-random` format. A single recommended format (preferably UUID v4 for collision safety) would be cleaner.

### 11.6 No way to detect file-vs-Firebase mode from the JSON itself

The sync mode is stored in `context/about.md`, which is an Atlas-specific convention. The JSON file itself contains no indicator of which storage mode is active. An agent that only has the JSON file (no `about.md`) cannot determine where writes should go. A `"storageMode": "file"` field in `meta` would make this self-documenting.

### 11.7 `categoryPercentageOverrides` behaviour when absent

It is not documented what happens to categories absent from `categoryPercentageOverrides`. Based on observed data (the `uk-*` and `internal-*` categories are absent from overrides but still render), they appear to split the unallocated percentage equally. Documenting this explicitly — or exposing it as a schema rule — would let agents calculate display percentages accurately without loading the app.

### 11.8 No health check or manifest endpoint

There is no `/.well-known/` endpoint, no `/manifest.json`, and no API endpoint that returns the app version or confirms the data format. An agent integrating a new instance has no way to verify the app is the expected version or that the file it's writing to is being watched. Even a simple `GET /api/status` returning `{ "version": "...", "storageMode": "...", "fileConnected": true }` would help agents self-orient.

### 11.9 `lastModified` only at pie level

There is no `lastModified` at the root `meta` level. An agent reading the file cannot tell from the top-level structure when anything last changed — it must open each pie. A `lastModified` on `meta` (updated whenever any pie changes) would allow a quick freshness check.

### 11.10 `priorities` is `{}` when empty, not `{ "<pieId>": [] }`

When no priorities exist, `priorities` is an empty object `{}`. Agents must handle both `data.priorities[pieId]` returning `undefined` (empty) and an actual array. Using `.get('priorities', {}).get(active_pie_id, [])` guards against this, but it's worth documenting explicitly, and the schema could standardise on always initialising the pie key as an empty array.
