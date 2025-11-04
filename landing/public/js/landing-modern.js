// landing/public/js/landing-modern.js

// Countdown timer
if (window.EVENT_DATA && document.getElementById('countdown')) {
  const eventDateTime = new Date(`${window.EVENT_DATA.date}T${window.EVENT_DATA.time}:00`);
  let countdownInterval;

  function updateCountdown() {
    const now = new Date();
    const diff = eventDateTime - now;

    if (diff <= 0) {
      document.getElementById('countdown').innerHTML = '<p class="countdown-ended">L\'evento è terminato!</p>';
      // Stop the interval to prevent further updates
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // Ensure we have the DOM elements before updating
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');

    if (daysEl) daysEl.textContent = days;
    if (hoursEl) hoursEl.textContent = hours;
    if (minutesEl) minutesEl.textContent = minutes;
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 60000);
}

// Booking form
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Invio in corso...';
    
    const formData = {
      first_name: document.getElementById('first_name').value,
      last_name: document.getElementById('last_name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      seats: parseInt(document.getElementById('seats').value),
      note: document.getElementById('note').value,
      privacy_consent: document.getElementById('privacy_consent').checked,
      newsletter_consent: document.getElementById('newsletter_consent').checked,
      language: 'it'
    };
    
    try {
      const response = await fetch(`/api/booking/${window.EVENT_DATA.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        showBookingSuccess(result.bookingCode, result.remainingSeats);
        bookingForm.reset();
        await updateBookingStats();
      } else {
        showBookingError(result.message || 'Errore durante la prenotazione');
      }
    } catch (error) {
      console.error('Booking error:', error);
      showBookingError('Errore di connessione. Riprova.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// Aggiorna statistiche prenotazioni
async function updateBookingStats() {
  if (!window.EVENT_DATA) return;
  
  try {
    const response = await fetch(`/api/booking/${window.EVENT_DATA.slug}/stats`);
    const result = await response.json();
    
    if (result.success && result.stats) {
      // Aggiorna contatore posti rimanenti
      const remainingEl = document.querySelector('.remaining-seats');
      if (remainingEl) {
        remainingEl.textContent = result.stats.remaining_seats;
      }
      
      // Aggiorna barra capacità
      const capacityBar = document.querySelector('.capacity-fill');
      if (capacityBar) {
        capacityBar.style.width = `${result.stats.fill_percentage}%`;
        capacityBar.textContent = `${result.stats.fill_percentage}%`;
      }
      
      // Aggiorna contatore totale
      const totalSeatsEl = document.querySelector('.total-seats');
      if (totalSeatsEl) {
        totalSeatsEl.textContent = result.stats.total_seats;
      }
    }
  } catch (error) {
    console.error('Stats update error:', error);
  }
}

// Mostra successo prenotazione
function showBookingSuccess(bookingCode, remainingSeats) {
  const resultDiv = document.getElementById('bookingResult');
  if (!resultDiv) return;
  
  resultDiv.className = 'booking-result success';
  resultDiv.innerHTML = `
    <div class="result-icon">
      <i class="fas fa-check-circle"></i>
    </div>
    <h3>Prenotazione Confermata!</h3>
    <p>Il tuo codice prenotazione:</p>
    <div class="booking-code">${bookingCode}</div>
    <p>Ti abbiamo inviato un'email di conferma con il QR Code.</p>
    ${remainingSeats !== undefined ? `<p class="remaining-info"><i class="fas fa-info-circle"></i> Posti rimanenti: <strong>${remainingSeats}</strong></p>` : ''}
  `;
  resultDiv.style.display = 'block';
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Mostra errore prenotazione
function showBookingError(message) {
  const resultDiv = document.getElementById('bookingResult');
  if (!resultDiv) return;
  
  resultDiv.className = 'booking-result error';
  resultDiv.innerHTML = `
    <div class="result-icon">
      <i class="fas fa-exclamation-circle"></i>
    </div>
    <h3>Errore</h3>
    <p>${message}</p>
  `;
  resultDiv.style.display = 'block';
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// FAQ toggle
function toggleFaq(btn) {
  const item = btn.parentElement;
  const isOpen = item.classList.contains('active');
  
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
  
  if (!isOpen) {
    item.classList.add('active');
  }
}

// Share functions
function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

function shareOnTwitter() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(document.title);
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
}

function shareOnWhatsApp() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(document.title);
  window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
}

function shareViaEmail() {
  const subject = encodeURIComponent(document.title);
  const body = encodeURIComponent(`Ti segnalo questo concerto: ${window.location.href}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    const btn = event.target.closest('.share-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> <span>Copiato!</span>';
    setTimeout(() => {
      btn.innerHTML = originalText;
    }, 2000);
  }).catch(() => {
    alert('Errore nella copia del link');
  });
}

// Carica statistiche all'avvio
if (window.EVENT_DATA && document.getElementById('bookingForm')) {
  updateBookingStats();
}

// Smooth scroll per link interni
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});