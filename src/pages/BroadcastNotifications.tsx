import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Send, AlertTriangle, Search } from "lucide-react";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Modal } from "../components/common/Modal";
import { useToast } from "../context/ToastContext";
import {
  broadcastPushNotification,
  type BroadcastAudience,
} from "../api/notifications.api";
import { getUsers } from "../api/users.api";
import type { User } from "../types";

type TargetMode = "all" | "users";

type SelectedUser = {
  id: string;
  label: string;
};

const userLabel = (user: User) =>
  String(
    user.username ||
      user.email ||
      user.phone ||
      user.profile?.fullName ||
      user.id
  );

export const BroadcastNotifications: React.FC = () => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("marketing");
  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [listedUsers, setListedUsers] = useState<User[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const loadingMoreRef = useRef(false);

  const selectedIds = useMemo(
    () => new Set(selectedUsers.map((u) => u.id)),
    [selectedUsers]
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (targetMode !== "users") return;
    let cancelled = false;
    loadingMoreRef.current = false;

    const load = async () => {
      setLoadingUsers(true);
      try {
        const params: Record<string, string | number> = {
          page: 1,
          limit: 50,
          status: "ACTIVE",
        };
        if (debouncedSearch) params.search = debouncedSearch;
        const res = await getUsers(params);
        const items = Array.isArray(res?.data) ? res.data : [];
        if (cancelled) return;
        setListedUsers(items);
        setListPage(1);
        setListTotalPages(res?.meta?.totalPages || 1);
      } catch {
        if (!cancelled) setListedUsers([]);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [targetMode, debouncedSearch]);

  const fetchNextPage = async () => {
    if (loadingUsers || loadingMoreRef.current) return;
    if (listPage >= listTotalPages) return;
    loadingMoreRef.current = true;
    setLoadingUsers(true);
    try {
      const nextPage = listPage + 1;
      const params: Record<string, string | number> = {
        page: nextPage,
        limit: 50,
        status: "ACTIVE",
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await getUsers(params);
      const items = Array.isArray(res?.data) ? res.data : [];
      setListedUsers((prev) => [...prev, ...items]);
      setListPage(nextPage);
      setListTotalPages(res?.meta?.totalPages || 1);
    } catch {
      /* keep existing list */
    } finally {
      loadingMoreRef.current = false;
      setLoadingUsers(false);
    }
  };

  const handleListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 48;
    if (nearBottom) void fetchNextPage();
  };

  const toggleUser = (user: User) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, { id: user.id, label: userLabel(user) }];
    });
  };

  const validate = () => {
    if (!title.trim()) return "Title is required.";
    if (title.trim().length > 120) return "Title must be at most 120 characters.";
    if (!body.trim()) return "Body is required.";
    if (body.trim().length > 500) return "Body must be at most 500 characters.";
    if (targetMode === "users" && selectedUsers.length === 0) {
      return "Select at least one user.";
    }
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
        userIds:
          targetMode === "users" ? selectedUsers.map((u) => u.id) : undefined,
      });
      const data = res.data;
      const scope = data.targeted
        ? `${data.recipientUserCount} selected user(s)`
        : `${data.recipientUserCount} user(s) with devices`;
      const summary = `Sent to ${scope} — ${data.successCount} delivered, ${data.failureCount} failed.`;
      setLastResult(summary);
      toast.success(summary);
      setConfirmOpen(false);
      setTitle("");
      setBody("");
      setAudience("marketing");
      setTargetMode("all");
      setSelectedUsers([]);
      setSearchQuery("");
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
          Send an FCM push to all device users, or to specific users only.
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
          <legend className="text-sm font-medium text-neutral-700">Recipients</legend>

          <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
            <input
              type="radio"
              name="targetMode"
              className="mt-1"
              checked={targetMode === "all"}
              onChange={() => setTargetMode("all")}
            />
            <span>
              <span className="block text-sm font-medium text-neutral-900">
                All device users
              </span>
              <span className="block text-xs text-neutral-500">
                Fan-out to everyone with an active FCM device (filtered by preference below).
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50">
            <input
              type="radio"
              name="targetMode"
              className="mt-1"
              checked={targetMode === "users"}
              onChange={() => setTargetMode("users")}
            />
            <span>
              <span className="block text-sm font-medium text-neutral-900">
                Specific users
              </span>
              <span className="block text-xs text-neutral-500">
                Browse the list and checkmark users, or search and checkmark results.
              </span>
            </span>
          </label>
        </fieldset>

        {targetMode === "users" && (
          <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Find users
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by username, email, or phone…"
                  className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
                <p className="text-xs font-medium text-neutral-600">
                  {selectedUsers.length} selected
                </p>
                {selectedUsers.length > 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary-700 hover:underline"
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear selection
                  </button>
                )}
              </div>

              <ul
                ref={listRef}
                onScroll={handleListScroll}
                className="max-h-72 overflow-auto divide-y divide-neutral-100"
              >
                {listedUsers.map((u) => {
                  const checked = selectedIds.has(u.id);
                  return (
                    <li key={u.id}>
                      <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleUser(u)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-neutral-900">
                            {userLabel(u)}
                          </span>
                          <span className="block truncate text-xs text-neutral-500">
                            {[u.email, u.phone, typeof u.role === "string" ? u.role : (u.role as any)?.name]
                              .filter(Boolean)
                              .join(" · ") || u.id}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
                {!loadingUsers && listedUsers.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-neutral-400">
                    No users found.
                  </li>
                )}
                {loadingUsers && (
                  <li className="px-3 py-4 text-center text-xs text-neutral-400">
                    Loading users…
                  </li>
                )}
              </ul>
            </div>

            {selectedUsers.length > 0 && (
              <p className="text-xs text-neutral-500">
                Selected: {selectedUsers.map((u) => u.label).join(", ")}
              </p>
            )}
          </div>
        )}

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-neutral-700">Preference</legend>

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
                Respect marketing preference
              </span>
              <span className="block text-xs text-neutral-500">
                Only users with marketing notifications enabled (and push on).
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
                Force (ignore marketing opt-out)
              </span>
              <span className="block text-xs text-neutral-500">
                Still skips users who turned off all push notifications.
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
        title="Confirm send"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Send this notification to{" "}
            <strong>
              {targetMode === "users"
                ? `${selectedUsers.length} selected user(s)`
                : audience === "all"
                  ? "all users with active devices (force)"
                  : "users with marketing preference enabled"}
            </strong>
            {targetMode === "users" && (
              <>
                {" "}
                (
                {audience === "all"
                  ? "force preference"
                  : "respecting marketing preference"}
                )
              </>
            )}
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
