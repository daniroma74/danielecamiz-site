// Open Graph metadata fetcher
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

/**
 * Fetch Open Graph metadata from a URL
 * @param {string} url - The URL to fetch metadata from
 * @returns {Promise<Object>} - Object with title, description, image, siteName
 */
export async function fetchOpenGraphData(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DanieleCamizBot/1.0; +https://danielecamiz.com)'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Open Graph metadata
    const ogData = {
      title: null,
      description: null,
      image: null,
      siteName: null,
      url: url
    };

    // Try Open Graph tags first
    ogData.title = $('meta[property="og:title"]').attr('content') ||
                   $('meta[name="twitter:title"]').attr('content') ||
                   $('title').text() ||
                   null;

    ogData.description = $('meta[property="og:description"]').attr('content') ||
                        $('meta[name="twitter:description"]').attr('content') ||
                        $('meta[name="description"]').attr('content') ||
                        null;

    ogData.image = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="twitter:image"]').attr('content') ||
                   null;

    ogData.siteName = $('meta[property="og:site_name"]').attr('content') ||
                     $('meta[name="application-name"]').attr('content') ||
                     null;

    // Clean up the data
    if (ogData.title) ogData.title = ogData.title.trim();
    if (ogData.description) ogData.description = ogData.description.trim();
    if (ogData.image && !ogData.image.startsWith('http')) {
      // Make relative URLs absolute
      const urlObj = new URL(url);
      ogData.image = new URL(ogData.image, urlObj.origin).href;
    }

    return ogData;
  } catch (error) {
    console.error('[OG Fetcher] Error fetching metadata:', error.message);
    throw new Error(`Failed to fetch metadata: ${error.message}`);
  }
}
