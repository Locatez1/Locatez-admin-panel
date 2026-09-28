import React, { useEffect, useRef, useState } from "react";
import { Search, MapPin, Loader2, Navigation, AlertTriangle, Crosshair, Layers } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import { useToast } from "../../context/ToastContext";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
/** Advanced markers require a Map ID. DEMO_MAP_ID works for development. */
const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
const SEARCH_REGION = "in";
const SEARCH_BIAS_RADIUS_METERS = 50000;
const PIN_COLOR = "#25A59E";

type MapStyleKey = "streets" | "satellite" | "outdoors";

const MAP_TYPES: Record<MapStyleKey, google.maps.MapTypeId> = {
  streets: "roadmap" as google.maps.MapTypeId,
  satellite: "hybrid" as google.maps.MapTypeId,
  outdoors: "terrain" as google.maps.MapTypeId,
};

/** Text Search cannot restrict by country code, so non-pinned searches are limited to India's bounding box. */
const INDIA_BOUNDS: google.maps.LatLngBoundsLiteral = {
  south: 6.5,
  west: 68.1,
  north: 35.7,
  east: 97.4,
};
const TEXT_SEARCH_MAX_RESULTS = 20;
/** Text Search is billed per call — wait for a pause in typing and skip very short queries. */
const TEXT_SEARCH_DEBOUNCE_MS = 600;
const TEXT_SEARCH_MIN_CHARS = 3;

interface SearchResult {
  id: string;
  text: string;
  place_name: string;
  place: google.maps.places.Place;
}

interface GoogleLocationPickerProps {
  location: string;
  onLocationChange: (newLocation: string) => void;
  latitude: number | "";
  longitude: number | "";
  onCoordinatesChange: (lat: number, lng: number) => void;
  /** Optional: Google place_id of the selected search result / clicked POI. */
  onPlaceIdChange?: (placeId: string | null) => void;
}

const isApiKeyConfigured = () =>
  Boolean(GOOGLE_MAPS_API_KEY.trim()) && !GOOGLE_MAPS_API_KEY.includes("YOUR_");

let googleMapsLoader: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  if (typeof (window as any).google?.maps?.importLibrary === "function") {
    return Promise.resolve();
  }
  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise<void>((resolve, reject) => {
    const callbackName = "__locatorGoogleMapsReady";
    (window as any)[callbackName] = () => resolve();

    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY,
      v: "weekly",
      loading: "async",
      language: "en",
      region: SEARCH_REGION.toUpperCase(),
      callback: callbackName,
    });
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      googleMapsLoader = null;
      script.remove();
      reject(new Error("Failed to load Google Maps JavaScript API"));
    };
    document.head.appendChild(script);
  });

  return googleMapsLoader;
};

const readLatLng = (
  position: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitudeLiteral | null | undefined
): { lat: number; lng: number } | null => {
  if (!position) return null;
  if (typeof (position as google.maps.LatLng).lat === "function") {
    const p = position as google.maps.LatLng;
    return { lat: p.lat(), lng: p.lng() };
  }
  const p = position as google.maps.LatLngLiteral;
  return { lat: p.lat, lng: p.lng };
};

