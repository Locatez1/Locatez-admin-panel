import React, { useCallback, useEffect, useState } from "react";
import {
  createFaq,
  deleteFaq,
  getAdminFaqs,
  updateFaq,
  updateFaqStatus,
  type Faq,
} from "../api/faqs.api";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Input } from "../components/common/Input";
import { CustomSelect } from "../components/common/CustomSelect";
import {
  HelpCircle,
  Plus,
  Edit2,
  Power,
  Trash2,
  Search,
  AlertTriangle,
  RefreshCw,
  Filter,
  X,
  RotateCcw,
} from "lucide-react";

export const Faqs: React.FC = () => {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<Faq | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminFaqs({
        limit: 100,
        search: searchQuery.trim() || undefined,
        isActive:
          statusFilter === "all" ? undefined : statusFilter === "active",
      });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.items || [];
      setFaqs(list);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const resetForm = () => {
    setQuestion("");
    setAnswer("");
    setSortOrder("0");
    setEditingFaq(null);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (faq: Faq) => {
    setEditingFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setSortOrder(String(faq.sortOrder ?? 0));
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (faq: Faq) => {
    setDeletingFaq(faq);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    if (!question.trim()) return "Question is required.";
    if (!answer.trim()) return "Answer is required.";
    const order = Number(sortOrder);
    if (!Number.isInteger(order) || order < 0) return "Sort order must be a whole number ≥ 0.";
    return null;
  };

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
      await createFaq({
        question: question.trim(),
        answer: answer.trim(),
        sortOrder: parseInt(sortOrder, 10),
      });
      setIsCreateModalOpen(false);
      resetForm();
      await fetchFaqs();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to create FAQ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaq) return;
    const valErr = validateForm();
    if (valErr) {
      setFormError(valErr);
      return;
    }
    setActionLoading(true);
    setFormError(null);
    try {
      await updateFaq(editingFaq.id, {
        question: question.trim(),
        answer: answer.trim(),
        sortOrder: parseInt(sortOrder, 10),
      });
      setIsEditModalOpen(false);
      resetForm();
      await fetchFaqs();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || "Failed to update FAQ");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (faq: Faq) => {
    setActionLoading(true);
    try {
      await updateFaqStatus(faq.id, !faq.isActive);
      await fetchFaqs();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to update FAQ status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFaq) return;
    setActionLoading(true);
    setDeleteError(null);
    try {
      await deleteFaq(deletingFaq.id);
      setIsDeleteModalOpen(false);
      setDeletingFaq(null);
      await fetchFaqs();
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || err.message || "Failed to delete FAQ");
    } finally {
      setActionLoading(false);
    }
  };

  const renderForm = (onSubmit: (e: React.FormEvent) => void, submitLabel: string) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}
      <div>
        <label htmlFor="faq-question" className="block text-sm font-medium text-gray-700 mb-1">
          Question
        </label>
        <Input
          id="faq-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={actionLoading}
          required
        />
      </div>
      <div>
        <label htmlFor="faq-answer" className="block text-sm font-medium text-gray-700 mb-1">
          Answer
        </label>
        <textarea
          id="faq-answer"
          rows={5}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={actionLoading}
          required
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100"
        />
      </div>
      <div>
        <label htmlFor="faq-sort" className="block text-sm font-medium text-gray-700 mb-1">
          Sort order (lower shows first)
        </label>
        <Input
          id="faq-sort"
          type="number"
          min={0}
          step={1}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          disabled={actionLoading}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          disabled={actionLoading}
          onClick={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={actionLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            FAQs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage help content shown in the mobile app.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchFaqs} isLoading={loading}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Add FAQ
          </Button>
        </div>
      </div>

      {/* Styled Search & Filter Container Card */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700 uppercase tracking-wider">
            <Filter className="h-4 w-4 text-primary-500" />
            <span>Search & Filter FAQs</span>
            {(searchQuery || statusFilter !== "all") && (
              <span className="bg-primary-50 text-primary-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary-200">
                Active
              </span>
            )}
          </div>
          {(searchQuery || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-semibold transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="relative sm:col-span-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search questions or answers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 pl-9 pr-8 py-2 text-sm text-neutral-900 placeholder-neutral-400 bg-neutral-50/50 hover:bg-white focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition"
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

          {/* Status Dropdown */}
          <div className="sm:col-span-4">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              placeholder="All Statuses"
              options={[
                { label: "All Statuses", value: "all" },
                { label: "Active Only", value: "active" },
                { label: "Inactive Only", value: "inactive" },
              ]}
            />
          </div>
        </div>

        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none">
          <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mr-1">Status:</span>
          {[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ].map((st) => {
            const isActive = statusFilter === st.value;
            return (
              <button
                key={st.value}
                type="button"
                onClick={() => setStatusFilter(st.value as any)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${isActive
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

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white shadow border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-gray-500">Loading FAQs…</p>
          </div>
        ) : faqs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">No FAQs yet. Add one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Question</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Answer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {faqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-sm text-gray-600">{faq.sortOrder}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs">{faq.question}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                      <span className="line-clamp-2">{faq.answer}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={faq.isActive ? "success" : "inactive"}>
                        {faq.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title={faq.isActive ? "Disable" : "Enable"}
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus(faq)}
                        >
                          <Power className={`h-3.5 w-3.5 ${faq.isActive ? "text-emerald-600" : "text-amber-600"}`} />
                        </Button>
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => handleOpenEdit(faq)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => handleOpenDelete(faq)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm(); }} title="Add FAQ">
        {renderForm(handleCreateSubmit, "Create FAQ")}
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} title="Edit FAQ">
        {renderForm(handleEditSubmit, "Save changes")}
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeletingFaq(null); }}
        title="Delete FAQ"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete <strong>{deletingFaq?.question}</strong>? This cannot be undone. Prefer disable if you may reuse it.
          </p>
          {deleteError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{deleteError}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" disabled={actionLoading} onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={actionLoading} onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
