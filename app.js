const config = window.MK_DISCOVER_CONFIG || {};
const state = {
  supabase: null,
  categories: [],
  listings: [],
  filtered: [],
  query: "",
  category: "",
  sort: "relevance",
  openNow: false,
  configured: false
};

const els = {
  form: document.getElementById("search-form"),
  input: document.getElementById("search-input"),
  category: document.getElementById("category-filter"),
  sort: document.getElementById("sort-filter"),
  openNow: document.getElementById("open-now-filter"),
  resultsGrid: document.getElementById("results-grid"),
  resultsSummary: document.getElementById("results-summary"),
  statsBar: document.getElementById("stats-bar"),
  statusCard: document.getElementById("status-card"),
  cardTemplate: document.getElementById("result-card-template")
};

init();

async function init() {
  wireEvents();
  state.configured = Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY);

  if (!state.configured) {
    renderDisconnectedState();
    renderResults([]);
    return;
  }

  state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  setStatus("Loading real Milton Keynes data from Supabase...");

  try {
    await Promise.all([loadCategories(), loadListings()]);
    hydrateFilters();
    applyFilters();
    setStatus("Connected to Supabase. Showing live database records only.");
    setupRealtime();
  } catch (error) {
    console.error(error);
    setStatus(`Could not load data: ${error.message}`);
    renderResults([]);
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
      quality_score,
      source_name
    `)
    .eq("status", "published")
    .order("quality_score", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(300);

  if (error) throw error;
  state.listings = data || [];
}

function hydrateFilters() {
  els.category.innerHTML = '<option value="">All</option>';
  for (const category of state.categories) {
    const option = document.createElement("option");
    option.value = category.slug;
    option.textContent = category.name;
    els.category.appendChild(option);
  }
}

function applyFilters() {
  const query = state.query.toLowerCase();

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
      ...(row.tags || [])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  rows = rows.map((row) => ({ ...row, _score: computeScore(row, query) }));

  if (state.sort === "name") {
    rows.sort((a, b) => a.title.localeCompare(b.title, "en-GB"));
  } else if (state.sort === "newest") {
    rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  } else {
    rows.sort((a, b) => b._score - a._score);
  }

  state.filtered = rows;
  renderStats(rows);
  renderResults(rows);
}

function computeScore(row, query) {
  let score = Number(row.quality_score || 0);
  if (!query) return score;

  if (row.title?.toLowerCase().includes(query)) score += 50;
  if (row.short_description?.toLowerCase().includes(query)) score += 20;
  if ((row.tags || []).some((tag) => tag.toLowerCase().includes(query))) score += 18;
  if (row.category_slug?.toLowerCase().includes(query)) score += 10;
  if (row.is_active_now) score += 5;
  return score;
}

function renderStats(rows) {
  const activeNow = rows.filter((row) => row.is_active_now).length;
  const categories = new Set(rows.map((row) => row.category_slug).filter(Boolean)).size;
  const updated = rows[0]?.updated_at ? formatDateTime(rows[0].updated_at) : "—";

  els.statsBar.innerHTML = `
    <strong>${rows.length}</strong> results ·
    <strong>${activeNow}</strong> active now ·
    <strong>${categories}</strong> categories ·
    latest update <strong>${updated}</strong>
  `;

  els.resultsSummary.textContent = rows.length
    ? `Showing ${rows.length} real records from the database.`
    : "No matching real records found.";
}

function renderResults(rows) {
  els.resultsGrid.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `
      <strong>No results found.</strong>
      <p>Try a broader search, remove filters, or add more real Milton Keynes listings to Supabase.</p>
    `;
    els.resultsGrid.appendChild(empty);
    return;
  }

  for (const row of rows) {
    const fragment = els.cardTemplate.content.cloneNode(true);
    fragment.querySelector(".card__eyebrow").textContent = humaniseSlug(row.category_slug || "listing");
    fragment.querySelector(".card__title").textContent = row.title || "Untitled";
    fragment.querySelector(".card__score").innerHTML = `<span class="score-pill">Score ${Math.round(row._score || row.quality_score || 0)}</span>`;
    fragment.querySelector(".card__description").textContent = row.short_description || row.long_description || "No description yet.";

    const meta = fragment.querySelector(".card__meta");
    const tags = fragment.querySelector(".card__tags");
    const actions = fragment.querySelector(".card__actions");

    appendPill(meta, row.address_text || row.postcode || "Milton Keynes");
    if (row.is_active_now) appendPill(meta, "Active now");
    if (row.starts_at) appendPill(meta, `Starts ${formatDateTime(row.starts_at)}`);
    if (row.source_name) appendPill(meta, `Source: ${row.source_name}`);

    for (const tag of row.tags || []) appendTag(tags, tag);

    if (row.website_url) actions.appendChild(makeAction("Website", row.website_url, true));
    if (row.booking_url) actions.appendChild(makeAction("Book / View", row.booking_url, false));

    els.resultsGrid.appendChild(fragment);
  }
}

function appendPill(parent, text) {
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = text;
  parent.appendChild(pill);
}

function appendTag(parent, text) {
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = text;
  parent.appendChild(tag);
}

function makeAction(label, href, primary) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  if (primary) link.classList.add("primary");
  return link;
}

function humaniseSlug(slug) {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function setStatus(message) {
  els.statusCard.innerHTML = `<h2>Status</h2><p>${message}</p>`;
}

function renderDisconnectedState() {
  els.statsBar.innerHTML = "No Supabase connection yet · real records only · no bundled demo data";
}

function setupRealtime() {
  if (!config.ENABLE_REALTIME || !state.supabase) return;

  state.supabase
    .channel("search_documents_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "search_documents" },
      async () => {
        await loadListings();
        applyFilters();
      }
    )
    .subscribe();
}
