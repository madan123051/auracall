import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "./AuthProvider";
import {
  getUserProfile,
  updateUserBio,
  updateUserDisplayName,
  updateUserPreferences,
  uploadProfilePhoto,
} from "../lib/auth";
import { useLanguage } from "../lib/i18n";

export default function ProfileStudio({ embedded = false, onClose }) {
  const router = useRouter();
  const { currentUser, logout } = useAuth();
  const { language, languages, setLanguage, autoTranslate, setAutoTranslate, t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    getUserProfile(currentUser.uid).then((data) => {
      const nextProfile = data || {};
      setProfile(nextProfile);
      setName(nextProfile.displayName || currentUser.displayName || "AuraCall User");
      setBio(nextProfile.bio || "Available on AuraCall X");
    });
    setShareUrl(`${window.location.origin}/profile/${currentUser.uid}`);
  }, [currentUser]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const handleSave = async () => {
    if (!name.trim() || !currentUser) return;
    setSaving(true);
    try {
      await Promise.all([
        updateUserDisplayName(currentUser, name.trim()),
        updateUserBio(currentUser.uid, bio.trim()),
        updateUserPreferences(currentUser.uid, { language, autoTranslate }),
      ]);
      setProfile((current) => ({ ...current, displayName: name.trim(), bio: bio.trim() }));
      showNotice("Profile updated");
    } catch (error) {
      showNotice(error.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      showNotice("Choose an image smaller than 5 MB");
      return;
    }
    setUploading(true);
    try {
      const photoURL = await uploadProfilePhoto(currentUser, file);
      setProfile((current) => ({ ...current, photoURL }));
      showNotice("Profile photo updated");
    } catch (error) {
      showNotice(error.message || "Could not upload photo");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${name || "AuraCall"} profile`,
          text: "Connect with me on AuraCall X",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showNotice("Profile link copied");
      }
    } catch (error) {
      if (error.name !== "AbortError") showNotice("Sharing is not available");
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    showNotice("Profile link copied");
  };

  if (!currentUser) return null;

  const displayPhoto = profile?.photoURL || currentUser.photoURL || "";
  const initial = (name || currentUser.displayName || "A").charAt(0).toUpperCase();

  return (
    <section className={`profile-studio ${embedded ? "profile-studio-embedded" : ""}`}>
      <div className="profile-studio-heading">
        <div>
          <span className="section-kicker">Aura identity</span>
          <h1>{t("profileStudio")}</h1>
          <p>Control how people see, find, and connect with you.</p>
        </div>
        <div className="profile-studio-heading-actions">
          {onClose && (
            <button className="icon-button" type="button" onClick={onClose} aria-label={t("close")}>
              ×
            </button>
          )}
          {!embedded && (
            <button className="secondary-button" type="button" onClick={() => router.push("/")}>
              Back to app
            </button>
          )}
        </div>
      </div>

      {notice && <div className="profile-notice">{notice}</div>}

      <div className="profile-studio-grid">
        <div className="profile-card profile-preview-card">
          <div className="profile-glow" />
          <button
            className="profile-photo-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("changePhoto")}
          >
            {displayPhoto ? (
              <img src={displayPhoto} alt={name} />
            ) : (
              <span>{initial}</span>
            )}
            <small>{uploading ? "Uploading..." : t("changePhoto")}</small>
          </button>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="image/*"
            onChange={handlePhoto}
          />
          <h2>{name || "AuraCall User"}</h2>
          <p>{bio || "Available on AuraCall X"}</p>
          <span className="profile-presence"><i /> {t("online")}</span>
          <div className="profile-share-actions">
            <button className="primary-button" type="button" onClick={handleShare}>
              {t("shareProfile")}
            </button>
            <button className="secondary-button" type="button" onClick={copyLink}>
              {t("copyLink")}
            </button>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={() => router.push(`/profile/${currentUser.uid}`)}
          >
            {t("openProfile")} ↗
          </button>
        </div>

        <div className="profile-card profile-form-card">
          <div className="field-group">
            <label htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
            />
          </div>
          <div className="field-group">
            <label htmlFor="profile-bio">About</label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={140}
              rows={4}
            />
            <span>{bio.length}/140</span>
          </div>
          <div className="field-group">
            <label>Email</label>
            <input value={currentUser.email || "Guest account"} readOnly />
          </div>

          <div className="settings-divider" />

          <div className="field-group">
            <label htmlFor="profile-language">{t("displayLanguage")}</label>
            <select
              id="profile-language"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.nativeLabel} · {item.label}
                </option>
              ))}
            </select>
          </div>

          <label className="toggle-setting">
            <div>
              <strong>{t("autoTranslate")}</strong>
              <span>{t("autoTranslateHelp")}</span>
            </div>
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(event) => setAutoTranslate(event.target.checked)}
            />
            <i />
          </label>

          <div className="profile-form-actions">
            <button
              className="primary-button"
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : t("saveChanges")}
            </button>
            <button className="danger-text-button" type="button" onClick={logout}>
              {t("signOut")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
