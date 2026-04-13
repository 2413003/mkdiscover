const config = window.MK_DISCOVER_CONFIG || {};
const CACHE_KEY = "mk_discover_cache_v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 15;
const INITIAL_LOAD_TIMEOUT_MS = 1500;
const LISTING_IMAGE_BUCKET = "listing-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MK_FALLBACK_CENTER = { lat: 52.0406, lng: -0.7594 };
const MK_LAT_RANGE = { min: 51.95, max: 52.12 };
const MK_LNG_RANGE = { min: -0.95, max: -0.58 };
const MK_VIEW_BOUNDS = [
  [MK_LAT_RANGE.min, MK_LNG_RANGE.min],
  [MK_LAT_RANGE.max, MK_LNG_RANGE.max]
];
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const DEFAULT_CATEGORIES = [
  { slug: "events", name: "Events" },
  { slug: "restaurants", name: "Restaurants" },
  { slug: "cafes", name: "Cafes" },
  { slug: "pubs-and-bars", name: "Pubs & Bars" },
  { slug: "takeaways-and-delivery", name: "Takeaways & Delivery" },
  { slug: "clubs-and-communities", name: "Clubs & Communities" },
  { slug: "social-groups", name: "Social Groups" },
  { slug: "social-media-and-creators", name: "Social Media & Creators" },
  { slug: "gyms-and-fitness", name: "Gyms & Fitness" },
  { slug: "sports-clubs", name: "Sports Clubs" },
  { slug: "schools-and-colleges", name: "Schools & Colleges" },
  { slug: "nurseries-and-childcare", name: "Nurseries & Childcare" },
  { slug: "tutors-and-tuition", name: "Tutors & Tuition" },
  { slug: "family-and-kids", name: "Family & Kids" },
  { slug: "classes-and-courses", name: "Classes & Courses" },
  { slug: "arts-and-culture", name: "Arts & Culture" },
  { slug: "music-and-nightlife", name: "Music & Nightlife" },
  { slug: "shopping-and-retail", name: "Shopping & Retail" },
  { slug: "beauty-and-wellbeing", name: "Beauty & Wellbeing" },
  { slug: "healthcare", name: "Healthcare" },
  { slug: "dentists-opticians-pharmacy", name: "Dentists, Opticians & Pharmacy" },
  { slug: "mental-health-support", name: "Mental Health Support" },
  { slug: "parks-and-outdoors", name: "Parks & Outdoors" },
  { slug: "venues-and-spaces", name: "Venues & Spaces" },
  { slug: "coworking-and-study-spaces", name: "Coworking & Study Spaces" },
  { slug: "jobs-and-careers", name: "Jobs & Careers" },
  { slug: "charities-and-volunteering", name: "Charities & Volunteering" },
  { slug: "faith-and-community", name: "Faith & Community" },
  { slug: "automotive", name: "Automotive" },
  { slug: "transport-and-travel", name: "Transport & Travel" },
  { slug: "home-services", name: "Home Services" },
  { slug: "trades-and-repairs", name: "Trades & Repairs" },
  { slug: "property-and-rentals", name: "Property & Rentals" },
  { slug: "business-services", name: "Business Services" },
  { slug: "pets-and-vets", name: "Pets & Vets" },
  { slug: "local-deals", name: "Local Deals" }
];

const state = {
  supabasePublic: null,
  supabaseAuth: null,
  configured: false,
  categories: [],
  listings: [],
  filtered: [],
  mode: "discover",
  query: "",
  category: "",
  sort: "relevance",
  openNow: false,
  planWhen: "any",
  planWho: "any",
  submitting: false,
  isOperator: false,
  authSession: null,
  reviewing: false,
  moderationRows: [],
  previewObjectUrl: null,
  nearbyEnabled: false,
  userLocation: null,
  leafletPromise: null,
  map: null,
  mapLayer: null
};

const els = {
  modeDiscover: document.getElementById("mode-discover"),
  modePlan: document.getElementById("mode-plan"),
  form: document.getElementById("search-form"),
  planForm: document.getElementById("plan-form"),
  planWhen: document.getElementById("plan-when"),
  planWho: document.getElementById("plan-who"),
  input: document.getElementById("search-input"),
  category: document.getElementById("category-filter"),
  sort: document.getElementById("sort-filter"),
  openNow: document.getElementById("open-now-filter"),
  useLocationButton: document.getElementById("use-location-button"),
  statusLine: document.getElementById("status-line"),
  nearbyPanel: document.getElementById("nearby-panel"),
  nearbySummary: document.getElementById("nearby-summary"),
  nearbyMap: document.getElementById("nearby-map"),
  resultsSummary: document.getElementById("results-summary"),
  resultsGrid: document.getElementById("results-grid"),
  cardTemplate: document.getElementById("result-card-template"),
  openSubmitPanel: document.getElementById("open-submit-panel"),
  closeSubmitPanel: document.getElementById("close-submit-panel"),
  submitPanel: document.getElementById("submit-panel"),
  submitForm: document.getElementById("submit-form"),
  submitButton: document.getElementById("submit-button"),
  submitCategory: document.getElementById("submit-category"),
  submitFeedback: document.getElementById("submit-feedback"),
  submitImageFile: document.getElementById("submit-image-file"),
  submitImagePreviewWrap: document.getElementById("submit-image-preview-wrap"),
  submitImagePreview: document.getElementById("submit-image-preview"),
  submitUseLocationButton: document.getElementById("submit-use-location-button"),
  submitLatitude: document.getElementById("submit-latitude"),
  submitLongitude: document.getElementById("submit-longitude"),
  submitLocationStatus: document.getElementById("submit-location-status"),
  openOperatorPanel: document.getElementById("open-operator-panel"),
  operatorPanel: document.getElementById("operator-panel"),
  operatorStatusText: document.getElementById("operator-status-text"),
  operatorLoginForm: document.getElementById("operator-login-form"),
  operatorLoginButton: document.getElementById("operator-login-button"),
  operatorEmail: document.getElementById("operator-email"),
  operatorClaimButton: document.getElementById("operator-claim-button"),
  operatorRefreshButton: document.getElementById("operator-refresh-button"),
  operatorSignoutButton: document.getElementById("operator-signout-button"),
  operatorFeedback: document.getElementById("operator-feedback"),
  operatorDrafts: document.getElementById("operator-drafts")
};

init();

