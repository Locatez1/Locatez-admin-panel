import React, { useEffect, useState, useCallback } from "react";
import {
  getAdminIdeas,
  createIdea,
  updateIdea,
  deleteIdea,
  uploadIdeaMedia,
} from "../api/ideas.api";
import { getCategories } from "../api/categories.api";
import { Idea, Category } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { CustomSelect } from "../components/common/CustomSelect";
import {
  Lightbulb,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Search,
  Loader2,
  MapPin,
  Filter,
  AlertTriangle,
  RefreshCw,
  Tag,
  X,
  RotateCcw,
} from "lucide-react";

export const Ideas: React.FC = () => {
  // Main Data States
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active Idea for Edit / Delete
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [deletingIdea, setDeletingIdea] = useState<Idea | null>(null);

  // Form Field States
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Form Operation Loading States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load Categories for Dropdowns & Filters (pass type=ideas to fetch idea categories)
  const fetchCategories = useCallback(async () => {
    try {
      const res = await getCategories({ type: "ideas" });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
      setCategories(list);
    } catch (err) {
      console.warn("Failed to fetch categories list for ideas", err);
    }
  }, []);

  // Load Ideas with current filters
  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminIdeas({
        categoryId: selectedCategoryFilter || undefined,
        search: debouncedSearchQuery.trim() || undefined,
      });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
      setIdeas(list);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load ideas");
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryFilter, debouncedSearchQuery]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Reset form fields
  const resetForm = () => {
    setTitle("");
    setContent("");
    setImageKey("");
    setImageUrl("");
    setPlaceName("");
    setCity("");
    setState("");
    setCategoryId("");
    setEditingIdea(null);
    setFormError(null);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    resetForm();
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setTitle(idea.title || "");
    setContent(idea.content || "");
    setImageKey(idea.imageKey || "");
    setImageUrl(idea.imageUrl || idea.imageKey || "");
    setPlaceName(idea.placeName || "");
    setCity(idea.city || "");
    setState(idea.state || "");
    setCategoryId(idea.categoryId || (typeof idea.category === "object" ? idea.category?.id || "" : ""));
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (idea: Idea) => {
    setDeletingIdea(idea);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Image Upload Handler: POST /api/v1/media/upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setFormError(null);
    try {
      const result = await uploadIdeaMedia(file);
      setImageKey(result.imageKey);
      setImageUrl(result.imageUrl || result.imageKey);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Validate form fields
  const validateForm = () => {
    if (!title.trim()) return "Title is required.";
    if (!content.trim()) return "Description / Content is required.";
    if (!imageKey.trim()) return "An image is required. Please upload an image file.";
    if (!placeName.trim()) return "Place Name is required.";
    if (!city.trim()) return "City is required.";
    if (!state.trim()) return "State is required.";
    if (!categoryId.trim()) return "Please select a Category.";
    return null;
  };

  // Handle Create Submission (POST /api/v1/admin/ideas)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valErr = validateForm();
    if (valErr) {
      setFormError(valErr);
      return;
    }

    setActionLoading(true);
    setFormError(null);
    try {
      await createIdea({
        title: title.trim(),
        content: content.trim(),
        imageKey: imageKey.trim(),
        placeName: placeName.trim(),
        city: city.trim(),
        state: state.trim(),
        categoryId: categoryId.trim(),
      });
      setIsCreateModalOpen(false);
      resetForm();
      fetchIdeas();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to create idea.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Edit Submission (PATCH /api/v1/admin/ideas/:id)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea) return;

    const valErr = validateForm();
    if (valErr) {
      setFormError(valErr);
      return;
    }

    setActionLoading(true);
    setFormError(null);
    try {
      // Build patch payload only with fields being changed or updated
      const payload: Record<string, string> = {};
      if (title.trim() !== editingIdea.title) payload.title = title.trim();
      if (content.trim() !== editingIdea.content) payload.content = content.trim();
      if (imageKey.trim() !== editingIdea.imageKey) payload.imageKey = imageKey.trim();
      if (placeName.trim() !== editingIdea.placeName) payload.placeName = placeName.trim();
      if (city.trim() !== editingIdea.city) payload.city = city.trim();
      if (state.trim() !== editingIdea.state) payload.state = state.trim();
      if (categoryId.trim() !== editingIdea.categoryId) payload.categoryId = categoryId.trim();

      // If no fields changed, simply close modal
      if (Object.keys(payload).length === 0) {
        setIsEditModalOpen(false);
        resetForm();
        return;
      }

      await updateIdea(editingIdea.id, payload);
      setIsEditModalOpen(false);
      resetForm();
      fetchIdeas();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to update idea.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Confirmation (DELETE /api/v1/admin/ideas/:id)
  const handleConfirmDelete = async () => {
    if (!deletingIdea) return;

    setActionLoading(true);
    setDeleteError(null);
    try {
      await deleteIdea(deletingIdea.id);
      setIsDeleteModalOpen(false);
      setDeletingIdea(null);
      fetchIdeas();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.message || "Failed to delete idea.");
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to format Category Name
  const getCategoryName = (idea: Idea) => {
    if (typeof idea.category === "object" && idea.category?.name) {
      return idea.category.name;
    }
    const matched = categories.find((c) => c.id === idea.categoryId);
    return matched ? matched.name : "Uncategorized";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary flex-shrink-0" /> Ideas Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Create, search, filter, edit, and manage video request idea suggestions.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="self-start sm:self-auto flex items-center gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Create Idea
        </Button>
      </div>

      {/* Filter & Search Card */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-primary-500" />
            <span>Filter & Search Ideas</span>
            {(searchQuery || selectedCategoryFilter) && (
              <span className="bg-primary-50 text-primary-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary-200">
                Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(searchQuery || selectedCategoryFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategoryFilter("");
                }}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-semibold transition cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={fetchIdeas}
              className="p-1.5 text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 rounded-lg transition cursor-pointer"
              title="Refresh Ideas"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary-500" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Query Input */}
          <div className="relative sm:col-span-7">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search ideas by title, place, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-8 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 bg-neutral-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div className="sm:col-span-5">
            <CustomSelect
              icon={<Tag className="h-4 w-4" />}
              value={selectedCategoryFilter}
              onChange={setSelectedCategoryFilter}
              placeholder="All Categories"
              options={[
                { label: "All Categories", value: "" },
                ...categories.map((cat) => ({ label: cat.name, value: cat.id })),
              ]}
            />
          </div>
        </div>

        {/* Category Pill Quick Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mr-1">Category:</span>
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                !selectedCategoryFilter
                  ? "bg-primary-500 text-white shadow-2xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200/60"
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const isActive = selectedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-primary-500 text-white shadow-2xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200/60"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Table / Content List */}
      {error ? (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : ideas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500 space-y-3">
          <Lightbulb className="h-12 w-12 mx-auto text-gray-300" />
          <p className="text-base font-semibold text-gray-900">No ideas found</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {selectedCategoryFilter || searchQuery
              ? "No ideas match your current search or category filter criteria. Try resetting filters."
              : "No ideas have been created yet. Click 'Create Idea' to add your first idea."}
          </p>
          {(selectedCategoryFilter || searchQuery) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedCategoryFilter("");
                setSearchQuery("");
              }}
              className="text-xs text-primary"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                  Idea / Details
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Place Name
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  City / State
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Category
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                  Created Date
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {ideas.map((idea) => {
                const displayImg = idea.imageUrl || idea.imageKey;
                return (
                  <tr key={idea.id} className="hover:bg-gray-50/60 transition">
                    {/* Image & Title */}
                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200 shadow-xs">
                          {displayImg ? (
                            <img
                              src={displayImg}
                              alt={idea.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=150&q=80";
                              }}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center bg-amber-50 text-amber-500">
                              <Lightbulb className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <p className="font-semibold text-gray-900 truncate" title={idea.title}>
                            {idea.title}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5" title={idea.content}>
                            {idea.content}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Place Name */}
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <span className="truncate max-w-[160px]" title={idea.placeName}>
                          {idea.placeName}
                        </span>
                      </div>
                    </td>

                    {/* City / State */}
                    <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-600 font-medium">
                      {idea.city}, {idea.state}
                    </td>

                    {/* Category */}
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <Badge variant="info" className="flex items-center gap-1 w-max">
                        <Tag className="h-3 w-3" />
                        {getCategoryName(idea)}
                      </Badge>
                    </td>

                    {/* Created Date */}
                    <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500">
                      {idea.createdAt
                        ? new Date(idea.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(idea)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </button>

                        <button
                          onClick={() => handleOpenDelete(idea)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Idea Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Idea">
        <form onSubmit={handleCreateSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {formError}
            </div>
          )}

          {/* Title */}
          <Input
            id="create-idea-title"
            type="text"
            label="Title"
            placeholder="e.g. Sunset live stream at Gateway of India"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={actionLoading}
          />

          {/* Category Dropdown */}
          <div>
            <label htmlFor="create-idea-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <CustomSelect
              icon={<Tag className="h-4 w-4" />}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select a category"
              disabled={actionLoading}
              options={categories.map((cat) => ({ label: cat.name, value: cat.id }))}
            />
          </div>

          {/* Content / Description */}
          <div>
            <label htmlFor="create-idea-content" className="block text-sm font-medium text-gray-700 mb-1">
              Description / Content
            </label>
            <textarea
              id="create-idea-content"
              rows={3}
              required
              className="block w-full rounded-md border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Describe the details for this video request idea..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          {/* Place Name */}
          <Input
            id="create-idea-placename"
            type="text"
            label="Place Name"
            placeholder="e.g. Gateway of India"
            required
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            disabled={actionLoading}
          />

          {/* City & State Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="create-idea-city"
              type="text"
              label="City"
              placeholder="e.g. Mumbai"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={actionLoading}
            />
            <Input
              id="create-idea-state"
              type="text"
              label="State"
              placeholder="e.g. Maharashtra"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Idea Image</label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition">
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-4 w-4 text-primary" />
                  )}
                  <span>{uploadingImage ? "Uploading..." : "Select & Upload Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploadingImage || actionLoading}
                  />
                </label>
                {imageKey && (
                  <span className="text-xs text-green-600 font-mono font-medium truncate max-w-[200px]">
                    ✓ Uploaded: {imageKey}
                  </span>
                )}
              </div>

              {imageUrl && (
                <div className="relative h-36 w-full rounded-lg overflow-hidden border bg-gray-50 shadow-xs">
                  <img src={imageUrl} alt="Idea Preview" className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    Image Preview
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading} disabled={uploadingImage || !imageKey}>
              Create Idea
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Idea Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Idea">
        <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {formError && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {formError}
            </div>
          )}

          {/* Title */}
          <Input
            id="edit-idea-title"
            type="text"
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={actionLoading}
          />

          {/* Category Dropdown */}
          <div>
            <label htmlFor="edit-idea-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <CustomSelect
              icon={<Tag className="h-4 w-4" />}
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Select a category"
              disabled={actionLoading}
              options={categories.map((cat) => ({ label: cat.name, value: cat.id }))}
            />
          </div>

          {/* Content / Description */}
          <div>
            <label htmlFor="edit-idea-content" className="block text-sm font-medium text-gray-700 mb-1">
              Description / Content
            </label>
            <textarea
              id="edit-idea-content"
              rows={3}
              required
              className="block w-full rounded-md border border-gray-300 p-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          {/* Place Name */}
          <Input
            id="edit-idea-placename"
            type="text"
            label="Place Name"
            required
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            disabled={actionLoading}
          />

          {/* City & State Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="edit-idea-city"
              type="text"
              label="City"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={actionLoading}
            />
            <Input
              id="edit-idea-state"
              type="text"
              label="State"
              required
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Idea Image</label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-md shadow-xs flex items-center gap-1.5 transition">
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-4 w-4 text-primary" />
                  )}
                  <span>{uploadingImage ? "Uploading..." : "Replace Image File"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploadingImage || actionLoading}
                  />
                </label>
                {imageKey && (
                  <span className="text-xs text-gray-500 font-mono font-medium truncate max-w-[200px]">
                    Key: {imageKey}
                  </span>
                )}
              </div>

              {imageUrl && (
                <div className="relative h-36 w-full rounded-lg overflow-hidden border bg-gray-50 shadow-xs">
                  <img src={imageUrl} alt="Idea Preview" className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    Image Preview
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading} disabled={uploadingImage || !imageKey}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Idea">
        <div className="space-y-4">
          {deleteError && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {deleteError}
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-red-50/60 rounded-lg border border-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-800">
              <p className="font-semibold text-red-900">Are you sure you want to delete this idea?</p>
              <p className="mt-1 text-xs text-gray-600">
                You are about to delete <span className="font-bold text-gray-900">"{deletingIdea?.title}"</span>.
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
