// frontend/js/modules/home/home-video.js
// Popola la sezione "Ultimi video" usando il proxy server-side: /api/youtube/latest
// Convenzioni: id snake_case, classi kebab-case, nomi in inglese.

function createVideoCard(item) {
  const card = document.createElement('article');
  card.className = 'video-card';

  const iframe = document.createElement('iframe');
  iframe.className = 'video-frame';
  iframe.width = '560';
  iframe.height = '315';
  iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(item.id)}`;
  iframe.title = item.title || 'YouTube video';
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  iframe.setAttribute('allowfullscreen', '');

  card.appendChild(iframe);

  if (item.title) {
    const h4 = document.createElement('h4');
    h4.className = 'video-title';
    h4.textContent = item.title;
    card.appendChild(h4);
  }
  return card;
}

export async function initHomeVideos(max = 3) {
  const wrap = document.getElementById('youtube_videos');
  if (!wrap) return;

  try {
    wrap.innerHTML = '';
    const res = await fetch(`/api/youtube/latest?max=${max}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();

    if (!Array.isArray(items) || !items.length) {
      wrap.innerHTML = `<p class="empty-state">${(window.lang === 'it') ? 'Nessun video disponibile.' : 'No videos available.'}</p>`;
      return;
    }

    items.forEach(v => wrap.appendChild(createVideoCard(v)));
  } catch (err) {
    console.error('home-video:', err);
    wrap.innerHTML = `<p class="empty-state">${(window.lang === 'it') ? 'Errore nel caricamento dei video.' : 'Error loading videos.'}</p>`;
  }
}
