import React, { useState } from "react";
import { Bell, Send, AlertTriangle } from "lucide-react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Modal } from "../components/common/Modal";
import { useToast } from "../context/ToastContext";
import {
  broadcastPushNotification,
  type BroadcastAudience,
} from "../api/notifications.api";

export const BroadcastNotifications: React.FC = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("marketing");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const validate = () => {
    if (!title.trim()) return "Title is required.";
    if (title.trim().length > 120) return "Title must be at most 120 characters.";
    if (!body.trim()) return "Body is required.";
    if (body.trim().length > 500) return "Body must be at most 500 characters.";
    return null;
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    setSending(true);
    setFormError(null);
    try {
      const res = await broadcastPushNotification({
        title: title.trim(),
        body: body.trim(),
        audience,
      });
      const data = res.data;
      const summary = `Sent to ${data.recipientUserCount} user(s) with devices — ${data.successCount} delivered, ${data.failureCount} failed.`;
      setLastResult(summary);
      toast.success(summary);
      setConfirmOpen(false);
      setTitle("");
      setBody("");
      setAudience("marketing");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to send broadcast";
      setFormError(msg);
      toast.error(msg);
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary-600" />
          Broadcast notifications
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Send an FCM push to users who have registered a device token.
        </p>
      </div>

      <form
        onSubmit={handleOpenConfirm}
        className="max-w-xl space-y-5 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs"
      >
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Weekend bonus live"
          maxLength={120}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Notification message…"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <p className="mt-1 text-xs text-neutral-400">{body.length}/500</p>
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-neutral-700">Audience</legend>

          <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
            <input
              type="radio"
              name="audience"
              className="mt-1"
              checked={audience === "marketing"}
              onChange={() => setAudience("marketing")}
            />
            <span>
              <span className="block text-sm font-medium text-neutral-900">
                Marketing preference users
              </span>
              <span className="block text-xs text-neutral-500">
                Only users with marketing notifications enabled (and push on). Marketing
                defaults to on for new users.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3 hover:bg-amber-50">
            <input
              type="radio"
              name="audience"
              className="mt-1"
              checked={audience === "all"}
              onChange={() => setAudience("all")}
            />
            <span>
              <span className="block text-sm font-medium text-neutral-900">
                Force all device users
              </span>
              <span className="block text-xs text-neutral-500">
                Ignores marketing opt-out. Still skips users who turned off all push
                notifications.
              </span>
            </span>
          </label>
        </fieldset>

        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        {lastResult && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {lastResult}
          </div>
        )}

        <Button type="submit" disabled={sending} className="inline-flex items-center gap-2">
          <Send className="h-4 w-4" />
          Review &amp; send
        </Button>
      </form>

      <Modal
        isOpen={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        title="Confirm broadcast"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Send this notification to{" "}
            <strong>
              {audience === "all"
                ? "all users with active devices (force)"
                : "users with marketing preference enabled"}
            </strong>
            ?
          </p>
          <div className="rounded-lg bg-neutral-50 p-3 text-sm">
            <p className="font-semibold text-neutral-900">{title.trim()}</p>
            <p className="mt-1 whitespace-pre-wrap text-neutral-600">{body.trim()}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={sending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={sending} onClick={handleSend}>
              {sending ? "Sending…" : "Send now"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
