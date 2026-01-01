import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, User, ChefHat, Video, Calendar, Crown, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getAllUsers } from '../../services/adminService';
import { getAllRecipeVideos } from '../../services/recipeVideoService';
import type { RecipeVideo } from '../../types';

export type CounterType = 'users' | 'mealPlans' | 'recipes' | 'videos';

interface DashboardCounterModalProps {
  type: CounterType;
  onClose: () => void;
}

interface UserItem {
  id: string;
  email: string;
  fullName?: string;
  isAdmin: boolean;
  createdAt: string;
  tier?: string;
}

interface MealPlanItem {
  id: string;
  userId: string;
  userEmail?: string;
  createdAt: string;
  daysCount: number;
}

interface RecipeItem {
  id: string;
  name: string;
  source: string;
  isPublic: boolean;
  createdAt: string;
  ownerName?: string;
}

const DashboardCounterModal: React.FC<DashboardCounterModalProps> = ({
  type,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [displayLimit, setDisplayLimit] = useState(20);

  useEffect(() => {
    loadItems();
  }, [type]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      switch (type) {
        case 'users':
          const users = await getAllUsers();
          setItems(users.map((u: any) => ({
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            isAdmin: u.isAdmin,
            createdAt: u.createdAt,
            tier: u.tier,
          })));
          break;
        case 'videos':
          const videos = await getAllRecipeVideos();
          setItems(videos);
          break;
        // TODO: Add meal plans and recipes loading
        default:
          setItems([]);
      }
    } catch (err) {
      console.error('Error loading items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'users': return 'Total Users';
      case 'mealPlans': return 'Meal Plans Created';
      case 'recipes': return 'Saved Recipes';
      case 'videos': return 'Videos Created';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'users': return <User className="text-blue-500" size={20} />;
      case 'mealPlans': return <Calendar className="text-emerald-500" size={20} />;
      case 'recipes': return <ChefHat className="text-orange-500" size={20} />;
      case 'videos': return <Video className="text-purple-500" size={20} />;
    }
  };

  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    if (type === 'users') {
      return item.email?.toLowerCase().includes(query) ||
             item.fullName?.toLowerCase().includes(query);
    }
    if (type === 'videos') {
      return item.mealName?.toLowerCase().includes(query);
    }
    return true;
  });

  const displayedItems = filteredItems.slice(0, displayLimit);

  const renderItem = (item: any, index: number) => {
    switch (type) {
      case 'users':
        return (
          <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <User size={18} className="text-slate-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{item.email}</span>
                  {item.isAdmin && (
                    <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Admin</span>
                  )}
                </div>
                {item.fullName && (
                  <span className="text-sm text-slate-500">{item.fullName}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {item.tier === 'pro' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full">
                  <Crown size={10} />
                  Pro
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">Free</span>
              )}
            </div>
          </div>
        );

      case 'videos':
        const video = item as RecipeVideo;
        return (
          <div key={video.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Video size={20} className="text-slate-400" />
                )}
              </div>
              <div>
                <span className="font-medium text-slate-800">{video.mealName || 'Unknown Recipe'}</span>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  <span className="capitalize">
                    {video.storageType === 'google_drive' ? 'Google Drive' : 'Supabase'}
                  </span>
                </div>
              </div>
            </div>
            <div>
              {video.processingStatus === 'complete' && (
                <span className="flex items-center gap-1 text-emerald-600 text-sm">
                  <CheckCircle size={14} />
                  Complete
                </span>
              )}
              {video.processingStatus === 'failed' && (
                <span className="flex items-center gap-1 text-red-600 text-sm">
                  <XCircle size={14} />
                  Failed
                </span>
              )}
              {['pending', 'generating', 'uploading'].includes(video.processingStatus) && (
                <span className="flex items-center gap-1 text-amber-600 text-sm">
                  <Clock size={14} />
                  {video.processingStatus}
                </span>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div key={index} className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-600">Item {index + 1}</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h2 className="text-lg font-semibold text-slate-800">
              {getTitle()} ({items.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${type}...`}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : displayedItems.length > 0 ? (
            <div className="space-y-2">
              {displayedItems.map(renderItem)}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? 'No results found' : 'No items yet'}
            </div>
          )}
        </div>

        {/* Footer */}
        {filteredItems.length > displayLimit && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button
              onClick={() => setDisplayLimit(prev => prev + 20)}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Load More ({filteredItems.length - displayLimit} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCounterModal;
