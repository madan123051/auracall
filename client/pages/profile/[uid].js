import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getUserProfile } from "../../lib/auth";

export default function PublicProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !router.query.uid) return;
    getUserProfile(router.query.uid)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [router.isReady, router.query.uid]);

  if (loading) return <div className="standalone-loader">Loading Aura profile...</div>;

  if (!profile) {
    return (
      <main className="public-profile-page">
        <div className="public-profile-card">
          <div className="brand-mark">A</div>
          <h1>Profile not found</h1>
          <p>This AuraCall profile may no longer be public.</p>
          <a className="primary-button" href="/">Open AuraCall X</a>
        </div>
      </main>
    );
  }

  const name = profile.displayName || "AuraCall User";

  return (
    <main className="public-profile-page">
      <div className="public-profile-orb public-profile-orb-one" />
      <div className="public-profile-orb public-profile-orb-two" />
      <article className="public-profile-card">
        <div className="public-profile-brand">
          <div className="brand-mark">A</div>
          <span>AuraCall X</span>
        </div>
        <div className="public-profile-avatar">
          {profile.photoURL ? <img src={profile.photoURL} alt={name} /> : <span>{name[0]}</span>}
          <i />
        </div>
        <span className="section-kicker">Public Aura profile</span>
        <h1>{name}</h1>
        <p>{profile.bio || "Available on AuraCall X"}</p>
        <div className="public-profile-meta">
          <span>Live translation</span>
          <span>Protected calls</span>
          <span>AI chat</span>
        </div>
        <a className="primary-button public-profile-cta" href="/">
          Connect on AuraCall X
        </a>
      </article>
    </main>
  );
}
