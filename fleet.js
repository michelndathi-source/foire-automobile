/* Foire — stock accueil (collection CMS, online only) */
(function () {
  "use strict";

  var grid = document.getElementById("fleetGrid");
  var filtersEl = document.getElementById("fleetFilters");
  if (!grid) return;

  function getVehicles() {
    if (window.foireGetPublicVehicles) return window.foireGetPublicVehicles();
    if (window.FoireCMS && window.FoireCMS.getPublicVehicles) {
      return window.FoireCMS.getPublicVehicles();
    }
    return (window.FOIRE_VEHICLES || []).filter(function (v) {
      return v.published !== "offline";
    });
  }

  function getCategories() {
    return window.FOIRE_CATEGORIES || [];
  }

  var formatPrice = window.foireFormatPrice;
  var activeCategory = "all";
  var activeBrand = "all";
  var activeBadge = "all";

  function brands() {
    var set = {};
    getVehicles().forEach(function (v) {
      if (v.brand) set[v.brand] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, "fr");
    });
  }

  function renderCategoryFilters() {
    if (!filtersEl) return;
    var categories = getCategories();
    filtersEl.innerHTML = categories
      .map(function (c) {
        var active = c.id === activeCategory;
        return (
          '<button type="button" class="filters__btn' +
          (active ? " is-active" : "") +
          '" data-filter="' +
          c.id +
          '" role="tab" aria-selected="' +
          (active ? "true" : "false") +
          '">' +
          c.label +
          "</button>"
        );
      })
      .join("");

    filtersEl.querySelectorAll(".filters__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeCategory = btn.dataset.filter;
        filtersEl.querySelectorAll(".filters__btn").forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("is-active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        render();
      });
    });
  }

  function renderBrandFilters() {
    var brandEl = document.getElementById("fleetBrandFilters");
    if (!brandEl) return;
    var list = brands();
    if (!list.length) {
      brandEl.innerHTML = "";
      brandEl.hidden = true;
      return;
    }
    brandEl.hidden = false;
    brandEl.innerHTML =
      '<button type="button" class="filters__btn' +
      (activeBrand === "all" ? " is-active" : "") +
      '" data-brand="all">Toutes marques</button>' +
      list
        .map(function (b) {
          return (
            '<button type="button" class="filters__btn' +
            (activeBrand === b ? " is-active" : "") +
            '" data-brand="' +
            b.replace(/"/g, "&quot;") +
            '">' +
            b +
            "</button>"
          );
        })
        .join("");

    brandEl.querySelectorAll(".filters__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeBrand = btn.dataset.brand;
        brandEl.querySelectorAll(".filters__btn").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        render();
      });
    });
  }

  function renderBadgeFilters() {
    var badgeEl = document.getElementById("fleetBadgeFilters");
    if (!badgeEl) return;
    var options = [
      { id: "all", label: "Tous" },
      { id: "new", label: "Nouveau" },
      { id: "bestseller", label: "Les plus vendus" },
      { id: "promo", label: "Promo" },
      { id: "featured", label: "Coup de cœur" },
    ];
    badgeEl.innerHTML = options
      .map(function (o) {
        return (
          '<button type="button" class="filters__btn' +
          (activeBadge === o.id ? " is-active" : "") +
          '" data-badge="' +
          o.id +
          '">' +
          o.label +
          "</button>"
        );
      })
      .join("");
    badgeEl.querySelectorAll(".filters__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeBadge = btn.dataset.badge;
        badgeEl.querySelectorAll(".filters__btn").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        render();
      });
    });
  }

  function filtered() {
    return getVehicles().filter(function (v) {
      var cats = v.category || [];
      var okCat =
        activeCategory === "all" || cats.indexOf(activeCategory) !== -1;
      var okBrand = activeBrand === "all" || v.brand === activeBrand;
      var okBadge =
        activeBadge === "all" || (v.badge || "none") === activeBadge;
      return okCat && okBrand && okBadge;
    });
  }

  function badgeHTML(v) {
    var map = {
      new: "Nouveau",
      bestseller: "Plus vendus",
      promo: "Promo",
      featured: "Coup de cœur",
    };
    if (!v.badge || v.badge === "none" || !map[v.badge]) return "";
    return (
      '<span class="car-card__badge car-card__badge--' +
      v.badge +
      '">' +
      map[v.badge] +
      "</span>"
    );
  }

  function cardHTML(v) {
    var cats = (v.category || []).join(" ");
    return (
      '<a href="vehicule.html?id=' +
      encodeURIComponent(v.id) +
      '" class="car-card" data-category="' +
      cats +
      '" data-brand="' +
      (v.brand || "").replace(/"/g, "&quot;") +
      '">' +
      '<div class="car-card__img-wrap">' +
      badgeHTML(v) +
      '<img src="' +
      (v.cover || "") +
      '" alt="' +
      (v.name || "") +
      '" loading="lazy" />' +
      "</div>" +
      '<div class="car-card__body">' +
      "<h3>" +
      (v.name || "") +
      "</h3>" +
      '<p class="car-card__price">' +
      formatPrice(v.price) +
      "</p>" +
      "</div>" +
      "</a>"
    );
  }

  function render() {
    var list = filtered();
    if (!list.length) {
      grid.innerHTML =
        '<p class="fleet__empty">Aucun véhicule pour ce filtre.</p>';
      return;
    }
    grid.innerHTML = list.map(cardHTML).join("");
  }

  renderCategoryFilters();
  renderBrandFilters();
  renderBadgeFilters();
  render();
})();
