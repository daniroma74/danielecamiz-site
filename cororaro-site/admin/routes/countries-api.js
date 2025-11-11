/**
 * Countries API Routes
 * Endpoint per cercare paesi da REST Countries API
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

module.exports = () => {
  /**
   * GET /admin/api/countries/search?q=italia
   * Cerca paesi tramite REST Countries API
   */
  router.get('/api/countries/search', requireAuth, async (req, res) => {
    try {
      const query = req.query.q;

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          countries: []
        });
      }

      // Fetch da REST Countries API
      const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(query)}`);

      if (!response.ok) {
        return res.json({
          success: true,
          countries: []
        });
      }

      const data = await response.json();

      // Mappa i risultati
      const countries = data.slice(0, 10).map(country => {
        // Prendi la prima capitale se disponibile
        const capital = country.capital && country.capital[0]
          ? country.capital[0]
          : null;

        // Coordinate della capitale o del paese
        const lat = country.capitalInfo?.latlng?.[0] || country.latlng?.[0] || 0;
        const lng = country.capitalInfo?.latlng?.[1] || country.latlng?.[1] || 0;

        // Nome in italiano se disponibile, altrimenti nome comune
        const name = country.translations?.ita?.common || country.name.common;

        return {
          code: country.cca2, // Codice ISO 2 lettere (IT, FR, etc)
          name: name,
          nativeName: country.name.common,
          flag: country.flag, // Emoji bandiera
          capital: capital,
          lat: lat,
          lng: lng,
          region: country.region,
          subregion: country.subregion,
          // Colore basato sulla regione
          color: getRegionColor(country.region)
        };
      });

      res.json({
        success: true,
        countries
      });

    } catch (error) {
      console.error('Error searching countries:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

/**
 * Suggerisce un colore in base alla regione geografica
 */
function getRegionColor(region) {
  const colors = {
    'Africa': '#FF8C00',      // Arancione
    'Americas': '#DC143C',     // Rosso
    'Asia': '#FFD700',         // Oro
    'Europe': '#0055A4',       // Blu
    'Oceania': '#20B2AA'       // Turchese
  };
  return colors[region] || '#228B22'; // Verde di default
}
