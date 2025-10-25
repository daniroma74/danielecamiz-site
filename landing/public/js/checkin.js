// checkin.js - QR Scanner con fix camera

let scannerActive = false;
let video = null;
let canvas = null;
let ctx = null;

document.addEventListener('DOMContentLoaded', function() {
  video = document.getElementById('video');
  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d');
  
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const scanArea = document.getElementById('scanArea');
  const resultDiv = document.getElementById('result');
  
  startBtn.addEventListener('click', async () => {
    try {
      await startScanner();
      startBtn.style.display = 'none';
      stopBtn.style.display = 'inline-flex';
      scanArea.style.display = 'block';
      resultDiv.style.display = 'none';
    } catch (error) {
      showResult('Errore accesso fotocamera: ' + error.message, false);
    }
  });
  
  stopBtn.addEventListener('click', () => {
    stopScanner();
    startBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
    scanArea.style.display = 'none';
  });
});

async function startScanner() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    });
    
    video.srcObject = stream;
    await video.play();
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    scannerActive = true;
    scanQRCode();
  } catch (error) {
    console.error('Camera access error:', error);
    throw new Error('Impossibile accedere alla fotocamera. Verifica i permessi del browser.');
  }
}

function stopScanner() {
  scannerActive = false;
  
  if (video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }
}

function scanQRCode() {
  if (!scannerActive) return;
  
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
      scannerActive = false;
      processQRCode(code.data);
      return;
    }
  }
  
  requestAnimationFrame(scanQRCode);
}

async function processQRCode(data) {
  try {
    const bookingCode = data.trim();
    
    const response = await fetch(`/api/checkin/${EVENT_SLUG}/${bookingCode}`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showResult(`✓ Check-in confermato: ${result.booking.first_name} ${result.booking.last_name || ''} (${result.booking.seats} posti)`, true);
      
      setTimeout(() => {
        if (confirm('Scansiona altro QR?')) {
          document.getElementById('startBtn').click();
        }
      }, 2000);
    } else {
      showResult('✗ ' + result.message, false);
      setTimeout(() => {
        if (confirm('Riprova?')) {
          document.getElementById('startBtn').click();
        }
      }, 2000);
    }
  } catch (error) {
    showResult('Errore di connessione', false);
  }
}

function showResult(message, success) {
  const resultDiv = document.getElementById('result');
  resultDiv.className = success ? 'success' : 'error';
  resultDiv.innerHTML = `<h3>${message}</h3>`;
  resultDiv.style.display = 'block';
}