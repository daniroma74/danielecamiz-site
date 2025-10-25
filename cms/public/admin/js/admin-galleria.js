document.addEventListener("DOMContentLoaded", () => {
  const listaGallerie = document.getElementById("lista-gallerie");
  const btnAggiungi = document.getElementById("btn-aggiungi-galleria");

  const modaleCopertina = document.getElementById("modale-copertina");
  const copertinaInput = document.getElementById("copertina-input");
  const copertinaPreview = document.getElementById("copertina-preview");
  const chiudiCopertina = document.getElementById("chiudi-copertina");
  const btnSalvaCopertina = document.getElementById("btn-salva-copertina");

  const modaleImmagini = document.getElementById("modale-immagini");
  const chiudiImmagini = document.getElementById("chiudi-immagini");
  const listaImmagini = document.getElementById("lista-immagini");
  const previewMiniature = document.getElementById("preview-galleria");
  const inputImmagine = document.getElementById("input-immagine");
  const btnUploadImmagine = document.getElementById("btn-upload-immagine");
  const btnSalvaOrdine = document.getElementById("btn-salva-ordine");
  const campoSuggerito = document.getElementById("suggested-filename");

  let galleriaInModifica = null;
  let galleriaData = [];

  // === FETCH iniziale ===
  fetch("/api/galleria")
    .then(res => res.json())
    .then(data => {
      galleriaData = data;
      renderGallerie();
    });

  function renderGallerie() {
    listaGallerie.innerHTML = "";
    galleriaData.forEach(g => {
      const card = document.createElement("div");
      card.className = "galleria-card";

      const coverPath = g.cover || `${g.categoria}.jpg`;
      const src = coverPath.startsWith("covers/")
        ? `../frontend/img/galleria/${coverPath}`
        : `../frontend/img/galleria/covers/${coverPath}`;

      const img = document.createElement("img");
      img.src = src;
      img.alt = g.titolo_it || "Copertina";
      card.appendChild(img);

      const h3 = document.createElement("h3");
      h3.textContent = g.titolo_it || "Galleria";
      card.appendChild(h3);

      const btnGroup = document.createElement("div");
      btnGroup.className = "btn-group";

      const btnCopertina = document.createElement("button");
      btnCopertina.textContent = "Modifica copertina";
      btnCopertina.onclick = () => {
        galleriaInModifica = g;
        copertinaInput.value = "";
        copertinaPreview.src = src;
        copertinaPreview.style.maxWidth = "300px";
        copertinaPreview.style.height = "auto";
        modaleCopertina.classList.add("show");
      };

      const btnGalleria = document.createElement("button");
      btnGalleria.textContent = "Modifica galleria";
      btnGalleria.onclick = () => {
        galleriaInModifica = g;
        openGestioneImmagini(g);
      };

      btnGroup.appendChild(btnCopertina);
      btnGroup.appendChild(btnGalleria);
      card.appendChild(btnGroup);
      listaGallerie.appendChild(card);
    });
  }

  // === Modale copertina ===
  chiudiCopertina.onclick = () => modaleCopertina.classList.remove("show");

  copertinaInput.addEventListener("change", () => {
    const file = copertinaInput.files[0];
    if (file) {
      copertinaPreview.src = URL.createObjectURL(file);
    }
  });

  btnSalvaCopertina.onclick = async () => {
    const file = copertinaInput.files[0];
    if (!file || !galleriaInModifica?.categoria) {
      alert("Seleziona un file e una galleria valida.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoria", galleriaInModifica.categoria);

    const res = await fetch("/upload/copertina", {
      method: "POST",
      body: formData
    });

    if (res.ok) {
      const result = await res.json();
      galleriaInModifica.cover = result.path;
      renderGallerie();
      modaleCopertina.classList.remove("show");
      alert("Copertina salvata correttamente!");
    } else {
      alert("Errore nel salvataggio della copertina.");
    }
  };

  // === GESTIONE IMMAGINI ===
  function openGestioneImmagini(galleria) {
    listaImmagini.innerHTML = "";
    previewMiniature.innerHTML = "";

    galleria.immagini.forEach((img, index) => {
      // Miniatura (draggable)
      const thumb = document.createElement("img");
      thumb.src = `../frontend/img/galleria/${galleria.categoria}/${img.file}`;
      thumb.className = "preview-thumb";
      thumb.draggable = true;
      previewMiniature.appendChild(thumb);

      // Box grande
      const box = document.createElement("div");
      box.className = "immagine-box";
      box.dataset.index = index;

      const preview = document.createElement("img");
      preview.src = thumb.src;
      preview.alt = "anteprima";
      preview.style.maxWidth = "100%";

      const descIT = document.createElement("input");
      descIT.value = img.didascalia_it || "";
      descIT.placeholder = "Didascalia IT";
      descIT.oninput = () => img.didascalia_it = descIT.value;

      const descEN = document.createElement("input");
      descEN.value = img.didascalia_en || "";
      descEN.placeholder = "Didascalia EN";
      descEN.oninput = () => img.didascalia_en = descEN.value;

      const btnDel = document.createElement("button");
      btnDel.textContent = "Elimina";
      btnDel.className = "btn-delete";
      btnDel.onclick = () => {
        if (confirm("Vuoi davvero eliminare questa immagine?")) {
          galleria.immagini.splice(index, 1);
          openGestioneImmagini(galleria);
        }
      };

      box.appendChild(preview);
      box.appendChild(descIT);
      box.appendChild(descEN);
      box.appendChild(btnDel);
      listaImmagini.appendChild(box);
    });

    // Attiva modale
    modaleImmagini.classList.add("show");

    // Ordina miniature
    Sortable.create(previewMiniature, {
      animation: 200,
      onEnd: () => {
        const newOrder = [];
        [...previewMiniature.querySelectorAll("img")].forEach(img => {
          const filename = img.src.split("/").pop();
          const item = galleria.immagini.find(i => i.file === filename);
          if (item) newOrder.push(item);
        });
        galleria.immagini = newOrder;
        openGestioneImmagini(galleria); // sincronizza vista
      }
    });
  }

  chiudiImmagini.onclick = () => modaleImmagini.classList.remove("show");

  btnUploadImmagine.onclick = async () => {
    const file = inputImmagine.files[0];
    if (!file || !galleriaInModifica?.categoria) {
      alert("Seleziona un file e una galleria valida.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoria", galleriaInModifica.categoria);
    formData.append("titolo", ""); // può essere aggiornato se necessario
    formData.append("didascalia", "");

    const res = await fetch("/upload/galleria", {
      method: "POST",
      body: formData
    });

    if (res.ok) {
      const result = await res.json();
      const nuovoFile = {
        file: result.filename,
        didascalia_it: "",
        didascalia_en: ""
      };
      galleriaInModifica.immagini.push(nuovoFile);
      await fetch("/api/galleria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(galleriaData, null, 2)
      });
      openGestioneImmagini(galleriaInModifica);

      // Mostra suggerimento SEO
      if (result.suggerito) {
        campoSuggerito.innerHTML = `Suggerito: <code>${result.suggerito}</code>`;
      } else {
        campoSuggerito.innerHTML = `Nome già SEO: <code>${result.filename}</code>`;
      }

      inputImmagine.value = "";
    } else {
      alert("Errore nel caricamento dell'immagine.");
    }
  };

  btnSalvaOrdine.onclick = async () => {
    if (!galleriaInModifica) return;
    const res = await fetch("/api/galleria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(galleriaData, null, 2)
    });

    if (res.ok) {
      alert("Ordine salvato!");
      modaleImmagini.classList.remove("show");
    } else {
      alert("Errore nel salvataggio.");
    }
  };

  btnAggiungi.onclick = () => {
    const nome = prompt("Slug della nuova galleria:");
    if (!nome) return;
    const esiste = galleriaData.find(g => g.categoria === nome);
    if (esiste) return alert("Slug già esistente.");

    const nuova = {
      categoria: nome,
      titolo_it: nome,
      titolo_en: nome,
      immagini: []
    };
    galleriaData.push(nuova);
    fetch("/api/galleria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(galleriaData, null, 2)
    }).then(renderGallerie);
  };
});