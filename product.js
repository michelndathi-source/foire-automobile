/* Foire — page produit véhicule */
(function () {
  "use strict";

  const root = document.getElementById("productRoot");
  const formatPrice = window.foireFormatPrice;
  const getVehicle = window.foireGetVehicle;

  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  let vehicle = id ? getVehicle(id) : null;

  // Hors ligne : masqué du site public
  if (vehicle && vehicle.published === "offline") {
    vehicle = null;
  }

  if (!vehicle) {
    root.innerHTML = `
      <div class="container product-missing">
        <h1>Véhicule introuvable</h1>
        <p>Ce modèle n'est plus en stock, hors ligne, ou le lien est incorrect.</p>
        <a href="voitures.html" class="btn btn--primary">Voir le catalogue</a>
      </div>`;
    return;
  }

  document.title = `${vehicle.name} ${vehicle.version} — Foire`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = vehicle.description;

  let galleryIndex = 0;
  const gallery = vehicle.gallery || [];

  function photoLabel(g) {
    if (!g) return "Photo";
    return (g.label && String(g.label).trim()) || "Photo";
  }

  function filteredGallery() {
    return gallery;
  }

  function km(n) {
    return new Intl.NumberFormat("fr-FR").format(n) + " km";
  }

  function specsRows() {
    return Object.entries(vehicle.specs || [])
      .map(
        ([k, v]) => `
      <div class="spec-row">
        <dt>${k}</dt>
        <dd>${v}</dd>
      </div>`
      )
      .join("");
  }

  function equipmentList() {
    return (vehicle.equipment || [])
      .map((e) => `<li>${e}</li>`)
      .join("");
  }

  function highlightsList() {
    return (vehicle.highlights || [])
      .map(
        (h) => `
      <li>
        <span class="check" aria-hidden="true">✓</span>
        ${h}
      </li>`
      )
      .join("");
  }

  function thumbsHTML() {
    const list = filteredGallery();
    if (!list.length) return "<p class=\"muted\">Aucune photo disponible.</p>";
    return list
      .map((g) => {
        const globalIndex = gallery.indexOf(g);
        const label = photoLabel(g);
        return `
        <button type="button" class="gallery-thumb${globalIndex === galleryIndex ? " is-active" : ""}" data-index="${globalIndex}" aria-label="${label}">
          <img src="${g.src}" alt="${label}" loading="lazy" />
          <span class="gallery-thumb__zone">${label}</span>
        </button>`;
      })
      .join("");
  }

  function mainPhoto() {
    const g = gallery[galleryIndex] || gallery[0];
    if (!g) return "";
    const label = photoLabel(g);
    return `
      <button type="button" class="gallery-main" id="galleryMain" data-index="${galleryIndex}" aria-label="Agrandir : ${label}">
        <img src="${g.src}" alt="${label}" id="galleryMainImg" />
        <span class="gallery-main__label">${label}</span>
        <span class="gallery-main__zoom">Agrandir</span>
      </button>`;
  }

  function relatedHTML() {
    const pool =
      (window.foireGetPublicVehicles && window.foireGetPublicVehicles()) ||
      (window.FOIRE_VEHICLES || []).filter((v) => v.published !== "offline");
    const others = pool
      .filter((v) => v.id !== vehicle.id)
      .filter((v) => (v.category || []).some((c) => (vehicle.category || []).includes(c)))
      .slice(0, 3);

    if (!others.length) return "";

    return `
      <section class="related">
        <div class="container">
          <h2 class="section-title">Véhicules similaires</h2>
          <div class="related__grid">
            ${others
              .map(
                (v) => `
              <a href="vehicule.html?id=${v.id}" class="stock-card stock-card--compact">
                <div class="stock-card__media">
                  <img src="${v.cover}" alt="${v.name}" loading="lazy" />
                </div>
                <div class="stock-card__body">
                  <h3 class="stock-card__title">${v.name}</h3>
                  <p class="stock-card__price">${formatPrice(v.price)}</p>
                </div>
              </a>`
              )
              .join("")}
          </div>
        </div>
      </section>`;
  }

  function render() {
    const g = gallery[galleryIndex] || {};
    root.innerHTML = `
      <section class="product">
        <div class="container">
          <nav class="breadcrumb" aria-label="Fil d'Ariane">
            <a href="index.html">Accueil</a>
            <span>/</span>
            <a href="voitures.html">Véhicules</a>
            <span>/</span>
            <span aria-current="page">${vehicle.name}</span>
          </nav>

          <div class="product__layout">
            <div class="product__gallery">
              <div class="gallery-main-wrap" id="galleryMainWrap">
                ${mainPhoto()}
              </div>
              <div class="gallery-thumbs" id="galleryThumbs">
                ${thumbsHTML()}
              </div>
              <p class="gallery-hint">${gallery.length} photo${gallery.length > 1 ? "s" : ""} — libellés de la galerie</p>
            </div>

            <aside class="product__info">
              <p class="product__brand">${vehicle.brand}</p>
              <h1 class="product__title">${vehicle.name}</h1>
              <p class="product__version">${vehicle.version}</p>
              <p class="product__price">${formatPrice(vehicle.price)}</p>
              <p class="product__tagline">${vehicle.tagline}</p>

              <ul class="product__quick">
                <li><strong>Année</strong> ${vehicle.year}</li>
                <li><strong>Kilométrage</strong> ${km(vehicle.mileage)}</li>
                <li><strong>Énergie</strong> ${vehicle.fuel}</li>
                <li><strong>Boîte</strong> ${vehicle.transmission}</li>
                <li><strong>Puissance</strong> ${vehicle.power}</li>
                <li><strong>Couleur</strong> ${vehicle.color}</li>
                <li><strong>État</strong> <span class="pill">${vehicle.condition}</span></li>
                <li><strong>Garantie</strong> ${vehicle.warranty}</li>
              </ul>

              <div class="product__actions" id="rdv">
                <a href="https://wa.me/221777525807?text=${encodeURIComponent("Bonjour Foire Automobile, je suis intéressé(e) par : " + vehicle.name + " " + vehicle.version + " (" + formatPrice(vehicle.price) + ")")}" class="btn btn--primary btn--full" target="_blank" rel="noopener">
                  WhatsApp — Demander un essai
                </a>
                <a href="tel:+221777525807" class="btn btn--outline-dark btn--full">Appeler — 77 752 58 07</a>
              </div>
              <p class="product__location">📍 Disponible à ${vehicle.location} · Prix en FCFA</p>
            </aside>
          </div>
        </div>
      </section>

      <section class="product-details">
        <div class="container product-details__grid">
          <div>
            <h2 class="section-title">Description</h2>
            <p class="product-details__text">${vehicle.description}</p>
            <ul class="product-highlights">
              ${highlightsList()}
            </ul>
          </div>
          <div>
            <h2 class="section-title">Caractéristiques</h2>
            <dl class="spec-table">
              ${specsRows()}
            </dl>
          </div>
        </div>
      </section>

      <section class="condition">
        <div class="container">
          <h2 class="section-title">État du véhicule</h2>
          <p class="section-desc" style="margin-bottom:1.5rem;max-width:60ch">
            Nos experts inspectent chaque zone. Voici le rapport d'état pour ce ${vehicle.name}.
          </p>
          <div class="condition__grid">
            <article class="condition__card">
              <h3>Extérieur / carrosserie</h3>
              <p>${vehicle.conditionNotes.exterior}</p>
            </article>
            <article class="condition__card">
              <h3>Intérieur / habitacle</h3>
              <p>${vehicle.conditionNotes.interior}</p>
            </article>
            <article class="condition__card">
              <h3>Mécanique / technique</h3>
              <p>${vehicle.conditionNotes.mechanical}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="equipment">
        <div class="container">
          <h2 class="section-title">Équipements & options</h2>
          <ul class="equipment__list">
            ${equipmentList()}
          </ul>
        </div>
      </section>

      ${relatedHTML()}
    `;

    bindGallery();
  }

  function bindGallery() {
    bindThumbsAndMain();
  }

  function bindThumbsAndMain() {
    document.querySelectorAll(".gallery-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        galleryIndex = Number(btn.dataset.index);
        const mainWrap = document.getElementById("galleryMainWrap");
        if (mainWrap) mainWrap.innerHTML = mainPhoto();
        document.querySelectorAll(".gallery-thumb").forEach((t) => {
          t.classList.toggle("is-active", Number(t.dataset.index) === galleryIndex);
        });
        bindMainOpen();
      });
    });
    bindMainOpen();
  }

  function bindMainOpen() {
    const main = document.getElementById("galleryMain");
    main?.addEventListener("click", () => openLightbox(galleryIndex));
  }

  /* Lightbox */
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  let lbIndex = 0;

  function openLightbox(index) {
    lbIndex = index;
    updateLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  function updateLightbox() {
    const g = gallery[lbIndex];
    if (!g) return;
    lightboxImg.src = g.src;
    lightboxImg.alt = g.label;
    lightboxCaption.textContent = `${photoLabel(g)} (${lbIndex + 1}/${gallery.length})`;
  }

  document.getElementById("lightboxClose")?.addEventListener("click", closeLightbox);
  document.getElementById("lightboxPrev")?.addEventListener("click", () => {
    lbIndex = (lbIndex - 1 + gallery.length) % gallery.length;
    updateLightbox();
  });
  document.getElementById("lightboxNext")?.addEventListener("click", () => {
    lbIndex = (lbIndex + 1) % gallery.length;
    updateLightbox();
  });

  lightbox?.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") {
      lbIndex = (lbIndex - 1 + gallery.length) % gallery.length;
      updateLightbox();
    }
    if (e.key === "ArrowRight") {
      lbIndex = (lbIndex + 1) % gallery.length;
      updateLightbox();
    }
  });

  render();
})();
