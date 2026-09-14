import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  icon,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-150 cursor-pointer ${
          isOpen
            ? "border-primary-500 ring-2 ring-primary-500/20 bg-white shadow-2xs"
            : "border-neutral-300 bg-neutral-50/60 hover:bg-white text-neutral-900"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-neutral-100" : ""}`}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="text-neutral-400 shrink-0">{icon}</span>}
          <span className={`truncate font-medium ${selectedOption ? "text-neutral-900" : "text-neutral-400"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-primary-500" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 min-w-[200px] max-h-64 overflow-y-auto rounded-xl bg-white border border-neutral-200/90 shadow-xl p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150 scrollbar-thin">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-primary-50 text-primary-800 font-semibold"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
