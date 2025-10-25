// utils/inlineStyles.js
// Converte stili CSS inline per compatibilità Gmail

export function applyInlineStyles(html) {
  if (!html) return '';
  
  // Applica stili inline ai tag comuni
  return html
    // Headers
    .replace(/<h1([^>]*)>/g, '<h1$1 style="margin: 0; color: #ffffff; font-family: Georgia, serif; font-size: 32px; font-weight: 400; letter-spacing: 1px;">')
    .replace(/<h2([^>]*)>/g, '<h2$1 style="color: #d6b25e; font-family: Georgia, serif; font-size: 28px; margin: 30px 0 15px; font-weight: 400;">')
    .replace(/<h3([^>]*)>/g, '<h3$1 style="color: #d6b25e; font-size: 22px; margin: 20px 0 10px;">')
    .replace(/<h4([^>]*)>/g, '<h4$1 style="margin: 0 0 10px 0; color: #d6b25e; font-size: 18px; font-weight: 600;">')
    
    // Paragraphs
    .replace(/<p([^>]*)>/g, '<p$1 style="margin: 0 0 20px; color: #f1f1f1; line-height: 1.6;">')
    
    // Links (solo se non hanno già style)
    .replace(/<a(?![^>]*style=)/g, '<a style="color: #d6b25e; text-decoration: underline;"')
    
    // Images (solo se non hanno già style)
    .replace(/<img(?![^>]*style=)/g, '<img style="max-width: 100%; height: auto; border-radius: 8px;"')
    
    // Strong/Bold
    .replace(/<strong>/g, '<strong style="font-weight: 600; color: #f1f1f1;">')
    .replace(/<b>/g, '<b style="font-weight: 600; color: #f1f1f1;">')
    
    // Lists
    .replace(/<ul>/g, '<ul style="margin: 0 0 20px 0; padding-left: 20px; color: #f1f1f1;">')
    .replace(/<ol>/g, '<ol style="margin: 0 0 20px 0; padding-left: 20px; color: #f1f1f1;">')
    .replace(/<li>/g, '<li style="margin: 0 0 8px 0; color: #f1f1f1;">');
}