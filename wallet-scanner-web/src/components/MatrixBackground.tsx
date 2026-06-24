"use client";

import { useEffect, useRef } from "react";

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle resizing
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Characters definition (binary, hex, and cryptographic symbols)
    const chars = "01#%*+@&x$ΞØ▲▼⚡⚙☠";
    const charArray = chars.split("");
    const fontSize = 11;

    // Columns definition
    let columns = Math.floor(canvas.width / fontSize);
    let drops: number[] = Array(columns).fill(0).map(() => Math.floor(Math.random() * -100));

    // ResizeObserver to adjust columns dynamically when page layout shifts
    const resizeObserver = new ResizeObserver(() => {
      if (canvas.parentElement) {
        const newWidth = canvas.parentElement.clientWidth;
        const newHeight = canvas.parentElement.clientHeight;
        canvas.width = newWidth;
        canvas.height = newHeight;

        columns = Math.floor(newWidth / fontSize);
        drops = Array(columns).fill(0).map((_, i) => drops[i] || Math.floor(Math.random() * -100));
      }
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    let animationId: number;
    let lastTime = 0;
    const fps = 24; // Throttle frame rate to save CPU/GPU resources
    const interval = 1000 / fps;

    const draw = (timestamp: number) => {
      animationId = requestAnimationFrame(draw);

      const elapsed = timestamp - lastTime;
      if (elapsed < interval) return;
      lastTime = timestamp - (elapsed % interval);

      // Translucent fill to create the trail fade effect
      ctx.fillStyle = "rgba(6, 8, 15, 0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = charArray[Math.floor(Math.random() * charArray.length)];

        // Mix brand purple, hacker green, and warm amber/orange matching the user's reference
        let fillStyle = "rgba(139, 92, 246, 0.35)"; // Default purple

        const rand = Math.random();
        if (rand < 0.04) {
          fillStyle = "#ffffff"; // Lead drop glow
        } else if (rand < 0.12) {
          fillStyle = "rgba(16, 185, 129, 0.6)"; // Neon Green
        } else if (rand < 0.26) {
          fillStyle = "rgba(245, 158, 11, 0.65)"; // Amber / Orange
        } else if (rand < 0.40) {
          fillStyle = "rgba(192, 132, 252, 0.6)"; // Light Purple
        }

        ctx.fillStyle = fillStyle;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        // Reset drop position or push it down
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i]++;
        }
      }
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.14] mix-blend-screen"
    />
  );
}
