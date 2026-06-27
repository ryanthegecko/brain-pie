/**
 * Schedule pill colour themes.
 *
 * Each theme defines eight colour tokens used by schedule urgency pills:
 *   past           — overdue items (background + border)
 *   pastBorder     — border colour on past pills
 *   today          — due today (background)
 *   todayBorder    — border colour on today pills
 *   todayText      — text colour inside a today pill
 *   tomorrow       — due tomorrow (background)
 *   tomorrowBorder — border colour on tomorrow pills
 *   tomorrowText   — text colour inside a tomorrow pill (contrast varies: black on yellow, white on teal)
 *   week           — scheduled this week (2–7 days away); distinct from far-future base
 *   weekBorder     — border colour on this-week pills
 *   weekText       — text colour inside a this-week pill
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
        pastText:      '#ffffff',  // white — readable on red
        today:          '#EE7733',  // coral red — was #F57C00 orange; widened contrast vs tomorrow
        todayBorder:    '#D32F2F',  // deeper red — was #D32F2F; contrast ring on coral red pill
        todayText:      '#FFFFFF',  // white — readable on coral red
        tomorrow:       '#FFEB3B',  // warm amber — was #FFEB3B yellow; more distinct from today
        tomorrowBorder: '#EE7733',  // today colour as border — urgency gradient
        tomorrowText:   '#000000',  // black — readable on amber
        week:          '#4CAF50',  // green — same as base; no visual change in this theme
        weekBorder:    '#FFEB3B',  // yellow — original tomorrow colour as border
        weekText:      '#ffffff',  // white — readable on green
        base:          '#4CAF50',  // green
        baseText:      '#ffffff',  // white — readable on green
        defaultBorder: '#4CAF50',
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
/*     inverse: {
        past:          '#4CAF50',  // green — it happened / it's here; relax
        pastBorder:    '#4CAF50',  // green — same as fill; no alarm on past
        pastText:      '#000000',  // black — readable on green (matches todayText; same fill)
        today:          '#4CAF50',  // green — "it's today, green means go"
        todayBorder:    '#FFEB3B',  // yellow — warm signal on an otherwise calm green pill
        todayText:      '#000000',  // black — readable on green
        tomorrow:       '#FFEB3B',  // yellow — coming tomorrow; same as default
        tomorrowBorder: '#4CAF50',  // today colour as border
        tomorrowText:   '#000000',  // black — readable contrast on yellow
        week:          '#EE7733',  // orange — this week; approaching
        weekBorder:    '#D32F2F',  // red — base colour as border; "getting serious"
        weekText:      '#ffffff',  // white — readable on orange
        base:          '#D32F2F',  // red — far-future scheduled; attention required
        baseText:      '#ffffff',  // white — readable on red
        defaultBorder: '#aaa',     // neutral ring on far-future base pills
        list:          '#2196F3',  // blue — list type / unscheduled spoke (unchanged)
    }, */

    inverse: {
        past:          '#4CAF50',  // green — it happened / it's here; relax
        pastBorder:    '#4CAF50',  // green — same as fill; no alarm on past
        pastText:      '#FFFFFF',  // black — readable on green (matches todayText; same fill)
        today:          '#FFEB3B',  // green — "it's today, green means go"
        todayBorder:    '#4CAF50',  // yellow — warm signal on an otherwise calm green pill
        todayText:      '#000000',  // black — readable on green
        tomorrow:       '#EE7733',  // yellow — coming tomorrow; same as default
        tomorrowBorder: '#FFEB3B',  // today colour as border
        tomorrowText:   '#ffffff',  // black — readable contrast on yellow
        week:          '#D32F2F',  // orange — this week; approaching
        weekBorder:    '#EE7733',  // red — base colour as border; "getting serious"
        weekText:      '#ffffff',  // white — readable on orange
        base:          '#D32F2F',  // red — far-future scheduled; attention required
        baseText:      '#ffffff',  // white — readable on red
        defaultBorder: '#D32F2F',     // neutral ring on far-future base pills
        list:          '#2196F3',  // blue — list type / unscheduled spoke (unchanged)
    },

    // Colourblind-friendly palette (safe for deuteranopia / protanopia).
    // Uses the Bang Wong / Paul Tol set: no red-green confusion.
    colourblind: {
        past:          '#CC3311',  // vermillion — distinct from orange even without hue
        pastBorder:    '#CC3311',  // vermillion — same as fill
        pastText:      '#ffffff',  // white — readable on vermillion
        today:          '#EE7733',  // orange (warm, not red)
        todayBorder:    '#CC3311',  // vermillion — past colour as border
        todayText:      '#ffffff',  // white — readable on orange
        tomorrow:       '#009988',  // teal — unambiguous against orange; dark enough for white text
        tomorrowBorder: '#EE7733',  // today colour as border
        tomorrowText:   '#ffffff',  // white — readable on dark teal
        week:          '#0077BB',  // blue — same as base; no visual change in this theme
        weekBorder:    '#009988',  // teal — tomorrow colour as border
        weekText:      '#ffffff',  // white — readable on blue
        base:          '#0077BB',  // blue — safe for all CVD types
        baseText:      '#ffffff',  // white — readable on blue
        defaultBorder: '#aaa',
        list:          '#2196F3',  // blue — safe for CVD; distinct from urgency spectrum
    },
    // Monochrome palette: urgency ramps from white (far future) through greys to black (past).
    monochrome: {
        past:          '#000000',  // Black
        pastBorder:    '#000000',  // black — visible ring on white pill
        pastText:      '#FFFFFF',  // White — readable on black
        today:          '#333333',  // near-black — right now; maximum presence
        todayBorder:    '#000000',  // Black — contrast ring on black pill
        todayText:      '#ffffff',  // white — readable on near-black
        tomorrow:       '#AAAAAA',  // dark grey — coming tomorrow
        tomorrowBorder: '#000000',  // today colour as border
        tomorrowText:   '#000000',  // white — readable on dark grey
        week:          '#FFFFFF',  // mid grey — this week
        weekBorder:    '#666666',  // dark grey — tomorrow colour as border
        weekText:      '#000000',  // black — readable on white
        base:          '#FFFFFF',  // White — scheduled, not imminent
        baseText:      '#000000',  // black — needed for contrast on light grey
        defaultBorder: '#FFFFFF',  // mid grey — subtle ring on light pill
        list:          '#666666',  // neutral grey — list type / unscheduled spoke
    },

    // Monochrome inverse: ramp flipped — black for past, white for today, light → dark for future.
