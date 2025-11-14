# Archive Concerts Modal - Research Documentation Index

This directory contains complete documentation of the archive concerts modal system.

## Quick Start Guide

### For Understanding the Architecture
Start with: **ARCHIVE_CONCERTS_SUMMARY.txt**
- 8 concise sections covering all aspects
- Executive-level overview with key insights
- Best for getting quick understanding

### For Visual Architecture
Read: **MODAL_ARCHITECTURE.txt**
- ASCII diagrams showing data flow
- Z-index stacking order
- Component relationships
- Event flow patterns

### For Detailed Technical Analysis
Read: **ARCHIVE_CONCERTS_ANALYSIS.md**
- Line-by-line code references
- Complete database schema
- Full function documentation
- Data enrichment process

### For File Navigation
Consult: **FILE_PATHS_REFERENCE.md**
- Quick lookup table of all relevant files
- Absolute file paths for all components
- Organized by file type and purpose

---

## Document Summaries

### 1. ARCHIVE_CONCERTS_SUMMARY.txt
**Length**: 8 sections, ~250 lines
**Best for**: Quick overview, decision-making

**Covers**:
- Modal HTML location and structure
- JavaScript handling (year modal, lightbox, glue module)
- Concert display (individual vs grouped)
- Database data structures
- CSS modal architecture
- Movement support infrastructure
- File reference list
- Key insights and recommendations

### 2. MODAL_ARCHITECTURE.txt
**Length**: 8 ASCII diagrams, ~350 lines
**Best for**: Visual learners, architecture planning

**Covers**:
- Page load and SSR structure
- JavaScript layer components
- CSS layer hierarchy
- Data flow summary
- Z-index stacking order
- Component interactions

### 3. ARCHIVE_CONCERTS_ANALYSIS.md
**Length**: Detailed reference, ~500 lines
**Best for**: Deep technical understanding, implementation

**Covers**:
- Template structure with line numbers
- JavaScript functions with signatures
- Database schema with all fields
- Views and relationships
- CSS specificity and structure
- Movement schema proposal
- Summary comparison table

### 4. FILE_PATHS_REFERENCE.md
**Length**: Quick reference, ~150 lines
**Best for**: Navigation and file lookup

**Covers**:
- Core files (template, JS, CSS, controller, DB)
- Database migrations and schema
- Routes and configuration
- Localization files
- Asset directories
- Quick navigation table

---

## Key Questions Answered

### Where is the modal HTML?
**Answer**: `/home/daniele/danielecamiz-site/cms/views/pages/frontend/concerts.ejs` (lines 150-274)

### Where is the JavaScript that handles modal display?
**Answers**:
- Year modal: `/home/daniele/danielecamiz-site/frontend/js/concerts-year-toggle.js`
- Concert lightbox: `/home/daniele/danielecamiz-site/frontend/js/concerts-lightbox.js`
- Integration: `/home/daniele/danielecamiz-site/frontend/js/modules/concerts/concerts.js`

### How are concert movements currently displayed?
**Answer**: As unstructured text in a single "program" field
- No movement grouping
- No movement metadata (tempo, duration)
- Multi-line text in `<pre>` tag
- Example: "I. Allegro\nII. Andante\nIII. Minuetto\nIV. Finale"

### What data structure is used for concerts with multiple movements?
**Answer**: Currently FLAT - no structured movement support
- Database: Single `concert_program` table links to entire works
- Migration exists for movement support: `/home/daniele/danielecamiz-site/concerts-admin/migrations/001_add_movements.sql`
- Proposed: `movements` table + `concert_program_items` table (not applied)

---

## System Architecture Overview

### Modal Hierarchy
```
1. Year Pills (always visible)
   ↓ (user clicks year)
2. Year Modal (z-index 9990)
   ├─ Grid of concerts for that year
   ├─ Concert cards with posters
   └─ Each card has hidden details
       ↓ (user clicks concert)
3. Concert Lightbox (z-index 9999, overlays year modal)
   ├─ Poster (sticky left)
   └─ Details (scrollable right)
```

### Data Flow
```
Database (SQLite)
    ↓
Controller enrichment (concerts + personnel + extras + programs)
    ↓
Template rendering (EJS)
    ↓
Hidden concert details in DOM (concert-full-details divs)
    ↓
Year modal shows/hides by year
    ↓
Concert lightbox copies details on demand
```

### Z-Index Stacking
- 9999: Concert lightbox (individual details)
- 9990: Year modal (archive browser)
- 0: Page content

---

## File Tree (Key Files)

