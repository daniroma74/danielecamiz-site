# TinyMCE Language Files

This directory contains language translation files for TinyMCE editor.

## Required: Italian Language Pack

To fix the console errors about missing `it.js`, download the Italian language pack:

### Download Instructions

**Option 1 - Using curl:**
```bash
curl -o shared/vendor/tinymce/langs/it.js "https://cdn.jsdelivr.net/npm/tinymce-i18n@24.6.24/langs/it.js"
```

**Option 2 - Using wget:**
```bash
wget -O shared/vendor/tinymce/langs/it.js "https://cdn.jsdelivr.net/npm/tinymce-i18n/langs6/it.js"
```

**Option 3 - Manual download:**
1. Visit: https://www.tiny.cloud/get-tiny/language-packages/
2. Download the language pack for TinyMCE 6+ (compatible with v8)
3. Extract `it.js` from the zip
4. Place it in this directory: `shared/vendor/tinymce/langs/it.js`

**Option 4 - NPM package:**
```bash
npm install tinymce-i18n
cp node_modules/tinymce-i18n/langs6/it.js shared/vendor/tinymce/langs/
```

### Verify Installation

After downloading, verify the file:
```bash
ls -lh shared/vendor/tinymce/langs/it.js
# Should show a file of approximately 6-10KB
```

The file should contain JavaScript code like:
```javascript
tinymce.addI18n('it', {
  // ... translations
});
```

## Notes

- TinyMCE 8.x does not include language files by default
- The `it.js` file is required to avoid console errors when TinyMCE tries to load Italian translations
- The current configuration uses `license_key: 'gpl'` which is correct
- Language files are loaded automatically based on the browser/editor language setting
