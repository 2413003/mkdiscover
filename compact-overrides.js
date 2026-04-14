(() => {
  if (typeof state === "undefined" || typeof els === "undefined") {
    return;
  }

  const sheetBackdrop = els.sheetBackdrop || document.getElementById("sheet-backdrop");
  const closeOperatorButton = els.closeOperatorPanel || document.getElementById("close-operator-panel");

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

  setCompactSearchMode(state.mode);
  setCompactFiltersMenuOpen(false);
  syncSheets();
})();
