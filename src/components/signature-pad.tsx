"use client";

import { useEffect, useRef, useState } from "react";

export function SignaturePad({ label, onChange }: { label: string; onChange: (file: File | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const touchedRef = useRef(false);
  const previousRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = Math.max(280, Math.floor(canvas.getBoundingClientRect().width));
    const height = 190;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "#0f172a";
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    previousRef.current = point(event);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !previousRef.current) return;
    const next = point(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(previousRef.current.x, previousRef.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    previousRef.current = next;
    touchedRef.current = true;
    setHasSignature(true);
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    previousRef.current = null;
    if (touchedRef.current) {
      event.currentTarget.toBlob((blob) => {
        onChange(blob ? new File([blob], "firma.png", { type: "image/png" }) : null);
      }, "image/png");
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    setHasSignature(false);
    touchedRef.current = false;
    onChange(null);
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <button type="button" onClick={clear} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">Limpiar firma</button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        className="h-[190px] w-full touch-none rounded-2xl border border-dashed border-slate-400 bg-white"
        aria-label={label}
      />
      <p className={`mt-2 text-xs ${hasSignature ? "text-emerald-700" : "text-slate-500"}`}>
        {hasSignature ? "Firma capturada." : "Firma dentro del cuadro usando el dedo o un lapiz tactil."}
      </p>
    </div>
  );
}
