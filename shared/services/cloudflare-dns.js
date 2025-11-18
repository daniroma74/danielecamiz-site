/**
 * Cloudflare DNS Manager
 * Gestione automatica record DNS per sottodomini dinamici
 *
 * Best-effort: se API fallisce, wildcard DNS funziona comunque
 */

const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

/**
 * Create DNS A record for subdomain
 * @param {string} slug - Subdomain slug (es: "natale-2025")
 * @param {string} domain - Base domain (es: "cororaro.it")
 * @param {string} serverIp - Server IP address
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} zoneId - Cloudflare Zone ID
 * @param {boolean} proxied - Enable Cloudflare proxy (orange cloud)
 * @returns {Promise<object>} DNS record data
 */
export async function createSubdomainRecord(slug, domain, serverIp, apiToken, zoneId, proxied = true) {
  const url = `${CLOUDFLARE_API}/zones/${zoneId}/dns_records`;

  const data = {
    type: 'A',
    name: slug,  // Just the slug, Cloudflare adds domain automatically
    content: serverIp,
    ttl: 1,  // Auto (respects Cloudflare settings)
    proxied: proxied,  // Orange cloud ON/OFF
    comment: `Auto-created for landing page: ${slug}.${domain}`
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
      // Check if record already exists
      if (result.errors?.[0]?.code === 81057) {
        console.log(`⚠️  DNS record ${slug}.${domain} already exists`);
        return { success: true, exists: true };
      }

      throw new Error(result.errors?.[0]?.message || 'Unknown Cloudflare error');
    }

    console.log(`✅ DNS record created: ${slug}.${domain} → ${serverIp} (proxied: ${proxied})`);
    return result.result;

  } catch (error) {
    console.error(`❌ Failed to create DNS record for ${slug}.${domain}:`, error.message);
    throw error;
  }
}

/**
 * Delete DNS record for subdomain
 * @param {string} slug - Subdomain slug
 * @param {string} domain - Base domain
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} zoneId - Cloudflare Zone ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteSubdomainRecord(slug, domain, apiToken, zoneId) {
  try {
    // 1. Find record by name
    const listUrl = `${CLOUDFLARE_API}/zones/${zoneId}/dns_records?name=${slug}.${domain}`;

    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const listData = await listResponse.json();

    if (!listData.success || !listData.result || listData.result.length === 0) {
      console.log(`⚠️  DNS record ${slug}.${domain} not found (already deleted or never created)`);
      return true;  // Not an error, just doesn't exist
    }

    // 2. Delete record
    const recordId = listData.result[0].id;
    const deleteUrl = `${CLOUDFLARE_API}/zones/${zoneId}/dns_records/${recordId}`;

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const deleteData = await deleteResponse.json();

    if (!deleteData.success) {
      throw new Error(deleteData.errors?.[0]?.message || 'Unknown error');
    }

    console.log(`✅ DNS record deleted: ${slug}.${domain}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to delete DNS record for ${slug}.${domain}:`, error.message);
    throw error;
  }
}

/**
 * Check if DNS record exists
 * @param {string} slug - Subdomain slug
 * @param {string} domain - Base domain
 * @param {string} apiToken - Cloudflare API Token
 * @param {string} zoneId - Cloudflare Zone ID
 * @returns {Promise<boolean>} True if record exists
 */
export async function recordExists(slug, domain, apiToken, zoneId) {
  try {
    const url = `${CLOUDFLARE_API}/zones/${zoneId}/dns_records?name=${slug}.${domain}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    return data.success && data.result && data.result.length > 0;

  } catch (error) {
    console.error(`❌ Error checking DNS record:`, error.message);
    return false;
  }
}

/**
 * Wrapper: Create record with best-effort
 * Non-blocking - se fallisce, wildcard funziona comunque
 */
export async function createRecordBestEffort(slug, domain, serverIp, apiToken, zoneId, proxied = true) {
  try {
    await createSubdomainRecord(slug, domain, serverIp, apiToken, zoneId, proxied);
    return true;
  } catch (error) {
    console.log(`⚠️  DNS creation failed (wildcard will work anyway): ${error.message}`);
    return false;
  }
}

/**
 * Wrapper: Delete record with best-effort
 * Non-blocking - se fallisce, non è critico
 */
export async function deleteRecordBestEffort(slug, domain, apiToken, zoneId) {
  try {
    await deleteSubdomainRecord(slug, domain, apiToken, zoneId);
    return true;
  } catch (error) {
    console.log(`⚠️  DNS deletion failed (not critical): ${error.message}`);
    return false;
  }
}

export default {
  createSubdomainRecord,
  deleteSubdomainRecord,
  recordExists,
  createRecordBestEffort,
  deleteRecordBestEffort
};
