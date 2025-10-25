// shared/config/editor-config.js
// Config TinyMCE condivisa + upload Cloudinary (Promise-based per TinyMCE 8)

const TINYMCE_SHARED_CONFIG = {
  base_url: '/shared/vendor/tinymce',
  suffix: '.min',

  default: {
    license_key: 'gpl',
    height: 500,
    menubar: false,
    promotion: false,
    branding: false,
    automatic_uploads: true,
    plugins: [
      'advlist','autolink','lists','link','image',
      'charmap','preview','anchor','searchreplace',
      'visualblocks','code','fullscreen','media',
      'table','help','wordcount'
    ],
    toolbar:
      'undo redo | formatselect | ' +
      'bold italic underline | alignleft aligncenter alignright | ' +
      'bullist numlist | link image | removeformat | table | code | help'
  },

  // ✅ NEWSLETTER: Light mode pulito
  newsletter: {
    license_key: 'gpl',
    promotion: false,
    branding: false,
    height: 450,
    menubar: false,
    plugins: ['lists','link','image','code','table'],
    toolbar: 'bold italic underline | link image | bullist numlist | table | code',
    // ✅ Niente skin dark o content_css dark
    content_style: `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: #333;
        background: white;
        padding: 16px;
      }
      img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
      }
    `
  },

  // CONCERTS: Dark mode (se usato)
  concerts: {
    license_key: 'gpl',
    promotion: false,
    branding: false,
    height: 500,
    menubar: false,
    skin: 'oxide-dark',
    content_css: 'dark',
    plugins: [
      'advlist','autolink','lists','link','image',
      'charmap','preview','anchor','searchreplace',
      'visualblocks','code','fullscreen','media',
      'table','help','wordcount'
    ],
    toolbar:
      'undo redo | formatselect | ' +
      'bold italic underline | alignleft aligncenter alignright | ' +
      'bullist numlist | link image | removeformat | table | code | help'
  },

  blog: {
    license_key: 'gpl',
    promotion: false,
    branding: false,
    height: 600,
    menubar: true,
    plugins: [
      'advlist','autolink','lists','link','image',
      'charmap','preview','anchor','searchreplace',
      'visualblocks','code','fullscreen','insertdatetime',
      'media','table','help','wordcount','emoticons'
    ]
  }
};

function initSharedEditor(selector, preset = 'default', customConfig = {}) {
  const baseConfig = TINYMCE_SHARED_CONFIG[preset] || TINYMCE_SHARED_CONFIG.default;

  // Handler di upload che RITORNA una Promise (richiesto da TinyMCE 8)
  const promiseUploadHandler = function (blobInfo, success, failure /*, progress */) {
    const getOpts = (typeof customConfig.getUploadOptions === 'function')
      ? customConfig.getUploadOptions
      : () => ({ preset: 'gallery_unsigned', folder: 'danielecamiz/newsletter' });

    const opts = getOpts() || {};

    if (!window.CloudinaryManager) {
      if (typeof failure === 'function') failure('CloudinaryManager non disponibile');
      return Promise.reject(new Error('CloudinaryManager non disponibile'));
    }

    return window.CloudinaryManager
      .upload(blobInfo.blob(), opts)
      .then(r => {
        if (!r.success) {
          if (typeof failure === 'function') failure(r.error || 'Upload fallito');
          throw new Error(r.error || 'Upload fallito');
        }
        if (typeof success === 'function') success(r.url);
        return r.url;
      })
      .catch(err => {
        if (typeof failure === 'function') failure(err.message || 'Errore upload');
        throw err;
      });
  };

  const finalConfig = {
    selector,
    base_url: TINYMCE_SHARED_CONFIG.base_url,
    suffix: TINYMCE_SHARED_CONFIG.suffix,
    license_key: 'gpl',
    promotion: false,  // ✅ FORZATO anche qui
    branding: false,   // ✅ FORZATO anche qui
    ...baseConfig,
    images_upload_handler: customConfig.images_upload_handler || promiseUploadHandler,
    ...customConfig
  };

  return tinymce.init(finalConfig);
}

window.SharedEditor = { init: initSharedEditor, config: TINYMCE_SHARED_CONFIG };