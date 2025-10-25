document.addEventListener("DOMContentLoaded", () => {
  const btnNuovo = document.getElementById("btn-nuovo-concerto");
  const modalNuovo = document.getElementById("modal-nuovo-concerto");
  const chiudiNuovo = document.getElementById("chiudi-nuovo-concerto");
  const formNuovo = document.getElementById("form-nuovo-concerto");
  const previewLocandina = document.getElementById("preview-locandina");
  const inputLocandina = document.getElementById("new-locandina");
  const timelineContainer = document.getElementById("timeline-concerti");
  const modalModifica = document.getElementById("modal-modifica-concerto");
  const chiudiModifica = document.getElementById("chiudi-modifica-concerto");
  const formModifica = document.getElementById("form-modifica-concerto");
  const previewEditLocandina = document.getElementById("edit-locandina-preview");
  const inputEditLocandina = document.getElementById("edit-locandina");
  const btnElimina = document.getElementById("btn-elimina-concerto");
  const btnSalvaModifiche = document.getElementById("btn-salva-modifiche");

  const btnUploadTutte = document.createElement("button");
  btnUploadTutte.textContent = "📤 Carica tutte le locandine passate";
  btnUploadTutte.className = "btn-upload-tutte";
  timelineContainer.before(btnUploadTutte);

  let concerti = {};
  let annoInModifica = null;
  let idxInModifica = null;

  async function uploadLocandinaCloudinary(file, idConcerto) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("id", idConcerto);
    const res = await fetch("/upload/cloudinary", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Errore upload Cloudinary");
    const json = await res.json();
    return json.url;
  }

  async function uploadLocandina(file, titolo, data, luogo) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("titolo", titolo);
    formData.append("data", data);
    formData.append("luogo", luogo);
    const res = await fetch("/upload/locandina", { method: "POST", body: formData });
    if (res.ok) {
      const json = await res.json();
      return json.path;
    }
    return null;
  }

  inputLocandina.addEventListener("change", (e) => {
    previewLocandina.innerHTML = "";
    const file = e.target.files[0];
    if (file) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.className = "poster-preview";
      previewLocandina.appendChild(img);
    }
  });

  inputEditLocandina.addEventListener("change", (e) => {
    previewEditLocandina.innerHTML = "";
    const file = e.target.files[0];
    if (file) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.className = "poster-preview";
      previewEditLocandina.appendChild(img);
    }
  });

  btnNuovo.addEventListener("click", () => {
    modalNuovo.classList.remove("hidden");
    modalNuovo.classList.add("show");
  });

  chiudiNuovo.addEventListener("click", () => {
    modalNuovo.classList.add("hidden");
    modalNuovo.classList.remove("show");
  });

  chiudiModifica.addEventListener("click", () => {
    modalModifica.classList.add("hidden");
    modalModifica.classList.remove("show");
  });
  async function salvaConcerti() {
    const arrayFormattato = Object.keys(concerti).map(anno => ({
      anno: parseInt(anno),
      concerti: concerti[anno]
    }));
    await fetch("/api/concerti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(arrayFormattato, null, 2)
    });
  }

  formNuovo.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = document.getElementById("new-data").value;
    const luogo = document.getElementById("new-luogo").value.trim();
    const titolo = document.getElementById("new-titolo").value.trim();
    const solisti = document.getElementById("new-solisti").value.trim();
    const programma = document.getElementById("new-programma").value.trim();
    const eventbrite = document.getElementById("new-eventbrite").value.trim();
    const youtube = document.getElementById("new-youtube").value.trim();
    const file = inputLocandina.files[0];

    let locandina = "";
    if (file) {
      const uploaded = await uploadLocandina(file, titolo, data, luogo);
      if (uploaded) locandina = uploaded;
    }

    const anno = data ? data.slice(0, 4) : new Date().getFullYear().toString();
    const nuovo = {
      data,
      luogo,
      titolo,
      solisti,
      programma,
      note: "",
      eventbrite,
      youtube,
      locandina
    };

    if (!concerti[anno]) concerti[anno] = [];
    concerti[anno].unshift(nuovo);
    await salvaConcerti();
    renderTimeline(concerti);
    formNuovo.reset();
    previewLocandina.innerHTML = "";
    modalNuovo.classList.add("hidden");
    modalNuovo.classList.remove("show");
  });

  btnSalvaModifiche.addEventListener("click", async (e) => {
    e.preventDefault();
    const c = concerti[annoInModifica][idxInModifica];

    const data = formModifica.elements['edit-data'].value;
    const luogo = formModifica.elements['edit-luogo'].value.trim();
    const titolo = formModifica.elements['edit-titolo'].value.trim();
    const solisti = formModifica.elements['edit-solisti'].value.trim();
    const programma = formModifica.elements['edit-programma'].value.trim();
    const eventbrite = formModifica.elements['edit-eventbrite'].value.trim();
    const youtube = formModifica.elements['edit-youtube'].value.trim();
    const file = inputEditLocandina.files[0];

    let locandina = c.locandina;
    if (file) {
      const uploaded = await uploadLocandina(file, titolo, data, luogo);
      if (uploaded) locandina = uploaded;
    }

    concerti[annoInModifica][idxInModifica] = {
      ...c,
      data,
      luogo,
      titolo,
      solisti,
      programma,
      eventbrite,
      youtube,
      locandina
    };

    await salvaConcerti();
    modalModifica.classList.add("hidden");
    modalModifica.classList.remove("show");
    renderTimeline(concerti);
  });
  btnElimina.addEventListener("click", async () => {
    if (!confirm("Sei sicuro di voler eliminare questo concerto?")) return;
    concerti[annoInModifica].splice(idxInModifica, 1);
    await salvaConcerti();
    renderTimeline(concerti);
    modalModifica.classList.add("hidden");
    modalModifica.classList.remove("show");
  });

  btnUploadTutte.addEventListener("click", async () => {
    const currentYear = new Date().getFullYear();
    let count = 0;
    for (const [anno, lista] of Object.entries(concerti)) {
      if (parseInt(anno) < currentYear) {
        for (const c of lista) {
          if (c.locandina && !c.locandina_cloudinary_url) count++;
        }
      }
    }
    if (count === 0) return alert("Tutte le locandine passate sono già su Cloudinary.");
    if (!confirm(`Caricare ${count} locandine su Cloudinary?`)) return;

    for (const [anno, lista] of Object.entries(concerti)) {
      if (parseInt(anno) < currentYear) {
        for (const c of lista) {
          if (c.locandina && !c.locandina_cloudinary_url) {
            try {
              const res = await fetch(c.locandina);
              const blob = await res.blob();
              const file = new File([blob], "upload.jpg", { type: blob.type });
              const url = await uploadLocandinaCloudinary(file, c.id);
              c.locandina_cloudinary_url = url;
            } catch (e) {
              console.error("Errore caricamento:", c, e);
            }
          }
        }
      }
    }

    await salvaConcerti();
    renderTimeline(concerti);
    alert("✅ Tutte le locandine passate sono state caricate.");
  });

  fetch("/api/concerti")
    .then(res => res.json())
    .then(dataArray => {
      const data = {};
      dataArray.forEach(entry => {
        const anno = String(entry.anno);
        data[anno] = entry.concerti;
      });
      concerti = data;
      renderTimeline(concerti);
    });

  function renderTimeline(data) {
    timelineContainer.innerHTML = "";
    const currentYear = new Date().getFullYear();

    for (let y = currentYear; y >= 2016; y--) {
      const anno = y.toString();
      const blocco = document.createElement("div");
      blocco.className = "blocco-anno";
      const header = document.createElement("h2");
      header.textContent = anno;
      header.classList.add("anno-toggle");
      const contenuto = document.createElement("div");
      contenuto.className = "concerti-annuali hidden";
      const chiudiBtn = document.createElement("button");
      chiudiBtn.textContent = "×";
      chiudiBtn.className = "btn-chiudi-anno hidden";
      blocco.appendChild(chiudiBtn);
      if (data[anno] && data[anno].length > 0) {
        data[anno].forEach((c, idx) => {
          const imgPath = c.locandina_cloudinary_url?.startsWith("http")
            ? c.locandina_cloudinary_url
            : c.locandina
              ? c.locandina.startsWith("img/")
                ? `/frontend/${c.locandina}`
                : c.locandina
              : "/frontend/img/placeholder.jpg";

          const icon = c.locandina_cloudinary_url ? "✔️" : "📄";
          const card = document.createElement("div");
          card.className = "concerto-compatto";
          card.innerHTML = `
            <div class="locandina-wrapper">
              <img class="locandina-miniatura" src="${imgPath}" alt="Locandina">
              <span class="icona-stato">${icon}</span>
            </div>
            <div class="dati-concerto">
              <h3>${c.titolo || "Concerto"}</h3>
              <p>${c.data || ""}</p>
              <button class="btn-modifica" data-anno="${anno}" data-idx="${idx}">Modifica</button>
            </div>`;
          contenuto.appendChild(card);
        });
      } else {
        const vuoto = document.createElement("p");
        vuoto.textContent = "Nessun concerto inserito per questo anno.";
        contenuto.appendChild(vuoto);
      }

      blocco.appendChild(header);
      blocco.appendChild(contenuto);
      timelineContainer.appendChild(blocco);

      header.addEventListener("click", () => {
        document.querySelectorAll(".concerti-annuali").forEach(div => div.classList.add("hidden"));
        document.querySelectorAll(".btn-chiudi-anno").forEach(btn => btn.classList.add("hidden"));
        contenuto.classList.remove("hidden");
        chiudiBtn.classList.remove("hidden");
      });

      chiudiBtn.addEventListener("click", () => {
        contenuto.classList.add("hidden");
        chiudiBtn.classList.add("hidden");
      });
    }

    // 🔁 Re-bind dei pulsanti Modifica dopo aver popolato tutta la timeline
    document.querySelectorAll(".btn-modifica").forEach(btn => {
      btn.addEventListener("click", () => {
        const anno = btn.dataset.anno;
        const idx = parseInt(btn.dataset.idx);
        const c = concerti[anno][idx];
        annoInModifica = anno;
        idxInModifica = idx;

        console.log("🛠 Modifica concerto:", c);

        formModifica.elements['edit-data'].value = c.data || "";
        formModifica.elements['edit-luogo'].value = c.luogo || "";
        formModifica.elements['edit-titolo'].value = c.titolo || "";
        formModifica.elements['edit-solisti'].value = c.solisti || "";
        formModifica.elements['edit-programma'].value = c.programma || "";
        formModifica.elements['edit-eventbrite'].value = c.eventbrite || "";
        formModifica.elements['edit-youtube'].value = c.youtube || "";

        previewEditLocandina.innerHTML = "";
        if (c.locandina || c.locandina_cloudinary_url) {
          const img = document.createElement("img");
          const src = c.locandina_cloudinary_url?.startsWith("http")
            ? c.locandina_cloudinary_url
            : c.locandina?.startsWith("img/")
              ? `/frontend/${c.locandina}`
              : c.locandina;
          img.src = src;
          img.className = "poster-preview";
          previewEditLocandina.appendChild(img);
        }

        modalModifica.classList.remove("hidden");
        modalModifica.classList.add("show");
      });
    });
  }
});