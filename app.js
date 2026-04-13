const config = window.MK_DISCOVER_CONFIG || {};

const state = {
  supabase: null,
  configured: false,
  categories: [],
  listings: [],
  filtered: [],
  query: "",
  category: "",
  sort: "relevance",
  openNow: false,
  submitting: false
};

const els = {
  form: document.getElementById("search-form"),
  input: document.getElementById("search-input"),
  category: document.getElementById("category-filter"),
  sort: document.getElementById("sort-filter"),
  openNow: document.getElementById("open-now-filter"),
  statusLine: document.getElementById("status-line"),
  resultsSummary: document.getElementById("results-summary"),
  resultsGrid: document.getElementById("results-grid"),
  cardTemplate: document.getElementById("result-card-template"),
  openSubmitPanel: document.getElementById("open-submit-panel"),
  closeSubmitPanel: document.getElementById("close-submit-panel"),
  submitPanel: document.getElementById("submit-panel"),
  submitForm: document.getElementById("submit-form"),
  submitButton: document.getElementById("submit-button"),
  submitCategory: document.getElementById("submit-category"),
  submitFeedback: document.getElementById("submit-feedback")
};

init();

async function init() {
  wireEvents();
  const publicKey = config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_ANON_KEY;
  state.configured = Boolean(config.SUPABASE_URL && publicKey);

  if (!state.configured) {
    renderDisconnectedState();
    applyFilters();
    return;
  }

  state.supabase = window.supabase.createClient(config.SUPABASE_URL, publicKey);
  setStatus("Loading live Milton Keynes data...");

  try {
    await Promise.all([loadCategories(), loadListings()]);
    hydrateFilters();
    applyFilters();
    setStatus("Live data connected.", "ok");
    setupRealtime();
  } catch (error) {
    console.error(error);
    const message = String(error?.message || "");
    if (message.includes("Could not find the table")) {
      setStatus("Connected, but required tables are missing. Run supabase/schema.sql.", "warn");
    } else {
      setStatus("Could not load data from Supabase.", "warn");
    }
    applyFilters();
  }
}

function wireEvents() {
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = els.input.value.trim();
    applyFilters();
  });

  els.input.addEventListener("input", () => {
    state.query = els.input.value.trim();
    applyFilters();
  });

  els.category.addEventListener("change", () => {
    state.category = els.category.value;
    applyFilters();
  });

  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    applyFilters();
  });

  els.openNow.addEventListener("change", () => {
    state.openNow = els.openNow.checked;
    applyFilters();
  });

  els.openSubmitPanel.addEventListener("click", () => {
    toggleSubmitPanel(true);
  });

  els.closeSubmitPanel.addEventListener("click", () => {
    toggleSubmitPanel(false);
  });

  els.submitForm.addEventListener("submit", handleSubmitListing);
}

async function loadCategories() {
  const { data, error } = await state.supabase
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  state.categories = data || [];
}

async function loadListings() {
  const { data, error } = await state.supabase
    .from("search_documents")
    .select(`
      id,
      title,
      slug,
      category_slug,
      short_description,
      long_description,
      website_url,
      booking_url,
      address_text,
      postcode,
      tags,
      is_active_now,
      starts_at,
      ends_at,
      updated_at,
      quality_score
    `)
    .eq("status", "published")
    .order("quality_score", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error) throw error;
  state.listings = data || [];
}

function hydrateFilters() {
  els.category.innerHTML = '<option value="">All categories</option>';
  els.submitCategory.innerHTML = '<option value="">Select category</option>';

  for (const category of state.categories) {
    const option = document.createElement("option");
    option.value = category.slug;
    option.textContent = category.name;
    els.category.appendChild(option);

    const submitOption = document.createElement("option");
    submitOption.value = category.slug;
    submitOption.textContent = category.name;
    els.submitCategory.appendChild(submitOption);
  }
}

