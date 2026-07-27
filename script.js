/* Foire — interactions */

(function () {
  "use strict";

  // Accueil : pas de bouton retour
  function isHomePage() {
    const path = (window.location.pathname || "").replace(/\\/g, "/");
    const file = path.split("/").pop() || "";
    return (
      file === "" ||
      file === "index.html" ||
      path.endsWith("/") ||
      /\/site%20vitrene\/?$/i.test(path)
    );
  }

  // Bouton retour — dans le header (sauf page d'accueil)
  function ensureNavBack() {
    if (isHomePage()) {
      const existing = document.getElementById("navBack");
      if (existing) existing.remove();
      return;
    }

    const existing = document.getElementById("navBack");
    if (existing) {
      existing.addEventListener("click", onNavBack);
      return;
    }

    const headerInner = document.querySelector(".header__inner");
    if (!headerInner) return;

    let start = headerInner.querySelector(".header__start");
    if (!start) {
      start = document.createElement("div");
      start.className = "header__start";
      const logo = headerInner.querySelector(".logo");
      if (logo) start.appendChild(logo);
      headerInner.insertBefore(start, headerInner.firstChild);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "navBack";
    btn.className = "nav-back";
    btn.setAttribute("aria-label", "Page précédente");
    btn.title = "Retour";
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg><span>Retour</span>';
    btn.addEventListener("click", onNavBack);
    start.insertBefore(btn, start.firstChild);
  }

  function onNavBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      const isAdmin = /\/admin\//i.test(window.location.pathname);
      window.location.href = isAdmin ? "../index.html" : "index.html";
    }
  }

  ensureNavBack();

  // FAQ : un seul accordéon ouvert à la fois
  function initFaqAccordion() {
    const list = document.querySelector(".faq__list");
    if (!list) return;
    const items = list.querySelectorAll("details.faq__item");
    items.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }
  initFaqAccordion();

  // Sticky header shadow
  const header = document.getElementById("header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const menuToggle = document.getElementById("menuToggle");
  const nav = document.getElementById("nav");

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Ouvrir le menu");
      });
    });
  }

  // Calendly — prise de rendez-vous (visite / essai)
  // Remplacez l’URL par votre lien Calendly personnel ou d’équipe.
  const FOIRE_CALENDLY_URL =
    window.FOIRE_CALENDLY_URL ||
    "https://calendly.com/foireautomobile/visite-dakar";

  function loadCalendlyAssets() {
    return new Promise((resolve) => {
      if (window.Calendly) {
        resolve();
        return;
      }
      if (!document.querySelector('link[data-calendly-css]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://assets.calendly.com/assets/external/widget.css";
        link.setAttribute("data-calendly-css", "1");
        document.head.appendChild(link);
      }
      const existing = document.querySelector("script[data-calendly-js]");
      if (existing) {
        existing.addEventListener("load", () => resolve());
        if (window.Calendly) resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.setAttribute("data-calendly-js", "1");
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.body.appendChild(script);
    });
  }

  function openCalendlyRdv() {
    const typeEl = document.getElementById("rdvType");
    const type = typeEl ? typeEl.value : "visite";
    const typeLabel = {
      visite: "Visite au parc",
      essai: "Essai véhicule",
      rdv: "Rendez-vous conseiller",
    };
    const url =
      FOIRE_CALENDLY_URL +
      (FOIRE_CALENDLY_URL.indexOf("?") === -1 ? "?" : "&") +
      "a1=" +
      encodeURIComponent(typeLabel[type] || type);

    loadCalendlyAssets().then(() => {
      if (window.Calendly && typeof window.Calendly.initPopupWidget === "function") {
        window.Calendly.initPopupWidget({ url: url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    });
  }

  const rdvBtn = document.getElementById("rdvCalendly");
  if (rdvBtn) {
    rdvBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openCalendlyRdv();
    });
  }

  // Ancien bouton recherche → catalogue (si encore présent)
  const searchBtn = document.getElementById("searchCars");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      window.location.href = "voitures.html";
    });
  }

  // Newsletter
  const newsletter = document.getElementById("newsletter");
  if (newsletter) {
    newsletter.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = newsletter.querySelector('input[type="email"]');
      if (!input || !input.value.trim()) return;
      const btn = newsletter.querySelector("button");
      const original = btn.textContent;
      btn.textContent = "Merci !";
      btn.disabled = true;
      input.value = "";
      setTimeout(() => {
        btn.textContent = original;
        btn.disabled = false;
      }, 2200);
    });
  }

  // ===== Formulaire de contact (remplace le bouton WhatsApp navbar) =====
  function ensureContactModal() {
    if (document.getElementById("contactModal")) return;

    const wrap = document.createElement("div");
    wrap.id = "contactModal";
    wrap.className = "contact-modal";
    wrap.hidden = true;
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "contactModalTitle");
    wrap.innerHTML = `
      <div class="contact-modal__backdrop" data-contact-close tabindex="-1"></div>
      <div class="contact-modal__dialog">
        <button type="button" class="contact-modal__close" data-contact-close aria-label="Fermer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <p class="section-label">Contact</p>
        <h2 id="contactModalTitle" class="contact-modal__title">Écrivez-nous</h2>
        <p class="contact-modal__lead">Laissez vos coordonnées, un conseiller Foire à Dakar vous répond rapidement.</p>
        <form class="contact-form" id="contactForm" novalidate>
          <div class="contact-form__row">
            <div class="contact-form__field">
              <label for="contactName">Nom complet *</label>
              <input type="text" id="contactName" name="name" required autocomplete="name" placeholder="Votre nom" />
            </div>
            <div class="contact-form__field">
              <label for="contactPhone">Téléphone *</label>
              <input type="tel" id="contactPhone" name="phone" required autocomplete="tel" placeholder="77 XXX XX XX" />
            </div>
          </div>
          <div class="contact-form__field">
            <label for="contactEmail">E-mail</label>
            <input type="email" id="contactEmail" name="email" autocomplete="email" placeholder="vous@email.com" />
          </div>
          <div class="contact-form__field">
            <label for="contactSubject">Sujet</label>
            <select id="contactSubject" name="subject">
              <option value="Demande d'information">Demande d'information</option>
              <option value="Essai véhicule">Essai véhicule</option>
              <option value="Échange / reprise">Échange / reprise</option>
              <option value="Mutation / carte grise">Mutation / carte grise</option>
              <option value="Location">Location</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div class="contact-form__field">
            <label for="contactVehicle">Véhicule intéressé <span class="contact-form__optional">(optionnel)</span></label>
            <select id="contactVehicle" name="vehicle">
              <option value="">— Aucun véhicule précis —</option>
            </select>
          </div>
          <div class="contact-form__field">
            <label for="contactMessage">Message *</label>
            <textarea id="contactMessage" name="message" rows="4" required placeholder="Décrivez votre besoin…"></textarea>
          </div>
          <button type="submit" class="btn btn--primary btn--full" id="contactSubmit">Envoyer le message</button>
          <p class="contact-form__status" id="contactStatus" hidden></p>
        </form>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function getPublicVehiclesForContact() {
    if (typeof window.foireGetPublicVehicles === "function") {
      return window.foireGetPublicVehicles() || [];
    }
    if (window.FoireCMS && typeof window.FoireCMS.getPublicVehicles === "function") {
      return window.FoireCMS.getPublicVehicles() || [];
    }
    return (window.FOIRE_VEHICLES || []).filter(function (v) {
      return v.published !== "offline";
    });
  }

  function formatVehicleOption(v) {
    const price =
      typeof window.foireFormatPrice === "function"
        ? window.foireFormatPrice(v.price)
        : String(v.price || "") + " FCFA";
    const parts = [v.brand, v.name, v.version].filter(Boolean).join(" ");
    return parts + (price ? " — " + price : "");
  }

  function fillContactVehicles(preselectId) {
    const select = document.getElementById("contactVehicle");
    if (!select) return;

    const current = preselectId || select.value || "";
    const vehicles = getPublicVehiclesForContact().slice().sort(function (a, b) {
      const na = [a.brand, a.name].join(" ");
      const nb = [b.brand, b.name].join(" ");
      return na.localeCompare(nb, "fr");
    });

    select.innerHTML =
      '<option value="">— Aucun véhicule précis —</option>' +
      vehicles
        .map(function (v) {
          const label = formatVehicleOption(v);
          const value = [
            v.id || "",
            v.brand || "",
            v.name || "",
            v.version || "",
            typeof window.foireFormatPrice === "function"
              ? window.foireFormatPrice(v.price)
              : String(v.price || ""),
          ].join(" | ");
          return (
            '<option value="' +
            String(value).replace(/"/g, "&quot;") +
            '" data-id="' +
            String(v.id || "").replace(/"/g, "&quot;") +
            '">' +
            label.replace(/</g, "&lt;") +
            "</option>"
          );
        })
        .join("");

    // Pré-sélection (ex. page fiche véhicule)
    if (current) {
      const byValue = Array.prototype.find.call(select.options, function (o) {
        return o.value === current;
      });
      if (byValue) {
        select.value = current;
      } else {
        const byId = select.querySelector('option[data-id="' + CSS.escape(current) + '"]');
        if (byId) select.value = byId.value;
      }
    }

    // Si on est sur une fiche véhicule, préremplir
    try {
      const params = new URLSearchParams(window.location.search);
      const pageId = params.get("id");
      if (pageId && !select.value) {
        const opt = select.querySelector('option[data-id="' + CSS.escape(pageId) + '"]');
        if (opt) select.value = opt.value;
      }
    } catch (e) {}
  }

  function openContactModal() {
    ensureContactModal();
    fillContactVehicles();
    const modal = document.getElementById("contactModal");
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const first = document.getElementById("contactName");
    if (first) setTimeout(() => first.focus(), 50);
  }

  function closeContactModal() {
    const modal = document.getElementById("contactModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  ensureContactModal();

  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-contact-open], #openContact");
    if (openBtn) {
      e.preventDefault();
      openContactModal();
      return;
    }
    if (e.target.closest("[data-contact-close]")) {
      closeContactModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeContactModal();
  });

  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form || form.id !== "contactForm") return;
    e.preventDefault();

    const name = form.querySelector("#contactName");
    const phone = form.querySelector("#contactPhone");
    const email = form.querySelector("#contactEmail");
    const subject = form.querySelector("#contactSubject");
    const vehicle = form.querySelector("#contactVehicle");
    const message = form.querySelector("#contactMessage");
    const status = form.querySelector("#contactStatus");
    const submitBtn = form.querySelector("#contactSubmit");

    const nameVal = name ? name.value.trim() : "";
    const phoneVal = phone ? phone.value.trim() : "";
    const msgVal = message ? message.value.trim() : "";
    const emailVal = email ? email.value.trim() : "";
    const subjectVal = subject ? subject.value : "Contact";
    const vehicleVal = vehicle ? vehicle.value.trim() : "";

    if (!nameVal || !phoneVal || !msgVal) {
      if (status) {
        status.hidden = false;
        status.className = "contact-form__status is-err";
        status.textContent = "Merci de remplir le nom, le téléphone et le message.";
      }
      return;
    }

    // Envoi via e-mail (site statique) + confirmation
    const body = [
      "Nouveau message — Foire Automobile",
      "",
      "Nom : " + nameVal,
      "Téléphone : " + phoneVal,
      emailVal ? "E-mail : " + emailVal : null,
      "Sujet : " + subjectVal,
      vehicleVal ? "Véhicule intéressé : " + vehicleVal.replace(/\s*\|\s*/g, " — ") : "Véhicule intéressé : non précisé",
      "",
      "Message :",
      msgVal,
    ]
      .filter(Boolean)
      .join("\n");

    const mailto =
      "mailto:contact@foireautomobile.sn?subject=" +
      encodeURIComponent("[Foire] " + subjectVal + " — " + nameVal) +
      "&body=" +
      encodeURIComponent(body);

    try {
      window.location.href = mailto;
    } catch (err) {}

    if (status) {
      status.hidden = false;
      status.className = "contact-form__status is-ok";
      status.textContent =
        "Merci " + nameVal + " ! Votre message est prêt. Nous vous recontactons très vite à Dakar.";
    }
    if (submitBtn) {
      submitBtn.textContent = "Message envoyé";
      submitBtn.disabled = true;
    }
    form.reset();
    setTimeout(() => {
      if (submitBtn) {
        submitBtn.textContent = "Envoyer le message";
        submitBtn.disabled = false;
      }
      closeContactModal();
    }, 2200);
  });

})();
