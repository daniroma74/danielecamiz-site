document.addEventListener("DOMContentLoaded", () => {
    const btnAggiungi = document.getElementById("btn-aggiungi-video");
    const modal = document.getElementById("modal-video");
    const chiudiModal = document.getElementById("chiudi-modal-video");
    const formVideo = document.getElementById("form-video");
    const listaVideo = document.getElementById("lista-video");
    const modalTitolo = document.getElementById("modal-titolo");
  
    let editingVideoId = null;
  
    // Mostra modale per nuovo video
    btnAggiungi.addEventListener("click", () => {
      editingVideoId = null;
      modalTitolo.textContent = "Nuovo Video";
      formVideo.reset();
      modal.classList.remove("hidden");
    });
  
    // Chiudi modale
    chiudiModal.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  
    // Carica lista video e aggiorna UI
    async function caricaVideo() {
      listaVideo.innerHTML = "Caricamento...";
      try {
        const res = await fetch("/api/video");
        const videos = await res.json();
  
        if (!Array.isArray(videos)) throw new Error("Dati video non validi");
  
        if (videos.length === 0) {
          listaVideo.innerHTML = "<p>Nessun video presente.</p>";
          return;
        }
  
        listaVideo.innerHTML = "";
        videos.forEach(video => {
          const div = document.createElement("div");
          div.classList.add("video-entry");
          div.innerHTML = `
            <h3>${video.titolo?.it || "Titolo IT non definito"}</h3>
            <p><em>${video.titolo?.en || ""}</em></p>
            <p>${video.descrizione?.it || ""}</p>
            <p>${video.descrizione?.en || ""}</p>
            <a href="${video.urlYoutube || "#"}" target="_blank">Guarda su YouTube</a>
            <div class="btn-group">
              <button class="btn-modifica" data-id="${video.id}">Modifica</button>
              <button class="btn-elimina" data-id="${video.id}">Elimina</button>
            </div>
          `;
          listaVideo.appendChild(div);
        });
  
        // Eventi modifica
        document.querySelectorAll(".btn-modifica").forEach(btn => {
          btn.addEventListener("click", async e => {
            const id = e.target.dataset.id;
            const video = videos.find(v => v.id === id);
            if (!video) return alert("Video non trovato");
  
            editingVideoId = id;
            modalTitolo.textContent = "Modifica Video";
  
            formVideo.querySelector("#titolo-it").value = video.titolo?.it || "";
            formVideo.querySelector("#titolo-en").value = video.titolo?.en || "";
            formVideo.querySelector("#descrizione-it").value = video.descrizione?.it || "";
            formVideo.querySelector("#descrizione-en").value = video.descrizione?.en || "";
            formVideo.querySelector("#url-youtube").value = video.urlYoutube || "";
  
            modal.classList.remove("hidden");
          });
        });
  
        // Eventi elimina
        document.querySelectorAll(".btn-elimina").forEach(btn => {
          btn.addEventListener("click", async e => {
            if(!confirm("Sei sicuro di voler eliminare questo video?")) return;
            const id = e.target.dataset.id;
            try {
              const res = await fetch(`/api/video/${id}`, { method: "DELETE" });
              const data = await res.json();
              if(data.success) {
                alert("Video eliminato");
                caricaVideo();
              } else {
                alert("Errore eliminazione");
              }
            } catch {
              alert("Errore eliminazione");
            }
          });
        });
  
      } catch (err) {
        listaVideo.innerHTML = `<p>Errore caricando i video: ${err.message}</p>`;
      }
    }
  
    // Gestione submit form video
    formVideo.addEventListener("submit", async e => {
      e.preventDefault();
      const titoloIt = formVideo.querySelector("#titolo-it").value.trim();
      const titoloEn = formVideo.querySelector("#titolo-en").value.trim();
      const descrizioneIt = formVideo.querySelector("#descrizione-it").value.trim();
      const descrizioneEn = formVideo.querySelector("#descrizione-en").value.trim();
      const urlYoutube = formVideo.querySelector("#url-youtube").value.trim();
  
      if (!titoloIt || !urlYoutube) {
        alert("Titolo IT e URL YouTube sono obbligatori");
        return;
      }
  
      const videoPayload = {
        id: editingVideoId,
        titolo: { it: titoloIt, en: titoloEn },
        descrizione: { it: descrizioneIt, en: descrizioneEn },
        urlYoutube,
      };
  
      try {
        const res = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(videoPayload),
        });
  
        const data = await res.json();
  
        if (data.success) {
          alert("Video salvato con successo");
          modal.classList.add("hidden");
          caricaVideo();
        } else {
          alert("Errore nel salvataggio");
        }
      } catch (err) {
        alert("Errore di rete durante il salvataggio");
      }
    });
  
    // Carica subito la lista video
    caricaVideo();
  });