async function init() {
  wireEvents();
  setSearchMode(state.mode);
  setNearbyButtonState();
  const publicKey = config.SUPABASE_PUBLISHABLE_KEY || config.SUPABASE_ANON_KEY;
  state.configured = Boolean(config.SUPABASE_URL && publicKey);

  if (!state.configured) {
    renderDisconnectedState();
    renderOperatorState();
    applyFilters();
    return;
  }

  const hasCache = hydrateFromCache();

  state.supabasePublic = window.supabase.createClient(config.SUPABASE_URL, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  state.supabaseAuth = window.supabase.createClient(config.SUPABASE_URL, publicKey);
  setupAuthSubscription();
  setStatus(hasCache ? "Showing saved results. Syncing..." : "Loading live Milton Keynes data...");

  try {
    const [categoriesResult, listingsResult] = await Promise.allSettled([
      withTimeout(loadCategories(), INITIAL_LOAD_TIMEOUT_MS, "categories"),
      withTimeout(loadListings(), INITIAL_LOAD_TIMEOUT_MS, "listings")
    ]);
    let listingsIssue = null;

    if (categoriesResult.status === "rejected") {
      state.categories = [];
    }

    if (listingsResult.status === "rejected") {
      state.listings = [];
      if (!isAuthLockError(listingsResult.reason)) {
        listingsIssue = getErrorMessage(listingsResult.reason);
      }
    }

    ensureCategoriesAvailable();
    hydrateFilters();
    applyFilters();
    if (state.listings.length) {
      saveCache();
    }
    refreshOperatorState().catch((error) => {
      if (!isAuthLockError(error)) {
        console.error(error);
      }
    });

    if (!listingsIssue) {
      setStatus("Live data connected.", "ok");
      saveCache();
    } else if (hasCache) {
      setStatus("Using saved results while live sync retries.", "warn");
    } else {
      setStatus(`Supabase issue - listings: ${listingsIssue}`, "warn");
    }

    setupRealtime();
    if (listingsIssue) {
      startBackgroundSync();
    }
  } catch (error) {
    console.error(error);
    if (hasCache) {
      setStatus("Using saved results while live sync retries.", "warn");
    } else {
      setStatus(`Supabase issue - ${getErrorMessage(error)}`, "warn");
    }
    ensureCategoriesAvailable();
    hydrateFilters();
    applyFilters();
    refreshOperatorState().catch((authError) => {
      if (!isAuthLockError(authError)) {
        console.error(authError);
      }
    });
    startBackgroundSync();
  }
}

function wireEvents() {
  els.modeDiscover?.addEventListener("click", () => {
    setSearchMode("discover");
    applyFilters();
  });

  els.modePlan?.addEventListener("click", () => {
    setSearchMode("plan");
    applyFilters();
  });

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = els.input.value.trim();
    applyFilters();
  });

  els.input.addEventListener("input", () => {
    state.query = els.input.value.trim();
    if (state.mode === "discover") {
      applyFilters();
    }
  });

  els.planForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.planWhen = els.planWhen?.value || "any";
    state.planWho = els.planWho?.value || "any";
    applyFilters();
  });

  els.planWhen?.addEventListener("change", () => {
    state.planWhen = els.planWhen.value || "any";
    if (state.mode === "plan") {
      applyFilters();
    }
  });

  els.planWho?.addEventListener("change", () => {
    state.planWho = els.planWho.value || "any";
    if (state.mode === "plan") {
      applyFilters();
    }
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

  els.useLocationButton.addEventListener("click", handleUseLocation);

  els.openSubmitPanel.addEventListener("click", () => {
    els.operatorPanel.hidden = true;
    toggleSubmitPanel(true);
  });

  els.closeSubmitPanel.addEventListener("click", () => {
    toggleSubmitPanel(false);
  });

  els.submitForm.addEventListener("submit", handleSubmitListing);
  els.submitImageFile.addEventListener("change", handleImageFileChange);
  els.submitUseLocationButton?.addEventListener("click", handleSubmitUseLocation);

  els.openOperatorPanel.addEventListener("click", async () => {
    toggleOperatorPanel();
    if (!els.operatorPanel.hidden) {
      await refreshOperatorState();
    }
  });

  els.operatorLoginForm.addEventListener("submit", handleOperatorLogin);
  els.operatorClaimButton.addEventListener("click", handleClaimOperator);
  els.operatorRefreshButton.addEventListener("click", loadDraftSubmissions);
  els.operatorSignoutButton.addEventListener("click", handleOperatorSignOut);

  els.operatorDrafts.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action][data-id]");
    if (!button) return;
    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");
    if (!action || !id) return;
    await handleReviewAction(id, action, button);
  });
}

function setSearchMode(mode) {
  const nextMode = mode === "plan" ? "plan" : "discover";
  state.mode = nextMode;

  const isPlan = nextMode === "plan";
  if (els.form) {
    els.form.hidden = isPlan;
  }
  if (els.planForm) {
    els.planForm.hidden = !isPlan;
  }

  els.modeDiscover?.classList.toggle("is-active", !isPlan);
  els.modePlan?.classList.toggle("is-active", isPlan);
  els.modeDiscover?.setAttribute("aria-selected", String(!isPlan));
  els.modePlan?.setAttribute("aria-selected", String(isPlan));
}

async function loadCategories() {
  const { data, error } = await state.supabasePublic
    .from("categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  state.categories = data || [];
}

async function loadListings() {
  const baseQuery = (selectColumns) =>
    state.supabasePublic
      .from("search_documents")
      .select(selectColumns)
      .eq("status", "published")
      .order("quality_score", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(160);

  const withCoordinates = `
      id,
      title,
      slug,
      category_slug,
      short_description,
      long_description,
      image_url,
      website_url,
      booking_url,
      address_text,
      postcode,
      latitude,
      longitude,
      tags,
      is_active_now,
      starts_at,
      ends_at,
      verified_at,
      source_name,
      updated_at,
      quality_score
    `;

  let result = await baseQuery(withCoordinates);
  if (result.error && isMissingColumnError(result.error, ["latitude", "longitude"])) {
    const fallbackColumns = `
      id,
      title,
      slug,
      category_slug,
      short_description,
      long_description,
      image_url,
      website_url,
      booking_url,
      address_text,
      postcode,
      tags,
      is_active_now,
      starts_at,
      ends_at,
      verified_at,
      source_name,
      updated_at,
      quality_score
    `;
    result = await baseQuery(fallbackColumns);
  }

  if (result.error) throw result.error;
  state.listings = result.data || [];
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

function ensureCategoriesAvailable() {
  const merged = new Map();

  for (const category of Array.isArray(state.categories) ? state.categories : []) {
    if (!category?.slug || !category?.name) continue;
    merged.set(category.slug, { slug: category.slug, name: category.name });
  }

  for (const category of DEFAULT_CATEGORIES) {
    if (!category?.slug || !category?.name) continue;
    if (!merged.has(category.slug)) {
      merged.set(category.slug, { slug: category.slug, name: category.name });
    }
  }

  state.categories = [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
}

function hydrateFromCache() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    const cachedAt = Number(parsed?.cachedAt || 0);
    if (!cachedAt || Date.now() - cachedAt > CACHE_MAX_AGE_MS) return false;

    state.categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    state.listings = Array.isArray(parsed.listings) ? parsed.listings : [];
    ensureCategoriesAvailable();
    hydrateFilters();
    applyFilters();
    return Boolean(state.listings.length || state.categories.length);
  } catch {
    return false;
  }
}

function saveCache() {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        cachedAt: Date.now(),
        categories: state.categories || [],
        listings: state.listings || []
      })
    );
  } catch {
    // Ignore cache write errors (private mode or quota).
  }
}

