import React, { useState } from "react";
import { Film, Image as ImageIcon, ExternalLink } from "lucide-react";

interface ChatMessageContentProps {
  content: string;
  type?: string;
  isOwnMessage?: boolean;
}

/**
 * Helper to test if a URL string points to a video file or video media type
 */
export const isVideoUrl = (url: string, msgType?: string): boolean => {
  if (!url) return false;
  if (msgType?.toUpperCase() === "VIDEO") return true;
  const cleanUrl = url.split("?")[0].toLowerCase();
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".m4v", ".avi", ".m3u8", ".3gp", ".mkv"];
  if (videoExtensions.some((ext) => cleanUrl.endsWith(ext))) return true;
  if (cleanUrl.includes("/video/") || cleanUrl.includes("/videos/")) return true;
  return false;
};

/**
 * Helper to test if a URL string points to an image file or image media type
 */
export const isImageUrl = (url: string, msgType?: string): boolean => {
  if (!url) return false;
  if (msgType?.toUpperCase() === "IMAGE") return true;
  const cleanUrl = url.split("?")[0].toLowerCase();
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".heic"];
  if (imageExtensions.some((ext) => cleanUrl.endsWith(ext))) return true;
  if (cleanUrl.includes("/image/") || cleanUrl.includes("/images/") || cleanUrl.includes("/photos/")) return true;
  return false;
};

/**
 * Component to render chat message text and automatically display embedded videos and images
 * when message content contains image or video URLs.
 */
export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({
  content,
  type,
  isOwnMessage = false,
}) => {
  const [mediaErrorMap, setMediaErrorMap] = useState<Record<string, boolean>>({});

  if (!content) return null;

  // URL extraction regex matching standard http/https links
  const urlRegex = /(https?:\/\/[^\s<]+)/gi;
  const trimmed = content.trim();

  // Check if content consists entirely of a single URL
  const isPureUrl = /^https?:\/\/[^\s<]+$/i.test(trimmed);

  if (isPureUrl) {
    const isVid = isVideoUrl(trimmed, type);
    const isImg = isImageUrl(trimmed, type);
    const isGenericMedia = type === "MEDIA" || type === "VIDEO" || type === "IMAGE";

    if ((isVid || (isGenericMedia && !isImg)) && !mediaErrorMap[trimmed]) {
      return (
        <div className="space-y-1.5 my-1">
          <div className="relative rounded-lg overflow-hidden border border-black/10 shadow-md bg-black max-w-xs sm:max-w-sm">
            <video
              src={trimmed}
              controls
              preload="metadata"
              className="w-full max-h-60 object-contain rounded-lg"
              onError={() => setMediaErrorMap((prev) => ({ ...prev, [trimmed]: true }))}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] opacity-80 px-0.5">
            <span className="flex items-center gap-1 font-medium">
              <Film className="h-3 w-3" /> Video Attachment
            </span>
            <a
              href={trimmed}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-0.5 font-medium"
            >
              Open link <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      );
    }

    if ((isImg || isGenericMedia) && !mediaErrorMap[trimmed]) {
      return (
        <div className="space-y-1.5 my-1">
          <div className="relative rounded-lg overflow-hidden border border-black/10 shadow-md bg-gray-900/5 max-w-xs sm:max-w-sm">
            <img
              src={trimmed}
              alt="Message attachment"
              className="w-full max-h-60 object-cover rounded-lg hover:opacity-95 transition cursor-pointer"
              onClick={() => window.open(trimmed, "_blank")}
              onError={() => setMediaErrorMap((prev) => ({ ...prev, [trimmed]: true }))}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] opacity-80 px-0.5">
            <span className="flex items-center gap-1 font-medium">
              <ImageIcon className="h-3 w-3" /> Image Attachment
            </span>
            <a
              href={trimmed}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-0.5 font-medium"
            >
              Full size <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      );
    }

    // Fallback if media player failed or URL is unrecognized text link
    if (mediaErrorMap[trimmed]) {
      return (
        <div className="space-y-1 my-1">
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs font-mono break-all underline flex items-center gap-1 ${
              isOwnMessage ? "text-primary-100 hover:text-white" : "text-primary-700 hover:text-primary-900"
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            {trimmed}
          </a>
          <span className="text-[10px] opacity-75 italic block">
            (Media preview unavailable)
          </span>
        </div>
      );
    }
  }

  // Parse mixed text with embedded URLs
  const parts = content.split(urlRegex);
  const mediaUrlsFound: { url: string; isVideo: boolean }[] = [];

  const renderedTextParts = parts.map((part, index) => {
    if (part.match(/^https?:\/\/[^\s<]+$/i)) {
      const isVid = isVideoUrl(part, type);
      const isImg = isImageUrl(part, type);

      if (isVid || isImg) {
        mediaUrlsFound.push({ url: part, isVideo: isVid });
      }

      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`break-all underline font-medium ${
            isOwnMessage ? "text-white underline hover:opacity-90" : "text-primary-700 hover:text-primary-900"
          }`}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });

  return (
    <div className="space-y-2">
      <div className="leading-relaxed whitespace-pre-wrap break-words">{renderedTextParts}</div>

      {/* Render media players for embedded image/video URLs */}
      {mediaUrlsFound.length > 0 && (
        <div className="space-y-2 pt-1">
          {mediaUrlsFound.map(({ url, isVideo }, idx) => {
            if (mediaErrorMap[url]) return null;

            if (isVideo) {
              return (
                <div key={idx} className="space-y-1">
                  <div className="rounded-lg overflow-hidden border border-black/10 shadow-md bg-black max-w-xs sm:max-w-sm">
                    <video
                      src={url}
                      controls
                      preload="metadata"
                      className="w-full max-h-56 object-contain rounded-lg"
                      onError={() => setMediaErrorMap((prev) => ({ ...prev, [url]: true }))}
                    />
                  </div>
                </div>
              );
            }

            return (
              <div key={idx} className="space-y-1">
                <div className="rounded-lg overflow-hidden border border-black/10 shadow-md bg-gray-900/5 max-w-xs sm:max-w-sm">
                  <img
                    src={url}
                    alt="Embedded media attachment"
                    className="w-full max-h-56 object-cover rounded-lg hover:opacity-95 transition cursor-pointer"
                    onClick={() => window.open(url, "_blank")}
                    onError={() => setMediaErrorMap((prev) => ({ ...prev, [url]: true }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
