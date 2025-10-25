// concerts-admin/public/js/concerts-admin.js

class ConcertsManager {
  constructor() {
    this.cloudinaryWidget = null;
    this.currentConcertId = null;
    this.init();
  }
  
  init() {
    this.attachEventListeners();
    this.loadCloudinaryWidget();
  }
  
  attachEventListeners() {
    // Conferma eliminazione
    document.querySelectorAll('.btn-delete-concert').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const concertId = btn.dataset.concertId;
        const concertTitle = btn.dataset.concertTitle;
        this.confirmDelete(concertId, concertTitle);
      });
    });
    
    // Toggle dettagli concerti
    document.querySelectorAll('.btn-toggle-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.concert-card');
        const details = card.querySelector('.concert-details');
        details.classList.toggle('hidden');
        btn.textContent = details.classList.contains('hidden') ? 'Mostra dettagli' : 'Nascondi dettagli';
      });
    });
  }
  
 // CERCA questa funzione in concerts-admin.js e SOSTITUISCI

loadCloudinaryWidget() {
  if (typeof cloudinary === 'undefined') {
    console.warn('Cloudinary widget non caricato');
    return;
  }
  
  this.cloudinaryWidget = cloudinary.createUploadWidget({
    cloudName: 'dnwhnz2xy',
    uploadPreset: 'poster_vertical_unsigned',  // ✅ PRESET ESISTENTE
    folder: 'danielecamiz/posters/vertical',    // ✅ FOLDER GIÀ CONFIGURATO
    sources: ['local', 'url', 'camera'],
    multiple: false,
    resourceType: 'image',
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 5000000,
    cropping: false,
    styles: {
      palette: {
        window: "#1a1a1a",
        windowBorder: "#d6b25e",
        tabIcon: "#d6b25e",
        menuIcons: "#f1f1f1",
        textDark: "#000000",
        textLight: "#f1f1f1",
        link: "#d6b25e",
        action: "#d6b25e",
        inProgress: "#7aa2ff",
        complete: "#52d273",
        error: "#ff6b6b"
      }
    }
  }, (error, result) => {
    if (!error && result && result.event === 'success') {
      console.log('Upload completato:', result.info);
      this.handlePosterUpload(result.info);
    }
  });
}
  
  openPosterUpload(concertId) {
    this.currentConcertId = concertId;
    if (this.cloudinaryWidget) {
      this.cloudinaryWidget.open();
    } else {
      this.showToast('Widget Cloudinary non disponibile', 'error');
    }
  }
  
  async handlePosterUpload(uploadInfo) {
    try {
      const cloudinaryId = uploadInfo.public_id;
      const url = uploadInfo.secure_url;
      
      this.showToast('Salvataggio poster...', 'info');
      
      // Salva nel database
      const response = await fetch('/api/upload/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudinary_id: cloudinaryId,
          concert_id: this.currentConcertId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showToast('Poster caricato con successo!', 'success');
        
        // Aggiorna immagine nella card
        if (this.currentConcertId) {
          const card = document.querySelector(`[data-concert-id="${this.currentConcertId}"]`);
          if (card) {
            const posterImg = card.querySelector('.concert-poster');
            if (posterImg) {
              posterImg.src = url;
            }
          }
        }
        
        // Ricarica pagina dopo 1 secondo
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.showToast('Errore salvataggio: ' + result.message, 'error');
      }
      
    } catch (error) {
      console.error('Errore upload poster:', error);
      this.showToast('Errore durante il caricamento', 'error');
    }
  }
  
  async confirmDelete(concertId, concertTitle) {
    if (!confirm(`Sei sicuro di voler eliminare il concerto "${concertTitle}"?\n\nQuesta azione è irreversibile.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/concerts/${concertId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.showToast('Concerto eliminato', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.showToast('Errore: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Errore eliminazione:', error);
      this.showToast('Errore durante l\'eliminazione', 'error');
    }
  }
  
  showToast(message, type = 'info') {
    // Rimuovi toast esistenti
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 15px 25px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
      background: ${
        type === 'success' ? '#52d273' : 
        type === 'error' ? '#ff6b6b' : 
        '#7aa2ff'
      };
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }
  getPosterUrl(concert) {
  if (!concert.poster_cloudinary_id) {
    return '/images/placeholder-concert.jpg';
  }
  
  // URL Cloudinary corretto
  return `https://res.cloudinary.com/dnwhnz2xy/image/upload/c_fill,w_300,h_400,g_center/${concert.poster_cloudinary_id}`;
}
}

// Funzioni globali per onclick
function openPosterUpload(concertId) {
  if (window.concertsManager) {
    window.concertsManager.openPosterUpload(concertId);
  }
}

function deleteConcert(concertId, concertTitle) {
  if (window.concertsManager) {
    window.concertsManager.confirmDelete(concertId, concertTitle);
  }
}

// Inizializza
document.addEventListener('DOMContentLoaded', () => {
  window.concertsManager = new ConcertsManager();
});

// Animazioni CSS inline
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      transform: translateY(100px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideDown {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100px);
      opacity: 0;
    }
  }
  
  .concert-details {
    max-height: 500px;
    overflow: hidden;
    transition: max-height 0.3s ease;
  }
  
  .concert-details.hidden {
    max-height: 0;
  }
  
  .concert-poster {
    transition: opacity 0.3s ease;
  }
  
  .concert-poster:hover {
    opacity: 0.9;
  }
`;
document.head.appendChild(style);