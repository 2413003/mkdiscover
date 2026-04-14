(() => {
  if (typeof state === "undefined" || typeof els === "undefined") {
    return;
  }

  const SORA_CARD_PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#edf1f4"/><stop offset="100%" stop-color="#dfe6eb"/></linearGradient></defs><rect width="1000" height="1000" fill="url(#g)"/><circle cx="300" cy="320" r="120" fill="#c8d2db"/><path d="M120 760l220-220 140 140 120-120 280 280H120z" fill="#bac6d0"/><text x="500" y="885" text-anchor="middle" fill="#6a7785" font-family="Sora,Segoe UI,sans-serif" font-size="64" font-weight="700">MK</text></svg>'
  )}`;
  const LAUNCHER_STORAGE_KEY = "mk_discover_launcher_v2";
  const LAUNCHER_MAX_FAVORITES = 8;
  const DEFAULT_LAUNCHER_FAVORITES = [
    "events",
    "restaurants",
    "cafes",
    "pubs-and-bars",
    "parks-and-outdoors",
    "family-and-kids",
    "shopping-and-retail",
    "local-deals"
  ];
  const LAUNCHER_PALETTES = [
    { soft: "#edf3ff", soft2: "#d6e5ff", ink: "#2754a6" },
    { soft: "#fff2e8", soft2: "#ffd6be", ink: "#aa4c0f" },
    { soft: "#eef8ee", soft2: "#d1ecd1", ink: "#28724c" },
    { soft: "#f3efff", soft2: "#ddd4ff", ink: "#5a45b5" },
    { soft: "#fff5dc", soft2: "#ffe0a3", ink: "#9a6500" },
    { soft: "#edf7f8", soft2: "#cee8ee", ink: "#1c6b79" },
    { soft: "#fff0f3", soft2: "#ffd4dc", ink: "#af3759" },
    { soft: "#f3f4f7", soft2: "#dde2ea", ink: "#44516b" }
  ];
  const LAUNCHER_STOP_WORDS = new Set(["and", "the", "of", "for", "to", "in", "with", "mk"]);
  const sheetBackdrop = els.sheetBackdrop || document.getElementById("sheet-backdrop");
  const closeOperatorButton = els.closeOperatorPanel || document.getElementById("close-operator-panel");
  const launcherEls = {
    shell: document.getElementById("apps-launcher-shell"),
    toggle: document.getElementById("apps-launcher-toggle"),
    menu: document.getElementById("apps-launcher-menu"),
    edit: document.getElementById("apps-launcher-edit"),
    favorites: document.getElementById("apps-launcher-favorites"),
    library: document.getElementById("apps-launcher-library")
  };
  const desktopMedia =
    typeof window.matchMedia === "function" ? window.matchMedia("(min-width: 761px)") : null;

  state.appsMenuOpen = false;
  state.appsMenuEditing = false;
  state.appsLauncherFavorites = [];

  function syncPlaceholderFonts(root = document) {
    const images = [];

    if (root instanceof HTMLImageElement && root.classList.contains("is-placeholder")) {
      images.push(root);
    }

    root.querySelectorAll?.(".result-card__image.is-placeholder").forEach((image) => {
      images.push(image);
    });

    images.forEach((image) => {
      if (!(image instanceof HTMLImageElement)) {
        return;
      }

      if (image.dataset.soraPlaceholder === "true") {
        return;
      }

      image.src = SORA_CARD_PLACEHOLDER_IMAGE;
      image.dataset.soraPlaceholder = "true";
    });
  }

  function syncSheets() {
    const hasSubmitPanel = Boolean(els.submitPanel);
    const hasOperatorPanel = Boolean(els.operatorPanel);
    const isOpen =
      (hasSubmitPanel && !els.submitPanel.hidden) ||
      (hasOperatorPanel && !els.operatorPanel.hidden);

    if (sheetBackdrop) {
      sheetBackdrop.hidden = !isOpen;
    }

    document.body.classList.toggle("has-sheet-open", isOpen);
  }

  function isDesktopLauncherAvailable() {
    return Boolean(launcherEls.shell && (!desktopMedia || desktopMedia.matches));
  }

  function syncFilters() {
    if (!els.refineRow || !els.filtersToggle || !els.filtersMenu) {
      return;
    }

    const isMenuOpen = Boolean(state.filtersMenuOpen);
    els.refineRow.classList.toggle("is-menu-open", isMenuOpen);
    els.filtersToggle.hidden = false;
    els.filtersToggle.setAttribute("aria-expanded", String(isMenuOpen));
    els.filtersMenu.hidden = !isMenuOpen;
  }

  function syncAppsLauncher() {
    if (!launcherEls.toggle || !launcherEls.menu) {
      return;
    }

    const isOpen = Boolean(state.appsMenuOpen && isDesktopLauncherAvailable());
    const hasActiveCategory = Boolean(els.category?.value);

    launcherEls.toggle.classList.toggle("is-active", isOpen);
    launcherEls.toggle.classList.toggle("is-selected", hasActiveCategory);
    launcherEls.toggle.setAttribute("aria-expanded", String(isOpen));
    launcherEls.menu.hidden = !isOpen;
    launcherEls.menu.classList.toggle("is-editing", Boolean(state.appsMenuEditing));

    if (launcherEls.edit) {
      launcherEls.edit.classList.toggle("is-active", Boolean(state.appsMenuEditing));
      launcherEls.edit.setAttribute("aria-pressed", String(Boolean(state.appsMenuEditing)));
    }
  }

  function setAppsMenuOpen(isOpen) {
    const nextOpen = Boolean(isOpen && isDesktopLauncherAvailable());
    state.appsMenuOpen = nextOpen;

    if (nextOpen) {
      state.filtersMenuOpen = false;
      renderAppsLauncher();
      syncFilters();
    } else {
      state.appsMenuEditing = false;
    }

    syncAppsLauncher();
    syncLauncherSelection();
  }

  function setCompactFiltersMenuOpen(isOpen) {
    state.filtersMenuOpen = Boolean(isOpen);

    if (state.filtersMenuOpen) {
      state.appsMenuOpen = false;
      state.appsMenuEditing = false;
      syncAppsLauncher();
    }

    syncFilters();
  }

  function setCompactSearchMode(mode) {
    const nextMode = mode === "plan" ? "plan" : "discover";
    state.mode = nextMode;

    const isPlan = nextMode === "plan";
    if (els.form) {
      els.form.hidden = false;
    }
    if (els.planForm) {
      els.planForm.hidden = !isPlan;
    }

    els.modeDiscover?.classList.toggle("is-active", !isPlan);
    els.modePlan?.classList.toggle("is-active", isPlan);
    els.modeDiscover?.setAttribute("aria-selected", String(!isPlan));
    els.modePlan?.setAttribute("aria-selected", String(isPlan));
    syncFilters();
  }

  function toggleCompactSubmitPanel(open) {
    if (!els.submitPanel) return;

    els.submitPanel.hidden = !open;
    if (open) {
      if (els.operatorPanel) {
        els.operatorPanel.hidden = true;
      }
      els.submitForm?.querySelector("#submit-title")?.focus();
    }
    syncSheets();
  }

  function toggleCompactOperatorPanel(nextOpen) {
    if (!els.operatorPanel) return;

    const open = typeof nextOpen === "boolean" ? nextOpen : els.operatorPanel.hidden;
    els.operatorPanel.hidden = !open;
    if (open && els.submitPanel) {
      els.submitPanel.hidden = true;
    }
    syncSheets();
  }

  function getLauncherCategories() {
    return Array.isArray(state.categories)
      ? state.categories.filter((category) => category?.slug && category?.name)
      : [];
  }

  function getDefaultFavorites(categories) {
    const slugs = categories.map((category) => category.slug);
    const defaults = DEFAULT_LAUNCHER_FAVORITES.filter((slug) => slugs.includes(slug));

    for (const slug of slugs) {
      if (defaults.length >= LAUNCHER_MAX_FAVORITES) {
        break;
      }
      if (!defaults.includes(slug)) {
        defaults.push(slug);
      }
    }

    return defaults.slice(0, LAUNCHER_MAX_FAVORITES);
  }

  function readLauncherPreferences(categories = getLauncherCategories()) {
    const available = new Set(categories.map((category) => category.slug));
    let favorites = [];

    try {
      const raw = window.localStorage.getItem(LAUNCHER_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      favorites = Array.isArray(parsed?.favoriteSlugs) ? parsed.favoriteSlugs : [];
    } catch {
      favorites = [];
    }

    favorites = favorites
      .filter((slug, index, list) => available.has(slug) && list.indexOf(slug) === index)
      .slice(0, LAUNCHER_MAX_FAVORITES);

    if (!favorites.length) {
      favorites = getDefaultFavorites(categories);
    }

    state.appsLauncherFavorites = favorites;
    return favorites;
  }

  function persistLauncherPreferences() {
    try {
      window.localStorage.setItem(
        LAUNCHER_STORAGE_KEY,
        JSON.stringify({ favoriteSlugs: state.appsLauncherFavorites || [] })
      );
    } catch {
      // Ignore local storage write failures.
    }
  }

  function getPalette(seed = "mk") {
    const total = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return LAUNCHER_PALETTES[total % LAUNCHER_PALETTES.length];
  }

  function getLauncherGlyph(name, slug) {
    if (!slug) {
      return "MK";
    }

    const words = String(name || slug)
      .replace(/&/g, " ")
      .split(/[\s/-]+/)
      .map((word) => word.trim())
      .filter(Boolean)
      .filter((word) => !LAUNCHER_STOP_WORDS.has(word.toLowerCase()));

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    const value = words[0] || String(name || slug);
    return value.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || "MK";
  }

  function syncLauncherSelection() {
    const activeSlug = els.category?.value || "";
    const containers = [launcherEls.favorites, launcherEls.library];

    containers.forEach((container) => {
      container?.querySelectorAll(".apps-tile").forEach((tile) => {
        const isActive = tile.dataset.slug === activeSlug || (!activeSlug && tile.dataset.slug === "");
        tile.classList.toggle("is-active", isActive);
      });
    });

    if (launcherEls.toggle) {
      launcherEls.toggle.classList.toggle("is-selected", Boolean(activeSlug));
    }
  }

  function selectLauncherCategory(slug) {
    if (!els.category) {
      return;
    }

    if (typeof setHasSearched === "function") {
      setHasSearched(true);
    }

    els.category.value = slug || "";
    els.category.dispatchEvent(new Event("change", { bubbles: true }));
    syncLauncherSelection();
    setAppsMenuOpen(false);
  }

  function toggleLauncherFavorite(slug) {
    if (!slug) {
      return;
    }

    const favorites = [...readLauncherPreferences()];
    const existingIndex = favorites.indexOf(slug);

    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
    } else {
      favorites.unshift(slug);
    }

    state.appsLauncherFavorites = favorites.slice(0, LAUNCHER_MAX_FAVORITES);
    persistLauncherPreferences();
    renderAppsLauncher();
    syncAppsLauncher();
  }

  function createLauncherTile(item, { isFavorite = false, showPin = Boolean(item.slug) } = {}) {
    const tile = document.createElement("button");
    const palette = getPalette(item.slug || item.name || "mk");
    const pin = document.createElement("span");
    const icon = document.createElement("span");
    const label = document.createElement("span");

    tile.type = "button";
    tile.className = "apps-tile";
    tile.dataset.slug = item.slug || "";
    tile.dataset.favorite = String(isFavorite);
    tile.style.setProperty("--app-soft", palette.soft);
    tile.style.setProperty("--app-soft-2", palette.soft2);
    tile.style.setProperty("--app-ink", palette.ink);

    if (isFavorite) {
      tile.classList.add("is-favorite");
    }

    pin.className = "apps-tile__pin";
    pin.textContent = showPin ? (isFavorite ? "\u2212" : "+") : "";

    icon.className = "apps-tile__icon";
    icon.textContent = getLauncherGlyph(item.name, item.slug);

    label.className = "apps-tile__label";
    label.textContent = item.name;

    tile.append(pin, icon, label);
    tile.addEventListener("click", () => {
      if (state.appsMenuEditing && item.slug) {
        toggleLauncherFavorite(item.slug);
        return;
      }
      selectLauncherCategory(item.slug);
    });

    return tile;
  }

  function renderAppsLauncher() {
    if (!launcherEls.favorites || !launcherEls.library) {
      return;
    }

    const categories = getLauncherCategories();
    const favorites = readLauncherPreferences(categories);
    const categoryMap = new Map(categories.map((category) => [category.slug, category]));
    const favoriteSet = new Set(favorites);
    const favoriteFragment = document.createDocumentFragment();
    const libraryFragment = document.createDocumentFragment();

    favoriteFragment.appendChild(
      createLauncherTile({ slug: "", name: "All" }, { isFavorite: false, showPin: false })
    );

    favorites.forEach((slug) => {
      const category = categoryMap.get(slug);
      if (!category) {
        return;
      }
      favoriteFragment.appendChild(createLauncherTile(category, { isFavorite: true }));
    });

    categories
      .filter((category) => !favoriteSet.has(category.slug))
      .forEach((category) => {
        libraryFragment.appendChild(createLauncherTile(category));
      });

    launcherEls.favorites.replaceChildren(favoriteFragment);
    launcherEls.library.replaceChildren(libraryFragment);
    syncLauncherSelection();
  }

  const originalHydrateFilters =
    typeof hydrateFilters === "function" ? hydrateFilters.bind(window) : null;

  if (originalHydrateFilters) {
    hydrateFilters = (...args) => {
      const result = originalHydrateFilters(...args);
      renderAppsLauncher();
      return result;
    };
    window.hydrateFilters = hydrateFilters;
  }

  setFiltersMenuOpen = setCompactFiltersMenuOpen;
  syncRefineControls = syncFilters;
  setSearchMode = setCompactSearchMode;
  toggleSubmitPanel = toggleCompactSubmitPanel;
  toggleOperatorPanel = toggleCompactOperatorPanel;

  window.setFiltersMenuOpen = setCompactFiltersMenuOpen;
  window.syncRefineControls = syncFilters;
  window.setSearchMode = setCompactSearchMode;
  window.toggleSubmitPanel = toggleCompactSubmitPanel;
  window.toggleOperatorPanel = toggleCompactOperatorPanel;

  els.filtersToggle?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setCompactFiltersMenuOpen(!state.filtersMenuOpen);
    },
    true
  );

  launcherEls.toggle?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setAppsMenuOpen(!state.appsMenuOpen);
    },
    true
  );

  launcherEls.edit?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!state.appsMenuOpen) {
        setAppsMenuOpen(true);
      }
      state.appsMenuEditing = !state.appsMenuEditing;
      syncAppsLauncher();
    },
    true
  );

  els.modeDiscover?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setCompactSearchMode("discover");
      applyFilters();
    },
    true
  );

  els.modePlan?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setCompactSearchMode("plan");
      setCompactFiltersMenuOpen(true);
      applyFilters();
    },
    true
  );

  els.category?.addEventListener("change", syncLauncherSelection);

  els.openSubmitPanel?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setCompactFiltersMenuOpen(false);
      setAppsMenuOpen(false);
      toggleCompactOperatorPanel(false);
      toggleCompactSubmitPanel(true);
    },
    true
  );

  els.closeSubmitPanel?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleCompactSubmitPanel(false);
    },
    true
  );

  els.openOperatorPanel?.addEventListener(
    "click",
    async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setCompactFiltersMenuOpen(false);
      setAppsMenuOpen(false);
      toggleCompactSubmitPanel(false);
      toggleCompactOperatorPanel(els.operatorPanel?.hidden);
      if (els.operatorPanel && !els.operatorPanel.hidden && typeof refreshOperatorState === "function") {
        await refreshOperatorState();
      }
    },
    true
  );

  closeOperatorButton?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleCompactOperatorPanel(false);
    },
    true
  );

  sheetBackdrop?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      toggleCompactSubmitPanel(false);
      toggleCompactOperatorPanel(false);
    },
    true
  );

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (state.appsMenuOpen && launcherEls.shell && !launcherEls.shell.contains(event.target)) {
        setAppsMenuOpen(false);
      }

      if (state.filtersMenuOpen && els.refineRow && !els.refineRow.contains(event.target)) {
        setCompactFiltersMenuOpen(false);
      }
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") {
        return;
      }
      if (state.appsMenuOpen) {
        setAppsMenuOpen(false);
      }
      if (state.filtersMenuOpen) {
        setCompactFiltersMenuOpen(false);
      }
      toggleCompactSubmitPanel(false);
      toggleCompactOperatorPanel(false);
    },
    true
  );

  const handleViewportChange = () => {
    if (!isDesktopLauncherAvailable()) {
      setAppsMenuOpen(false);
    }
  };

  if (desktopMedia?.addEventListener) {
    desktopMedia.addEventListener("change", handleViewportChange);
  } else if (desktopMedia?.addListener) {
    desktopMedia.addListener(handleViewportChange);
  }

  if (typeof MutationObserver === "function") {
    const placeholderObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== "childList" || !mutation.addedNodes.length) {
          continue;
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            syncPlaceholderFonts(node);
          }
        });
      }
    });

    placeholderObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  setCompactSearchMode(state.mode);
  readLauncherPreferences();
  renderAppsLauncher();
  setCompactFiltersMenuOpen(false);
  setAppsMenuOpen(false);
  syncSheets();
  syncPlaceholderFonts();
})();
