import React, { useRef, useState } from 'react';
export function SignatureInput({ onChange }: { onChange: (value: string | undefined) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const point = useRef<{ x: number; y: number }>();
  const [typed, setTyped] = useState('');
  const position = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - bounds.left) * 700) / bounds.width,
      y: ((e.clientY - bounds.top) * 320) / bounds.height,
    };
  };
  const clear = () => {
    canvas.current!.getContext('2d')!.clearRect(0, 0, 700, 320);
    point.current = undefined;
    setTyped('');
    onChange(undefined);
  };
  return (
    <>
      <p>Ask the recipient to sign below, or type their signature.</p>
      <canvas
        ref={canvas}
        width={700}
        height={320}
        className="driver-signature"
        aria-label="Recipient signature drawing area"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          point.current = position(e);
        }}
        onPointerMove={(e) => {
          if (!point.current) return;
          const p = position(e);
          const ctx = e.currentTarget.getContext('2d')!;
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#102a43';
          ctx.beginPath();
          ctx.moveTo(point.current.x, point.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          point.current = p;
          onChange(e.currentTarget.toDataURL('image/png'));
        }}
        onPointerUp={() => {
          point.current = undefined;
        }}
        onPointerCancel={() => {
          point.current = undefined;
        }}
      />
      <label>
        Typed signature (accessible alternative)
        <input
          value={typed}
          maxLength={100}
          onChange={(e) => {
            const value = e.target.value;
            setTyped(value);
            const ctx = canvas.current!.getContext('2d')!;
            ctx.clearRect(0, 0, 700, 320);
            ctx.fillStyle = '#102a43';
            ctx.font = 'italic 36px serif';
            ctx.fillText(value, 20, 150, 660);
            onChange(value.trim() ? canvas.current!.toDataURL('image/png') : undefined);
          }}
        />
      </label>
      <button type="button" onClick={clear}>
        Clear signature / Re-sign
      </button>
    </>
  );
}
