import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface DisplayIdProps {
  value?: string | null;
  className?: string;
}

/** Human-readable record id (TASK-/VOD-/ORD-/PAY-/WDL-/TXN-) with click-to-copy. */
export const DisplayId: React.FC<DisplayIdProps> = ({ value, className }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable (non-secure context) */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied" : "Copy ID"}
      className={twMerge(
        "inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-gray-700 hover:bg-gray-100",
        className
      )}
    >
      {value}
      {copied ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3 text-gray-400" />
      )}
    </button>
  );
};