function startBackgroundSync() {
  Promise.allSettled([loadCategories(), loadListings()]).then(([categoriesResult, listingsResult]) => {
    if (categoriesResult.status === "rejected") {
      state.categories = [];
    }

    if (listingsResult.status === "rejected") {
      if (!isAuthLockError(listingsResult.reason)) {
        console.error(listingsResult.reason);
        setStatus(`Supabase issue - listings: ${getErrorMessage(listingsResult.reason)}`, "warn");
      }
      ensureCategoriesAvailable();
      hydrateFilters();
      applyFilters();
      return;
    }

    ensureCategoriesAvailable();
    hydrateFilters();
    applyFilters();
    saveCache();
    setStatus("Live data connected.", "ok");
  });
}

function applyFilters() {
  const query = state.mode === "plan" ? "" : normalize(state.query);

  let rows = [...state.listings].filter((row) => {
    if (state.category && row.category_slug !== state.category) return false;
    if (state.openNow && !row.is_active_now) return false;
    if (state.mode === "plan" && !matchesPlanWhen(row, state.planWhen)) return false;
    if (state.mode === "plan" && !matchesPlanWho(row, state.planWho)) return false;
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

  rows = rows.map((row) => {
    const nextRow = { ...row };
    nextRow._score = computeScore(nextRow, query);
    nextRow._distanceKm = getDistanceKmForRow(nextRow);
    nextRow._nearbyScore = computeNearbyScore(nextRow);
    return nextRow;
  });

  if (state.sort === "name") {
    rows.sort((a, b) => (a.title || "").localeCompare(b.title || "", "en-GB"));
  } else if (state.sort === "newest") {
    rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  } else if (state.sort === "popular") {
    rows.sort(sortPopularRows);
  } else if (state.sort === "nearby") {
    rows.sort(sortNearbyRows);
  } else {
    rows.sort((a, b) => b._score - a._score);
  }

  state.filtered = rows;
  renderSummary();
  renderResults(rows);
  renderNearbyPanel(rows);
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

  if (state.sort === "nearby" && state.userLocation) {
    const nearest = state.filtered.find((row) => Number.isFinite(row._distanceKm));
    if (nearest) {
      text += ` | nearest ${formatDistance(nearest._distanceKm)}`;
    }
  }

  if (state.mode === "plan") {
    const whenLabel = getPlanWhenLabel(state.planWhen);
    const whoLabel = getPlanWhoLabel(state.planWho);
    text += ` | ${whenLabel} | ${whoLabel}`;
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
        <p>Add a listing to get started.</p>
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
    const imageEl = fragment.querySelector(".result-card__image");
    const categoryEl = fragment.querySelector(".result-card__category");
    const stateEl = fragment.querySelector(".result-card__state");
    const titleEl = fragment.querySelector(".result-card__title");
    const descriptionEl = fragment.querySelector(".result-card__description");
    const metaEl = fragment.querySelector(".result-card__meta");
    const actionEl = fragment.querySelector(".result-card__action");

    categoryEl.textContent = humaniseSlug(row.category_slug || "listing");

    if (row.image_url) {
      imageEl.src = row.image_url;
      imageEl.alt = row.title ? `${row.title} image` : "Listing image";
    } else {
      imageEl.remove();
    }

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
    if (Number.isFinite(row._distanceKm)) appendMeta(metaEl, `${formatDistance(row._distanceKm)} away`);

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

function renderNearbyPanel(rows) {
  els.nearbyPanel.hidden = false;

  if (!state.userLocation) {
    setNearbySummary("Milton Keynes map");
    setNearbyMapEmptyState(false);
    void renderNearbyMap([]);
    return;
  }

  const allNearbyRows = rows.filter((row) => Number.isFinite(row._distanceKm));
  const nearbyRows = allNearbyRows.slice(0, 30);
  const missingPins = rows.length - allNearbyRows.length;

  if (!nearbyRows.length) {
    setNearbySummary("No pinned locations yet.");
    setNearbyMapEmptyState(false);
    void renderNearbyMap([]);
    return;
  }

  let summary = `${allNearbyRows.length} nearby`;
  if (missingPins > 0) {
    summary += ` | ${missingPins} unpinned`;
  }
  setNearbySummary(summary);
  setNearbyMapEmptyState(false);
  void renderNearbyMap(nearbyRows);
}

function setNearbySummary(message) {
  if (els.nearbySummary) {
    els.nearbySummary.textContent = message;
  }
}

function setNearbyMapEmptyState(isEmpty) {
  if (!els.nearbyMap) return;

  if (isEmpty) {
    els.nearbyMap.setAttribute("data-empty", "true");
  } else {
    els.nearbyMap.removeAttribute("data-empty");
  }
}

function setNearbyButtonState() {
  if (!els.useLocationButton) return;
  els.useLocationButton.classList.toggle("is-active", Boolean(state.userLocation));
}

async function handleUseLocation() {
  if (!("geolocation" in navigator)) {
    state.nearbyEnabled = true;
    setNearbyButtonState();
    renderNearbyPanel(state.filtered);
    setNearbySummary("Location not available in this browser.");
    return;
  }

  state.nearbyEnabled = true;
  els.useLocationButton.disabled = true;
  setNearbySummary("Getting your location...");
  renderNearbyPanel(state.filtered);

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 120000
    });

    const nextLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    if (!isMiltonKeynesCoordinate(nextLocation.lat, nextLocation.lng)) {
      setNearbySummary("Location is outside Milton Keynes.");
      setNearbyMapEmptyState(false);
      void renderNearbyMap([]);
      return;
    }

    state.userLocation = nextLocation;

    state.sort = "nearby";
    els.sort.value = "nearby";
    setNearbyButtonState();
    applyFilters();
  } catch (error) {
    console.error(error);
    setNearbySummary("Location blocked. Allow location for nearby sort.");
    setNearbyMapEmptyState(false);
    void renderNearbyMap([]);
  } finally {
    els.useLocationButton.disabled = false;
  }
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function handleSubmitUseLocation() {
  if (!("geolocation" in navigator)) {
    setSubmitLocationStatus("Location is not available in this browser.");
    return;
  }

  els.submitUseLocationButton.disabled = true;
  setSubmitLocationStatus("Getting your location...");

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 120000
    });

    const latitude = Number(position.coords.latitude);
    const longitude = Number(position.coords.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSubmitLocationStatus("Could not read your location.");
      return;
    }

    els.submitLatitude.value = String(latitude);
    els.submitLongitude.value = String(longitude);
    setSubmitLocationStatus("Pinned.");
  } catch {
    setSubmitLocationStatus("Location blocked.");
  } finally {
    els.submitUseLocationButton.disabled = false;
  }
}