```
cms/
├── views/
│   └── pages/frontend/concerts.ejs          ← MAIN TEMPLATE
├── controllers/
│   └── concertsController.js                ← DATA ENRICHMENT
├── routes/
│   └── concertsRoutes.js                    ← ROUTING
├── db/
│   ├── schema/main.sql                      ← DB SCHEMA
│   └── migrations/                          ← DB CHANGES
│       ├── 016_concerts_slug.sql
│       ├── 017_repertory.sql
│       ├── 022_event_assignements.sql
│       └── ...
└── data/i18n/
    ├── labels-concerts-it.json
    └── labels-concerts-en.json

frontend/
├── js/
│   ├── concerts-year-toggle.js              ← YEAR MODAL JS
│   ├── concerts-lightbox.js                 ← LIGHTBOX JS
│   └── modules/concerts/concerts.js         ← GLUE MODULE
└── css/
    └── components/modal.css                 ← MODAL STYLES

concerts-admin/
└── migrations/
    └── 001_add_movements.sql                ← MOVEMENT SCHEMA (unused)
```

---

## Common Tasks

### To modify year modal behavior
1. Edit: `/home/daniele/danielecamiz-site/frontend/js/concerts-year-toggle.js`
2. Key functions: `buildOverlay()`, `openYear()`, `toggleYear()`, `closeModal()`

### To modify lightbox display
1. Edit: `/home/daniele/danielecamiz-site/frontend/js/concerts-lightbox.js`
2. Key functions: `openConcertFromDOM()`, `closeConcertLightbox()`

### To modify modal styling
1. Edit: `/home/daniele/danielecamiz-site/frontend/css/components/modal.css`
2. Selectors: `.modal-overlay`, `.modal-box`, `#year_modal`, `#concert_lightbox`

### To change what data displays
1. Edit: `/home/daniele/danielecamiz-site/cms/views/pages/frontend/concerts.ejs`
2. Or modify: `/home/daniele/danielecamiz-site/cms/controllers/concertsController.js`

### To add movement support
1. Apply migration: `/home/daniele/danielecamiz-site/concerts-admin/migrations/001_add_movements.sql`
2. Create movement records in database
3. Modify controller to fetch movement data
4. Update template to display movements
5. Add CSS for movement styling

---

## Additional Resources

### Database
- **Main DB**: `/home/daniele/danielecamiz-site/cms/db/main.sqlite`
- **Schema**: `/home/daniele/danielecamiz-site/cms/db/schema/main.sql`
- **Migrations**: `/home/daniele/danielecamiz-site/cms/db/migrations/`

### Images
- **Future posters**: `/home/daniele/danielecamiz-site/cms/uploads/posters_future/`
- **Past posters**: `/home/daniele/danielecamiz-site/cms/uploads/posters_past/`
- **Gallery**: `/home/daniele/danielecamiz-site/frontend/img/gallery/concert/`

### Backups
- **Data backups**: `/home/daniele/danielecamiz-site/cms/data/backup/`
- **DB backups**: `/home/daniele/danielecamiz-site/cms/db/` (*.backup files)

---

## Code Snippets - Quick Reference

### Opening Year Modal (User clicks year pill)
```javascript
// In concerts-year-toggle.js
toggleYear(year) {
  if (currentYear === year) {
    closeModal();
  } else {
    openYear(year);
  }
}
```

### Opening Concert Lightbox (User clicks concert)
```javascript
// In concerts-lightbox.js
window.openConcertFromDOM = function(concertId) {
  var detailsSource = $('details_' + concertId);
  posterContainer.innerHTML = detailsSource.innerHTML;
  overlay.removeAttribute('hidden');
  overlay.classList.add('show');
}
```

### Concert Item HTML Structure
```html
<li class="concert-item" data-concert-id="concert_2024_0">
  <div class="concert-top-section">
    <!-- Poster + Title + Date + Location -->
  </div>
  <div class="concert-bottom-section">
    <!-- Program + Details -->
  </div>
  <div id="details_concert_2024_0" class="concert-full-details" style="display: none;">
    <!-- Complete details copied to lightbox -->
  </div>
</li>
```

---

## Performance Notes

- **SSR (Server-Side Rendering)**: All concert data loaded at page start
  - Pro: Fast UI, good for SEO
  - Con: Large initial payload for many concerts

- **Pre-rendered Details**: All details embedded in hidden DOM
  - Pro: No API calls needed for lightbox
  - Con: Increases HTML size

- **Dynamic Year Modal**: Created by JavaScript on demand
  - Pro: Minimal initial DOM, flexible
  - Con: Slight delay on first year pill click

---

## Accessibility Features

- ARIA roles: `role="dialog"`, `aria-modal="true"`, `aria-label`
- Focus management: Focus moved to modal on open
- Keyboard support: ESC to close, Enter/Space on pills
- Semantic HTML: `<details>`, `<summary>` for expandable content
- Color contrast: Meets WCAG AA standards

---

## Notes for Developers

1. **Concert IDs format**: `concert_<YEAR>_<INDEX>` for archive, `concert_upcoming_<INDEX>` for upcoming
2. **Details IDs format**: `details_<CONCERT_ID>`
3. **Year panel IDs format**: `year_<YEAR>`
4. **Language support**: Both IT and EN supported via `lang` attribute on `<html>`
5. **Responsive breakpoints**: 768px and 600px for media queries

---

**Documentation Date**: November 14, 2025
**System Version**: Current (as of git commit 2a4127e)
**Status**: Complete analysis and documentation
