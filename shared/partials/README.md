# Shared Admin Components

This directory contains reusable EJS partials for all admin panels. These components ensure consistent UX, design, and behavior across the entire admin system.

## Components Overview

### 1. Admin Header (`admin-header.ejs`)
Unified top navigation bar for all admin panels.

**Features:**
- Gold theme (#d4af37) with logo
- User info and logout button
- Responsive mobile menu
- Consistent across all 8 admin panels

**Usage:**
```ejs
<%- include('../../shared/partials/admin-header') %>
```

**No parameters required** - automatically reads user info from session.

---

### 2. Admin Tabs (`admin-tabs.ejs`)
Horizontal tab navigation for multi-section panels.

**Features:**
- Active tab highlighting
- Icon support (Font Awesome)
- Mobile-responsive with horizontal scroll
- Gold accent on active tab

**Usage:**
```ejs
<%- include('../../../shared/partials/admin-tabs', {
  tabs: [
    { label: 'Dashboard', url: '/panel', icon: 'home' },
    { label: 'Items', url: '/panel/items', icon: 'list' },
    { label: 'Settings', url: '/panel/settings', icon: 'cog' }
  ],
  currentPath: '/panel/items',
  baseUrl: 'panel'
}) %>
```

**Parameters:**
- `tabs` (array, required): Array of tab objects
  - `label` (string): Tab display text
  - `url` (string): Tab link URL
  - `icon` (string): Font Awesome icon name (without `fa-` prefix)
- `currentPath` (string, required): Current route path for active state
- `baseUrl` (string, optional): Base URL for panel (used for active detection)

---

### 3. Admin Filters (`admin-filters.ejs`)
Unified filter bar with search and filter buttons.

**Features:**
- Search box with icon
- Filter button groups with badges
- Active state highlighting
- Mobile-responsive layout

**Usage:**
```ejs
<%- include('../../shared/partials/admin-filters', {
  search: {
    id: 'searchInput',
    placeholder: 'Cerca...',
    value: searchTerm,
    onInput: 'handleSearch()'
  },
  filterGroups: [{
    label: 'Stato',
    filters: [
      {
        label: 'Tutti',
        url: '?status=all',
        active: status === 'all',
        icon: 'list',
        count: 42
      },
      {
        label: 'Pubblicati',
        url: '?status=published',
        active: status === 'published',
        icon: 'check-circle',
        count: 30
      }
    ]
  }]
}) %>
```

**Parameters:**
- `search` (object, optional): Search box configuration
  - `id` (string): Input element ID
  - `placeholder` (string): Placeholder text
  - `value` (string): Current search value
  - `onInput` (string): JavaScript handler for input event
- `filterGroups` (array, optional): Array of filter groups
  - `label` (string, nullable): Group label text
  - `filters` (array): Array of filter button objects
    - `label` (string): Button text
    - `url` (string): Filter link URL
    - `active` (boolean): Active state
    - `icon` (string, optional): Font Awesome icon name
    - `count` (number, optional): Badge count

**Example (JavaScript-based filters):**
For client-side filtering (like landing dashboard), use `url: '#'` and add event listeners:
```javascript
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    // Extract filter from label or data attribute
    const label = this.textContent.trim();
    // Apply filter logic
  });
});
```

---

### 4. Admin Modal (`admin-modal.ejs`)
Standardized modal dialog component.

**Features:**
- Backdrop blur effect
- Smooth animations (fade + slide)
- ESC key to close
- Click outside to close
- Flexible sizing (small/medium/large)
- Optional footer

**Usage:**
```ejs
<%- include('../../shared/partials/admin-modal', {
  modalId: 'editModal',
  title: 'Modifica Elemento',
  icon: 'edit',
  modalSize: 'medium',
  closeFunction: 'closeEditModal',
  formId: 'editForm',
  submitLabel: 'Salva Modifiche',
  body: `
    <form id="editForm">
      <div class="form-group">
        <label for="title">Titolo</label>
        <input type="text" id="title" name="title" required>
      </div>
      <div class="form-group">
        <label for="description">Descrizione</label>
        <textarea id="description" name="description" rows="4"></textarea>
      </div>
    </form>
  `
}) %>
```

**Parameters:**
- `modalId` (string, required): Unique modal element ID
- `title` (string, required): Modal header title
- `icon` (string, optional): Font Awesome icon name for title
- `modalSize` (string, optional): Modal width - `'small'` (500px), `'medium'` (700px, default), `'large'` (900px)
- `closeFunction` (string, optional): Custom close function name (defaults to `close{ModalId}()`)
- `body` (string, required): Modal body HTML content
- `footer` (boolean, optional): Set to `false` to hide footer (default: true)
- `footerContent` (string, optional): Custom footer HTML
- `formId` (string, optional): Form ID for submit button (defaults to `{modalId}-form`)
- `submitLabel` (string, optional): Submit button text (default: 'Salva')

**Required JavaScript:**
```javascript
function showEditModal() {
  showModal('editModal'); // From modal-helper.js
}

function closeEditModal() {
  hideModal('editModal'); // From modal-helper.js
}
```

**Include modal-helper.js:**
```html
<script src="/shared/js/modal-helper.js"></script>
```

---

## Modal Helper Functions (`/shared/js/modal-helper.js`)

Utility functions for working with modals:

### `showModal(modalId)`
Display a modal by ID.
```javascript
showModal('editModal');
```

### `hideModal(modalId)`
Hide a modal by ID.
```javascript
hideModal('editModal');
```

### `updateModalTitle(modalId, newTitle)`
Change modal title dynamically.
```javascript
updateModalTitle('editModal', 'Modifica Articolo #42');
```

### `resetModalForm(formId)`
Reset form inside a modal.
```javascript
resetModalForm('editForm');
```

### `setModalLoading(modalId, isLoading)`
Show/hide loading state on submit button.
```javascript
setModalLoading('editModal', true); // Show spinner
// ... async operation ...
setModalLoading('editModal', false); // Hide spinner
```

### `showModalError(modalId, message)`
Display error message at top of modal.
```javascript
showModalError('editModal', 'Errore durante il salvataggio');
```

### `clearModalError(modalId)`
Remove error message from modal.
```javascript
clearModalError('editModal');
```

---

## Shared CSS Variables

All components use CSS variables from `/shared/css/admin-base.css`:

### Colors
```css
--gold: #d4af37          /* Primary brand color */
--gold-dark: #b8941f     /* Hover states */
--gold-light: #e6c96e    /* Light accents */

--success: #27ae60
--danger: #e74c3c
--warning: #f39c12
--info: #3498db
```

### Theme
```css
--bg: #f5f7fa            /* Page background */
--surface: #ffffff       /* Card/input background */
--card: #ffffff          /* Card background */
--border: #e0e0e0        /* Border color */
--text-primary: #2c3e50  /* Primary text */
--text-secondary: #7f8c8d /* Secondary text */
--text-muted: #95a5a6    /* Muted text */
```

### Effects
```css
--shadow: 0 2px 8px rgba(0,0,0,0.08)
--shadow-md: 0 4px 12px rgba(0,0,0,0.12)
--shadow-lg: 0 8px 24px rgba(0,0,0,0.15)
--radius: 12px
--transition: all 0.3s ease
```

---

## Form Styles

All form elements are styled consistently via `admin-base.css`.

### Form Structure
```html
<form class="form-container">
  <div class="form-section">
    <h2><i class="fas fa-user"></i> Informazioni Base</h2>

    <div class="form-group">
      <label for="name">Nome *</label>
      <input type="text" id="name" name="name" required>
      <span class="form-help">Inserisci il nome completo</span>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email">
      </div>
      <div class="form-group">
        <label for="phone">Telefono</label>
        <input type="text" id="phone" name="phone">
      </div>
    </div>
  </div>

  <div class="form-actions">
    <a href="/cancel" class="btn btn-outline">Annulla</a>
    <button type="submit" class="btn btn-primary">Salva</button>
  </div>
</form>
```

### Form Classes
- `.form-section`: Section wrapper with background
- `.form-group`: Single field wrapper
- `.form-row`: Grid layout for multiple fields (responsive)
- `.form-help`: Help text below input
- `.form-actions`: Button row at bottom

---

## Button Styles

### Button Variants
```html
<button class="btn btn-primary">Salva</button>
<button class="btn btn-secondary">Annulla</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-danger">Elimina</button>
<button class="btn btn-success">Conferma</button>
<button class="btn btn-info">Info</button>
<button class="btn btn-warning">Attenzione</button>

<!-- Small buttons -->
<button class="btn btn-sm btn-primary">Small</button>

<!-- Icon buttons -->
<button class="btn btn-primary">
  <i class="fas fa-save"></i> Salva
</button>
```

---

## Usage Best Practices

### 1. Always Use Shared Components
- **DO**: `<%- include('../../shared/partials/admin-header') %>`
- **DON'T**: Create custom headers per panel

### 2. Consistent Path Structure
All panels should have this structure:
```
<body>
  <%- include('../../shared/partials/admin-header') %>

  <main class="admin-container" style="max-width: 1400px; margin: 0 auto; padding: 2rem;">
    <div class="page-header">
      <h1><i class="fas fa-icon"></i> Panel Name Dashboard</h1>
      <p>Description</p>
    </div>

    <%- include('../../shared/partials/admin-tabs', { ... }) %>

    <!-- Content -->
  </main>
</body>
```

### 3. Icon Usage
- Use Font Awesome 6.4.0 icons
- No emoji in production UI
- Icons before text: `<i class="fas fa-save"></i> Salva`

### 4. Color Consistency
- Primary actions: Gold (`var(--gold)`)
- Success: Green (`var(--success)`)
- Danger: Red (`var(--danger)`)
- Neutral: Gray borders and backgrounds

### 5. Mobile-First
- All components are responsive
- Test on mobile viewport (< 768px)
- Tabs scroll horizontally on mobile
- Modals adapt to screen size

---

## Component Library Checklist

- [x] Admin Header
- [x] Admin Tabs
- [x] Admin Filters
- [x] Admin Modal
- [x] Modal Helper JS
- [x] Form Styles (in admin-base.css)
- [x] Button Styles (in admin-base.css)
- [ ] Cloudinary Widget (standardization pending)
- [ ] TinyMCE Config (unification pending)
- [ ] Data Tables (standardization pending)
- [ ] Empty States (standardization pending)
- [ ] Loading States (standardization pending)

---

## Migration Notes

### Converting Old Sidebars to Tabs
1. Remove sidebar include
2. Remove `.admin-layout` and `.main-content` wrappers
3. Add `admin-container` main wrapper
4. Include `admin-tabs` partial
5. Restart service with `pm2 restart {service}`

### Converting Old Filters to Shared Component
1. Identify filter buttons and search inputs
2. Map to `filterGroups` data structure
3. Replace HTML with `admin-filters` include
4. Update JavaScript event listeners if needed
5. Test filter functionality

### Converting Old Modals to Shared Component
1. Extract modal HTML structure
2. Identify modalId, title, body content
3. Create show/hide functions
4. Replace with `admin-modal` include
5. Include `modal-helper.js` script
6. Test modal open/close/submit

---

## Support

For issues or questions:
1. Check this README
2. Review `/shared/css/admin-base.css` for available styles
3. Look at existing implementations in bio-admin, gallery-admin, press-admin, news-admin
4. Check git history for recent component updates

Last updated: 2025-11-15
