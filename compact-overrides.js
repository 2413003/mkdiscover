(() => {
  if (typeof state === "undefined" || typeof els === "undefined") {
    return;
  }

  const SORA_CARD_PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#edf1f4"/><stop offset="100%" stop-color="#dfe6eb"/></linearGradient></defs><rect width="1000" height="1000" fill="url(#g)"/><circle cx="300" cy="320" r="120" fill="#c8d2db"/><path d="M120 760l220-220 140 140 120-120 280 280H120z" fill="#bac6d0"/><text x="500" y="885" text-anchor="middle" fill="#6a7785" font-family="Sora,Segoe UI,sans-serif" font-size="64" font-weight="700">MK</text></svg>'
  )}`;
  const sheetBackdrop = els.sheetBackdrop || document.getElementById("sheet-backdrop");
  const closeOperatorButton = els.closeOperatorPanel || document.getElementById("close-operator-panel");

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

  function setCompactFiltersMenuOpen(isOpen) {
    state.filtersMenuOpen = Boolean(isOpen);
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

  els.openSubmitPanel?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setCompactFiltersMenuOpen(false);
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
      if (!state.filtersMenuOpen || !els.refineRow) {
        return;
      }
      if (!(event.target instanceof Node)) {
        return;
      }
      if (els.refineRow.contains(event.target)) {
        return;
      }
      setCompactFiltersMenuOpen(false);
    },
    true
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") {
        return;
      }
      if (state.filtersMenuOpen) {
        setCompactFiltersMenuOpen(false);
      }
      toggleCompactSubmitPanel(false);
      toggleCompactOperatorPanel(false);
    },
    true
  );

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
  setCompactFiltersMenuOpen(false);
  syncSheets();
  syncPlaceholderFonts();
})();
