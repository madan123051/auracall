import React, { useEffect, useRef, useState } from "react";
import UiIcon from "./UiIcon";

const ACTION_WIDTH = 82;
const OPEN_THRESHOLD = 46;

export default function SwipeActionRow({
  children,
  onDelete,
  onReply,
  confirmMessage = "Delete this item?",
  deleteLabel = "Delete",
  className = "",
  disabled = false,
  onDeleteError,
}) {
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const offsetRef = useRef(0);
  const startRef = useRef({ x: 0, y: 0, offset: 0 });
  const draggingRef = useRef(false);
  const axisRef = useRef("");
  const rowIdRef = useRef(`swipe-${Math.random().toString(36).slice(2)}`);

  const updateOffset = (nextOffset) => {
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  };

  useEffect(() => {
    const closeOtherRow = (event) => {
      if (event.detail !== rowIdRef.current) updateOffset(0);
    };
    window.addEventListener("auracall:swipe-open", closeOtherRow);
    return () => window.removeEventListener("auracall:swipe-open", closeOtherRow);
  }, []);

  const handlePointerDown = (event) => {
    if (disabled || deleting || event.button !== 0 || event.target.closest("button")) return;
    startRef.current = { x: event.clientX, y: event.clientY, offset };
    draggingRef.current = true;
    setDragging(true);
    axisRef.current = "";
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current) return;
    const deltaX = event.clientX - startRef.current.x;
    const deltaY = event.clientY - startRef.current.y;

    if (!axisRef.current && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      axisRef.current = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
    }
    if (axisRef.current !== "x") return;

    event.preventDefault();

    let raw = startRef.current.offset + deltaX;
    // Restrict directions based on available actions
    if (!onReply && raw > 0) raw = 0;
    if (!onDelete && raw < 0) raw = 0;
    const nextOffset = Math.max(-ACTION_WIDTH, Math.min(ACTION_WIDTH, raw));
    updateOffset(nextOffset);
  };

  const finishSwipe = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);

    const currentOffset = offsetRef.current;
    const abs = Math.abs(currentOffset);

    // Right swipe past threshold → trigger reply and snap back
    if (currentOffset > 0 && abs >= OPEN_THRESHOLD && onReply) {
      onReply();
      updateOffset(0);
      return;
    }

    // Left swipe past threshold → open delete action
    const nextOffset = abs >= OPEN_THRESHOLD ? Math.sign(currentOffset) * ACTION_WIDTH : 0;
    updateOffset(nextOffset);
    if (nextOffset !== 0) {
      window.dispatchEvent(
        new CustomEvent("auracall:swipe-open", { detail: rowIdRef.current })
      );
    }
  };

  const handleDelete = async () => {
    if (disabled || deleting || !onDelete) return;
    if (!window.confirm(confirmMessage)) return;
    setDeleting(true);
    try {
      await onDelete();
      updateOffset(0);
    } catch (error) {
      onDeleteError?.(error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`swipe-action-row ${offset > 0 ? "is-open is-open-right" : offset < 0 ? "is-open is-open-left" : ""} ${dragging ? "is-dragging" : ""} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
    >
      {/* Left slot — Reply (revealed by right swipe, snaps back) */}
      {onReply && (
        <button
          className="swipe-reply-action is-left"
          type="button"
          onClick={() => { onReply(); updateOffset(0); }}
          aria-label="Reply"
        >
          <UiIcon name="reply" size={18} />
          <span>Reply</span>
        </button>
      )}

      {/* Right slot — Delete (revealed by left swipe) */}
      {onDelete && (
        <button
          className="swipe-delete-action is-right"
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={deleteLabel}
        >
          <UiIcon name="trash" size={18} />
          <span>{deleting ? "Deleting" : deleteLabel}</span>
        </button>
      )}

      <div
        className="swipe-action-content"
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
      >
        {children}
      </div>

      {/* Desktop hover delete button */}
      {onDelete && (
        <button
          className="swipe-desktop-delete"
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label={deleteLabel}
          title={deleteLabel}
        >
          <UiIcon name="trash" size={17} />
        </button>
      )}
    </div>
  );
}