function setSubmitLocationStatus(message) {
  if (els.submitLocationStatus) {
    els.submitLocationStatus.textContent = message;
  }
}

async function renderNearbyMap(rows) {
  try {
    await ensureLeaflet();
  } catch {
    setNearbySummary("Map unavailable right now.");
    return;
  }

  if (!state.map) {
    state.map = window.L.map(els.nearbyMap, {
      zoomControl: true,
      maxBounds: MK_VIEW_BOUNDS,
      maxBoundsViscosity: 1
    });

    window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
    }).addTo(state.map);

    state.mapLayer = window.L.layerGroup().addTo(state.map);
    state.map.attributionControl.setPrefix("");
  }

  state.mapLayer.clearLayers();
  const bounds = [];

  if (state.userLocation) {
    const point = [state.userLocation.lat, state.userLocation.lng];
    const userMarker = window.L.circleMarker(point, {
      radius: 7,
      weight: 2,
      color: "#0f62fe",
      fillColor: "#0f62fe",
      fillOpacity: 0.2
    });
    userMarker.bindPopup("You are here");
    state.mapLayer.addLayer(userMarker);
    bounds.push(point);
  }

  for (const row of rows) {
    const coordinates = getRowCoordinates(row);
    if (!coordinates) continue;

    const marker = window.L.circleMarker([coordinates.lat, coordinates.lng], {
      radius: 6,
      weight: 2,
      color: "#0f1215",
      fillColor: "#ffffff",
      fillOpacity: 1
    });
    const title = escapeHtml(row.title || "Listing");
    const distance = Number.isFinite(row._distanceKm) ? ` (${escapeHtml(formatDistance(row._distanceKm))})` : "";
    marker.bindPopup(`<strong>${title}</strong>${distance}`);
    state.mapLayer.addLayer(marker);
    bounds.push([coordinates.lat, coordinates.lng]);
  }

  if (!bounds.length) {
    state.map.setView([MK_FALLBACK_CENTER.lat, MK_FALLBACK_CENTER.lng], 12);
  } else if (bounds.length === 1) {
    state.map.setView(bounds[0], 13);
  } else {
    state.map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }

  state.map.setMinZoom(11);

  setTimeout(() => {
    state.map?.invalidateSize();
  }, 0);
}

function ensureLeaflet() {
  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (state.leafletPromise) {
    return state.leafletPromise;
  }

  state.leafletPromise = new Promise((resolve, reject) => {
    ensureLeafletCss();
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("Leaflet load timeout"));
    }, 3000);

    const existing = document.querySelector(`script[src="${LEAFLET_JS_URL}"]`);
    if (existing) {
      existing.addEventListener(
        "load",
        () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          resolve(window.L);
        },
        { once: true }
      );
      existing.addEventListener(
        "error",
        () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error("Leaflet failed to load"));
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(window.L);
    };
    script.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(new Error("Leaflet failed to load"));
    };
    document.head.appendChild(script);
  });

  return state.leafletPromise;
}

function ensureLeafletCss() {
  const existing = document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS_URL;
  document.head.appendChild(link);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function sortNearbyRows(a, b) {
  const aHasDistance = Number.isFinite(a._distanceKm);
  const bHasDistance = Number.isFinite(b._distanceKm);

  if (aHasDistance !== bHasDistance) {
    return aHasDistance ? -1 : 1;
  }

  if (aHasDistance && bHasDistance) {
    if (Boolean(a.is_active_now) !== Boolean(b.is_active_now)) {
      return a.is_active_now ? -1 : 1;
    }

    if (a._nearbyScore !== b._nearbyScore) {
      return b._nearbyScore - a._nearbyScore;
    }

    if (a._distanceKm !== b._distanceKm) {
      return a._distanceKm - b._distanceKm;
    }
  }

  return b._score - a._score;
}

function sortPopularRows(a, b) {
  const aPopularity = computePopularityScore(a);
  const bPopularity = computePopularityScore(b);

  if (aPopularity !== bPopularity) {
    return bPopularity - aPopularity;
  }

  return new Date(b.updated_at) - new Date(a.updated_at);
}

function computePopularityScore(row) {
  // Until dedicated engagement signals exist, use the strongest available quality + trust signals.
  let score = Number(row.quality_score || 0);
  if (row.verified_at) score += 20;
  if (row.is_active_now) score += 8;
  if (row.starts_at) score += 3;
  return score;
}

function getDistanceKmForRow(row) {
  if (!state.userLocation) return null;

  const coordinates = getRowCoordinates(row);
  if (!coordinates) return null;

  return haversineDistanceKm(state.userLocation, coordinates);
}

function getRowCoordinates(row) {
  const rawLatitude = row?.latitude;
  const rawLongitude = row?.longitude;

  if (
    rawLatitude === null ||
    rawLatitude === undefined ||
    rawLatitude === "" ||
    rawLongitude === null ||
    rawLongitude === undefined ||
    rawLongitude === ""
  ) {
    return null;
  }

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    if (!isMiltonKeynesCoordinate(latitude, longitude)) {
      return null;
    }
    return { lat: latitude, lng: longitude };
  }
  return null;
}

