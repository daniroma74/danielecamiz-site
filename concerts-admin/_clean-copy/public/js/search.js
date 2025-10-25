// concerts-admin/public/js/search.js

document.getElementById('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const params = new URLSearchParams({
    query: document.getElementById('search-query').value,
    year: document.getElementById('search-year').value,
    location: document.getElementById('search-location').value,
    composer: document.getElementById('search-composer').value,
    type: document.getElementById('search-type').value,
    poster: document.getElementById('search-poster').value
  });
  
  // Rimuovi parametri vuoti
  for (const [key, value] of [...params]) {
    if (!value) params.delete(key);
  }
  
  try {
    const response = await fetch(`/api/concerts/search?${params}`);
    const result = await response.json();
    
    if (result.success) {
      displayResults(result.concerts);
    } else {
      alert('Errore nella ricerca');
    }
  } catch (error) {
    alert('Errore di connessione');
  }
});

function displayResults(concerts) {
  const container = document.getElementById('results-container');
  const results = document.getElementById('search-results');
  
  container.style.display = 'block';
  
  if (concerts.length === 0) {
    results.innerHTML = '<p class="text-muted">Nessun concerto trovato</p>';
    return;
  }
  
  results.innerHTML = `
    <p class="text-muted">Trovati ${concerts.length} concerti</p>
    <table class="table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Titolo</th>
          <th>Luogo</th>
          <th>Locandina</th>
          <th>Azioni</th>
        </tr>
      </thead>
      <tbody>
        ${concerts.map(c => `
          <tr>
            <td>${new Date(c.date).toLocaleDateString('it-IT')}</td>
            <td>${c.title || '-'}</td>
            <td>${c.location}</td>
            <td>${c.poster_cloudinary_id ? '✓' : '-'}</td>
            <td>
              <a href="/admin/concert/${c.id}/edit" class="btn btn-sm">Modifica</a>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}