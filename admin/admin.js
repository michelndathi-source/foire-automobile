/* Foire CMS — interface admin collection véhicules */
(function () {
  "use strict";

  var loginView = document.getElementById("adminLogin");
  var appView = document.getElementById("adminApp");
  var loginForm = document.getElementById("loginForm");
  var loginError = document.getElementById("loginError");
  var passwordInput = document.getElementById("adminPassword");

  function getCMS() {
    return window.FoireCMS || null;
  }

  function tryLogin(rawPassword) {
    var pwd = String(rawPassword || "").trim();
    var CMS = getCMS();
    if (CMS && typeof CMS.login === "function") return CMS.login(pwd);
    if (pwd === "foire2026") {
      try {
        sessionStorage.setItem("foire_cms_auth", "1");
      } catch (e) {}
      try {
        localStorage.setItem("foire_cms_auth", "1");
      } catch (e2) {}
      window.__FOIRE_CMS_AUTH = true;
      return true;
    }
    return false;
  }

  function isLoggedIn() {
    if (window.__FOIRE_CMS_AUTH) return true;
    var CMS = getCMS();
    if (CMS && CMS.isAuthenticated) {
      try {
        return CMS.isAuthenticated();
      } catch (e) {}
    }
    try {
      if (sessionStorage.getItem("foire_cms_auth") === "1") return true;
    } catch (e) {}
    try {
      if (localStorage.getItem("foire_cms_auth") === "1") return true;
    } catch (e2) {}
    return false;
  }

  /* ---------- Nav back ---------- */
  var navBack = document.getElementById("navBack");
  if (navBack) {
    navBack.addEventListener("click", function () {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "../index.html";
    });
  }

  /* ---------- Views ---------- */
  var listView = document.getElementById("adminListView");
  var formView = document.getElementById("adminFormView");
  var catsView = document.getElementById("adminCatsView");
  var sidebar = document.getElementById("adminSidebar");
  var adminMain = document.querySelector(".admin-main");

  function setLayoutMode(mode) {
    // mode: "list" | "full" — full = formulaire / catégories (toute la largeur)
    if (!adminMain) return;
    if (mode === "full") {
      adminMain.classList.add("admin-main--full");
      if (sidebar) {
        sidebar.hidden = true;
        sidebar.style.display = "none";
      }
    } else {
      adminMain.classList.remove("admin-main--full");
      if (sidebar) {
        sidebar.hidden = false;
        sidebar.style.display = "";
      }
    }
  }

  function showApp() {
    if (loginView) {
      loginView.hidden = true;
      loginView.style.display = "none";
    }
    if (appView) {
      appView.hidden = false;
      appView.removeAttribute("hidden");
      appView.style.display = "";
    }
    showList();
  }

  function showLogin() {
    if (appView) {
      appView.hidden = true;
      appView.style.display = "none";
    }
    if (loginView) {
      loginView.hidden = false;
      loginView.removeAttribute("hidden");
      loginView.style.display = "";
    }
  }

  function hideAllContent() {
    if (listView) listView.hidden = true;
    if (formView) formView.hidden = true;
    if (catsView) catsView.hidden = true;
  }

  function showList() {
    hideAllContent();
    if (listView) listView.hidden = false;
    setLayoutMode("list");
    editingId = null;
    formStatus && (formStatus.hidden = true);
    refreshFilters();
    renderList();
  }

  function showCats() {
    hideAllContent();
    if (catsView) catsView.hidden = false;
    setLayoutMode("full");
    renderCatList();
  }

  function showForm(vehicle) {
    hideAllContent();
    if (formView) formView.hidden = false;
    setLayoutMode("full");
    formStatus && (formStatus.hidden = true);
    resetImageState(vehicle);
    fillForm(vehicle);
    // Remonter en haut du formulaire
    if (formView) formView.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var pwd = passwordInput ? passwordInput.value : "";
      if (tryLogin(pwd)) {
        if (loginError) loginError.hidden = true;
        showApp();
      } else {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = "Mot de passe incorrect";
        }
      }
      return false;
    });
  }

  /* ---------- State ---------- */
  var tableBody = document.getElementById("adminTableBody");
  var emptyEl = document.getElementById("adminEmpty");
  var metaEl = document.getElementById("adminMeta");
  var catFilter = document.getElementById("adminCatFilter");
  var brandFilter = document.getElementById("adminBrandFilter");
  var pubFilter = document.getElementById("adminPubFilter");
  var badgeFilter = document.getElementById("adminBadgeFilter");
  var searchEl = document.getElementById("adminSearch");
  var form = document.getElementById("vehicleForm");
  var formTitle = document.getElementById("formTitle");
  var formStatus = document.getElementById("formStatus");
  var btnDelete = document.getElementById("btnDeleteVehicle");
  var categoryBox = document.getElementById("f_categories");
  var brandList = document.getElementById("brandList");
  var coverPreview = document.getElementById("coverPreview");
  var galleryPreview = document.getElementById("galleryPreview");
  var coverHidden = document.getElementById("f_cover");
  var btnClearCover = document.getElementById("btnClearCover");

  var editingId = null;
  var catFilterVal = "all";
  var brandFilterVal = "all";
  var pubFilterVal = "all";
  var badgeFilterVal = "all";
  var query = "";

  /** Image state for form */
  var coverData = "";
  var galleryItems = []; // { src, label, zone }

  var CAT_LABELS_FALLBACK = {
    sedan: "Berline",
    suv: "SUV",
    luxury: "Luxe",
    sports: "Sport",
    van: "Utilitaire",
  };

  var BADGE_LABELS = {
    none: "—",
    new: "Nouveau",
    bestseller: "Plus vendus",
    promo: "Promo",
    featured: "Coup de cœur",
  };

  function formatPrice(n) {
    return window.foireFormatPrice ? window.foireFormatPrice(n) : n + " FCFA";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function catLabel(id) {
    var c = getCMS();
    if (c) {
      var found = c.getCategories().find(function (x) {
        return x.id === id;
      });
      if (found) return found.label;
    }
    return CAT_LABELS_FALLBACK[id] || id;
  }

  /* ---------- Images ---------- */
  function resetImageState(vehicle) {
    coverData = (vehicle && vehicle.cover) || "";
    galleryItems = vehicle && Array.isArray(vehicle.gallery)
      ? vehicle.gallery.map(function (g) {
          return {
            src: g.src,
            label: g.label || "Photo",
            zone: g.zone || "extérieur",
          };
        })
      : [];
    if (coverHidden) coverHidden.value = coverData;
    renderCoverPreview();
    renderGalleryPreview();
    var coverFile = document.getElementById("f_cover_file");
    var galFile = document.getElementById("f_gallery_files");
    if (coverFile) coverFile.value = "";
    if (galFile) galFile.value = "";
  }

  function renderCoverPreview() {
    if (!coverPreview) return;
    if (!coverData) {
      coverPreview.innerHTML =
        '<p class="admin-field-hint">Aucune couverture — uploadez une image depuis le PC.</p>';
      if (btnClearCover) btnClearCover.hidden = true;
      return;
    }
    coverPreview.innerHTML =
      '<img src="' +
      coverData.replace(/"/g, "&quot;") +
      '" alt="Couverture" />';
    if (btnClearCover) btnClearCover.hidden = false;
  }

  function renderGalleryPreview() {
    if (!galleryPreview) return;
    if (!galleryItems.length) {
      galleryPreview.innerHTML =
        '<p class="admin-field-hint">Aucune photo de galerie pour le moment. Ajoutez des images ci-dessus.</p>';
      return;
    }
    galleryPreview.innerHTML = galleryItems
      .map(function (g, i) {
        return (
          '<article class="admin-gallery-item" data-i="' +
          i +
          '">' +
          '<div class="admin-gallery-item__media">' +
          '<img src="' +
          String(g.src).replace(/"/g, "&quot;") +
          '" alt="' +
          escapeHtml(g.label || "Photo") +
          '" />' +
          '<button type="button" class="gal-replace" data-i="' +
          i +
          '" title="Changer cette image">Changer l\'image</button>' +
          "</div>" +
          '<div class="admin-gallery-item__fields">' +
          '<label class="admin-gallery-item__label">Libellé' +
          '<input type="text" class="gal-label" data-i="' +
          i +
          '" value="' +
          escapeHtml(g.label) +
          '" placeholder="Ex. Vue de face" />' +
          "</label>" +
          '<div class="admin-gallery-item__actions">' +
          '<button type="button" class="gal-replace-btn" data-i="' +
          i +
          '">Remplacer la photo</button>' +
          '<button type="button" class="gal-remove" data-i="' +
          i +
          '">Retirer</button>' +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function replaceGalleryImageAt(index) {
    var c = getCMS();
    if (!c || !c.compressImageFile) return;
    if (Number.isNaN(index) || !galleryItems[index]) return;

    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    document.body.appendChild(input);
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      document.body.removeChild(input);
      if (!file) return;
      setStatus("Remplacement de la photo " + (index + 1) + "…", true);
      c
        .compressImageFile(file, 1200, 0.78)
        .then(function (dataUrl) {
          galleryItems[index].src = dataUrl;
          renderGalleryPreview();
          setStatus("Photo " + (index + 1) + " mise à jour.", true);
        })
        .catch(function (err) {
          setStatus(err.message || "Erreur de remplacement", false);
        });
    });
    input.click();
  }

  if (galleryPreview) {
    galleryPreview.addEventListener("click", function (e) {
      var removeBtn = e.target.closest(".gal-remove");
      if (removeBtn) {
        var ri = Number(removeBtn.dataset.i);
        galleryItems.splice(ri, 1);
        renderGalleryPreview();
        return;
      }
      var replaceBtn = e.target.closest(".gal-replace, .gal-replace-btn");
      if (replaceBtn) {
        replaceGalleryImageAt(Number(replaceBtn.dataset.i));
      }
    });
    galleryPreview.addEventListener("change", function (e) {
      var t = e.target;
      var i = Number(t.dataset.i);
      if (Number.isNaN(i) || !galleryItems[i]) return;
      if (t.classList.contains("gal-label")) galleryItems[i].label = t.value;
    });
    galleryPreview.addEventListener("input", function (e) {
      var t = e.target;
      if (!t.classList.contains("gal-label")) return;
      var i = Number(t.dataset.i);
      if (!Number.isNaN(i) && galleryItems[i]) galleryItems[i].label = t.value;
    });
  }

  var coverFileInput = document.getElementById("f_cover_file");
  if (coverFileInput) {
    coverFileInput.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var c = getCMS();
      if (!c || !c.compressImageFile) return;
      setStatus("Compression de la couverture…", true);
      c
        .compressImageFile(file, 1400, 0.8)
        .then(function (dataUrl) {
          coverData = dataUrl;
          if (coverHidden) coverHidden.value = dataUrl;
          renderCoverPreview();
          setStatus("Couverture prête.", true);
        })
        .catch(function (err) {
          setStatus(err.message || "Erreur upload couverture", false);
        });
    });
  }

  if (btnClearCover) {
    btnClearCover.addEventListener("click", function () {
      coverData = "";
      if (coverHidden) coverHidden.value = "";
      if (coverFileInput) coverFileInput.value = "";
      renderCoverPreview();
    });
  }

  var galleryFileInput = document.getElementById("f_gallery_files");
  if (galleryFileInput) {
    galleryFileInput.addEventListener("change", function (e) {
      var files = e.target.files ? Array.prototype.slice.call(e.target.files) : [];
      if (!files.length) return;
      var c = getCMS();
      if (!c || !c.compressImageFile) return;
      setStatus("Upload galerie (" + files.length + ")…", true);
      var chain = Promise.resolve();
      files.forEach(function (file, idx) {
        chain = chain.then(function () {
          return c.compressImageFile(file, 1200, 0.78).then(function (dataUrl) {
            galleryItems.push({
              src: dataUrl,
              label: "Photo " + (galleryItems.length + 1),
              zone: "extérieur", // conservé pour la fiche site
            });
            renderGalleryPreview();
            setStatus(
              "Galerie : " + (idx + 1) + "/" + files.length + " ajoutée(s)",
              true
            );
          });
        });
      });
      chain.catch(function (err) {
        setStatus(err.message || "Erreur upload galerie", false);
      });
      e.target.value = "";
    });
  }

  /* ---------- Form fill / collect ---------- */
  function buildCategoryChecks(selected) {
    selected = selected || [];
    var c = getCMS();
    if (!c || !categoryBox) return;
    var cats = c.getCategories();
    categoryBox.innerHTML = cats
      .map(function (cat) {
        var checked = selected.indexOf(cat.id) !== -1 ? " checked" : "";
        return (
          '<label><input type="checkbox" name="category" value="' +
          cat.id +
          '"' +
          checked +
          " /> " +
          escapeHtml(cat.label) +
          "</label>"
        );
      })
      .join("");
  }

  function fillBrandDatalist() {
    var c = getCMS();
    if (!c || !brandList) return;
    brandList.innerHTML = c
      .getBrands()
      .map(function (b) {
        return '<option value="' + b.replace(/"/g, "&quot;") + '"></option>';
      })
      .join("");
  }

  function fillForm(vehicle) {
    form && form.reset();
    buildCategoryChecks(vehicle ? vehicle.category : []);
    fillBrandDatalist();

    if (vehicle) {
      editingId = vehicle.id;
      formTitle.textContent = "Modifier — " + vehicle.name;
      if (btnDelete) btnDelete.hidden = false;
      document.getElementById("f_previousId").value = vehicle.id;
      document.getElementById("f_id").value = vehicle.id;
      document.getElementById("f_name").value = vehicle.name || "";
      document.getElementById("f_brand").value = vehicle.brand || "";
      document.getElementById("f_version").value = vehicle.version || "";
      document.getElementById("f_price").value = vehicle.price || "";
      document.getElementById("f_year").value = vehicle.year || "";
      document.getElementById("f_mileage").value = vehicle.mileage || 0;
      document.getElementById("f_fuel").value = vehicle.fuel || "Diesel";
      document.getElementById("f_transmission").value =
        vehicle.transmission || "Automatique";
      document.getElementById("f_power").value = vehicle.power || "";
      document.getElementById("f_doors").value = vehicle.doors || 4;
      document.getElementById("f_seats").value = vehicle.seats || 5;
      document.getElementById("f_color").value = vehicle.color || "";
      document.getElementById("f_condition").value = vehicle.condition || "Bon";
      document.getElementById("f_warranty").value =
        vehicle.warranty || "12 mois Foire SN";
      document.getElementById("f_location").value =
        vehicle.location || "Foire à Dakar";
      document.getElementById("f_tagline").value = vehicle.tagline || "";
      document.getElementById("f_description").value = vehicle.description || "";
      document.getElementById("f_highlights").value = (vehicle.highlights || []).join(
        "\n"
      );
      document.getElementById("f_equipment").value = (vehicle.equipment || []).join(
        "\n"
      );
      document.getElementById("f_specs").value = Object.entries(vehicle.specs || {})
        .map(function (e) {
          return e[0] + " : " + e[1];
        })
        .join("\n");
      document.getElementById("f_cond_ext").value =
        (vehicle.conditionNotes && vehicle.conditionNotes.exterior) || "";
      document.getElementById("f_cond_int").value =
        (vehicle.conditionNotes && vehicle.conditionNotes.interior) || "";
      document.getElementById("f_cond_mec").value =
        (vehicle.conditionNotes && vehicle.conditionNotes.mechanical) || "";
      document.getElementById("f_published").value =
        vehicle.published === "offline" ? "offline" : "online";
      document.getElementById("f_badge").value = vehicle.badge || "none";
    } else {
      editingId = null;
      formTitle.textContent = "Nouveau véhicule";
      if (btnDelete) btnDelete.hidden = true;
      document.getElementById("f_previousId").value = "";
      document.getElementById("f_location").value = "Foire à Dakar";
      document.getElementById("f_warranty").value = "12 mois Foire SN";
      document.getElementById("f_year").value = new Date().getFullYear();
      document.getElementById("f_published").value = "online";
      document.getElementById("f_badge").value = "none";
    }
  }

  function collectForm() {
    var cats = Array.prototype.slice
      .call(form.querySelectorAll('input[name="category"]:checked'))
      .map(function (el) {
        return el.value;
      });

    return {
      id: document.getElementById("f_id").value.trim() || undefined,
      name: document.getElementById("f_name").value,
      brand: document.getElementById("f_brand").value,
      version: document.getElementById("f_version").value,
      category: cats,
      price: document.getElementById("f_price").value,
      year: document.getElementById("f_year").value,
      mileage: document.getElementById("f_mileage").value,
      fuel: document.getElementById("f_fuel").value,
      transmission: document.getElementById("f_transmission").value,
      power: document.getElementById("f_power").value,
      doors: document.getElementById("f_doors").value,
      seats: document.getElementById("f_seats").value,
      color: document.getElementById("f_color").value,
      condition: document.getElementById("f_condition").value,
      warranty: document.getElementById("f_warranty").value,
      location: document.getElementById("f_location").value,
      tagline: document.getElementById("f_tagline").value,
      description: document.getElementById("f_description").value,
      highlights: document.getElementById("f_highlights").value,
      equipment: document.getElementById("f_equipment").value,
      specsText: document.getElementById("f_specs").value,
      conditionNotes: {
        exterior: document.getElementById("f_cond_ext").value,
        interior: document.getElementById("f_cond_int").value,
        mechanical: document.getElementById("f_cond_mec").value,
      },
      cover: coverData,
      gallery: galleryItems.slice(),
      published: document.getElementById("f_published").value,
      badge: document.getElementById("f_badge").value,
    };
  }

  function setStatus(msg, ok) {
    if (!formStatus) return;
    formStatus.hidden = false;
    formStatus.textContent = msg;
    formStatus.className = "admin-form-status " + (ok ? "is-ok" : "is-err");
  }

  /* ---------- List ---------- */
  function refreshFilters() {
    var c = getCMS();
    if (!c) return;
    if (catFilter) {
      catFilter.innerHTML =
        '<option value="all">Toutes</option>' +
        c
          .getCategories()
          .map(function (cat) {
            return (
              '<option value="' + cat.id + '">' + escapeHtml(cat.label) + "</option>"
            );
          })
          .join("");
      catFilter.value = catFilterVal;
    }
    if (brandFilter) {
      brandFilter.innerHTML =
        '<option value="all">Toutes</option>' +
        c
          .getBrands()
          .map(function (b) {
            return (
              '<option value="' +
              b.replace(/"/g, "&quot;") +
              '">' +
              escapeHtml(b) +
              "</option>"
            );
          })
          .join("");
      brandFilter.value = brandFilterVal;
    }
    if (pubFilter) pubFilter.value = pubFilterVal;
    if (badgeFilter) badgeFilter.value = badgeFilterVal;
  }

  function filteredList() {
    var c = getCMS();
    if (!c) return [];
    var list = c.getVehicles();
    if (pubFilterVal !== "all") {
      list = list.filter(function (v) {
        return (v.published || "online") === pubFilterVal;
      });
    }
    if (badgeFilterVal !== "all") {
      list = list.filter(function (v) {
        return (v.badge || "none") === badgeFilterVal;
      });
    }
    if (catFilterVal !== "all") {
      list = list.filter(function (v) {
        return (v.category || []).indexOf(catFilterVal) !== -1;
      });
    }
    if (brandFilterVal !== "all") {
      list = list.filter(function (v) {
        return v.brand === brandFilterVal;
      });
    }
    if (query) {
      var q = query.toLowerCase();
      list = list.filter(function (v) {
        return (
          [v.name, v.brand, v.version, v.id].join(" ").toLowerCase().indexOf(q) !==
          -1
        );
      });
    }
    return list;
  }

  function renderList() {
    var c = getCMS();
    if (!c || !tableBody || !metaEl) return;
    var list = filteredList();
    metaEl.textContent =
      list.length +
      " véhicule(s)" +
      (c.hasCmsOverride() ? " · CMS actif" : " · seed");

    if (!list.length) {
      tableBody.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    tableBody.innerHTML = list
      .map(function (v) {
        var tags = (v.category || [])
          .map(function (id) {
            return '<span class="admin-tag">' + escapeHtml(catLabel(id)) + "</span>";
          })
          .join("");
        var pub = v.published === "offline" ? "offline" : "online";
        var pubClass = pub === "online" ? "is-online" : "is-offline";
        return (
          '<tr data-id="' +
          v.id +
          '">' +
          '<td><img class="admin-thumb" src="' +
          String(v.cover || "").replace(/"/g, "&quot;") +
          '" alt="" /></td>' +
          '<td><div class="admin-vehicle-name">' +
          escapeHtml(v.name) +
          '</div><div class="admin-vehicle-version">' +
          escapeHtml(v.version || "") +
          "</div></td>" +
          "<td>" +
          escapeHtml(v.brand) +
          "</td>" +
          '<td><div class="admin-tags">' +
          tags +
          "</div></td>" +
          '<td><span class="admin-status ' +
          pubClass +
          '">' +
          (pub === "online" ? "En ligne" : "Hors ligne") +
          "</span></td>" +
          "<td>" +
          escapeHtml(BADGE_LABELS[v.badge] || v.badge || "—") +
          "</td>" +
          '<td class="admin-price">' +
          formatPrice(v.price) +
          "</td>" +
          '<td><div class="admin-row-actions">' +
          '<button type="button" data-action="edit">Modifier</button>' +
          '<button type="button" data-action="toggle">' +
          (pub === "online" ? "Hors ligne" : "En ligne") +
          "</button>" +
          '<button type="button" data-action="delete" class="is-danger">Suppr.</button>' +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  /* ---------- Categories view ---------- */
  var catListEl = document.getElementById("adminCatList");
  var catStatus = document.getElementById("catStatus");
  var catCreateForm = document.getElementById("catCreateForm");

  function setCatStatus(msg, ok) {
    if (!catStatus) return;
    catStatus.hidden = false;
    catStatus.textContent = msg;
    catStatus.className = "admin-form-status " + (ok ? "is-ok" : "is-err");
  }

  function renderCatList() {
    var c = getCMS();
    if (!c || !catListEl) return;
    var cats = c.getCategories();
    catListEl.innerHTML = cats
      .map(function (cat) {
        return (
          '<li class="admin-cat-item" data-id="' +
          cat.id +
          '">' +
          '<input type="text" class="cat-label-input" value="' +
          escapeHtml(cat.label) +
          '" data-id="' +
          cat.id +
          '" />' +
          '<code class="cat-id">' +
          escapeHtml(cat.id) +
          "</code>" +
          '<button type="button" class="btn btn--sm admin-btn-outline cat-save" data-id="' +
          cat.id +
          '">Renommer</button>' +
          '<button type="button" class="btn btn--sm admin-btn-danger cat-del" data-id="' +
          cat.id +
          '">Supprimer</button>' +
          "</li>"
        );
      })
      .join("");
  }

  if (catCreateForm) {
    catCreateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = getCMS();
      if (!c) return;
      var input = document.getElementById("newCatLabel");
      try {
        c.addCategory(input.value);
        input.value = "";
        setCatStatus("Catégorie créée — visible dans les filtres du site.", true);
        renderCatList();
        refreshFilters();
      } catch (err) {
        setCatStatus(err.message || "Erreur", false);
      }
    });
  }

  if (catListEl) {
    catListEl.addEventListener("click", function (e) {
      var c = getCMS();
      if (!c) return;
      var save = e.target.closest(".cat-save");
      var del = e.target.closest(".cat-del");
      if (save) {
        var id = save.dataset.id;
        var input = catListEl.querySelector(
          '.cat-label-input[data-id="' + id + '"]'
        );
        try {
          c.updateCategory(id, input ? input.value : "");
          setCatStatus("Catégorie mise à jour (véhicules synchronisés).", true);
          renderCatList();
          refreshFilters();
        } catch (err) {
          setCatStatus(err.message || "Erreur", false);
        }
      }
      if (del) {
        if (!confirm("Supprimer cette catégorie ? Les véhicules seront réaffectés."))
          return;
        try {
          c.removeCategory(del.dataset.id);
          setCatStatus("Catégorie supprimée.", true);
          renderCatList();
          refreshFilters();
        } catch (err) {
          setCatStatus(err.message || "Erreur", false);
        }
      }
    });
  }

  /* ---------- Events ---------- */
  document.getElementById("btnLogout") &&
    document.getElementById("btnLogout").addEventListener("click", function () {
      var c = getCMS();
      if (c && c.logout) c.logout();
      window.__FOIRE_CMS_AUTH = false;
      showLogin();
    });

  document.getElementById("btnNewVehicle") &&
    document.getElementById("btnNewVehicle").addEventListener("click", function () {
      showForm(null);
    });

  document.getElementById("btnBackList") &&
    document.getElementById("btnBackList").addEventListener("click", showList);
  document.getElementById("btnCancelForm") &&
    document.getElementById("btnCancelForm").addEventListener("click", showList);
  document.getElementById("btnNavList") &&
    document.getElementById("btnNavList").addEventListener("click", showList);
  document.getElementById("btnNavCats") &&
    document.getElementById("btnNavCats").addEventListener("click", showCats);
  document.getElementById("btnBackFromCats") &&
    document
      .getElementById("btnBackFromCats")
      .addEventListener("click", showList);

  function bindFilter(el, setter) {
    if (!el) return;
    el.addEventListener("change", function () {
      setter(el.value);
      renderList();
    });
  }
  bindFilter(catFilter, function (v) {
    catFilterVal = v;
  });
  bindFilter(brandFilter, function (v) {
    brandFilterVal = v;
  });
  bindFilter(pubFilter, function (v) {
    pubFilterVal = v;
  });
  bindFilter(badgeFilter, function (v) {
    badgeFilterVal = v;
  });
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      query = searchEl.value.trim();
      renderList();
    });
  }

  if (tableBody) {
    tableBody.addEventListener("click", function (e) {
      var c = getCMS();
      if (!c) return;
      var btn = e.target.closest("button[data-action]");
      if (!btn) return;
      var tr = btn.closest("tr");
      var id = tr && tr.dataset.id;
      if (!id) return;
      var action = btn.dataset.action;
      if (action === "edit") {
        showForm(c.getVehicle(id));
      } else if (action === "delete") {
        if (confirm("Supprimer ce véhicule de la collection ?")) {
          c.removeVehicle(id);
          refreshFilters();
          renderList();
        }
      } else if (action === "toggle") {
        var v = c.getVehicle(id);
        if (!v) return;
        v.published = v.published === "offline" ? "online" : "offline";
        c.upsertVehicle(v, id);
        renderList();
      }
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = getCMS();
      if (!c) {
        setStatus("CMS non chargé", false);
        return;
      }
      try {
        var data = collectForm();
        c.upsertVehicle(data, editingId || null);
        setStatus("Enregistré — visible sur le site si le statut est « En ligne ».", true);
        refreshFilters();
        setTimeout(showList, 600);
      } catch (err) {
        setStatus(err.message || "Erreur d'enregistrement", false);
      }
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener("click", function () {
      var c = getCMS();
      if (!editingId || !c) return;
      if (!confirm("Supprimer définitivement ce véhicule ?")) return;
      c.removeVehicle(editingId);
      refreshFilters();
      showList();
    });
  }

  document.getElementById("btnExport") &&
    document.getElementById("btnExport").addEventListener("click", function () {
      var c = getCMS();
      if (!c) return;
      var blob = new Blob([c.exportJSON()], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "foire-collection.json";
      a.click();
      URL.revokeObjectURL(a.href);
    });

  document.getElementById("btnImport") &&
    document.getElementById("btnImport").addEventListener("change", function (e) {
      var c = getCMS();
      if (!c) return;
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          c.importJSON(String(reader.result));
          refreshFilters();
          renderList();
          alert("Import réussi.");
        } catch (err) {
          alert("Import impossible : " + (err.message || err));
        }
        e.target.value = "";
      };
      reader.readAsText(file);
    });

  document.getElementById("btnReset") &&
    document.getElementById("btnReset").addEventListener("click", function () {
      var c = getCMS();
      if (!c) return;
      if (
        !confirm(
          "Réinitialiser véhicules + catégories d'origine ? Les uploads CMS seront effacés."
        )
      )
        return;
      c.resetToSeed();
      catFilterVal = brandFilterVal = pubFilterVal = badgeFilterVal = "all";
      query = "";
      if (searchEl) searchEl.value = "";
      refreshFilters();
      renderList();
    });

  // Boot
  if (isLoggedIn()) showApp();
  else showLogin();
})();
