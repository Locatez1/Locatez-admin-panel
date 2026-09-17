import React, { useState } from "react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name,
  size = "md",
  className = "",
}) => {
  const [imgError, setImgError] = useState(false);

  const initial = (name || "U").trim()[0]?.toUpperCase() || "U";

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-2xl",
  }[size];

  if (src && !imgError) {
    return (
      <div className={`${sizeClasses} rounded-full overflow-hidden bg-gray-100 shrink-0 ${className}`}>
        <img
          src={src}
          alt={name || "User avatar"}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold border border-primary-200 overflow-hidden shrink-0 shadow-2xs ${className}`}
    >
      {initial}
    </div>
  );
};