/*     'monochrome-inverse': {
        past:          '#FFFFFF',  // White — happened, gone, no weight
        pastBorder:    '#FFFFFF',  // Black — all black pill
        pastText:      '#000000',  // white — readable on near-black
        today:          '#FFFFFF',  // white — right now; open, present
        todayBorder:    '#AAAAAA',  // dark grey — visible ring on white pill
        todayText:      '#000000',  // white — readable on black
        tomorrow:       '#AAAAAA',  // mid grey — coming tomorrow
        tomorrowBorder: '#000000',  // today colour as border
        tomorrowText:   '#000000',  // white — readable on mid grey
        week:          '#333333',  // light grey — this week
        weekBorder:    '#000000',  // mid grey — contrast on light pill
        weekText:      '#FFFFFF',  // black — readable on light grey
        base:          '#000000',  // dark grey — scheduled, not imminent
        baseText:      '#FFFFFF',  // white — readable on dark grey
        defaultBorder: '#FFFFFF',  // mid grey — ring on dark grey base pill
        list:          '#666666',  // neutral grey — list type / unscheduled spoke
    }, */
     'monochrome-inverse': {
        past:          '#FFFFFF',  // White — happened, gone, no weight
        pastBorder:    '#FFFFFF',  // Black — all black pill
        pastText:      '#000000',  // white — readable on near-black
        today:          '#AAAAAA',  // white — right now; open, present
        todayBorder:    '#FFFFFF',  // dark grey — visible ring on white pill
        todayText:      '#000000',  // white — readable on black
        tomorrow:       '#333333',  // mid grey — coming tomorrow
        tomorrowBorder: '#AAAAAA',  // today colour as border
        tomorrowText:   '#FFFFFF',  // white — readable on mid grey
        week:          '#000000',  // light grey — this week
        weekBorder:    '#333333',  // mid grey — contrast on light pill
        weekText:      '#FFFFFF',  // black — readable on light grey
        base:          '#000000',  // dark grey — scheduled, not imminent
        baseText:      '#FFFFFF',  // white — readable on dark grey
        defaultBorder: '#000000',  // mid grey — ring on dark grey base pill
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
    root.style.setProperty('--sched-color-past-text',      theme.pastText);
    root.style.setProperty('--sched-color-today',          theme.today);
    root.style.setProperty('--sched-color-today-border',   theme.todayBorder);
    root.style.setProperty('--sched-color-today-text',     theme.todayText);
    root.style.setProperty('--sched-color-tomorrow',        theme.tomorrow);
    root.style.setProperty('--sched-color-tomorrow-border', theme.tomorrowBorder);
    root.style.setProperty('--sched-color-tomorrow-text',   theme.tomorrowText);
    root.style.setProperty('--sched-color-week',           theme.week);
    root.style.setProperty('--sched-color-week-border',    theme.weekBorder);
    root.style.setProperty('--sched-color-week-text',      theme.weekText);
    root.style.setProperty('--sched-color-base',           theme.base);
    root.style.setProperty('--sched-color-base-text',      theme.baseText);
    root.style.setProperty('--sched-color-default-border', theme.defaultBorder);
    root.style.setProperty('--sched-color-list',           theme.list);
}

applyTheme(ACTIVE_THEME);
