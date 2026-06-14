import React from "react";
import { useAuth } from "../../components/AuthProvider";
import ProfileStudio from "../../components/ProfileStudio";

export default function ProfileSettingsPage() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="standalone-loader">Loading profile...</div>;
  }

  if (!currentUser) {
    return (
      <main className="public-profile-page">
        <div className="public-profile-card">
          <div className="brand-mark">A</div>
          <h1>Sign in to edit your profile</h1>
          <a className="primary-button" href="/">Open AuraCall X</a>
        </div>
      </main>
    );
  }

  return (
    <main className="profile-settings-page">
      <ProfileStudio />
    </main>
  );
}
