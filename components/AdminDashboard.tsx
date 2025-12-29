import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Database,
  Shield,
  Activity,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { supabase, isSupabaseConfigured } from '../services/authService';
import { clearAllData, exportAllData, importData } from '../services/storageService';

interface AdminDashboardProps {
  onBack: () => void;
}

interface Stats {
  totalUsers: number;
  totalMealPlans: number;
  totalFavorites: number;
}

const SUPER_ADMIN_EMAIL = 'rob@unicloud.co.nz';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalMealPlans: 0, totalFavorites: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'users'>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        // Load stats from Supabase
        const [usersRes, plansRes, favsRes] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('meal_plan_history').select('id', { count: 'exact', head: true }),
          supabase.from('favorite_meals').select('id', { count: 'exact', head: true }),
        ]);

        setStats({
          totalUsers: usersRes.count || 0,
          totalMealPlans: plansRes.count || 0,
          totalFavorites: favsRes.count || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kiwi-meal-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export data.' });
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      setMessage({ type: 'success', text: 'Data imported successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to import data. Invalid format.' });
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear ALL local data? This cannot be undone.')) {
      return;
    }

    try {
      await clearAllData();
      setMessage({ type: 'success', text: 'All local data cleared.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to clear data.' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <Shield className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-6">You don't have permission to access the admin dashboard.</p>
          <button
            onClick={onBack}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Shield className="text-emerald-600" size={28} />
              Admin Dashboard
            </h1>
            <p className="text-slate-500 text-sm">Manage your application</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          Logged in as {user?.email}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'data', label: 'Data Management', icon: Database },
          { id: 'users', label: 'Users', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-[2px] ${
              activeTab === tab.id
                ? 'text-emerald-600 border-emerald-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalUsers}</div>
                <div className="text-sm text-slate-500">Total Users</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Activity className="text-emerald-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalMealPlans}</div>
                <div className="text-sm text-slate-500">Meal Plans Created</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-100 p-3 rounded-lg">
                <Database className="text-rose-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalFavorites}</div>
                <div className="text-sm text-slate-500">Saved Favorites</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Supabase Connection</span>
                <span className={`flex items-center gap-2 ${isSupabaseConfigured() ? 'text-emerald-600' : 'text-amber-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {isSupabaseConfigured() ? 'Connected' : 'Not Configured'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Edge Functions</span>
                <span className="flex items-center gap-2 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Enabled
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-600">PWA Support</span>
                <span className="flex items-center gap-2 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Export & Backup</h3>
            <p className="text-slate-500 text-sm mb-4">
              Download all your local data as a JSON file for backup purposes.
            </p>
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Download size={18} />
              Export All Data
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Import Data</h3>
            <p className="text-slate-500 text-sm mb-4">
              Restore data from a previously exported JSON backup file.
            </p>
            <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer w-fit">
              <Upload size={18} />
              Import from File
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>
          </div>

          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h3 className="font-semibold text-red-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} />
              Danger Zone
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Permanently delete all local data. This action cannot be undone.
            </p>
            <button
              onClick={handleClearData}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Trash2 size={18} />
              Clear All Local Data
            </button>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">User Management</h3>
          <p className="text-slate-500 text-sm mb-6">
            User management features coming soon. This will include the ability to view all users,
            manage roles, and moderate content.
          </p>
          <div className="bg-slate-50 rounded-lg p-8 text-center">
            <Users className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-400">User list will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
