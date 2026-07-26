/* Foire — interactions */

(function () {
  "use strict";

  // Bouton retour — dans le header (pas flottant par-dessus le design)
  function ensureNavBack() {
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
      // Déplacer le logo dans header__start
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

  // Search card → catalogue
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

})();
