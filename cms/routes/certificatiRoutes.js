import express from "express";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import dayjs from "dayjs";
import slugify from "slugify";
import {
  partecipantiPath,
  generaCodiceFiscale,
  concertiPath,
  logoPath,
  firmaPath,
  strumentiMap,
  wrapText,
  capitalizeWords,
  backupPartecipanti,
  salvaPartecipante,
  suddividiBlocchiOttimale,
  drawTextPartecipanteGrassetto
} from "./certificatiUtils.js";
import { PDFDocument, rgb } from "pdf-lib";
import { fileURLToPath } from 'url';

const router = express.Router();
router.use(express.json());

// API generazione codice fiscale (sincrona)
router.post("/api/codice-fiscale", (req, res) => {
  try {
    const cf = generaCodiceFiscale(req.body);
    res.json({ cf });
  } catch (e) {
    res.status(400).json({ error: "Dati mancanti per il CF" });
  }
});

// API autocompletamento partecipanti
router.get("/partecipanti", async (req, res) => {
  try {
    const partecipanti = JSON.parse(await fs.readFile(partecipantiPath, "utf-8"));
    res.json(partecipanti);
  } catch {
    res.json([]);
  }
});

// API anni disponibili
router.get("/anni", async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(concertiPath, "utf-8"));
    const anni = data.map(entry => entry.anno);
    res.json(anni);
  } catch {
    res.json([]);
  }
});

// API concerti per anno (solo Orchestra ICNT)
router.get("/concerti/:anno", async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(concertiPath, "utf-8"));
    const anno = parseInt(req.params.anno);
    const blocco = data.find(entry => entry.anno === anno);
    const concertiICNT = (blocco?.concerti || []).filter(c => c.orchestra === "Orchestra ICNT");
    res.json(concertiICNT);
  } catch {
    res.json([]);
  }
});

