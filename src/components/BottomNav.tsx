import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, TrendingUp, Camera, CloudSun, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

const BottomNav: React.FC = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'होम' },
    { to: '/products', icon: ShoppingBag, label: 'बाजार' },
    { to: '/disease', icon: Camera, label: 'बीमारी जाँच', primary: true },
    { to: '/mandi', icon: TrendingUp, label: 'मंडी भाव' },
    { to: '/weather', icon: CloudSun, label: 'मौसम' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-end z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => cn(
            "flex flex-col items-center gap-1 transition-all duration-200",
            item.primary ? "mb-4" : "pb-1",
            isActive && !item.primary ? "text-[#2D5A27]" : "text-gray-500"
          )}
        >
          {item.primary ? (
            <div className="w-14 h-14 bg-[#2D5A27] rounded-full flex items-center justify-center shadow-lg border-4 border-[#F5F2ED] -mt-8">
              <item.icon className="w-7 h-7 text-white" />
            </div>
          ) : (
            <item.icon className="w-6 h-6" />
          )}
          <span className={cn("text-[10px] font-medium", item.primary && "mt-1")}>
            {item.label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
