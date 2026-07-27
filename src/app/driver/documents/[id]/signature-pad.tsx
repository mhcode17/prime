"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";

export interface SignaturePadHandle {
  toDataURL: () => string | null;
  clear: () => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useImperativeHandle(ref, () => ({
    toDataURL: () => (hasInk ? canvasRef.current?.toDataURL("image/png") ?? null : null),
    clear: () => {
      const c = canvasRef.current;
      if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
      setHasInk(false);
    },
  }));

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (c.width / rect.width),
      y: (e.clientY - rect.top) * (c.height / rect.height),
    };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={500}
        height={160}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full touch-none rounded-lg border border-slate-300 bg-white"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-slate-400">Sign above with mouse or finger</span>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </div>
    </div>
  );
});
SignaturePad.displayName = "SignaturePad";
