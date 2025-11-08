#!/bin/bash

# Script to update gallery-admin and press-admin pages with unified navbar

echo "Updating gallery-admin pages..."

# Gallery Admin navbar config
GALLERY_NAVBAR='  <!-- Unified Navigation -->
  <%- include('"'"'../../../shared/partials/admin-navbar'"'"', {
    moduleName: '"'"'Gallery Admin'"'"',
    moduleIcon: '"'"'fa-images'"'"',
    moduleUrl: '"'"'/gallery'"'"',
    links: [
      { url: '"'"'/gallery'"'"', label: '"'"'Dashboard'"'"', icon: '"'"'fa-chart-line'"'"', active: currentPath === '"'"'/gallery'"'"' || currentPath === '"'"'/'"'"' },
      { url: '"'"'/gallery/collections'"'"', label: '"'"'Collezioni'"'"', icon: '"'"'fa-folder'"'"', active: currentPath.startsWith('"'"'/gallery/collections'"'"') },
      { url: '"'"'/gallery/photos'"'"', label: '"'"'Foto'"'"', icon: '"'"'fa-camera'"'"', active: currentPath.startsWith('"'"'/gallery/photos'"'"') },
      { url: '"'"'/gallery/videos'"'"', label: '"'"'Video'"'"', icon: '"'"'fa-film'"'"', active: currentPath.startsWith('"'"'/gallery/videos'"'"') },
      { url: '"'"'/gallery/audios'"'"', label: '"'"'Audio'"'"', icon: '"'"'fa-music'"'"', active: currentPath.startsWith('"'"'/gallery/audios'"'"') }
    ]
  }) %>

  <main class="content-area" style="padding: 2rem;">'

# Press Admin navbar config
PRESS_NAVBAR='  <!-- Unified Navigation -->
  <%- include('"'"'../../../shared/partials/admin-navbar'"'"', {
    moduleName: '"'"'Press Admin'"'"',
    moduleIcon: '"'"'fa-newspaper'"'"',
    moduleUrl: '"'"'/press'"'"',
    links: [
      { url: '"'"'/press'"'"', label: '"'"'Dashboard'"'"', icon: '"'"'fa-chart-line'"'"', active: currentPath === '"'"'/press'"'"' },
      { url: '"'"'/press/articles'"'"', label: '"'"'Articoli'"'"', icon: '"'"'fa-file-alt'"'"', active: currentPath.startsWith('"'"'/press/articles'"'"') },
      { url: '"'"'/press/quotes'"'"', label: '"'"'Citazioni'"'"', icon: '"'"'fa-quote-right'"'"', active: currentPath.startsWith('"'"'/press/quotes'"'"') }
    ]
  }) %>

  <main class="content-area" style="padding: 2rem;">'

echo "Gallery Admin and Press Admin navbar configs created"
echo "Files to update:"
echo "  gallery-admin/views/pages/*.ejs"
echo "  press-admin/views/pages/*.ejs"
echo ""
echo "Pattern to replace:"
echo "  - Remove back-to-hub include"
echo "  - Remove sidebar and header includes"
echo "  - Add Font Awesome CDN link"
echo "  - Replace opening body structure with navbar"
echo "  - Fix closing tags (remove extra div closings)"
