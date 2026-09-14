import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="relative w-full max-w-lg md:max-w-2xl mx-auto my-auto max-h-[90vh] flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5 sm:px-6 bg-neutral-50 flex-shrink-0">
          <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-primary-100 hover:text-primary-900 transition"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close modal</span>
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
