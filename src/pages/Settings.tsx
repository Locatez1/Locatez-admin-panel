import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  getVideoRequestSettings,
  updateVideoRequestSettings,
  getChatSettings,
  updateChatSettings,
  getServiceAreaSettings,
  updateServiceAreaSettings,
} from "../api/settings.api";
import { ServiceAreaSettings, ServiceAreaMode, ServiceArea } from "../types";
import { Switch } from "../components/common/Switch";
import { Modal } from "../components/common/Modal";
import { Button } from "../components/common/Button";
import { Shield, Info, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Globe, MapPin, IndianRupee, Radar } from "lucide-react";

export const Settings: React.FC = () => {
  const { role } = useAuth();
  const { toast } = useToast();

  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  // Video Requests Setting State
  const [requireApproval, setRequireApproval] = useState<boolean>(false);
  const [requireMediaApproval, setRequireMediaApproval] = useState<boolean>(false);
  const [confirmedMinRewardVideo, setConfirmedMinRewardVideo] = useState<number>(50);
  const [confirmedMinRewardImage, setConfirmedMinRewardImage] = useState<number>(20);
  const [confirmedNearbyRadius, setConfirmedNearbyRadius] = useState<number>(5000);
  const [minRewardVideoInput, setMinRewardVideoInput] = useState<string>("50");
  const [minRewardImageInput, setMinRewardImageInput] = useState<string>("20");
  const [nearbyRadiusInput, setNearbyRadiusInput] = useState<string>("5000");
  const [economyValidationError, setEconomyValidationError] = useState<string | null>(null);
  const [economySaving, setEconomySaving] = useState<boolean>(false);

  // Chat Settings State
  const [confirmedChatLimit, setConfirmedChatLimit] = useState<number>(50);
  const [chatLimitInput, setChatLimitInput] = useState<string>("");
  const [chatValidationError, setChatValidationError] = useState<string | null>(null);

  // Service Area Settings State
  const [serviceAreaSettings, setServiceAreaSettings] = useState<ServiceAreaSettings | null>(null);
  const [pendingMode, setPendingMode] = useState<ServiceAreaMode>("PAN_INDIA");
  const [pendingAreas, setPendingAreas] = useState<ServiceArea[]>([]);
  const [serviceAreaSaving, setServiceAreaSaving] = useState<boolean>(false);
  const [serviceAreaError, setServiceAreaError] = useState<string | null>(null);

  // General Loading & Action States
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [chatSaving, setChatSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation Modal state for Video Request Approval
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [pendingValue, setPendingValue] = useState<boolean>(false);

  // Confirmation Modal state for Service Area Mode Switch
  const [isServiceAreaModalOpen, setIsServiceAreaModalOpen] = useState<boolean>(false);
  const [targetMode, setTargetMode] = useState<ServiceAreaMode | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vrData, chatData, saData] = await Promise.all([
        getVideoRequestSettings(),
        getChatSettings(),
        getServiceAreaSettings().catch((saErr) => {
          console.warn("Failed to load service area settings", saErr);
          setServiceAreaError(saErr.response?.data?.message || saErr.message || "Failed to load service area configuration.");
          return null;
        }),
      ]);

      setRequireApproval(!!vrData.requireApprovalForAll);
      setRequireMediaApproval(!!vrData.requireFulfilmentMediaApproval);
      setConfirmedMinRewardVideo(vrData.minRewardVideo);
      setConfirmedMinRewardImage(vrData.minRewardImage);
      setConfirmedNearbyRadius(vrData.nearbyRadiusMeters);
      setMinRewardVideoInput(String(vrData.minRewardVideo));
      setMinRewardImageInput(String(vrData.minRewardImage));
      setNearbyRadiusInput(String(vrData.nearbyRadiusMeters));
      setEconomyValidationError(null);

      const limit = typeof chatData.preAcceptanceMessageLimit === "number"
        ? chatData.preAcceptanceMessageLimit
        : 50;
      setConfirmedChatLimit(limit);
      setChatLimitInput(limit.toString());

      if (saData) {
        setServiceAreaSettings(saData);
        setPendingMode(saData.mode);
        setPendingAreas(saData.areas || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Video Request Toggle Handlers
  const handleToggleClick = (newValue: boolean) => {
    if (!isAdmin || actionLoading) return;
    setPendingValue(newValue);
    setIsConfirmModalOpen(true);
  };

  const handleMediaApprovalToggle = async (newValue: boolean) => {
    if (!isAdmin || actionLoading) return;
    const previous = requireMediaApproval;
    setRequireMediaApproval(newValue);
    setActionLoading(true);
    try {
      const response = await updateVideoRequestSettings({
        requireFulfilmentMediaApproval: newValue,
      });
      setRequireMediaApproval(!!response.requireFulfilmentMediaApproval);
      toast.success(
        newValue
          ? "Fulfilment media now requires moderator approval."
          : "Fulfilment media will deliver directly to requesters."
      );
    } catch {
      setRequireMediaApproval(previous);
      toast.error("Failed to update fulfilment media approval setting.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmUpdate = async () => {
    const previousState = requireApproval;
    const targetState = pendingValue;

    setIsConfirmModalOpen(false);
    setActionLoading(true);

    try {
      const response = await updateVideoRequestSettings({ requireApprovalForAll: targetState });
      const newState = typeof response.requireApprovalForAll === "boolean"
        ? response.requireApprovalForAll
        : targetState;

      setRequireApproval(newState);
      if (newState) {
        toast.success("Video request approval requirement enabled.");
      } else {
        toast.success("Video request approval requirement disabled.");
      }
    } catch (err: any) {
      setRequireApproval(previousState);
      toast.error("Failed to update video request approval setting. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const validatePositiveMoney = (value: string, label: string): string | null => {
    if (!value || value.trim() === "") return `${label} is required.`;
    const num = Number(value);
    if (isNaN(num)) return `${label} must be a valid number.`;
    if (num <= 0) return `${label} must be greater than 0.`;
    if (num > 1_000_000) return `${label} must be at most 1000000.`;
    return null;
  };

  const validateNearbyRadius = (value: string): string | null => {
    if (!value || value.trim() === "") return "Nearby radius is required.";
    const num = Number(value);
    if (isNaN(num)) return "Nearby radius must be a valid number.";
    if (!Number.isInteger(num) || value.includes(".")) {
      return "Nearby radius must be a whole number (meters).";
    }
    if (num < 100 || num > 1_000_000) {
      return "Nearby radius must be between 100 and 1000000 meters.";
    }
    return null;
  };

  const validateEconomyInputs = (): string | null =>
    validatePositiveMoney(minRewardVideoInput, "Minimum video reward") ||
    validatePositiveMoney(minRewardImageInput, "Minimum image reward") ||
    validateNearbyRadius(nearbyRadiusInput);

  const handleEconomyFieldChange = (
    field: "video" | "image" | "radius",
    value: string
  ) => {
    if (field === "video") setMinRewardVideoInput(value);
    else if (field === "image") setMinRewardImageInput(value);
    else setNearbyRadiusInput(value);

    const nextVideo = field === "video" ? value : minRewardVideoInput;
    const nextImage = field === "image" ? value : minRewardImageInput;
    const nextRadius = field === "radius" ? value : nearbyRadiusInput;
    setEconomyValidationError(
      validatePositiveMoney(nextVideo, "Minimum video reward") ||
        validatePositiveMoney(nextImage, "Minimum image reward") ||
        validateNearbyRadius(nextRadius)
    );
  };

  const handleSaveEconomySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || economySaving) return;

    const validationErr = validateEconomyInputs();
    if (validationErr) {
      setEconomyValidationError(validationErr);
      return;
    }

    const minRewardVideo = Math.round(Number(minRewardVideoInput) * 100) / 100;
    const minRewardImage = Math.round(Number(minRewardImageInput) * 100) / 100;
    const nearbyRadiusMeters = parseInt(nearbyRadiusInput, 10);

    const unchanged =
      minRewardVideo === confirmedMinRewardVideo &&
      minRewardImage === confirmedMinRewardImage &&
      nearbyRadiusMeters === confirmedNearbyRadius;
    if (unchanged) return;

    setEconomySaving(true);
    try {
      const updated = await updateVideoRequestSettings({
        minRewardVideo,
        minRewardImage,
        nearbyRadiusMeters,
      });
      setConfirmedMinRewardVideo(updated.minRewardVideo);
      setConfirmedMinRewardImage(updated.minRewardImage);
      setConfirmedNearbyRadius(updated.nearbyRadiusMeters);
      setMinRewardVideoInput(String(updated.minRewardVideo));
      setMinRewardImageInput(String(updated.minRewardImage));
      setNearbyRadiusInput(String(updated.nearbyRadiusMeters));
      setEconomyValidationError(null);
      toast.success("Request economy settings updated successfully.");
    } catch (err: any) {
      setMinRewardVideoInput(String(confirmedMinRewardVideo));
      setMinRewardImageInput(String(confirmedMinRewardImage));
      setNearbyRadiusInput(String(confirmedNearbyRadius));
      setEconomyValidationError(null);
      toast.error(err.response?.data?.message || "Failed to update request economy settings.");
    } finally {
      setEconomySaving(false);
    }
  };

  const isEconomySaveDisabled =
    !isAdmin ||
    economySaving ||
    !!economyValidationError ||
    (Number(minRewardVideoInput) === confirmedMinRewardVideo &&
      Number(minRewardImageInput) === confirmedMinRewardImage &&
      parseInt(nearbyRadiusInput, 10) === confirmedNearbyRadius);

  // Chat Settings Input Validation & Handlers
  const validateChatInput = (value: string): string | null => {
    if (!value || value.trim() === "") {
      return "Maximum chat messages is required.";
    }
    const num = Number(value);
    if (isNaN(num)) {
      return "Maximum chat messages must be a valid number.";
    }
    if (!Number.isInteger(num) || value.includes(".")) {
      return "Maximum chat messages must be a whole number (no decimals).";
    }
    if (num <= 0) {
      return "Maximum chat messages must be greater than 0.";
    }
    return null;
  };

  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setChatLimitInput(val);
    setChatValidationError(validateChatInput(val));
  };

  const handleSaveChatSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || chatSaving) return;

    const validationErr = validateChatInput(chatLimitInput);
    if (validationErr) {
      setChatValidationError(validationErr);
      return;
    }

    const newLimit = parseInt(chatLimitInput, 10);
    if (newLimit === confirmedChatLimit) return;

    setChatSaving(true);
    try {
      const updatedData = await updateChatSettings(newLimit);
      const confirmedValue = typeof updatedData.preAcceptanceMessageLimit === "number"
        ? updatedData.preAcceptanceMessageLimit
        : newLimit;

      setConfirmedChatLimit(confirmedValue);
      setChatLimitInput(confirmedValue.toString());
      setChatValidationError(null);
      toast.success("Chat settings updated successfully.");
    } catch (err: any) {
      // Revert input to last confirmed backend value on error
      setChatLimitInput(confirmedChatLimit.toString());
      setChatValidationError(null);
      toast.error(err.response?.data?.message || "Failed to update chat settings. Please try again.");
    } finally {
      setChatSaving(false);
    }
  };

  const isChatSaveDisabled =
    !isAdmin ||
    chatSaving ||
    !!chatValidationError ||
    !chatLimitInput ||
    parseInt(chatLimitInput, 10) === confirmedChatLimit;

  // Service Area Handlers
  const handleModeClick = (newMode: ServiceAreaMode) => {
    if (!isAdmin || serviceAreaSaving || newMode === pendingMode) return;
    setTargetMode(newMode);
    setIsServiceAreaModalOpen(true);
  };

  const handleConfirmModeChange = () => {
    if (targetMode) {
      setPendingMode(targetMode);
    }
    setIsServiceAreaModalOpen(false);
    setTargetMode(null);
  };

  const handleAreaToggle = (areaId: string, enabled: boolean) => {
    if (!isAdmin || serviceAreaSaving) return;
    setPendingAreas((prev) =>
      prev.map((a) => (a.id === areaId ? { ...a, enabled } : a))
    );
  };

  const handleSaveServiceAreaSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || serviceAreaSaving) return;

    setServiceAreaSaving(true);
    setServiceAreaError(null);
    try {
      const payload =
        pendingMode === "PAN_INDIA"
          ? { mode: "PAN_INDIA" as const }
          : {
              mode: "RESTRICTED" as const,
              areas: pendingAreas.map((a) => ({ id: a.id, enabled: a.enabled })),
            };
      const updated = await updateServiceAreaSettings(payload);
      setServiceAreaSettings(updated);
      setPendingMode(updated.mode);
      setPendingAreas(updated.areas || []);
      toast.success("Service area settings saved successfully.");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to save service area settings.";
      setServiceAreaError(errMsg);
      toast.error(errMsg);
    } finally {
      setServiceAreaSaving(false);
    }
  };

  const isServiceAreaSaveDisabled =
    !isAdmin ||
    serviceAreaSaving ||
    !serviceAreaSettings ||
    (pendingMode === serviceAreaSettings.mode &&
      JSON.stringify(pendingAreas.map((a) => ({ id: a.id, enabled: a.enabled }))) ===
        JSON.stringify(serviceAreaSettings.areas.map((a) => ({ id: a.id, enabled: a.enabled }))));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage global administrative preferences, video request policies, service area availability, and chat settings.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg border border-gray-200 p-6 space-y-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="flex items-center justify-between py-4 border-t border-gray-100">
              <div className="space-y-2 w-3/4">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
              <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg border border-gray-200 p-6 space-y-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="py-4 border-t border-gray-100 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded w-48"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Service Area / Marketplace Availability Section */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium text-gray-900">Service Area (Marketplace Availability)</h2>
            </div>

            {/* Section Content */}
            <div className="p-6 space-y-6">
              {serviceAreaError && (
                <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  {serviceAreaError}
                </div>
              )}

              <form onSubmit={handleSaveServiceAreaSettings} className="space-y-6">
                {/* Mode Selector */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-900">
                    Marketplace Availability Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                    <button
                      type="button"
                      disabled={!isAdmin || serviceAreaSaving}
                      onClick={() => handleModeClick("PAN_INDIA")}
                      className={`flex items-center justify-between p-4 rounded-lg border text-left transition ${
                        pendingMode === "PAN_INDIA"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-900">Pan India</p>
                        <p className="text-xs text-gray-500 mt-0.5">Available across India</p>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          pendingMode === "PAN_INDIA" ? "border-primary bg-primary" : "border-gray-300"
                        }`}
                      >
                        {pendingMode === "PAN_INDIA" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={!isAdmin || serviceAreaSaving}
                      onClick={() => handleModeClick("RESTRICTED")}
                      className={`flex items-center justify-between p-4 rounded-lg border text-left transition ${
                        pendingMode === "RESTRICTED"
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-900">Restricted Areas</p>
                        <p className="text-xs text-gray-500 mt-0.5">Available only in selected areas</p>
                      </div>
                      <div
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          pendingMode === "RESTRICTED" ? "border-primary bg-primary" : "border-gray-300"
                        }`}
                      >
                        {pendingMode === "RESTRICTED" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Mode Informational Text & Service Areas List */}
                {pendingMode === "PAN_INDIA" ? (
                  <div className="rounded-lg bg-blue-50/70 p-4 border border-blue-200/80 flex items-center gap-3 text-xs text-blue-900">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span>Locatez is available across India.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-amber-50 p-4 border border-amber-200/80 flex items-center gap-3 text-xs text-amber-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                      <span>Locatez is available only in selected service areas.</span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-900">Active Service Areas</h3>
                      {pendingAreas.length === 0 ? (
                        <p className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded border">
                          No service areas configured on server.
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-200 border rounded-lg overflow-hidden bg-white">
                          {pendingAreas.map((area) => (
                            <div key={area.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition">
                              <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-primary shrink-0" />
                                <div>
                                  <p className="font-semibold text-sm text-gray-900">{area.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {area.countryCode === "IN" ? "India" : area.countryCode}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-medium ${area.enabled ? "text-green-700" : "text-gray-400"}`}>
                                  {area.enabled ? "Enabled" : "Disabled"}
                                </span>
                                <Switch
                                  id={`area-switch-${area.id}`}
                                  checked={area.enabled}
                                  onChange={(val) => handleAreaToggle(area.id, val)}
                                  disabled={!isAdmin || serviceAreaSaving}
                                  label={`Toggle ${area.name} service area`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isAdmin && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block font-medium">
                    Note: As a Moderator, you can view service area configuration but cannot modify it.
                  </p>
                )}

                {/* Save Button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={serviceAreaSaving}
                    disabled={isServiceAreaSaveDisabled}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Video Requests Section */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium text-gray-900">Video Requests</h2>
            </div>

            {/* Setting Content */}
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between gap-6">
                <div className="space-y-1">
                  <label
                    htmlFor="video-approval-switch"
                    className="text-base font-medium text-gray-900 cursor-pointer"
                  >
                    Require approval for all video requests
                  </label>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                    {requireApproval
                      ? "All valid video requests require moderator/admin approval before becoming available. Hard-restricted locations remain blocked."
                      : "Normal video requests are created immediately. Conditionally restricted locations require moderator approval. Hard-restricted locations remain blocked."}
                  </p>
                  {!isAdmin && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block font-medium mt-2">
                      Note: As a Moderator, you can view this setting but cannot modify it.
                    </p>
                  )}
                </div>

                <div className="flex items-center pt-1">
                  <Switch
                    id="video-approval-switch"
                    checked={requireApproval}
                    onChange={handleToggleClick}
                    disabled={!isAdmin || actionLoading}
                    label="Require approval for all video requests"
                  />
                </div>
              </div>

              <div className="flex items-start justify-between gap-6 border-t border-gray-100 pt-6">
                <div className="space-y-1">
                  <label
                    htmlFor="media-approval-switch"
                    className="text-base font-medium text-gray-900 cursor-pointer"
                  >
                    Require approval for fulfilment media
                  </label>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                    {requireMediaApproval
                      ? "Submitted video/image goes to moderators first. Requesters only see media after approval."
                      : "Submitted video/image is delivered directly to the requester (still stored for admin review of completed requests)."}
                  </p>
                </div>
                <div className="flex items-center pt-1">
                  <Switch
                    id="media-approval-switch"
                    checked={requireMediaApproval}
                    onChange={handleMediaApprovalToggle}
                    disabled={!isAdmin || actionLoading}
                    label="Require approval for fulfilment media"
                  />
                </div>
              </div>

              {/* Clarification Box / Matrix Card */}
              <div className="rounded-lg bg-blue-50/70 p-4 border border-blue-200/80 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-medium text-sm">
                  <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span>Restriction Policy & Approval Matrix</span>
                </div>
                <p className="text-xs text-blue-800 leading-normal">
                  This switch specifically controls approval requirements for <strong>otherwise-valid video requests</strong>. It does not override or allow hard-restricted locations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-white p-3 rounded border border-blue-100 space-y-1.5 shadow-xs">
                    <div className="font-semibold text-gray-900 flex items-center justify-between">
                      <span>When Switch is OFF:</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-normal">Default</span>
                    </div>
                    <ul className="space-y-1 text-gray-700">
                      <li className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <span><strong>HARD:</strong> Blocked</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span><strong>CONDITIONAL:</strong> Moderator approval</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        <span><strong>NORMAL:</strong> Created normally</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white p-3 rounded border border-blue-100 space-y-1.5 shadow-xs">
                    <div className="font-semibold text-gray-900 flex items-center justify-between">
                      <span>When Switch is ON:</span>
                      <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-normal">Strict</span>
                    </div>
                    <ul className="space-y-1 text-gray-700">
                      <li className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <span><strong>HARD:</strong> Blocked</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span><strong>CONDITIONAL:</strong> Moderator approval</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span><strong>NORMAL:</strong> Moderator approval</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <form onSubmit={handleSaveEconomySettings} className="space-y-5">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-medium text-gray-900">Minimum rewards & nearby radius</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    These values apply when users create video/image requests and when nearby discovery or push notifications use the default radius.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="min-reward-video" className="block text-sm font-medium text-gray-900 mb-1">
                        Min video reward (INR)
                      </label>
                      <input
                        id="min-reward-video"
                        type="number"
                        min="0.01"
                        step="0.01"
                        disabled={!isAdmin || economySaving}
                        value={minRewardVideoInput}
                        onChange={(e) => handleEconomyFieldChange("video", e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label htmlFor="min-reward-image" className="block text-sm font-medium text-gray-900 mb-1">
                        Min image reward (INR)
                      </label>
                      <input
                        id="min-reward-image"
                        type="number"
                        min="0.01"
                        step="0.01"
                        disabled={!isAdmin || economySaving}
                        value={minRewardImageInput}
                        onChange={(e) => handleEconomyFieldChange("image", e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label htmlFor="nearby-radius" className="block text-sm font-medium text-gray-900 mb-1">
                        <span className="inline-flex items-center gap-1">
                          <Radar className="h-3.5 w-3.5" />
                          Nearby radius (m)
                        </span>
                      </label>
                      <input
                        id="nearby-radius"
                        type="number"
                        min="100"
                        step="1"
                        disabled={!isAdmin || economySaving}
                        value={nearbyRadiusInput}
                        onChange={(e) => handleEconomyFieldChange("radius", e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {economyValidationError && (
                    <p className="text-xs text-red-600 font-medium">{economyValidationError}</p>
                  )}

                  {!isAdmin && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block font-medium">
                      Note: As a Moderator, you can view these settings but cannot modify them.
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={economySaving}
                      disabled={isEconomySaveDisabled}
                    >
                      Save economy settings
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Chat Settings Section */}
          <div className="bg-white shadow sm:rounded-lg border border-gray-200 overflow-hidden">
            {/* Section Header */}
            <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-medium text-gray-900">Chat</h2>
            </div>

            {/* Setting Content */}
            <div className="p-6 space-y-4">
              <form onSubmit={handleSaveChatSettings} className="space-y-4">
                <div>
                  <label
                    htmlFor="chat-limit-input"
                    className="block text-sm font-medium text-gray-900 mb-1"
                  >
                    Maximum chat messages
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      id="chat-limit-input"
                      type="number"
                      min="1"
                      step="1"
                      disabled={!isAdmin || chatSaving}
                      value={chatLimitInput}
                      onChange={handleChatInputChange}
                      className="block w-full sm:w-48 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={chatSaving}
                      disabled={isChatSaveDisabled}
                    >
                      Save
                    </Button>
                  </div>
                  {chatValidationError && (
                    <p className="mt-1.5 text-xs text-red-600 font-medium">
                      {chatValidationError}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Controls the maximum number of messages allowed in a chat.
                  </p>
                  {!isAdmin && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block font-medium mt-2">
                      Note: As a Moderator, you can view this setting but cannot modify it.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Video Request Approval */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !actionLoading && setIsConfirmModalOpen(false)}
        title={pendingValue ? "Enable approval for all video requests?" : "Disable approval for all video requests?"}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {pendingValue
              ? "All valid video requests will require moderator/admin approval before becoming available."
              : "Normal unrestricted video requests will be created immediately. Conditionally restricted requests will still require moderator approval."}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleConfirmUpdate}
              isLoading={actionLoading}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mode Switch Safety Confirmation Modal */}
      <Modal
        isOpen={isServiceAreaModalOpen}
        onClose={() => !serviceAreaSaving && setIsServiceAreaModalOpen(false)}
        title={
          targetMode === "RESTRICTED"
            ? "Enable restricted service areas?"
            : "Enable Pan India availability?"
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-900">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                {targetMode === "RESTRICTED"
                  ? "Users will only be able to create and fulfill requests inside the enabled service areas."
                  : "Marketplace location restrictions will be disabled."}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsServiceAreaModalOpen(false)}
              disabled={serviceAreaSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleConfirmModeChange}
            >
              {targetMode === "RESTRICTED" ? "Enable Restrictions" : "Enable Pan India"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
