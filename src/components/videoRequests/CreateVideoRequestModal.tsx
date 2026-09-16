import React, { useEffect, useState } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Button } from "../common/Button";
import { CustomSelect } from "../common/CustomSelect";
import { MapboxLocationPicker } from "../common/MapboxLocationPicker";
import { createVideoRequest } from "../../api/videoRequests.api";
import { getCategories } from "../../api/categories.api";
import { getVideoRequestSettings } from "../../api/settings.api";
import { Category } from "../../types";
import { Loader2, MapPin, Tag } from "lucide-react";

type RequestType = "VIDEO" | "IMAGE";

interface InitialVideoRequestData {
  title?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rewardAmount?: number;
}

interface CreateVideoRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: InitialVideoRequestData | null;
}

export const CreateVideoRequestModal: React.FC<CreateVideoRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [requestType, setRequestType] = useState<RequestType>("VIDEO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(initialData?.description || "");
  const [address, setAddress] = useState(initialData?.address || "");
  const [latitude, setLatitude] = useState<number | "">(
    typeof initialData?.latitude === "number" ? initialData.latitude : ""
  );
  const [longitude, setLongitude] = useState<number | "">(
    typeof initialData?.longitude === "number" ? initialData.longitude : ""
  );
  const [durationSeconds, setDurationSeconds] = useState<number | "">(60);
  const [requestedImageCount, setRequestedImageCount] = useState<number | "">(3);
  const [rewardAmount, setRewardAmount] = useState<number | "">(
    typeof initialData?.rewardAmount === "number" ? initialData.rewardAmount : ""
  );
  const [loading, setLoading] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Settings / Minimum Reward State
  const [minRewardVideo, setMinRewardVideo] = useState<number | null>(null);
  const [minRewardImage, setMinRewardImage] = useState<number | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const activeMinReward =
    requestType === "IMAGE" ? minRewardImage : minRewardVideo;

  // Fetch categories when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCategoriesLoading(true);

    getCategories()
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.categories || (res.data as any)?.items || [];
        setCategories(list);
        if (list.length > 0) {
          setCategoryId((prev) => (prev ? prev : list[0].id));
        }
      })
      .catch((err) => {
        console.warn("[CreateVideoRequestModal] Failed to fetch categories:", err);
      })
      .finally(() => {
        if (isMounted) setCategoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset form fields when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setRequestType("VIDEO");
    setDurationSeconds(60);
    setRequestedImageCount(3);
    setTitle("");

    if (initialData) {
      setDescription(initialData.description || "");
      setAddress(initialData.address || "");
      setLatitude(typeof initialData.latitude === "number" ? initialData.latitude : "");
      setLongitude(typeof initialData.longitude === "number" ? initialData.longitude : "");
      setRewardAmount(typeof initialData.rewardAmount === "number" ? initialData.rewardAmount : "");
    } else {
      setDescription("");
      setAddress("");
      setLatitude("");
      setLongitude("");
      setRewardAmount("");
    }

    let cancelled = false;
    setSettingsLoading(true);
    getVideoRequestSettings()
      .then((settings) => {
        if (cancelled) return;
        setMinRewardVideo(settings.minRewardVideo);
        setMinRewardImage(settings.minRewardImage);
      })
      .catch(() => {
        if (cancelled) return;
        setMinRewardVideo(null);
        setMinRewardImage(null);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || typeof latitude !== "number" || typeof longitude !== "number") {
      alert("Please fill in title and pick a location on the map.");
      return;
    }
    if (description.trim().length < 20) {
      alert("Description must be at least 20 characters.");
      return;
    }
    if (!categoryId) {
      alert("Please select a category.");
      return;
    }
    if (typeof rewardAmount !== "number" || rewardAmount <= 0) {
      alert("Reward amount must be greater than 0.");
      return;
    }
    if (typeof activeMinReward === "number" && rewardAmount < activeMinReward) {
      alert(
        `Reward amount must be at least ₹${activeMinReward} for ${requestType.toLowerCase()} requests.`
      );
      return;
    }

    if (requestType === "VIDEO") {
      if (typeof durationSeconds !== "number" || durationSeconds < 1) {
        alert("Duration must be at least 1 second.");
        return;
      }
    } else if (
      typeof requestedImageCount !== "number" ||
      requestedImageCount < 1 ||
      requestedImageCount > 10
    ) {
      alert("Image count must be between 1 and 10.");
      return;
    }

    setLoading(true);
    try {
      await createVideoRequest({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        requestType,
        ...(requestType === "IMAGE"
          ? {
              requestedImageCount: requestedImageCount as number,
              durationSeconds: 60,
            }
          : { durationSeconds: durationSeconds as number }),
        rewardAmount,
        customLocation: {
          address: address.trim() || undefined,
          latitude,
          longitude,
        },
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errCode = err.response?.data?.code || err.response?.data?.errorCode;
      const errMsg = err.response?.data?.message || err.message || "";
      const dataCode = err.response?.data?.data?.code;

      if (
        errCode === "SERVICE_AREA_RESTRICTED" ||
        dataCode === "SERVICE_AREA_RESTRICTED" ||
        errMsg.includes("SERVICE_AREA_RESTRICTED")
      ) {
        const availableAreas =
          err.response?.data?.availableAreas || err.response?.data?.data?.availableAreas;
        const areasListText =
          Array.isArray(availableAreas) && availableAreas.length > 0
            ? ` Available areas: ${availableAreas
                .map((a: any) => (typeof a === "string" ? a : a.name))
                .join(", ")}.`
            : "";
        alert(`Locatez is currently available only in selected service areas.${areasListText}`);
      } else {
        alert(errMsg || "Failed to create request");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        {initialData?.address && (
          <div className="bg-primary-100 border border-primary-300 rounded-md p-3 text-xs text-primary-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span>
              Pre-filled from Popular Place: <strong>{initialData.address}</strong>
            </span>
          </div>
        )}

        <div>
          <span className="block text-sm font-medium text-neutral-700 mb-2">Request type</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setRequestType("VIDEO")}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                requestType === "VIDEO"
                  ? "border-primary-500 bg-primary-100 text-primary-900 font-semibold shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              Video
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setRequestType("IMAGE")}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                requestType === "IMAGE"
                  ? "border-primary-500 bg-primary-100 text-primary-900 font-semibold shadow-xs"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              Image
            </button>
          </div>
        </div>

        <Input
          id="req-title"
          type="text"
          label="Request Title"
          placeholder={
            requestType === "IMAGE"
              ? "e.g. Storefront photos at Marine Drive"
              : "e.g. Live crowd update at Marine Drive"
          }
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={loading}
        />

        {/* Category Dropdown */}
        <div>
          <label htmlFor="req-category" className="block text-sm font-medium text-neutral-700 mb-1">
            Category
          </label>
          <CustomSelect
            icon={<Tag className="h-4 w-4" />}
            value={categoryId}
            onChange={setCategoryId}
            placeholder={categoriesLoading ? "Loading categories..." : "Select a category"}
            disabled={loading || categoriesLoading}
            options={categories.map((cat) => ({
              label: cat.name,
              value: cat.id,
            }))}
          />
        </div>

        {/* Description */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="req-desc" className="block text-sm font-medium text-neutral-700">
              Description
            </label>
            <span
              className={`text-xs ${
                description.trim().length >= 20 ? "text-neutral-500" : "text-amber-600 font-medium"
              }`}
            >
              {description.trim().length}/20 min
            </span>
          </div>
          <textarea
            id="req-desc"
            rows={3}
            required
            minLength={20}
            className="block w-full rounded-md border border-neutral-300 p-2.5 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 placeholder-neutral-400 disabled:bg-neutral-100 transition-colors"
            placeholder={
              requestType === "IMAGE"
                ? "Describe the photos required in detail (min 20 characters)..."
                : "Describe the video coverage required in detail (min 20 characters)..."
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
          {description.trim().length > 0 && description.trim().length < 20 && (
            <p className="mt-1 text-xs text-amber-600 font-medium">
              Description must be at least 20 characters ({20 - description.trim().length} more needed).
            </p>
          )}
        </div>

        <div>
          <span className="block text-sm font-medium text-neutral-700 mb-2">Location</span>
          <MapboxLocationPicker
            location={address}
            onLocationChange={setAddress}
            latitude={latitude}
            longitude={longitude}
            onCoordinatesChange={(lat, lng) => {
              setLatitude(lat);
              setLongitude(lng);
            }}
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            Search or click the map to set the request pin. Address is filled from Mapbox when
            possible.
          </p>
        </div>

        {requestType === "VIDEO" ? (
          <Input
            id="req-duration"
            type="number"
            min="1"
            step="1"
            label="Duration (seconds)"
            placeholder="60"
            required
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(e.target.value ? parseInt(e.target.value, 10) : "")}
            disabled={loading}
          />
        ) : (
          <Input
            id="req-image-count"
            type="number"
            min="1"
            max="10"
            step="1"
            label="Number of images (1–10)"
            placeholder="3"
            required
            value={requestedImageCount}
            onChange={(e) =>
              setRequestedImageCount(e.target.value ? parseInt(e.target.value, 10) : "")
            }
            disabled={loading}
          />
        )}

        <Input
          id="req-reward"
          type="number"
          step="0.01"
          min={typeof activeMinReward === "number" ? activeMinReward : undefined}
          label="Reward Amount (₹)"
          placeholder={
            typeof activeMinReward === "number" ? String(activeMinReward) : "15.00"
          }
          required
          value={rewardAmount}
          onChange={(e) => setRewardAmount(e.target.value ? parseFloat(e.target.value) : "")}
          disabled={loading}
        />
        <p className="text-xs text-neutral-500 -mt-2">
          {settingsLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading minimum reward…
            </span>
          ) : typeof activeMinReward === "number" ? (
            <>
              Minimum reward for {requestType === "IMAGE" ? "image" : "video"} requests:{" "}
              <strong className="text-neutral-800">₹{activeMinReward}</strong>
            </>
          ) : (
            "Minimum reward unavailable."
          )}
        </p>

        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading || categoriesLoading || !categoryId || description.trim().length < 20}
          >
            {requestType === "IMAGE" ? "Submit Image Request" : "Submit Video Request"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