// API genera certificato cumulativo (POST)
router.post("/genera", async (req, res) => {
  try {
    const { partecipante, concerti } = req.body;

    partecipante.nome = capitalizeWords(partecipante.nome.trim());
    partecipante.cognome = capitalizeWords(partecipante.cognome.trim());

    await salvaPartecipante(partecipantiPath, partecipante);

    // Percorsi font e immagini
    const fontRegularPath = path.join(path.dirname(logoPath), "../fonts/SourceSerif4-Regular.ttf");
    const fontBoldPath = path.join(path.dirname(logoPath), "../fonts/SourceSerif4-Bold.ttf");
    const fontItalicPath = path.join(path.dirname(logoPath), "../fonts/SourceSerif4-Italic.ttf");
    const bloccoFirmaPNGPath = firmaPath;

    const doc = await PDFDocument.create();
    const fontkit = (await import('@pdf-lib/fontkit')).default;
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(await fs.readFile(fontRegularPath));
    const fontBold = await doc.embedFont(await fs.readFile(fontBoldPath));
    const fontItalic = await doc.embedFont(await fs.readFile(fontItalicPath));
    const logo = await doc.embedPng(await fs.readFile(logoPath));
    const bloccoFirmaPNG = await doc.embedPng(await fs.readFile(bloccoFirmaPNGPath));

    // Layout PDF
    const pageWidth = 595.28, pageHeight = 841.89;
    const margin = 50;
    const logoWidth = 100, logoHeight = 100;
    const fasciaVietataAltezza = 150;
    const SPACING_LINEA = 20;
    const firmaBlockWidth = 375, firmaBlockHeight = 112.5;

    const intestazioneLines = [
      "ICNT – I concerti nel tempio",
      "Associazione Culturale",
      "C.F. 97982090587  P.I. 15010831004",
      "+39 339 4884814",
      "iconcertineltempio@gmail.com",
      "Via dei Cristofori, 34 00168 Roma"
    ];

    // Dati variabili e anno scolastico
    const dataMax = concerti.reduce((a, b) => (a.data > b.data ? a : b)).data;
    const dataMin = concerti.reduce((a, b) => (a.data < b.data ? a : b)).data;
    const dataCertificato = dayjs(dataMax).add(1, 'day').format("DD/MM/YYYY");
    const annoInizio = parseInt(dataMin.slice(5, 7)) >= 9 ? parseInt(dataMin.slice(0, 4)) : parseInt(dataMin.slice(0, 4)) - 1;
    const annoFine = annoInizio + 1;
    const annoScolastico = `${annoInizio}/${annoFine.toString().slice(-2)}`;
    partecipante.annoScolastico = annoScolastico;

    // Blocchi PDF personalizzati per concerti
    const concertiBlocs = concerti.map(c => {
      const titolo = `• ${dayjs(c.data).format("DD/MM/YYYY")} – ${c.titolo} (${c.ore} ore)`;
      const titoloLineCount = 1;
      const programmaLines = (c.programma ? c.programma.split("\n") : []).filter(l => l.trim() !== "");
      const totLines = titoloLineCount + programmaLines.length;
      const height = 15 * totLines + 6;
      return {
        type: "concerto",
        height,
        render: (p, y) => {
          p.drawText(titolo, { x: margin + 5, y, size: 11, font: fontItalic });
          programmaLines.forEach((line, j) => {
            p.drawText("   " + line, { x: margin + 10, y: y - 15 * (j + 1), size: 11, font });
          });
        }
      };
    });
    const oreTotali = concerti.reduce((s, c) => s + (parseFloat(c.ore) || 0), 0);

    const fraseFinale = {
      type: "fraseFinale",
      height: 34,
      render: (p, y) => {
        p.drawText(
          `L’impegno complessivo sostenuto è stato di ${oreTotali} ore tra prove e concerti.`,
          { x: margin, y, size: 12, font }
        );
        p.drawText("Si rilascia ad ogni effetto di legge.", { x: margin, y: y - 16, size: 12, font });
      }
    };
    const firmaBlock = {
      type: "firma",
      height: firmaBlockHeight,
      width: firmaBlockWidth,
      render: (page, y) => {
        page.drawLine({
          start: { x: margin, y: y - firmaBlockHeight - SPACING_LINEA },
          end:   { x: pageWidth - margin, y: y - firmaBlockHeight - SPACING_LINEA },
          thickness: 0.7,
          color: rgb(0.75, 0.72, 0.62)
        });
        page.drawImage(bloccoFirmaPNG, {
          x: margin,
          y: y - firmaBlockHeight,
          width: firmaBlockWidth,
          height: firmaBlockHeight
        });
      }
    };

    const tuttiBlocchi = [
      {
        type: "titolo",
        height: 28,
        render: (p, y) =>
          p.drawText("Certificato di partecipazione", {
            x: margin,
            y,
            size: 18,
            font: fontBold
          })
      },
      {
        type: "sottotitolo",
        height: 18,
        render: (p, y) =>
          p.drawText(`Anno scolastico ${annoScolastico}`, {
            x: margin,
            y,
            size: 13,
            font: fontItalic
          })
      },
      {
        type: "intro",
        height: wrapText(
          `Si certifica che ${partecipante.nome} ${partecipante.cognome}, ...`, 95
        ).length * 15 + 6,
        render: (p, y) => drawTextPartecipanteGrassetto(p, y, partecipante, font, fontBold)
      },
      ...concertiBlocs,
      fraseFinale,
      firmaBlock
    ];

    // Suddivisione blocchi e stampa pagine
    const altezzaDisponibile = pageHeight - margin - fasciaVietataAltezza - margin;
    const pagineBlocchi = suddividiBlocchiOttimale(tuttiBlocchi, altezzaDisponibile, 0.66);

    for (let i = 0; i < pagineBlocchi.length; i++) {
      let page = doc.addPage([pageWidth, pageHeight]);

      // Cornice BEIGE
      page.drawRectangle({
        x: margin / 2,
        y: margin / 2,
        width: pageWidth - margin,
        height: pageHeight - margin,
        borderColor: rgb(0.78, 0.7, 0.6),
        borderWidth: 1.5
      });

      // Logo alto sinistra
      page.drawImage(logo, { x: margin, y: pageHeight - margin - logoHeight, width: logoWidth, height: logoHeight });

      // Watermark trasparente
      const watermarkWidth = 340, watermarkHeight = 300;
      page.drawImage(logo, {
        x: (pageWidth - watermarkWidth) / 2,
        y: 120,
        width: watermarkWidth,
        height: watermarkHeight,
        opacity: 0.08
      });

      // Intestazione a destra solo PRIMA pagina
      if (i === 0) {
        intestazioneLines.forEach((line, idx) => {
          const y = pageHeight - margin - 10 - idx * 16;
          const textWidth = font.widthOfTextAtSize(line, 11);
          page.drawText(line, { x: pageWidth - margin - textWidth, y, size: 11, font });
        });
        // Data corsivo sotto intestazione
        const dataText = `Roma, ${dataCertificato}`;
        const dataY = pageHeight - margin - fasciaVietataAltezza + 16;
        const dataTextWidth = fontItalic.widthOfTextAtSize(dataText, 11);
        page.drawText(dataText, { x: pageWidth - margin - dataTextWidth, y: dataY, size: 11, font: fontItalic });
      }

      // Blocchi pagina e padding armonico
      const blocchiPagina = pagineBlocchi[i];
      let y = pageHeight - margin - fasciaVietataAltezza;
      const sommaAltezze = blocchiPagina.reduce((s, b) => s + b.height, 0);
      const area = y - margin;
      const nBlocchi = blocchiPagina.length;
      const padding = nBlocchi > 1 ? (area - sommaAltezze) / (nBlocchi - 1) : 0;

      for (let j = 0; j < blocchiPagina.length; j++) {
        if (blocchiPagina[j].type === "firma") {
          const larghezzaLinea = 275;
          const xLinea = margin + ((blocchiPagina[j].width || 375) - larghezzaLinea) / 2;
          const yLinea = y + 20;
          page.drawLine({
            start: { x: xLinea, y: yLinea },
            end: { x: xLinea + larghezzaLinea, y: yLinea },
            thickness: 0.4,
            color: rgb(0.7, 0.7, 0.7)
          });
          page.drawImage(bloccoFirmaPNG, {
            x: margin,
            y: y - blocchiPagina[j].height,
            width: blocchiPagina[j].width || 375,
            height: blocchiPagina[j].height || 112.5
          });
        } else {
          blocchiPagina[j].render(page, y);
        }
        y -= blocchiPagina[j].height;
        if (j < blocchiPagina.length - 1) y -= padding;
      }

      // Numerazione pagina (corsivo)
      const numText = `Pagina ${i + 1} di ${pagineBlocchi.length}`;
      const numWidth = fontItalic.widthOfTextAtSize(numText, 10);
      page.drawText(numText, {
        x: pageWidth / 2 - numWidth / 2,
        y: margin - 12,
        size: 10,
        font: fontItalic
      });
    }

    // Salva PDF e rispondi
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const certDir = path.join(__dirname, "../../pannello-certificati/certificati");
    if (!fsSync.existsSync(certDir)) fsSync.mkdirSync(certDir, { recursive: true });
    const nomeFile = `${partecipante.nome.toLowerCase()}_${partecipante.cognome.toLowerCase()}_certificato_annuale_${annoInizio}.pdf`;
    const finalPath = path.join(certDir, nomeFile);
    await fs.writeFile(finalPath, await doc.save());
    res.json({ ok: true, files: [nomeFile] });

  } catch (err) {
    console.error("Errore generazione certificato:", err);
    res.status(500).json({ ok: false, error: "Errore generazione certificato" });
  }
});

