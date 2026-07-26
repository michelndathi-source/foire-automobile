/**
 * Foire CMS — collection véhicules
 * - Upload images (data URL compressées)
 * - Catégories personnalisables
 * - Publication online / offline
 * - Badge: nouveau, best-seller, promo…
 */
(function () {
  "use strict";

  var STORAGE_KEY = "foire_cms_vehicles_v1";
  var CAT_STORAGE_KEY = "foire_cms_categories_v1";
  var AUTH_KEY = "foire_cms_auth";

  var DEFAULT_CATEGORIES = [
    { id: "sedan", label: "Berline" },
    { id: "suv", label: "SUV" },
    { id: "luxury", label: "Luxe" },
    { id: "sports", label: "Sport" },
    { id: "van", label: "Utilitaire" },
  ];

  var BADGE_OPTIONS = [
    { id: "none", label: "Aucun" },
    { id: "new", label: "Nouveau" },
    { id: "bestseller", label: "Les plus vendus" },
    { id: "promo", label: "Promo" },
    { id: "featured", label: "Coup de cœur" },
  ];

  if (!window.FOIRE_VEHICLES_SEED) {
    window.FOIRE_VEHICLES_SEED = Array.isArray(window.FOIRE_VEHICLES)
      ? JSON.parse(JSON.stringify(window.FOIRE_VEHICLES))
      : [];
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function slugify(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn("[Foire CMS] stockage plein ou bloqué", e);
      throw new Error(
        "Stockage local plein. Réduisez le nombre/taille des photos ou supprimez des véhicules."
      );
    }
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  /* ---------- Categories ---------- */
  function getDefaultCategories() {
    return clone(DEFAULT_CATEGORIES);
  }

  function getCategories() {
    var raw = safeGet(CAT_STORAGE_KEY);
    if (raw) {
      try {
        var data = JSON.parse(raw);
        if (Array.isArray(data) && data.length) {
          return data
            .map(function (c) {
              return {
                id: slugify(c.id || c.label) || "cat",
                label: String(c.label || c.id || "").trim() || "Catégorie",
              };
            })
            .filter(function (c) {
              return c.id && c.id !== "all";
            });
        }
      } catch (e) {}
    }
    return getDefaultCategories();
  }

  function setCategories(list) {
    if (!Array.isArray(list) || !list.length) {
      throw new Error("Au moins une catégorie est requise");
    }
    var cleaned = [];
    var seen = {};
    list.forEach(function (c) {
      var id = slugify(c.id || c.label);
      var label = String(c.label || "").trim();
      if (!id || !label || seen[id]) return;
      seen[id] = true;
      cleaned.push({ id: id, label: label });
    });
    if (!cleaned.length) throw new Error("Catégories invalides");
    safeSet(CAT_STORAGE_KEY, JSON.stringify(cleaned));
    syncPublicCategories();
    return cleaned;
  }

  function addCategory(label) {
    var name = String(label || "").trim();
    if (!name) throw new Error("Nom de catégorie obligatoire");
    var id = slugify(name);
    if (!id) throw new Error("Nom de catégorie invalide");
    var list = getCategories();
    if (
      list.some(function (c) {
        return c.id === id;
      })
    ) {
      throw new Error("Cette catégorie existe déjà");
    }
    list.push({ id: id, label: name });
    return setCategories(list);
  }

  function updateCategory(id, newLabel) {
    var list = getCategories();
    var idx = list.findIndex(function (c) {
      return c.id === id;
    });
    if (idx === -1) throw new Error("Catégorie introuvable");
    var label = String(newLabel || "").trim();
    if (!label) throw new Error("Nouveau nom obligatoire");
    var newId = slugify(label);
    if (!newId) throw new Error("Nom invalide");
    var conflict = list.find(function (c, i) {
      return i !== idx && c.id === newId;
    });
    if (conflict) throw new Error("Une catégorie avec ce nom existe déjà");

    var oldId = list[idx].id;
    list[idx] = { id: newId, label: label };
    setCategories(list);

    // Mettre à jour les véhicules qui utilisent l'ancienne id
    if (oldId !== newId) {
      var vehicles = getVehicles().map(function (v) {
        var cats = (v.category || []).map(function (c) {
          return c === oldId ? newId : c;
        });
        return Object.assign({}, v, { category: cats });
      });
      setVehicles(vehicles);
    }
    return list;
  }

  function removeCategory(id) {
    var list = getCategories().filter(function (c) {
      return c.id !== id;
    });
    if (!list.length) throw new Error("Impossible de supprimer la dernière catégorie");
    setCategories(list);
    // Retirer la catégorie des véhicules
    var vehicles = getVehicles().map(function (v) {
      var cats = (v.category || []).filter(function (c) {
        return c !== id;
      });
      if (!cats.length) cats = [list[0].id];
      return Object.assign({}, v, { category: cats });
    });
    setVehicles(vehicles);
    return list;
  }

  function syncPublicCategories() {
    var cats = getCategories();
    window.FOIRE_CATEGORIES = [{ id: "all", label: "Tous" }].concat(cats);
  }

  /* ---------- Vehicles ---------- */
  function loadFromStorage() {
    var raw = safeGet(STORAGE_KEY);
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function ensureVehicleDefaults(v) {
    var copy = Object.assign({}, v);
    if (!copy.published) copy.published = "online";
    if (copy.published !== "online" && copy.published !== "offline") {
      copy.published = "online";
    }
    if (!copy.badge) copy.badge = "none";
    if (!copy.category) copy.category = [];
    if (!Array.isArray(copy.category)) copy.category = [copy.category];
    if (!copy.gallery) copy.gallery = [];
    return copy;
  }

  function getVehicles() {
    var stored = loadFromStorage();
    var list = stored
      ? stored
      : clone(window.FOIRE_VEHICLES_SEED || []);
    return list.map(ensureVehicleDefaults);
  }

  function setVehicles(list) {
    if (!Array.isArray(list)) throw new Error("Liste véhicules invalide");
    var normalized = list.map(ensureVehicleDefaults);
    safeSet(STORAGE_KEY, JSON.stringify(normalized));
    window.FOIRE_VEHICLES = normalized;
    return normalized;
  }

  function hasCmsOverride() {
    return loadFromStorage() !== null;
  }

  function resetToSeed() {
    safeRemove(STORAGE_KEY);
    safeRemove(CAT_STORAGE_KEY);
    window.FOIRE_VEHICLES = clone(window.FOIRE_VEHICLES_SEED || []).map(
      ensureVehicleDefaults
    );
    syncPublicCategories();
    return window.FOIRE_VEHICLES;
  }

  function uniqueId(name, existing) {
    var base = slugify(name) || "vehicule";
    var id = base;
    var n = 2;
    var ids = (existing || []).map(function (v) {
      return v.id;
    });
    while (ids.indexOf(id) !== -1) {
      id = base + "-" + n;
      n += 1;
    }
    return id;
  }

  function normalizeVehicle(input, existingList, previousId) {
    var list = existingList || getVehicles();
    var name = String(input.name || "").trim();
    if (!name) throw new Error("Le nom du véhicule est obligatoire");

    var brand = String(input.brand || "").trim();
    if (!brand) throw new Error("La marque est obligatoire");

    var price = Number(input.price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error("Le prix est invalide");
    }

    var categories = Array.isArray(input.category)
      ? input.category.filter(Boolean)
      : String(input.category || "")
          .split(/[,\s]+/)
          .map(function (c) {
            return c.trim();
          })
          .filter(Boolean);

    categories = categories.filter(function (c) {
      return c !== "all";
    });
    if (!categories.length) {
      throw new Error("Choisissez au moins une catégorie");
    }

    var id = previousId || input.id;
    if (!id) id = uniqueId(name, list);
    else id = slugify(id) || uniqueId(name, list);

    var gallery = [];
    if (Array.isArray(input.gallery)) {
      gallery = input.gallery
        .map(function (g) {
          if (typeof g === "string") {
            return { src: g.trim(), label: "Photo", zone: "extérieur" };
          }
          return {
            src: String(g.src || "").trim(),
            label: String(g.label || "Photo").trim() || "Photo",
            zone: String(g.zone || "extérieur").trim() || "extérieur",
          };
        })
        .filter(function (g) {
          return g.src;
        });
    }

    var cover = String(input.cover || "").trim();
    if (!cover && gallery.length) cover = gallery[0].src;
    if (!cover) {
      throw new Error("Ajoutez une photo de couverture (upload depuis le PC)");
    }

    var highlights = Array.isArray(input.highlights)
      ? input.highlights
          .map(String)
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
      : String(input.highlights || "")
          .split("\n")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);

    var equipment = Array.isArray(input.equipment)
      ? input.equipment
          .map(String)
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)
      : String(input.equipment || "")
          .split("\n")
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);

    var specs = {};
    if (input.specs && typeof input.specs === "object" && !Array.isArray(input.specs)) {
      Object.keys(input.specs).forEach(function (k) {
        if (input.specs[k] != null && String(input.specs[k]).trim()) {
          specs[k] = String(input.specs[k]).trim();
        }
      });
    } else if (typeof input.specsText === "string") {
      input.specsText.split("\n").forEach(function (line) {
        var parts = line.split(":");
        if (parts.length >= 2) {
          var key = parts.shift().trim();
          var val = parts.join(":").trim();
          if (key && val) specs[key] = val;
        }
      });
    }

    var conditionNotes = input.conditionNotes || {};
    if (typeof conditionNotes !== "object") conditionNotes = {};

    var published =
      input.published === "offline" || input.published === false
        ? "offline"
        : "online";

    var badge = String(input.badge || "none").trim() || "none";
    var validBadges = BADGE_OPTIONS.map(function (b) {
      return b.id;
    });
    if (validBadges.indexOf(badge) === -1) badge = "none";

    return {
      id: id,
      name: name,
      version: String(input.version || "").trim(),
      brand: brand,
      category: categories,
      price: Math.round(price),
      year: Number(input.year) || new Date().getFullYear(),
      mileage: Number(input.mileage) || 0,
      fuel: String(input.fuel || "Essence").trim(),
      transmission: String(input.transmission || "Manuelle").trim(),
      power: String(input.power || "").trim(),
      doors: Number(input.doors) || 4,
      seats: Number(input.seats) || 5,
      color: String(input.color || "").trim(),
      condition: String(input.condition || "Bon").trim(),
      warranty: String(input.warranty || "12 mois Foire SN").trim(),
      location: String(input.location || "Foire à Dakar").trim(),
      tagline: String(input.tagline || "").trim(),
      description: String(input.description || "").trim(),
      highlights: highlights,
      specs: specs,
      equipment: equipment,
      conditionNotes: {
        exterior: String(
          conditionNotes.exterior || input.conditionExterior || ""
        ).trim(),
        interior: String(
          conditionNotes.interior || input.conditionInterior || ""
        ).trim(),
        mechanical: String(
          conditionNotes.mechanical || input.conditionMechanical || ""
        ).trim(),
      },
      cover: cover,
      gallery: gallery,
      published: published,
      badge: badge,
    };
  }

  function upsertVehicle(input, previousId) {
    var list = getVehicles();
    var vehicle = normalizeVehicle(input, list, previousId);
    var idx = list.findIndex(function (v) {
      return v.id === (previousId || vehicle.id);
    });
    if (previousId && previousId !== vehicle.id) {
      var conflict = list.findIndex(function (v) {
        return v.id === vehicle.id;
      });
      if (conflict !== -1 && conflict !== idx) {
        throw new Error("Un véhicule avec cet ID existe déjà");
      }
    }
    if (idx === -1) list.push(vehicle);
    else list[idx] = vehicle;
    return setVehicles(list);
  }

  function removeVehicle(id) {
    var list = getVehicles().filter(function (v) {
      return v.id !== id;
    });
    return setVehicles(list);
  }

  function getVehicle(id) {
    return (
      getVehicles().find(function (v) {
        return v.id === id;
      }) || null
    );
  }

  /** Véhicules visibles sur le site public (online uniquement) */
  function getPublicVehicles() {
    return getVehicles().filter(function (v) {
      return v.published !== "offline";
    });
  }

  function getBrands(onlyPublic) {
    var set = {};
    var list = onlyPublic ? getPublicVehicles() : getVehicles();
    list.forEach(function (v) {
      if (v.brand) set[v.brand] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, "fr");
    });
  }

  function exportJSON() {
    return JSON.stringify(
      {
        vehicles: getVehicles(),
        categories: getCategories(),
      },
      null,
      2
    );
  }

  function importJSON(jsonText) {
    var data = typeof jsonText === "string" ? JSON.parse(jsonText) : jsonText;
    var vehicles = Array.isArray(data) ? data : data.vehicles;
    if (!Array.isArray(vehicles)) {
      throw new Error("Le fichier doit contenir un tableau de véhicules");
    }
    if (data.categories && Array.isArray(data.categories)) {
      setCategories(data.categories);
    }
    var list = vehicles.map(function (item) {
      return normalizeVehicle(item, vehicles, item.id);
    });
    return setVehicles(list);
  }

  /* ---------- Auth ---------- */
  var ADMIN_PASSWORD = "foire2026";
  var memoryAuth = false;

  function storageGetAuth(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {}
    try {
      return localStorage.getItem(key);
    } catch (e2) {}
    return null;
  }

  function storageSetAuth(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {}
    try {
      localStorage.setItem(key, value);
    } catch (e2) {}
  }

  function storageRemoveAuth(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
    try {
      localStorage.removeItem(key);
    } catch (e2) {}
  }

  function isAuthenticated() {
    if (memoryAuth) return true;
    return storageGetAuth(AUTH_KEY) === "1";
  }

  function login(password) {
    var ok = String(password || "").trim() === ADMIN_PASSWORD;
    if (ok) {
      memoryAuth = true;
      storageSetAuth(AUTH_KEY, "1");
    }
    return ok;
  }

  function logout() {
    memoryAuth = false;
    storageRemoveAuth(AUTH_KEY);
  }

  /* ---------- Image helpers (upload PC → data URL) ---------- */
  function compressImageFile(file, maxWidth, quality) {
    maxWidth = maxWidth || 1200;
    quality = quality || 0.78;
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf("image/") !== 0) {
        reject(new Error("Fichier image requis (JPG, PNG, WEBP…)"));
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error("Image trop lourde (max 12 Mo avant compression)"));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () {
        reject(new Error("Lecture du fichier impossible"));
      };
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var w = img.width;
          var h = img.height;
          if (w > maxWidth) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          }
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          var mime =
            file.type === "image/png" && file.size < 800000
              ? "image/png"
              : "image/jpeg";
          var dataUrl = canvas.toDataURL(mime, quality);
          resolve(dataUrl);
        };
        img.onerror = function () {
          reject(new Error("Image invalide"));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // Init public state
  window.FOIRE_VEHICLES = getVehicles();
  syncPublicCategories();

  window.FOIRE_BADGES = BADGE_OPTIONS;

  window.foireFormatPrice =
    window.foireFormatPrice ||
    function (n) {
      return (
        new Intl.NumberFormat("fr-FR", {
          maximumFractionDigits: 0,
        }).format(n) + " FCFA"
      );
    };

  window.foireGetVehicle = function (id) {
    var v = getVehicle(id);
    if (!v) return null;
    // Fiche publique : offline introuvable sauf admin
    return v;
  };

  window.foireGetPublicVehicles = getPublicVehicles;

  window.FoireCMS = {
    STORAGE_KEY: STORAGE_KEY,
    getVehicles: getVehicles,
    getPublicVehicles: getPublicVehicles,
    setVehicles: setVehicles,
    getVehicle: getVehicle,
    upsertVehicle: upsertVehicle,
    removeVehicle: removeVehicle,
    resetToSeed: resetToSeed,
    hasCmsOverride: hasCmsOverride,
    getBrands: getBrands,
    exportJSON: exportJSON,
    importJSON: importJSON,
    normalizeVehicle: normalizeVehicle,
    uniqueId: uniqueId,
    isAuthenticated: isAuthenticated,
    login: login,
    logout: logout,
    categories: getCategories,
    getCategories: getCategories,
    setCategories: setCategories,
    addCategory: addCategory,
    updateCategory: updateCategory,
    removeCategory: removeCategory,
    badgeOptions: function () {
      return clone(BADGE_OPTIONS);
    },
    compressImageFile: compressImageFile,
    syncPublicCategories: syncPublicCategories,
  };
})();
