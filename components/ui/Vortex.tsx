'use client';

import React, { useEffect, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import { cn } from '@/lib/cn';

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
  backgroundColor = '#000000',
}: VortexProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const noise3D = createNoise3D();
    const TAU = 2 * Math.PI;
    const PROPS = 9;
    const propCount = particleCount * PROPS;
    const props = new Float32Array(propCount);
    let tick = 0;
    let cy = 0;

    const X_OFF = 0.00125;
    const Y_OFF = 0.00125;
    const Z_OFF = 0.0005;

    const rand = (n: number) => n * Math.random();
    const randRange = (n: number) => n - rand(2 * n);
    const fadeInOut = (t: number, m: number) => {
      const hm = 0.5 * m;
      return Math.abs(((t + hm) % m) - hm) / hm;
    };
    const lerp = (a: number, b: number, t: number) => (1 - t) * a + t * b;

    const initParticle = (i: number) => {
      props.set(
        [
          rand(canvas.width),
          cy + randRange(rangeY),
          0,
          0,
          0,
          50 + rand(150),
          baseSpeed + rand(rangeSpeed),
          baseRadius + rand(rangeRadius),
          baseHue + rand(100),
        ],
        i
      );
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cy = 0.5 * canvas.height;
    };

    resize();
    for (let i = 0; i < propCount; i += PROPS) initParticle(i);

    const draw = () => {
      tick++;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < propCount; i += PROPS) {
        const x    = props[i];
        const y    = props[i + 1];
        let vx     = props[i + 2];
        let vy     = props[i + 3];
        const life = props[i + 4];
        const ttl  = props[i + 5];
        const spd  = props[i + 6];
        const r    = props[i + 7];
        const hue  = props[i + 8];

        const angle = TAU * noise3D(x * X_OFF, y * Y_OFF, tick * Z_OFF);
        vx = lerp(vx, Math.cos(angle) * spd, 0.5);
        vy = lerp(vy, Math.sin(angle) * spd, 0.5);

        const x2 = x + vx;
        const y2 = y + vy;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = r;
        ctx.strokeStyle = `hsla(${hue},100%,60%,${fadeInOut(life, ttl)})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();

        props[i]     = x2;
        props[i + 1] = y2;
        props[i + 2] = vx;
        props[i + 3] = vy;
        props[i + 4] = life + 1;

        if (x2 > canvas.width || x2 < 0 || y2 > canvas.height || y2 < 0 || life > ttl) {
          initParticle(i);
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [particleCount, rangeY, baseHue, baseSpeed, rangeSpeed, baseRadius, rangeRadius, backgroundColor]);

  return (
    <div ref={containerRef} className={cn('relative h-full w-full', containerClassName)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className={cn('relative z-10 h-full w-full', className)}>{children}</div>
    </div>
  );
};
