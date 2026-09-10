import React, { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, onWheel, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          {...props}
          onWheel={(e) => {
            if (props.type === "number") {
              e.currentTarget.blur();
            }
            onWheel?.(e);
          }}
          className={twMerge(
            clsx(
              "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500",
              className
            )
          )}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