// === API genera certificato singolo (POST)
router.post("/genera-singolo", async (req, res) => {
  try {
    const { partecipante, concerto: c } = req.body;

    partecipante.nome = capitalizeWords(partecipante.nome.trim());
    partecipante.cognome = capitalizeWords(partecipante.cognome.trim());

    await salvaPartecipante(partecipantiPath, partecipante);

    // Font e immagini
    const fontRegularPath = path.join(path.dirname(logoPath), "../fonts/SourceSerif4-Regular.ttf");
    const fontBoldPath = path.join(path.dirname(logoPath), "../fonts/SourceSerif4-Bold.ttf");
    const fontItalicPath = path.join(path.dirname(logoPath), "../fonts/SourceSerif4-Italic.ttf");
    const doc = await PDFDocument.create();
    const fontkit = (await import('@pdf-lib/fontkit')).default;
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(await fs.readFile(fontRegularPath));
    const fontBold = await doc.embedFont(await fs.readFile(fontBoldPath));
    const fontItalic = await doc.embedFont(await fs.readFile(fontItalicPath));
    const logo = await doc.embedPng(await fs.readFile(logoPath));
    const bloccoFirmaPNG = await doc.embedPng(await fs.readFile(firmaPath));

    // Layout
    const pageWidth = 595.28, pageHeight = 841.89;
    const margin = 50;
    const logoWidth = 100, logoHeight = 100;
    const fasciaVietataAltezza = 150;
    const firmaBlockWidth = 375, firmaBlockHeight = 112.5;
    const SPACING_LINEA = 20;
    const intestazioneLines = [
      "ICNT – I concerti nel tempio",
      "Associazione Culturale",
      "C.F. 97982090587  P.I. 15010831004",
      "+39 339 4884814",
      "iconcertineltempio@gmail.com",
      "Via dei Cristofori, 34 00168 Roma"
    ];

    const annoScolastico = (() => {
      const d = new Date(c.data);
      const inizio = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
      const fine = inizio + 1;
      return `${inizio}/${(''+fine).slice(-2)}`;
    })();
    partecipante.annoScolastico = annoScolastico;

    // Blocchi PDF singolo certificato
    const titolo = {
      type: "titolo",
      height: 28,
      render: (p, y) =>
        p.drawText("Certificato di partecipazione", { x: margin, y, size: 18, font: fontBold })
    };
    const sottotitolo = {
      type: "sottotitolo",
      height: 18,
      render: (p, y) =>
        p.drawText(`Concerto del ${dayjs(c.data).format("DD/MM/YYYY")}`, { x: margin, y, size: 13, font: fontItalic })
    };
    const partecipazione = {
      type: "partecipazione",
      height: wrapText(`Si certifica che ${partecipante.nome} ${partecipante.cognome}, ...`, 95).length * 15 + 6,
      render: (p, y) => drawTextPartecipanteGrassetto(p, y, partecipante, font, fontBold)
    };
    const titoloConcerto = {
      type: "titoloConcerto",
      height: 22,
      render: (p, y) => p.drawText(c.titolo, { x: margin, y, size: 12, font: fontItalic })
    };
    const luogoFrase = `organizzato dall’Associazione ICNT – I concerti nel tempio presso ${c.luogo}, con il seguente programma:`;
    const luogoLines = wrapText(luogoFrase, 78);
    const luogo = {
      type: "luogo",
      height: luogoLines.length * 15 + 6,
      render: (p, y) => luogoLines.forEach((line, i) => p.drawText(line, { x: margin, y: y - i * 15, size: 11, font }))
    };
    const programmaLines = (c.programma ? c.programma.split("\n") : []).filter(l => l.trim() !== "");
    const programma = {
      type: "programma",
      height: programmaLines.length * 15 + 6,
      render: (p, y) => programmaLines.forEach((line, i) => p.drawText(line, { x: margin + 5, y: y - i * 15, size: 11, font }))
    };
    const ore = {
      type: "ore",
      height: 20,
      render: (p, y) => p.drawText(`L’impegno partecipativo è stato di ${partecipante.ore} ore complessive per prove e concerto.`, { x: margin, y, size: 11, font })
    };
    const finale = {
      type: "finale",
      height: 18,
      render: (p, y) => p.drawText("Si rilascia ad ogni effetto di legge.", { x: margin, y, size: 11, font })
    };
    const firmaBlock = {
      type: "firma",
      height: firmaBlockHeight,
      width: firmaBlockWidth,
      render: (page, y) => {
        page.drawLine({
          start: { x: margin, y: y - firmaBlockHeight - SPACING_LINEA },
          end:   { x: pageWidth - margin, y: y - firmaBlockHeight - SPACING_LINEA },
          thickness: 0.7,
          color: rgb(0.75, 0.72, 0.62)
        });
        page.drawImage(bloccoFirmaPNG, {
          x: margin,
          y: y - firmaBlockHeight,
          width: firmaBlockWidth,
          height: firmaBlockHeight
        });
      }
    };

    const blocchi = [
      titolo,
      sottotitolo,
      partecipazione,
      titoloConcerto,
      luogo,
      programma,
      ore,
      finale,
      firmaBlock
    ];

    // Calcolo padding armonico
    const maxY = pageHeight - margin - fasciaVietataAltezza;
    const minY = margin;
    const maxArea = maxY - minY;
    const sommaAltezze = blocchi.reduce((s, b) => s + b.height, 0);
    const nSpazi = Math.max(1, blocchi.length - 1);
    const padding = (maxArea - sommaAltezze) / nSpazi;

    // Stampa PDF singolo
    const page = doc.addPage([pageWidth, pageHeight]);

    // Cornice beige
    page.drawRectangle({
      x: margin / 2,
      y: margin / 2,
      width: pageWidth - margin,
      height: pageHeight - margin,
      borderColor: rgb(0.78, 0.7, 0.6),
      borderWidth: 1.5
    });

    // Logo alto sinistra
    page.drawImage(logo, { x: margin, y: pageHeight - margin - logoHeight, width: logoWidth, height: logoHeight });

    // Watermark trasparente
    const watermarkWidth = 340, watermarkHeight = 300;
    page.drawImage(logo, {
      x: (pageWidth - watermarkWidth) / 2,
      y: 120,
      width: watermarkWidth,
      height: watermarkHeight,
      opacity: 0.08
    });

    // Intestazione
    intestazioneLines.forEach((line, idx) => {
      const y = pageHeight - margin - 10 - idx * 16;
      const textWidth = font.widthOfTextAtSize(line, 11);
      page.drawText(line, { x: pageWidth - margin - textWidth, y, size: 11, font });
    });

    // Data in alto a destra (corsivo)
    const dataCertificato = dayjs(c.data).add(1, "day").format("DD/MM/YYYY");
    const dataText = `Roma, ${dataCertificato}`;
    const dataY = pageHeight - margin - fasciaVietataAltezza + 16;
    const dataTextWidth = fontItalic.widthOfTextAtSize(dataText, 11);
    page.drawText(dataText, { x: pageWidth - margin - dataTextWidth, y: dataY, size: 11, font: fontItalic });

    // Blocchi & padding armonico
    let y = pageHeight - margin - fasciaVietataAltezza;
    for (let j = 0; j < blocchi.length; j++) {
      if (blocchi[j].type === "firma") {
        const larghezzaLinea = 275;
        const xLinea = margin + ((blocchi[j].width || firmaBlockWidth) - larghezzaLinea) / 2;
        const yLinea = y - (blocchi[j].height || firmaBlockHeight) + 22;
        page.drawLine({
          start: { x: xLinea, y: yLinea },
          end: { x: xLinea + larghezzaLinea, y: yLinea },
          thickness: 0.4,
          color: rgb(0.85, 0.85, 0.85)
        });
        page.drawImage(bloccoFirmaPNG, {
          x: margin,
          y: y - blocchi[j].height + 5,
          width: blocchi[j].width || firmaBlockWidth,
          height: blocchi[j].height || firmaBlockHeight
        });
      } else {
        blocchi[j].render(page, y);
      }
      y -= blocchi[j].height;
      if (j < blocchi.length - 1) y -= padding;
    }

    // Numerazione pagina (corsivo)
    const numText = `Pagina 1 di 1`;
    const numWidth = fontItalic.widthOfTextAtSize(numText, 10);
    page.drawText(numText, {
      x: pageWidth / 2 - numWidth / 2,
      y: margin - 12,
      size: 10,
      font: fontItalic
    });

    // Salva PDF
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const certDir = path.join(__dirname, "../../pannello-certificati/certificati");
    if (!fsSync.existsSync(certDir)) fsSync.mkdirSync(certDir, { recursive: true });
    const nomeFile = `${partecipante.nome.toLowerCase()}_${partecipante.cognome.toLowerCase()}_${slugify(c.titolo, { lower: true })}_${c.data.slice(0, 4)}.pdf`;
    const finalPath = path.join(certDir, nomeFile);
    await fs.writeFile(finalPath, await doc.save());

    res.json({ ok: true, files: [nomeFile] });
  } catch (err) {
    console.error("Errore generazione certificato singolo:", err);
    res.status(500).json({ ok: false, error: "Errore generazione certificato singolo" });
  }
});

export default router;