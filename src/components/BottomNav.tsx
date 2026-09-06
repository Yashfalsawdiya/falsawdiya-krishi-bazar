import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, Camera, CloudSun, Newspaper } from 'lucide-react';
import { cn } from '../lib/utils';

const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'होम' },
    { to: '/products', icon: ShoppingBag, label: 'बाजार' },
    { to: '/disease', icon: Camera, label: 'बीमारी जाँच', primary: true },
    { to: '/news', icon: Newspaper, label: 'कृषि समाचार' },
    { to: '/weather', icon: CloudSun, label: 'मौसम' },
  ];

  return (
    <nav 
      id="mobile-bottom-nav" 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-gradient-to-b from-[#2D5A27] to-[#20441C] border-t border-[#3E7A36]/80 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-50 px-2 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]"
    >
      <div className="max-w-md mx-auto flex justify-around items-end relative">
        {navItems.map((item) => {
          if (item.primary) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center -mt-6 transition-all duration-200 relative group select-none px-1",
                  isActive ? "text-[#EAB308]" : "text-white"
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-[0_6px_16px_rgba(0,0,0,0.4)]",
                      "border-[3.5px] border-[#20441C]",
                      isActive
                        ? "bg-gradient-to-tr from-[#254C20] via-[#2D5A27] to-[#4A8D3E] ring-2 ring-[#EAB308] shadow-[0_0_14px_rgba(234,179,8,0.45)]"
                        : "bg-gradient-to-tr from-[#254C20] via-[#2D5A27] to-[#3B7733] hover:from-[#2D5A27] hover:to-[#468A3D] ring-1 ring-white/20"
                    )}>
                      <item.icon className={cn(
                        "w-6 h-6 transition-transform duration-200",
                        isActive ? "text-[#EAB308] scale-110" : "text-white group-hover:scale-105"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[10px] leading-tight mt-1 transition-all duration-200 whitespace-nowrap",
                      isActive ? "font-bold text-[#EAB308]" : "font-medium text-white/90"
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 min-w-[58px] relative group select-none",
                isActive ? "text-[#EAB308]" : "text-white/80 hover:text-white active:scale-95"
              )}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1 rounded-xl transition-all duration-200 flex items-center justify-center relative",
                    isActive ? "bg-white/15 shadow-inner" : "group-hover:bg-white/5"
                  )}>
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      isActive ? "text-[#EAB308] scale-110" : "text-white/80 group-hover:text-white"
                    )} />
                    {isActive && (
                      <span className="absolute -bottom-1 w-1.5 h-1.5 bg-[#EAB308] rounded-full shadow-xs" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] transition-all duration-200 leading-tight mt-1 whitespace-nowrap",
                    isActive 
                      ? "font-bold text-white" 
                      : "font-medium text-white/80"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
