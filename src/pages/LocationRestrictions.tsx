import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import {
  listRestrictedPoiCategories,
  createRestrictedPoiCategory,
  updateRestrictedPoiCategory,
  deleteRestrictedPoiCategory,
  RestrictedPoiCategory,
  RestrictionPoiLevel,
} from "../api/restrictedPoi.api";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { CustomSelect } from "../components/common/CustomSelect";
import { Modal } from "../components/common/Modal";
import { Switch } from "../components/common/Switch";
import {
  Plus,
  Edit2,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type FormState = {
  code: string;
  level: RestrictionPoiLevel;
  label: string;
  tokens: string;
  enabled: boolean;
};

const emptyForm = (level: RestrictionPoiLevel = "CONDITIONAL"): FormState => ({
  code: "",
  level,
  label: "",
  tokens: "",
  enabled: true,
});

const parseTokens = (raw: string): string[] =>
  raw
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

export const LocationRestrictions: React.FC = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  const [items, setItems] = useState<RestrictedPoiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<RestrictedPoiCategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<RestrictedPoiCategory | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listRestrictedPoiCategories();
      setItems(list);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load restrictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const hardItems = useMemo(
    () => items.filter((i) => i.level === "HARD"),
    [items]
  );
  const conditionalItems = useMemo(
    () => items.filter((i) => i.level === "CONDITIONAL"),
    [items]
  );

  const openCreate = (level: RestrictionPoiLevel) => {
    setEditing(null);
    setForm(emptyForm(level));
    setFormError(null);
    setIsFormOpen(true);
  };

  const openEdit = (item: RestrictedPoiCategory) => {
    setEditing(item);
    setForm({
      code: item.code,
      level: item.level,
      label: item.label,
      tokens: item.tokens.join(", "),
      enabled: item.enabled,
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || actionLoading) return;

    const tokens = parseTokens(form.tokens);
    if (!form.label.trim()) {
      setFormError("Label is required.");
      return;
    }
    if (tokens.length === 0) {
      setFormError("Provide at least one Mapbox token.");
      return;
    }
    if (!editing && !form.code.trim()) {
      setFormError("Code is required.");
      return;
    }

    setActionLoading(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateRestrictedPoiCategory(editing.id, {
          level: form.level,
          label: form.label.trim(),
          tokens,
          enabled: form.enabled,
        });
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        toast.success(`Updated ${updated.code}`);
      } else {
        const created = await createRestrictedPoiCategory({
          code: form.code.trim(),
          level: form.level,
          label: form.label.trim(),
          tokens,
          enabled: form.enabled,
        });
        setItems((prev) => [...prev, created].sort((a, b) => a.code.localeCompare(b.code)));
        toast.success(`Created ${created.code}`);
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Save failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleEnabled = async (item: RestrictedPoiCategory, enabled: boolean) => {
    if (!isAdmin || actionLoading) return;
    setActionLoading(true);
    try {
      const updated = await updateRestrictedPoiCategory(item.id, { enabled });
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      toast.success(`${updated.code} ${enabled ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!isAdmin || !deleting || actionLoading) return;
    setActionLoading(true);
    try {
      await deleteRestrictedPoiCategory(deleting.id);
      setItems((prev) => prev.filter((i) => i.id !== deleting.id));
      toast.success(`Deleted ${deleting.code}`);
      setDeleting(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete category");
    } finally {
      setActionLoading(false);
    }
  };

  const renderGroup = (
    title: string,
    description: string,
    level: RestrictionPoiLevel,
    groupItems: RestrictedPoiCategory[],
    icon: React.ReactNode
  ) => (
    <div className="bg-white shadow sm:rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          {icon}
          <div>
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        {isAdmin && (
          <Button type="button" variant="primary" onClick={() => openCreate(level)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {groupItems.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 italic">No categories in this group.</p>
        ) : (
          groupItems.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{item.code}</span>
                  <Badge variant={item.enabled ? "success" : "default"}>
                    {item.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                  <Badge variant={item.level === "HARD" ? "danger" : "warning"}>
                    {item.level}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{item.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.tokens.map((token) => (
                    <span
                      key={token}
                      className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-700"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  id={`poi-${item.id}`}
                  checked={item.enabled}
                  onChange={(val) => handleToggleEnabled(item, val)}
                  disabled={!isAdmin || actionLoading}
                  label={`Toggle ${item.code}`}
                />
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-gray-50 rounded"
                      aria-label={`Edit ${item.code}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(item)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                      aria-label={`Delete ${item.code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Location Restrictions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage Mapbox POI categories used for HARD (block) and CONDITIONAL (moderation) checks.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={fetchItems} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {!isAdmin && (
        <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200 inline-block font-medium">
          Moderators can view restriction categories but cannot modify them.
        </p>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-gray-100 rounded-lg border" />
          <div className="h-40 bg-gray-100 rounded-lg border" />
        </div>
      ) : (
        <div className="space-y-6">
          {renderGroup(
            "Hard restrictions",
            "Matching locations cannot create video or image requests.",
            "HARD",
            hardItems,
            <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5" />
          )}
          {renderGroup(
            "Conditional restrictions",
            "Matching locations create PENDING requests for moderator review.",
            "CONDITIONAL",
            conditionalItems,
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          )}
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => !actionLoading && setIsFormOpen(false)}
        title={editing ? `Edit ${editing.code}` : "Add restriction category"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. FIRE_STATION"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-gray-500">Uppercase identifier stored on requests.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Level</label>
            <CustomSelect
              value={form.level}
              onChange={(val) => setForm((f) => ({ ...f, level: val as RestrictionPoiLevel }))}
              options={[
                { label: "HARD — block create", value: "HARD" },
                { label: "CONDITIONAL — require approval", value: "CONDITIONAL" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Label</label>
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. fire station"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Mapbox tokens
            </label>
            <textarea
              value={form.tokens}
              onChange={(e) => setForm((f) => ({ ...f, tokens: e.target.value }))}
              rows={3}
              placeholder="hospital, medical_clinic"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              Comma-separated Mapbox poi_category_ids or maki names.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Enabled</span>
            <Switch
              checked={form.enabled}
              onChange={(val) => setForm((f) => ({ ...f, enabled: val }))}
              label="Enabled"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600 font-medium">{formError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsFormOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={actionLoading}>
              {editing ? "Save changes" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleting}
        onClose={() => !actionLoading && setDeleting(null)}
        title="Delete restriction category?"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete <strong>{deleting?.code}</strong>? New detections will no longer match its
            tokens. Historical request flags keep the old type string.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleting(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={actionLoading}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
