export type Role = "USER" | "MODERATOR" | "ADMIN" | "SUPERADMIN";

export type UserStatus = "ACTIVE" | "BLOCKED" | "SUSPENDED";

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  name?: string;
  phone?: string;
  role: Role;
  status: UserStatus;
  isProfileComplete: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySuggestion {
  id: string;
  name: string;
  normalizedName: string;
  occurrenceCount: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | string;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PopularPlace {
  id: string;
  name: string;
  location: string;
  description: string;
  latitude: number;
  longitude: number;
  image: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePopularPlacePayload {
  name: string;
  location: string;
  description: string;
  latitude: number;
  longitude: number;
  image: string;
}

export interface UpdatePopularPlacePayload {
  name?: string;
  location?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  image?: string;
}

export interface UpdatePopularPlaceStatusPayload {
  isActive: boolean;
}

export interface VideoRequestParty {
  id: string;
  username?: string;
  fullName?: string | null;
  name?: string | null;
}

export interface VideoRequest {
  id: string;
  title: string;
  description: string;
  requesterId?: string;
  userId?: string;
  requester?: VideoRequestParty | User | any;
  user?: User | any;
  requestedBy?: User | any;
  creator?: User | any;
  fulfilment?: {
    id?: string;
    fulfillerId?: string;
    fulfiller?: VideoRequestParty | null;
    status?: string;
    videoUrl?: string;
    videoStorageKey?: string;
    videoKey?: string;
    mediaUrl?: string;
    playbackUrl?: string;
    hlsUrl?: string;
    thumbnailUrl?: string;
    submittedAt?: string;
  } | null;
  videoUrl?: string;
  videoStorageKey?: string;
  videoKey?: string;
  mediaUrl?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  categoryId: string;
  category?: Category | { id: string; name: string };
  rewardAmount: number;
  payoutType: string;
  status: "PENDING" | "OPEN" | "ACCEPTED" | "ONGOING" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "REJECTED";
  createdAt: string;
  isRestrictedArea?: boolean;
  restrictedAreaType?: string;
  restrictedReason?: string;
  restrictionReason?: string;
  rejectionReason?: string;
  customLocation?: {
    address?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  location?: {
    address?: string;
    name?: string;
    latitude?: number;
    longitude?: number;
    coordinates?: [number, number];
  } | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  fulfilmentMedia?: {
    latest: {
      id: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      rejectionReason?: string | null;
      canReview?: boolean;
      pendingExpiresAt?: string | null;
      pendingExpiresAtIst?: string | null;
      pendingExpiresInMinutes?: number | null;
      items: Array<{
        storageKey: string;
        mimeType?: string | null;
        kind: "VIDEO" | "IMAGE";
        url?: string | null;
        playable?: boolean;
      }>;
    } | null;
  } | null;
}

export interface AuditLog {
  id: string;
  userId: string;
  actor?: User;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: any[];
}

export type ChatRoomState = "PRE_ACCEPTANCE" | "ACCEPTED";

export interface ChatRoom {
  id: string;
  videoRequestId: string;
  requesterId: string;
  fulfillerId: string;
  state: ChatRoomState;
  fulfillerMessageCount?: number;
  preAcceptanceMessageLimit?: number;
  fulfillerMessagesRemaining?: number;
  paidFollowupPrice?: number;
  mediaDelivered?: boolean;
  requester?: VideoRequestParty | User | any;
  fulfiller?: VideoRequestParty | User | any;
  videoRequest?: {
    id: string;
    title: string;
    status: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  chatId?: string;
  chatRoomId?: string;
  senderId: string;
  senderName?: string;
  sender?: {
    id: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string;
  };
  content: string;
  type?: "TEXT" | "SYSTEM" | "VIDEO" | "IMAGE" | "MEDIA" | string;
  billing?: "FREE" | "PAID" | "MEDIA_DELIVERY" | string;
  createdAt: string;
}

export type MarketplaceStatus = "DRAFT" | "PUBLISHED" | "PENDING" | "ENDED" | "EXPIRED" | "CANCELLED";

export interface MarketplaceStream {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  expiresAt?: string | null;
  status: MarketplaceStatus;
  creator?: {
    id: string;
    username: string;
    fullName?: string | null;
    profilePhotoUrl?: string | null;
  };
  customLocation?: {
    address: string;
    latitude: number;
    longitude: number;
  } | null;
  category?: {
    id: string | null;
    name: string;
  } | null;
  isOwner?: boolean;
  isPurchased?: boolean;
  purchaseCount?: number;
  createdAt: string;
  rejectionReason?: string | null;
  isRestrictedArea?: boolean;
  restrictedAreaType?: string | null;
}

export interface MarketplacePurchase {
  id: string;
  amount: number;
  purchasedAt: string;
  isAccessible?: boolean;
  listing?: MarketplaceStream;
}

export interface Idea {
  id: string;
  title: string;
  content: string;
  imageKey: string;
  imageUrl?: string;
  placeName: string;
  city: string;
  state: string;
  categoryId: string;
  category?: Category | { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateIdeaPayload {
  title: string;
  content: string;
  imageKey: string;
  placeName: string;
  city: string;
  state: string;
  categoryId: string;
}

export interface UpdateIdeaPayload {
  title?: string;
  content?: string;
  imageKey?: string;
  placeName?: string;
  city?: string;
  state?: string;
  categoryId?: string;
}

export interface GetIdeasParams {
  categoryId?: string;
  search?: string;
}

export type ServiceAreaMode = "PAN_INDIA" | "RESTRICTED";

export interface ServiceArea {
  id: string;
  name: string;
  countryCode: string;
  enabled: boolean;
  geometry?: any;
}

export interface ServiceAreaSettings {
  mode: ServiceAreaMode;
  areas: ServiceArea[];
}

export type TransactionType =
  | "CREDIT"
  | "DEBIT"
  | "HOLD"
  | "RELEASE"
  | "REWARD"
  | "REFUND"
  | "PAYOUT"
  | "DEPOSIT"
  | "WITHDRAWAL";
export type TransactionStatus = "COMPLETED" | "PENDING" | "FAILED" | "CANCELLED";

export interface Wallet {
  id?: string;
  userId: string;
  balance: number;
  availableBalance?: number;
  heldBalance?: number;
  currency: string;
  totalEarned?: number;
  totalSpent?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  walletId?: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter?: number;
  currency?: string;
  description: string;
  status: TransactionStatus;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}



