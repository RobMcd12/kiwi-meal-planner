import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, X, Loader2 } from 'lucide-react';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;        // e.g., 'emerald', 'indigo', 'rose'
  badge?: number | string;
  hidden?: boolean;      // For conditional tabs
}

interface ResponsiveTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'underline' | 'pill' | 'button-group' | 'solid-pill';
  visibleCount?: number; // Desktop: how many to show before "More"
  className?: string;
  loadingTabId?: string; // Show loading spinner on specific tab
}

// Color mappings for different tab colors
const colorClasses: Record<string, { active: string; inactive: string; bg: string; solid: string }> = {
  emerald: {
    active: 'text-emerald-600 border-emerald-600',
    inactive: 'text-slate-500 hover:text-slate-800',
    bg: 'bg-emerald-50/50',
    solid: 'bg-emerald-600 text-white'
  },
  indigo: {
    active: 'text-indigo-600 border-indigo-600',
    inactive: 'text-slate-500 hover:text-slate-800',
    bg: 'bg-indigo-50/50',
    solid: 'bg-indigo-600 text-white'
  },
  rose: {
    active: 'text-rose-600 border-rose-600',
    inactive: 'text-slate-500 hover:text-slate-800',
    bg: 'bg-rose-50/50',
    solid: 'bg-rose-600 text-white'
  },
  blue: {
    active: 'text-blue-600 border-blue-600',
    inactive: 'text-slate-500 hover:text-slate-800',
    bg: 'bg-blue-50/50',
    solid: 'bg-blue-600 text-white'
  },
  amber: {
    active: 'text-amber-600 border-amber-600',
    inactive: 'text-slate-500 hover:text-slate-800',
    bg: 'bg-amber-50/50',
    solid: 'bg-amber-600 text-white'
  },
  purple: {
    active: 'text-purple-600 border-purple-600',
    inactive: 'text-slate-500 hover:text-slate-800',
    bg: 'bg-purple-50/50',
    solid: 'bg-purple-600 text-white'
  },
  default: {
    active: 'text-emerald-600 border-emerald-600',
    inactive: 'text-slate-500 hover:text-slate-700',
    bg: '',
    solid: 'bg-emerald-600 text-white'
  }
};

