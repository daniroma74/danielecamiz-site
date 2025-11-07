# Admin Modules - Quick Reference Guide

## Shared Base CSS
**Location:** `/shared/css/admin-base.css`

All admin modules should import this file. It provides:
- Color variables (gold theme)
- Layout components (sidebar, header, content)
- Form controls (inputs, textareas, selects)
- Buttons (primary, secondary, success, danger)
- Tables (admin-table)
- Modals, alerts, badges
- Responsive breakpoints (768px, 1024px)

## Admin Modules Overview

### 1. Concerts-Admin (COMPLIANT ✅)
- **Navigation:** `.admin-nav` navbar
- **Layout:** Full-width, no sidebar
- **CSS:** Imports admin-base.css + custom CSS
- **Hub Link:** ✅ Included
- **Location:** `https://events-admin.danielecamiz.com`

### 2. News-Admin (COMPLIANT ✅)
- **Navigation:** `.admin-nav` navbar with custom header partial
- **Layout:** Full-width, no sidebar
- **CSS:** Imports admin-base.css + custom CSS
- **Hub Link:** ✅ Included
- **Location:** News management module

### 3. Bio-Admin (COMPLIANT ✅)
- **Navigation:** Sidebar layout from admin-base.css
- **Layout:** `.admin-layout` with fixed sidebar
- **CSS:** Imports admin-base.css + minimal custom CSS
- **Hub Link:** ✅ Included
- **Features:** Multi-language (IT/EN) content

### 4. Contact-Admin (NON-COMPLIANT ❌)
- **Navigation:** Custom inline styles
- **Layout:** Custom centered layout
- **CSS:** Does NOT import admin-base.css, uses inline styles
- **Hub Link:** ❌ Missing
- **Issues:** Purple/pink theme, inline styles, no shared components
- **Status:** Needs harmonization

### 5. Gallery-Admin (COMPLIANT ✅)
- **Navigation:** `.admin-nav` navbar
- **Layout:** Grid-based content layout
- **CSS:** Imports admin-base.css
- **Hub Link:** ✅ Included
- **Features:** Collection and media management

### 6. Press-Admin (COMPLIANT ✅)
- **Navigation:** Navbar layout
- **Layout:** Content grid
- **CSS:** Imports admin-base.css + minimal custom CSS
- **Hub Link:** ✅ Included
- **Features:** Press release management

### 7. Admin-Hub (CENTRAL HUB ✨)
- **Purpose:** Central entry point for all modules
- **Navigation:** Module cards with gold theme
- **Location:** `https://hub.danielecamiz.com`
- **Features:** Lists all admin modules, security settings

---

## Standard Template Structure

### Head Section
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  
  <!-- Shared base styles -->
  <link rel="stylesheet" href="/shared/css/admin-base.css">
  
  <!-- Module-specific styles -->
  <link rel="stylesheet" href="/static/css/module-name.css">
  
  <!-- Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
```

### Body Structure
```html
<body>
  <!-- Back-to-Hub button (shared partial) -->
  <%- include('../../shared/partials/back-to-hub') %>
  
  <!-- Navigation (navbar or sidebar) -->
  <nav class="admin-nav">
    <!-- Logo, links, logout -->
  </nav>
  <!-- OR -->
  <div class="admin-layout">
    <div class="sidebar">
      <!-- Sidebar content -->
    </div>
    <div class="main-content">
      <!-- Main area -->
    </div>
  </div>
  
  <!-- Main content -->
  <main class="admin-main">
    <!-- Page content -->
  </main>
</body>
```

---

## Color Scheme (Gold Theme)

### Primary Colors
```css
--gold: #d4af37;              /* Main brand color */
--gold-dark: #b8941f;         /* Darker variant */
--gold-light: #e6c96e;        /* Lighter variant */
```

### Status Colors
```css
--success: #27ae60;           /* Green - success */
--danger: #e74c3c;            /* Red - delete/alert */
--warning: #f39c12;           /* Orange - warning */
--info: #3498db;              /* Blue - info */
```

### Neutral Colors
```css
--bg: #f5f7fa;                /* Background */
--surface: #ffffff;           /* Card/surface background */
--border: #e0e0e0;            /* Borders */
--border-light: #f0f0f0;      /* Light borders */
--text-primary: #2c3e50;      /* Main text */
--text-secondary: #7f8c8d;    /* Secondary text */
--text-muted: #95a5a6;        /* Muted text */
```

---

## Common Components

### Buttons
```html
<!-- Primary (gold) -->
<a href="#" class="btn btn-primary">
  <i class="fas fa-plus"></i> Create
</a>

<!-- Secondary (gray) -->
<button class="btn btn-secondary">Cancel</button>

<!-- Success (green) -->
<button class="btn btn-success">Save</button>

<!-- Danger (red) -->
<button class="btn btn-danger">Delete</button>

<!-- Sizes -->
<button class="btn btn-sm">Small</button>
<button class="btn btn-xs">Extra Small</button>
```

### Cards
```html
<div class="admin-card">
  <div class="admin-card-header">Card Title</div>
  <div class="admin-card-body">
    Content here
  </div>
</div>
```

### Forms
```html
<div class="form-section">
  <h2><i class="fas fa-cog"></i> Form Title</h2>
  
  <div class="form-group">
    <label>Field Label</label>
    <input type="text" class="form-control" placeholder="Enter...">
    <span class="form-help">Helper text</span>
  </div>
  
  <div class="form-row">
    <div class="form-group">
      <label>Field 1</label>
      <input type="text" class="form-control">
    </div>
    <div class="form-group">
      <label>Field 2</label>
      <input type="text" class="form-control">
    </div>
  </div>
