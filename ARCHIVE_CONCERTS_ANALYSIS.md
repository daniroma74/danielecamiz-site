# Archive Concerts Modal - Complete Analysis

## Overview
The archive concerts functionality uses a **modal-based year filter system** combined with a lightbox modal for individual concert details. The current implementation displays concert information individually without support for multi-movement concerts.

---

## 1. MODAL HTML/TEMPLATE

### Location
**Template File**: `/home/daniele/danielecamiz-site/cms/views/pages/frontend/concerts.ejs`

### Archive Section Structure (Lines 150-274)

#### Year Selector Pills
```ejs
<section id="past_section" aria-labelledby="past_title">
  <h2 id="past_title" class="section-title"><%= txtPast %></h2>
  
  <div class="year-pills" role="tablist" aria-label="Archive by year">
    <% pastYears.forEach((g) => { %>
      <button class="year-pill"
              role="tab"
              aria-selected="false"
              data-year="<%= g.year %>"><%= g.year %></button>
    <% }) %>
  </div>
```

#### Year Content Panels
- Each year's concerts are stored in `<div class="year-content" id="year_<YEAR>">`
- Contains `<ul class="concerts-year-list">` with individual concert items
- Hidden by default (`hidden` attribute)
- Concert structure:
  - `<li class="concert-item" data-concert-id="concert_<YEAR>_<INDEX>">`
  - Two-part structure:
    - **concert-top-section**: Poster image + basic info (title, date, location)
    - **concert-bottom-section**: Program, orchestra, conductor, soloists, notes, YouTube link
  - Hidden details: `<div class="concert-full-details" id="details_<CONCERT_ID>">`

### Template Properties
- **Language Support**: Fully i18n-aware (IT/EN)
- **Data Binding**: Server-side rendering (SSR) - all concert data injected at page load
- **Program Display**: Currently shows as single text block using `<pre>` tag
- **Responsive**: Mobile-first design

---

## 2. JAVASCRIPT - MODAL HANDLING

### Two Main JavaScript Files

#### A. Year Toggle Modal (`/frontend/js/concerts-year-toggle.js`)
**File Size**: ~125 lines
**Purpose**: Manages the year archive modal overlay

**Key Functions**:
```javascript
// buildOverlay() - Creates modal structure dynamically
- Creates #year_modal (modal-overlay class)
- Builds modal-box with close button
- Creates modal-content div

// openModalWithHtml(html) - Opens modal with year's concerts
- Populates content.innerHTML with year's HTML
- Opens all <details> elements automatically
- Shows overlay, sets focus on modal box

// openYear(year) - Shows specific year
- Highlights active year pill
- Gets panel HTML from DOM (year_<YEAR> element)
- Triggers openModalWithHtml()

// toggleYear(year) - Toggle behavior
- Opens if not current, closes if current

// closeModal() - Closes modal
- Hides overlay, clears content
- Resets pill states, body overflow
```

**Event Listeners**:
- Click on year pills → `toggleYear()`
- ESC key → `closeModal()`
- Backdrop click → `closeModal()`
- Enter/Space on pills → `toggleYear()`

#### B. Lightbox Modal (`/frontend/js/concerts-lightbox.js`)
**File Size**: ~145 lines
**Purpose**: Shows individual concert details in lightbox modal

**Key Functions**:
```javascript
// openConcertFromDOM(concertId)
- Finds #details_<CONCERT_ID> in DOM
- Copies concert-full-details HTML to #concert_poster_container
- Shows #concert_lightbox overlay
- Handles focus management

// closeConcertLightbox()
- Hides overlay, clears poster container
- Restores body scroll

// openConcertPreview(payload, landingUrl)
- For upcoming concerts with landing pages
- Shows iframe instead of poster details
- Used for booking integration
```

**Event Listeners**:
- Click on concert items → `openConcertFromDOM()`
- ESC key → `closeConcertLightbox()`
- Backdrop click → `closeConcertLightbox()`

