export async function loadProjects() {
  const projectTitleEl = document.getElementById('projects_title');
  if (projectTitleEl) projectTitleEl.textContent = window.labels[window.lang]?.home?.projects_title || 'My Projects';

  const projectGrid = document.getElementById('projects_grid');
  if (!projectGrid) {
    console.warn('projects_grid element not found');
    return;
  }

  try {
    const lang = window.lang || 'it';
    const res = await fetch(`/data/home-${lang}.json`);
    if (!res.ok) throw new Error(`Error loading home-${lang}.json`);

    const data = await res.json();

    projectGrid.innerHTML = '';
    (data.projects || []).forEach(p => {
      const box = document.createElement('div');
      box.className = 'project_box';
      box.id = p.id;

      let linksHtml = '';
      if (p.links) {
        linksHtml = p.links.map(link => `<a class="btn" href="${link.url}" target="_blank" rel="noopener">${link.text}</a>`).join('');
      } else if (p.btnUrl && p.btnText) {
        linksHtml = `<a class="btn" href="${p.btnUrl}" target="_blank" rel="noopener">${p.btnText}</a>`;
      }

      box.innerHTML = `
        <div class="project_img">
          <img src="${p.img}" alt="${p.imgAlt}" loading="lazy" />
        </div>
        <h3>${p.title}</h3>
        <div class="project_desc">${p.desc}</div>
        ${linksHtml}
      `;
      projectGrid.appendChild(box);
    });
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}