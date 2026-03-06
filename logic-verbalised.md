# Brain Pie — Load / Config / Sync Logic Verbalized

_Covers initialization, data loading, Firebase config, sign-in, and sync.
Does not cover editing categories/slices/spokes unless relevant to saving._

---

## Entry Point: Every Page Load

**1.** Browser loads the page. `App.init()` starts.

**2.** `StorageAdapter.init()` runs. It checks `cloudSyncEnabled` in localStorage.
- If `cloudSyncEnabled = 'true'` → go to **[A] Auto-Firebase Init**
- If not set or false → go to **3**

**3.** Check if the URL has a `?config=` parameter.
- If yes → `currentMode = 'local'` for now (Firebase config is parsed, but not acted on until `App.init()` handles it below) → go to **[B] Config URL, First Encounter**
- If no → `currentMode = 'local'` → go to **[C] Load Data (Local)**

---

## [A] Auto-Firebase Init
_`cloudSyncEnabled = 'true'` was in localStorage from a previous session._

**A1.** Try to read Firebase config, first from the URL `?config=` param, then from localStorage (`brainPieFirebaseConfig`).
- If config found → initialize Firebase SDK → register `onAuthStateChanged` listener → continue to **A3**
- If no config found anywhere → fall back to local mode → go to **[C] Load Data (Local)**

**A2.** `StorageAdapter.init()` returns. Mode is still `'local'` — Firebase auth hasn't resolved yet.

**A3.** Back in `App.init()`: check URL for `?config=` again.
- If URL has `?config=` → call `StorageAdapter.enableCloudSync(urlConfig)`. Since the auth listener from A1 is already registered, this is effectively a config-refresh only. Mode stays `'local'`.
- If no URL config → continue.

**A4.** Call `DataModel.loadFromStorageOrExample()`.
- If URL has `?config=` → go to **[D] Config URL Data Load** (blank holding state)
- If no URL config → go to **[C] Load Data (Local)** (loads from localStorage backup immediately)

**A5.** App renders. If loading from localStorage backup (no URL config), user sees their cached data right away.

