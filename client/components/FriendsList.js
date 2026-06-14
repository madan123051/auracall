import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import {
  acceptFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
  rejectFriendRequest,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from "../lib/friends";
import { formatLastSeen, watchMultiplePresence } from "../lib/presence";
import UiIcon from "./UiIcon";

const TABS = [
  { key: "friends", label: "Friends", icon: "users" },
  { key: "requests", label: "Requests", icon: "inbox" },
  { key: "discover", label: "Discover", icon: "search" },
];

function FriendAvatar({ photoURL, name }) {
  return (
    <span className="friends-avatar-wrap">
      {photoURL ? (
        <img className="friends-avatar" src={photoURL} alt={name} />
      ) : (
        <span className="friends-avatar friends-avatar-fallback">
          {(name || "?").charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function EmptyState({ icon, title, copy, action }) {
  return (
    <div className="friends-empty-state">
      <span><UiIcon name={icon} size={31} /></span>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action}
    </div>
  );
}

export default function FriendsList({ onOpenChat, onStartCall }) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("friends");
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [presenceData, setPresenceData] = useState(new Map());
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!currentUser) return undefined;
    return getFriends(currentUser.uid, setFriends);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return undefined;
    return getPendingRequests(currentUser.uid, setPendingRequests);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return undefined;
    return getSentRequests(currentUser.uid, setSentRequests);
  }, [currentUser]);

  useEffect(() => {
    if (!friends.length) {
      setPresenceData(new Map());
      return undefined;
    }
    return watchMultiplePresence(friends.map((friend) => friend.uid), setPresenceData);
  }, [friends]);

  useEffect(() => {
    if (activeTab !== "discover" || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return undefined;
    }

    setSearching(true);
    const timeout = window.setTimeout(async () => {
      const results = await searchUsers(searchQuery.trim());
      setSearchResults(results.filter((user) => user.id !== currentUser?.uid));
      setSearching(false);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [activeTab, currentUser?.uid, searchQuery]);

  const sortedFriends = useMemo(
    () =>
      [...friends].sort(
        (a, b) =>
          Number(Boolean(presenceData.get(b.uid)?.isOnline)) -
          Number(Boolean(presenceData.get(a.uid)?.isOnline))
      ),
    [friends, presenceData]
  );

  const showStatus = useCallback((message, type = "success") => {
    setStatus({ message, type });
    window.setTimeout(() => setStatus(null), 2800);
  }, []);

  const handleSendRequest = async (targetUser) => {
    try {
      await sendFriendRequest(currentUser, targetUser.id);
      showStatus(`Friend request sent to ${targetUser.displayName}`);
    } catch (error) {
      showStatus(error.message, "error");
    }
  };

  const handleAcceptRequest = async (request) => {
    try {
      await acceptFriendRequest(request.id, currentUser, {
        uid: request.from,
        displayName: request.fromName,
        photoURL: request.fromPhoto,
      });
      showStatus(`${request.fromName} is now your friend`);
    } catch (error) {
      showStatus(error.message, "error");
    }
  };

  const handleRejectRequest = async (request) => {
    try {
      await rejectFriendRequest(request.id);
      showStatus("Request declined");
    } catch (error) {
      showStatus(error.message, "error");
    }
  };

  const handleRemoveFriend = async (friend) => {
    if (!window.confirm(`Remove ${friend.displayName} from friends?`)) return;
    try {
      await removeFriend(currentUser.uid, friend.uid);
      showStatus(`${friend.displayName} removed`);
    } catch (error) {
      showStatus(error.message, "error");
    }
  };

  const renderFriends = () => {
    if (!sortedFriends.length) {
      return (
        <EmptyState
          icon="users"
          title="Your circle starts here"
          copy="Discover people, send a request, then chat or call from one place."
          action={
            <button className="friends-empty-action" type="button" onClick={() => setActiveTab("discover")}>
              <UiIcon name="search" size={16} /> Discover people
            </button>
          }
        />
      );
    }

    return sortedFriends.map((friend) => {
      const presence = presenceData.get(friend.uid) || { isOnline: false, lastSeen: null };
      return (
        <article className="friend-card" key={friend.uid}>
          <FriendAvatar photoURL={friend.photoURL} name={friend.displayName} />
          <span className={presence.isOnline ? "friend-presence is-online" : "friend-presence"} />
          <div className="friend-copy">
            <strong>{friend.displayName}</strong>
            <small className={presence.isOnline ? "is-online" : ""}>
              {presence.isOnline ? "Online now" : formatLastSeen(presence.lastSeen)}
            </small>
          </div>
          <div className="friend-actions">
            <button type="button" onClick={() => onOpenChat?.(friend)} aria-label={`Chat with ${friend.displayName}`}>
              <UiIcon name="chat" size={17} />
            </button>
            <button type="button" onClick={() => onStartCall?.(friend, "audio")} aria-label={`Audio call ${friend.displayName}`}>
              <UiIcon name="phone" size={17} />
            </button>
            <button type="button" onClick={() => onStartCall?.(friend, "video")} aria-label={`Video call ${friend.displayName}`}>
              <UiIcon name="video" size={17} />
            </button>
            <button className="is-danger" type="button" onClick={() => handleRemoveFriend(friend)} aria-label={`Remove ${friend.displayName}`}>
              <UiIcon name="trash" size={16} />
            </button>
          </div>
        </article>
      );
    });
  };

  const renderRequests = () => {
    if (!pendingRequests.length) {
      return (
        <EmptyState
          icon="inbox"
          title="No pending requests"
          copy="New connection requests will appear here."
        />
      );
    }

    return pendingRequests.map((request) => (
      <article className="friend-card request-card" key={request.id}>
        <FriendAvatar photoURL={request.fromPhoto} name={request.fromName} />
        <div className="friend-copy">
          <strong>{request.fromName}</strong>
          <small>Wants to connect with you</small>
        </div>
        <div className="request-actions">
          <button className="accept-button" type="button" onClick={() => handleAcceptRequest(request)}>
            <UiIcon name="check" size={16} /> Accept
          </button>
          <button className="decline-button" type="button" onClick={() => handleRejectRequest(request)}>
            Decline
          </button>
        </div>
      </article>
    ));
  };

  const renderDiscover = () => {
    const friendUids = new Set(friends.map((friend) => friend.uid));
    const sentUids = new Set(sentRequests.map((request) => request.to));

    return (
      <>
        <label className="friends-search">
          <UiIcon name="search" size={18} />
          <input
            type="search"
            value={searchQuery}
            placeholder="Search people by display name"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        {searching && <div className="friends-loading"><i /> Searching AuraCall…</div>}
        {!searching && searchQuery.trim().length < 2 && (
          <EmptyState
            icon="globe"
            title="Discover AuraCall people"
            copy="Enter at least two characters to find someone."
          />
        )}
        {!searching && searchQuery.trim().length >= 2 && !searchResults.length && (
          <EmptyState icon="search" title="No people found" copy="Try another display name." />
        )}
        {!searching &&
          searchResults.map((user) => (
            <article className="friend-card discover-card" key={user.id}>
              <FriendAvatar photoURL={user.photoURL} name={user.displayName} />
              <div className="friend-copy">
                <strong>{user.displayName || "AuraCall user"}</strong>
                <small>{user.bio || "Available on AuraCall X"}</small>
              </div>
              {friendUids.has(user.id) ? (
                <span className="friend-state is-friend"><UiIcon name="check" size={14} /> Friends</span>
              ) : sentUids.has(user.id) ? (
                <span className="friend-state">Request sent</span>
              ) : (
                <button className="add-friend-button" type="button" onClick={() => handleSendRequest(user)}>
                  <UiIcon name="userPlus" size={16} /> Add
                </button>
              )}
            </article>
          ))}
      </>
    );
  };

  return (
    <div className="friends-hub">
      {status && (
        <div className={`friends-status ${status.type === "error" ? "is-error" : ""}`}>
          {status.message}
        </div>
      )}

      <div className="friends-tabs" role="tablist" aria-label="Friends sections">
        {TABS.map((tab) => {
          const count =
            tab.key === "friends"
              ? friends.length
              : tab.key === "requests"
                ? pendingRequests.length
                : 0;
          return (
            <button
              className={activeTab === tab.key ? "is-active" : ""}
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              <UiIcon name={tab.icon} size={17} />
              <span>{tab.label}</span>
              {count > 0 && <b>{count}</b>}
            </button>
          );
        })}
      </div>

      <div className="friends-content">
        {activeTab === "friends" && renderFriends()}
        {activeTab === "requests" && renderRequests()}
        {activeTab === "discover" && renderDiscover()}
      </div>
    </div>
  );
}
