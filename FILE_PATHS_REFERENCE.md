# Archive Concerts Modal - Complete File Reference

## Core Files

### 1. Template (HTML/EJS)
**File**: `/home/daniele/danielecamiz-site/cms/views/pages/frontend/concerts.ejs`
- Lines 1-149: Upcoming concerts section
- Lines 150-274: Archive (past) concerts section
- Lines 276-298: Hero sidebar + lightbox container

**Key Sections**:
- Lines 155-162: Year pill buttons
- Lines 164-273: Year content panels (hidden, copied to modal)
- Lines 284-298: Empty lightbox modal shell

### 2. JavaScript - Year Archive Modal
**File**: `/home/daniele/danielecamiz-site/frontend/js/concerts-year-toggle.js`
- ~125 lines
- Creates #year_modal dynamically
- Manages year pill interactions
- Functions: buildOverlay(), openYear(), toggleYear(), closeModal()

### 3. JavaScript - Concert Details Lightbox
**File**: `/home/daniele/danielecamiz-site/frontend/js/concerts-lightbox.js`
- ~145 lines
- Manages #concert_lightbox overlay
- Functions: openConcertFromDOM(), closeConcertLightbox(), openConcertPreview()
- Copies pre-rendered details from hidden DOM to lightbox

### 4. JavaScript - Glue Module
**File**: `/home/daniele/danielecamiz-site/frontend/js/modules/concerts/concerts.js`
- ~110 lines
- Bridges template events to lightbox functions
- Intercepts <summary> clicks
- Functions: bindDetailsLabels(), bindSummaryToLightbox(), payloadFromBlock()

### 5. CSS - Modal Styling
**File**: `/home/daniele/danielecamiz-site/frontend/css/components/modal.css`
- 449 lines total
- Lines 1-145: Base modal styles (.modal-overlay, .modal-box, etc.)
- Lines 146-263: Concert lightbox specific (#concert_lightbox)
- Lines 310-449: Year archive modal specific (#year_modal)

### 6. Controller
**File**: `/home/daniele/danielecamiz-site/cms/controllers/concertsController.js`
- Lines 308-365: getConcertsPageData() - main data fetcher
- Lines 369-525: getConcertsPage() - request handler
- Enriches concert data with personnel, extras, programs before templating

### 7. Database Schema
**File**: `/home/daniele/danielecamiz-site/cms/db/schema/main.sql`
- Lines 61-72: CREATE TABLE concerts
- Lines 78-90: CREATE TABLE concert_program
- Lines 39-54: CREATE TABLE works
- Lines 148-158: CREATE TABLE concert_performers
- Lines 161-165: CREATE TABLE concert_extra
- Lines 125-145: VIEW view_concert_program_detailed
- Lines 168-189: VIEW view_concert_personnel_agg

---

## Supporting Database Migrations

### Concert-related Migrations
- `/home/daniele/danielecamiz-site/cms/db/migrations/016_concerts_slug.sql` - Adds slug column to concerts
- `/home/daniele/danielecamiz-site/cms/db/migrations/020_schema_migrations.sql` - Schema tracking
- `/home/daniele/danielecamiz-site/cms/db/migrations/017_repertory.sql` - Works/composers tables
- `/home/daniele/danielecamiz-site/cms/db/migrations/022_event_assignements.sql` - Concert personnel
- `/home/daniele/danielecamiz-site/cms/db/migrations/20250926_add_concert_time.sql` - Concert time field

### Movement Support (Not Yet Applied)
- `/home/daniele/danielecamiz-site/concerts-admin/migrations/001_add_movements.sql` - Future movements schema

---

## Configuration & Routes

### Routes
**File**: `/home/daniele/danielecamiz-site/cms/routes/concertsRoutes.js`
- Defines GET /concerts endpoint
- Maps to concertsController.getConcertsPage()

### Models/Repository
**File**: `/home/daniele/danielecamiz-site/cms/models/concertsRepo.js`
- Repository pattern for concert data access (if exists)

---

## Localization (i18n)

### Concert Labels (Italian)
**File**: `/home/daniele/danielecamiz-site/cms/data/i18n/labels-concerts-it.json`

### Concert Labels (English)
**File**: `/home/daniele/danielecamiz-site/cms/data/i18n/labels-concerts-en.json`

### Full Concerts Data (Italian)
**File**: `/home/daniele/danielecamiz-site/cms/data/i18n/concerts-it.json`

### Full Concerts Data (English)
**File**: `/home/daniele/danielecamiz-site/cms/data/i18n/concerts-en.json`

---

## Additional Related Files

### Hero Section (Concerts Landing)
**File**: `/home/daniele/danielecamiz-site/cms/views/partials/frontend/hero-concerts.ejs`

### Concerts in Homepage
**File**: `/home/daniele/danielecamiz-site/frontend/js/modules/home/home-concerts.js`

### Concert Lightbox (Legacy)
**File**: `/home/daniele/danielecamiz-site/frontend/js/concerts-lightbox.js` (deprecated version?)

### Concert Year Toggle (Legacy?)
**File**: `/home/daniele/danielecamiz-site/frontend/js/concerts-year-toggle.js`

---

## Data Files (Backups)

Backup copies of concerts data:
- `/home/daniele/danielecamiz-site/cms/data/backup/` - Multiple timestamped backups
- `/home/daniele/danielecamiz-site/cms/data/legacy/concerts.json` - Legacy format

---

## Database Files

### Main SQLite Database
**Location**: `/home/daniele/danielecamiz-site/cms/db/main.sqlite`

### Backups
- `/home/daniele/danielecamiz-site/cms/db/main.sqlite.backup-20251114-000001`
- `/home/daniele/danielecamiz-site/cms/db/main.sqlite.backup-20251114-060001`

---

## Image Assets

### Concert Posters (Future)
**Directory**: `/home/daniele/danielecamiz-site/cms/uploads/posters_future/`

### Concert Posters (Past)
**Directory**: `/home/daniele/danielecamiz-site/cms/uploads/posters_past/`

### Gallery Images
**Directory**: `/home/daniele/danielecamiz-site/frontend/img/gallery/concert/`

### In Concert Gallery
**Directory**: `/home/daniele/danielecamiz-site/frontend/img/gallery/in-concerto/`

---

## Quick Navigation

| Need | Path |
|------|------|
| Edit modal HTML | `/home/daniele/danielecamiz-site/cms/views/pages/frontend/concerts.ejs` |
| Modify year modal behavior | `/home/daniele/danielecamiz-site/frontend/js/concerts-year-toggle.js` |
| Modify lightbox behavior | `/home/daniele/danielecamiz-site/frontend/js/concerts-lightbox.js` |
| Change modal styling | `/home/daniele/danielecamiz-site/frontend/css/components/modal.css` |
| Modify data loading | `/home/daniele/danielecamiz-site/cms/controllers/concertsController.js` |
| Check database schema | `/home/daniele/danielecamiz-site/cms/db/schema/main.sql` |
| Add movement support | `/home/daniele/danielecamiz-site/concerts-admin/migrations/001_add_movements.sql` |
| Translate labels | `/home/daniele/danielecamiz-site/cms/data/i18n/labels-concerts-*.json` |

