import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Search, MapPin, Loader2, Navigation, AlertTriangle, Crosshair, Layers } from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapboxSearchResult {
  id: string;
  mapbox_id?: string;
  place_name: string;
  text: string;
  center: [number, number]; // [longitude, latitude]
}

interface MapboxLocationPickerProps {
  location: string;
  onLocationChange: (newLocation: string) => void;
  latitude: number | "";
  longitude: number | "";
  onCoordinatesChange: (lat: number, lng: number) => void;
  /** Optional: Search Box retrieve mapbox_id for Places Details photos. */
  onMapboxIdChange?: (mapboxId: string | null) => void;
}

const MAP_STYLES = {
  streets: "mapbox://styles/mapbox/streets-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
};

export const MapboxLocationPicker: React.FC<MapboxLocationPickerProps> = ({
  location,
  onLocationChange,
  latitude,
  longitude,
  onCoordinatesChange,
  onMapboxIdChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const sessionTokenRef = useRef<string>("");

  // Map Style & Geolocation State
  const [mapStyle, setMapStyle] = useState<"streets" | "satellite" | "outdoors">("streets");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [searchResults, setSearchResults] = useState<MapboxSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Generate UUIDv4 for Session Token
  useEffect(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      sessionTokenRef.current = crypto.randomUUID();
    } else {
      sessionTokenRef.current = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  }, []);

  // Default fallback center (e.g. Mumbai [lng, lat])
  const defaultLng = typeof longitude === "number" && !isNaN(longitude) ? longitude : 72.8236;
  const defaultLat = typeof latitude === "number" && !isNaN(latitude) ? latitude : 18.9432;

  // Handle Map Style Switch
  const handleStyleChange = (styleKey: "streets" | "satellite" | "outdoors") => {
    setMapStyle(styleKey);
    if (mapRef.current) {
      mapRef.current.setStyle(MAP_STYLES[styleKey]);
    }
  };

  // Perform Mapbox Reverse Geocoding for a given [lng, lat]
  const reverseGeocode = async (lng: number, lat: number) => {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      if (res.status === 401) {
        setTokenError(true);
        return;
      }
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        onLocationChange(data.features[0].place_name);
      }
    } catch (err) {
      console.warn("[Mapbox] Reverse geocoding failed:", err);
    }
  };

  // Handle Geolocation Request for User's Current GPS Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onCoordinatesChange(lat, lng);

        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        }
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [lng, lat], zoom: 14 });
        }

        reverseGeocode(lng, lat);
        setIsLocating(false);
      },
      (err) => {
        console.warn("[Geolocation] Error getting position:", err);
        alert("Unable to retrieve your position. Please grant location permissions in your browser.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[mapStyle],
        center: [defaultLng, defaultLat],
        zoom: typeof latitude === "number" ? 14 : 11,
      });

      map.on("load", () => {
        map.resize();
      });

      map.on("error", (e) => {
        if (e.error && (e.error as any).status === 401) {
          setTokenError(true);
        }
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      // Create Draggable Mapbox Marker
      const marker = new mapboxgl.Marker({
        draggable: true,
        color: "#25A59E", // Figma Primary Teal
      })
        .setLngLat([defaultLng, defaultLat])
        .addTo(map);

      // Handle Marker Drag End
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        onCoordinatesChange(lngLat.lat, lngLat.lng);
        reverseGeocode(lngLat.lng, lngLat.lat);
      });

      // Handle Map Click
      map.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        marker.setLngLat([lng, lat]);
        onCoordinatesChange(lat, lng);
        reverseGeocode(lng, lat);
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Trigger map resize shortly after mount for modal visibility
      const resizeTimer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      }, 150);

      // ResizeObserver to handle dynamic modal container sizing
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        clearTimeout(resizeTimer);
        resizeObserver.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        }
      };
    }
  }, []);

  // Update Marker & Map Center when coordinates change externally
  useEffect(() => {
    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      !isNaN(latitude) &&
      !isNaN(longitude)
    ) {
      if (markerRef.current) {
        markerRef.current.setLngLat([longitude, latitude]);
      }
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 14 });
      }
    }
  }, [latitude, longitude]);

  // Dynamic Mapbox Search using Mapbox Searchbox API (search/searchbox/v1/suggest) & v6 Forward API
  useEffect(() => {
    const rawQuery = debouncedSearchQuery.trim();
    if (!rawQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const cleanQuery = rawQuery.replace(/\bdehli\b/gi, "delhi");

    let isMounted = true;
    const runSearch = async () => {
      setIsSearching(true);
      try {
        // Fetch from Mapbox Searchbox API v1/suggest & Mapbox v6 Forward Geocoding
        const [suggestRes, v6Res] = await Promise.allSettled([
          fetch(
            `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
              cleanQuery
            )}&access_token=${MAPBOX_TOKEN}&session_token=${sessionTokenRef.current}&language=en&limit=10`
          ),
          fetch(
            `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
              cleanQuery
            )}&access_token=${MAPBOX_TOKEN}&limit=10`
          ),
        ]);

        if (!isMounted) return;

        const results: MapboxSearchResult[] = [];
        const seen = new Set<string>();

        // 1. Process Mapbox Searchbox API v1/suggest Results
        if (suggestRes.status === "fulfilled" && suggestRes.value.ok) {
          const suggData = await suggestRes.value.json();
          if (Array.isArray(suggData.suggestions)) {
            for (const s of suggData.suggestions) {
              const name = s.name || "";
              const fullAddr = s.full_address || (s.place_formatted ? `${name}, ${s.place_formatted}` : name);
              if (name) {
                const key = fullAddr.toLowerCase();
                if (!seen.has(key)) {
                  seen.add(key);
                  results.push({
                    id: s.mapbox_id || Math.random().toString(),
                    mapbox_id: s.mapbox_id,
                    text: name,
                    place_name: fullAddr,
                    center: [0, 0], // Derived via v1/retrieve on click if needed
                  });
                }
              }
            }
          }
        } else if (suggestRes.status === "fulfilled" && suggestRes.value.status === 401) {
          setTokenError(true);
        }

        // 2. Process Mapbox v6 Forward Results (Provides instant coordinates)
        if (v6Res.status === "fulfilled" && v6Res.value.ok) {
          const v6Data = await v6Res.value.json();
          if (Array.isArray(v6Data.features)) {
            for (const f of v6Data.features) {
              const name = f.properties?.name || f.properties?.name_preferred || f.text || "";
              const fullAddr = f.properties?.full_address || f.properties?.place_formatted || f.place_name || name;
              const coords = f.geometry?.coordinates; // [lng, lat]

              if (name && coords && Array.isArray(coords) && coords.length === 2) {
                const key = fullAddr.toLowerCase();
                const existing = results.find(
                  (r) => r.place_name.toLowerCase() === key || r.text.toLowerCase() === name.toLowerCase()
                );
                if (existing) {
                  existing.center = [coords[0], coords[1]];
                } else if (!seen.has(key)) {
                  seen.add(key);
                  results.push({
                    id: f.id || Math.random().toString(),
                    mapbox_id: f.properties?.mapbox_id,
                    text: name,
                    place_name: fullAddr,
                    center: [coords[0], coords[1]],
                  });
                }
              }
            }
          }
        } else if (v6Res.status === "fulfilled" && v6Res.value.status === 401) {
          setTokenError(true);
        }

        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error("[Mapbox] Searchbox suggest error:", err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };

    runSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearchQuery]);

  // Handle Search Result Selection
  const handleSelectResult = async (result: MapboxSearchResult) => {
    let [lng, lat] = result.center;
    let placeName = result.place_name;

    // If result came from Searchbox suggest without pre-loaded coordinates, call v1/retrieve
    if (result.mapbox_id && lng === 0 && lat === 0) {
      try {
        const retRes = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/retrieve/${result.mapbox_id}?access_token=${MAPBOX_TOKEN}&session_token=${sessionTokenRef.current}`
        );
        if (retRes.ok) {
          const retData = await retRes.json();
          const feat = retData.features?.[0];
          if (feat && feat.geometry?.coordinates) {
            [lng, lat] = feat.geometry.coordinates;
            placeName = feat.properties?.full_address || feat.properties?.name || placeName;
          }
        }
      } catch (e) {
        console.warn("[Mapbox Searchbox] Retrieve error:", e);
      }
    }

    if (lng !== 0 || lat !== 0) {
      onLocationChange(placeName);
      onCoordinatesChange(lat, lng);
      onMapboxIdChange?.(result.mapbox_id || null);

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat]);
      }
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });
      }
    }

    setSearchQuery("");
    setShowDropdown(false);
  };

  return (
    <div className="space-y-3">
      {tokenError && (
        <div className="bg-red-50 border border-red-300 text-red-900 p-3 rounded-md text-xs flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Mapbox Access Token Issue Detected</p>
            <p className="text-red-800 mt-0.5">
              Mapbox returned <code className="font-mono bg-red-100 px-1 py-0.5 rounded">401 Unauthorized</code> for the current token. Please set a valid Mapbox public token starting with <code className="font-mono bg-red-100 px-1 py-0.5 rounded">pk.</code> in <code className="font-mono font-bold">.env</code> (<code className="font-mono bg-red-100 px-1 py-0.5 rounded">VITE_MAPBOX_ACCESS_TOKEN</code>) and restart the dev server.
            </p>
          </div>
        </div>
      )}

      {/* 1. Single Location Search Input + Geolocation Button */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="mapbox-single-search" className="block text-sm font-medium text-neutral-700">
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
            id="mapbox-single-search"
            type="text"
            placeholder="Search any place, monument, address (e.g. Jantar Mantar, Qutub Minar, Marine Drive...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
            className="w-full pl-9 pr-8 py-2 border border-neutral-300 rounded-md text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          {isSearching && (
            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-primary-600" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-56 overflow-y-auto divide-y divide-neutral-100">
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
          </div>
        )}
      </div>

      {/* 2. Interactive Mapbox Container & Style Selector */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span className="flex items-center gap-1 font-medium text-neutral-700">
            <Navigation className="h-3.5 w-3.5 text-primary-500" /> Interactive Map Pin Selector
          </span>

          {/* Map Layer Switcher (Streets, Satellite Hybrid, Outdoors) */}
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-md border border-neutral-200">
            <span className="text-[10px] text-neutral-400 font-semibold px-1 flex items-center gap-0.5">
              <Layers className="h-3 w-3" /> Layer:
            </span>
            <button
              type="button"
              onClick={() => handleStyleChange("streets")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                mapStyle === "streets" ? "bg-white text-primary-900 font-bold shadow-xs" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Streets
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange("satellite")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                mapStyle === "satellite" ? "bg-white text-primary-900 font-bold shadow-xs" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Satellite Hybrid
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange("outdoors")}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                mapStyle === "outdoors" ? "bg-white text-primary-900 font-bold shadow-xs" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Outdoors
            </button>
          </div>
        </div>
        <div
          ref={mapContainerRef}
          className="h-64 sm:h-72 w-full min-h-[250px] rounded-lg border border-neutral-300 shadow-inner overflow-hidden relative"
        />
      </div>

      {/* 3. Address / Location Input Field */}
      <div>
        <label htmlFor="mapbox-location-address" className="block text-sm font-medium text-neutral-700 mb-1">
          Location Address
        </label>
        <div className="relative">
          <input
            id="mapbox-location-address"
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