function applyFilters() {
  const query = normalize(state.query);

  let rows = [...state.listings].filter((row) => {
    if (state.category && row.category_slug !== state.category) return false;
    if (state.openNow && !row.is_active_now) return false;
    if (!query) return true;

    const haystack = [
      row.title,
      row.short_description,
      row.long_description,
      row.category_slug,
      row.address_text,
      row.postcode,
      ...normaliseTags(row.tags)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  rows = rows.map((row) => ({ ...row, _score: computeScore(row, query) }));

  if (state.sort === "name") {
    rows.sort((a, b) => (a.title || "").localeCompare(b.title || "", "en-GB"));
  } else if (state.sort === "newest") {
    rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  } else {
    rows.sort((a, b) => b._score - a._score);
  }

  state.filtered = rows;
  renderSummary();
  renderResults(rows);
}

function renderSummary() {
  if (!state.configured) {
    els.resultsSummary.textContent = "No live connection.";
    return;
  }

  if (!state.listings.length) {
    els.resultsSummary.textContent = "No listings yet.";
    return;
  }

  if (!state.filtered.length) {
    els.resultsSummary.textContent = "No matches.";
    return;
  }

  const total = state.filtered.length;
  const activeNow = state.filtered.filter((row) => row.is_active_now).length;
  let text = `${total} result${total === 1 ? "" : "s"}`;

  if (activeNow) {
    text += ` | ${activeNow} open now`;
  }

  els.resultsSummary.textContent = text;
}

function renderResults(rows) {
  els.resultsGrid.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("article");
    empty.className = "empty-state";

    if (!state.configured) {
      empty.innerHTML = `
        <strong>Connect Supabase</strong>
        <p>Add your Supabase URL and public key in config.js.</p>
      `;
    } else if (!state.listings.length) {
      empty.innerHTML = `
        <strong>No listings yet</strong>
        <p>Publish real Milton Keynes records in Supabase.</p>
      `;
    } else {
      empty.innerHTML = `
        <strong>No matches</strong>
        <p>Try a broader search or fewer filters.</p>
      `;
    }

    els.resultsGrid.appendChild(empty);
    return;
  }

  for (const row of rows) {
    const fragment = els.cardTemplate.content.cloneNode(true);
    const categoryEl = fragment.querySelector(".result-card__category");
    const stateEl = fragment.querySelector(".result-card__state");
    const titleEl = fragment.querySelector(".result-card__title");
    const descriptionEl = fragment.querySelector(".result-card__description");
    const metaEl = fragment.querySelector(".result-card__meta");
    const actionEl = fragment.querySelector(".result-card__action");

    categoryEl.textContent = humaniseSlug(row.category_slug || "listing");

    if (row.is_active_now) {
      stateEl.textContent = "Open now";
      stateEl.classList.add("is-active");
    } else {
      stateEl.remove();
    }

    titleEl.textContent = row.title || "Untitled";

    const description = row.short_description || row.long_description || "";
    if (description) {
      descriptionEl.textContent = description;
    } else {
      descriptionEl.remove();
    }

    const location = row.address_text || row.postcode;
    if (row.starts_at) appendMeta(metaEl, `Starts ${formatDateTime(row.starts_at)}`);
    if (location) appendMeta(metaEl, location);

    if (!metaEl.childElementCount) {
      metaEl.remove();
    }

    const actionUrl = row.booking_url || row.website_url;
    if (actionUrl) {
      actionEl.appendChild(makeAction("View", actionUrl));
    } else {
      actionEl.remove();
    }

    els.resultsGrid.appendChild(fragment);
  }
}

function appendMeta(parent, text) {
  const item = document.createElement("span");
  item.className = "meta-pill";
  item.textContent = text;
  parent.appendChild(item);
}

function makeAction(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
}

function computeScore(row, query) {
  let score = Number(row.quality_score || 0);
  if (!query) return score;

  const title = normalize(row.title);
  const shortDescription = normalize(row.short_description);
  const longDescription = normalize(row.long_description);
  const category = normalize(row.category_slug);
  const address = normalize(row.address_text);
  const tags = normaliseTags(row.tags).map(normalize);

  if (title.includes(query)) score += 60;
  if (shortDescription.includes(query)) score += 24;
  if (longDescription.includes(query)) score += 16;
  if (category.includes(query)) score += 12;
  if (address.includes(query)) score += 10;
  if (tags.some((tag) => tag.includes(query))) score += 12;
  if (row.is_active_now) score += 5;

  return score;
}

function normaliseTags(tags) {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string" && tags.trim()) return [tags];
  return [];
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function humaniseSlug(slug) {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function setStatus(message, tone = "neutral") {
  els.statusLine.textContent = message;

  if (tone === "neutral") {
    els.statusLine.removeAttribute("data-tone");
  } else {
    els.statusLine.setAttribute("data-tone", tone);
  }
}

function renderDisconnectedState() {
  setStatus("Set Supabase URL and public key in config.js to load real data.", "warn");
}

function setupRealtime() {
  if (!config.ENABLE_REALTIME || !state.supabase) return;

  state.supabase
    .channel("search_documents_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "search_documents" }, async () => {
      try {
        await loadListings();
        applyFilters();
      } catch (error) {
        console.error(error);
        setStatus("Live update failed. Refresh to retry.", "warn");
      }
    })
    .subscribe();
}

function toggleSubmitPanel(open) {
  els.submitPanel.hidden = !open;
  if (open) {
    els.submitForm.querySelector("#submit-title")?.focus();
  } else {
    setSubmitFeedback("", "neutral");
  }
}

async function handleSubmitListing(event) {
  event.preventDefault();
  if (state.submitting) return;

  if (!state.configured || !state.supabase) {
    setSubmitFeedback("Connect Supabase first.", "warn");
    return;
  }

  const formData = new FormData(els.submitForm);
  const title = normalizeInput(formData.get("title"));
  const categorySlug = normalizeInput(formData.get("category"));
  const description = normalizeInput(formData.get("description"));
  const websiteUrl = normalizeInput(formData.get("website_url"));
  const bookingUrl = normalizeInput(formData.get("booking_url"));
  const location = normalizeInput(formData.get("location"));
  const startsAtRaw = normalizeInput(formData.get("starts_at"));
  const tagsRaw = normalizeInput(formData.get("tags"));
  const sourceUrl = normalizeInput(formData.get("source_url"));
  const submitterName = normalizeInput(formData.get("name"));

  if (!title || !categorySlug || !description) {
    setSubmitFeedback("Add title, category, and description.", "warn");
    return;
  }

  let startsAt = null;
  if (startsAtRaw) {
    const parsed = new Date(startsAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      setSubmitFeedback("Use a valid start date and time.", "warn");
      return;
    }
    startsAt = parsed.toISOString();
  }

  state.submitting = true;
  els.submitButton.disabled = true;
  els.submitButton.textContent = "Submitting...";
  setSubmitFeedback("Submitting for review...", "neutral");

  const payload = {
    slug: makeSubmissionSlug(title),
    title,
    category_slug: categorySlug,
    short_description: description,
    website_url: emptyToNull(websiteUrl),
    booking_url: emptyToNull(bookingUrl),
    address_text: emptyToNull(location),
    tags: parseTags(tagsRaw),
    status: "draft",
    is_active_now: false,
    starts_at: startsAt,
    source_name: submitterName ? `User submission: ${submitterName}` : "User submission",
    source_url: emptyToNull(sourceUrl),
    quality_score: 0
  };

  const { error } = await state.supabase.from("search_documents").insert(payload);
  state.submitting = false;
  els.submitButton.disabled = false;
  els.submitButton.textContent = "Submit";

  if (error) {
    console.error(error);
    const message = String(error?.message || "");
    if (message.includes("Could not find the table")) {
      setSubmitFeedback("Run supabase/schema.sql first.", "warn");
      return;
    }
    if (message.toLowerCase().includes("row-level security")) {
      setSubmitFeedback("Submission policy missing. Run latest schema SQL.", "warn");
      return;
    }
    setSubmitFeedback("Could not submit right now. Try again.", "warn");
    return;
  }

  els.submitForm.reset();
  setSubmitFeedback("Thanks. Submitted for review.", "ok");
}

function makeSubmissionSlug(title) {
  const base = slugify(title).slice(0, 42) || "listing";
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `sub-${base}-${randomPart}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseTags(raw) {
  if (!raw) return [];

  const parts = raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return [...new Set(parts)].slice(0, 8);
}

function normalizeInput(value) {
  return String(value || "").trim();
}

function emptyToNull(value) {
  return value ? value : null;
}

function setSubmitFeedback(message, tone) {
  els.submitFeedback.textContent = message;

  if (tone === "neutral") {
    els.submitFeedback.removeAttribute("data-tone");
    return;
  }

  els.submitFeedback.setAttribute("data-tone", tone);
}
