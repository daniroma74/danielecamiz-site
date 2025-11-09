// Aggiungi click handlers alle card progetti già renderizzate SSR
export function initHomeProjects() {
  const projectBoxes = document.querySelectorAll('.project_box');

  if (!projectBoxes.length) {
    console.warn('[home-projects] No project boxes found');
    return;
  }

  console.log(`[home-projects] Initializing ${projectBoxes.length} project cards`);

  projectBoxes.forEach(box => {
    // Cerca il primo link nella card per determinare l'URL
    const linkElement = box.querySelector('.project_links a');

    if (!linkElement) {
      console.warn('[home-projects] No link found for project:', box.id);
      return;
    }

    const mainUrl = linkElement.href;

    // Aggiungi attributi per accessibilità
    box.setAttribute('tabindex', '0');
    box.setAttribute('role', 'button');
    box.setAttribute('aria-label', box.querySelector('h3')?.textContent || 'Project');
    box.setAttribute('data-url', mainUrl);

    console.log(`[home-projects] Adding handlers to ${box.id} -> ${mainUrl}`);

    // Aggiungi click handler
    box.addEventListener('click', (e) => {
      // Non propagare se hanno cliccato sul link stesso
      if (e.target.tagName === 'A') return;

      e.preventDefault();
      console.log(`[home-projects] Opening: ${mainUrl}`);
      window.open(mainUrl, '_blank', 'noopener,noreferrer');
    });

    // Supporto tastiera
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        console.log(`[home-projects] Opening (keyboard): ${mainUrl}`);
        window.open(mainUrl, '_blank', 'noopener,noreferrer');
      }
    });
  });
}