function isMiltonKeynesCoordinate(latitude, longitude) {
  return (
    latitude >= MK_LAT_RANGE.min &&
    latitude <= MK_LAT_RANGE.max &&
    longitude >= MK_LNG_RANGE.min &&
    longitude <= MK_LNG_RANGE.max
  );
}

function computeNearbyScore(row) {
  if (!Number.isFinite(row._distanceKm)) {
    return -10000 + Number(row._score || 0);
  }

  let score = Number(row._score || 0) * 0.15;
  score -= row._distanceKm * 18;

  if (row.is_active_now) {
    score += 80;
  }

  const minutesUntilStart = getMinutesUntil(row.starts_at);
  if (minutesUntilStart !== null && minutesUntilStart >= 0 && minutesUntilStart <= 360) {
    score += Math.max(0, 48 - minutesUntilStart / 8);
  }

  return score;
}

function computeScore(row, query) {
  let score = Number(row.quality_score || 0);
  if (!row.verified_at) score -= 6;
  if (String(row.source_name || "").startsWith("User submission")) score -= 4;
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

function matchesPlanWhen(row, planWhen) {
  const mode = normalize(planWhen || "any");
  if (mode === "any") return true;

  const startsAt = row?.starts_at ? new Date(row.starts_at) : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) return false;

  const now = new Date();
  const startOfToday = atStartOfDay(now);
  const endOfToday = atEndOfDay(now);

  if (mode === "today") {
    return startsAt >= startOfToday && startsAt <= endOfToday;
  }

  if (mode === "tonight") {
    const tonightStart = new Date(startOfToday);
    tonightStart.setHours(17, 0, 0, 0);
    return startsAt >= tonightStart && startsAt <= endOfToday;
  }

  if (mode === "this-week") {
    const weekEnd = atEndOfDay(addDays(startOfToday, 6));
    return startsAt >= now && startsAt <= weekEnd;
  }

  if (mode === "this-weekend") {
    const weekend = getWeekendRange(now);
    return startsAt >= weekend.start && startsAt <= weekend.end;
  }

  if (mode === "next-30-days") {
    const end = atEndOfDay(addDays(startOfToday, 30));
    return startsAt >= now && startsAt <= end;
  }

  return true;
}

function matchesPlanWho(row, planWho) {
  const mode = normalize(planWho || "any");
  if (mode === "any") return true;

  const category = normalize(row?.category_slug);
  const haystack = [
    row?.title,
    row?.short_description,
    row?.long_description,
    row?.category_slug,
    ...(Array.isArray(row?.tags) ? row.tags : [])
  ]
    .map(normalize)
    .join(" ");

  const categoryHints = {
    families: ["family-and-kids", "nurseries-and-childcare", "schools-and-colleges"],
    kids: ["family-and-kids", "schools-and-colleges", "nurseries-and-childcare", "tutors-and-tuition"],
    couples: ["music-and-nightlife", "restaurants", "cafes", "pubs-and-bars"],
    friends: ["clubs-and-communities", "social-groups", "sports-clubs", "events"],
    solo: ["classes-and-courses", "coworking-and-study-spaces", "parks-and-outdoors"]
  };

  if ((categoryHints[mode] || []).some((item) => category.includes(item))) {
    return true;
  }

  const keywordHints = {
    families: ["family", "families", "parents", "parent", "baby", "toddler", "all ages", "children", "kids"],
    kids: ["kid", "kids", "children", "child", "teen", "youth", "play", "school holiday"],
    couples: ["couple", "date night", "romantic", "for two", "pairs"],
    friends: ["friends", "group", "social", "team", "mates", "squad"],
    solo: ["solo", "individual", "one-to-one", "personal", "self-guided", "independent"]
  };

  return (keywordHints[mode] || []).some((keyword) => haystack.includes(keyword));
}

function atStartOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function atEndOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function getWeekendRange(now) {
  const today = atStartOfDay(now);
  const day = today.getDay(); // 0 = Sun, 6 = Sat
  let saturdayOffset = (6 - day + 7) % 7;

  if (day === 0) {
    saturdayOffset = -1;
  }

  const saturday = addDays(today, saturdayOffset);
  const sunday = addDays(saturday, 1);
  return {
    start: atStartOfDay(saturday),
    end: atEndOfDay(sunday)
  };
}

function getPlanWhenLabel(planWhen) {
  const labels = {
    any: "Any time",
    today: "Today",
    tonight: "Tonight",
    "this-week": "This week",
    "this-weekend": "This weekend",
    "next-30-days": "Next 30 days"
  };
  return labels[planWhen] || "Any time";
}

function getPlanWhoLabel(planWho) {
  const labels = {
    any: "Anyone",
    families: "Families",
    kids: "Kids",
    couples: "Couples",
    friends: "Friends",
    solo: "Solo"
  };
  return labels[planWho] || "Anyone";
}

function getErrorMessage(error) {
  const message = String(error?.message || error || "").trim();
  if (!message) return "Unknown error";
  if (message.includes("Could not find the table")) return "Missing tables. Run supabase/schema.sql.";
  return message;
}

function isMissingColumnError(error, columnNames = []) {
  const message = getErrorMessage(error).toLowerCase();
  if (!message.includes("column")) return false;
  return columnNames.some((columnName) => message.includes(String(columnName || "").toLowerCase()));
}

function isCategoryForeignKeyError(error) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("foreign key") && message.includes("category_slug");
}

function isAuthLockError(error) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("lock:sb-") &&
    message.includes("auth-token") &&
    (message.includes("stole it") || message.includes("released"))
  );
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

function getMinutesUntil(value) {
  if (!value) return null;
  const startsAt = new Date(value).getTime();
  if (Number.isNaN(startsAt)) return null;
  return Math.round((startsAt - Date.now()) / 60000);
}

