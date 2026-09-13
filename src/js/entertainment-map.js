/** Events gallery map: pin click filters to that venue; map click uses viewport bounds. */

(() => {
  const mapEl = document.querySelector("[data-ent-map]");
  const msgEl = document.querySelector("[data-ent-map-msg]");
  if (!mapEl) return;

  const PIN_FILL = "#9b1d14";
  const CLUSTER_SRC =
    "https://unpkg.com/@googlemaps/markerclusterer@2.5.3/dist/index.umd.js";
  const DRAWER_ID = "map-filter";
  const BREAKOUT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M18 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`;

  let map = null;
  let clusterer = null;
  let markers = [];
  let fullBounds = null;
  let loadPromise = null;
  let areaFilterOn = false;
  let upcomingOnly = false;
  let selectedPlaceId = "";
  let infoWindow = null;
  let infoMarker = null;

  const isPastCard = (card) =>
    card.dataset.when === "past" || Boolean(card.closest("[data-when='past']"));
  const isEligible = (card) => {
    if (card.hasAttribute("data-map-keep")) return true;
    return !upcomingOnly || !isPastCard(card);
  };
  const locatedCards = () =>
    [...document.querySelectorAll(".card.poster[data-lat][data-lng]")].filter(isEligible);
  const unlocatedCards = () =>
    [...document.querySelectorAll(".card.poster:not([data-lat]):not([data-map-keep])")].filter(
      isEligible,
    );
  const placeKeyOf = (card) =>
    card.dataset.placeId || `${Number(card.dataset.lat)},${Number(card.dataset.lng)}`;
  const hideIneligible = () => {
    for (const card of document.querySelectorAll(".card.poster:not([data-map-keep])")) {
      if (!isEligible(card)) card.hidden = true;
    }
  };

  const showMsg = (text) => {
    if (!msgEl) return;
    msgEl.hidden = !text;
    msgEl.textContent = text || "";
    mapEl.hidden = Boolean(text);
  };

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "1") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(src)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.loaded = "0";
      script.onload = () => {
        script.dataset.loaded = "1";
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });

  const formatMagnitude = (n) => String(Math.max(0, Math.round(Number(n) || 0)));

  const countPinIcon = (g, n, { area = false } = {}) => {
    const label = formatMagnitude(n);
    const size = (label.length > 2 ? 28 : label.length > 1 ? 24 : 20) + (area ? 10 : 0);
    const fontSize = label.length > 2 ? 10 : label.length > 1 ? 11 : 12;
    const cx = size / 2;
    const body = area
      ? `<circle cx="${cx}" cy="${cx}" r="${cx - 1.2}" fill="none" stroke="${PIN_FILL}" stroke-width="2.25"/>
  <circle cx="${cx}" cy="${cx}" r="${cx - 3.1}" fill="${PIN_FILL}" stroke="#fff" stroke-width="1.5"/>`
      : `<circle cx="${cx}" cy="${cx}" r="${cx - 1.5}" fill="${PIN_FILL}" stroke="#fff" stroke-width="1.5"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${body}
  <text x="${cx}" y="${cx}" dy=".38em" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">${label}</text>
</svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new g.maps.Size(size, size),
      anchor: new g.maps.Point(cx, cx),
    };
  };

  const compactAddress = (address) =>
    String(address || "")
      .replace(/,?\s*USA\s*$/i, "")
      .trim();

  const placeDisplayName = (value) => {
    if (typeof value === "string") return value.trim();
    if (value && typeof value === "object" && "text" in value) {
      return String(value.text || "").trim();
    }
    return "";
  };

  const mapsPlaceUrl = (placeId, query) => {
    const params = new URLSearchParams({ api: "1", query_place_id: placeId });
    if (query) params.set("query", query);
    return `https://www.google.com/maps/search/?${params}`;
  };

  const mapsSearchUrl = (venue) => {
    const query =
      [venue.name, venue.address].filter(Boolean).join(", ") ||
      `${venue.lat},${venue.lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const venueInfoCard = (opts) => {
    const card = document.createElement("div");
    card.className = "ent-place-card";

    const top = document.createElement("div");
    top.className = "ent-place-card-top";

    const copy = document.createElement("div");
    copy.className = "ent-place-card-copy";

    const name = document.createElement("div");
    name.className = "ent-place-card-name";
    name.textContent = opts.name;
    copy.append(name);

    if (opts.address) {
      const addr = document.createElement("div");
      addr.className = "ent-place-card-address";
      addr.textContent = opts.address;
      copy.append(addr);
    }

    const link = document.createElement("a");
    link.href = opts.mapsUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", "Open in Google Maps");
    link.className = "ent-place-card-maps";
    link.innerHTML = BREAKOUT_ICON;

    top.append(copy, link);
    card.append(top);
    return card;
  };

  const loadPlacesLib = async () => {
    const importLibrary = window.google?.maps?.importLibrary;
    if (!importLibrary) return null;
    try {
      return await importLibrary("places");
    } catch {
      return null;
    }
  };

  const fetchPlaceCardDetails = async (googlePlaceId) => {
    const lib = await loadPlacesLib();
    const Place = lib?.Place;
    if (!Place) return {};
    try {
      const place = new Place({ id: googlePlaceId });
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "googleMapsURI"],
      });
      const name = placeDisplayName(place.displayName);
      const address = compactAddress(place.formattedAddress || "");
      return {
        name: name || undefined,
        address: address || undefined,
        mapsUrl: place.googleMapsURI || mapsPlaceUrl(googlePlaceId, name),
      };
    } catch {
      return {};
    }
  };

  const lookupGooglePlaceId = async (venue) => {
    const known = String(venue.googlePlaceId || "")
      .trim()
      .replace(/^places\//, "");
    if (known) return known;
    const lib = await loadPlacesLib();
    const Place = lib?.Place;
    if (!Place?.searchByText) return "";
    const textQuery = [venue.name, venue.address].filter(Boolean).join(", ");
    if (!textQuery) return "";
    try {
      const { places } = await Place.searchByText({
        textQuery,
        fields: ["id", "displayName"],
        maxResultCount: 3,
        locationBias: { lat: venue.lat, lng: venue.lng },
      });
      const id = String(places?.[0]?.id || "")
        .trim()
        .replace(/^places\//, "");
      if (id) venue.googlePlaceId = id;
      return id;
    } catch {
      return "";
    }
  };

  const ensureInfoWindow = (g) => {
    if (infoWindow) return infoWindow;
    infoWindow = new g.maps.InfoWindow({
      headerDisabled: true,
      minWidth: 248,
      pixelOffset: new g.maps.Size(0, -8),
    });
    infoWindow.addListener("closeclick", () => {
      closeVenueInfo();
    });
    return infoWindow;
  };

  const closeVenueInfo = () => {
    infoWindow?.close();
    infoMarker = null;
    const hadVenue = Boolean(selectedPlaceId);
    selectedPlaceId = "";
    if (hadVenue) applyViewportBounds();
  };

  const openVenueInfo = async (g, marker, venue) => {
    if (!map) return;
    const iw = ensureInfoWindow(g);
    infoMarker = marker;
    selectedPlaceId = venue.id;
    applyVenue(venue.id);
    const fallback = {
      name: venue.name,
      address: venue.address,
      mapsUrl: venue.googlePlaceId
        ? mapsPlaceUrl(venue.googlePlaceId, venue.name)
        : mapsSearchUrl(venue),
    };
    iw.setContent(venueInfoCard(fallback));
    iw.open({ map, anchor: marker });
    const googlePlaceId = await lookupGooglePlaceId(venue);
    if (infoMarker !== marker) return;
    if (!googlePlaceId) return;
    const details = await fetchPlaceCardDetails(googlePlaceId);
    if (infoMarker !== marker) return;
    iw.setContent(
      venueInfoCard({
        name: details.name || venue.name,
        address: details.address || venue.address,
        mapsUrl: details.mapsUrl || mapsPlaceUrl(googlePlaceId, details.name || venue.name),
      }),
    );
  };

  const venuesFromCards = () => {
    const byKey = new Map();
    for (const card of locatedCards()) {
      const lat = Number(card.dataset.lat);
      const lng = Number(card.dataset.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
      const key = card.dataset.placeId || `${lat},${lng}`;
      const glosses = card.querySelectorAll(".card-body .gloss");
      const name =
        card.dataset.placeName?.trim() ||
        glosses[glosses.length - 1]?.textContent?.trim() ||
        "";
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: key,
          lat,
          lng,
          name,
          address: card.dataset.placeAddress || "",
          googlePlaceId: (card.dataset.googlePlaceId || "").replace(/^places\//, ""),
          count: 0,
        });
      }
      const row = byKey.get(key);
      row.count += 1;
      if (!row.googlePlaceId && card.dataset.googlePlaceId) {
        row.googlePlaceId = card.dataset.googlePlaceId.replace(/^places\//, "");
      }
      if (!row.address && card.dataset.placeAddress) {
        row.address = card.dataset.placeAddress;
      }
    }
    return [...byKey.values()];
  };

  const syncSections = () => {
    for (const section of document.querySelectorAll("[data-map-section]")) {
      const visible = [...section.querySelectorAll(".card.poster")].some((el) => !el.hidden);
      section.hidden = !visible;
    }
  };

  const markFilterActive = (geoOn) => {
    areaFilterOn = geoOn;
    window.lssSetDrawerActive?.(DRAWER_ID, geoOn || upcomingOnly);
    syncSections();
  };

  const applyVenue = (placeId) => {
    hideIneligible();
    for (const card of locatedCards()) {
      card.hidden = placeKeyOf(card) !== placeId;
    }
    for (const card of unlocatedCards()) {
      card.hidden = true;
    }
    markFilterActive(true);
  };

  const applyBounds = (bounds) => {
    hideIneligible();
    const LatLng = window.google?.maps?.LatLng;
    let anyOut = false;
    for (const card of locatedCards()) {
      const lat = Number(card.dataset.lat);
      const lng = Number(card.dataset.lng);
      const point = LatLng ? new LatLng(lat, lng) : { lat, lng };
      const inView = bounds.contains(point);
      if (!inView) anyOut = true;
      card.hidden = !inView;
    }
    for (const card of unlocatedCards()) {
      card.hidden = anyOut;
    }
    markFilterActive(anyOut);
  };

  const applyTimeWindow = () => {
    hideIneligible();
    for (const card of locatedCards()) card.hidden = false;
    for (const card of unlocatedCards()) card.hidden = false;
    markFilterActive(false);
  };

  const refreshGallery = () => {
    if (selectedPlaceId) {
      const still = locatedCards().some((card) => placeKeyOf(card) === selectedPlaceId);
      if (still) {
        applyVenue(selectedPlaceId);
        return;
      }
      selectedPlaceId = "";
      infoWindow?.close();
      infoMarker = null;
    }
    if (map) applyViewportBounds();
    else applyTimeWindow();
  };

  const applyViewportBounds = () => {
    if (selectedPlaceId || !map) return;
    const bounds = map.getBounds();
    if (bounds) applyBounds(bounds);
  };

  const fitAll = () => {
    if (!map || !fullBounds || fullBounds.isEmpty()) return;
    map.fitBounds(fullBounds, 48);
  };

  const addMapToolbar = (g) => {
    const bar = document.createElement("div");
    bar.className = "ent-map-toolbar";
    bar.addEventListener("click", (event) => event.stopPropagation());
    bar.addEventListener("mousedown", (event) => event.stopPropagation());

    const upcoming = document.createElement("label");
    upcoming.className = "ent-map-upcoming";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = upcomingOnly;
    check.addEventListener("change", () => {
      upcomingOnly = check.checked;
      const wasWide = !areaFilterOn && !selectedPlaceId;
      renderMarkers(g);
      refreshGallery();
      if (wasWide) fitAll();
    });
    upcoming.append(check, document.createTextNode("Upcoming only"));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ent-map-fit";
    btn.textContent = "Show all";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      selectedPlaceId = "";
      infoWindow?.close();
      infoMarker = null;
      fitAll();
    });

    bar.append(upcoming, btn);
    map.controls[g.maps.ControlPosition.TOP_RIGHT].push(bar);
  };

  const renderMarkers = (g) => {
    infoWindow?.close();
    infoMarker = null;
    clusterer?.clearMarkers();
    clusterer?.setMap?.(null);
    clusterer = null;
    for (const marker of markers) marker.setMap(null);
    for (const marker of markers) marker.setMap(null);
    markers = [];
    const venues = venuesFromCards();
    fullBounds = new g.maps.LatLngBounds();
    for (const venue of venues) {
      const position = { lat: venue.lat, lng: venue.lng };
      fullBounds.extend(position);
      const marker = new g.maps.Marker({
        position,
        title: `${venue.name} (${venue.count})`,
        icon: countPinIcon(g, venue.count),
        map,
      });
      marker.eventCount = venue.count;
      marker.placeId = venue.id;
      marker.addListener("click", () => {
        void openVenueInfo(g, marker, venue);
      });
      markers.push(marker);
    }
    const Clusterer = window.markerClusterer?.MarkerClusterer;
    if (Clusterer && markers.length) {
      const defaultClusterClick = window.markerClusterer.defaultOnClusterClickHandler;
      clusterer = new Clusterer({
        map,
        markers,
        renderer: {
          render: ({ markers: kids, position }) => {
            const events = (kids || []).reduce(
              (sum, m) => sum + (Number(m.eventCount) || 0),
              0,
            );
            return new g.maps.Marker({
              position,
              icon: countPinIcon(g, events, { area: true }),
              title: `${kids.length} venues · ${events} shows`,
              zIndex: Number(g.maps.Marker.MAX_ZINDEX) + events,
            });
          },
        },
        onClusterClick: (event, cluster, mapInst) => {
          closeVenueInfo();
          if (typeof defaultClusterClick === "function") {
            defaultClusterClick(event, cluster, mapInst);
          }
        },
      });
    }
  };

  const mountMap = async () => {
    const key = String(window.LSS_MAPS_KEY || "").trim();
    if (!key) {
      showMsg(
        "Add a Maps JavaScript API key in maps-config.js (HTTP referrers: littlesaigonsac.town and localhost:4173).",
      );
      return;
    }
    showMsg("");
    const g = window.google;
    if (g.maps.importLibrary) {
      await g.maps.importLibrary("maps");
      void g.maps.importLibrary("places").catch(() => {});
    }
    map = new g.maps.Map(mapEl, {
      center: { lat: 38.58, lng: -121.3 },
      zoom: 8,
      maxZoom: 16,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
    addMapToolbar(g);
    renderMarkers(g);
    fitAll();
    g.maps.event.addListener(map, "idle", () => {
      applyViewportBounds();
    });
    g.maps.event.addListener(map, "click", () => {
      closeVenueInfo();
    });
  };

  const ensureMap = () => {
    if (map) {
      window.google?.maps.event.trigger(map, "resize");
      return loadPromise;
    }
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const key = String(window.LSS_MAPS_KEY || "").trim();
      if (!key) {
        await mountMap();
        return;
      }
      await loadScript(
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`,
      );
      try {
        await loadScript(CLUSTER_SRC);
      } catch {
        // Clustering is optional; pins still work.
      }
      await mountMap();
    })().catch((err) => {
      loadPromise = null;
      showMsg(err.message || "Map failed to load.");
    });
    return loadPromise;
  };

  document.addEventListener("lss-drawer-open", (event) => {
    if (event.detail?.id !== DRAWER_ID) return;
    const kick = () => {
      ensureMap().then(() => {
        window.google?.maps.event.trigger(map, "resize");
        if (map && !areaFilterOn) fitAll();
      });
    };
    document.getElementById(DRAWER_ID)?.addEventListener("transitionend", kick, { once: true });
    setTimeout(kick, 320);
  });

  applyTimeWindow();
})();