**A6.** Auth callback fires asynchronously (usually sub-second, from Firebase's cached token).
- If user is signed in → `currentMode = 'firebase'` → go to **[E] syncOnConnect**
- If not signed in → mode stays `'local'` → if URL had `?config=`, go to **[F] Sign-In Banner**

---

## [B] Config URL, First Encounter
_`cloudSyncEnabled` was false. User has opened a Firebase config URL for the first time in this browser._

**B1.** `StorageAdapter.init()` already ran in local mode. Now `App.init()` detects `?config=` in the URL.

**B2.** `FirebaseAdapter.init(urlConfig)` — Firebase SDK initialized.

**B3.** `StorageAdapter.enableCloudSync(urlConfig)` — config saved to localStorage, `cloudSyncEnabled = 'true'` written to localStorage, `onAuthStateChanged` listener registered.
- `FirebaseAdapter.isConnected()` is false (auth not resolved yet) → mode stays `'local'`.

**B4.** `DataModel.loadFromStorageOrExample()` → go to **[D] Config URL Data Load**

**B5.** App renders blank/empty chart.

**B6.** Auth callback fires.
- If user is already signed in (Google session active) → `currentMode = 'firebase'` → go to **[E] syncOnConnect**
- If not signed in → go to **[F] Sign-In Banner**

---

## [C] Load Data (Local)
_No Firebase, or Firebase is configured but the URL has no `?config=` param._

**C1.** `DataModel.loadFromStorageOrExample()` runs. URL has no `?config=`, so the early-return guard is skipped.

**C2.** Load pie meta from localStorage (`brainPie_meta` key).
- If meta found with a valid `activePieId` → go to **C3**
- If no meta → go to **C4**

**C3.** Load the active pie from localStorage (`brainPie_pie_{id}` key).
- If pie data found with categories → load into memory → go to **C7**
- If pie data missing or empty → fall through to **C4**

**C4.** Try legacy single-blob format: look for old `brainPieChartData` key.
- If found with categories → load it, auto-migrate to multi-pie format (generate new pie ID, write meta + pie to localStorage) → go to **C7**
- If not found → go to **C5**

**C5.** No data found anywhere. URL has no `?config=` → go to **C6**.

**C6.** First-time user in local mode. Generate a new pie ID. Load the built-in example data (Home, Health, Learning, Social). Write meta and pie to localStorage.

**C7.** Data is in memory. App renders.
- If `brainPieTutorialCompleted` is NOT in localStorage → go to **[G] Tutorial** (fires after 500ms delay)
- If tutorial already completed → done, render silently

---

## [D] Config URL Data Load
_URL has `?config=`. Firebase is configured but auth hasn't resolved yet._

**D1.** `DataModel.loadFromStorageOrExample()` detects `?config=` at the very top of the function.

**D2.** Sets in-memory state to empty: `categories = []`, `pieMeta = { pieIds: [], activePieId: null }`. Does NOT touch localStorage or Firebase.

**D3.** Returns immediately. App is in a blank holding state, waiting for Firebase auth to deliver real data via **[E] syncOnConnect**.

> _This guard runs before localStorage is read, so a sibling tab that loaded the base URL and wrote example data to localStorage cannot contaminate this session._

---

## [E] syncOnConnect
_Firebase has confirmed the user is signed in (auto-auth on page load). This is the primary "load from Firebase" path._

**E1.** `syncOnConnect()` begins. Real-time listener callbacks are suppressed during this load (`_isSyncingMeta = true`, `_isSyncingData = true`) to prevent race conditions.

**E2.** Load Firebase meta from `brainpie/{projectId}/meta`.
- If meta found → go to **E4**
- If not found → go to **E3**

**E3.** Try migrating old single-blob Firebase format from `brainpie/{projectId}/data/`.
- If old data exists with categories → create meta + pie node in Firebase from it, delete old path, return the new meta → go to **E4**
- If nothing found → Firebase is entirely empty → skip to **E9**

**E4.** Meta loaded. Extract `pieIds` list and `pieNames` map.

**E5.** Determine which pie to show as active.
- Read `DataModel.getActivePieId()`: checks in-memory `pieMeta.activePieId`, then `brainPie_activePieId` in localStorage.
- If that ID is valid (exists in Firebase's `pieIds`) → use it
- If not valid or null (e.g. because **[D]** set pieMeta to empty) → default to `pieIds[0]`

> _Note: `pushLocalOnlyPies` is intentionally NOT called here. On auto-connect, Firebase is the source of truth. Silently pushing local pies on page load risks contaminating Firebase with stale or unrelated data (e.g. example data written by a base-URL sibling tab sharing localStorage). Local-only pies are only pushed in the manual sign-in flow — see **[I] Manual Sign-In**._

**E6.** Write `DataModel.pieMeta` with Firebase's pie list and the resolved active ID. Save meta to localStorage (backup).

**E7.** Load active pie data from `brainpie/{projectId}/pies/{activePieId}`.
- If pie data has categories → go to **E8**
- If empty or tombstoned (soft-deleted) → loop through remaining pies in `pieIds` as fallbacks.
  - First pie with valid categories becomes the new active pie (update `activePieId` in memory + localStorage).
  - If ALL pies are empty or tombstoned → go to **E9**

**E8.** Populate `DataModel`: categories, percentage overrides, pie name. Normalize spokes. Validate priority list. Write a backup copy to localStorage. Load per-user priorities from `userPriorities/{uid}/{pieId}`. Call `App.render()` — user sees their data.

**E9.** Firebase is empty or all pies are unpopulated. Blank state remains. Nothing is pushed to Firebase. (The next user edit will trigger a save that populates Firebase.)

**E10.** Lift suppression flags. Set up real-time listeners → go to **[H] Real-Time Listeners**.

---

## [F] Sign-In Banner
_Firebase is configured (URL or localStorage) but the user is not signed in._

**F1.** App sits in blank/local state. A one-shot auth listener fires and confirms the user is NOT signed in.

**F2.** The sign-in banner is shown in the UI.

**F3.** User decides:
- Clicks "Sign in with Google" in the banner or via Settings → go to **[I] Manual Sign-In**
- Ignores the banner → app stays in local mode with whatever data loaded (blank if config URL, example data if base URL with fresh browser)

---

## [G] Tutorial
_First-time user in local mode (no `?config=` in URL, `brainPieTutorialCompleted` not set)._

**G1.** Tutorial starts 500ms after page load.

**G2.** Welcome modal. User chooses:
- "Start Tutorial" → go to **G3**
- "Skip, I'll explore" → clear categories, write empty pie to localStorage, mark tutorial complete (`brainPieTutorialCompleted = 'true'`). Done — user has an empty pie.

**G3.** "Life Pie" step. If user has any existing data, it is stashed in localStorage (`brainPieTutorialStash`). The Life Pie example data is loaded into memory and saved to localStorage only — NOT to Firebase, even if Firebase is connected.

**G4.** "Team Pie" step. Team Pie example data loaded into memory, saved to localStorage only.

**G5.** "Calendar Sync" step. User offered Google sign-in for calendar access (this is for calendar, not Firebase sync).
- If signs in → Google OAuth access token obtained → calendar features unlock
- If "Maybe Later" → skip

**G6.** "Health Pie" step. A simpler example pie is loaded. User is guided through adding a slice and a spoke interactively.

**G7.** Tutorial complete. User chooses an exit:
- "Continue With This Pie" → keep Health Pie, mark complete
- "Start Fresh" → clear categories, write empty pie to localStorage, mark complete
- (Pie-specific options like "Use Life Pie" → load that example, mark complete)

**G8.** `brainPieTutorialCompleted = 'true'` written to localStorage. Stash cleaned up. Tutorial will never show again for this browser.

> _If user stashed real data (they had a pie before tutorial started), it is restored if they choose "Continue With This Pie". If they skipped before the stash was written (very fast skip), their existing pie is re-rendered as-is._

---

## [H] Real-Time Listeners
_Set up after `syncOnConnect` completes. Keeps the app live with Firebase changes._

**H1.** `StorageAdapter.setupFirebaseListener()` runs.

**H2.** Subscribe to active pie at `brainpie/{projectId}/pies/{pieId}` via `subscribeToPie()`.
- The database ref object is stored in `currentListenerRef` so it can be correctly unsubscribed later (calling `.off()` on the wrong path is a silent no-op — this must be the exact same ref).
- Firebase immediately fires the callback with current data. If `isSaving` is true, this is ignored (our own save echoing back).

**H3.** Subscribe to per-user priorities at `userPriorities/{uid}/{pieId}`.

**H4.** Subscribe to meta at `brainpie/{projectId}/meta` for team-level changes (pies added/renamed/deleted by other users).

**H5.** When a pie data update arrives from Firebase (another device or user saved):
- If `isSaving` → ignore (our own save)
- If `_isSyncingData` → ignore (mid-sync)
- Guard: if remote data has no content but local has content → reject (prevents accidental blank overwrites)
- Otherwise → update `DataModel.categories`, save backup to localStorage, re-render

**H6.** When a meta update arrives (team member added or deleted a pie, or a pie was tombstoned):
- Update `DataModel.pieMeta` with the new pie list and `tombstonedPieIds`
- Re-render the pie tab bar (tombstoned pies appear greyed/italic)

---

## [I] Manual Sign-In
_User goes through Settings → Cloud Sync to connect Firebase for the first time or re-connect._

**I1.** User opens Settings → Cloud Sync.
- If no Firebase config saved yet: user pastes the config JSON → `UI.connectFirebase()` → Firebase SDK initialized, config saved to localStorage.
- If config already saved: Firebase is already initialized, user just sees the auth buttons.

**I2.** User clicks "Sign in with Google". `StorageAdapter.skipSyncOnConnect = true` is set — this tells the auth listener to skip `syncOnConnect` (because `reloadDataFromFirebase` handles the sync more carefully).

**I3.** Google OAuth popup. User authenticates.

**I4.** Auth callback fires. `skipSyncOnConnect = true` → `syncOnConnect` exits immediately and resets the flag.

**I5.** `UI.updateAuthUI()` runs. First sign-in this session (`_hasReloadedFromFirebase = false`) → calls `UI.reloadDataFromFirebase()`.

**I6.** `_doReloadDataFromFirebase()` runs:
- Load Firebase meta.
- If meta found → go to **I7**
- If no meta → try migrating old format → go to **I7** if found
- If Firebase completely empty → go to **I8**

**I7.** Meta loaded. Run `pushLocalOnlyPies`:
- Compare localStorage pie IDs against Firebase pie IDs.
- For each local pie ID not found in Firebase: load its data from localStorage. If it has real content (at least one category with items), push it to Firebase silently. This handles pies created while offline.
- Default active pie to `pieIds[0]` (first Firebase pie). Load its data from Firebase. Populate `DataModel`. Save localStorage backup. Set up real-time listeners. Render.

**I8.** Firebase is completely empty. User has local data.
- Confirm dialog: "Firebase is empty but you have local data. Upload to cloud or start fresh?"
- If OK (upload): create meta + pie in Firebase from current local `DataModel` state. Set up listeners. Render.
- If Cancel (start fresh): local data stays in memory but is not pushed. Firebase remains empty. Future saves will populate it.

---

## [J] Switching Pies
_User clicks a pie tab._

**J1.** `App.switchPie(targetId)` → `DataModel.switchPie(targetId)`. Guard: if target is already active, do nothing.

**J2.** Save current pie to storage (`saveToStorage()`).
- Firebase mode: write to Firebase AND localStorage backup.
  - Exception: if `categories` is empty and the pie is not already tombstoned → go to **[M] Tombstone Empty Pie** instead of writing. The empty state is written to localStorage only.
- Local mode: write to localStorage only (empty categories written freely — no risk to shared data).

**J3.** Update `activePieId` in memory and localStorage.

**J4.** Load target pie data via `StorageAdapter.loadPie(targetId)`.
- Firebase mode: read from Firebase first; if missing, fall back to localStorage backup.
- Local mode: read from localStorage.

**J5.** Populate `DataModel` with target pie's categories, overrides, name. Normalize spokes.

**J6.** If in Firebase mode: `StorageAdapter.switchPieListeners(targetId)`.
- Call `FirebaseAdapter.unsubscribeFromChanges()` → uses `currentListenerRef` (the exact ref object stored at subscription time) to call `.off()` correctly. Old listener is removed.
- Subscribe to new pie at `pies/{targetId}`. Store new ref in `currentListenerRef`.
- Load per-user priorities for new pie.

**J7.** `App.render()` → new pie renders.

---

## [M] Tombstone Empty Pie
_User has deleted all categories from a pie while in Firebase mode. Rather than writing `categories: []` to Firebase, the pie is tombstoned._

**M1.** `saveToStorage()` detects `categories.length === 0` + Firebase mode + pie not already tombstoned. Calls `_handleEmptyPie(pieId)` (async, fire-and-forget) and returns without touching Firebase.

**M2.** `_handleEmptyPie()` adds the pie ID to `pieMeta.tombstonedPieIds`.

**M3.** Check: are there any remaining active (non-tombstoned) pies?
- If yes → go to **M5**
- If no (this was the last active pie) → go to **M4**

**M4.** Create a fresh replacement pie:
- Generate a new pie ID. Add to `pieIds` and `pieNames` ("My Pie"). Set as active.
- Clear in-memory state (`categories = []`, etc.).
- Save the empty new pie to Firebase directly (bypasses the empty-guard since it's an explicit new-pie creation).
- Continue to **M5**.

**M5.** Save updated meta (with `tombstonedPieIds`) to Firebase via transaction. The transaction union-merges `tombstonedPieIds` with any concurrent remote changes.

**M6.** Re-render tab bar. The tombstoned pie's tab appears greyed and italic with a tooltip: "Empty — data preserved in cloud". The current active pie stays in view.

**M7.** The original pie's data at `pies/{pieId}` in Firebase is **not touched**. It retains whatever categories existed before the user deleted them.

---

## [M-R] Restoring a Tombstoned Pie
_User clicks a greyed pie tab and chooses Restore._

**MR1.** Clicking a tombstoned tab shows a context menu (Restore / Delete). The current active pie remains in view — no switch happens.

**MR2.** User clicks "Restore". `App.restorePie(pieId)` runs.

**MR3.** `DataModel.restorePie(pieId)` removes the pie from `tombstonedPieIds` and saves meta to Firebase. The Firebase data at `pies/{pieId}` was never cleared, so it still holds the original categories.

**MR4.** `App.switchPie(pieId)` → loads pie data from Firebase → original categories restored → re-renders chart and tab bar. Tab is no longer greyed.

---

## [M-D] Explicitly Deleting a Tombstoned Pie
_User clicks a greyed pie tab and chooses Delete._

**MD1.** User clicks "Delete". Confirmation dialog: "Delete [name] and all its data? This cannot be undone."

**MD2.** If confirmed: `App.deletePie(pieId)` → `DataModel.deletePie(pieId)`.
- Removes pie from `pieIds`, `pieNames`, and `tombstonedPieIds` in meta.
- `StorageAdapter.deletePie()` → removes from Firebase meta (transaction) → deletes `pies/{pieId}` node from Firebase. This is the **only path** that removes pie data from Firebase.
- Deletes localStorage backup for this pie.

**MD3.** Meta saved. Tab bar re-renders. Tombstoned tab is gone.

---

## [K] Cross-Tab: Base URL Tab + Config URL Tab
_The scenario that previously caused Firebase data loss. Described here as it now behaves after fixes._

**K1.** Tab A opens the base URL (no `?config=`). Tab B opens the config URL. They share the same localStorage domain.

**K2.** Tab A runs in local mode. `loadFromStorageOrExample()` finds no data, creates example data, writes it to localStorage (`brainPie_meta` with a new pie ID, `brainPie_pie_{id}` with example categories, `brainPie_activePieId`).

**K3.** Tab B's `loadFromStorageOrExample()` detects `?config=` at the very top → sets empty state → returns without reading localStorage at all. Tab A's data is never loaded.

**K4.** Tab B auth fires → `syncOnConnect()` → loads Firebase meta → loads real Firebase pie → renders correctly.

**K5.** `syncOnConnect()` does not call `pushLocalOnlyPies`, so Tab A's localStorage data is never pushed to Firebase.

**K6.** Result: Tab B shows real Firebase data. Tab A shows example data in local mode only. Firebase is untouched.

---

## [L] Multi-Tab: Two Tabs, Same Config URL
_Normal collaboration scenario._

**L1.** Both tabs load with the same `?config=`. Both detect it and skip localStorage (see **[D]**).

**L2.** Both tabs' auth callbacks fire. Both run `syncOnConnect()` independently.

**L3.** Both load the same Firebase meta and same active pie. Both render the same data.

**L4.** Both subscribe to real-time listeners on the same active pie node.

**L5.** When one tab saves a change → Firebase fires the real-time callback in the other tab → the other tab re-renders with the new data. The saving tab ignores its own update via the `isSaving` flag (set for 1 second after each save).

---

## localStorage Keys Reference

| Key | What it holds |
|-----|---------------|
| `cloudSyncEnabled` | `'true'` if Firebase was ever configured in this browser |
| `brainPieFirebaseConfig` | Saved Firebase config JSON |
| `brainPie_meta` | `{ pieIds, pieNames, tombstonedPieIds }` — the list of pies, their names, and which are tombstoned |
| `brainPie_activePieId` | Which pie tab the user last had open (per-device, not synced) |
| `brainPie_pie_{id}` | Full pie data backup (categories, overrides, priorities) |
| `brainPieTutorialCompleted` | `'true'` when tutorial is done |
| `brainPieTutorialStep` | Saved step index if tutorial was interrupted |
| `brainPieTutorialStash` | User's real data, temporarily stored while tutorial example pies are showing |
| `brainPieCalendarToken` | Google OAuth token for calendar access |
| `calendarProvider` | `'google'` or `'apple'` |

---

## Firebase Path Reference

```
brainpie/{projectId}/
├── meta                              ← shared: { pieIds, pieNames, tombstonedPieIds }
├── pies/
│   └── {pieId}                       ← shared: { id, name, categories, categoryPercentageOverrides }
└── userPriorities/
    └── {uid}/
        └── {pieId}                   ← per-user per-pie: [ priorityRef, ... ]
```

_Legacy path (pre-v0.16): `brainpie/{projectId}/data/` — migrated to multi-pie format on first load._
