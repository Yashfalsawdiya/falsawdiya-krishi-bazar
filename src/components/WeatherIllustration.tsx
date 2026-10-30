import React from 'react';
import { motion } from 'motion/react';

export type WeatherType = 
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'overcast'
  | 'rain-day'
  | 'rain'
  | 'thunder-day'
  | 'thunder'
  | 'fog'
  | 'snow';

interface WeatherIllustrationProps {
  type: WeatherType;
  className?: string;
  size?: number | string;
}

/**
 * Modern vector weather illustrations faithfully crafted
 * to match premium multi-layered meteorological icon design
 * (Radiant sun disks, puffy gradient clouds, silver celestial moons, 
 * teardrop raindrops, and golden lightning bolts).
 */
export const WeatherIllustration: React.FC<WeatherIllustrationProps> = ({ 
  type, 
  className = "w-24 h-24 sm:w-28 sm:h-28", 
  size 
}) => {
  const containerStyle = size ? { width: size, height: size } : undefined;

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
      style={containerStyle}
    >
      {/* 1. CLEAR DAY / SUNNY */}
      {type === 'clear-day' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sunDisk" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="35%" stopColor="#FBBF24" />
              <stop offset="80%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>

          {/* Ambient outer aura */}
          <circle cx="50" cy="50" r="46" fill="url(#sunGlow)" />

          {/* Primary Golden Radiant Sun Disk */}
          <motion.circle 
            animate={{ scale: [1, 1.025, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            cx="50" 
            cy="50" 
            r="32" 
            fill="url(#sunDisk)" 
          />
        </svg>
      )}

      {/* 2. FOG / MIST (Sun with horizontal rounded bars) */}
      {type === 'fog' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="fogSun" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="40%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="fogBar" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#CBD5E1" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Sun Disk in background */}
          <circle cx="50" cy="50" r="30" fill="url(#fogSun)" />

          {/* Sleek horizontal rounded mist lines cutting across */}
          <rect x="22" y="34" width="42" height="5.5" rx="2.75" fill="url(#fogBar)" />
          <rect x="18" y="44" width="56" height="5.5" rx="2.75" fill="url(#fogBar)" />
          <rect x="26" y="54" width="46" height="5.5" rx="2.75" fill="url(#fogBar)" />
          <rect x="34" y="64" width="30" height="5.5" rx="2.75" fill="url(#fogBar)" />
        </svg>
      )}

      {/* 3. PARTLY CLOUDY DAY (Sun + Puffy Sky Cloud) */}
      {type === 'partly-cloudy-day' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="pcSun" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="40%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="pcCloud" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#BAE6FD" />
              <stop offset="45%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>

          {/* Sun in top background */}
          <circle cx="58" cy="38" r="24" fill="url(#pcSun)" />

          {/* Soft Puffy Sky-Blue Foreground Cloud */}
          <motion.path 
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            d="M 30 74 C 20 74 12 66 12 56 C 12 47 18 39 27 38 C 30 26 41 18 54 18 C 67 18 78 27 80 39 C 88 41 94 48 94 56 C 94 66 86 74 76 74 Z"
            fill="url(#pcCloud)" 
            opacity="0.96"
          />
        </svg>
      )}

      {/* 4. OVERCAST / FULL CLOUDY (Layered Puffy Clouds) */}
      {type === 'overcast' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="backCloud" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="100%" stopColor="#64748B" />
            </linearGradient>
            <linearGradient id="frontCloud" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="60%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>

          {/* Background darker cloud */}
          <path 
            d="M 40 56 C 32 56 26 50 26 42 C 26 35 31 29 38 28 C 41 18 50 12 60 12 C 71 12 80 19 82 29 C 88 31 92 36 92 42 C 92 50 86 56 78 56 Z"
            fill="url(#backCloud)" 
            opacity="0.85"
          />

          {/* Foreground vibrant cloud */}
          <motion.path 
            animate={{ y: [0, -2.5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            d="M 26 78 C 17 78 10 71 10 62 C 10 54 16 47 24 46 C 27 35 37 28 48 28 C 60 28 70 36 72 47 C 79 49 84 55 84 62 C 84 71 77 78 68 78 Z"
            fill="url(#frontCloud)" 
          />
        </svg>
      )}

      {/* 5. RAIN WITH SUN (Sun + Storm Cloud + Falling Teardrops) */}
      {type === 'rain-day' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="rdSun" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="40%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="rdCloud" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="60%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="rdDrop" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67E8F9" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {/* Sun in top background */}
          <circle cx="62" cy="34" r="22" fill="url(#rdSun)" />

          {/* Rain Cloud */}
          <path 
            d="M 28 66 C 19 66 12 59 12 51 C 12 43 18 36 26 35 C 29 25 39 18 50 18 C 62 18 72 26 74 36 C 81 38 86 44 86 51 C 86 59 79 66 70 66 Z"
            fill="url(#rdCloud)" 
          />

          {/* 3 Teardrop Raindrops */}
          <motion.path 
            animate={{ y: [0, 4, 0], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            d="M 32 73 C 30 76 29 78 29 80 C 29 82.5 31 84.5 33.5 84.5 C 36 84.5 38 82.5 38 80 C 38 78 37 76 35 73 Z"
            fill="url(#rdDrop)"
          />
          <motion.path 
            animate={{ y: [0, 4, 0], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            d="M 48 73 C 46 76 45 78 45 80 C 45 82.5 47 84.5 49.5 84.5 C 52 84.5 54 82.5 54 80 C 54 78 53 76 51 73 Z"
            fill="url(#rdDrop)"
          />
          <motion.path 
            animate={{ y: [0, 4, 0], opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            d="M 64 73 C 62 76 61 78 61 80 C 61 82.5 63 84.5 65.5 84.5 C 68 84.5 70 82.5 70 80 C 70 78 69 76 67 73 Z"
            fill="url(#rdDrop)"
          />
        </svg>
      )}

      {/* 6. RAIN / SHOWERS (Stormy Cloud + Raindrops) */}
      {(type === 'rain' || type === 'snow') && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="rainBack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="rainFront" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="60%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {/* Background darker cloud */}
          <path 
            d="M 42 54 C 34 54 28 48 28 40 C 28 33 33 27 40 26 C 43 17 52 11 62 11 C 73 11 82 18 84 27 C 90 29 94 34 94 40 C 94 48 88 54 80 54 Z"
            fill="url(#rainBack)" 
            opacity="0.8"
          />

          {/* Foreground Rain Cloud */}
          <path 
            d="M 28 66 C 19 66 12 59 12 51 C 12 43 18 36 26 35 C 29 25 39 18 50 18 C 62 18 72 26 74 36 C 81 38 86 44 86 51 C 86 59 79 66 70 66 Z"
            fill="url(#rainFront)" 
          />

          {/* 3 Teardrop Raindrops falling */}
          <motion.path 
            animate={{ y: [0, 5, 0], opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            d="M 31 74 C 29 77 28 79.5 28 81.5 C 28 84.5 30.5 86.5 33 86.5 C 35.5 86.5 38 84.5 38 81.5 C 38 79.5 37 77 35 74 Z"
            fill="url(#dropGrad)"
          />
          <motion.path 
            animate={{ y: [0, 5, 0], opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
            d="M 48 74 C 46 77 45 79.5 45 81.5 C 45 84.5 47.5 86.5 50 86.5 C 52.5 86.5 55 84.5 55 81.5 C 55 79.5 54 77 52 74 Z"
            fill="url(#dropGrad)"
          />
          <motion.path 
            animate={{ y: [0, 5, 0], opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
            d="M 65 74 C 63 77 62 79.5 62 81.5 C 62 84.5 64.5 86.5 67 86.5 C 69.5 86.5 72 84.5 72 81.5 C 72 79.5 71 77 69 74 Z"
            fill="url(#dropGrad)"
          />
        </svg>
      )}

      {/* 7. THUNDER WITH SUN (Sun + Storm Cloud + Lightning Bolt) */}
      {type === 'thunder-day' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="tsSun" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="40%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="tsCloud" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="60%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="40%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>

          {/* Sun in top background */}
          <circle cx="62" cy="34" r="22" fill="url(#tsSun)" />

          {/* Storm Cloud */}
          <path 
            d="M 28 66 C 19 66 12 59 12 51 C 12 43 18 36 26 35 C 29 25 39 18 50 18 C 62 18 72 26 74 36 C 81 38 86 44 86 51 C 86 59 79 66 70 66 Z"
            fill="url(#tsCloud)" 
          />

          {/* Sharp Bright Golden Lightning Bolt */}
          <motion.path 
            animate={{ opacity: [0.85, 1, 0.85], scale: [1, 1.05, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            d="M 48 54 L 38 72 L 48 72 L 40 90 L 58 68 L 48 68 Z"
            fill="url(#boltGrad)" 
            filter="drop-shadow(0 2px 4px rgba(245, 158, 11, 0.6))"
          />
        </svg>
      )}

      {/* 8. THUNDERSTORM / HEAVY LIGHTNING (Storm Clouds + Lightning + Rain) */}
      {type === 'thunder' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="thBack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <linearGradient id="thFront" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94A3B8" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>
            <linearGradient id="thBolt" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="40%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="thDrop" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>

          {/* Background darker cloud */}
          <path 
            d="M 42 54 C 34 54 28 48 28 40 C 28 33 33 27 40 26 C 43 17 52 11 62 11 C 73 11 82 18 84 27 C 90 29 94 34 94 40 C 94 48 88 54 80 54 Z"
            fill="url(#thBack)" 
            opacity="0.85"
          />

          {/* Foreground Rain Cloud */}
          <path 
            d="M 28 66 C 19 66 12 59 12 51 C 12 43 18 36 26 35 C 29 25 39 18 50 18 C 62 18 72 26 74 36 C 81 38 86 44 86 51 C 86 59 79 66 70 66 Z"
            fill="url(#thFront)" 
          />

          {/* Sharp Golden Lightning Bolt */}
          <motion.path 
            animate={{ opacity: [0.8, 1, 0.8], scale: [1, 1.04, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            d="M 46 52 L 36 70 L 46 70 L 39 88 L 56 66 L 46 66 Z"
            fill="url(#thBolt)" 
            filter="drop-shadow(0 2px 6px rgba(245, 158, 11, 0.7))"
          />

          {/* Raindrops on sides */}
          <path 
            d="M 64 74 C 62 77 61 79.5 61 81.5 C 61 84.5 63.5 86.5 66 86.5 C 68.5 86.5 71 84.5 71 81.5 C 71 79.5 70 77 68 74 Z"
            fill="url(#thDrop)"
          />
        </svg>
      )}

      {/* 9. CLEAR NIGHT (Celestial Midnight Pod with Glowing Golden Crescent Moon & Stars - High Contrast on White Cards) */}
      {type === 'clear-night' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            {/* Deep Midnight Celestial Gradient */}
            <linearGradient id="nightSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="50%" stopColor="#25246B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* Radiant Luminous Golden Moon Gradient */}
            <linearGradient id="moonGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFDF0" />
              <stop offset="30%" stopColor="#FEF08A" />
              <stop offset="70%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>

            {/* Subtle Twilight Border Gradient */}
            <linearGradient id="podBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#3730A3" stopOpacity="0.3" />
            </linearGradient>

            {/* Atmospheric Outer Aura */}
            <radialGradient id="nightAuraGrad" cx="50%" cy="50%" r="50%">
              <stop offset="65%" stopColor="#4338CA" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Atmospheric outer glow */}
          <rect x="6" y="6" width="88" height="88" rx="28" fill="url(#nightAuraGrad)" />

          {/* Midnight Squircle Pod - provides deep contrast against white cards */}
          <rect 
            x="8" 
            y="8" 
            width="84" 
            height="84" 
            rx="26" 
            fill="url(#nightSkyGrad)" 
            stroke="url(#podBorderGrad)"
            strokeWidth="1.5"
            className="filter drop-shadow-sm"
          />

          {/* Ambient soft celestial moon glow inside pod */}
          <circle cx="50" cy="50" r="28" fill="#FDE047" fillOpacity="0.09" />

          {/* Stylized background moon crater / nebula depth matching reference */}
          <circle cx="70" cy="24" r="7" fill="#312E81" fillOpacity="0.45" />

          {/* Twinkling Starlight Dots & Sparkles */}
          <circle cx="25" cy="34" r="2.2" fill="#FFFFFF" opacity="0.9" />
          <circle cx="28" cy="70" r="2" fill="#FEF08A" opacity="0.95" />
          <circle cx="74" cy="38" r="1.5" fill="#E0E7FF" opacity="0.75" />
          <path d="M 70 65 L 71.2 67.5 L 73.7 68.7 L 71.2 69.9 L 70 72.4 L 68.8 69.9 L 66.3 68.7 L 68.8 67.5 Z" fill="#FEF08A" opacity="0.8" />

          {/* Glowing Golden Crescent Moon */}
          <motion.path 
            animate={{ rotate: [-2, 2, -2] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            d="M 52 24 C 37 24 25 36 25 51 C 25 66 37 78 52 78 C 61 78 69 74 74 66 C 58 68 45 56 45 40 C 45 32 50 25 56 24 C 54.7 24 53.3 24 52 24 Z"
            fill="url(#moonGoldGrad)" 
            stroke="#FFFBEB"
            strokeWidth="1.2"
            strokeOpacity="0.8"
            filter="drop-shadow(0 2px 7px rgba(245, 158, 11, 0.45))"
          />
        </svg>
      )}

      {/* 10. CLOUDY NIGHT (Midnight Pod + Golden Crescent Moon + Puffy Sky Cloud) */}
      {type === 'partly-cloudy-night' && (
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
          <defs>
            <linearGradient id="ncSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="50%" stopColor="#25246B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id="ncMoonGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFDF0" />
              <stop offset="35%" stopColor="#FEF08A" />
              <stop offset="75%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
            <linearGradient id="ncCloud" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <linearGradient id="ncBorder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3730A3" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Midnight Squircle Pod */}
          <rect 
            x="8" 
            y="8" 
            width="84" 
            height="84" 
            rx="26" 
            fill="url(#ncSkyGrad)" 
            stroke="url(#ncBorder)"
            strokeWidth="1.5"
          />

          {/* Starlight Dots */}
          <circle cx="24" cy="28" r="2.2" fill="#FFFFFF" opacity="0.9" />
          <circle cx="74" cy="22" r="1.8" fill="#FEF08A" opacity="0.9" />

          {/* Golden Crescent Moon in upper area */}
          <path 
            d="M 54 20 C 42 20 33 29 33 41 C 33 53 42 62 54 62 C 61 62 67 58 71 52 C 58 53 49 44 49 33 C 49 26 53 21 58 20 C 56.7 20 55.3 20 54 20 Z"
            fill="url(#ncMoonGold)" 
            stroke="#FFFBEB"
            strokeWidth="1.2"
            strokeOpacity="0.8"
            filter="drop-shadow(0 2px 5px rgba(245, 158, 11, 0.45))"
          />

          {/* Puffy Night-Blue Foreground Cloud */}
          <motion.path 
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            d="M 26 78 C 16 78 10 70 10 61 C 10 52 16 45 24 44 C 27 32 38 24 51 24 C 64 24 74 33 76 45 C 84 47 90 54 90 62 C 90 71 83 78 74 78 Z"
            fill="url(#ncCloud)" 
            opacity="0.96"
          />
        </svg>
      )}
    </div>
  );
};

/**
 * Intelligent helper to map condition text, daytime/nighttime, and WMO weather codes
 * directly to the exact vector illustration type matching the reference artwork.
 */
export function getWeatherIllustrationType(
  condition: string = '', 
  isNight: boolean = false, 
  weatherCode?: number
): WeatherType {
  const cond = condition.toLowerCase();

  // 1. Thunderstorm (codes 95, 96, 99 or condition with 'गरज', 'तूफान', 'बिजली', 'thunder')
  if (
    (weatherCode !== undefined && [95, 96, 99].includes(weatherCode)) ||
    cond.includes('गरज') || cond.includes('तूफान') || cond.includes('बिजली') || cond.includes('thunder')
  ) {
    return isNight ? 'thunder' : 'thunder-day';
  }

  // 2. Rain / Showers / Drizzle (codes 51..67, 80..82)
  if (
    (weatherCode !== undefined && [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) ||
    cond.includes('बारिश') || cond.includes('वर्षा') || cond.includes('बौछार') || cond.includes('बूंदाबांदी') || cond.includes('rain') || cond.includes('drizzle')
  ) {
    if (isNight) return 'rain';
    if (cond.includes('आंशिक') || cond.includes('बौछारें') || cond.includes('धूप')) {
      return 'rain-day';
    }
    return 'rain';
  }

  // 3. Fog / Mist (codes 45, 48)
  if (
    (weatherCode !== undefined && [45, 48].includes(weatherCode)) ||
    cond.includes('कोहरा') || cond.includes('धुंध') || cond.includes('fog') || cond.includes('mist')
  ) {
    return 'fog';
  }

  // 4. Overcast / Heavy Clouds (code 3)
  if (
    (weatherCode === 3) ||
    cond.includes('घने बादल') || cond.includes('बादल छाए') || cond.includes('overcast')
  ) {
    return isNight ? 'partly-cloudy-night' : 'overcast';
  }

  // 5. Partly Cloudy (codes 1, 2)
  if (
    (weatherCode !== undefined && [1, 2].includes(weatherCode)) ||
    cond.includes('आंशिक') || cond.includes('बादल') || cond.includes('cloud')
  ) {
    return isNight ? 'partly-cloudy-night' : 'partly-cloudy-day';
  }

  // 6. Clear / Sunny (code 0)
  return isNight ? 'clear-night' : 'clear-day';
}

export default WeatherIllustration;