function formatDistance(km) {
  if (!Number.isFinite(km)) return "";
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function haversineDistanceKm(from, to) {
  const lat1 = Number(from?.lat);
  const lng1 = Number(from?.lng);
  const lat2 = Number(to?.lat);
  const lng2 = Number(to?.lng);

  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function setStatus(message, tone = "neutral") {
  if (!els.statusLine) return;

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
  if (!config.ENABLE_REALTIME || !state.supabasePublic) return;

  state.supabasePublic
    .channel("search_documents_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "search_documents" }, async () => {
      try {
        await loadListings();
        applyFilters();
        saveCache();
      } catch (error) {
        console.error(error);
        setStatus("Live update failed. Refresh to retry.", "warn");
      }
    })
    .subscribe();
}

function setupAuthSubscription() {
  if (!state.supabaseAuth?.auth) return;

  state.supabaseAuth.auth.onAuthStateChange(async () => {
    try {
      await refreshOperatorState();
    } catch (error) {
      if (!isAuthLockError(error)) {
        console.error(error);
      }
    }
  });
}

async function refreshOperatorState() {
  if (!state.supabaseAuth?.auth) {
    state.authSession = null;
    state.isOperator = false;
    renderOperatorState();
    return;
  }

  let sessionResult;
  try {
    sessionResult = await state.supabaseAuth.auth.getSession();
  } catch (error) {
    if (isAuthLockError(error)) {
      // Transient lock contention in Supabase auth refresh.
      setTimeout(() => {
        refreshOperatorState().catch((retryError) => {
          if (!isAuthLockError(retryError)) {
            console.error(retryError);
          }
        });
      }, 180);
      return;
    }

    throw error;
  }

  const { data, error } = sessionResult;
  if (error) {
    if (isAuthLockError(error)) {
      setTimeout(() => {
        refreshOperatorState().catch((retryError) => {
          if (!isAuthLockError(retryError)) {
            console.error(retryError);
          }
        });
      }, 180);
      return;
    }

    console.error(error);
    setOperatorFeedback("Could not read sign-in session.", "warn");
    state.authSession = null;
    state.isOperator = false;
    renderOperatorState();
    return;
  }

  state.authSession = data?.session || null;
  state.isOperator = await checkOperatorAccess();
  renderOperatorState();

  if (!els.operatorPanel.hidden && state.isOperator) {
    await loadDraftSubmissions();
  }
}

async function checkOperatorAccess() {
  if (!state.authSession) return false;

  const { data, error } = await state.supabaseAuth.rpc("is_operator");
  if (!error) return Boolean(data);

  console.error(error);
  const message = String(error?.message || "");
  if (message.includes("Could not find the function")) {
    setOperatorFeedback("Run the latest supabase/schema.sql to enable moderation mode.", "warn");
  } else {
    setOperatorFeedback("Could not verify operator access.", "warn");
  }
  return false;
}

function renderOperatorState() {
  const email = state.authSession?.user?.email || "";

  if (!state.configured) {
    els.operatorStatusText.textContent = "Connect Supabase first.";
    els.operatorLoginForm.hidden = true;
    els.operatorClaimButton.hidden = true;
    els.operatorRefreshButton.hidden = true;
    els.operatorSignoutButton.hidden = true;
    els.operatorDrafts.innerHTML = "";
    return;
  }

  if (!state.authSession) {
    els.operatorStatusText.textContent = "Sign in to edit or remove listings.";
    els.operatorLoginForm.hidden = false;
    els.operatorClaimButton.hidden = true;
    els.operatorRefreshButton.hidden = true;
    els.operatorSignoutButton.hidden = true;
    els.operatorDrafts.innerHTML = "";
    return;
  }

  els.operatorLoginForm.hidden = true;
  els.operatorSignoutButton.hidden = false;

  if (state.isOperator) {
    els.operatorStatusText.textContent = `Signed in as ${email}.`;
    els.operatorClaimButton.hidden = true;
    els.operatorRefreshButton.hidden = false;
  } else {
    els.operatorStatusText.textContent = `Signed in as ${email}. No operator access yet.`;
    els.operatorClaimButton.hidden = false;
    els.operatorRefreshButton.hidden = true;
    els.operatorDrafts.innerHTML = "";
  }
}

function toggleOperatorPanel() {
  const open = els.operatorPanel.hidden;
  els.operatorPanel.hidden = !open;
  if (open) {
    els.submitPanel.hidden = true;
  }
}

async function handleOperatorLogin(event) {
  event.preventDefault();
  if (!state.configured || !state.supabaseAuth) {
    setOperatorFeedback("Connect Supabase first.", "warn");
    return;
  }

  const email = normalizeInput(els.operatorEmail.value);
  if (!email) {
    setOperatorFeedback("Enter your operator email.", "warn");
    return;
  }

  els.operatorLoginButton.disabled = true;
  els.operatorLoginButton.textContent = "Sending...";
  setOperatorFeedback("Sending sign-in link...", "neutral");

  const redirectTo = window.location.href.split("#")[0];
  const { error } = await state.supabaseAuth.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo }
  });

  els.operatorLoginButton.disabled = false;
  els.operatorLoginButton.textContent = "Send sign-in link";

  if (error) {
    console.error(error);
    setOperatorFeedback("Could not send sign-in link.", "warn");
    return;
  }

  setOperatorFeedback("Check your email and open the sign-in link.", "ok");
}

async function handleClaimOperator() {
  if (!state.authSession || !state.supabaseAuth) {
    setOperatorFeedback("Sign in first.", "warn");
    return;
  }

  const email = state.authSession.user?.email?.toLowerCase();
  if (!email) {
    setOperatorFeedback("No email found in current session.", "warn");
    return;
  }

  els.operatorClaimButton.disabled = true;
  setOperatorFeedback("Claiming operator access...", "neutral");

  const { error } = await state.supabaseAuth.from("operator_emails").insert({ email, is_active: true });
  els.operatorClaimButton.disabled = false;

  if (error) {
    console.error(error);
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("duplicate key")) {
      setOperatorFeedback("Operator access already exists for this email.", "ok");
      await refreshOperatorState();
      return;
    }
    if (message.includes("row-level security")) {
      setOperatorFeedback("Operator access already claimed. Ask an operator to add your email.", "warn");
      return;
    }
    setOperatorFeedback("Could not claim operator access. Run latest schema SQL.", "warn");
    return;
  }

  setOperatorFeedback("Operator access granted.", "ok");
  await refreshOperatorState();
}

async function handleOperatorSignOut() {
  if (!state.supabaseAuth?.auth) return;

  const { error } = await state.supabaseAuth.auth.signOut();
  if (error) {
    console.error(error);
    setOperatorFeedback("Could not sign out.", "warn");
    return;
  }

  state.authSession = null;
  state.isOperator = false;
  els.operatorDrafts.innerHTML = "";
  setOperatorFeedback("Signed out.", "neutral");
  renderOperatorState();
}

