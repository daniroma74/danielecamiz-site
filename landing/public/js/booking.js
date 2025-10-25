// Gestione form prenotazione
document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = e.target.querySelector('.btn-book');
  const originalText = btn.textContent;
  btn.textContent = 'Invio in corso...';
  btn.disabled = true;
  
  const data = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    quantity: document.getElementById('quantity').value,
    event_id: document.getElementById('event_id').value,
    privacy_consent: document.getElementById('privacy_consent').checked,
    newsletter_consent: document.getElementById('newsletter_consent').checked
  };
  
  try {
    const response = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccessModal();
      e.target.reset();
      updateCounter();
    } else {
      alert('Errore: ' + (result.error || 'Riprova'));
    }
  } catch (error) {
    alert('Errore nella prenotazione. Riprova.');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// Aggiorna contatore
async function updateCounter() {
  const eventId = document.getElementById('event_id')?.value;
  if (!eventId) return;
  
  try {
    const response = await fetch(`/api/count/${eventId}`);
    const data = await response.json();
    
    document.getElementById('counter-value').textContent = data.count;
    
    // Aggiorna barra capacità
    const maxCapacity = parseInt(document.getElementById('max-capacity').value);
    const percentage = Math.min((data.count / maxCapacity) * 100, 100);
    const fillBar = document.querySelector('.capacity-fill');
    if (fillBar) {
      fillBar.style.width = percentage + '%';
      fillBar.textContent = Math.round(percentage) + '%';
    }
    
    // Ricarica pagina dopo 1.5 secondi
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
  } catch (error) {
    console.error('Error updating counter:', error);
  }
}

// Modal successo
function showSuccessModal() {
  const modal = document.getElementById('success-overlay');
  modal.classList.add('show');
}

function closeSuccess() {
  document.getElementById('success-overlay').classList.remove('show');
}

// Cookie banner
if (!localStorage.getItem('cookies-accepted')) {
  setTimeout(() => {
    const banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'block';
  }, 1000);
}

function acceptCookies() {
  localStorage.setItem('cookies-accepted', 'true');
  document.getElementById('cookie-banner').style.display = 'none';
}

// Share functions
function shareOnFacebook() {
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
}

function shareOnWhatsApp() {
  window.open(`https://wa.me/?text=${encodeURIComponent(document.title + ' ' + window.location.href)}`, '_blank');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href);
  alert('Link copiato!');
}
