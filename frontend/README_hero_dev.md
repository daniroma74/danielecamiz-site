# README_dev.md — Sezione Homepage (Hero)

## Struttura e logica della Hero

### Immagine (hero.png)
- Il file `img/hero.png` viene sempre visualizzato **interamente**: la sua “safe zone” (1000x1000px, centrata) è **sempre visibile**, mai tagliata su nessun device.
- Se lo schermo è più largo, si mostra anche la parte nera laterale dell’immagine (fino a 1800x1000px).  
- Se lo schermo è più stretto di 1000px, l’immagine viene scalata per adattarsi, **mantenendo la safe zone sempre perfettamente visibile**.

### Box testo (hero-box)
- Il box testo è un quadrato **proporzionato rispetto alla safe zone** (525x525, scalato in base allo scaling dell’immagine).
- È **centrato orizzontalmente** e con la base inferiore sempre **allineata al bordo inferiore della safe zone** dell’immagine.
- Tutti gli elementi testuali sono allineati e scalati in proporzione al box.

### Contenuto del box
- **Nome**: “Daniele Camiz” —  
  - Font: *Cormorant Garamond*, maiuscoletto, **sempre su una sola riga** e dimensionato dinamicamente per riempire lo spazio orizzontale.
- **Ruolo**: “CONDUCTOR” —  
  - Font: *Montserrat*, maiuscolo, letter-spacing ampio, dimensionato armonicamente rispetto al nome.
- **Bottone**: “chi sono” —  
  - Font: *Montserrat*, uppercase, bordo oro (`var(--accent-color)`),  
  - **Adattivo**: il bottone è largo solo quanto il contenuto + padding proporzionato,  
  - Stile coerente con i pulsanti globali del sito.
- **Claim**: “music is magic” —  
  - Font: *Montserrat* (o coerente), **italic, oro** (`var(--gold)`),  
  - Distanza visiva armonica dal bottone.

### Composizione verticale
- Le spaziature verticali fra i vari elementi sono **calcolate dinamicamente in JS** (in base a boxSize).
- L’obiettivo è una composizione **ariosissima e proporzionata**, coerente con uno stile internazionale/contemporaneo.

---

## Regole CSS chiave

```css
#hero-name, #hero-role, #hero-claim {
  width: 100%;
  text-align: center;
}
#hero-btn {
  width: auto;        /* <-- così il bottone non si allarga mai più del contenuto */
  text-align: center;
}