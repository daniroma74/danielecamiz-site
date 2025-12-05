// campaign-editor.js - EDITOR COMPLETO CON HEADER/CONTENT/FOOTER

function updatePreview() {
  // Update content
  const content = (window.tinymce && tinymce.activeEditor) ? tinymce.activeEditor.getContent() : '';
  document.getElementById('preview-content').innerHTML = content || '<p style="color:#999;text-align:center;">Il contenuto apparirà qui...</p>';

  // Update header
  const headerBg = document.getElementById('header-bg-text').value;
  const headerTitle = document.getElementById('header-title').value;
  const headerSubtitle = document.getElementById('header-subtitle').value;

  const previewHeader = document.getElementById('preview-header');
  if (previewHeader) {
    previewHeader.style.background = headerBg;
  }

  const previewHeaderTitle = document.getElementById('preview-header-title');
  if (previewHeaderTitle) {
    previewHeaderTitle.textContent = headerTitle || 'ICNT - I Concerti nel Tempio';
  }

  const previewHeaderSubtitle = document.getElementById('preview-header-subtitle');
  if (previewHeaderSubtitle) {
    previewHeaderSubtitle.textContent = headerSubtitle || 'La stagione della Chiesa valdese di piazza Cavour';
  }

  // Update footer
  const footerText = document.getElementById('footer-text').value;
  const footerBg = document.getElementById('footer-bg-text').value;

  const previewFooterCustom = document.getElementById('preview-footer-custom');
  if (previewFooterCustom) {
    previewFooterCustom.innerHTML = footerText ? `<p style="margin: 0 0 20px 0; color: #aaa; font-size: 14px; line-height: 1.5;">${footerText.replace(/\n/g, '<br>')}</p>` : '';
  }

  const previewFooter = document.getElementById('preview-footer');
  if (previewFooter) {
    previewFooter.style.background = footerBg;
  }
}

function updateFooterBackground() {
  const color = document.getElementById('footer-bg-picker').value;
  document.getElementById('footer-bg-text').value = color;
  updatePreview();
}

function syncFooterBgFromText() {
  const color = document.getElementById('footer-bg-text').value;
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    document.getElementById('footer-bg-picker').value = color;
  }
  updatePreview();
}

function updateHeaderBackground() {
  const color = document.getElementById('header-bg-picker').value;
  document.getElementById('header-bg-text').value = color;
  updatePreview();
}

function syncHeaderBgFromText() {
  const color = document.getElementById('header-bg-text').value;
  if (/^#[0-9A-F]{6}$/i.test(color)) {
    document.getElementById('header-bg-picker').value = color;
  }
  updatePreview();
}


