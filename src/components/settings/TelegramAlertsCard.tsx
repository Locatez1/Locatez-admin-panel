import React, { useEffect, useState } from "react";
import { Send, AlertTriangle } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import {
  getTelegramAlertSettings,
  updateTelegramAlertSettings,
  sendTelegramTestAlert,
  TelegramAlertSettings,
  UpdateTelegramAlertSettingsInput,
} from "../../api/settings.api";
import { Switch } from "../common/Switch";
import { Button } from "../common/Button";

type ToggleField = keyof UpdateTelegramAlertSettingsInput;

const EVENT_TOGGLES: { field: Exclude<ToggleField, "enabled">; label: string; hint: string }[] = [
  {
    field: "requestApproval",
    label: "Request needs approval",
    hint: "A video/image request entered the moderation queue.",
  },
  {
    field: "mediaApproval",
    label: "Fulfilment media needs review",
    hint: "A fulfiller submitted media that must be approved before delivery.",
  },
  {
    field: "userRegistered",
    label: "New user registered",
    hint: "Someone just signed up as a USER.",
  },
];

export const TelegramAlertsCard: React.FC = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<TelegramAlertSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<ToggleField | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getTelegramAlertSettings()
      .then(setSettings)
      .catch((err: any) =>
        setLoadError(err.response?.data?.message || err.message || "Failed to load Telegram settings.")
      );
  }, []);

  const handleToggle = async (field: ToggleField, next: boolean) => {
    if (!settings || savingField) return;
    const previous = settings;
    setSettings({ ...settings, [field]: next });
    setSavingField(field);
    try {
      setSettings(await updateTelegramAlertSettings({ [field]: next }));
    } catch (err: any) {
      setSettings(previous);
      toast.error(err.response?.data?.message || "Failed to update Telegram alerts.");
    } finally {
      setSavingField(null);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await sendTelegramTestAlert();
      toast.success("Test message sent. Check the Telegram group.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send test message.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <Send className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-medium text-gray-900">Telegram Staff Alerts</h2>
      </div>

      <div className="p-6 space-y-4">
        {loadError && (
          <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            {loadError}
          </div>
        )}

        {settings && !settings.configured && (
          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              Telegram is not configured on the server. Set <code>TELEGRAM_BOT_TOKEN</code> and{" "}
              <code>TELEGRAM_CHAT_ID</code> in the backend environment and restart it.
            </span>
          </div>
        )}

        {settings && (
          <>
            <div
              className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                settings.enabled
                  ? "bg-primary-100/40 border-primary-300 ring-1 ring-primary-300/50 shadow-xs"
                  : "bg-white border-neutral-200"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">Send staff alerts to Telegram</p>
                <p className="text-xs text-neutral-500">
                  Mirrors the admin/moderator push notifications into the configured Telegram group.
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onChange={(v) => handleToggle("enabled", v)}
                disabled={savingField !== null}
                label="Send staff alerts to Telegram"
              />
            </div>

            <div className="space-y-2">
              {EVENT_TOGGLES.map(({ field, label, hint }) => (
                <div
                  key={field}
                  className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{label}</p>
                    <p className="text-xs text-neutral-500">{hint}</p>
                  </div>
                  <Switch
                    checked={settings[field]}
                    onChange={(v) => handleToggle(field, v)}
                    disabled={savingField !== null || !settings.enabled}
                    label={label}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                isLoading={testing}
                disabled={!settings.configured || testing}
                onClick={handleTest}
              >
                Send test message
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
