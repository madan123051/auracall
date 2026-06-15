import React, { useEffect, useRef, useState } from "react";
import UiIcon from "./UiIcon";

const ACTION_WIDTH = 82;
const OPEN_THRESHOLD = 46;

export default function SwipeActionRow({
  children,
  onDelete,
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
    const nextOffset = Math.max(
      -ACTION_WIDTH,
      Math.min(ACTION_WIDTH, startRef.current.offset + deltaX)
    );
    updateOffset(nextOffset);
  };

  const finishSwipe = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const nextOffset =
      Math.abs(offsetRef.current) >= OPEN_THRESHOLD
        ? Math.sign(offsetRef.current || 1) * ACTION_WIDTH
        : 0;
    updateOffset(nextOffset);
    if (nextOffset) {
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

  const actionButton = (side) => (
    <button
      className={`swipe-delete-action is-${side}`}
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      aria-label={deleteLabel}
    >
      <UiIcon name="trash" size={18} />
      <span>{deleting ? "Deleting" : deleteLabel}</span>
    </button>
  );

  return (
    <div
      className={`swipe-action-row ${offset > 0 ? "is-open is-open-right" : offset < 0 ? "is-open is-open-left" : ""} ${dragging ? "is-dragging" : ""} ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSwipe}
      onPointerCancel={finishSwipe}
    >
      {actionButton("left")}
      {actionButton("right")}
      <div
        className="swipe-action-content"
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
      >
        {children}
      </div>
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
    </div>
  );
}
