// shared/cloudinary-manager/database.js

import { generateAllUrls } from './config.js';

export class MediaAssetManager {
  constructor(db) {
    this.db = db;
  }
  
  // Salva un nuovo asset nel database
  async saveAsset(data) {
    const {
      cloudinary_id,
      type,
      entity_type,
      entity_id,
      metadata = {}
    } = data;
    
    // Genera tutte le URL
    const urls = generateAllUrls(cloudinary_id, type);
    
    const sql = `
      INSERT INTO media_assets (
        cloudinary_id, type, entity_type, entity_id,
        url_original, url_thumb, url_medium, url_large, url_social,
        width, height, format, size_bytes,
        folder, tags, metadata, transformations, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cloudinary_id) DO UPDATE SET
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        url_thumb = excluded.url_thumb,
        url_medium = excluded.url_medium,
        url_large = excluded.url_large,
        url_social = excluded.url_social,
        metadata = excluded.metadata,
        transformations = excluded.transformations,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [
        cloudinary_id,
        type,
        entity_type,
        entity_id || null,
        urls.original,
        urls.thumb || null,
        urls.medium || null,
        urls.large || null,
        urls.social || null,
        metadata.width || null,
        metadata.height || null,
        metadata.format || null,
        metadata.bytes || null,
        metadata.folder || null,
        JSON.stringify(metadata.tags || []),
        JSON.stringify(metadata),
        JSON.stringify(urls),
        metadata.uploaded_by || 'system'
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
  
  // Recupera tutti i media di un'entità
  async getEntityMedia(entity_type, entity_id) {
    const sql = `
      SELECT * FROM media_assets
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY type, created_at DESC
    `;
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, [entity_type, entity_id], (err, rows) => {
        if (err) reject(err);
        else {
          // Raggruppa per tipo
          const grouped = {};
          (rows || []).forEach(asset => {
            if (!grouped[asset.type]) {
              grouped[asset.type] = [];
            }
            // Parse JSON fields
            if (asset.tags) asset.tags = JSON.parse(asset.tags);
            if (asset.metadata) asset.metadata = JSON.parse(asset.metadata);
            if (asset.transformations) asset.transformations = JSON.parse(asset.transformations);
            grouped[asset.type].push(asset);
          });
          resolve(grouped);
        }
      });
    });
  }
  
  // Recupera un singolo asset
  async getAsset(cloudinary_id) {
    const sql = 'SELECT * FROM media_assets WHERE cloudinary_id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, [cloudinary_id], (err, row) => {
        if (err) reject(err);
        else {
          if (row) {
            if (row.tags) row.tags = JSON.parse(row.tags);
            if (row.metadata) row.metadata = JSON.parse(row.metadata);
            if (row.transformations) row.transformations = JSON.parse(row.transformations);
          }
          resolve(row);
        }
      });
    });
  }
  
  // Elimina un asset
  async deleteAsset(cloudinary_id) {
    const sql = 'DELETE FROM media_assets WHERE cloudinary_id = ?';
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [cloudinary_id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
  
  // Associa un asset esistente a una nuova entità
  async linkAsset(cloudinary_id, entity_type, entity_id) {
    const sql = `
      UPDATE media_assets 
      SET entity_type = ?, entity_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE cloudinary_id = ?
    `;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, [entity_type, entity_id, cloudinary_id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
  
  // Cerca asset
  async searchAssets(criteria = {}) {
    let sql = 'SELECT * FROM media_assets WHERE 1=1';
    const params = [];
    
    if (criteria.type) {
      sql += ' AND type = ?';
      params.push(criteria.type);
    }
    
    if (criteria.entity_type) {
      sql += ' AND entity_type = ?';
      params.push(criteria.entity_type);
    }
    
    if (criteria.folder) {
      sql += ' AND folder LIKE ?';
      params.push(`%${criteria.folder}%`);
    }
    
    if (criteria.tags) {
      sql += ' AND tags LIKE ?';
      params.push(`%${criteria.tags}%`);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT 100';
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else {
          (rows || []).forEach(row => {
            if (row.tags) row.tags = JSON.parse(row.tags);
            if (row.metadata) row.metadata = JSON.parse(row.metadata);
            if (row.transformations) row.transformations = JSON.parse(row.transformations);
          });
          resolve(rows);
        }
      });
    });
  }
}
