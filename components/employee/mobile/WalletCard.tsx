
import React, { useEffect, useRef, useState } from 'react';
import { User } from '../../../types';
import { ShieldCheck, Clock } from 'lucide-react';

interface WalletCardProps {
  user: User;
  onFlip?: () => void;
}

function calcTimeLeft(day: number, hour: number, minute: number) {
  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), day, hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target = new Date(now.getFullYear(), now.getMonth() + 1, day, hour, minute, 0, 0);
  }
  const diff = Math.max(0, target.getTime() - now.getTime());
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    target,
  };
}

export const WalletCard: React.FC<WalletCardProps> = ({ user }) => {
  const balanceRef = useRef<HTMLSpanElement>(null);
  const [expiryDay,    setExpiryDay]    = useState<number | null>(null);
  const [expiryHour,   setExpiryHour]   = useState(0);
  const [expiryMinute, setExpiryMinute] = useState(5);
  const [timeLeft,     setTimeLeft]     = useState<{ days: number; hours: number; minutes: number; target: Date } | null>(null);

  useEffect(() => {
    if (!user.companyId) return;
    fetch(`/api/companies/${user.companyId}`)
      .then(r => r.json())
      .then(d => {
        setExpiryDay(d.voucher_expiry_day ?? 10);
        setExpiryHour(d.voucher_expiry_hour ?? 0);
        setExpiryMinute(d.voucher_expiry_minute ?? 5);
      })
      .catch(() => { setExpiryDay(10); });
  }, [user.companyId]);

  useEffect(() => {
    if (expiryDay === null) return;
    const update = () => setTimeLeft(calcTimeLeft(expiryDay, expiryHour, expiryMinute));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [expiryDay, expiryHour, expiryMinute]);

  useEffect(() => {
    const el = balanceRef.current;
    if (!el) return;
    const target = user.voucherBalance ?? 0;
    const start = 0;
    const duration = 1200;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * eased).toString();
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [user.voucherBalance]);

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-2xl"
      style={{ aspectRatio: '1.586', backgroundImage: 'url(/karta.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Subtle dark scrim so text is always readable */}
      <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(160deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.32) 100%)' }} />



      {/* Content overlay */}
      <div className="absolute inset-0 p-8 flex flex-col justify-between" style={{ color: 'white' }}>

        {/* TOP ROW */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>Baltic Benefits System</span>
            </div>
            <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#86efac' }}>
              <ShieldCheck size={11}/> Verified Employee
            </p>
          </div>
          {/* BBS Neon Logo – top right */}
          <div className="pointer-events-none select-none" style={{ width: 80 }}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ position: 'absolute', width: '130%', height: '100%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(16,185,129,0.45) 0%, transparent 75%)', filter: 'blur(18px)', mixBlendMode: 'screen' }}/>
              <div style={{ position: 'absolute', width: '70%', height: '70%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.65) 0%, transparent 75%)', filter: 'blur(10px)', mixBlendMode: 'screen' }}/>
              <img src="/bbs-logo.png" alt="Baltic Benefits System" style={{ width: '100%', objectFit: 'contain', position: 'relative', zIndex: 2, filter: 'drop-shadow(0 0 10px rgba(34,197,94,0.7)) drop-shadow(0 0 4px rgba(74,222,128,0.8))' }}/>
            </div>
          </div>
        </div>

        {/* MIDDLE: Balance */}
        <div>
          <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>Dostępne środki</p>
          <div className="flex items-end gap-2">
            <span ref={balanceRef} className="font-black leading-none" style={{ fontSize: 44, letterSpacing: '-0.03em', textShadow: '0 2px 16px rgba(0,0,0,0.4)' }}>
              {user.voucherBalance ?? 0}
            </span>
            <span className="mb-1.5 font-bold text-base" style={{ color: 'rgba(255,255,255,0.95)' }}>PKT</span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>1 punkt = 1 PLN · do wykorzystania na benefity</p>
        </div>

        {/* BOTTOM ROW */}
        <div className="flex justify-between items-end pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div>
            <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>Właściciel karty</p>
            <p className="font-semibold text-sm tracking-wide">{user.name}</p>
          </div>
          <div className="text-right">
            {timeLeft ? (
              <>
                <p className="text-[9px] uppercase tracking-wider mb-0.5 flex items-center justify-end gap-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <Clock size={8} /> Wygaśnięcie
                </p>
                <p className="font-mono text-xs font-bold" style={{ color: timeLeft.days < 3 ? '#fca5a5' : '#86efac' }}>
                  {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}{String(timeLeft.hours).padStart(2,'0')}:{String(timeLeft.minutes).padStart(2,'0')}
                </p>
                <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {timeLeft.target.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                </p>
              </>
            ) : (
              <>
                <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>ID konta</p>
                <p className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.95)' }}>•••• {user.id.slice(-6).toUpperCase()}</p>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

