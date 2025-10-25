// campaign-editor.js - PULITO SENZA HERO

function updatePreview() {
  const content = (window.tinymce && tinymce.activeEditor) ? tinymce.activeEditor.getContent() : '';
  document.getElementById('preview-content').innerHTML = content || '<p style="color:#999;text-align:center;">Scrivi qui...</p>';
  
  const footerField = document.getElementById('footer-text');
  if (footerField) {
    document.getElementById('preview-footer').innerHTML = footerField.value || '© 2025 ICNT';
  }
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
    const footer = document.getElementById('footer-text').value;

    let fullContent = '';
    if (preheader) {
      fullContent += `<div style="display:none;font-size:1px;color:#fff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`;
    }
    fullContent += content;
    if (footer) {
      fullContent += `<div style="margin-top:40px;padding-top:20px;border-top:1px solid #ddd;text-align:center;color:#666;font-size:14px;">${footer}</div>`;
    }

    const data = {
      id: document.getElementById('campaign-id').value || null,
      name: document.getElementById('campaign-name').value,
      subject: document.getElementById('campaign-subject').value,
      preheader: preheader,
      content: fullContent
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