</div>
```

### Tables
```html
<table class="admin-table">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
      <td>
        <a href="#" class="btn btn-sm btn-primary">Edit</a>
        <a href="#" class="btn btn-sm btn-danger">Delete</a>
      </td>
    </tr>
  </tbody>
</table>
```

### Alerts
```html
<div class="alert alert-success">
  <i class="fas fa-check-circle"></i>
  Success message here
</div>

<div class="alert alert-danger">
  <i class="fas fa-exclamation-circle"></i>
  Error message here
</div>

<div class="alert alert-info">
  <i class="fas fa-info-circle"></i>
  Info message here
</div>

<div class="alert alert-warning">
  <i class="fas fa-warning"></i>
  Warning message here
</div>
```

### Badges
```html
<span class="badge badge-success">Active</span>
<span class="badge badge-danger">Inactive</span>
<span class="badge badge-info">Info</span>
<span class="badge badge-warning">Warning</span>
```

### Stats Cards
```html
<div class="stat-card">
  <h3>Total Items</h3>
  <p class="stat-number">1,234</p>
  <p class="stat-status">Last updated: today</p>
  <a href="#" class="stat-link">
    View all <i class="fas fa-arrow-right"></i>
  </a>
</div>
```

---

## Authentication

### All modules use `hybridAuth.js` middleware

**Login flow:**
1. User visits module
2. Redirected to `/login` if not authenticated
3. User submits credentials
4. Session cookie created
5. Redirected to protected route

**Usage in routes:**
```javascript
import { ensureAuthenticated } from '../middleware/hybridAuth.js';

app.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.user });
});
```

**Logout:**
```html
<a href="/logout" class="btn btn-danger">
  <i class="fas fa-sign-out-alt"></i> Logout
</a>
```

---

## Responsive Breakpoints

### Large Desktop (1024px+)
- Full-width sidebar (260px)
- All navigation visible
- Full layout

### Tablet (768px - 1023px)
- Sidebar narrows to 220px
- Layout adjusts

### Mobile (< 768px)
- Single column layout
- Sidebar hidden/toggle
- Navigation wraps
- Forms stack vertically
- Mobile-optimized nav

---

## Cloudinary Integration

**Available in all modules**

### Widget initialization
```javascript
<script src="/shared/js/cloudinary-widget.js"></script>
```

### Using in templates
```html
<div class="upload-area">
  <button class="btn btn-primary upload-btn">
    <i class="fas fa-upload"></i> Upload Image
  </button>
</div>
```

### API endpoints
```
POST /api/cloudinary/upload
```

---

## Back-to-Hub Button

**Shared partial:** `/shared/partials/back-to-hub.ejs`

**Include in all templates:**
```html
<%- include('../../shared/partials/back-to-hub') %>
```

**Features:**
- Fixed top-right corner
- Gold gradient background
- Arrow icon with hover animation
- Mobile responsive (hides text on small screens)
- High z-index (1000)

---

## Module CSS File Template

### Start with this structure:
```css
/* module-admin/public/css/admin.css */

/* Import shared base styles */
@import url('/shared/css/admin-base.css');

/* ============================================ */
/* MODULE-SPECIFIC STYLES */
/* ============================================ */

/* Cards */
.module-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  transition: var(--transition);
}

.module-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: var(--gold);
}

/* Grid layouts */
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

/* Responsive */
@media (max-width: 768px) {
  .module-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Common Issues & Solutions

### Issue: Styles not applying
**Solution:** Check if `/shared/css/admin-base.css` is imported

### Issue: Gold color not showing
**Solution:** Use `var(--gold)` instead of hardcoded color

### Issue: Inline styles causing conflicts
**Solution:** Move all styles to proper CSS files

### Issue: Back-to-hub button not visible
**Solution:** Ensure partial include is present and z-index is high

### Issue: Mobile layout broken
**Solution:** Check 768px and 1024px media queries

---

## File Paths Reference

```
/shared/css/admin-base.css          ← Main shared styles
/shared/partials/back-to-hub.ejs    ← Hub button include
/shared/js/cloudinary-widget.js     ← Image upload
/shared/cloudinary-manager/         ← API routes

concerts-admin/
  public/css/admin.css              ← Module styles
  views/partials/back-to-hub.ejs    ← Local copy

news-admin/
  public/css/news-admin.css
  views/partials/header.ejs

bio-admin/
  public/css/bio-admin.css
  views/pages/dashboard.ejs

gallery-admin/
  public/css/gallery-admin.css

press-admin/
  public/css/press-admin.css

contact-admin/
  public/css/admin.css              ← Needs refactoring
```

---

## Quick Integration Checklist

When creating or updating an admin module:

- [ ] Import `/shared/css/admin-base.css`
- [ ] Add Font Awesome 6.4.0 link
- [ ] Include back-to-hub partial
- [ ] Use `.admin-nav` or `.admin-layout` for structure
- [ ] Use CSS variable for colors
- [ ] Create module-specific CSS file
- [ ] Use hybridAuth middleware
- [ ] Add responsive breakpoints
- [ ] Test on mobile (768px)
- [ ] Test on tablet (1024px)
- [ ] Verify hub integration
- [ ] Check all links work
- [ ] Test authentication flow

---

## Module Status Summary

| Module | Status | Navigation | CSS | Hub Link |
|--------|--------|-----------|-----|----------|
| Concerts | ✅ GOOD | navbar | imported | ✅ Yes |
| News | ✅ GOOD | navbar | imported | ✅ Yes |
| Bio | ✅ GOOD | sidebar | imported | ✅ Yes |
| Contact | ❌ NEEDS WORK | custom | inline | ❌ No |
| Gallery | ✅ GOOD | navbar | imported | ✅ Yes |
| Press | ✅ GOOD | navbar | imported | ✅ Yes |
| Admin-Hub | ✅ GOOD | cards | inline | N/A |

