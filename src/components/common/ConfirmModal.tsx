import React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export type ConfirmVariant = "success" | "danger" | "warning" | "info" | "primary";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          bg: "bg-emerald-50 border-emerald-100",
          iconBg: "bg-emerald-100 text-emerald-600",
          icon: <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />,
          btn: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
          titleColor: "text-emerald-950",
        };
      case "danger":
        return {
          bg: "bg-rose-50 border-rose-100",
          iconBg: "bg-rose-100 text-rose-600",
          icon: <XCircle className="h-6 w-6 text-rose-600 shrink-0" />,
          btn: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
          titleColor: "text-rose-950",
        };
      case "warning":
        return {
          bg: "bg-amber-50 border-amber-100",
          iconBg: "bg-amber-100 text-amber-600",
          icon: <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />,
          btn: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
          titleColor: "text-amber-950",
        };
      case "info":
      case "primary":
      default:
        return {
          bg: "bg-primary-50 border-primary-100",
          iconBg: "bg-primary-100 text-primary-600",
          icon: <Info className="h-6 w-6 text-primary-600 shrink-0" />,
          btn: "bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500",
          titleColor: "text-neutral-900",
        };
    }
  };

  const style = getVariantStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div className={`flex items-start gap-4 p-4 rounded-xl border ${style.bg}`}>
          <div className={`p-2.5 rounded-lg shrink-0 ${style.iconBg}`}>
            {style.icon}
          </div>
          <div className="text-sm space-y-1">
            <h4 className={`font-semibold text-base ${style.titleColor}`}>{title}</h4>
            <div className="text-neutral-600 text-xs sm:text-sm leading-relaxed">{description}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="text-neutral-600 hover:bg-neutral-100 text-sm font-medium"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            isLoading={isLoading}
            className={`text-sm font-medium transition-all shadow-xs ${style.btn}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
