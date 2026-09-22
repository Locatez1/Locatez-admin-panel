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
  getAppEconomySettings,
  updateAppEconomySettings,
  getDynamicCopyWords,
  updateDynamicCopyWords,
} from "../api/settings.api";
import { ServiceAreaSettings, ServiceAreaMode, ServiceArea } from "../types";
import { Switch } from "../components/common/Switch";
import { Modal } from "../components/common/Modal";
import { Button } from "../components/common/Button";
import { Shield, Info, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Globe, MapPin, IndianRupee, Radar, Trash2, Gift, Type, Sparkles } from "lucide-react";

export const Settings: React.FC = () => {
  const { role } = useAuth();
  const { toast } = useToast();

  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  // Video Requests Setting State
  const [requireApproval, setRequireApproval] = useState<boolean>(false);
  const [requireMediaApproval, setRequireMediaApproval] = useState<boolean>(false);
  const [confirmedMediaPendingExpires, setConfirmedMediaPendingExpires] = useState<number>(10);
  const [mediaPendingExpiresInput, setMediaPendingExpiresInput] = useState<string>("10");
  const [mediaExpiresSaving, setMediaExpiresSaving] = useState<boolean>(false);
  const [confirmedMinRewardVideo, setConfirmedMinRewardVideo] = useState<number>(50);
  const [confirmedMinRewardImage, setConfirmedMinRewardImage] = useState<number>(20);
  const [confirmedNearbyRadius, setConfirmedNearbyRadius] = useState<number>(5000);
  const [confirmedMaxConcurrentAccepted, setConfirmedMaxConcurrentAccepted] = useState<number>(3);
  const [minRewardVideoInput, setMinRewardVideoInput] = useState<string>("50");
  const [minRewardImageInput, setMinRewardImageInput] = useState<string>("20");
  const [nearbyRadiusInput, setNearbyRadiusInput] = useState<string>("5000");
  const [maxConcurrentAcceptedInput, setMaxConcurrentAcceptedInput] = useState<string>("3");
  const [economyValidationError, setEconomyValidationError] = useState<string | null>(null);
  const [economySaving, setEconomySaving] = useState<boolean>(false);
  const [mediaCleanupEnabled, setMediaCleanupEnabled] = useState<boolean>(true);
  const [confirmedMediaRetentionHours, setConfirmedMediaRetentionHours] = useState<number>(48);
  const [mediaRetentionHoursInput, setMediaRetentionHoursInput] = useState<string>("48");
  const [mediaRetentionSaving, setMediaRetentionSaving] = useState<boolean>(false);
  const [mediaRetentionError, setMediaRetentionError] = useState<string | null>(null);
  const [welcomeBonusEnabled, setWelcomeBonusEnabled] = useState<boolean>(true);
  const [confirmedWelcomeBonusAmount, setConfirmedWelcomeBonusAmount] = useState<number>(250);
  const [welcomeBonusAmountInput, setWelcomeBonusAmountInput] = useState<string>("250");
  const [welcomeBonusSaving, setWelcomeBonusSaving] = useState(false);
  const [welcomeBonusError, setWelcomeBonusError] = useState<string | null>(null);
  const [dynamicWords, setDynamicWords] = useState<string[]>([]);
  const [confirmedDynamicWords, setConfirmedDynamicWords] = useState<string[]>([]);
  const [newDynamicWord, setNewDynamicWord] = useState("");
  const [dynamicWordsSaving, setDynamicWordsSaving] = useState(false);
  const [dynamicWordsError, setDynamicWordsError] = useState<string | null>(null);
  const [generateDemoDataAfterRegistration, setGenerateDemoDataAfterRegistration] =
    useState<boolean>(false);
  const [confirmedDemoPoiMinDistance, setconfirmedDemoPoiMinDistance] = useState<number>(1000);
  const [demoPoiMinDistanceInput, setdemoPoiMinDistanceInput] = useState<string>("1000");
  const [demoPoiDistanceSaving, setDemoPoiDistanceSaving] = useState(false);
  const [demoPoiDistanceError, setDemoPoiDistanceError] = useState<string | null>(null);
  const [demoPoiCategories, setDemoPoiCategories] = useState<string[]>([]);
  const [confirmedDemoPoiCategories, setConfirmedDemoPoiCategories] = useState<string[]>([]);
  const [newDemoPoiCategory, setNewDemoPoiCategory] = useState("");
  const [demoPoiCategoriesSaving, setDemoPoiCategoriesSaving] = useState(false);
  const [demoPoiCategoriesError, setDemoPoiCategoriesError] = useState<string | null>(null);

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

  // Confirmation Modal for Generate Demo Data After Registration
  const [isDemoConfirmOpen, setIsDemoConfirmOpen] = useState<boolean>(false);
  const [pendingDemoValue, setPendingDemoValue] = useState<boolean>(false);
  const [demoToggleSaving, setDemoToggleSaving] = useState<boolean>(false);

  // Confirmation Modal state for Service Area Mode Switch
  const [isServiceAreaModalOpen, setIsServiceAreaModalOpen] = useState<boolean>(false);
  const [targetMode, setTargetMode] = useState<ServiceAreaMode | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vrData, chatData, saData, economyData, wordsData] = await Promise.all([
        getVideoRequestSettings(),
        getChatSettings(),
        getServiceAreaSettings().catch((saErr) => {
          console.warn("Failed to load service area settings", saErr);
          setServiceAreaError(saErr.response?.data?.message || saErr.message || "Failed to load service area configuration.");
          return null;
        }),
        getAppEconomySettings().catch(() => null),
        getDynamicCopyWords().catch(() => [] as string[]),
      ]);

      setRequireApproval(!!vrData.requireApprovalForAll);
      setRequireMediaApproval(!!vrData.requireFulfilmentMediaApproval);
      setConfirmedMediaPendingExpires(vrData.fulfilmentMediaPendingExpiresInMinutes ?? 10);
      setMediaPendingExpiresInput(String(vrData.fulfilmentMediaPendingExpiresInMinutes ?? 10));
      setConfirmedMinRewardVideo(vrData.minRewardVideo);
      setConfirmedMinRewardImage(vrData.minRewardImage);
      setConfirmedNearbyRadius(vrData.nearbyRadiusMeters);
      setConfirmedMaxConcurrentAccepted(vrData.maxConcurrentAcceptedRequests ?? 3);
      setMinRewardVideoInput(String(vrData.minRewardVideo));
      setMinRewardImageInput(String(vrData.minRewardImage));
      setNearbyRadiusInput(String(vrData.nearbyRadiusMeters));
      setMaxConcurrentAcceptedInput(String(vrData.maxConcurrentAcceptedRequests ?? 3));
      setEconomyValidationError(null);
      setMediaCleanupEnabled(vrData.mediaCleanupEnabled !== false);
      setConfirmedMediaRetentionHours(vrData.mediaRetentionHours ?? 48);
      setMediaRetentionHoursInput(String(vrData.mediaRetentionHours ?? 48));
      setMediaRetentionError(null);
      setGenerateDemoDataAfterRegistration(!!vrData.generateDemoDataAfterRegistration);
      setconfirmedDemoPoiMinDistance(vrData.demoPoiMinDistanceMeters ?? 1000);
      setdemoPoiMinDistanceInput(String(vrData.demoPoiMinDistanceMeters ?? 1000));
      setDemoPoiDistanceError(null);
      const cats = Array.isArray(vrData.demoPoiCategories) ? vrData.demoPoiCategories : [];
      setDemoPoiCategories(cats);
      setConfirmedDemoPoiCategories(cats);
      setDemoPoiCategoriesError(null);

      if (economyData) {
        setWelcomeBonusEnabled(economyData.welcomeBonusEnabled !== false);
        setConfirmedWelcomeBonusAmount(economyData.welcomeBonusAmount);
        setWelcomeBonusAmountInput(String(economyData.welcomeBonusAmount));
      }
      const wordsList = Array.isArray(wordsData) ? wordsData : [];
      setDynamicWords(wordsList);
      setConfirmedDynamicWords(wordsList);
      setDynamicWordsError(null);

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

  const handleSaveMediaPendingExpires = async () => {
    if (!isAdmin || mediaExpiresSaving) return;
    const minutes = parseInt(mediaPendingExpiresInput, 10);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080) {
      toast.error("Pending expiry must be an integer between 1 and 10080 minutes.");
      return;
    }
    setMediaExpiresSaving(true);
    try {
      const updated = await updateVideoRequestSettings({
        fulfilmentMediaPendingExpiresInMinutes: minutes,
      });
      setConfirmedMediaPendingExpires(updated.fulfilmentMediaPendingExpiresInMinutes);
      setMediaPendingExpiresInput(String(updated.fulfilmentMediaPendingExpiresInMinutes));
      toast.success("Fulfilment media pending expiry updated.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update pending expiry.");
    } finally {
      setMediaExpiresSaving(false);
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

  const validateMaxConcurrentAccepted = (value: string): string | null => {
    if (!value || value.trim() === "") return "Max concurrent accepted requests is required.";
    const num = Number(value);
    if (isNaN(num)) return "Max concurrent accepted requests must be a valid number.";
    if (!Number.isInteger(num) || value.includes(".")) {
      return "Max concurrent accepted requests must be a whole number.";
    }
    if (num < 1 || num > 100) {
      return "Max concurrent accepted requests must be between 1 and 100.";
    }
    return null;
  };

  const validateEconomyInputs = (): string | null =>
    validatePositiveMoney(minRewardVideoInput, "Minimum video reward") ||
    validatePositiveMoney(minRewardImageInput, "Minimum image reward") ||
    validateNearbyRadius(nearbyRadiusInput) ||
    validateMaxConcurrentAccepted(maxConcurrentAcceptedInput);

  const handleEconomyFieldChange = (
    field: "video" | "image" | "radius" | "maxConcurrent",
    value: string
  ) => {
    if (field === "video") setMinRewardVideoInput(value);
    else if (field === "image") setMinRewardImageInput(value);
    else if (field === "radius") setNearbyRadiusInput(value);
    else setMaxConcurrentAcceptedInput(value);

    const nextVideo = field === "video" ? value : minRewardVideoInput;
    const nextImage = field === "image" ? value : minRewardImageInput;
    const nextRadius = field === "radius" ? value : nearbyRadiusInput;
    const nextMaxConcurrent = field === "maxConcurrent" ? value : maxConcurrentAcceptedInput;
    setEconomyValidationError(
      validatePositiveMoney(nextVideo, "Minimum video reward") ||
        validatePositiveMoney(nextImage, "Minimum image reward") ||
        validateNearbyRadius(nextRadius) ||
        validateMaxConcurrentAccepted(nextMaxConcurrent)
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
    const maxConcurrentAcceptedRequests = parseInt(maxConcurrentAcceptedInput, 10);

    const unchanged =
      minRewardVideo === confirmedMinRewardVideo &&
      minRewardImage === confirmedMinRewardImage &&
      nearbyRadiusMeters === confirmedNearbyRadius &&
      maxConcurrentAcceptedRequests === confirmedMaxConcurrentAccepted;
    if (unchanged) return;

    setEconomySaving(true);
    try {
      const updated = await updateVideoRequestSettings({
        minRewardVideo,
        minRewardImage,
        nearbyRadiusMeters,
        maxConcurrentAcceptedRequests,
      });
      setConfirmedMinRewardVideo(updated.minRewardVideo);
      setConfirmedMinRewardImage(updated.minRewardImage);
      setConfirmedNearbyRadius(updated.nearbyRadiusMeters);
      setConfirmedMaxConcurrentAccepted(updated.maxConcurrentAcceptedRequests);
      setMinRewardVideoInput(String(updated.minRewardVideo));
      setMinRewardImageInput(String(updated.minRewardImage));
      setNearbyRadiusInput(String(updated.nearbyRadiusMeters));
      setMaxConcurrentAcceptedInput(String(updated.maxConcurrentAcceptedRequests));
      setEconomyValidationError(null);
      toast.success("Request economy settings updated successfully.");
    } catch (err: any) {
      setMinRewardVideoInput(String(confirmedMinRewardVideo));
      setMinRewardImageInput(String(confirmedMinRewardImage));
      setNearbyRadiusInput(String(confirmedNearbyRadius));
      setMaxConcurrentAcceptedInput(String(confirmedMaxConcurrentAccepted));
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
      parseInt(nearbyRadiusInput, 10) === confirmedNearbyRadius &&
      parseInt(maxConcurrentAcceptedInput, 10) === confirmedMaxConcurrentAccepted);

  const validateMediaRetentionHours = (value: string): string | null => {
    if (!value || value.trim() === "") return "Retention hours is required.";
    const num = Number(value);
    if (!Number.isInteger(num) || value.includes(".")) {
      return "Retention hours must be a whole number.";
    }
    if (num < 1 || num > 8760) {
      return "Retention hours must be between 1 and 8760.";
    }
    return null;
  };

  const handleMediaRetentionInputChange = (value: string) => {
    setMediaRetentionHoursInput(value);
    setMediaRetentionError(validateMediaRetentionHours(value));
  };

  const handleToggleMediaCleanup = async (next: boolean) => {
    if (!isAdmin || mediaRetentionSaving) return;
    const prev = mediaCleanupEnabled;
    setMediaCleanupEnabled(next);
    setMediaRetentionSaving(true);
    try {
      const updated = await updateVideoRequestSettings({ mediaCleanupEnabled: next });
      setMediaCleanupEnabled(!!updated.mediaCleanupEnabled);
      toast.success(
        next
          ? "Nightly media cleanup enabled (12:00 AM IST)."
          : "Nightly media cleanup disabled."
      );
    } catch (err: any) {
      setMediaCleanupEnabled(prev);
      toast.error(err.response?.data?.message || "Failed to update media cleanup setting.");
    } finally {
      setMediaRetentionSaving(false);
    }
  };

  const handleSaveMediaRetentionHours = async () => {
    if (!isAdmin || mediaRetentionSaving) return;
    const err = validateMediaRetentionHours(mediaRetentionHoursInput);
    if (err) {
      setMediaRetentionError(err);
      return;
    }
    const hours = parseInt(mediaRetentionHoursInput, 10);
    if (hours === confirmedMediaRetentionHours) return;

    setMediaRetentionSaving(true);
    try {
      const updated = await updateVideoRequestSettings({ mediaRetentionHours: hours });
      setConfirmedMediaRetentionHours(updated.mediaRetentionHours);
      setMediaRetentionHoursInput(String(updated.mediaRetentionHours));
      setMediaRetentionError(null);
      toast.success("Media retention hours updated.");
    } catch (err: any) {
      setMediaRetentionHoursInput(String(confirmedMediaRetentionHours));
      setMediaRetentionError(null);
      toast.error(err.response?.data?.message || "Failed to update media retention hours.");
    } finally {
      setMediaRetentionSaving(false);
    }
  };

  const handleDemoToggleClick = (newValue: boolean) => {
    if (!isAdmin || demoToggleSaving) return;
    setPendingDemoValue(newValue);
    setIsDemoConfirmOpen(true);
  };

  const handleConfirmDemoToggle = async () => {
    if (!isAdmin || demoToggleSaving) return;
    const previous = generateDemoDataAfterRegistration;
    const target = pendingDemoValue;
    setIsDemoConfirmOpen(false);
    setGenerateDemoDataAfterRegistration(target);
    setDemoToggleSaving(true);
    try {
      const updated = await updateVideoRequestSettings({
        generateDemoDataAfterRegistration: target,
      });
      setGenerateDemoDataAfterRegistration(!!updated.generateDemoDataAfterRegistration);
      toast.success(
        target
          ? "Demo request generation after registration enabled."
          : "Demo request generation after registration disabled. Already-scheduled jobs will be skipped."
      );
    } catch (err: any) {
      setGenerateDemoDataAfterRegistration(previous);
      toast.error(
        err.response?.data?.message || "Failed to update demo generation setting."
      );
    } finally {
      setDemoToggleSaving(false);
    }
  };

  const validateDemoPoiDistance = (value: string): string | null => {
    const n = parseInt(value, 10);
    if (!Number.isInteger(n) || n < 50 || n > 1_000_000) {
      return "Demo POI min distance must be an integer between 50 and 1000000 meters.";
    }
    return null;
  };

  const handleSaveDemoPoiDistance = async () => {
    if (!isAdmin || demoPoiDistanceSaving) return;
    const err = validateDemoPoiDistance(demoPoiMinDistanceInput);
    if (err) {
      setDemoPoiDistanceError(err);
      return;
    }
    const meters = parseInt(demoPoiMinDistanceInput, 10);
    setDemoPoiDistanceSaving(true);
    setDemoPoiDistanceError(null);
    try {
      const updated = await updateVideoRequestSettings({
        demoPoiMinDistanceMeters: meters,
      });
      setconfirmedDemoPoiMinDistance(updated.demoPoiMinDistanceMeters);
      setdemoPoiMinDistanceInput(String(updated.demoPoiMinDistanceMeters));
      toast.success("Demo POI min distance updated.");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update demo POI distance.");
    } finally {
      setDemoPoiDistanceSaving(false);
    }
  };

  const normalizeDemoCategory = (raw: string) =>
    raw.trim().toLowerCase().replace(/\s+/g, "_");

  const handleAddDemoPoiCategory = () => {
    const cat = normalizeDemoCategory(newDemoPoiCategory);
    if (!cat) return;
    if (cat.length > 64) {
      setDemoPoiCategoriesError("Each category must be at most 64 characters.");
      return;
    }
    if (demoPoiCategories.includes(cat)) {
      setDemoPoiCategoriesError("That category is already in the list.");
      return;
    }
    if (demoPoiCategories.length >= 50) {
      setDemoPoiCategoriesError("Maximum 50 categories.");
      return;
    }
    setDemoPoiCategories((prev) => [...prev, cat]);
    setNewDemoPoiCategory("");
    setDemoPoiCategoriesError(null);
  };

  const handleSaveDemoPoiCategories = async () => {
    if (!isAdmin || demoPoiCategoriesSaving) return;
    if (demoPoiCategories.length === 0) {
      setDemoPoiCategoriesError("Add at least one Mapbox POI category.");
      return;
    }
    setDemoPoiCategoriesSaving(true);
    try {
      const updated = await updateVideoRequestSettings({
        demoPoiCategories,
      });
      setDemoPoiCategories(updated.demoPoiCategories);
      setConfirmedDemoPoiCategories(updated.demoPoiCategories);
      setDemoPoiCategoriesError(null);
      toast.success("Demo POI categories updated.");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to update demo POI categories.");
    } finally {
      setDemoPoiCategoriesSaving(false);
    }
  };

  const handleToggleWelcomeBonus = async (next: boolean) => {
    if (!isAdmin || welcomeBonusSaving) return;
    const prev = welcomeBonusEnabled;
    setWelcomeBonusEnabled(next);
    setWelcomeBonusSaving(true);
    try {
      const updated = await updateAppEconomySettings({ welcomeBonusEnabled: next });
      setWelcomeBonusEnabled(!!updated.welcomeBonusEnabled);
      toast.success(next ? "Welcome bonus enabled." : "Welcome bonus disabled.");
    } catch (err: any) {
      setWelcomeBonusEnabled(prev);
      toast.error(err.response?.data?.message || "Failed to update welcome bonus.");
    } finally {
      setWelcomeBonusSaving(false);
    }
  };

  const handleSaveWelcomeBonusAmount = async () => {
    if (!isAdmin || welcomeBonusSaving) return;
    const amount = Number(welcomeBonusAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setWelcomeBonusError("Welcome bonus amount must be greater than 0.");
      return;
    }
    if (amount === confirmedWelcomeBonusAmount) return;
    setWelcomeBonusSaving(true);
    try {
      const updated = await updateAppEconomySettings({ welcomeBonusAmount: amount });
      setConfirmedWelcomeBonusAmount(updated.welcomeBonusAmount);
      setWelcomeBonusAmountInput(String(updated.welcomeBonusAmount));
      setWelcomeBonusError(null);
      toast.success("Welcome bonus amount updated.");
    } catch (err: any) {
      setWelcomeBonusAmountInput(String(confirmedWelcomeBonusAmount));
      toast.error(err.response?.data?.message || "Failed to update welcome bonus amount.");
    } finally {
      setWelcomeBonusSaving(false);
    }
  };

  const handleAddDynamicWord = () => {
    const word = newDynamicWord.trim();
    if (!word) return;
    if (word.length > 40) {
      setDynamicWordsError("Each word must be at most 40 characters.");
      return;
    }
    if (dynamicWords.some((w) => w.toLowerCase() === word.toLowerCase())) {
      setDynamicWordsError("That word is already in the list.");
      return;
    }
    setDynamicWords((prev) => [...prev, word]);
    setNewDynamicWord("");
    setDynamicWordsError(null);
  };

  const handleRemoveDynamicWord = (word: string) => {
    setDynamicWords((prev) => prev.filter((w) => w !== word));
    setDynamicWordsError(null);
  };

  const handleSaveDynamicWords = async () => {
    if (!isAdmin || dynamicWordsSaving) return;
    if (dynamicWords.length === 0) {
      setDynamicWordsError("Add at least one word.");
      return;
    }
    setDynamicWordsSaving(true);
    try {
      const saved = await updateDynamicCopyWords(dynamicWords);
      setDynamicWords(saved);
      setConfirmedDynamicWords(saved);
      setDynamicWordsError(null);
      toast.success("Dynamic words saved.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save dynamic words.");
    } finally {
      setDynamicWordsSaving(false);
    }
  };

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
                        <div className="space-y-2">
                          {pendingAreas.map((area) => (
                            <div
                              key={area.id}
                              className={`p-4 flex items-center justify-between gap-4 rounded-xl border transition-all duration-150 ${
                                area.enabled
                                  ? "bg-primary-100/40 border-primary-300 ring-1 ring-primary-300/40 shadow-2xs"
                                  : "bg-white border-neutral-200 hover:bg-neutral-50/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <MapPin className={`h-4 w-4 shrink-0 ${area.enabled ? "text-primary-600" : "text-neutral-400"}`} />
                                <div>
                                  <p className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                                    <span>{area.name}</span>
                                    {area.enabled && (
                                      <span className="text-[10px] bg-primary-100 text-primary-900 font-semibold px-2 py-0.2 rounded-full border border-primary-300">
                                        Active Area
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-neutral-500">
                                    {area.countryCode === "IN" ? "India" : area.countryCode}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-semibold ${area.enabled ? "text-green-800" : "text-neutral-400"}`}>
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
              <div className={`p-4 rounded-xl border transition-all duration-200 ${requireApproval ? "bg-primary-100/40 border-primary-300 ring-1 ring-primary-300/50 shadow-xs" : "bg-white border-neutral-200"}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-1">
                    <label
                      htmlFor="video-approval-switch"
                      className="text-base font-medium text-neutral-900 cursor-pointer flex items-center gap-2"
                    >
                      <span>Require approval for creating any video request</span>
                      {requireApproval && (
                        <span className="text-xs bg-primary-100 text-primary-900 font-semibold px-2 py-0.5 rounded-full border border-primary-300">
                          Active
                        </span>
                      )}
                    </label>
                    <p className="text-sm text-neutral-600 leading-relaxed max-w-2xl">
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
                      label="Require approval for creating any video request"
                    />
                  </div>
                </div>
              </div>

              {/* Clarification Box / Matrix Card */}
              <div className="rounded-xl bg-primary-100/30 p-4 border border-primary-200/60 space-y-3">
                <div className="flex items-center gap-2 text-primary-950 font-semibold text-sm">
                  <Info className="h-4.5 w-4.5 text-primary-600 flex-shrink-0" />
                  <span>Restriction Policy & Approval Matrix</span>
                </div>
                <p className="text-xs text-primary-900 leading-normal">
                  This switch specifically controls approval requirements for <strong>otherwise-valid video requests</strong>. It does not override or allow hard-restricted locations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  {/* Card 1: Switch OFF (Default Mode) */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all duration-200 ${
                      !requireApproval
                        ? "bg-white border-2 border-primary-500 ring-2 ring-primary-500/20 shadow-md transform scale-[1.01]"
                        : "bg-white/60 border-neutral-200 text-neutral-500 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between mb-2">
                      <span className={!requireApproval ? "text-neutral-900 font-bold" : "text-neutral-600"}>
                        When Switch is OFF:
                      </span>
                      {!requireApproval ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="h-3 w-3" /> Active Policy
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600 font-medium text-[10px]">
                          Default Mode
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-neutral-700">
                      <li className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        <span><strong>HARD:</strong> Blocked</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        <span><strong>CONDITIONAL:</strong> Moderator approval</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        <span><strong>NORMAL:</strong> Created normally</span>
                      </li>
                    </ul>
                  </div>

                  {/* Card 2: Switch ON (Strict Mode) */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all duration-200 ${
                      requireApproval
                        ? "bg-white border-2 border-primary-500 ring-2 ring-primary-500/20 shadow-md transform scale-[1.01]"
                        : "bg-white/60 border-neutral-200 text-neutral-500 opacity-60 hover:opacity-80"
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between mb-2">
                      <span className={requireApproval ? "text-neutral-900 font-bold" : "text-neutral-600"}>
                        When Switch is ON:
                      </span>
                      {requireApproval ? (
                        <span className="px-2 py-0.5 rounded-full bg-primary-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 className="h-3 w-3" /> Active Policy
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600 font-medium text-[10px]">
                          Strict Mode
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-neutral-700">
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

              <div className={`p-4 rounded-xl border transition-all duration-200 ${requireMediaApproval ? "bg-primary-100/40 border-primary-300 ring-1 ring-primary-300/50 shadow-xs" : "bg-white border-neutral-200"}`}>
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-1">
                    <label
                      htmlFor="media-approval-switch"
                      className="text-base font-medium text-neutral-900 cursor-pointer flex items-center gap-2"
                    >
                      <span>Require approval for fulfilment media</span>
                      {requireMediaApproval && (
                        <span className="text-xs bg-primary-100 text-primary-900 font-semibold px-2 py-0.5 rounded-full border border-primary-300">
                          Active
                        </span>
                      )}
                    </label>
                    <p className="text-sm text-neutral-600 leading-relaxed max-w-2xl">
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
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-3">
                <div className="space-y-1">
                  <label
                    htmlFor="media-pending-expires"
                    className="text-base font-medium text-gray-900"
                  >
                    Fulfilment media pending auto-approve (minutes)
                  </label>
                  <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                    When media is waiting for moderator approval, it is auto-approved after this many minutes
                    if not reviewed. Used for the app countdown timer.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <input
                      id="media-pending-expires"
                      type="number"
                      min={1}
                      max={10080}
                      disabled={!isAdmin || mediaExpiresSaving}
                      value={mediaPendingExpiresInput}
                      onChange={(e) => setMediaPendingExpiresInput(e.target.value)}
                      className="block w-32 rounded-md border-0 py-1.5 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !isAdmin ||
                      mediaExpiresSaving ||
                      parseInt(mediaPendingExpiresInput, 10) === confirmedMediaPendingExpires
                    }
                    isLoading={mediaExpiresSaving}
                    onClick={handleSaveMediaPendingExpires}
                  >
                    Save
                  </Button>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <form onSubmit={handleSaveEconomySettings} className="space-y-5">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-medium text-gray-900">Minimum rewards & nearby radius</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    These values apply when users create video/image requests, when nearby discovery uses the default radius, and when capping how many accepted/ongoing requests a fulfiller can hold at once.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <div>
                      <label htmlFor="max-concurrent-accepted" className="block text-sm font-medium text-gray-900 mb-1">
                        Max concurrent accepts
                      </label>
                      <input
                        id="max-concurrent-accepted"
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        disabled={!isAdmin || economySaving}
                        value={maxConcurrentAcceptedInput}
                        onChange={(e) => handleEconomyFieldChange("maxConcurrent", e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Limit on ACCEPTED + ongoing requests per fulfiller.
                      </p>
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

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-medium text-gray-900">S3 media retention</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Every day at <strong>12:00 AM IST</strong>, delete aged media for{" "}
                  <strong>request fulfilment</strong> (and related chat delivery) and{" "}
                  <strong>marketplace</strong> listings. Ideas and popular places are never deleted.
                </p>

                <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200 ${mediaCleanupEnabled ? "bg-primary-100/40 border-primary-300 ring-1 ring-primary-300/50 shadow-xs" : "bg-white border-neutral-200"}`}>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                      <span>Enable nightly cleanup</span>
                      {mediaCleanupEnabled && (
                        <span className="text-xs bg-primary-100 text-primary-900 font-semibold px-2 py-0.5 rounded-full border border-primary-300">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">Admin-controlled on/off for the IST midnight job.</p>
                  </div>
                  <Switch
                    checked={mediaCleanupEnabled}
                    onChange={handleToggleMediaCleanup}
                    disabled={!isAdmin || mediaRetentionSaving}
                  />
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor="media-retention-hours"
                      className="block text-sm font-medium text-gray-900 mb-1"
                    >
                      Retention hours
                    </label>
                    <input
                      id="media-retention-hours"
                      type="number"
                      min="1"
                      max="8760"
                      step="1"
                      disabled={!isAdmin || mediaRetentionSaving || !mediaCleanupEnabled}
                      value={mediaRetentionHoursInput}
                      onChange={(e) => handleMediaRetentionInputChange(e.target.value)}
                      className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Media older than this many hours is eligible (default 48).
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !isAdmin ||
                      mediaRetentionSaving ||
                      !mediaCleanupEnabled ||
                      !!mediaRetentionError ||
                      parseInt(mediaRetentionHoursInput, 10) === confirmedMediaRetentionHours
                    }
                    isLoading={mediaRetentionSaving}
                    onClick={handleSaveMediaRetentionHours}
                  >
                    Save retention
                  </Button>
                </div>

                {mediaRetentionError && (
                  <p className="text-xs text-red-600 font-medium">{mediaRetentionError}</p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-medium text-gray-900">
                    Generate Demo Requests After Registration
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  Automatically generate a shared nearby demo request 30 minutes after a user
                  registers when no eligible nearby request exists. The request is created by an
                  admin account so the new user can discover and accept it in Nearby.
                </p>
                <div
                  className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                    generateDemoDataAfterRegistration
                      ? "bg-primary-100/40 border-primary-300 ring-1 ring-primary-300/50 shadow-xs"
                      : "bg-white border-neutral-200"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                      <span>Generate demo data after registration</span>
                      {generateDemoDataAfterRegistration && (
                        <span className="text-xs bg-primary-100 text-primary-900 font-semibold px-2 py-0.5 rounded-full border border-primary-300">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Places a shared demo pin between the min distance and nearby radius using the
                      Mapbox categories below. Disabling skips already scheduled jobs without
                      creating requests.
                    </p>
                  </div>
                  <Switch
                    checked={generateDemoDataAfterRegistration}
                    onChange={handleDemoToggleClick}
                    disabled={!isAdmin || demoToggleSaving}
                  />
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor="demo-poi-max-distance"
                      className="block text-sm font-medium text-gray-900 mb-1"
                    >
                      Demo POI min distance (meters)
                    </label>
                    <input
                      id="demo-poi-max-distance"
                      type="number"
                      min={50}
                      max={1_000_000}
                      step={50}
                      value={demoPoiMinDistanceInput}
                      onChange={(e) => {
                        setdemoPoiMinDistanceInput(e.target.value);
                        setDemoPoiDistanceError(validateDemoPoiDistance(e.target.value));
                      }}
                      className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      disabled={!isAdmin || demoPoiDistanceSaving}
                    />
                    <p className="mt-1 text-xs text-neutral-500">
                      Default 1000 (1 km). Demo pins are placed between this minimum and the nearby
                      radius ({confirmedNearbyRadius} m). Must be less than nearby radius.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !isAdmin ||
                      demoPoiDistanceSaving ||
                      !!demoPoiDistanceError ||
                      parseInt(demoPoiMinDistanceInput, 10) === confirmedDemoPoiMinDistance
                    }
                    isLoading={demoPoiDistanceSaving}
                    onClick={handleSaveDemoPoiDistance}
                  >
                    Save distance
                  </Button>
                </div>
                {demoPoiDistanceError && (
                  <p className="text-xs text-red-600 font-medium">{demoPoiDistanceError}</p>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">
                    Demo Mapbox POI categories
                  </label>
                  <p className="text-xs text-neutral-500">
                    Mapbox Search Box category ids (e.g. park, cafe, restaurant, temple). Used when
                    picking the demo location near the user.
                  </p>
                  <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {demoPoiCategories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800"
                      >
                        {cat}
                        {isAdmin && (
                          <button
                            type="button"
                            className="text-gray-400 hover:text-red-600 leading-none"
                            onClick={() =>
                              setDemoPoiCategories((prev) => prev.filter((c) => c !== cat))
                            }
                            disabled={demoPoiCategoriesSaving}
                            aria-label={`Remove ${cat}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {demoPoiCategories.length === 0 && (
                      <span className="text-xs text-gray-400">No categories yet.</span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. park"
                        value={newDemoPoiCategory}
                        onChange={(e) => setNewDemoPoiCategory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDemoPoiCategory();
                          }
                        }}
                        className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
                        disabled={demoPoiCategoriesSaving}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleAddDemoPoiCategory}
                        disabled={demoPoiCategoriesSaving}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        isLoading={demoPoiCategoriesSaving}
                        disabled={
                          demoPoiCategoriesSaving ||
                          demoPoiCategories.length === 0 ||
                          (demoPoiCategories.length === confirmedDemoPoiCategories.length &&
                            demoPoiCategories.every((c, i) => c === confirmedDemoPoiCategories[i]))
                        }
                        onClick={handleSaveDemoPoiCategories}
                      >
                        Save categories
                      </Button>
                    </div>
                  )}
                  {demoPoiCategoriesError && (
                    <p className="text-xs text-red-600 font-medium">{demoPoiCategoriesError}</p>
                  )}
                </div>

                {!isAdmin && (
                  <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block font-medium">
                    Note: As a Moderator, you can view this setting but cannot modify it.
                  </p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-medium text-gray-900">Welcome bonus</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Credit new USER accounts on registration (password, OTP, Firebase, or admin create).
                </p>
                <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200 ${welcomeBonusEnabled ? "bg-primary-100/40 border-primary-300 ring-1 ring-primary-300/50 shadow-xs" : "bg-white border-neutral-200"}`}>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                      <span>Enable welcome bonus</span>
                      {welcomeBonusEnabled && (
                        <span className="text-xs bg-primary-100 text-primary-900 font-semibold px-2 py-0.5 rounded-full border border-primary-300">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">When off, new users get a wallet with ₹0 credit.</p>
                  </div>
                  <Switch
                    checked={welcomeBonusEnabled}
                    onChange={handleToggleWelcomeBonus}
                    disabled={!isAdmin || welcomeBonusSaving}
                  />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="welcome-bonus-amount" className="block text-sm font-medium text-gray-900 mb-1">
                      Bonus amount (INR)
                    </label>
                    <input
                      id="welcome-bonus-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      disabled={!isAdmin || welcomeBonusSaving || !welcomeBonusEnabled}
                      value={welcomeBonusAmountInput}
                      onChange={(e) => {
                        setWelcomeBonusAmountInput(e.target.value);
                        setWelcomeBonusError(null);
                      }}
                      className="block w-40 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      !isAdmin ||
                      welcomeBonusSaving ||
                      !welcomeBonusEnabled ||
                      Number(welcomeBonusAmountInput) === confirmedWelcomeBonusAmount
                    }
                    isLoading={welcomeBonusSaving}
                    onClick={handleSaveWelcomeBonusAmount}
                  >
                    Save amount
                  </Button>
                </div>
                {welcomeBonusError && (
                  <p className="text-xs text-red-600 font-medium">{welcomeBonusError}</p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-medium text-gray-900">Dynamic copy words</h3>
                </div>
                <p className="text-sm text-gray-600">
                  Words used for rotating UI copy across client applications (e.g. explore, watch, see).
                </p>
                <div className="flex flex-wrap gap-2">
                  {dynamicWords.map((word) => (
                    <span
                      key={word}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-800"
                    >
                      {word}
                      {isAdmin && (
                        <button
                          type="button"
                          className="text-gray-400 hover:text-red-600"
                          onClick={() => handleRemoveDynamicWord(word)}
                          disabled={dynamicWordsSaving}
                          aria-label={`Remove ${word}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {dynamicWords.length === 0 && (
                    <span className="text-xs text-gray-400">No words yet.</span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      maxLength={40}
                      placeholder="Add a word"
                      value={newDynamicWord}
                      onChange={(e) => setNewDynamicWord(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddDynamicWord();
                        }
                      }}
                      className="block w-48 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      disabled={dynamicWordsSaving}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={handleAddDynamicWord} disabled={dynamicWordsSaving}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      isLoading={dynamicWordsSaving}
                      disabled={
                        dynamicWordsSaving ||
                        dynamicWords.length === 0 ||
                        (dynamicWords.length === confirmedDynamicWords.length &&
                          dynamicWords.every((w, i) => w === confirmedDynamicWords[i]))
                      }
                      onClick={handleSaveDynamicWords}
                    >
                      Save words
                    </Button>
                  </div>
                )}
                {dynamicWordsError && (
                  <p className="text-xs text-red-600 font-medium">{dynamicWordsError}</p>
                )}
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
        title={pendingValue ? "Enable approval for creating any video request?" : "Disable approval for creating any video request?"}
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

      {/* Confirmation Modal for Demo Generation */}
      <Modal
        isOpen={isDemoConfirmOpen}
        onClose={() => !demoToggleSaving && setIsDemoConfirmOpen(false)}
        title={
          pendingDemoValue
            ? "Enable demo requests after registration?"
            : "Disable demo requests after registration?"
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {pendingDemoValue
              ? "About 30 minutes after each new USER registers, the worker may create one shared nearby DEMO request if none already exists in range."
              : "New registrations will no longer schedule demo jobs. Jobs already scheduled will be skipped by the worker and will not create demo requests."}
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsDemoConfirmOpen(false)}
              disabled={demoToggleSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleConfirmDemoToggle}
              isLoading={demoToggleSaving}
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
