"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";
import { createNoise3D } from "simplex-noise";

interface VortexProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  particleCount?: number;
  rangeY?: number;
  baseHue?: number;
  baseSpeed?: number;
  rangeSpeed?: number;
  baseRadius?: number;
  rangeRadius?: number;
  backgroundColor?: string;
}

export const Vortex = ({
  children,
  className,
  containerClassName,
  particleCount = 700,
  rangeY = 100,
  baseHue = 220,
  baseSpeed = 0.0,
  rangeSpeed = 1.5,
  baseRadius = 1,
  rangeRadius = 2,
  backgroundColor = "#000010",
}: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const noise3D = createNoise3D();
    let tick = 0;

    const TAU = 2 * Math.PI;
    const rand = (n: number) => n * Math.random();
    const randRange = (n: number) => n - rand(2 * n);
    const fadeInOut = (t: number, m: number) => {
      const hm = 0.5 * m;
      return Math.abs(((t + hm) % m) - hm) / hm;
    };

    let w = (canvas.width = container.offsetWidth);
    let h = (canvas.height = container.offsetHeight);

    const count = particleCount;
    const PARTICLE_PROP_COUNT = 9;
    const particleProps = new Float32Array(count * PARTICLE_PROP_COUNT);

    const initParticle = (i: number) => {
      const x = rand(w);
      const y = h / 2 + randRange(rangeY);
      const vx = 0,
        vy = 0;
      const life = 0;
      const ttl = 50 + rand(150);
      const speed = baseSpeed + rand(rangeSpeed);
      const radius = baseRadius + rand(rangeRadius);
      const hue = baseHue + rand(100);
      particleProps.set([x, y, vx, vy, life, ttl, speed, radius, hue], i);
    };

    for (let i = 0; i < count * PARTICLE_PROP_COUNT; i += PARTICLE_PROP_COUNT) {
      initParticle(i);
    }

    const drawParticle = (
      x: number,
      y: number,
      x2: number,
      y2: number,
      life: number,
      ttl: number,
      radius: number,
      hue: number
    ) => {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = radius;
      ctx.strokeStyle = `hsla(${hue},100%,85%,${fadeInOut(life, ttl) * 1.4})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };

    const updateParticle = (i: number) => {
      const i2 = i + 1,
        i3 = i + 2,
        i4 = i + 3,
        i5 = i + 4;
      const i6 = i + 5,
        i7 = i + 6,
        i8 = i + 7,
        i9 = i + 8;
      let x = particleProps[i];
      let y = particleProps[i2];
      const n =
        noise3D(x * 0.0015, y * 0.0015, tick * 0.0005) * TAU;
      const vx = (particleProps[i3] + Math.cos(n)) * 0.5;
      const vy = (particleProps[i4] + Math.sin(n)) * 0.5;
      let life = particleProps[i5];
      const ttl = particleProps[i6];
      const speed = particleProps[i7];
      const radius = particleProps[i8];
      const hue = particleProps[i9];
      const x2 = x + vx * speed;
      const y2 = y + vy * speed;
      drawParticle(x, y, x2, y2, life, ttl, radius, hue);
      life++;
      particleProps[i] = x2;
      particleProps[i2] = y2;
      particleProps[i3] = vx;
      particleProps[i4] = vy;
      particleProps[i5] = life;
      if (life > ttl || x2 < 0 || x2 > w || y2 < 0 || y2 > h)
        initParticle(i);
    };

    const renderGlow = () => {
      ctx.save();
      ctx.filter = "blur(12px) brightness(400%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.filter = "blur(6px) brightness(300%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.filter = "blur(2px) brightness(150%)";
      ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    };

    const draw = () => {
      tick++;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, w, h);
      for (
        let i = 0;
        i < count * PARTICLE_PROP_COUNT;
        i += PARTICLE_PROP_COUNT
      ) {
        updateParticle(i);
      }
      renderGlow();
      animId = requestAnimationFrame(draw);
    };

    const resize = () => {
      w = canvas.width = container.offsetWidth;
      h = canvas.height = container.offsetHeight;
    };

    window.addEventListener("resize", resize);
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [
    particleCount,
    rangeY,
    baseHue,
    baseSpeed,
    rangeSpeed,
    baseRadius,
    rangeRadius,
    backgroundColor,
  ]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full", containerClassName)}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
};
