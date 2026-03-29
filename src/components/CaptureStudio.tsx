import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface CaptureStudioProps {
  onClose: () => void;
  onInsertPath?: (filePath: string) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeRect(start: Point, end: Point): Rect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export const CaptureStudio: React.FC<CaptureStudioProps> = ({ onClose, onInsertPath }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [status, setStatus] = useState('Capture a screen, drag to crop, then copy or save the result.');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const finalImage = cropImage || sourceImage;

  const captureScreen = useCallback(async () => {
    setIsCapturing(true);
    setStatus('Capturing current screen...');
    setSavedPath(null);
    try {
      const result = await window.systalog?.screenshot.capture();
      if (result?.success && result.dataUrl) {
        setSourceImage(result.dataUrl);
        setSelection(null);
        setCropImage(null);
        setStatus('Screen captured. Drag across the preview to define a post-ready crop.');
      } else {
        setStatus(result?.error || 'Capture failed.');
      }
    } finally {
      setIsCapturing(false);
    }
  }, []);

  useEffect(() => {
    captureScreen();
  }, [captureScreen]);

  useEffect(() => {
    if (!sourceImage || !selection || selection.width < 12 || selection.height < 12 || !imgRef.current) {
      setCropImage(null);
      return;
    }

    const img = imgRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;

    if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) return;

    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(selection.width * scaleX));
    canvas.height = Math.max(1, Math.round(selection.height * scaleY));
    const context = canvas.getContext('2d');
    if (!context) return;

    const image = new Image();
    image.onload = () => {
      context.drawImage(
        image,
        Math.round(selection.x * scaleX),
        Math.round(selection.y * scaleY),
        Math.round(selection.width * scaleX),
        Math.round(selection.height * scaleY),
        0,
        0,
        canvas.width,
        canvas.height,
      );
      setCropImage(canvas.toDataURL('image/png'));
    };
    image.src = sourceImage;
  }, [sourceImage, selection]);

  const selectionLabel = useMemo(() => {
    if (!selection || selection.width < 12 || selection.height < 12) return 'Full screen';
    return `Crop ${Math.round(selection.width)} × ${Math.round(selection.height)}`;
  }, [selection]);

  const relativePoint = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(event.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(event.clientY - rect.top, rect.height)),
    };
  }, []);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    if (!sourceImage) return;
    const point = relativePoint(event);
    setDragStart(point);
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
  }, [relativePoint, sourceImage]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLImageElement>) => {
    if (!dragStart) return;
    const point = relativePoint(event);
    setSelection(normalizeRect(dragStart, point));
  }, [dragStart, relativePoint]);

  const finishSelection = useCallback(() => {
    setDragStart(null);
  }, []);

  const copyImage = useCallback(async () => {
    if (!finalImage) return;
    const result = await window.systalog?.clipboard.writeImage(finalImage);
    setStatus(result?.success ? 'Image copied to clipboard.' : (result?.error || 'Could not copy image.'));
  }, [finalImage]);

  const saveImage = useCallback(async () => {
    if (!finalImage) return;
    setIsSaving(true);
    const result = await window.systalog?.screenshot.save(finalImage);
    setIsSaving(false);
    if (result?.success && result.path) {
      setSavedPath(result.path);
      setStatus(`Saved PNG to ${result.path}`);
      return result.path;
    }
    setStatus(result?.error || 'Could not save capture.');
    return null;
  }, [finalImage]);

  const saveAndInsert = useCallback(async () => {
    const filePath = await saveImage();
    if (filePath && onInsertPath) {
      onInsertPath(filePath);
      setStatus(`Saved PNG and inserted ${filePath} into the active session.`);
    }
  }, [onInsertPath, saveImage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-[min(1180px,95vw)] h-[min(820px,92vh)] rounded-[28px] border border-white/10 bg-[#07111f] shadow-[0_40px_120px_rgba(2,6,17,0.85)] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full">
          <div className="w-[340px] border-r border-white/10 bg-[radial-gradient(circle_at_top,#18253d,transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_45%)] p-6 flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#f2a33b]/70 font-mono">Capture Studio</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Post-ready screenshots</h2>
              </div>
              <button onClick={onClose} className="text-white/35 hover:text-white text-lg">×</button>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={captureScreen}
                disabled={isCapturing}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#f2a33b,#e85d3f)] px-4 py-3 text-left text-[12px] font-bold text-white shadow-lg shadow-[#e85d3f]/15 disabled:opacity-60"
              >
                {isCapturing ? 'Capturing screen...' : 'Capture current screen'}
              </button>
              <button
                onClick={() => {
                  setSelection(null);
                  setCropImage(null);
                  setStatus('Using the full-screen capture.');
                }}
                disabled={!sourceImage}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-[12px] font-semibold text-white/80 disabled:opacity-40"
              >
                Reset to full screen
              </button>
            </div>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-mono">Selection</p>
              <p className="mt-2 text-lg font-bold text-white">{selectionLabel}</p>
              <p className="mt-2 text-[11px] leading-5 text-white/45">
                Drag over the preview to define the exact crop you want copied or saved. No more blind full-screen dumps.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={copyImage}
                disabled={!finalImage}
                className="w-full rounded-2xl border border-[#14b8a6]/25 bg-[#14b8a6]/10 px-4 py-3 text-left text-[12px] font-semibold text-[#9ae6dc] disabled:opacity-40"
              >
                Copy image to clipboard
              </button>
              <button
                onClick={saveImage}
                disabled={!finalImage || isSaving}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-[12px] font-semibold text-white/75 disabled:opacity-40"
              >
                {isSaving ? 'Saving PNG...' : 'Save PNG to ~/Pictures/SYSTALOG'}
              </button>
              <button
                onClick={saveAndInsert}
                disabled={!finalImage || !onInsertPath}
                className="w-full rounded-2xl border border-[#38bdf8]/25 bg-[#38bdf8]/10 px-4 py-3 text-left text-[12px] font-semibold text-[#bdeafe] disabled:opacity-40"
              >
                Save and insert path into active session
              </button>
            </div>

            <div className="mt-auto rounded-3xl border border-white/10 bg-[#020611]/40 p-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-mono">Status</p>
              <p className="mt-2 text-[12px] leading-5 text-white/70 break-words">{status}</p>
              {savedPath && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => window.systalog?.clipboard.writeText(savedPath)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65"
                  >
                    Copy path
                  </button>
                  <button
                    onClick={() => window.systalog?.shell.openPath(savedPath)}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold text-white/65"
                  >
                    Reveal file
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 p-6">
            <div className="h-full rounded-[24px] border border-white/10 bg-[#020611]/45 p-4 flex items-center justify-center overflow-hidden">
              {sourceImage ? (
                <div className="relative max-h-full max-w-full">
                  <img
                    ref={imgRef}
                    src={sourceImage}
                    alt="Screen capture"
                    className="max-h-[calc(92vh-160px)] max-w-full rounded-2xl object-contain shadow-2xl shadow-black/40"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={finishSelection}
                    onMouseLeave={finishSelection}
                    draggable={false}
                  />
                  {selection && selection.width > 4 && selection.height > 4 && (
                    <div
                      className="pointer-events-none absolute border border-[#f2a33b] bg-[#f2a33b]/15 shadow-[0_0_0_1px_rgba(242,163,59,0.25)]"
                      style={{
                        left: selection.x,
                        top: selection.y,
                        width: selection.width,
                        height: selection.height,
                      }}
                    />
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-white/70 text-lg font-semibold">No screenshot loaded</p>
                  <p className="text-white/35 text-sm mt-2">Capture a screen to start framing the shot.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
