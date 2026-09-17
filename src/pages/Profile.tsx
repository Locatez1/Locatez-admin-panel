import React, { useEffect, useState } from "react";
import { Camera, UserRound, Save, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { CustomSelect } from "../components/common/CustomSelect";
import { uploadMedia } from "../api/popularPlaces.api";
import {
  getMe,
  updateMyAccount,
  updateMyProfile,
} from "../api/users.api";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

/**
 * Accept:
 * - India mobile: 10 digits starting 6–9, optional 91 / +91
 * - International: must start with + and country code (E.164-ish)
 */
const isValidPhoneNumber = (value: string) => {
  const normalized = value.replace(/[\s\-()]/g, "");
  if (/^(?:\+91|91)?[6-9]\d{9}$/.test(normalized)) return true;
  if (/^\+[1-9]\d{9,14}$/.test(normalized)) return true;
  return false;
};

const toDateInput = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
};

type ProfileFormSnapshot = {
  username: string;
  email: string;
  phone: string;
  fullName: string;
  bio: string;
  gender: string;
  dateOfBirth: string;
  city: string;
  state: string;
  country: string;
  profilePhotoUrl: string;
};

const snapshotFromUser = (u: {
  username?: string;
  email?: string;
  phone?: string | null;
  fullName?: string | null;
  profile?: {
    fullName?: string | null;
    bio?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
}): ProfileFormSnapshot => ({
  username: u.username || "",
  email: u.email || "",
  phone: u.phone || "",
  fullName: u.fullName || u.profile?.fullName || "",
  bio: u.profile?.bio || "",
  gender: u.profile?.gender || "",
  dateOfBirth: toDateInput(u.profile?.dateOfBirth),
  city: u.profile?.city || "",
  state: u.profile?.state || "",
  country: u.profile?.country || "",
  profilePhotoUrl: u.profile?.profilePhotoUrl || "",
});

const snapshotsEqual = (a: ProfileFormSnapshot, b: ProfileFormSnapshot) =>
  a.username === b.username &&
  a.email === b.email &&
  a.phone === b.phone &&
  a.fullName === b.fullName &&
  a.bio === b.bio &&
  a.gender === b.gender &&
  a.dateOfBirth === b.dateOfBirth &&
  a.city === b.city &&
  a.state === b.state &&
  a.country === b.country &&
  a.profilePhotoUrl === b.profilePhotoUrl;

export const Profile: React.FC = () => {
  const { user, setUser, refreshUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<ProfileFormSnapshot | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");

  const hydrate = (u: NonNullable<typeof user>) => {
    const snap = snapshotFromUser(u);
    setUsername(snap.username);
    setEmail(snap.email);
    setPhone(snap.phone);
    setFullName(snap.fullName);
    setBio(snap.bio);
    setGender(snap.gender);
    setDateOfBirth(snap.dateOfBirth);
    setCity(snap.city);
    setState(snap.state);
    setCountry(snap.country);
    setProfilePhotoUrl(snap.profilePhotoUrl);
    setSavedSnapshot(snap);
    setPhoneTouched(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMe();
        if (cancelled) return;
        setUser(res.data);
        hydrate(res.data);
      } catch (err: any) {
        if (cancelled) return;
        if (user) hydrate(user);
        setError(err?.response?.data?.message || err?.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMedia(file);
      setProfilePhotoUrl(url);
      toast.success("Photo uploaded — save profile to apply");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhoneTouched(true);
    setPhone(value);
  };

  const phoneTrimmed = phone.trim();
  const phoneInvalid = Boolean(phoneTrimmed && !isValidPhoneNumber(phoneTrimmed));
  const showPhoneError = phoneTouched && phoneInvalid;

  const currentSnapshot: ProfileFormSnapshot = {
    username,
    email,
    phone,
    fullName,
    bio,
    gender,
    dateOfBirth,
    city,
    state,
    country,
    profilePhotoUrl,
  };
  const isDirty = savedSnapshot ? !snapshotsEqual(currentSnapshot, savedSnapshot) : false;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (phoneInvalid) {
      setPhoneTouched(true);
      return;
    }

    setSaving(true);
    try {
      await updateMyAccount({
        username: username.trim(),
        email: email.trim(),
        phone: phoneTrimmed || undefined,
      });

      const profilePayload: Record<string, unknown> = {
        fullName: fullName.trim() || undefined,
        bio: bio.trim() ? bio.trim() : null,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
      };
      if (gender) profilePayload.gender = gender;
      if (dateOfBirth) profilePayload.dateOfBirth = dateOfBirth;
      if (profilePhotoUrl) profilePayload.profilePhotoUrl = profilePhotoUrl;

      const profileRes = await updateMyProfile(profilePayload as any);
      setUser(profileRes.data);
      hydrate(profileRes.data);
      toast.success("Profile updated");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save profile";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-500">
        <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
        Loading profile…
      </div>
    );
  }

  const initials = (fullName || username || email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-900">
          <UserRound className="h-7 w-7 text-primary-600" />
          My profile
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Update your account details and public profile information.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-xs"
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt="Profile"
                className="h-24 w-24 rounded-full object-cover ring-2 ring-primary-100"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
                {initials}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary-500 p-2 text-white shadow hover:bg-primary-600">
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || saving}
                onChange={handlePhotoChange}
              />
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {fullName || username || "Your name"}
            </p>
            <p className="text-xs text-neutral-500">{user?.role}</p>
            <p className="mt-1 text-xs text-neutral-400">
              {uploading ? "Uploading…" : "Click the camera to change photo"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
          />
          <Input
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={100}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={() => setPhoneTouched(true)}
            placeholder="9876543210 or +919876543210"
            error={showPhoneError ? "Invalid mobile number" : undefined}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Gender</label>
            <CustomSelect
              value={gender}
              onChange={setGender}
              options={GENDER_OPTIONS}
            />
          </div>
          <Input
            label="Date of birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-xs focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            placeholder="Short bio (optional)"
          />
          <p className="mt-1 text-xs text-neutral-400">{bio.length}/500</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
          <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={saving || uploading || phoneInvalid || !isDirty}
            isLoading={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={async () => {
              try {
                const u = await refreshUser();
                if (u) hydrate(u);
                toast.success("Profile reloaded");
              } catch (err: any) {
                toast.error(err?.response?.data?.message || "Reload failed");
              }
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
          </Button>
        </div>
      </form>
    </div>
  );
};
