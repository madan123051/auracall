import React, { useEffect, useMemo, useRef, useState } from "react";
import UiIcon from "./UiIcon";

const OUTPUT_SIZE = 512;
const PREVIEW_SIZE = 280;

export default function ProfilePhotoCropper({ file, onCancel, onComplete }) {
  const imageRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const preview = useMemo(() => {
    if (!imageSize.width || !imageSize.height) return null;
    const baseScale = Math.max(PREVIEW_SIZE / imageSize.width, PREVIEW_SIZE / imageSize.height);
    const scale = baseScale * zoom;
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;
    return {
      width,
      height,
      offsetX: (positionX / 100) * Math.max(0, (width - PREVIEW_SIZE) / 2),
      offsetY: (positionY / 100) * Math.max(0, (height - PREVIEW_SIZE) / 2),
    };
  }, [imageSize, positionX, positionY, zoom]);

  const createCroppedFile = async () => {
    const image = imageRef.current;
    if (!image || !imageSize.width || processing) return;
    setProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      context.fillStyle = "#0b0e23";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const baseScale = Math.max(
        OUTPUT_SIZE / imageSize.width,
        OUTPUT_SIZE / imageSize.height
      );
      const scale = baseScale * zoom;
      const renderWidth = imageSize.width * scale;
      const renderHeight = imageSize.height * scale;
      const offsetX = (positionX / 100) * Math.max(0, (renderWidth - OUTPUT_SIZE) / 2);
      const offsetY = (positionY / 100) * Math.max(0, (renderHeight - OUTPUT_SIZE) / 2);

      context.drawImage(
        image,
        (OUTPUT_SIZE - renderWidth) / 2 + offsetX,
        (OUTPUT_SIZE - renderHeight) / 2 + offsetY,
        renderWidth,
        renderHeight
      );

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Could not crop image"))),
          "image/jpeg",
          0.9
        );
      });
      await onComplete(
        new File([blob], `auracall-profile-${Date.now()}.jpg`, { type: "image/jpeg" })
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="photo-crop-overlay" role="dialog" aria-modal="true" aria-label="Crop profile photo">
      <div className="photo-crop-card">
        <div className="photo-crop-heading">
          <div>
            <span className="section-kicker">Profile photo</span>
            <h2>Crop and position</h2>
            <p>Final image will be optimized to 512 × 512 px.</p>
          </div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="Close crop tool">
            <UiIcon name="close" size={19} />
          </button>
        </div>

        <div className="photo-crop-preview">
          {imageUrl && (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop preview"
              onLoad={(event) =>
                setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              style={
                preview
                  ? {
                      width: `${preview.width}px`,
                      height: `${preview.height}px`,
                      transform: `translate(-50%, -50%) translate(${preview.offsetX}px, ${preview.offsetY}px)`,
                    }
                  : undefined
              }
            />
          )}
          <div className="photo-crop-guide" />
        </div>

        <div className="photo-crop-controls">
          <label>
            <span><UiIcon name="search" size={15} /> Zoom</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Horizontal</span>
            <input
              type="range"
              min="-100"
              max="100"
              value={positionX}
              onChange={(event) => setPositionX(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Vertical</span>
            <input
              type="range"
              min="-100"
              max="100"
              value={positionY}
              onChange={(event) => setPositionY(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="photo-crop-meta">
          <span>Original: {imageSize.width || "…"} × {imageSize.height || "…"}</span>
          <span>JPEG · optimized upload</span>
        </div>

        <div className="photo-crop-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" type="button" onClick={createCroppedFile} disabled={processing}>
            <UiIcon name="check" size={17} />
            {processing ? "Preparing..." : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