export const GoogleLocationPicker: React.FC<GoogleLocationPickerProps> = ({
  location,
  onLocationChange,
  latitude,
  longitude,
  onCoordinatesChange,
  onPlaceIdChange,
}) => {
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const searchRequestIdRef = useRef(0);
  const lastSearchedQueryRef = useRef<string | null>(null);

  const [mapStyle, setMapStyle] = useState<MapStyleKey>("streets");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, TEXT_SEARCH_DEBOUNCE_MS);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [keyError, setKeyError] = useState(!isApiKeyConfigured());

  // Default fallback center (Mumbai)
  const defaultLng = typeof longitude === "number" && !isNaN(longitude) ? longitude : 72.8236;
  const defaultLat = typeof latitude === "number" && !isNaN(latitude) ? latitude : 18.9432;

  const handleStyleChange = (styleKey: MapStyleKey) => {
    setMapStyle(styleKey);
    mapRef.current?.setMapTypeId(MAP_TYPES[styleKey]);
  };

  const moveMarker = (lat: number, lng: number, zoom = 14) => {
    if (markerRef.current) markerRef.current.position = { lat, lng };
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      if ((mapRef.current.getZoom() ?? 0) < zoom) mapRef.current.setZoom(zoom);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!geocoderRef.current) return;
    try {
      const { results } = await geocoderRef.current.geocode({ location: { lat, lng } });
      if (results?.[0]?.formatted_address) {
        onLocationChange(results[0].formatted_address);
      }
    } catch (err) {
      console.warn("[Google Maps] Reverse geocoding failed:", err);
    }
  };

  const applyPlace = async (place: google.maps.places.Place, fieldsLoaded = false) => {
    if (!fieldsLoaded) {
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
    }
    const coords = readLatLng(place.location);
    if (!coords) return false;

    const name = place.displayName || "";
    const address = place.formattedAddress || "";
    const label = name && address && !address.startsWith(name) ? `${name}, ${address}` : address || name;

    onLocationChange(label);
    onCoordinatesChange(coords.lat, coords.lng);
    onPlaceIdChange?.(place.id || null);
    moveMarker(coords.lat, coords.lng, 15);
    return true;
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.", "Location Error");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onCoordinatesChange(lat, lng);
        onPlaceIdChange?.(null);
        moveMarker(lat, lng);
        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (err) => {
        console.warn("[Geolocation] Error getting position:", err);
        toast.error("Unable to retrieve your position. Please grant location permissions in your browser.", "Location Error");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Initialize Google Map
  useEffect(() => {
    if (!mapContainerRef.current || !isApiKeyConfigured()) return;

    let cancelled = false;
    (window as any).gm_authFailure = () => setKeyError(true);

    const init = async () => {
      try {
        await loadGoogleMaps();
        const [{ Map }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
          google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
          google.maps.importLibrary("places"),
          google.maps.importLibrary("geocoding"),
        ]);
        if (cancelled || !mapContainerRef.current) return;

        const map = new Map(mapContainerRef.current, {
          center: { lat: defaultLat, lng: defaultLng },
          zoom: typeof latitude === "number" ? 14 : 11,
          mapId: GOOGLE_MAPS_MAP_ID,
          mapTypeId: MAP_TYPES[mapStyle],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
        });

        const pin = new PinElement({
          background: PIN_COLOR,
          borderColor: "#1B7A75",
          glyphColor: "#FFFFFF",
        });
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: defaultLat, lng: defaultLng },
          gmpDraggable: true,
          content: pin.element,
        });

        marker.addListener("dragend", () => {
          const coords = readLatLng(marker.position);
          if (!coords) return;
          onCoordinatesChange(coords.lat, coords.lng);
          onPlaceIdChange?.(null);
          reverseGeocode(coords.lat, coords.lng);
        });

        map.addListener("click", async (e: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
          const coords = readLatLng(e.latLng);
          if (!coords) return;
          const placeId = "placeId" in e ? e.placeId : null;

          // Clicking a POI icon: use the place's name/address instead of Google's default info window.
          if (placeId) {
            e.stop();
            marker.position = coords;
            try {
              const ok = await applyPlace(new google.maps.places.Place({ id: placeId }));
              if (ok) return;
            } catch (err) {
              console.warn("[Google Maps] POI details failed:", err);
            }
          }

          marker.position = coords;
          onCoordinatesChange(coords.lat, coords.lng);
          onPlaceIdChange?.(null);
          reverseGeocode(coords.lat, coords.lng);
        });

        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = new google.maps.Geocoder();
      } catch (err) {
        console.warn("[Google Maps] Failed to initialize:", err);
        if (!cancelled) setKeyError(true);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
      if (markerRef.current) {
        google.maps.event.clearInstanceListeners(markerRef.current);
        markerRef.current.map = null;
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Update Marker & Map Center when coordinates change externally
  useEffect(() => {
    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    ) {
      moveMarker(latitude, longitude);
    }
  }, [latitude, longitude]);

  // Places API (New) Text Search — same results as searching on Google Maps.
  const runTextSearch = async (query: string) => {
    const rawQuery = query.trim();
    if (!rawQuery || !window.google?.maps?.places?.Place) return;
    if (rawQuery === lastSearchedQueryRef.current) {
      setShowDropdown(true);
      return;
    }
    lastSearchedQueryRef.current = rawQuery;
    const requestId = ++searchRequestIdRef.current;

    setIsSearching(true);
    try {
      const request: google.maps.places.SearchByTextRequest = {
        textQuery: rawQuery.replace(/\bdehli\b/gi, "delhi"),
        fields: ["id", "displayName", "formattedAddress", "location"],
        language: "en",
        region: SEARCH_REGION,
        maxResultCount: TEXT_SEARCH_MAX_RESULTS,
      };
      if (
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        !isNaN(latitude) &&
        !isNaN(longitude)
      ) {
        request.locationBias = {
          center: { lat: latitude, lng: longitude },
          radius: SEARCH_BIAS_RADIUS_METERS,
        };
      } else {
        request.locationRestriction = INDIA_BOUNDS;
      }

      const { places } = await google.maps.places.Place.searchByText(request);
      if (requestId !== searchRequestIdRef.current) return;
      setSearchResults(
        places.map((p) => ({
          id: p.id,
          text: p.displayName || p.formattedAddress || "Unnamed place",
          place_name: p.formattedAddress || "",
          place: p,
        }))
      );
      setHasSearched(true);
      setShowDropdown(true);
    } catch (err) {
      if (requestId !== searchRequestIdRef.current) return;
      lastSearchedQueryRef.current = null;
      console.error("[Google Maps] Text search error:", err);
      toast.error("Search failed. Please try again.", "Location Error");
    } finally {
      if (requestId === searchRequestIdRef.current) setIsSearching(false);
    }
  };

  useEffect(() => {
    const rawQuery = debouncedSearchQuery.trim();
    if (rawQuery.length < TEXT_SEARCH_MIN_CHARS || !mapRef.current) return;
    runTextSearch(rawQuery);
  }, [debouncedSearchQuery]);

  const handleSelectResult = async (result: SearchResult) => {
    try {
      await applyPlace(result.place, true);
    } catch (err) {
      console.warn("[Google Maps] Place selection error:", err);
      toast.error("Could not load that place. Please try another result.", "Location Error");
    } finally {
      searchRequestIdRef.current++;
      lastSearchedQueryRef.current = null;
      setIsSearching(false);
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      setShowDropdown(false);
    }
  };

  return (
    <div className="space-y-3">
      {keyError && (
        <div className="bg-red-50 border border-red-300 text-red-900 p-3 rounded-md text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Google Maps API Key Issue Detected</p>
            <p className="text-red-800 mt-0.5">
              Set a valid key in <code className="font-mono font-bold">.env</code> (<code className="font-mono bg-red-100 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code>) with Maps JavaScript API, Places API (New) and Geocoding API enabled, then restart the dev server.
            </p>
          </div>
        </div>
      )}

      {/* 1. Single Location Search Input + Geolocation Button */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="map-single-search" className="block text-sm font-medium text-neutral-700">
            Search Location on Map
          </label>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="text-xs bg-primary-100 hover:bg-primary-100/80 text-primary-900 font-semibold px-2.5 py-1 rounded-md border border-primary-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />
            ) : (
              <Crosshair className="h-3.5 w-3.5 text-primary-600" />
            )}
            <span>Use Current Location</span>
          </button>
        </div>

        <div className="relative">
          <input
            id="map-single-search"
            type="text"
            placeholder="Search any place, monument, address (e.g. Jantar Mantar, Qutub Minar, Marine Drive...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) {
                searchRequestIdRef.current++;
                lastSearchedQueryRef.current = null;
                setIsSearching(false);
                setSearchResults([]);
                setHasSearched(false);
                setShowDropdown(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // The picker sits inside forms — Enter must search, not submit.
                e.preventDefault();
                runTextSearch(searchQuery);
              }
            }}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            className="w-full pl-9 pr-8 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          {isSearching && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary-600" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && hasSearched && searchQuery.trim() && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-72 overflow-y-auto divide-y divide-neutral-100">
            {searchResults.length === 0 && (
              <p className="px-3 py-2 text-xs text-neutral-500">No places found.</p>
            )}
            {searchResults.map((res) => (
              <div
                key={res.id}
                onClick={() => handleSelectResult(res)}
                className="px-3 py-2 text-xs hover:bg-primary-100 cursor-pointer flex items-start gap-2 text-neutral-800 transition"
              >
                <MapPin className="h-4 w-4 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-neutral-900">{res.text}</p>
                  <p className="text-neutral-500 line-clamp-1">{res.place_name}</p>
                </div>
              </div>
            ))}
            <div className="px-3 py-1.5 text-[10px] text-neutral-400 text-right">powered by Google</div>
          </div>
        )}
      </div>

      {/* 2. Interactive Map Container & Map Type Selector */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1 font-medium text-neutral-700">
            <Navigation className="h-3.5 w-3.5 text-primary-500" /> Interactive Map Pin Selector
          </span>

          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-md border border-neutral-200">
            <span className="text-[10px] text-neutral-400 font-semibold px-1 flex items-center gap-0.5">
              <Layers className="h-3 w-3" /> Layer:
            </span>
            {(
              [
                ["streets", "Streets"],
                ["satellite", "Satellite Hybrid"],
                ["outdoors", "Terrain"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleStyleChange(key)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${mapStyle === key ? "bg-white text-primary-900 font-bold shadow-xs" : "text-neutral-600 hover:text-neutral-900"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div
          ref={mapContainerRef}
          className="h-64 sm:h-72 w-full min-h-[250px] rounded-lg border border-neutral-300 shadow-inner overflow-hidden relative"
        />
      </div>

      {/* 3. Address / Location Input Field */}
      <div>
        <label htmlFor="map-location-address" className="block text-sm font-medium text-neutral-700 mb-1">
          Location Address
        </label>
        <div className="relative">
          <input
            id="map-location-address"
            type="text"
            required
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Selected address will appear here..."
            className="w-full pl-9 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-neutral-50/50"
          />
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-red-500" />
        </div>
      </div>

      {/* 4. Derived Coordinates Display */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-md border border-neutral-200 text-xs">
        <div>
          <label className="block text-neutral-500 font-medium mb-1">Derived Latitude</label>
          <input
            type="text"
            readOnly
            value={typeof latitude === "number" ? latitude.toFixed(6) : "Pin location to derive"}
            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded font-mono text-neutral-800 font-bold cursor-not-allowed text-xs"
          />
        </div>
        <div>
          <label className="block text-neutral-500 font-medium mb-1">Derived Longitude</label>
          <input
            type="text"
            readOnly
            value={typeof longitude === "number" ? longitude.toFixed(6) : "Pin location to derive"}
            className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded font-mono text-neutral-800 font-bold cursor-not-allowed text-xs"
          />
        </div>
      </div>
    </div>
  );
};
