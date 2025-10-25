export function renderVideoTitles(lang) {
    const labels = window.videoLabels || {};
  
    const videoTitleEl = document.getElementById('video_title');
    if (videoTitleEl) videoTitleEl.textContent = labels.title || 'Video';
  
    const videoClaimEl = document.getElementById('video_claim');
    if (videoClaimEl) videoClaimEl.textContent = labels.claim || '';
  
    const video1TitleEl = document.getElementById('video_1_title');
    if (video1TitleEl) video1TitleEl.textContent = labels.video1_title || 'Video 1';
  
    const video2TitleEl = document.getElementById('video_2_title');
    if (video2TitleEl) video2TitleEl.textContent = labels.video2_title || 'Video 2';
  }