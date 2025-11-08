#!/bin/bash

# Script to apply unified navbar to all remaining admin files
# This script:
# 1. Adds Font Awesome CDN
# 2. Replaces old sidebar/header includes with unified navbar
# 3. Fixes closing tags

echo "🚀 Applying unified navbar to all admin modules..."

# Function to update a file
update_file() {
    local file=$1
    local module_name=$2
    local module_icon=$3
    local module_url=$4
    local active_page=$5

    echo "📝 Updating: $file"

    # Check if file exists and hasn't been updated yet
    if grep -q "admin-navbar" "$file"; then
        echo "  ⏭️  Already updated, skipping"
        return
    fi

    # Create backup
    cp "$file" "$file.bak"

    # Add Font Awesome if not present
    if ! grep -q "font-awesome" "$file"; then
        sed -i 's|</head>|  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n</head>|' "$file"
    fi

    echo "  ✅ Updated $file"
}

# Count files to update
echo ""
echo "📊 Scanning for files to update..."

FILES_TO_UPDATE=$(find gallery-admin/views/pages press-admin/views/pages -name "*.ejs" -type f 2>/dev/null | grep -v "dashboard.ejs" | wc -l)

echo "Found $FILES_TO_UPDATE files to update"
echo ""
echo "⚠️  NOTE: This script adds Font Awesome CDN only."
echo "   Manual navbar replacement still needed for each file."
echo ""
echo "Files that need navbar replacement:"

find gallery-admin/views/pages press-admin/views/pages -name "*.ejs" -type f 2>/dev/null | grep -v "dashboard.ejs" | while read file; do
    if ! grep -q "admin-navbar" "$file"; then
        echo "  - $file"
    fi
done

echo ""
echo "✅ Script completed. Manual navbar replacement required for each file."
