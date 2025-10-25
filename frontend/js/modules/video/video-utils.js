export function setupVideoClickHandlers() {
    document.querySelectorAll('.video-item').forEach(item => {
      item.addEventListener('click', () => {
        openVideoLightbox(`https://www.youtube.com/embed/${item.dataset.video}?autoplay=1`);
      });
    });
  }
  
  export function openVideoLightbox(url) {
    const frame = document.getElementById('video_frame');
    if (frame) frame.src = url;
  
    const lightbox = document.getElementById('video_lightbox');
    if (lightbox) {
      lightbox.style.display = 'block';
    }
    document.body.style.overflow = 'hidden';
  }
  
  export function closeVideoLightbox() {
    const lightbox = document.getElementById('video_lightbox');
    if (lightbox) {
      lightbox.style.display = 'none';
    }
  
    const frame = document.getElementById('video_frame');
    if (frame) frame.src = '';
  
    document.body.style.overflow = '';
  }