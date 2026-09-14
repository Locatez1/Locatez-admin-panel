import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, limit, total, totalPages, onPageChange }) => {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-neutral-200/80 bg-white px-4 py-3 sm:px-6 w-full">
      {/* Result Count Text */}
      <div className="text-center sm:text-left">
        <p className="text-xs sm:text-sm text-neutral-600">
          Showing <span className="font-semibold text-neutral-900">{total === 0 ? 0 : start}</span> to{" "}
          <span className="font-semibold text-neutral-900">{end}</span> of{" "}
          <span className="font-semibold text-neutral-900">{total}</span> results
        </p>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-primary-800 bg-primary-50 border border-primary-200 whitespace-nowrap shrink-0">
          Page {page} of {totalPages || 1}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

