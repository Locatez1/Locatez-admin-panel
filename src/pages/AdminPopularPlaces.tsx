import React, { useEffect, useState } from "react";
import {
  getAdminPopularPlaces,
  createPopularPlace,
  updatePopularPlace,
  updatePopularPlaceStatus,
  deletePopularPlace,
  uploadMedia,
} from "../api/popularPlaces.api";
import { PopularPlace } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { Pagination } from "../components/common/Pagination";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { MapboxLocationPicker } from "../components/common/MapboxLocationPicker";
import {
  Compass,
  Plus,
  Edit2,
  Power,
  Trash2,
  Upload,
  MapPin,
  Loader2,
  AlertTriangle,
  Search,
} from "lucide-react";

export const AdminPopularPlaces: React.FC = () => {
  const [places, setPlaces] = useState<PopularPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Search State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<PopularPlace | null>(null);
  const [deletingPlace, setDeletingPlace] = useState<PopularPlace | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [imageUrl, setImageUrl] = useState("");

  // Media Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPlaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await getAdminPopularPlaces(params);
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

      // If search filter is active and backend doesn't filter, filter client-side
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
        // Fallback client-side pagination
        const calcTotal = filteredList.length;
        const calcTotalPages = Math.ceil(calcTotal / limit) || 1;
        const paginatedList = filteredList.slice((page - 1) * limit, page * limit);

        setPlaces(paginatedList);
        setTotal(calcTotal);
        setTotalPages(calcTotalPages);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load admin popular places");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, [page, limit, debouncedSearch]);

  const resetForm = () => {
    setName("");
    setLocation("");
    setDescription("");
    setLatitude("");
    setLongitude("");
    setImageUrl("");
    setEditingPlace(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (place: PopularPlace) => {
    setEditingPlace(place);
    setName(place.name || "");
    setLocation(place.location || "");
    setDescription(place.description || "");
    setLatitude(typeof place.latitude === "number" ? place.latitude : "");
    setLongitude(typeof place.longitude === "number" ? place.longitude : "");
    setImageUrl(place.image || "");
    setIsEditModalOpen(true);
  };

  const handleLocationCoordinatesChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleMapboxIdChange = (_id: string | null) => {};

  const renderImagePicker = (inputId: string) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Place Image</label>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition">
            {uploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Upload className="h-4 w-4 text-primary" />
            )}
            <span>Upload Image File</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadingImage || actionLoading}
            />
          </label>
          <span className="text-xs text-gray-400">or paste URL below</span>
        </div>

        <Input
          id={inputId}
          type="text"
          placeholder="https://…"
          required
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={actionLoading}
        />

        {imageUrl && (
          <div className="relative h-32 w-full rounded-lg overflow-hidden border bg-gray-50">
            <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
            <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
              Image Preview
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // Image Upload Handler using POST /api/v1/media/upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      console.log("[Media Upload] Uploading image file:", file.name);
      const url = await uploadMedia(file);
      console.log("[Media Upload] Received uploaded image URL:", url);
      setImageUrl(url);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to upload image file.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Coordinates & Form Validation
  const validateForm = () => {
    if (!name.trim()) return "Place name is required.";
    if (!location.trim()) return "Location address is required.";
    if (!description.trim()) return "Description is required.";
    if (typeof latitude !== "number" || isNaN(latitude) || latitude < -90 || latitude > 90) {
      return "Please select a location on the map to set a valid latitude (-90 to 90).";
    }
    if (typeof longitude !== "number" || isNaN(longitude) || longitude < -180 || longitude > 180) {
      return "Please select a location on the map to set a valid longitude (-180 to 180).";
    }
    if (!imageUrl.trim()) return "Image is required (upload file or paste URL).";
    return null;
  };

  // Create Submit Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valErr = validateForm();
    if (valErr) {
      alert(valErr);
      return;
    }

    setActionLoading(true);
    try {
      await createPopularPlace({
        name: name.trim(),
        location: location.trim(),
        description: description.trim(),
        latitude: latitude as number,
        longitude: longitude as number,
        image: imageUrl.trim(),
      });
      setIsCreateModalOpen(false);
      resetForm();
      fetchPlaces();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to create popular place.");
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Submit Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlace) return;

    const valErr = validateForm();
    if (valErr) {
      alert(valErr);
      return;
    }

    setActionLoading(true);
    try {
      await updatePopularPlace(editingPlace.id, {
        name: name.trim(),
        location: location.trim(),
        description: description.trim(),
        latitude: latitude as number,
        longitude: longitude as number,
        image: imageUrl.trim(),
      });
      setIsEditModalOpen(false);
      resetForm();
      fetchPlaces();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to update popular place.");
    } finally {
      setActionLoading(false);
    }
  };

  // Enable / Disable Status Handler (PATCH /api/v1/admin/popular-places/:id/status)
  const handleToggleStatus = async (place: PopularPlace) => {
    const targetStatus = !place.isActive;
    const actionText = targetStatus ? "enable" : "disable";

    try {
      await updatePopularPlaceStatus(place.id, targetStatus);
      fetchPlaces();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || `Failed to ${actionText} popular place.`);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (place: PopularPlace) => {
    setDeletingPlace(place);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Handler (DELETE /api/v1/admin/popular-places/:id)
  const handleConfirmDelete = async () => {
    if (!deletingPlace) return;
    setActionLoading(true);
    setDeleteError(null);
    try {
      await deletePopularPlace(deletingPlace.id);
      setIsDeleteModalOpen(false);
      setDeletingPlace(null);
      fetchPlaces();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.message || "Failed to delete popular place.");
    } finally {
      setActionLoading(false);
    }
  };

  const isCoordinatesValid =
    typeof latitude === "number" &&
    !isNaN(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    !isNaN(longitude) &&
    longitude >= -180 &&
    longitude <= 180;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary flex-shrink-0" /> Popular Places Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Create, edit, and toggle active status of featured popular locations with Mapbox location selection.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="self-start sm:self-auto flex items-center gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add Popular Place
        </Button>
      </div>

      {/* Search Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            placeholder="Search popular places..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Main Content Table */}
      {error ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">{error}</div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : places.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 space-y-3">
          <Compass className="h-10 w-10 mx-auto text-gray-400" />
          <p className="text-base font-medium text-gray-900">No popular places found</p>
          <p className="text-xs">
            {search ? "Try adjusting your search query." : "Click \"Add Popular Place\" above to create the first featured location."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Place Name
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Location Address
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Map Coordinates
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {places.map((place) => (
                <tr key={place.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                        <img
                          src={place.image}
                          alt={place.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=100&q=80";
                          }}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{place.name}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{place.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      <span className="truncate max-w-xs">{place.location}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500 font-mono">
                    {typeof place.latitude === "number" ? place.latitude.toFixed(4) : place.latitude},{" "}
                    {typeof place.longitude === "number" ? place.longitude.toFixed(4) : place.longitude}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {place.isActive ? (
                      <Badge variant="success">ACTIVE</Badge>
                    ) : (
                      <Badge variant="default" className="bg-gray-100 text-gray-600">INACTIVE</Badge>
                    )}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(place)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>

                      <button
                        onClick={() => handleToggleStatus(place)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition ${
                          place.isActive
                            ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                            : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        <Power className="h-3.5 w-3.5" /> {place.isActive ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => handleOpenDelete(place)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Add Popular Place">
        <form onSubmit={handleCreateSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Independent Place Name Field */}
          <Input
            id="create-name"
            type="text"
            label="Popular Place Name"
            placeholder="e.g. Rajwada Palace, Marine Drive"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={actionLoading}
          />

          {/* Mapbox Location Selector (derive address & lat/lng, keeping name independent) */}
          <MapboxLocationPicker
            location={location}
            onLocationChange={setLocation}
            latitude={latitude}
            longitude={longitude}
            onCoordinatesChange={handleLocationCoordinatesChange}
            onMapboxIdChange={handleMapboxIdChange}
          />

          <div>
            <label htmlFor="create-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="create-desc"
              rows={3}
              required
              className="block w-full rounded-md border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Describe what makes this place popular for live video requests..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          {renderImagePicker("create-image-url")}

          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading} disabled={uploadingImage || !isCoordinatesValid}>
              Create Popular Place
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Popular Place">
        <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Independent Place Name Field */}
          <Input
            id="edit-name"
            type="text"
            label="Popular Place Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={actionLoading}
          />

          {/* Mapbox Location Selector (preloads coordinates, updates address & lat/lng) */}
          <MapboxLocationPicker
            location={location}
            onLocationChange={setLocation}
            latitude={latitude}
            longitude={longitude}
            onCoordinatesChange={handleLocationCoordinatesChange}
            onMapboxIdChange={handleMapboxIdChange}
          />

          <div>
            <label htmlFor="edit-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="edit-desc"
              rows={3}
              required
              className="block w-full rounded-md border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          {renderImagePicker("edit-image-url")}

          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading} disabled={uploadingImage || !isCoordinatesValid}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Popular Place">
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {deleteError}
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-red-50/60 rounded-lg border border-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-800">
              <p className="font-semibold text-red-900">Are you sure you want to delete this popular place?</p>
              <p className="mt-1 text-xs text-gray-600">
                You are about to delete <span className="font-bold text-gray-900">"{deletingPlace?.name}"</span>.
                This action is permanent and cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              isLoading={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
