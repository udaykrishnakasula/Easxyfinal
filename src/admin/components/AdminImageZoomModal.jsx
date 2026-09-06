import React, { useState, useEffect, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Download,
  X,
  RotateCcw as ResetIcon,
  FileImage,
  Move,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * AdminImageZoomModal
 * Full-featured interactive zoom modal for KYC documents & deposit proof screenshots.
 * Supports:
 * - Zoom In (+) / Zoom Out (-) / Preset Zoom Levels (50%, 100%, 150%, 200%, 300%)
 * - Pan & Drag when zoomed in
 * - 90-degree Rotation (Clockwise & Counter-Clockwise)
 * - Flip Horizontal
 * - Reset view to original state
 * - Fullscreen toggle
 * - External link to view original raw media
 * - Keyboard shortcuts: +, -, 0 (reset), r (rotate), Esc (close)
 */
export function AdminImageZoomModal({
  open,
  onClose,
  imageUrl,
  title = "Image Inspection",
  subtitle,
  details = [],
}) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const containerRef = useRef(null);

  // Reset transformation state when modal opens or image changes
  useEffect(() => {
    if (open) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setLoadError(false);
    }
  }, [open, imageUrl]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if focus is in an input or textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        return;
      }

      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetTransform();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        rotateClockwise();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, scale, rotation]);

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.35, 4));
  };

  const zoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.35, 0.4);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 }); // Center back if zoomed out
      }
      return next;
    });
  };

  const rotateClockwise = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const rotateCounterClockwise = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const resetTransform = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return; // Only allow panning when zoomed in
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose?.()}>
      <DialogContent
        className={`bg-ex-surface border-white/10 text-ex-text p-0 overflow-hidden shadow-2xl transition-all duration-200 ${
          isFullscreen
            ? "max-w-[98vw] h-[96vh] rounded-xl"
            : "sm:max-w-4xl max-h-[90vh] rounded-ex-card"
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/40">
          <div className="min-w-0 pr-4">
            <DialogTitle className="ex-display text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
              <span>{title}</span>
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-white/10 text-ex-lav-200 font-mono">
                {Math.round(scale * 100)}%
              </span>
              {rotation !== 0 && (
                <span className="text-xs font-normal px-2 py-0.5 rounded bg-purple-900/40 text-purple-200 font-mono">
                  {rotation}°
                </span>
              )}
            </DialogTitle>
            {subtitle && (
              <p className="text-xs text-ex-muted mt-0.5 truncate">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Raw External */}
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-xs text-ex-muted hover:text-white transition"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Raw</span>
              </a>
            )}

            {/* Toggle Fullscreen Modal */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-ex-ctrl bg-white/5 hover:bg-rose-500/20 text-ex-muted hover:text-rose-400 transition ml-1"
              title="Close inspection (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inspection Details / Permanent Address Verification Banner */}
        {details && details.length > 0 && (
          <div className="px-5 py-2.5 bg-purple-950/40 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 min-w-0">
              {details.map((item, idx) => (
                <div key={idx} className="flex items-start sm:items-center gap-1.5">
                  <span className="text-purple-300/80 font-medium shrink-0">{item.label}:</span>
                  <span className="text-white font-semibold break-all sm:break-normal">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-purple-300/70 font-mono shrink-0 hidden sm:block">
              Verify Document vs Address Record
            </div>
          </div>
        )}

        {/* Viewport canvas for interactive zooming and panning */}
        <div
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`relative w-full bg-black/90 select-none overflow-hidden flex items-center justify-center cursor-${
            scale > 1 ? (isDragging ? "grabbing" : "grab") : "default"
          } ${isFullscreen ? "h-[calc(96vh-130px)]" : "h-[62vh]"}`}
        >
          {/* Background grid pattern for transparency / visual contrast */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {loadError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center text-ex-muted z-10">
              <FileImage className="h-12 w-12 text-rose-400/80 mb-2" />
              <div className="text-sm font-semibold text-white">Image Preview Unavailable</div>
              <div className="text-xs text-ex-muted mt-1 max-w-sm">
                The image binary could not be rendered or has expired.
              </div>
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 px-3 py-1.5 rounded-ex-ctrl bg-white/10 hover:bg-white/20 text-xs text-white transition flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Try opening source link
                </a>
              )}
            </div>
          ) : imageUrl ? (
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.2, 0, 0, 1)",
                transformOrigin: "center center",
              }}
              className="max-h-full max-w-full flex items-center justify-center p-4 pointer-events-none"
            >
              <img
                src={imageUrl}
                alt={title}
                onError={(e) => {
                  console.error(
                    `[AdminImageZoomModal] Failed to render image for: ${title}`,
                    e
                  );
                  setLoadError(true);
                }}
                className="max-h-[56vh] sm:max-h-[60vh] w-auto max-w-full object-contain rounded shadow-2xl drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
              />
            </div>
          ) : (
            <div className="text-xs text-ex-muted">No image source specified</div>
          )}

          {/* Floating Pan Hint when Zoomed */}
          {scale > 1 && !isDragging && (
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[11px] text-ex-lav-200 flex items-center gap-1.5 pointer-events-none">
              <Move className="h-3 w-3 text-purple-400" />
              <span>Click & Drag to pan</span>
            </div>
          )}
        </div>

        {/* Toolbar Footer with Interactive Controls */}
        <div className="px-4 py-3 bg-black/50 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Controls: Zoom In, Out, Rotate, Reset */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-ex-ctrl border border-white/10">
            <button
              type="button"
              onClick={zoomOut}
              disabled={scale <= 0.4}
              className="p-1.5 rounded hover:bg-white/10 text-ex-muted hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            {/* Quick Zoom Presets */}
            <button
              type="button"
              onClick={() => setScale(1)}
              className={`px-2 py-1 rounded font-mono font-medium transition ${
                scale === 1
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-ex-muted hover:text-white hover:bg-white/10"
              }`}
              title="Fit to screen (100%)"
            >
              100%
            </button>

            <button
              type="button"
              onClick={() => setScale(2)}
              className={`px-2 py-1 rounded font-mono font-medium transition ${
                scale === 2
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-ex-muted hover:text-white hover:bg-white/10"
              }`}
              title="200% magnification"
            >
              200%
            </button>

            <button
              type="button"
              onClick={zoomIn}
              disabled={scale >= 4}
              className="p-1.5 rounded hover:bg-white/10 text-ex-muted hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="h-4 w-[1px] bg-white/15 mx-1" />

            {/* Rotation Controls */}
            <button
              type="button"
              onClick={rotateCounterClockwise}
              className="p-1.5 rounded hover:bg-white/10 text-ex-muted hover:text-white transition"
              title="Rotate Counter-Clockwise 90°"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={rotateClockwise}
              className="p-1.5 rounded hover:bg-white/10 text-ex-muted hover:text-white transition"
              title="Rotate Clockwise 90° (R)"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <div className="h-4 w-[1px] bg-white/15 mx-1" />

            {/* Reset All */}
            <button
              type="button"
              onClick={resetTransform}
              className="p-1.5 rounded hover:bg-white/10 text-ex-muted hover:text-white transition flex items-center gap-1"
              title="Reset Zoom and Rotation (0)"
            >
              <ResetIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-[11px]">Reset</span>
            </button>
          </div>

          {/* Action info / Shortcuts help */}
          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[11px] text-ex-muted/70">
              Scroll to zoom · Drag to pan · Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">R</kbd> to rotate
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-ex-ctrl bg-white/10 hover:bg-white/15 text-white font-medium transition text-xs"
            >
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
