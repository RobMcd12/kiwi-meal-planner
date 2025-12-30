import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Users,
  Database,
  Shield,
  ShieldCheck,
  ShieldX,
  Activity,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Send,
  UserPlus,
  Key,
  Mail,
  Eye,
  EyeOff,
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
import { getAllUsers, setUserAdminStatus, isSuperAdmin, sendPasswordResetEmail, createUser, deleteUser, type UserProfile } from '../services/adminService';
import type { FeedbackItem, FeedbackStatus } from '../types';

interface AdminDashboardProps {
  onBack: () => void;
}

interface Stats {
  totalUsers: number;
  totalMealPlans: number;
  totalFavorites: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { user, isAdmin, refreshAdminStatus } = useAuth();
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

  // Users state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserMakeAdmin, setNewUserMakeAdmin] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Check if current user is super admin (can manage other admins)
  const currentUserIsSuperAdmin = isSuperAdmin(user?.email ?? undefined);

  useEffect(() => {
    loadStats();
    loadFeedbackCount();
  }, []);

  useEffect(() => {
    if (activeTab === 'feedback') {
      loadFeedback();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const users = await getAllUsers();
      setUsersList(users);
    } catch (err) {
      console.error('Failed to load users:', err);
      setMessage({ type: 'error', text: 'Failed to load users.' });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (!currentUserIsSuperAdmin) {
      setMessage({ type: 'error', text: 'Only the super admin can change admin status.' });
      return;
    }

    setUpdatingUserId(userId);
    try {
      const success = await setUserAdminStatus(userId, !currentIsAdmin);
      if (success) {
        setUsersList(prev =>
          prev.map(u => u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u)
        );
        setMessage({ type: 'success', text: `Admin status ${!currentIsAdmin ? 'granted' : 'revoked'} successfully.` });
        // Refresh the admin status in case the user changed their own status
        if (userId === user?.id) {
          await refreshAdminStatus();
        }
      } else {
        setMessage({ type: 'error', text: 'Failed to update admin status.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update admin status.' });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim() || !newUserDisplayName.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    if (newUserPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setCreatingUser(true);
    try {
      const result = await createUser(newUserEmail.trim(), newUserPassword, newUserDisplayName.trim(), newUserMakeAdmin);
      if (result.success) {
        setMessage({ type: 'success', text: 'User created successfully!' });
        setShowAddUserModal(false);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserDisplayName('');
        setNewUserMakeAdmin(false);
        // Reload users list
        await loadUsers();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create user.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create user.' });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResetPassword = async (userEmail: string, userId: string) => {
    if (!confirm(`Send password reset email to ${userEmail}?`)) {
      return;
    }

    setResettingPasswordUserId(userId);
    try {
      const result = await sendPasswordResetEmail(userEmail);
      if (result.success) {
        setMessage({ type: 'success', text: `Password reset email sent to ${userEmail}` });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send password reset email.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send password reset email.' });
    } finally {
      setResettingPasswordUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This cannot be undone.`)) {
      return;
    }

    setDeletingUserId(userId);
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        setMessage({ type: 'success', text: 'User deleted successfully.' });
        setUsersList(prev => prev.filter(u => u.id !== userId));
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete user.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete user.' });
    } finally {
      setDeletingUserId(null);
    }
  };

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
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-slate-800">User Management</h2>
            <div className="flex items-center gap-3">
              {currentUserIsSuperAdmin && (
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <UserPlus size={16} />
                  Add User
                </button>
              )}
              <button
                onClick={loadUsers}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Refresh
              </button>
            </div>
          </div>

          {!currentUserIsSuperAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-amber-800 font-medium">Limited Access</p>
                <p className="text-amber-700 text-sm">Only the super admin can grant or revoke admin privileges.</p>
              </div>
            </div>
          )}

          {usersLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
            </div>
          ) : usersList.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Users className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No users found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">User</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Email</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600 hidden md:table-cell">Joined</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Admin</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((userItem) => {
                    const isUserSuperAdmin = isSuperAdmin(userItem.email);
                    return (
                      <tr key={userItem.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {userItem.avatar_url ? (
                              <img
                                src={userItem.avatar_url}
                                alt=""
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <Users size={16} className="text-slate-500" />
                              </div>
                            )}
                            <span className="font-medium text-slate-800">
                              {userItem.full_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {userItem.email}
                          {isUserSuperAdmin && (
                            <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              Super Admin
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">
                          {new Date(userItem.created_at).toLocaleDateString('en-NZ', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {userItem.is_admin || isUserSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                              <ShieldCheck size={14} />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                              <ShieldX size={14} />
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {/* Reset Password Button */}
                            <button
                              onClick={() => handleResetPassword(userItem.email, userItem.id)}
                              disabled={resettingPasswordUserId === userItem.id}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Send password reset email"
                            >
                              {resettingPasswordUserId === userItem.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Key size={16} />
                              )}
                            </button>

                            {/* Admin Toggle - Only for super admin */}
                            {currentUserIsSuperAdmin && !isUserSuperAdmin && (
                              <button
                                onClick={() => handleToggleAdmin(userItem.id, userItem.is_admin)}
                                disabled={updatingUserId === userItem.id}
                                className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                                  userItem.is_admin
                                    ? 'text-emerald-600 hover:text-red-600 hover:bg-red-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={userItem.is_admin ? 'Revoke admin' : 'Make admin'}
                              >
                                {updatingUserId === userItem.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : userItem.is_admin ? (
                                  <ShieldCheck size={16} />
                                ) : (
                                  <ShieldX size={16} />
                                )}
                              </button>
                            )}

                            {/* Delete Button - Only for super admin, not for self or super admin */}
                            {currentUserIsSuperAdmin && !isUserSuperAdmin && userItem.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(userItem.id, userItem.email)}
                                disabled={deletingUserId === userItem.id}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete user"
                              >
                                {deletingUserId === userItem.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </button>
                            )}

                            {/* Protected label for super admin */}
                            {isUserSuperAdmin && currentUserIsSuperAdmin && (
                              <span className="text-xs text-slate-400 px-2">Protected</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <UserPlus size={20} className="text-emerald-600" />
                    Add New User
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddUserModal(false);
                      setNewUserEmail('');
                      setNewUserPassword('');
                      setNewUserDisplayName('');
                      setNewUserMakeAdmin(false);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={newUserDisplayName}
                      onChange={(e) => setNewUserDisplayName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showNewUserPassword ? 'text' : 'password'}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Make Admin Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserMakeAdmin}
                      onChange={(e) => setNewUserMakeAdmin(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-medium text-slate-700">Make Admin</span>
                      <p className="text-xs text-slate-500">Grant admin privileges to this user</p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                  <button
                    onClick={() => {
                      setShowAddUserModal(false);
                      setNewUserEmail('');
                      setNewUserPassword('');
                      setNewUserDisplayName('');
                      setNewUserMakeAdmin(false);
                    }}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={creatingUser || !newUserEmail.trim() || !newUserPassword.trim() || !newUserDisplayName.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingUser ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus size={18} />
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
