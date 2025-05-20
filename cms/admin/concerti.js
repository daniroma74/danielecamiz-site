// concerti.js aggiornato per MongoDB - completo

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

  let concerti = {};
  let annoInModifica = null;
  let idxInModifica = null;

  btnNuovo.addEventListener("click", () => {
    modalNuovo.classList.add("show");
    modalNuovo.classList.remove("hidden");
  });

  chiudiNuovo.addEventListener("click", () => {
    modalNuovo.classList.remove("show");
    modalNuovo.classList.add("hidden");
  });

  chiudiModifica.addEventListener("click", () => {
    modalModifica.classList.remove("show");
    modalModifica.classList.add("hidden");
  });

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
    })
    .catch(err => console.error("Errore nel caricamento concerti:", err));

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
          const imgPath = c.locandina ? `/${c.locandina}` : "/frontend/img/placeholder.jpg";
          const card = document.createElement("div");
          card.className = "concerto-compatto";

          card.innerHTML = `
            <img class="locandina-miniatura" src="${imgPath}" alt="Locandina">
            <div class="dati-concerto">
              <h3>${c.titolo || "Concerto"}</h3>
              <p>${c.data || ""}</p>
              <button class="btn-modifica" data-anno="${anno}" data-idx="${idx}">Modifica</button>
            </div>
          `;
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
  }

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
    const interpreti = document.getElementById("new-interpreti").value.trim();
    const programma = document.getElementById("new-programma").value.trim();
    const eventbrite = document.getElementById("new-eventbrite").value.trim();
    const youtube = document.getElementById("new-youtube").value.trim();
    const file = inputLocandina.files[0];

    let locandina = "";

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("titolo", titolo);
      formData.append("data", data);
      formData.append("luogo", luogo);

      const res = await fetch("/upload/locandina", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("Errore nel caricamento locandina.");
        return;
      }

      const json = await res.json();
      locandina = json.path;
    }

    const anno = data ? data.slice(0, 4) : new Date().getFullYear().toString();
    const nuovo = { data, luogo, titolo, interpreti, programma, eventbrite, youtube, locandina };

    if (!concerti[anno]) concerti[anno] = [];
    concerti[anno].unshift(nuovo);

    await salvaConcerti();
    renderTimeline(concerti);
    formNuovo.reset();
    previewLocandina.innerHTML = "";
    modalNuovo.classList.add("hidden");
    modalNuovo.classList.remove("show");
  });

  timelineContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-modifica")) {
      annoInModifica = e.target.dataset.anno;
      idxInModifica = e.target.dataset.idx;
      const c = concerti[annoInModifica][idxInModifica];

      document.getElementById("edit-data").value = c.data || "";
      document.getElementById("edit-luogo").value = c.luogo || "";
      document.getElementById("edit-titolo").value = c.titolo || "";
      document.getElementById("edit-interpreti").value = c.interpreti || "";
      document.getElementById("edit-programma").value = c.programma || "";
      document.getElementById("edit-eventbrite").value = c.eventbrite || "";
      document.getElementById("edit-youtube").value = c.youtube || "";

      inputEditLocandina.value = "";
      previewEditLocandina.innerHTML = c.locandina
        ? `<img src="/${c.locandina}" class="poster-preview">`
        : "<p>Nessuna locandina</p>";

      modalModifica.classList.remove("hidden");
      modalModifica.classList.add("show");
    }
  });

  formModifica.addEventListener("submit", async (e) => {
    e.preventDefault();
    const c = concerti[annoInModifica][idxInModifica];

    c.data = document.getElementById("edit-data").value.trim();
    c.luogo = document.getElementById("edit-luogo").value.trim();
    c.titolo = document.getElementById("edit-titolo").value.trim();
    c.interpreti = document.getElementById("edit-interpreti").value.trim();
    c.programma = document.getElementById("edit-programma").value.trim();
    c.eventbrite = document.getElementById("edit-eventbrite").value.trim();
    c.youtube = document.getElementById("edit-youtube").value.trim();

    const nuovaLocandina = inputEditLocandina.files[0];

    if (nuovaLocandina) {
      if (c.locandina) {
        await fetch("/delete-locandina", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: c.locandina.split("/").pop() }),
        });
      }

      const formData = new FormData();
      formData.append("file", nuovaLocandina);
      formData.append("titolo", c.titolo);
      formData.append("data", c.data);
      formData.append("luogo", c.luogo);

      const upload = await fetch("/upload/locandina", {
        method: "POST",
        body: formData,
      });

      const res = await upload.json();
      if (res.path) {
        c.locandina = res.path;
      }
    }

    await salvaConcerti();
    renderTimeline(concerti);
    modalModifica.classList.remove("show");
    modalModifica.classList.add("hidden");
  });

  btnElimina.addEventListener("click", async () => {
    if (!confirm("Sei sicuro di voler eliminare questo concerto?")) return;

    const concerto = concerti[annoInModifica][idxInModifica];

    if (concerto.locandina) {
      await fetch("/delete-locandina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: concerto.locandina.split("/").pop() })
      });
    }

    concerti[annoInModifica].splice(idxInModifica, 1);
    await salvaConcerti();
    renderTimeline(concerti);
  });
});