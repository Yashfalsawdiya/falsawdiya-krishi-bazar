import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, Camera, CloudSun, Newspaper } from 'lucide-react';
import { cn } from '../lib/utils';

const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'होम' },
    { to: '/products', icon: ShoppingBag, label: 'बाजार' },
    { to: '/disease', icon: Camera, label: 'बीमारी जाँच' },
    { to: '/news', icon: Newspaper, label: 'कृषि समाचार' },
    { to: '/weather', icon: CloudSun, label: 'मौसम' },
  ];

  return (
    <nav 
      id="mobile-bottom-nav" 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-[#1E3F1A]/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.25)] z-50 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 min-h-[48px] select-none group relative active:scale-95",
              isActive ? "text-[#FACC15]" : "text-white/75 hover:text-white"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-150",
                  isActive 
                    ? "bg-white/15 text-[#FACC15] shadow-xs" 
                    : "text-white/75 group-hover:text-white group-hover:bg-white/5"
                )}>
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-150",
                    isActive ? "scale-105" : ""
                  )} />
                </div>
                <span className={cn(
                  "text-[11px] transition-all duration-150 leading-tight mt-1 truncate max-w-full px-0.5",
                  isActive 
                    ? "font-semibold text-[#FACC15]" 
                    : "font-normal text-white/75 group-hover:text-white"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
