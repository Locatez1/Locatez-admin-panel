import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  updateCategoryFeatured,
  deleteCategory,
  getCategorySuggestions,
  acceptCategorySuggestion,
  rejectCategorySuggestion,
} from "../api/categories.api";
import { Category, CategorySuggestion } from "../types";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { Switch } from "../components/common/Switch";
import {
  Plus,
  Edit2,
  Power,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Tag,
  ShieldCheck,
  RefreshCw,
  Clock,
  Flame,
  AlertTriangle,
} from "lucide-react";

export const Categories: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"categories" | "suggestions">("categories");

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Modals for Categories
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Suggestions State
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Fetch Categories
  const fetchCategories = async (showLoading = true) => {
    if (showLoading) setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const res = await getAdminCategories();
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
      setCategories(list);
    } catch (err: any) {
      setCategoriesError(err.response?.data?.message || err.message || "Failed to load categories");
    } finally {
      if (showLoading) setCategoriesLoading(false);
    }
  };

  // Fetch Suggestions
  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const res = await getCategorySuggestions();
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
      setSuggestions(list);
    } catch (err: any) {
      setSuggestionsError(err.response?.data?.message || err.message || "Failed to load suggestions");
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSuggestions();
  }, []);

  // 1. Create Category Handler (POST /api/v1/categories)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setActionLoading(true);
    try {
      await createCategory({ name: newCategoryName.trim() });
      toast.success("Category created successfully!", "Category Created");
      setNewCategoryName("");
      setIsCreateModalOpen(false);
      fetchCategories(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to create category", "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Edit Category Name Handler (PATCH /api/v1/categories/:id)
  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;
    if (isProtectedCategory(editingCategory)) {
      toast.warning("The 'Other' category is system protected and cannot be renamed.", "Protected Category");
      return;
    }
    setActionLoading(true);
    try {
      await updateCategory(editingCategory.id, { name: editCategoryName.trim() });
      toast.success("Category updated successfully!", "Category Updated");
      setEditingCategory(null);
      setEditCategoryName("");
      setIsEditModalOpen(false);
      fetchCategories(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update category name", "Error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Toggle Category Status Handler (PATCH /api/v1/categories/:id/status)
  const handleToggleStatus = async (cat: Category) => {
    if (isProtectedCategory(cat)) {
      toast.warning("The 'Other' category is system protected and cannot be disabled.", "Protected Category");
      return;
    }
    const targetStatus = !cat.isActive;
    const actionText = targetStatus ? "enable" : "disable";

    // Optimistically update local state in-place so table stays intact with zero flicker
    setCategories((prev) =>
      prev.map((c) =>
        c.id === cat.id
          ? {
              ...c,
              isActive: targetStatus,
              isFeatured: !targetStatus ? false : c.isFeatured,
            }
          : c
      )
    );

    try {
      // If disabling an active category that is currently featured, un-feature it first
      if (!targetStatus && cat.isFeatured) {
        try {
          await updateCategoryFeatured(cat.id, false);
        } catch (featErr) {
          console.warn("Could not auto-unfeature category on disable:", featErr);
        }
      }
      await updateCategoryStatus(cat.id, targetStatus);
      toast.success(`Category ${targetStatus ? "enabled" : "disabled"} successfully.`, "Status Updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || `Failed to ${actionText} category`, "Error");
      // Revert optimistic state on error
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: cat.isActive, isFeatured: cat.isFeatured } : c))
      );
    }
  };

  // Toggle featured for idea/filter chips (PATCH /api/v1/categories/:id/featured)
  const handleToggleFeatured = async (cat: Category, isFeatured: boolean) => {
    if (!cat.isActive && isFeatured) {
      toast.warning("Inactive categories cannot be featured in idea filters. Please enable the category first.", "Cannot Feature");
      return;
    }
    try {
      await updateCategoryFeatured(cat.id, isFeatured);
      toast.success(`Category ${isFeatured ? "featured" : "unfeatured"} successfully.`, "Featured Updated");
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isFeatured } : c))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update featured flag", "Error");
      fetchCategories();
    }
  };

  // 4. Hard Delete Category Handler (DELETE /api/v1/categories/:id)
  const handleConfirmDelete = async () => {
    if (!deletingCategory || isProtectedCategory(deletingCategory)) return;
    setActionLoading(true);
    setDeleteError(null);
    try {
      await deleteCategory(deletingCategory.id);
      toast.success("Category deleted successfully!", "Category Deleted");
      setIsDeleteModalOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.message || "";
      if (
        serverMsg.toLowerCase().includes("foreign key") ||
        serverMsg.toLowerCase().includes("reference") ||
        serverMsg.toLowerCase().includes("constraint") ||
        serverMsg.toLowerCase().includes("in use") ||
        serverMsg.toLowerCase().includes("videorequest")
      ) {
        setDeleteError(
          `Cannot delete "${deletingCategory.name}": It is referenced by existing Video Requests. Foreign key constraints prevent physical deletion. Consider disabling the category instead.`
        );
      } else {
        setDeleteError(serverMsg || "Failed to delete category");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Accept AI Suggestion Handler
  const handleAcceptSuggestion = async (sug: CategorySuggestion) => {
    if (!window.confirm(`Accept AI suggestion "${sug.name}"?`)) return;
    try {
      await acceptCategorySuggestion(sug.id);
      toast.success(`Accepted suggestion "${sug.name}"`, "Suggestion Accepted");
      fetchSuggestions();
      if (activeTab === "categories") fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to accept suggestion", "Error");
    }
  };

  // Reject AI Suggestion Handler
  const handleRejectSuggestion = async (sug: CategorySuggestion) => {
    if (!window.confirm(`Reject AI suggestion "${sug.name}"?`)) return;
    try {
      await rejectCategorySuggestion(sug.id);
      toast.success(`Rejected suggestion "${sug.name}"`, "Suggestion Rejected");
      fetchSuggestions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to reject suggestion", "Error");
    }
  };

  // Protection check for "Other" category
  const isProtectedCategory = (cat: Category) => {
    return cat.slug?.toLowerCase() === "other" || cat.name?.toLowerCase() === "other";
  };

  const getSuggestionStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
        return <Badge variant="success">ACCEPTED</Badge>;
      case "REJECTED":
        return <Badge variant="danger">REJECTED</Badge>;
      case "PENDING":
      default:
        return <Badge variant="warning">PENDING</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary flex-shrink-0" /> Category Management
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Manage system request categories and review AI category suggestions.
          </p>
        </div>
        {activeTab === "categories" && (
          <Button onClick={() => setIsCreateModalOpen(true)} className="self-start sm:self-auto flex items-center gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Create Category
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white p-1.5 sm:p-2 rounded-xl border border-neutral-200 shadow-2xs inline-flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
            activeTab === "categories"
              ? "bg-primary-500 text-white shadow-2xs"
              : "bg-transparent text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Tag className="h-4 w-4" /> Active & Admin Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab("suggestions")}
          className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer ${
            activeTab === "suggestions"
              ? "bg-primary-500 text-white shadow-2xs"
              : "bg-transparent text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Sparkles className={`h-4 w-4 ${activeTab === "suggestions" ? "text-white" : "text-purple-600"}`} /> AI Suggestions ({suggestions.length})
        </button>
      </div>

      {/* TAB 1: Categories Management */}
      {activeTab === "categories" && (
        <div>
          {categoriesError ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{categoriesError}</div>
          ) : categoriesLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 space-y-3">
              <Tag className="h-10 w-10 mx-auto text-gray-400" />
              <p className="text-base font-medium text-gray-900">No categories found</p>
              <p className="text-xs">Click "Create Category" above to add the first category.</p>
            </div>
          ) : (
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Slug
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="h-3.5 w-3.5 text-amber-500" /> Idea filters
                      </span>
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Video requests
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Marketplace
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Ideas
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Created At
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {categories.map((cat) => {
                    const protectedItem = isProtectedCategory(cat);
                    return (
                      <tr key={cat.id} className={protectedItem ? "bg-amber-50/30" : ""}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          <div className="flex items-center gap-2">
                            <span>{cat.name}</span>
                            {protectedItem && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                <ShieldCheck className="h-3 w-3 text-amber-600" /> Protected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono text-xs">
                          {cat.slug || "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {cat.isActive ? (
                            <Badge variant="success">ACTIVE</Badge>
                          ) : (
                            <Badge variant="inactive">INACTIVE</Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`category-featured-${cat.id}`}
                              checked={Boolean(cat.isFeatured && cat.isActive)}
                              onChange={(val) => handleToggleFeatured(cat, val)}
                              disabled={!cat.isActive}
                              label={!cat.isActive ? `Cannot feature inactive category ${cat.name}` : `Show ${cat.name} in idea filters`}
                            />
                            {!cat.isActive && (
                              <span className="text-[10px] text-gray-400 italic">
                                (Enable category to feature)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                          <Link
                            to={`/video-requests?search=${encodeURIComponent(cat.name)}`}
                            className="text-primary-600 hover:text-primary-800 hover:underline font-semibold"
                            title={`Filter video requests for category ${cat.name}`}
                          >
                            {cat.videoRequestCount ?? 0}
                          </Link>
                          <span className="ml-1 text-xs font-normal text-gray-500">uses</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                          <Link
                            to="/marketplace"
                            className="text-primary-600 hover:text-primary-800 hover:underline font-semibold"
                            title="View Marketplace listings"
                          >
                            {cat.marketplaceStreamCount ?? 0}
                          </Link>
                          <span className="ml-1 text-xs font-normal text-gray-500">listings</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">
                          <Link
                            to="/ideas"
                            className="text-primary-600 hover:text-primary-800 hover:underline font-semibold"
                            title="View Ideas"
                          >
                            {cat.ideaCount ?? 0}
                          </Link>
                          <span className="ml-1 text-xs font-normal text-gray-500">ideas</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          {protectedItem ? (
                            <span className="text-xs text-gray-400 italic font-medium">System Protected</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {/* Edit Name Button (PATCH /api/v1/categories/:id) */}
                              <button
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setEditCategoryName(cat.name);
                                  setIsEditModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition"
                              >
                                <Edit2 className="h-3.5 w-3.5" /> Edit
                              </button>

                              {/* Toggle Status Button (PATCH /api/v1/categories/:id/status) */}
                              <button
                                onClick={() => handleToggleStatus(cat)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition ${
                                  cat.isActive
                                    ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                                    : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                                }`}
                              >
                                <Power className="h-3.5 w-3.5" /> {cat.isActive ? "Disable" : "Enable"}
                              </button>

                              {/* Hard Delete Button (DELETE /api/v1/categories/:id) */}
                              <button
                                onClick={() => {
                                  setDeletingCategory(cat);
                                  setDeleteError(null);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI Category Suggestions */}
      {activeTab === "suggestions" && (
        <div>
          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3 text-xs text-purple-900">
            <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-purple-950">AI Category Suggestions Moderation</p>
              <p className="mt-1">
                These suggested categories are automatically identified by AI from unmapped user video requests.
                Admin action is required to explicitly accept or reject suggestions before a category is created.
              </p>
            </div>
          </div>

          {suggestionsError ? (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{suggestionsError}</div>
          ) : suggestionsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 space-y-3">
              <Sparkles className="h-10 w-10 mx-auto text-purple-400" />
              <p className="text-base font-medium text-gray-900">No pending AI suggestions</p>
              <p className="text-xs text-gray-400">All AI-suggested categories have been moderated.</p>
            </div>
          ) : (
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Suggested Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Normalized Key
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Occurrences
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      First / Last Seen
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {suggestions.map((sug) => (
                    <tr key={sug.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {sug.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono text-xs">
                        {sug.normalizedName || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs">
                          <Flame className="h-3.5 w-3.5 text-purple-600" /> {sug.occurrenceCount || 1} occurrences
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {getSuggestionStatusBadge(sug.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-gray-400" /> First: {sug.firstSeenAt ? new Date(sug.firstSeenAt).toLocaleDateString() : "-"}</span>
                          <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 text-gray-400" /> Last: {sug.lastSeenAt ? new Date(sug.lastSeenAt).toLocaleDateString() : "-"}</span>
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        {sug.status?.toUpperCase() === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptSuggestion(sug)}
                              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-xs py-1 px-2.5 flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleRejectSuggestion(sug)}
                              className="text-xs py-1 px-2.5 flex items-center gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Moderated</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 1. Create Category Modal (POST /api/v1/categories) */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Category">
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <Input
            id="categoryName"
            type="text"
            label="Category Name"
            placeholder="e.g. Check restaurant menu"
            required
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={actionLoading}
          />
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Create Category
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Category Name Modal (PATCH /api/v1/categories/:id) */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Category Name">
        <form onSubmit={handleEditCategory} className="space-y-4">
          <Input
            id="editCategoryName"
            type="text"
            label="Category Name"
            required
            value={editCategoryName}
            onChange={(e) => setEditCategoryName(e.target.value)}
            disabled={actionLoading}
          />
          <p className="text-xs text-gray-500">
            Note: Updating the name will automatically update the category slug. Status (`isActive`) is controlled separately via Enable/Disable.
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Delete Category Modal (DELETE /api/v1/categories/:id) */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Category">
        <div className="space-y-4">
          {deleteError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          <p className="text-sm text-gray-600">
            Are you sure you want to permanently delete category <strong className="text-gray-900">"{deletingCategory?.name}"</strong>?
          </p>
          <div className="bg-red-50 border border-red-100 rounded p-3 text-xs text-red-700">
            This action will permanently remove this category record from the platform.
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmDelete} isLoading={actionLoading}>
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