async function loadDraftSubmissions() {
  if (!state.supabaseAuth || !state.isOperator) return;

  state.reviewing = true;
  els.operatorRefreshButton.disabled = true;
  setOperatorFeedback("Loading listings...", "neutral");

  const { data, error } = await state.supabaseAuth
    .from("search_documents")
    .select(`
      id,
      title,
      category_slug,
      short_description,
      website_url,
      booking_url,
      address_text,
      starts_at,
      source_name,
      source_url,
      created_at,
      status
    `)
    .in("status", ["published", "draft"])
    .order("created_at", { ascending: false })
    .limit(200);

  state.reviewing = false;
  els.operatorRefreshButton.disabled = false;

  if (error) {
    console.error(error);
    setOperatorFeedback("Could not load listings.", "warn");
    return;
  }

  state.moderationRows = data || [];
  renderDraftSubmissions(data || []);
  setOperatorFeedback(`${(data || []).length} listing${(data || []).length === 1 ? "" : "s"} loaded.`, "ok");
}

function renderDraftSubmissions(rows) {
  els.operatorDrafts.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("article");
    empty.className = "empty-state";
    empty.innerHTML = `
      <strong>No listings</strong>
      <p>No listings found.</p>
    `;
    els.operatorDrafts.appendChild(empty);
    return;
  }

  for (const row of rows) {
    const card = document.createElement("article");
    card.className = "review-card";

    const title = document.createElement("h3");
    title.textContent = row.title || "Untitled";
    card.appendChild(title);

    const description = document.createElement("p");
    description.textContent = row.short_description || "No description.";
    card.appendChild(description);

    const meta = document.createElement("div");
    meta.className = "review-card__meta";
    appendMeta(meta, row.status === "published" ? "Live" : humaniseSlug(row.status || "draft"));
    appendMeta(meta, humaniseSlug(row.category_slug || "listing"));
    if (row.address_text) appendMeta(meta, row.address_text);
    if (row.starts_at) appendMeta(meta, `Starts ${formatDateTime(row.starts_at)}`);
    if (row.created_at) appendMeta(meta, `Submitted ${formatDateTime(row.created_at)}`);
    card.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "review-card__actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.setAttribute("data-action", "edit");
    editButton.setAttribute("data-id", row.id);
    editButton.textContent = "Edit";
    actions.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.setAttribute("data-action", "delete");
    deleteButton.setAttribute("data-id", row.id);
    deleteButton.textContent = "Delete";
    actions.appendChild(deleteButton);

    card.appendChild(actions);
    els.operatorDrafts.appendChild(card);
  }
}

async function handleReviewAction(id, action, button) {
  if (!state.supabaseAuth || !state.isOperator) return;
  if (!["edit", "delete"].includes(action)) return;

  if (action === "edit") {
    await handleEditListing(id, button);
    return;
  }

  const confirmed = window.confirm("Delete this listing?");
  if (!confirmed) return;

  button.disabled = true;
  setOperatorFeedback("Deleting...", "neutral");

  const { error } = await state.supabaseAuth
    .from("search_documents")
    .delete()
    .eq("id", id);

  button.disabled = false;

  if (error) {
    console.error(error);
    setOperatorFeedback("Could not delete listing.", "warn");
    return;
  }

  setOperatorFeedback("Deleted.", "ok");
  try {
    await Promise.all([loadDraftSubmissions(), loadListings()]);
    applyFilters();
    saveCache();
  } catch (refreshError) {
    console.error(refreshError);
    setOperatorFeedback("Saved, but refresh failed. Reload page.", "warn");
  }
}

async function handleEditListing(id, button) {
  const row = state.moderationRows.find((item) => item.id === id);
  if (!row) {
    setOperatorFeedback("Listing not found in moderation list.", "warn");
    return;
  }

  const nextTitle = window.prompt("Title", row.title || "");
  if (nextTitle === null) return;
  const title = nextTitle.trim();
  if (!title) {
    setOperatorFeedback("Title is required.", "warn");
    return;
  }

  const nextDescription = window.prompt("Description", row.short_description || "");
  if (nextDescription === null) return;
  const description = nextDescription.trim();
  if (!description) {
    setOperatorFeedback("Description is required.", "warn");
    return;
  }

  const categoryHint = state.categories.map((category) => category.slug).join(", ");
  const nextCategory = window.prompt(`Category slug (${categoryHint})`, row.category_slug || "");
  if (nextCategory === null) return;
  const categorySlug = nextCategory.trim();

  if (categorySlug && !state.categories.some((category) => category.slug === categorySlug)) {
    setOperatorFeedback("Category slug not found.", "warn");
    return;
  }

  const nextLocation = window.prompt("Location", row.address_text || "");
  if (nextLocation === null) return;
  const addressText = nextLocation.trim();

  button.disabled = true;
  setOperatorFeedback("Saving edit...", "neutral");

  const { error } = await state.supabaseAuth
    .from("search_documents")
    .update({
      title,
      short_description: description,
      category_slug: categorySlug || null,
      address_text: addressText || null
    })
    .eq("id", id);

  button.disabled = false;

  if (error) {
    console.error(error);
    setOperatorFeedback("Could not save edit.", "warn");
    return;
  }

  setOperatorFeedback("Saved.", "ok");
  try {
    await Promise.all([loadDraftSubmissions(), loadListings()]);
    applyFilters();
    saveCache();
  } catch (refreshError) {
    console.error(refreshError);
    setOperatorFeedback("Saved, but refresh failed. Reload page.", "warn");
  }
}

function setOperatorFeedback(message, tone) {
  els.operatorFeedback.textContent = message;

  if (tone === "neutral") {
    els.operatorFeedback.removeAttribute("data-tone");
    return;
  }

  els.operatorFeedback.setAttribute("data-tone", tone);
}

function toggleSubmitPanel(open) {
  els.submitPanel.hidden = !open;
  if (open) {
    els.submitForm.querySelector("#submit-title")?.focus();
  } else {
    clearImagePreview();
    setSubmitLocationStatus("");
    setSubmitFeedback("", "neutral");
  }
}

