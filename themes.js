/**
 * Schedule pill colour themes.
 *
 * Each theme defines eight colour tokens used by schedule urgency pills:
 *   past          — overdue items (background + border)
 *   today         — due today (background)
 *   tomorrow      — due tomorrow (background)
 *   tomorrowText  — text colour inside a tomorrow pill (contrast varies: black on yellow, white on teal)
 *   week          — scheduled this week (2–7 days away); distinct from far-future base
 *   base          — far-future scheduled item with no urgency signal (background)
 *   defaultBorder — default scheduled item border (the subtle ring on a base-coloured pill)
 *   list          — list-type or unscheduled spoke indicator pill (blue — visually distinct from urgency states)
 *
 * Border convention: each state uses the next-more-urgent state's colour as its
 * border, so the gradient reads: base → week → tomorrow → today → past.
 *
 * To switch themes, change ACTIVE_THEME below.
 * To add a third theme, add a new key to Themes and point ACTIVE_THEME at it.
 */

const Themes = {
    // Original Material-Design traffic-light palette
    default: {
        past:          '#D32F2F',  // red
        today:         '#F57C00',  // orange
        tomorrow:      '#FFEB3B',  // yellow — light, needs dark text
        tomorrowText:  '#000000',  // black — readable on yellow
        week:          '#4CAF50',  // green — same as base; no visual change in this theme
        base:          '#4CAF50',  // green
        defaultBorder: '#fff',
        list:          '#2196F3',  // blue — list type / unscheduled spoke
    },

    // Colourblind-friendly palette (safe for deuteranopia / protanopia).
    // Uses the Bang Wong / Paul Tol set: no red-green confusion.
    colourblind: {
        past:          '#CC3311',  // vermillion — distinct from orange even without hue
        today:         '#EE7733',  // orange (warm, not red)
        tomorrow:      '#009988',  // teal — unambiguous against orange; dark enough for white text
        tomorrowText:  '#ffffff',  // white — readable on dark teal
        week:          '#0077BB',  // blue — same as base; no visual change in this theme
        base:          '#0077BB',  // blue — safe for all CVD types
        defaultBorder: '#aaa',
        list:          '#2196F3',  // blue — safe for CVD; distinct from urgency spectrum
    },

    // Inverse urgency palette: red = scheduled / coming (attention), green = here / done (relax).
    //
    // Token → border role reminder (each state's border uses the next-more-urgent token):
    //   base pill border      → defaultBorder
    //   this-week pill border → tomorrow  (orange on red — "approaching")
    //   tomorrow pill border  → today     (deep green on orange — readable contrast)
    //   today/past pill border → past     (green-on-green, subtle — no alarm needed)
    //
    // Note: "this week" gets its own orange fill (--sched-color-week) so it's distinct from
    // the far-future red (--sched-color-base). The orange border on this-week pills is kept
    // for the proximity signal even though fill and border now share the same hue.
    inverse: {
        past:          '#4CAF50',  // green — it happened / it's here; relax
        today:         '#388E3C',  // deeper green — "it's today, green means go"
        tomorrow:      '#FFEB3B',  // yellow — coming tomorrow; same as default
        tomorrowText:  '#000000',  // black — readable contrast on yellow
        week:          '#EE7733',  // orange — this week; approaching but not imminent
        base:          '#D32F2F',  // red — far-future scheduled; attention required
        defaultBorder: '#aaa',     // neutral ring on far-future base pills
        list:          '#2196F3',  // blue — list type / unscheduled spoke (unchanged)
    },
};

// ── Change this to switch the active theme ─────────────────────────────────
const ACTIVE_THEME = 'inverse';
// ───────────────────────────────────────────────────────────────────────────

/**
 * Write the active theme's colours as CSS custom properties on :root.
 * Called immediately so pills render correctly on first paint.
 */
function applyTheme(themeName) {
    const theme = Themes[themeName] || Themes.default;
    const root = document.documentElement;
    root.style.setProperty('--sched-color-past',           theme.past);
    root.style.setProperty('--sched-color-today',          theme.today);
    root.style.setProperty('--sched-color-tomorrow',       theme.tomorrow);
    root.style.setProperty('--sched-color-tomorrow-text',  theme.tomorrowText);
    root.style.setProperty('--sched-color-week',           theme.week);
    root.style.setProperty('--sched-color-base',           theme.base);
    root.style.setProperty('--sched-color-default-border', theme.defaultBorder);
    root.style.setProperty('--sched-color-list',           theme.list);
}

applyTheme(ACTIVE_THEME);
