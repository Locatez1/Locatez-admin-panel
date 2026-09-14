import React, { useEffect, useState } from "react";
import { getPopularPlaces } from "../api/popularPlaces.api";
import { PopularPlace } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { Pagination } from "../components/common/Pagination";
import { CreateVideoRequestModal } from "../components/videoRequests/CreateVideoRequestModal";
import { Modal } from "../components/common/Modal";
import { Button } from "../components/common/Button";
import {
  MapPin,
  Video,
  Heart,
  UserCheck,
  Compass,
  Info,
  Search,
} from "lucide-react";

export const PopularPlacesFeed: React.FC = () => {
  const [places, setPlaces] = useState<PopularPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  // Favorites interactive local state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Place Details Modal
  const [selectedPlace, setSelectedPlace] = useState<PopularPlace | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Request Video Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestInitialData, setRequestInitialData] = useState<{
    title: string;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
  } | null>(null);

  const fetchPlaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await getPopularPlaces(params);
      const rawData = res.data;
      const resMeta = (res as any).meta;

      let rawList: PopularPlace[] = [];
      let serverTotal: number | undefined;
      let serverTotalPages: number | undefined;

      if (Array.isArray(rawData)) {
        rawList = rawData;
      } else if (rawData && Array.isArray((rawData as any).items)) {
        rawList = (rawData as any).items;
        serverTotal = (rawData as any).pagination?.total || (rawData as any).pagination?.totalItems;
        serverTotalPages = (rawData as any).pagination?.totalPages;
      }

      if (resMeta?.total !== undefined) {
        serverTotal = resMeta.total;
      }
      if (resMeta?.totalPages !== undefined) {
        serverTotalPages = resMeta.totalPages;
      }

      let filteredList = rawList;
      if (debouncedSearch.trim() && serverTotal === undefined) {
        const q = debouncedSearch.trim().toLowerCase();
        filteredList = rawList.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.location?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
      }

      if (serverTotal !== undefined && serverTotalPages !== undefined) {
        setPlaces(filteredList);
        setTotal(serverTotal);
        setTotalPages(serverTotalPages || 1);
      } else {
        const calcTotal = filteredList.length;
        const calcTotalPages = Math.ceil(calcTotal / limit) || 1;
        const paginatedList = filteredList.slice((page - 1) * limit, page * limit);

        setPlaces(paginatedList);
        setTotal(calcTotal);
        setTotalPages(calcTotalPages);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load popular places");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, [page, limit, debouncedSearch]);

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenRequestVideo = (place: PopularPlace, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRequestInitialData({
      title: `Live check at ${place.name}`,
      description: place.description || `Requesting live video verification at ${place.name}, ${place.location}`,
      address: place.location,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setIsDetailsModalOpen(false);
    setIsRequestModalOpen(true);
  };

  const handleOpenDetails = (place: PopularPlace) => {
    setSelectedPlace(place);
    setIsDetailsModalOpen(true);
  };

  const fallbackImage = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Compass className="h-7 w-7 text-indigo-600" /> Popular Places
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Explore active trending locations and request real-time live video coverage from creators.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-lg border-0 py-2 pl-9 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
            placeholder="Search places..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Content Area */}
      {error ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm animate-pulse space-y-4">
              <div className="h-48 bg-gray-200 w-full"></div>
              <div className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-10 bg-gray-200 rounded w-full mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : places.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
          <Compass className="h-12 w-12 mx-auto text-gray-300" />
          <p className="text-lg font-medium text-gray-900">No popular places available</p>
          <p className="text-xs text-gray-400">
            {search ? "No locations match your search query." : "Check back later for active featured locations."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.map((place) => {
              const isFav = favorites.has(place.id);
              return (
                <div
                  key={place.id}
                  onClick={() => handleOpenDetails(place)}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  {/* Image Container */}
                  <div className="relative h-52 w-full overflow-hidden bg-gray-100">
                    <img
                      src={place.image || fallbackImage}
                      alt={place.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = fallbackImage;
                      }}
                      className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

                    {/* Creator Availability Badge */}
                    <div className="absolute top-3 left-3 bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Creators Available</span>
                    </div>

                    {/* Favorite Heart Button */}
                    <button
                      onClick={(e) => toggleFavorite(place.id, e)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-md transition text-gray-700 hover:text-red-500 shadow-sm"
                    >
                      <Heart className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                    </button>

                    {/* Place Name Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <h3 className="text-lg font-bold drop-shadow-sm leading-snug">{place.name}</h3>
                      <p className="text-xs text-slate-200 flex items-center gap-1 mt-0.5 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                        <span className="truncate">{place.location}</span>
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {place.description || "Popular location for live video request coverage."}
                    </p>

                    <div className="pt-2 flex items-center justify-between border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(place);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                      >
                        <Info className="h-3.5 w-3.5" /> Details
                      </button>

                      <Button
                        size="sm"
                        onClick={(e) => handleOpenRequestVideo(place, e)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                      >
                        <Video className="h-3.5 w-3.5" /> Request Video
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
            <Pagination
              page={page}
              limit={limit}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Place Details Modal */}
      {selectedPlace && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={selectedPlace.name}
        >
          <div className="space-y-4">
            <div className="h-56 w-full rounded-xl overflow-hidden bg-gray-100">
              <img
                src={selectedPlace.image || fallbackImage}
                alt={selectedPlace.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImage;
                }}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <MapPin className="h-4 w-4 text-red-500" />
                <span>{selectedPlace.location}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                <span>Lat: {selectedPlace.latitude}</span>
                <span>•</span>
                <span>Lng: {selectedPlace.longitude}</span>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed pt-2 border-t">
                {selectedPlace.description || "No detailed description provided for this popular place."}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="ghost" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={(e) => handleOpenRequestVideo(selectedPlace, e)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
              >
                <Video className="h-4 w-4" /> Request Video Here
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reusable Create Video Request Modal prefilled with Popular Place details */}
      <CreateVideoRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        initialData={requestInitialData}
        onSuccess={() => {
          alert("Video request submitted successfully!");
        }}
      />
    </div>
  );
};