async function handleSubmitListing(event) {
  event.preventDefault();
  if (state.submitting) return;

  if (!state.configured || !state.supabasePublic) {
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
  const latitudeRaw = normalizeInput(formData.get("latitude"));
  const longitudeRaw = normalizeInput(formData.get("longitude"));
  const imageFile = els.submitImageFile.files?.[0] || null;

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

  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;

  if ((latitudeRaw && !Number.isFinite(latitude)) || (longitudeRaw && !Number.isFinite(longitude))) {
    setSubmitFeedback("Pinned location is invalid. Try pinning again.", "warn");
    return;
  }

  if ((latitude !== null && (latitude < -90 || latitude > 90)) || (longitude !== null && (longitude < -180 || longitude > 180))) {
    setSubmitFeedback("Pinned location is out of range.", "warn");
    return;
  }

  if (imageFile) {
    const imageError = validateImageFile(imageFile);
    if (imageError) {
      setSubmitFeedback(imageError, "warn");
      return;
    }
  }

  state.submitting = true;
  els.submitButton.disabled = true;
  els.submitButton.textContent = "Submitting...";
  setSubmitFeedback("Publishing...", "neutral");

  let imageUrl = null;
  if (imageFile) {
    setSubmitFeedback("Uploading image...", "neutral");
    imageUrl = await uploadListingImage(imageFile, title);
    if (!imageUrl) {
      state.submitting = false;
      els.submitButton.disabled = false;
      els.submitButton.textContent = "Submit";
      return;
    }
    setSubmitFeedback("Publishing...", "neutral");
  }

  const payload = {
    slug: makeSubmissionSlug(title),
    title,
    category_slug: categorySlug,
    short_description: description,
    image_url: imageUrl,
    website_url: emptyToNull(websiteUrl),
    booking_url: emptyToNull(bookingUrl),
    address_text: emptyToNull(location),
    latitude,
    longitude,
    tags: parseTags(tagsRaw),
    status: "published",
    is_active_now: false,
    starts_at: startsAt,
    source_name: submitterName ? `User submission: ${submitterName}` : "User submission",
    source_url: emptyToNull(sourceUrl),
    quality_score: 0
  };

  let { error } = await state.supabasePublic.from("search_documents").insert(payload);

  if (error && isMissingColumnError(error, ["latitude", "longitude"])) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.latitude;
    delete fallbackPayload.longitude;
    const retryWithoutCoordinates = await state.supabasePublic.from("search_documents").insert(fallbackPayload);
    error = retryWithoutCoordinates.error;
  }

  if (error && isCategoryForeignKeyError(error)) {
    const fallbackPayload = {
      ...payload,
      category_slug: null,
      tags: [...parseTags(tagsRaw), categorySlug].filter(Boolean).slice(0, 8)
    };
    const retryWithoutCategory = await state.supabasePublic.from("search_documents").insert(fallbackPayload);
    error = retryWithoutCategory.error;
    if (!error) {
      setSubmitFeedback("Posted. Category will appear after category sync.", "ok");
    }
  }

  if (error && isAuthLockError(error)) {
    await wait(180);
    const retry = await state.supabasePublic.from("search_documents").insert(payload);
    error = retry.error;
  }

  state.submitting = false;
  els.submitButton.disabled = false;
  els.submitButton.textContent = "Submit";

  if (error) {
    console.error(error);
    const message = getErrorMessage(error);
    if (message.includes("Could not find the table")) {
      setSubmitFeedback("Run supabase/schema.sql first.", "warn");
      return;
    }
    if (message.toLowerCase().includes("row-level security")) {
      setSubmitFeedback("Submission policy missing. Run latest schema SQL.", "warn");
      return;
    }
    setSubmitFeedback(`Could not submit: ${message}`, "warn");
    return;
  }

  els.submitForm.reset();
  clearImagePreview();
  setSubmitLocationStatus("");
  setSubmitFeedback("Posted.", "ok");

  try {
    await loadListings();
    applyFilters();
    saveCache();
  } catch (refreshError) {
    console.error(refreshError);
  }
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

function handleImageFileChange() {
  const file = els.submitImageFile.files?.[0] || null;
  if (!file) {
    clearImagePreview();
    return;
  }

  const imageError = validateImageFile(file);
  if (imageError) {
    setSubmitFeedback(imageError, "warn");
    els.submitImageFile.value = "";
    clearImagePreview();
    return;
  }

  setSubmitFeedback("", "neutral");
  setImagePreview(file);
}

function validateImageFile(file) {
  if (!file.type || !file.type.startsWith("image/")) {
    return "Please select an image file.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Image must be 5MB or smaller.";
  }

  return null;
}

function setImagePreview(file) {
  clearImagePreview(false);
  state.previewObjectUrl = URL.createObjectURL(file);
  els.submitImagePreview.src = state.previewObjectUrl;
  els.submitImagePreviewWrap.hidden = false;
}

function clearImagePreview(clearInput = true) {
  if (state.previewObjectUrl) {
    URL.revokeObjectURL(state.previewObjectUrl);
    state.previewObjectUrl = null;
  }

  els.submitImagePreview.removeAttribute("src");
  els.submitImagePreviewWrap.hidden = true;

  if (clearInput) {
    els.submitImageFile.value = "";
  }
}

async function uploadListingImage(file, title) {
  if (!state.supabasePublic) return null;

  const extension = inferImageExtension(file);
  const path = `public/${new Date().toISOString().slice(0, 10)}/${makeSubmissionSlug(title)}.${extension}`;

  const { error } = await state.supabasePublic.storage
    .from(LISTING_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

  if (error) {
    console.error(error);
    setSubmitFeedback(`Image upload failed: ${getErrorMessage(error)}`, "warn");
    return null;
  }

  const { data } = state.supabasePublic.storage.from(LISTING_IMAGE_BUCKET).getPublicUrl(path);
  const publicUrl = data?.publicUrl || null;

  if (!publicUrl) {
    setSubmitFeedback("Image uploaded but URL is missing.", "warn");
    return null;
  }

  return publicUrl;
}

function inferImageExtension(file) {
  const fileName = String(file?.name || "");
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex !== -1 && dotIndex < fileName.length - 1) {
    return fileName.slice(dotIndex + 1).toLowerCase();
  }

  const mime = String(file?.type || "").toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

function normalizeInput(value) {
  return String(value || "").trim();
}

function emptyToNull(value) {
  return value ? value : null;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, timeoutMs, label) {
  let timerId;

  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(`${label} request timed out`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timerId);
  }
}

function setSubmitFeedback(message, tone) {
  els.submitFeedback.textContent = message;

  if (tone === "neutral") {
    els.submitFeedback.removeAttribute("data-tone");
    return;
  }

  els.submitFeedback.setAttribute("data-tone", tone);
}
