import React from 'react';
import { CalendarDays, Shield, History } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'matches', label: '比赛', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'teams', label: '球队', icon: <Shield className="w-5 h-5" /> },
  { id: 'history', label: '历史', icon: <History className="w-5 h-5" /> },
];

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange }) => {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                currentPage === item.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-primary'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