function setPreviewMode(mode, btn) {
  document.querySelectorAll('.preview-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('email-preview').className = 'email-preview ' + mode;
}

function testEmail() {
  const id = document.getElementById('campaign-id').value;
  if (!id) return alert('⚠️ Prima salva la campagna');
  const email = prompt('📧 Email test:');
  if (!email) return;
  fetch(`/admin/campaign/${id}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_email: email })
  }).then(r => r.json()).then(result => {
    if (result.success) alert('✅ Test inviato');
    else alert('❌ ' + result.error);
  });
}

function sendToAll() {
  const id = document.getElementById('campaign-id').value;
  if (!id) return alert('⚠️ Prima salva');
  if (!confirm('⚠️ Inviare a TUTTI?')) return;
  if (!confirm('⚠️ SEI SICURO?')) return;
  fetch(`/admin/campaign/${id}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  }).then(r => r.json()).then(result => {
    if (result.success) {
      alert(`✅ Inviata a ${result.sent} destinatari!`);
      window.location.href = '/admin/campaigns';
    } else {
      alert('❌ ' + result.error);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // FORM SUBMIT
  document.getElementById('campaign-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const preheader = document.getElementById('campaign-preheader').value;
    const content = tinymce.activeEditor ? tinymce.activeEditor.getContent() : '';

    // Salva SOLO il contenuto puro di TinyMCE
    // Il backend aggiungerà preheader e footer quando invia
    const data = {
      id: document.getElementById('campaign-id').value || null,
      name: document.getElementById('campaign-name').value,
      subject: document.getElementById('campaign-subject').value,
      preheader: preheader,
      content: content,
      header_bg: document.getElementById('header-bg-text').value || '#667eea',
      header_title: document.getElementById('header-title').value || 'ICNT - I Concerti nel Tempio',
      header_subtitle: document.getElementById('header-subtitle').value || 'La stagione della Chiesa valdese di piazza Cavour',
      footer_bg: document.getElementById('footer-bg-text').value || '#f9f9f9',
      footer_text: document.getElementById('footer-text').value || ''
    };

    try {
      const response = await fetch('/admin/campaign/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (result.success) {
        alert('✅ Salvata!');
        if (!data.id && result.id) window.location.href = `/admin/campaign/${result.id}/edit`;
      } else {
        alert('❌ ' + result.error);
      }
    } catch {
      alert('❌ Errore connessione');
    }
  });

  // INIT TINYMCE
  // INIT TINYMCE
  tinymce.init({
    selector: '#content-editor',
    license_key: 'gpl',
    promotion: false,
    branding: false,
    height: 450,
    menubar: false,
    plugins: ['lists','link','image','code','table'],

    // ✅ TOOLBAR CON BOTTONE CLOUDINARY
    toolbar: 'undo redo | blocks | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link cloudinaryImage image | removeformat code',

    block_formats: 'Paragrafo=p; Titolo 1=h1; Titolo 2=h2; Titolo 3=h3',

    // ✅ INLINE STYLES - Forza TinyMCE a usare style inline invece di tag semantici
    formats: {
      bold: { inline: 'span', styles: { fontWeight: 'bold' } },
      italic: { inline: 'span', styles: { fontStyle: 'italic' } },
      underline: { inline: 'span', styles: { textDecoration: 'underline' } },
      forecolor: { inline: 'span', styles: { color: '%value' } },
      hilitecolor: { inline: 'span', styles: { backgroundColor: '%value' } },
    },

    // ✅ Aggiungi stili di base come inline quando ottieni il contenuto
    valid_styles: {
      '*': 'font-family,font-size,font-weight,font-style,text-decoration,text-align,color,background-color,margin,padding,border,width,height,max-width,display,line-height'
    },

    content_style: `
      body { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333; background: white; padding: 16px; }
      p { color: #333; margin: 0 0 1em 0; }
      h1 { color: #333; font-size: 32px; margin: 1em 0 0.5em 0; font-weight: 700; }
      h2 { color: #667eea; font-size: 24px; margin: 1em 0 0.5em 0; font-weight: 600; }
      h3 { color: #333; font-size: 20px; margin: 1em 0 0.5em 0; font-weight: 600; }
      img { max-width: 100%; height: auto; }
      a { color: #667eea; }
    `,
    
    images_upload_handler: async function (blobInfo, success, failure) {
      try {
        if (!window.CloudinaryManager) {
          failure('CloudinaryManager non disponibile');
          return;
        }
        const result = await CloudinaryManager.upload(blobInfo.blob(), {
          preset: 'gallery_unsigned',
          folder: 'danielecamiz/newsletter'
        });
        if (result.success) success(result.url);
        else failure(result.error || 'Upload fallito');
      } catch (error) {
        failure(error.message);
      }
    },
    
    // ✅ SETUP CON BOTTONE CLOUDINARY
    setup: function(editor) {
      // Registra bottone custom
      editor.ui.registry.addButton('cloudinaryImage', {
        text: '📸 Cloudinary',
        tooltip: 'Scegli immagine da Cloudinary',
        onAction: function() {
          console.log('🔍 Bottone Cloudinary cliccato');
          console.log('CloudinaryManager disponibile?', typeof CloudinaryManager);
          
          if (typeof CloudinaryManager !== 'undefined' && CloudinaryManager.showImageDialog) {
            CloudinaryManager.showImageDialog((result) => {
              console.log('✅ Immagine selezionata:', result.url);
              editor.insertContent(`<img src="${result.url}" alt="" style="max-width: 100%; height: auto;">`);
            }, {
              folder: 'danielecamiz/newsletter'
            });
          } else {
            console.error('❌ CloudinaryManager.showImageDialog non trovato');
            alert('❌ CloudinaryManager non disponibile');
          }
        }
      });
      
      editor.on('init change keyup', updatePreview);
    }
  }).then(() => {
    console.log('✅ TinyMCE OK');
    updatePreview();
  });
});