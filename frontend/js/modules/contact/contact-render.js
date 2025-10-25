import { loadContactData, contactData } from './contact-utils.js';

export async function renderContact(lang) {
  await loadContactData(lang);
  const data = contactData[lang];
  const lbl = window.labels[lang];

  const avatarEl = document.getElementById('contact_avatar');
  if (avatarEl) {
    avatarEl.src = data.avatar || '/img/daniele-camiz-foto-profilo.png';
    avatarEl.alt = data.title || '';
  }

  const titleEl = document.getElementById('contact_title');
  if (titleEl) titleEl.textContent = data.title || '';

  const roleEl = document.getElementById('contact_role');
  if (roleEl) roleEl.textContent = data.role || '';

  const highlightsTitleEl = document.getElementById('contact_highlights_title');
  if (highlightsTitleEl) highlightsTitleEl.textContent = data.highlightsTitle || lbl.highlights_title || '';

  const highlightsDiv = document.getElementById('contact_highlights');
  if (highlightsDiv) {
    highlightsDiv.innerHTML = '';
    if (data.highlights && data.highlights.length > 0) {
      data.highlights.forEach(link => {
        if (link.isYouTube) {
          highlightsDiv.innerHTML += `
            <a href="${link.url}" target="_blank" rel="noopener" class="linktree-btn youtube-link">
              <img class="linktree-youtube-thumbnail" data-alt="${lbl.youtube_preview_alt || 'YouTube preview'}" alt="${lbl.youtube_preview_alt || 'YouTube preview'}" />
              <img src="${link.icon}" alt="${link.alt}" class="icon" />
              ${link.text}
            </a>
          `;
        } else {
          highlightsDiv.innerHTML += `
            <a href="${link.url}" target="_blank" rel="noopener" class="linktree-btn">
              <img src="${link.icon}" alt="${link.alt}" class="icon" />
              ${link.text}
            </a>
          `;
        }
      });
    } else {
      highlightsDiv.textContent = lbl.no_highlights || 'No highlighted links';
    }
  }

  const onlineTitleEl = document.getElementById('contact_online_title');
  if (onlineTitleEl) onlineTitleEl.textContent = data.onlineTitle || lbl.online_title || '';

  const socialDiv = document.getElementById('contact_social');
  if (socialDiv) {
    socialDiv.innerHTML = '';
    if (data.socialLinks && data.socialLinks.length > 0) {
      data.socialLinks.forEach(link => {
        socialDiv.innerHTML += `
          <a class="linktree-btn" href="${link.url}" target="_blank" rel="noopener">
            <img src="${link.iconGold}" alt="${link.altGold}" class="icon gold" />
            <img src="${link.iconBlack}" alt="${link.altBlack}" class="icon black" />
            ${link.text}
          </a>
        `;
      });
    } else {
      socialDiv.textContent = lbl.no_social || 'No social links';
    }
  }

  const extraTitleEl = document.getElementById('contact_extra_title');
  if (extraTitleEl) extraTitleEl.textContent = data.extraTitle || lbl.extra_title || '';

  const extraDiv = document.getElementById('contact_extra');
  if (extraDiv) {
    extraDiv.innerHTML = '';
    if (data.extraLinks && data.extraLinks.length > 0) {
      data.extraLinks.forEach(link => {
        extraDiv.innerHTML += `
          <a class="linktree-btn" href="${link.url}" target="_blank" rel="noopener">
            <img src="${link.iconGold}" alt="${link.altGold}" class="icon gold" />
            <img src="${link.iconBlack}" alt="${link.altBlack}" class="icon black" />
            ${link.text}
          </a>
        `;
      });
    } else {
      extraDiv.textContent = lbl.no_extra_links || 'No extra links';
    }
  }

  // YouTube thumbnails preview
  setTimeout(() => {
    const ytLinks = document.querySelectorAll('.youtube-link');
    ytLinks.forEach(link => {
      const url = link.href;
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
      if (match && match[1]) {
        const videoId = match[1];
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        const img = link.querySelector('.linktree-youtube-thumbnail');
        if (img) {
          img.src = thumbnailUrl;
          img.alt = img.getAttribute('data-alt') || 'YouTube preview';
        }
      }
    });
  }, 50);
}