const ResponsiveTabs: React.FC<ResponsiveTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  visibleCount = 4,
  className = '',
  loadingTabId
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMoreOpen, setDesktopMoreOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const desktopMoreRef = useRef<HTMLDivElement>(null);

  // Filter out hidden tabs
  const visibleTabs = tabs.filter(tab => !tab.hidden);

  // Split tabs for desktop view
  const primaryTabs = visibleTabs.slice(0, visibleCount);
  const overflowTabs = visibleTabs.slice(visibleCount);

  // Get active tab info
  const activeTabInfo = visibleTabs.find(t => t.id === activeTab);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (desktopMoreRef.current && !desktopMoreRef.current.contains(event.target as Node)) {
        setDesktopMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabSelect = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
    setDesktopMoreOpen(false);
  };

  const getColorClasses = (color?: string) => {
    return colorClasses[color || 'default'] || colorClasses.default;
  };

  // Render tab content (icon + label + badge)
  const renderTabContent = (tab: Tab, showLabel = true, isActive = false) => (
    <>
      {tab.icon}
      {showLabel && <span>{tab.label}</span>}
      {tab.badge !== undefined && (
        <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[20px] text-center ${
          variant === 'solid-pill' && isActive
            ? 'bg-white/20'
            : 'bg-red-500 text-white'
        }`}>
          {tab.badge}
        </span>
      )}
      {loadingTabId === tab.id && (
        <Loader2 size={14} className="animate-spin" />
      )}
    </>
  );

  // Underline variant styles
  const getUnderlineStyles = (tab: Tab, isActive: boolean) => {
    const colors = getColorClasses(tab.color);
    return `flex-1 min-w-[120px] py-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
      isActive
        ? `${colors.active} ${colors.bg}`
        : `border-transparent ${colors.inactive} hover:bg-slate-50`
    }`;
  };

  // Pill variant styles
  const getPillStyles = (tab: Tab, isActive: boolean) => {
    const colors = getColorClasses(tab.color);
    return `flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
      isActive
        ? colors.active
        : `border-transparent ${colors.inactive}`
    }`;
  };

  // Button-group variant styles
  const getButtonGroupStyles = (tab: Tab, isActive: boolean) => {
    return `flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
      isActive ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
    }`;
  };

  // Solid-pill variant styles (colored background when active)
  const getSolidPillStyles = (tab: Tab, isActive: boolean) => {
    const colors = getColorClasses(tab.color);
    return `flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
      isActive
        ? colors.solid
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;
  };

  const getTabStyles = (tab: Tab, isActive: boolean) => {
    switch (variant) {
      case 'pill':
        return getPillStyles(tab, isActive);
      case 'button-group':
        return getButtonGroupStyles(tab, isActive);
      case 'solid-pill':
        return getSolidPillStyles(tab, isActive);
      default:
        return getUnderlineStyles(tab, isActive);
    }
  };

  // Mobile menu button styles
  const getMobileButtonStyles = () => {
    switch (variant) {
      case 'button-group':
        return 'w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-100 rounded-xl font-medium text-slate-700';
      default:
        return 'w-full flex items-center justify-between gap-2 px-4 py-3 border border-slate-200 rounded-xl font-medium text-slate-700 bg-white';
    }
  };

  // Dropdown item styles for mobile and "More" menu
  const getDropdownItemStyles = (tab: Tab, isActive: boolean) => {
    const colors = getColorClasses(tab.color);
    return `w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
      isActive
        ? `${colors.active.replace('border-', 'bg-').replace('-600', '-50')} ${colors.active.split(' ')[0]}`
        : 'text-slate-600 hover:bg-slate-50'
    }`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Mobile View - Hamburger Menu */}
      <div className="md:hidden" ref={mobileMenuRef}>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={getMobileButtonStyles()}
        >
          <div className="flex items-center gap-2">
            <Menu size={20} />
            {activeTabInfo && (
              <div className="flex items-center gap-2">
                {activeTabInfo.icon}
                <span>{activeTabInfo.label}</span>
                {activeTabInfo.badge !== undefined && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full min-w-[20px] text-center">
                    {activeTabInfo.badge}
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronDown
            size={20}
            className={`transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
            <div className="py-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabSelect(tab.id)}
                  className={getDropdownItemStyles(tab, activeTab === tab.id)}
                >
                  {renderTabContent(tab)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className={`hidden md:flex ${
        variant === 'button-group'
          ? 'gap-1 p-1 bg-slate-100 rounded-xl'
          : variant === 'solid-pill'
            ? 'gap-2'
            : 'gap-2 border-b border-slate-200'
      }`}>
        {/* Primary tabs */}
        {primaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabSelect(tab.id)}
              className={getTabStyles(tab, isActive)}
            >
              {renderTabContent(tab, true, isActive)}
            </button>
          );
        })}

        {/* More dropdown for overflow tabs */}
        {overflowTabs.length > 0 && (
          <div className="relative" ref={desktopMoreRef}>
            <button
              onClick={() => setDesktopMoreOpen(!desktopMoreOpen)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                overflowTabs.some(t => t.id === activeTab)
                  ? 'text-emerald-600'
                  : 'text-slate-500 hover:text-slate-700'
              } ${variant === 'button-group' ? 'rounded-lg' : 'border-b-2 -mb-[2px] border-transparent'}`}
            >
              <span>More</span>
              <ChevronDown
                size={16}
                className={`transition-transform ${desktopMoreOpen ? 'rotate-180' : ''}`}
              />
              {/* Show badge count if any overflow tab has badges */}
              {overflowTabs.some(t => t.badge !== undefined && Number(t.badge) > 0) && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full min-w-[20px] text-center">
                  {overflowTabs.reduce((sum, t) => sum + (Number(t.badge) || 0), 0)}
                </span>
              )}
            </button>

            {/* More Dropdown */}
            {desktopMoreOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-[200px] bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                <div className="py-2">
                  {overflowTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={getDropdownItemStyles(tab, activeTab === tab.id)}
                    >
                      {renderTabContent(tab)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponsiveTabs;
