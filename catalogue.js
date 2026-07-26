/* Foire — page catalogue (CMS, online + filtres cat/marque/choix) */
(function () {
  "use strict";

  function getVehicles() {
    if (window.foireGetPublicVehicles) return window.foireGetPublicVehicles();
    if (window.FoireCMS && window.FoireCMS.getPublicVehicles) {
      return window.FoireCMS.getPublicVehicles();
    }
    return (window.FOIRE_VEHICLES || []).filter(function (v) {
      return v.published !== "offline";
    });
  }

  var categories = window.FOIRE_CATEGORIES || [];
  var formatPrice = window.foireFormatPrice;

  var grid = document.getElementById("catalogGrid");
  var filtersEl = document.getElementById("catalogFilters");
  var brandFiltersEl = document.getElementById("catalogBrandFilters");
  var badgeFiltersEl = document.getElementById("catalogBadgeFilters");
  var countEl = document.getElementById("catalogCount");
  var emptyEl = document.getElementById("catalogEmpty");
  var searchEl = document.getElementById("catalogSearch");
  var sortEl = document.getElementById("catalogSort");

  if (!grid) return;

  var activeFilter = "all";
  var activeBrand = "all";
  var activeBadge = "all";
  var query = "";
  var sort = "price-asc";

  function getBrands() {
    var set = {};
    getVehicles().forEach(function (v) {
      if (v.brand) set[v.brand] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, "fr");
    });
  }

  function renderFilters() {
    if (!filtersEl) return;
    categories = window.FOIRE_CATEGORIES || categories;
    filtersEl.innerHTML = categories
      .map(function (c, i) {
        return (
          '<button type="button" class="filters__btn' +
          (i === 0 ? " is-active" : "") +
          '" data-filter="' +
          c.id +
          '" role="tab" aria-selected="' +
          (i === 0 ? "true" : "false") +
          '">' +
          c.label +
          "</button>"
        );
      })
      .join("");

    filtersEl.querySelectorAll(".filters__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeFilter = btn.dataset.filter;
        filtersEl.querySelectorAll(".filters__btn").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-selected", b === btn ? "true" : "false");
        });
        render();
      });
    });
  }

  function renderBrandFilters() {
    if (!brandFiltersEl) return;
    var list = getBrands();
    brandFiltersEl.innerHTML =
      '<button type="button" class="filters__btn is-active" data-brand="all">Toutes marques</button>' +
      list
        .map(function (b) {
          return (
            '<button type="button" class="filters__btn" data-brand="' +
            b.replace(/"/g, "&quot;") +
            '">' +
            b +
            "</button>"
          );
        })
        .join("");

    brandFiltersEl.querySelectorAll(".filters__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeBrand = btn.dataset.brand;
        brandFiltersEl.querySelectorAll(".filters__btn").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        render();
      });
    });
  }

  function renderBadgeFilters() {
    if (!badgeFiltersEl) return;
    var options = [
      { id: "all", label: "Tous les choix" },
      { id: "new", label: "Nouveau" },
      { id: "bestseller", label: "Les plus vendus" },
      { id: "promo", label: "Promo" },
      { id: "featured", label: "Coup de cœur" },
    ];
    badgeFiltersEl.innerHTML = options
      .map(function (o, i) {
        return (
          '<button type="button" class="filters__btn' +
          (i === 0 ? " is-active" : "") +
          '" data-badge="' +
          o.id +
          '">' +
          o.label +
          "</button>"
        );
      })
      .join("");
    badgeFiltersEl.querySelectorAll(".filters__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeBadge = btn.dataset.badge;
        badgeFiltersEl.querySelectorAll(".filters__btn").forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
        });
        render();
      });
    });
  }

  function getFiltered() {
    var list = getVehicles().slice();

    if (activeFilter !== "all") {
      list = list.filter(function (v) {
        return (v.category || []).indexOf(activeFilter) !== -1;
      });
    }

    if (activeBrand !== "all") {
      list = list.filter(function (v) {
        return v.brand === activeBrand;
      });
    }

    if (activeBadge !== "all") {
      list = list.filter(function (v) {
        return (v.badge || "none") === activeBadge;
      });
    }

    if (query) {
      var q = query.toLowerCase();
      list = list.filter(function (v) {
        var hay = [v.name, v.brand, v.version, v.fuel, v.color, v.location]
          .join(" ")
          .toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    list.sort(function (a, b) {
      switch (sort) {
        case "price-desc":
          return b.price - a.price;
        case "year-desc":
          return b.year - a.year;
        case "km-asc":
          return a.mileage - b.mileage;
        case "name":
          return a.name.localeCompare(b.name, "fr");
        case "price-asc":
        default:
          return a.price - b.price;
      }
    });

    return list;
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
      '<span class="stock-card__choice stock-card__choice--' +
      v.badge +
      '">' +
      map[v.badge] +
      "</span>"
    );
  }

  function cardHTML(v) {
    var km = new Intl.NumberFormat("fr-FR").format(v.mileage);
    return (
      '<a href="vehicule.html?id=' +
      encodeURIComponent(v.id) +
      '" class="stock-card">' +
      '<div class="stock-card__media">' +
      badgeHTML(v) +
      '<img src="' +
      v.cover +
      '" alt="' +
      v.name +
      '" loading="lazy" width="600" height="400" />' +
      '<span class="stock-card__badge">' +
      (v.condition || "") +
      "</span>" +
      "</div>" +
      '<div class="stock-card__body">' +
      '<div class="stock-card__top">' +
      '<p class="stock-card__brand">' +
      v.brand +
      "</p>" +
      '<p class="stock-card__price">' +
      formatPrice(v.price) +
      "</p>" +
      "</div>" +
      '<h2 class="stock-card__title">' +
      v.name +
      "</h2>" +
      '<p class="stock-card__version">' +
      (v.version || "") +
      "</p>" +
      '<ul class="stock-card__specs">' +
      "<li>" +
      v.year +
      "</li>" +
      "<li>" +
      km +
      " km</li>" +
      "<li>" +
      v.fuel +
      "</li>" +
      "<li>" +
      v.transmission +
      "</li>" +
      "</ul>" +
      '<span class="stock-card__cta">Voir la fiche & photos →</span>' +
      "</div>" +
      "</a>"
    );
  }

  function render() {
    var list = getFiltered();
    if (countEl) countEl.textContent = String(list.length);
    if (emptyEl) emptyEl.hidden = list.length > 0;
    grid.innerHTML = list.map(cardHTML).join("");
  }

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      query = searchEl.value.trim();
      render();
    });
  }

  if (sortEl) {
    sortEl.addEventListener("change", function () {
      sort = sortEl.value;
      render();
    });
  }

  renderFilters();
  renderBrandFilters();
  renderBadgeFilters();
  render();
})();