#### C. Concerts Glue Module (`/frontend/js/modules/concerts/concerts.js`)
**File Size**: ~110 lines
**Purpose**: Glue layer between DOM and lightbox functions

**Key Responsibilities**:
- Binds `<details>` label toggle (Mostra di più / Mostra di meno)
- Intercepts `<summary>` clicks to open lightbox instead of inline expansion
- Prevents double-opening when inside year modal (special check for #year_modal)
- Delegates to `window.openConcertFromDOM(concertId)`

---

## 3. CURRENT CONCERT DISPLAY - INDIVIDUAL vs GROUPED

### Current Behavior: STRICTLY INDIVIDUAL

**Each concert is displayed as a single unit**:
1. One concert = one `<li class="concert-item">` element
2. One poster image
3. One program text block
4. No grouping mechanism

### Program Display
```ejs
<% if (c.program) { %>
  <div class="concert-program">
    <pre><%= c.program %></pre>
  </div>
<% } %>
```

**Current approach**:
- Single `program` field from database
- Multi-line text rendered in `<pre>` tag (preserves formatting)
- No structured movement information

### Data Flow for Concerts
1. **Controller** (`cms/controllers/concertsController.js`):
   - Fetches concerts from `view_upcoming_concerts` view
   - Fetches past concerts with `date(date) < date('now')`
   - Enriches with personnel data via `view_concert_personnel_agg`
   - Enriches with extras (notes, youtube) from `concert_extra` table
   - Enriches with program text from `view_concert_program_detailed`

2. **Template** (`concerts.ejs`):
   - Maps concert objects to HTML
   - Groups by year for archive display
   - Each concert rendered individually

---

## 4. DATABASE SCHEMA - DATA STRUCTURES

### Location
**Schema File**: `/home/daniele/danielecamiz-site/cms/db/schema/main.sql`

### Current Concert Tables

#### `concerts` table (Lines 61-72)
```sql
CREATE TABLE IF NOT EXISTS concerts (
  id                    INTEGER PRIMARY KEY,
  title                 TEXT,
  date                  TEXT NOT NULL,              -- ISO YYYY-MM-DD
  location              TEXT,
  poster_cloudinary_id  TEXT,
  poster_local_filename TEXT,
  is_future             INTEGER NOT NULL DEFAULT 0,
  program_notes         TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### `concert_program` table (Lines 78-85)
```sql
CREATE TABLE IF NOT EXISTS concert_program (
  id            INTEGER PRIMARY KEY,
  concert_id    INTEGER NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
  work_id       INTEGER NOT NULL REFERENCES works(id) ON DELETE RESTRICT,
  position      INTEGER,                     -- ordine in programma
  first_time    INTEGER NOT NULL DEFAULT 0,
  notes         TEXT
);
```

**Issue**: `concert_program` links concerts to **entire works**, not to individual movements.

#### `works` table (Lines 39-54)
```sql
CREATE TABLE IF NOT EXISTS works (
  id               INTEGER PRIMARY KEY,
  composer_id      INTEGER NOT NULL REFERENCES composers(id),
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  title            TEXT NOT NULL,
  subtitle         TEXT,
  catalogue        TEXT,                     -- "K. 550", "Op. 73"
  work_key         TEXT,                     -- tonalità
  year             INTEGER,
  notes_it         TEXT,
  notes_en         TEXT,
  media_video      TEXT,
  media_audio      TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Related Tables for Concert Details

#### `concert_performers` table (Lines 148-158)
```sql
CREATE TABLE IF NOT EXISTS concert_performers (
  id          INTEGER PRIMARY KEY,
  concert_id  INTEGER NOT NULL REFERENCES concerts(id),
  role        TEXT NOT NULL CHECK(role IN ('orchestra','conductor','soloist')),
  name        TEXT NOT NULL,
  instrument  TEXT
);
```

#### `concert_extra` table (Lines 161-165)
```sql
CREATE TABLE IF NOT EXISTS concert_extra (
  concert_id  INTEGER PRIMARY KEY REFERENCES concerts(id),
  notes       TEXT,
  youtube_url TEXT
);
```

### Relevant Views

#### `view_concert_program_detailed` (Lines 125-145)
**Purpose**: Join concert_program with works and composer data

```sql
SELECT
  cp.id,
  cp.concert_id,
  cp.work_id,
  cp.position,
  cp.first_time,
  c.title AS concert_title,
  c.date AS concert_date,
  c.location AS concert_location,
  w.title AS work_title,
  w.catalogue AS work_catalogue,
  w.work_key AS work_key,
  comp.full_name AS composer_full_name,
  cat.slug AS category_slug
FROM concert_program cp
JOIN concerts c ON c.id = cp.concert_id
JOIN works w ON w.id = cp.work_id
JOIN composers comp ON comp.id = w.composer_id
JOIN categories cat ON cat.id = w.category_id
```

#### `view_concert_personnel_agg` (Lines 168-189)
**Purpose**: Single aggregated row per concert with personnel (orchestra, conductor, soloists)

---

## 5. CSS STYLING - MODALS

### Location
**CSS File**: `/frontend/css/components/modal.css`

### Modal System Classes

#### Base Modal Styles (Lines 1-145)
```css
.modal-overlay         /* Fixed overlay with dark background, z-index 9999 */
.modal-overlay.show    /* Display flex when shown */
.modal-box             /* Centered box, max-width 900px, flex column */
.modal-close           /* Sticky positioned close button */
.modal-title           /* Centered title */
.modal-content         /* Scrollable content area */
.modal-buttons         /* Action buttons row */
```

**Key Properties**:
- z-index: 9999
- Background: rgba(0,0,0,0.85)
- Border: 2px solid var(--accent-color)
- Max-height: 90vh
- Has custom scrollbar styling

#### Concert Lightbox Specific (Lines 146-263)
```css
#concert_lightbox .modal-box          /* max-width: 980px */
#concert_lightbox .concert-lightbox-poster-view
                                      /* Grid: 200px poster | 1fr details */
#concert_lightbox .concert-lightbox-img
                                      /* Sticky positioned poster thumbnail */
```

**Layout**:
- Responsive grid: 2-column on desktop (poster | details)
- Single column on mobile
- Custom scrollbar on both poster and details

#### Year Archive Modal (Lines 310-449)
```css
#year_modal.modal-overlay             /* z-index: 9990 (below concert lightbox) */
#year_modal .modal-box                /* max-width: 1200px */
#year_modal .concerts-year-list       /* Grid: repeat(auto-fill, minmax(320px, 1fr)) */
#year_modal .concert-item             /* Card style with border, background */
#year_modal .concert-block            /* Flex column, no background */
#year_modal .concert-top-section      /* Grid: 40% poster | 1fr info */
#year_modal .concert-bottom-section   /* Full width program details */
```

**Special Note**:
```css
#year_modal .concert-details summary {
  display: none !important;           /* Hide "Mostra di più" button in modal */
}
```

This means in the year modal, details are automatically expanded.

---

## 6. MOVEMENT SUPPORT - MIGRATION EXISTS BUT UNUSED

### Location
**Migration File**: `/home/daniele/danielecamiz-site/concerts-admin/migrations/001_add_movements.sql`

### Schema (Not Applied to Main DB Yet)

#### `movements` table
```sql
CREATE TABLE IF NOT EXISTS movements (
  id               INTEGER PRIMARY KEY,
  work_id          INTEGER NOT NULL REFERENCES works(id),
  movement_number  INTEGER NOT NULL,           -- 1, 2, 3, 4...
  title            TEXT,                       -- "Allegro", "Andante", etc.
  tempo            TEXT,                       -- "Allegro con brio", "Adagio"
  duration_minutes INTEGER,
  notes_it         TEXT,
  notes_en         TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  
  UNIQUE(work_id, movement_number)
);
```

#### `concert_program_items` table (Replacement for concert_program)
```sql
CREATE TABLE IF NOT EXISTS concert_program_items (
  id               INTEGER PRIMARY KEY,
  concert_id       INTEGER NOT NULL REFERENCES concerts(id),
  work_id          INTEGER REFERENCES works(id),
  movement_id      INTEGER REFERENCES movements(id),
  position         INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  
  -- Constraint: must have EITHER work_id OR movement_id (not both)
  CHECK ((work_id IS NOT NULL AND movement_id IS NULL) OR 
         (work_id IS NULL AND movement_id IS NOT NULL))
);
```

**Important**: This allows concerts to reference either complete works OR individual movements, but NOT both.

---

## 7. CURRENT DATA MODEL - Concerts with Multiple Movements

### Today's Problem
**Single flat `program` field** in concerts table stores multi-line text.

Example current data:
```
I. Allegro con brio
II. Andante cantabile
III. Minuetto - Trio
IV. Finale - Presto
```

This is **unstructured text** - no way to:
- Link movements to specific movement data
- Display movement durations
- Show movement tempi separately
- Search/filter by movement

### Proposed Solution (Using existing migration)
For a work with movements (e.g., Beethoven Symphony No. 5):

1. **Create `movements` records** for each movement:
   - Movement 1: "Allegro con brio", tempo: "♩=108", duration: 7 minutes
   - Movement 2: "Andante cantabile", tempo: "♩=84", duration: 10 minutes
   - etc.

2. **Link concert to movements** (or to full work if unperformed by movement):
   - `concert_program_items` with movement_id instead of work_id
   - Or full work if all movements performed together

3. **Display options**:
   - Show movements individually in the concert program
   - Group movements by work (with work title as header)
   - Show movement metadata (tempo, duration) alongside movement title

---

## SUMMARY TABLE

| Aspect | Current State | Location |
|--------|---------------|----------|
| **Modal HTML** | EJS template with year pills + concert cards | `cms/views/pages/frontend/concerts.ejs` (lines 150-274) |
| **Year Toggle JS** | Dynamic modal overlay creation | `frontend/js/concerts-year-toggle.js` |
| **Lightbox JS** | Individual concert detail modal | `frontend/js/concerts-lightbox.js` |
| **Glue Module** | Details-to-lightbox interceptor | `frontend/js/modules/concerts/concerts.js` |
| **Modal CSS** | Base + concert-specific styles | `frontend/css/components/modal.css` |
| **Current Display** | Individual concerts, one per row/card | Template generates concert-item per concert |
| **Program Format** | Single text field in database | `concerts.program` (text) |
| **Movement Support** | Migration exists but NOT applied | `concerts-admin/migrations/001_add_movements.sql` |
| **Grouping Logic** | By year (via JavaScript) | `concerts-year-toggle.js` |
| **Data Enrichment** | Personnel + extras + program from DB | `cms/controllers/concertsController.js` |

---

## KEY INSIGHTS

1. **Modal is JavaScript-Generated**: The year modal DOM is created by JS, not pre-rendered in EJS
2. **Concert Details Pre-Rendered**: Full details are in hidden `<div class="concert-full-details">` in HTML, copied to lightbox on demand
3. **Movement Data Unavailable**: Current schema has NO movement concept - only flat work titles in program text
4. **Movement Migration Ready**: The infrastructure exists to support movements but has not been applied to the main database
5. **Two-Modal System**: 
   - Year modal (z-index 9990) for browsing by year
   - Concert lightbox (z-index 9999) for individual details
6. **Responsive Design**: Grid-based layout adapts to mobile with CSS media queries
7. **Performance**: Server-side rendering means all concert data loaded at page start (good for SEO, potentially heavy payload for many concerts)

