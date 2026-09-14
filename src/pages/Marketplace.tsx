import React, { useEffect, useState } from "react";
import {
  getMarketplaceStreams,
  createMarketplaceStream,
  getMarketplacePurchases,
  getMarketplacePlaybackAccess,
  approveMarketplaceStream,
  rejectMarketplaceStream,
} from "../api/marketplace.api";
import { getCategories } from "../api/categories.api";
import { uploadMedia } from "../api/popularPlaces.api";
import { MarketplaceStream, MarketplacePurchase, Category } from "../types";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { CustomSelect } from "../components/common/CustomSelect";
import { MapboxLocationPicker } from "../components/common/MapboxLocationPicker";
import { Pagination } from "../components/common/Pagination";
import { useToast } from "../context/ToastContext";
import { useDebounce } from "../hooks/useDebounce";
import {
  Store,
  Plus,
  Search,
  MapPin,
  Clock,
  Film,
  Upload,
  Loader2,
  Play,
  User,
  ShoppingBag,
  Info,
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Filter,
  RotateCcw,
  Tag,
  ArrowUpDown,
} from "lucide-react";

export const Marketplace: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"streams" | "purchases">("streams");

  // Streams State
  const [streams, setStreams] = useState<MarketplaceStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("newest");

  // Categories list for dropdowns
  const [categories, setCategories] = useState<Category[]>([]);

  // Purchases State
  const [purchases, setPurchases] = useState<MarketplacePurchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesError, setPurchasesError] = useState<string | null>(null);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [selectedStream, setSelectedStream] = useState<MarketplaceStream | null>(null);
  const [streamToReject, setStreamToReject] = useState<MarketplaceStream | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Playback Access URL State
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackLoading, setPlaybackLoading] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // Form State for Create Listing
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">(10);
  const [durationSeconds, setDurationSeconds] = useState<number | "">(60);
  const [videoStorageKey, setVideoStorageKey] = useState("");
  const [thumbnailStorageKey, setThumbnailStorageKey] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [expiresAt, setExpiresAt] = useState("");
  const [status, setStatus] = useState("PUBLISHED");

  // Loading states
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Fetch Categories
  const fetchCategoriesList = async () => {
    try {
      const res = await getCategories();
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
      setCategories(list);
    } catch (err) {
      console.warn("Failed to load categories for marketplace form", err);
    }
  };

  // Fetch Streams
  const fetchStreams = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit, sort: sortFilter };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;

      const res = await getMarketplaceStreams(params);
      const resData = res.data as any;

      if (Array.isArray(resData)) {
        setStreams(resData);
        setTotal(resData.length);
        setTotalPages(1);
      } else if (resData?.items) {
        setStreams(resData.items);
        setTotal(resData.pagination?.total || resData.items.length);
        setTotalPages(resData.pagination?.totalPages || 1);
      } else {
        setStreams([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to fetch marketplace streams");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Purchases
  const fetchPurchases = async () => {
    setPurchasesLoading(true);
    setPurchasesError(null);
    try {
      const res = await getMarketplacePurchases();
      const resData = res.data as any;
      if (Array.isArray(resData)) {
        setPurchases(resData);
      } else if (resData?.items) {
        setPurchases(resData.items);
      } else {
        setPurchases([]);
      }
    } catch (err: any) {
      setPurchasesError(err.response?.data?.message || err.message || "Failed to fetch purchases");
    } finally {
      setPurchasesLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoriesList();
  }, []);

  useEffect(() => {
    if (activeTab === "streams") {
      fetchStreams();
    } else {
      fetchPurchases();
    }
  }, [activeTab, page, limit, debouncedSearch, statusFilter, categoryFilter, sortFilter]);

  // Handle Video File Upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    try {
      await uploadMedia(file);
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      setVideoStorageKey(`videos/${Date.now()}_${filename}`);
      toast.success("Video file uploaded successfully! Storage key populated.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to upload video file.");
    } finally {
      setUploadingVideo(false);
    }
  };

  // Handle Thumbnail File Upload
  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    try {
      await uploadMedia(file);
      const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      setThumbnailStorageKey(`images/${Date.now()}_${filename}`);
      toast.success("Thumbnail file uploaded successfully! Storage key populated.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to upload thumbnail file.");
    } finally {
      setUploadingThumb(false);
    }
  };

  // Reset Create Form
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice(10);
    setDurationSeconds(60);
    setVideoStorageKey("videos/sample_video.mp4");
    setThumbnailStorageKey("");
    setSelectedCategoryId("");
    setLocationAddress("");
    setLatitude("");
    setLongitude("");
    setExpiresAt("");
    setStatus("PUBLISHED");
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (typeof price !== "number" || price < 0) {
      toast.error("Price must be a valid number >= 0.");
      return;
    }
    if (!videoStorageKey.trim()) {
      toast.error("Video storage key is required (must start with videos/).");
      return;
    }

    setActionLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        durationSeconds: typeof durationSeconds === "number" ? durationSeconds : 60,
        videoStorageKey: videoStorageKey.trim(),
        thumbnailStorageKey: thumbnailStorageKey.trim() || undefined,
        categoryId: selectedCategoryId || undefined,
        status,
      };

      if (locationAddress.trim() && typeof latitude === "number" && typeof longitude === "number") {
        payload.customLocation = {
          address: locationAddress.trim(),
          latitude: Number(latitude),
          longitude: Number(longitude),
        };
      }

      if (expiresAt) {
        payload.expiresAt = new Date(expiresAt).toISOString();
      }

      const res = await createMarketplaceStream(payload);
      setIsCreateModalOpen(false);
      resetForm();
      fetchStreams();

      if (res.data?.status === "PENDING") {
        toast.info("Marketplace VOD stream submitted. Because it is in a restricted area, it requires moderator approval.");
      } else {
        toast.success("Marketplace VOD stream created successfully!");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to create marketplace listing.";
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Open Details
  const handleOpenDetails = async (stream: MarketplaceStream) => {
    setSelectedStream(stream);
    setPlaybackUrl(null);
    setPlaybackError(null);
    setIsDetailsModalOpen(true);
  };

  // Approve Action Handler
  const handleApproveStream = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await approveMarketplaceStream(id);
      toast.success("VOD listing approved successfully!");
      if (selectedStream?.id === id) {
        setSelectedStream(res.data);
      }
      fetchStreams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to approve listing.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (stream: MarketplaceStream) => {
    setStreamToReject(stream);
    setRejectionReason("");
    setIsRejectModalOpen(true);
  };

  // Confirm Reject Handler
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streamToReject || !rejectionReason.trim()) return;

    setActionLoading(true);
    try {
      const res = await rejectMarketplaceStream(streamToReject.id, rejectionReason.trim());
      toast.success("VOD listing rejected successfully.");
      if (selectedStream?.id === streamToReject.id) {
        setSelectedStream(res.data);
      }
      setIsRejectModalOpen(false);
      setStreamToReject(null);
      setRejectionReason("");
      fetchStreams();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to reject listing.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Fetch Playback Access URL
  const handleGetPlaybackAccess = async (streamId: string) => {
    setPlaybackLoading(true);
    setPlaybackError(null);
    try {
      const res = await getMarketplacePlaybackAccess(streamId);
      if (res.data?.playbackUrl) {
        setPlaybackUrl(res.data.playbackUrl);
      } else {
        setPlaybackError("No playback URL returned by server.");
      }
    } catch (err: any) {
      setPlaybackError(
        err.response?.data?.message ||
          err.message ||
          "Playback access restricted. You may need to purchase or own this video."
      );
    } finally {
      setPlaybackLoading(false);
    }
  };

  const getStatusBadgeVariant = (st: string) => {
    switch (st?.toUpperCase()) {
      case "PUBLISHED":
      case "LIVE":
        return <Badge variant="success">{st}</Badge>;
      case "PENDING":
        return <Badge variant="warning">PENDING</Badge>;
      case "DRAFT":
        return <Badge variant="info">DRAFT</Badge>;
      case "EXPIRED":
        return <Badge variant="cancelled">EXPIRED</Badge>;
      case "CANCELLED":
      case "ENDED":
        return <Badge variant="cancelled">{st}</Badge>;
      case "REJECTED":
        return <Badge variant="danger">REJECTED</Badge>;
      default:
        return <Badge>{st}</Badge>;
    }
  };

  const fallbackThumb =
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80";

  const pendingCount = streams.filter((s) => s.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-6 w-6 text-indigo-600 flex-shrink-0" /> Marketplace VOD Administration
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500">
            Manage Video-On-Demand (VOD) marketplace streams, moderate pending restricted-area listings, and inspect sales.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="self-start sm:self-auto flex items-center gap-1.5 shrink-0 border-transparent">
          <Plus className="h-4 w-4" /> Add Marketplace VOD
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-lg text-primary-700">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Listings</p>
            <p className="text-lg font-bold text-gray-900">{total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-yellow-50 border border-yellow-500/20 rounded-lg text-yellow-900">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Pending Approval</p>
            <p className="text-lg font-bold text-yellow-900">{pendingCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-green-50 border border-green-500/20 rounded-lg text-green-900">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Published VODs</p>
            <p className="text-lg font-bold text-gray-900">
              {streams.filter((s) => s.status === "PUBLISHED" || (s.status as string) === "LIVE").length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-primary-100 rounded-lg text-primary-800">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Completed Sales</p>
            <p className="text-lg font-bold text-gray-900">
              {streams.reduce((acc, curr) => acc + (curr.purchaseCount || 0), 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          <button
            onClick={() => {
              setActiveTab("streams");
              setPage(1);
            }}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 transition ${
              activeTab === "streams"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Film className="h-4 w-4" /> VOD Listings ({total})
          </button>
          <button
            onClick={() => {
              setActiveTab("purchases");
              setPage(1);
            }}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-2 transition ${
              activeTab === "purchases"
                ? "border-indigo-600 text-indigo-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> Purchases History ({purchases.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: VOD LISTINGS */}
      {activeTab === "streams" && (
        <div className="space-y-4">
          {/* Styled Filters Container Card */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 uppercase tracking-wider">
                <Filter className="h-4 w-4 text-primary-500" />
                <span>Search & Filter Listings</span>
                {(search || categoryFilter || statusFilter || sortFilter !== "newest") && (
                  <span className="bg-primary-50 text-primary-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary-200">
                    Active
                  </span>
                )}
              </div>
              {(search || categoryFilter || statusFilter || sortFilter !== "newest") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("");
                    setStatusFilter("");
                    setSortFilter("newest");
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Search Bar */}
              <div className="relative sm:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search listings by title, location, or description..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-8 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none bg-neutral-50/50 hover:bg-white focus:bg-white transition"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="sm:col-span-3">
                <CustomSelect
                  icon={<Tag className="h-4 w-4" />}
                  value={categoryFilter}
                  onChange={(val) => {
                    setCategoryFilter(val);
                    setPage(1);
                  }}
                  placeholder="All Categories"
                  options={[
                    { label: "All Categories", value: "" },
                    ...categories.map((c) => ({ label: c.name, value: c.id })),
                  ]}
                />
              </div>

              {/* Sort Filter */}
              <div className="sm:col-span-3">
                <CustomSelect
                  icon={<ArrowUpDown className="h-4 w-4" />}
                  value={sortFilter}
                  onChange={(val) => {
                    setSortFilter(val);
                    setPage(1);
                  }}
                  placeholder="Sort by"
                  options={[
                    { label: "Newest First", value: "newest" },
                    { label: "Oldest First", value: "oldest" },
                    { label: "Highest Price", value: "highest_price" },
                    { label: "Lowest Price", value: "lowest_price" },
                  ]}
                />
              </div>
            </div>

            {/* Status Pill Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mr-1">Status:</span>
              {[
                { label: "All Statuses", value: "" },
                { label: "Pending Review", value: "PENDING" },
                { label: "Published", value: "PUBLISHED" },
                { label: "Draft", value: "DRAFT" },
                { label: "Ended", value: "ENDED" },
                { label: "Expired", value: "EXPIRED" },
                { label: "Cancelled", value: "CANCELLED" },
              ].map((st) => {
                const isActive = statusFilter.toUpperCase() === st.value.toUpperCase();
                return (
                  <button
                    key={st.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st.value);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-primary-500 text-white shadow-2xs"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200/60"
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listings Table / Empty State / Loader */}
          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">{error}</div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : streams.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500 space-y-3">
              <Film className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-lg font-medium text-gray-900">No marketplace VOD streams found</p>
              <p className="text-xs">Click "Add Marketplace VOD" above to list the first stream.</p>
            </div>
          ) : (
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Listing Title
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Price / Duration
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Location / Category
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Creator
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Sales / Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 sm:pr-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {streams.map((stream) => (
                    <tr key={stream.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border relative">
                            <img
                              src={stream.thumbnailUrl || fallbackThumb}
                              alt={stream.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = fallbackThumb;
                              }}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Play className="h-4 w-4 text-white fill-white opacity-80" />
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 line-clamp-1">{stream.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">
                              {stream.description || "No description provided."}
                            </p>
                            {stream.isRestrictedArea && (
                              <div className="mt-1 flex items-center text-xs text-amber-600 font-semibold">
                                <AlertTriangle className="mr-1 h-3 w-3 flex-shrink-0" />
                                Restricted Location ({stream.restrictedAreaType || "CONDITIONAL"})
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-700">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-indigo-600 text-sm">
                            ₹{(stream.price || 0).toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {stream.durationSeconds ? `${stream.durationSeconds}s` : "-"}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-600">
                        <div className="flex flex-col gap-0.5">
                          {stream.customLocation?.address ? (
                            <span className="text-xs flex items-center gap-1 text-gray-800 line-clamp-1">
                              <MapPin className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                              {stream.customLocation.address}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No custom location</span>
                          )}
                          <span className="text-[11px] text-gray-500 font-medium">
                            Category: {stream.category?.name || "Uncategorized"}
                          </span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium text-gray-900">{stream.creator?.username || "Unknown"}</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500">
                        <div className="flex flex-col gap-1.5 items-start">
                          {getStatusBadgeVariant(stream.status)}
                          <span className="text-[11px] font-semibold text-gray-600">
                            {stream.purchaseCount || 0} purchases
                          </span>
                        </div>
                      </td>

                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {stream.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleApproveStream(stream.id)}
                                isLoading={actionLoadingId === stream.id}
                                disabled={actionLoadingId === stream.id}
                                className="bg-green-600 hover:bg-green-700 text-xs px-2.5 py-1"
                                title="Approve VOD listing"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleOpenRejectModal(stream)}
                                disabled={actionLoadingId === stream.id}
                                className="text-xs px-2.5 py-1"
                                title="Reject VOD listing"
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDetails(stream)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 border border-indigo-100 hover:bg-indigo-50"
                          >
                            <Info className="h-3.5 w-3.5 mr-1" /> View Details
                          </Button>
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
        </div>
      )}

      {/* TAB 2: PURCHASES HISTORY */}
      {activeTab === "purchases" && (
        <div>
          {purchasesError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-sm">{purchasesError}</div>
          ) : purchasesLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : purchases.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500 space-y-3">
              <ShoppingBag className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-lg font-medium text-gray-900">No marketplace purchases record found</p>
              <p className="text-xs">Purchased VOD stream transactions will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg bg-white">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Purchase ID
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      VOD Listing Title
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount (₹)
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Purchased At
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Access Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {purchases.map((pur) => (
                    <tr key={pur.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-xs font-mono font-bold text-gray-900 sm:pl-6">
                        {pur.id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                        {pur.listing?.title || "Marketplace Video"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-emerald-600 font-mono">
                        ₹{(pur.amount || 0).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500">
                        {pur.purchasedAt ? new Date(pur.purchasedAt).toLocaleString() : "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-xs text-gray-500">
                        {pur.isAccessible ? (
                          <Badge variant="success">ACCESSIBLE</Badge>
                        ) : (
                          <Badge variant="default">EXPIRED / RESTRICTED</Badge>
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

      {/* CREATE MARKETPLACE STREAM MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Marketplace VOD Stream Listing"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            id="create-title"
            type="text"
            label="Listing Title"
            placeholder="e.g. Exclusive drone view of Sunset at Marine Drive"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={actionLoading}
          />

          <div>
            <label htmlFor="create-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="create-desc"
              rows={3}
              className="block w-full rounded-md border border-gray-300 p-2.5 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              placeholder="Describe the footage content, resolution, quality..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={actionLoading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="create-price"
              type="number"
              step="0.01"
              label="Price (₹)"
              placeholder="10.00"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : "")}
              disabled={actionLoading}
            />

            <Input
              id="create-duration"
              type="number"
              label="Duration (seconds)"
              placeholder="60"
              required
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value ? parseInt(e.target.value, 10) : "")}
              disabled={actionLoading}
            />
          </div>

          {/* Video Storage Key Upload Input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Video Storage Key (must start with videos/)</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-2 rounded-md shadow-xs flex items-center justify-center gap-1.5 transition shrink-0">
                {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> : <Upload className="h-4 w-4 text-indigo-600" />}
                <span>Upload Video File</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo || actionLoading} />
              </label>
              <input
                type="text"
                required
                placeholder="videos/sample_video.mp4"
                value={videoStorageKey}
                onChange={(e) => setVideoStorageKey(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                disabled={actionLoading}
              />
            </div>
          </div>

          {/* Thumbnail Storage Key Upload Input */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Thumbnail Storage Key (optional, starts with images/)</label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-2 rounded-md shadow-xs flex items-center justify-center gap-1.5 transition shrink-0">
                {uploadingThumb ? <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> : <Upload className="h-4 w-4 text-indigo-600" />}
                <span>Upload Thumbnail</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleThumbUpload} disabled={uploadingThumb || actionLoading} />
              </label>
              <input
                type="text"
                placeholder="images/sample_thumb.jpg"
                value={thumbnailStorageKey}
                onChange={(e) => setThumbnailStorageKey(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                disabled={actionLoading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="create-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <CustomSelect
              icon={<Tag className="h-4 w-4" />}
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              placeholder="Select Category (Optional)"
              disabled={actionLoading}
              options={[
                { label: "Select Category (Optional)", value: "" },
                ...categories.map((c) => ({ label: c.name, value: c.id })),
              ]}
            />
          </div>

          {/* Map Location Selector */}
          <MapboxLocationPicker
            location={locationAddress}
            onLocationChange={setLocationAddress}
            latitude={latitude}
            longitude={longitude}
            onCoordinatesChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="create-expires"
              type="datetime-local"
              label="Expiration Date & Time (Optional)"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={actionLoading}
            />

            <div>
              <label htmlFor="create-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <CustomSelect
                value={status}
                onChange={setStatus}
                disabled={actionLoading}
                options={[
                  { label: "PUBLISHED", value: "PUBLISHED" },
                  { label: "DRAFT", value: "DRAFT" },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={actionLoading} disabled={uploadingVideo || uploadingThumb} className="bg-indigo-600 hover:bg-indigo-700">
              List Marketplace VOD
            </Button>
          </div>
        </form>
      </Modal>

      {/* STREAM DETAILS & PLAYBACK MODAL */}
      {selectedStream && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={selectedStream.title}
        >
          <div className="space-y-4">
            <div className="h-60 w-full rounded-xl overflow-hidden bg-black relative flex items-center justify-center">
              {playbackUrl ? (
                <video src={playbackUrl} controls autoPlay className="h-full w-full object-contain" />
              ) : (
                <>
                  <img
                    src={selectedStream.thumbnailUrl || fallbackThumb}
                    alt={selectedStream.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackThumb;
                    }}
                    className="h-full w-full object-cover opacity-60"
                  />
                  <button
                    onClick={() => handleGetPlaybackAccess(selectedStream.id)}
                    disabled={playbackLoading}
                    className="absolute bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-xs transition"
                  >
                    {playbackLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-white" />}
                    <span>Request Video Playback</span>
                  </button>
                </>
              )}
            </div>

            {playbackError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-xs flex items-center gap-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                <span>{playbackError}</span>
              </div>
            )}

            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Price:</span>
                <span className="font-bold text-indigo-600 text-base">₹{(selectedStream.price || 0).toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Status:</span>
                <span>{getStatusBadgeVariant(selectedStream.status)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Total Purchases:</span>
                <span className="font-mono font-bold text-gray-900">{selectedStream.purchaseCount || 0}</span>
              </div>

              {selectedStream.customLocation?.address && (
                <div className="flex items-start justify-between">
                  <span className="text-gray-500 font-medium shrink-0">Location:</span>
                  <span className="font-medium text-gray-900 text-right flex items-center justify-end gap-1">
                    <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    {selectedStream.customLocation.address}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Creator:</span>
                <span className="font-semibold text-gray-900">{selectedStream.creator?.username || "Unknown"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Listed Date:</span>
                <span className="font-mono text-gray-700">{new Date(selectedStream.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {selectedStream.status === "PENDING" && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Restricted Area Listing Awaiting Approval</p>
                  <p className="mt-0.5">
                    This stream is pending approval before it can become publicly available for purchase
                    {selectedStream.restrictedAreaType ? ` (Restricted type: ${selectedStream.restrictedAreaType})` : ""}.
                  </p>
                </div>
              </div>
            )}

            {selectedStream.status === "CANCELLED" && selectedStream.rejectionReason && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-xs">
                <p className="font-semibold">Listing Rejected / Cancelled</p>
                <p className="mt-0.5">Reason: {selectedStream.rejectionReason}</p>
                {selectedStream.reviewedBy && (
                  <p className="mt-1">
                    By{" "}
                    <strong>
                      {selectedStream.reviewedBy.name || selectedStream.reviewedBy.username}
                    </strong>
                    {selectedStream.reviewedAt
                      ? ` · ${new Date(selectedStream.reviewedAt).toLocaleString()}`
                      : ""}
                  </p>
                )}
              </div>
            )}

            {(selectedStream.status === "PUBLISHED" ||
              (selectedStream.status as string) === "LIVE") &&
              selectedStream.reviewedBy && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded text-xs">
                Approved by{" "}
                <strong>
                  {selectedStream.reviewedBy.name || selectedStream.reviewedBy.username}
                </strong>
                {selectedStream.reviewedAt
                  ? ` · ${new Date(selectedStream.reviewedAt).toLocaleString()}`
                  : ""}
              </div>
            )}

            <p className="text-xs text-gray-600 leading-relaxed border-t pt-3">
              {selectedStream.description || "No description available for this VOD stream."}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t">
              {selectedStream.status === "PENDING" && (
                <>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      const str = selectedStream;
                      setIsDetailsModalOpen(false);
                      handleOpenRejectModal(str);
                    }}
                    disabled={actionLoadingId === selectedStream.id}
                  >
                    <X className="h-4 w-4 mr-1" /> Reject Listing
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleApproveStream(selectedStream.id)}
                    isLoading={actionLoadingId === selectedStream.id}
                    disabled={actionLoadingId === selectedStream.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" /> Approve Listing
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => !actionLoading && setIsRejectModalOpen(false)}
        title="Reject Marketplace Listing"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-xs text-red-800 space-y-1">
            <p className="font-semibold text-red-900">
              Rejecting VOD Listing: {streamToReject?.title}
            </p>
            <p>
              Please provide a clear rejection reason. The listing status will become CANCELLED.
            </p>
          </div>

          <div>
            <label htmlFor="modal-rejection-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="modal-rejection-reason"
              rows={3}
              required
              placeholder="Explain why this listing is being rejected..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="block w-full rounded-md border border-gray-300 p-2.5 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none"
              disabled={actionLoading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsRejectModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={actionLoading}
              disabled={actionLoading || !rejectionReason.trim()}
            >
              Reject Listing
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
