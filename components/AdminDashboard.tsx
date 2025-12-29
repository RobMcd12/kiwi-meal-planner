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
  CheckCircle,
  MessageSquare,
  Send,
  Loader2,
  X
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { supabase, isSupabaseConfigured } from '../services/authService';
import { clearAllData, exportAllData, importData } from '../services/storageService';
import {
  getAllFeedback,
  getNewFeedbackCount,
  respondToFeedback,
  updateFeedbackStatus
} from '../services/feedbackService';
import type { FeedbackItem, FeedbackStatus } from '../types';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'data' | 'users'>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | FeedbackStatus>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<FeedbackStatus>('reviewed');
  const [isResponding, setIsResponding] = useState(false);

  const isAdmin = user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    loadStats();
    loadFeedbackCount();
  }, []);

  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedback();
    }
  }, [activeTab]);

  const loadFeedbackCount = async () => {
    try {
      const count = await getNewFeedbackCount();
      setNewFeedbackCount(count);
    } catch (err) {
      console.error('Failed to load feedback count:', err);
    }
  };

  const loadFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const data = await getAllFeedback();
      setFeedbackList(data);
      // Update count
      const newCount = data.filter((f) => f.status === 'new').length;
      setNewFeedbackCount(newCount);
    } catch (err) {
      console.error('Failed to load feedback:', err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleRespondToFeedback = async () => {
    if (!selectedFeedback || !responseText.trim() || !user) return;

    setIsResponding(true);
    try {
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin';
      const updated = await respondToFeedback(
        selectedFeedback.id,
        user.id,
        userName,
        responseText.trim(),
        responseStatus
      );

      if (updated) {
        setFeedbackList((prev) =>
          prev.map((f) => (f.id === updated.id ? updated : f))
        );
        setSelectedFeedback(null);
        setResponseText('');
        setMessage({ type: 'success', text: 'Response sent successfully!' });
        // Update count
        const newCount = feedbackList.filter(
          (f) => f.id !== updated.id && f.status === 'new'
        ).length + (updated.status === 'new' ? 1 : 0);
        setNewFeedbackCount(newCount);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send response.' });
    } finally {
      setIsResponding(false);
    }
  };

  const handleStatusChange = async (feedbackId: string, status: FeedbackStatus) => {
    try {
      await updateFeedbackStatus(feedbackId, status);
      setFeedbackList((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, status } : f))
      );
      // Update count
      const newCount = feedbackList.filter(
        (f) => f.id === feedbackId ? status === 'new' : f.status === 'new'
      ).length;
      setNewFeedbackCount(newCount);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update status.' });
    }
  };

  const filteredFeedback = feedbackList.filter((f) => {
    if (feedbackFilter === 'all') return true;
    return f.status === feedbackFilter;
  });

  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'reviewed': return 'bg-amber-100 text-amber-700';
      case 'in-progress': return 'bg-purple-100 text-purple-700';
      case 'resolved': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return '🐛';
      case 'feature': return '✨';
      case 'question': return '❓';
      default: return '💬';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'feedback', label: 'Feedback', icon: MessageSquare, badge: newFeedbackCount },
          { id: 'data', label: 'Data Management', icon: Database },
          { id: 'users', label: 'Users', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-emerald-600 border-emerald-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full min-w-[20px] text-center">
                {tab.badge}
              </span>
            )}
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

      {/* Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Filter buttons */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-slate-800">User Feedback</h2>
            <div className="flex gap-2 flex-wrap">
              {(['all', 'new', 'reviewed', 'in-progress', 'resolved'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFeedbackFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    feedbackFilter === f
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.replace('-', ' ')}
                  {f === 'new' && newFeedbackCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {newFeedbackCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback list */}
          {feedbackLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <MessageSquare className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No feedback found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedback.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getTypeIcon(item.type)}</span>
                        <h3 className="font-medium text-slate-800">{item.subject}</h3>
                      </div>
                      <p className="text-sm text-slate-500">
                        From: {item.user_name} {item.user_email && `(${item.user_email})`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatDateTime(item.created_at)} • {item.type}
                      </p>
                    </div>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value as FeedbackStatus)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${getStatusColor(item.status)}`}
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <p className="text-slate-700 whitespace-pre-wrap mb-4 bg-slate-50 p-3 rounded-lg">
                    {item.message}
                  </p>

                  {/* Previous response */}
                  {item.admin_response && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-emerald-700 mb-1 font-medium">
                        Response by {item.admin_name || 'Admin'}
                        {item.admin_responded_at && ` on ${formatDateTime(item.admin_responded_at)}`}
                      </p>
                      <p className="text-slate-700 whitespace-pre-wrap">{item.admin_response}</p>
                    </div>
                  )}

                  {/* Respond button */}
                  <button
                    onClick={() => {
                      setSelectedFeedback(item);
                      setResponseText(item.admin_response || '');
                      setResponseStatus(item.status === 'new' ? 'reviewed' : item.status);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Send size={16} />
                    {item.admin_response ? 'Update Response' : 'Respond'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Response Modal */}
          {selectedFeedback && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">
                    Respond to: {selectedFeedback.subject}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedFeedback(null);
                      setResponseText('');
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Original message */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-500 mb-2">
                      Original message from {selectedFeedback.user_name}:
                    </p>
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedFeedback.message}</p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status
                    </label>
                    <select
                      value={responseStatus}
                      onChange={(e) => setResponseStatus(e.target.value as FeedbackStatus)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="reviewed">Reviewed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  {/* Response textarea */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Your Response
                    </label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none h-40"
                      placeholder="Write your response..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                  <button
                    onClick={() => {
                      setSelectedFeedback(null);
                      setResponseText('');
                    }}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRespondToFeedback}
                    disabled={isResponding || !responseText.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResponding ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Response
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
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
