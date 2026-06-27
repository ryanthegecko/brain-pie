/**
 * Schedule pill colour themes.
 *
 * Each theme defines eight colour tokens used by schedule urgency pills:
 *   past           — overdue items (background + border)
 *   pastBorder     — border colour on past pills
 *   today          — due today (background)
 *   todayBorder    — border colour on today pills
 *   tomorrow       — due tomorrow (background)
 *   tomorrowBorder — border colour on tomorrow pills
 *   tomorrowText   — text colour inside a tomorrow pill (contrast varies: black on yellow, white on teal)
 *   week           — scheduled this week (2–7 days away); distinct from far-future base
 *   weekBorder     — border colour on this-week pills
 *   base           — far-future scheduled item with no urgency signal (background)
 *   defaultBorder  — default scheduled item border (the subtle ring on a base-coloured pill)
 *   list           — list-type or unscheduled spoke indicator pill (blue — visually distinct from urgency states)
 *
 * Border convention: each state uses the next-more-urgent state's colour as its
 * border, so the gradient reads: base → week → tomorrow → today → past.
 *
 * To switch themes, change ACTIVE_THEME below.
 * To add a third theme, add a new key to Themes and point ACTIVE_THEME at it.
 */

const Themes = {
    // Original Material-Design traffic-light palette (M2 update: wider today/tomorrow contrast)
    default: {
        past:          '#D32F2F',  // red
        pastBorder:    '#D32F2F',  // red — same as fill; no extra signal needed
        today:          '#EE7733',  // coral red — was #F57C00 orange; widened contrast vs tomorrow
        todayBorder:    '#D32F2F',  // deeper red — was #D32F2F; contrast ring on coral red pill
        tomorrow:       '#FFEB3B',  // warm amber — was #FFEB3B yellow; more distinct from today
        tomorrowBorder: '#EE7733',  // today colour as border — urgency gradient
        tomorrowText:   '#000000',  // black — readable on amber
        week:          '#4CAF50',  // green — same as base; no visual change in this theme
        weekBorder:    '#FFEB3B',  // yellow — original tomorrow colour as border
        base:          '#4CAF50',  // green
        defaultBorder: '#fff',
        list:          '#2196F3',  // blue — list type / unscheduled spoke
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
        pastBorder:    '#4CAF50',  // green — same as fill; no alarm on past
        today:          '#4CAF50',  // green — "it's today, green means go"
        todayBorder:    '#FFEB3B',  // yellow — warm signal on an otherwise calm green pill
        tomorrow:       '#FFEB3B',  // yellow — coming tomorrow; same as default
        tomorrowBorder: '#4CAF50',  // today colour as border
        tomorrowText:   '#000000',  // black — readable contrast on yellow
        week:          '#EE7733',  // orange — this week; approaching
        weekBorder:    '#D32F2F',  // red — base colour as border; "getting serious"
        base:          '#D32F2F',  // red — far-future scheduled; attention required
        defaultBorder: '#aaa',     // neutral ring on far-future base pills
        list:          '#2196F3',  // blue — list type / unscheduled spoke (unchanged)
    },

    // Colourblind-friendly palette (safe for deuteranopia / protanopia).
    // Uses the Bang Wong / Paul Tol set: no red-green confusion.
    colourblind: {
        past:          '#CC3311',  // vermillion — distinct from orange even without hue
        pastBorder:    '#CC3311',  // vermillion — same as fill
        today:          '#EE7733',  // orange (warm, not red)
        todayBorder:    '#CC3311',  // vermillion — past colour as border
        tomorrow:       '#009988',  // teal — unambiguous against orange; dark enough for white text
        tomorrowBorder: '#EE7733',  // today colour as border
        tomorrowText:   '#ffffff',  // white — readable on dark teal
        week:          '#0077BB',  // blue — same as base; no visual change in this theme
        weekBorder:    '#009988',  // teal — tomorrow colour as border
        base:          '#0077BB',  // blue — safe for all CVD types
        defaultBorder: '#aaa',
        list:          '#2196F3',  // blue — safe for CVD; distinct from urgency spectrum
    },
    // Monochrome palette: urgency ramps from light grey (far future) through to black (today),
    // then white for past — happened, gone, no weight.
    monochrome: {
        past:          '#FFFFFF',  // white — it's done; no weight
        pastBorder:    '#111111',  // black — visible ring on white pill
        today:          '#111111',  // near-black — right now; maximum presence
        todayBorder:    '#FFFFFF',  // white — contrast ring on black pill
        tomorrow:       '#444444',  // dark grey — coming tomorrow
        tomorrowBorder: '#111111',  // today colour as border
        tomorrowText:   '#FFFFFF',  // white — readable on dark grey
        week:          '#888888',  // mid grey — this week
        weekBorder:    '#444444',  // dark grey — tomorrow colour as border
        base:          '#BBBBBB',  // light grey — scheduled, not imminent
        defaultBorder: '#888888',  // mid grey — subtle ring on light pill
        list:          '#666666',  // neutral grey — list type / unscheduled spoke
    },

    // Monochrome inverse: ramp flipped — black for past, white for today, light → dark for future.
    'monochrome-inverse': {
        past:          '#111111',  // near-black — done; heavy, settled
        pastBorder:    '#444444',  // dark grey — subtle ring on near-black pill
        today:          '#FFFFFF',  // white — right now; open, present
        todayBorder:    '#444444',  // dark grey — visible ring on white pill
        tomorrow:       '#888888',  // mid grey — coming tomorrow
        tomorrowBorder: '#FFFFFF',  // today colour as border
        tomorrowText:   '#111111',  // dark — readable on mid grey
        week:          '#BBBBBB',  // light grey — this week
        weekBorder:    '#888888',  // mid grey — contrast on light pill
        base:          '#444444',  // dark grey — scheduled, not imminent
        defaultBorder: '#888888',  // mid grey — ring on dark grey base pill
        list:          '#666666',  // neutral grey — list type / unscheduled spoke
    },
};

// ── Default theme — used for first paint before persisted meta is loaded ─────
const ACTIVE_THEME = 'default';
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Write the active theme's colours as CSS custom properties on :root.
 * Called immediately so pills render correctly on first paint.
 */
function applyTheme(themeName) {
    const theme = Themes[themeName] || Themes.default;
    const root = document.documentElement;
    root.style.setProperty('--sched-color-past',           theme.past);
    root.style.setProperty('--sched-color-past-border',    theme.pastBorder);
    root.style.setProperty('--sched-color-today',          theme.today);
    root.style.setProperty('--sched-color-today-border',   theme.todayBorder);
    root.style.setProperty('--sched-color-tomorrow',        theme.tomorrow);
    root.style.setProperty('--sched-color-tomorrow-border', theme.tomorrowBorder);
    root.style.setProperty('--sched-color-tomorrow-text',   theme.tomorrowText);
    root.style.setProperty('--sched-color-week',           theme.week);
    root.style.setProperty('--sched-color-week-border',    theme.weekBorder);
    root.style.setProperty('--sched-color-base',           theme.base);
    root.style.setProperty('--sched-color-default-border', theme.defaultBorder);
    root.style.setProperty('--sched-color-list',           theme.list);
}

applyTheme(ACTIVE_THEME);
