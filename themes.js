/**
 * Schedule pill colour themes.
 *
 * Each theme defines seven colour tokens used by schedule urgency pills:
 *   past          — overdue items (background + border)
 *   today         — due today (background)
 *   tomorrow      — due tomorrow (background)
 *   tomorrowText  — text colour inside a tomorrow pill (contrast varies: black on yellow, white on teal)
 *   base          — any scheduled item with no urgency signal (background)
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
        base:          '#0077BB',  // blue — safe for all CVD types
        defaultBorder: '#aaa',
        list:          '#2196F3',  // blue — safe for CVD; distinct from urgency spectrum
    },
};

// ── Change this to switch the active theme ─────────────────────────────────
const ACTIVE_THEME = 'colourblind';
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
    root.style.setProperty('--sched-color-base',           theme.base);
    root.style.setProperty('--sched-color-default-border', theme.defaultBorder);
    root.style.setProperty('--sched-color-list',           theme.list);
}

applyTheme(ACTIVE_THEME);
