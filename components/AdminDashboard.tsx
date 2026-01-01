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
  X,
  Settings,
  Plus,
  Edit3,
  Search,
  Tag,
  FolderPlus,
  ToggleLeft,
  ToggleRight,
  Video,
  RefreshCw,
  ChefHat,
  Play,
  Film,
  AlertCircle
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
import {
  getAllInstructions,
  createInstruction,
  updateInstruction,
  deleteInstruction,
  getCategories,
  createCategory,
  deleteCategory
} from '../services/adminInstructionsService';
import type { FeedbackItem, FeedbackStatus, AdminInstruction, AdminInstructionCategory, InstructionTag, UserLoginSummary, AdminUserWithDetails, UserSubscription, RecipeVideo } from '../types';
import UserLoginHistory from './admin/UserLoginHistory';
import SubscriptionSettings from './admin/SubscriptionSettings';
import VideoManagementTab from './admin/VideoManagementTab';
import GoogleDriveSetup from './admin/GoogleDriveSetup';
import DashboardCounterModal from './admin/DashboardCounterModal';
import AdminRecipeBrowser from './admin/AdminRecipeBrowser';
import { getAllUsersWithDetails } from '../services/loginHistoryService';
import { grantProAccess, revokeProAccess } from '../services/subscriptionService';
import { getVideoCount } from '../services/recipeVideoService';
import { Crown, BookOpen, HardDrive, Calendar, ArrowUpDown, ChevronDown } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

interface Stats {
  totalUsers: number;
  totalMealPlans: number;
  totalFavorites: number;
  totalVideos: number;
}

// Helper to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Helper to get friendly tag display names
const getTagDisplayName = (tag: string): string => {
  const tagNames: Record<string, string> = {
    'meal_planner': 'Meal Planner',
    'recipe_generation': 'Recipe Generation',
    'pantry_scanning': 'Pantry Scanning',
    'video_generation': 'Cookbook Video',
  };
  return tagNames[tag] || tag.replace('_', ' ');
};

// Helper to get subscription status display
const getSubscriptionDisplay = (subscription: UserSubscription | null): { label: string; color: string; icon?: React.ReactNode } => {
  if (!subscription) {
    return { label: 'No Sub', color: 'bg-slate-100 text-slate-600' };
  }

  if (subscription.adminGrantedPro) {
    const isExpired = subscription.adminGrantExpiresAt && new Date(subscription.adminGrantExpiresAt) < new Date();
    if (isExpired) {
      return { label: 'Grant Expired', color: 'bg-amber-100 text-amber-700' };
    }
    return {
      label: subscription.adminGrantExpiresAt ? 'Pro (Granted)' : 'Pro (Permanent)',
      color: 'bg-purple-100 text-purple-700',
      icon: <Crown size={12} />
    };
  }

  if (subscription.status === 'trialing') {
    const daysLeft = subscription.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;
    if (daysLeft <= 0) {
      return { label: 'Trial Expired', color: 'bg-red-100 text-red-700' };
    }
    return { label: `Trial (${daysLeft}d)`, color: 'bg-blue-100 text-blue-700' };
  }

  if (subscription.tier === 'pro' && subscription.status === 'active') {
    return {
      label: 'Pro',
      color: 'bg-emerald-100 text-emerald-700',
      icon: <Crown size={12} />
    };
  }

  if (subscription.status === 'cancelled') {
    return { label: 'Cancelled', color: 'bg-red-100 text-red-700' };
  }

  return { label: 'Free', color: 'bg-slate-100 text-slate-600' };
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const { user, isAdmin, refreshAdminStatus, startImpersonation } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, totalMealPlans: 0, totalFavorites: 0, totalVideos: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'data' | 'users' | 'instructions' | 'subscriptions' | 'videos'>('overview');
  const [counterModalType, setCounterModalType] = useState<'users' | 'videos' | 'recipes' | 'mealPlans' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Instructions state
  const [instructionsList, setInstructionsList] = useState<AdminInstruction[]>([]);
  const [categoriesList, setCategoriesList] = useState<AdminInstructionCategory[]>([]);
  const [instructionsLoading, setInstructionsLoading] = useState(false);
  const [instructionSearch, setInstructionSearch] = useState('');
  const [instructionTagFilter, setInstructionTagFilter] = useState<InstructionTag | 'all'>('all');
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState<AdminInstruction | null>(null);
  const [instructionForm, setInstructionForm] = useState({
    title: '',
    instructionText: '',
    categoryId: '',
    tags: [] as InstructionTag[],
    priority: 0,
    isActive: true
  });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [savingInstruction, setSavingInstruction] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingInstructionId, setDeletingInstructionId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | FeedbackStatus>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState<FeedbackStatus>('reviewed');
  const [isResponding, setIsResponding] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState<AdminUserWithDetails[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSortBy, setUserSortBy] = useState<'name' | 'logins' | 'recipes' | 'plans' | 'storage'>('name');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [grantingProUserId, setGrantingProUserId] = useState<string | null>(null);
  const [showGrantProModal, setShowGrantProModal] = useState(false);
  const [grantProTarget, setGrantProTarget] = useState<{ userId: string; email: string } | null>(null);
  const [grantProExpiry, setGrantProExpiry] = useState<string>('');
  const [grantProNote, setGrantProNote] = useState<string>('');
  const [grantProPermanent, setGrantProPermanent] = useState(true);
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
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

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
    } else if (activeTab === 'instructions') {
      loadInstructions();
    }
  }, [activeTab]);

  const loadInstructions = async () => {
    setInstructionsLoading(true);
    try {
      const [instructions, categories] = await Promise.all([
        getAllInstructions(),
        getCategories()
      ]);
      setInstructionsList(instructions);
      setCategoriesList(categories);
    } catch (err) {
      console.error('Failed to load instructions:', err);
      setMessage({ type: 'error', text: 'Failed to load instructions.' });
    } finally {
      setInstructionsLoading(false);
    }
  };

  const handleSaveInstruction = async () => {
    if (!instructionForm.title.trim() || !instructionForm.instructionText.trim() || !instructionForm.categoryId) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setSavingInstruction(true);
    try {
      if (editingInstruction) {
        await updateInstruction(editingInstruction.id, {
          title: instructionForm.title.trim(),
          instructionText: instructionForm.instructionText.trim(),
          categoryId: instructionForm.categoryId,
          tags: instructionForm.tags,
          priority: instructionForm.priority,
          isActive: instructionForm.isActive
        });
        setMessage({ type: 'success', text: 'Instruction updated successfully!' });
      } else {
        const newInstruction = await createInstruction({
          title: instructionForm.title.trim(),
          instructionText: instructionForm.instructionText.trim(),
          categoryId: instructionForm.categoryId,
          tags: instructionForm.tags,
          priority: instructionForm.priority,
        });
        // If user unchecked "Active", immediately update the newly created instruction
        if (newInstruction && !instructionForm.isActive) {
          await updateInstruction(newInstruction.id, { isActive: false });
        }
        setMessage({ type: 'success', text: 'Instruction created successfully!' });
      }
      setShowInstructionModal(false);
      setEditingInstruction(null);
      resetInstructionForm();
      await loadInstructions();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save instruction.' });
    } finally {
      setSavingInstruction(false);
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instruction?')) return;

    setDeletingInstructionId(id);
    try {
      await deleteInstruction(id);
      setInstructionsList(prev => prev.filter(i => i.id !== id));
      setMessage({ type: 'success', text: 'Instruction deleted successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete instruction.' });
    } finally {
      setDeletingInstructionId(null);
    }
  };

  const handleToggleInstructionActive = async (instruction: AdminInstruction) => {
    try {
      await updateInstruction(instruction.id, { isActive: !instruction.isActive });
      setInstructionsList(prev =>
        prev.map(i => i.id === instruction.id ? { ...i, isActive: !i.isActive } : i)
      );
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update instruction status.' });
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      setMessage({ type: 'error', text: 'Please enter a category name.' });
      return;
    }

    setSavingCategory(true);
    try {
      await createCategory(categoryForm.name.trim(), categoryForm.description.trim() || undefined);
      setMessage({ type: 'success', text: 'Category created successfully!' });
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '' });
      await loadInstructions();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create category.' });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const category = categoriesList.find(c => c.id === id);
    const instructionsInCategory = instructionsList.filter(i => i.categoryId === id).length;

    if (instructionsInCategory > 0) {
      if (!confirm(`This category has ${instructionsInCategory} instruction(s). Deleting it will also delete all instructions in this category. Continue?`)) {
        return;
      }
    } else if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    setDeletingCategoryId(id);
    try {
      await deleteCategory(id);
      setCategoriesList(prev => prev.filter(c => c.id !== id));
      setInstructionsList(prev => prev.filter(i => i.categoryId !== id));
      setMessage({ type: 'success', text: 'Category deleted successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete category.' });
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const resetInstructionForm = () => {
    setInstructionForm({
      title: '',
      instructionText: '',
      categoryId: '',
      tags: [],
      priority: 0,
      isActive: true
    });
  };

  const openEditInstructionModal = (instruction: AdminInstruction) => {
    setEditingInstruction(instruction);
    setInstructionForm({
      title: instruction.title,
      instructionText: instruction.instructionText,
      categoryId: instruction.categoryId,
      tags: instruction.tags,
      priority: instruction.priority,
      isActive: instruction.isActive
    });
    setShowInstructionModal(true);
  };

  const toggleInstructionTag = (tag: InstructionTag) => {
    setInstructionForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const filteredInstructions = instructionsList.filter(instruction => {
    const matchesSearch = instructionSearch === '' ||
      instruction.title.toLowerCase().includes(instructionSearch.toLowerCase()) ||
      instruction.instructionText.toLowerCase().includes(instructionSearch.toLowerCase());
    const matchesTag = instructionTagFilter === 'all' || instruction.tags.includes(instructionTagFilter);
    return matchesSearch && matchesTag;
  });

  const groupedInstructions = categoriesList.map(category => ({
    category,
    instructions: filteredInstructions.filter(i => i.categoryId === category.id)
      .sort((a, b) => b.priority - a.priority)
  })).filter(group => group.instructions.length > 0);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const users = await getAllUsersWithDetails();
      setUsersList(users);
    } catch (err) {
      console.error('Failed to load users:', err);
      setMessage({ type: 'error', text: 'Failed to load users.' });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleGrantPro = async () => {
    if (!grantProTarget) return;

    setGrantingProUserId(grantProTarget.userId);
    try {
      const expiresAt = grantProPermanent ? null : grantProExpiry || null;
      const success = await grantProAccess(
        grantProTarget.userId,
        expiresAt,
        grantProNote || null
      );

      if (success) {
        setMessage({ type: 'success', text: `Pro access granted to ${grantProTarget.email}` });
        setShowGrantProModal(false);
        setGrantProTarget(null);
        setGrantProExpiry('');
        setGrantProNote('');
        setGrantProPermanent(true);
        await loadUsers();
      } else {
        setMessage({ type: 'error', text: 'Failed to grant Pro access.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to grant Pro access.' });
    } finally {
      setGrantingProUserId(null);
    }
  };

  const handleRevokePro = async (userId: string, email: string) => {
    if (!confirm(`Revoke Pro access from ${email}?`)) return;

    setGrantingProUserId(userId);
    try {
      const success = await revokeProAccess(userId);
      if (success) {
        setMessage({ type: 'success', text: `Pro access revoked from ${email}` });
        await loadUsers();
      } else {
        setMessage({ type: 'error', text: 'Failed to revoke Pro access.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to revoke Pro access.' });
    } finally {
      setGrantingProUserId(null);
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
          prev.map(u => u.userId === userId ? { ...u, isAdmin: !currentIsAdmin } : u)
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
        setUsersList(prev => prev.filter(u => u.userId !== userId));
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete user.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete user.' });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleImpersonate = async (userId: string, userName: string) => {
    setImpersonatingUserId(userId);
    try {
      const success = await startImpersonation(userId);
      if (success) {
        setMessage({ type: 'success', text: `Now viewing as ${userName}` });
        // Navigate away from admin dashboard
        onBack();
      } else {
        setMessage({ type: 'error', text: 'Failed to start impersonation. Cannot impersonate admins.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to start impersonation.' });
    } finally {
      setImpersonatingUserId(null);
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
    // Status filter
    if (feedbackFilter !== 'all' && f.status !== feedbackFilter) return false;

    // Search filter
    if (feedbackSearch.trim()) {
      const searchLower = feedbackSearch.toLowerCase();
      const matchesSubject = f.subject.toLowerCase().includes(searchLower);
      const matchesMessage = f.message.toLowerCase().includes(searchLower);
      const matchesUserName = f.user_name.toLowerCase().includes(searchLower);
      const matchesUserEmail = f.user_email?.toLowerCase().includes(searchLower) || false;
      if (!matchesSubject && !matchesMessage && !matchesUserName && !matchesUserEmail) return false;
    }

    return true;
  });

  // Filtered and sorted users
  const filteredAndSortedUsers = usersList
    .filter((u) => {
      if (!userSearch.trim()) return true;
      const searchLower = userSearch.toLowerCase();
      const matchesName = u.fullName?.toLowerCase().includes(searchLower) || false;
      const matchesEmail = u.email.toLowerCase().includes(searchLower);
      return matchesName || matchesEmail;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (userSortBy) {
        case 'name':
          comparison = (a.fullName || a.email).localeCompare(b.fullName || b.email);
          break;
        case 'logins':
          comparison = (a.loginSummary?.totalLogins || 0) - (b.loginSummary?.totalLogins || 0);
          break;
        case 'recipes':
          comparison = (a.stats?.recipeCount || 0) - (b.stats?.recipeCount || 0);
          break;
        case 'plans':
          comparison = (a.stats?.mealPlanCount || 0) - (b.stats?.mealPlanCount || 0);
          break;
        case 'storage':
          comparison = (a.stats?.storageUsedBytes || 0) - (b.stats?.storageUsedBytes || 0);
          break;
      }

      return userSortOrder === 'asc' ? comparison : -comparison;
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
        const [usersRes, plansRes, favsRes, videoCount] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('meal_plan_history').select('id', { count: 'exact', head: true }),
          supabase.from('favorite_meals').select('id', { count: 'exact', head: true }),
          getVideoCount(),
        ]);

        setStats({
          totalUsers: usersRes.count || 0,
          totalMealPlans: plansRes.count || 0,
          totalFavorites: favsRes.count || 0,
          totalVideos: videoCount,
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
          { id: 'instructions', label: 'Instructions', icon: Settings },
          { id: 'videos', label: 'Videos', icon: Video },
          { id: 'subscriptions', label: 'Subscriptions', icon: Crown },
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
        <div className="grid md:grid-cols-4 gap-6">
          <button
            onClick={() => setCounterModalType('users')}
            className="bg-white rounded-xl border border-slate-200 p-6 text-left hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalUsers}</div>
                <div className="text-sm text-slate-500">Total Users</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCounterModalType('mealPlans')}
            className="bg-white rounded-xl border border-slate-200 p-6 text-left hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-3 rounded-lg">
                <Activity className="text-emerald-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalMealPlans}</div>
                <div className="text-sm text-slate-500">Meal Plans Created</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCounterModalType('recipes')}
            className="bg-white rounded-xl border border-slate-200 p-6 text-left hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-100 p-3 rounded-lg">
                <Database className="text-rose-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalFavorites}</div>
                <div className="text-sm text-slate-500">Saved Recipes</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCounterModalType('videos')}
            className="bg-white rounded-xl border border-slate-200 p-6 text-left hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Video className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{loading ? '...' : stats.totalVideos}</div>
                <div className="text-sm text-slate-500">Recipe Videos</div>
              </div>
            </div>
          </button>

          <div className="md:col-span-4 bg-white rounded-xl border border-slate-200 p-6">
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
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={feedbackSearch}
                onChange={(e) => setFeedbackSearch(e.target.value)}
                placeholder="Search by title, content, or user..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
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

                  {/* Screenshot */}
                  {item.screenshot && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-600 mb-2">Attached Screenshot:</p>
                      <a
                        href={item.screenshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={item.screenshot}
                          alt="Feedback screenshot"
                          className="max-w-full max-h-64 rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors cursor-pointer"
                        />
                      </a>
                      <p className="text-xs text-slate-400 mt-1">Click to view full size</p>
                    </div>
                  )}

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

                  {/* Screenshot in modal */}
                  {selectedFeedback.screenshot && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm text-slate-500 mb-2">Attached Screenshot:</p>
                      <a
                        href={selectedFeedback.screenshot}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={selectedFeedback.screenshot}
                          alt="Feedback screenshot"
                          className="max-w-full max-h-48 rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors cursor-pointer"
                        />
                      </a>
                      <p className="text-xs text-slate-400 mt-1">Click to view full size</p>
                    </div>
                  )}

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

      {/* Instructions Tab */}
      {activeTab === 'instructions' && (
        <div className="space-y-6">
          {/* Header with actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-slate-800">AI Instructions</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCategoryModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                <FolderPlus size={16} />
                Add Category
              </button>
              <button
                onClick={() => {
                  resetInstructionForm();
                  setEditingInstruction(null);
                  setShowInstructionModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Instruction
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Settings className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-blue-800 font-medium">How Instructions Work</p>
              <p className="text-blue-700 text-sm">Instructions are automatically applied to AI prompts based on their category. Assign each instruction to one or more AI features: <strong>Meal Planner</strong>, <strong>Recipe Generation</strong>, <strong>Pantry Scanning</strong>, or <strong>Cookbook Video</strong>.</p>
            </div>
          </div>

          {/* Search and filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={instructionSearch}
                onChange={(e) => setInstructionSearch(e.target.value)}
                placeholder="Search instructions..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-500">Filter by:</span>
              <select
                value={instructionTagFilter}
                onChange={(e) => setInstructionTagFilter(e.target.value as InstructionTag | 'all')}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              >
                <option value="all">All Categories</option>
                <option value="meal_planner">Meal Planner</option>
                <option value="recipe_generation">Recipe Generation</option>
                <option value="pantry_scanning">Pantry Scanning</option>
                <option value="video_generation">Cookbook Video</option>
              </select>
            </div>
          </div>

          {/* Instructions list */}
          {instructionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
            </div>
          ) : groupedInstructions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Settings className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">
                {instructionSearch || instructionTagFilter !== 'all'
                  ? 'No instructions match your search criteria.'
                  : 'No instructions yet. Create your first instruction!'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedInstructions.map(({ category, instructions }) => (
                <div key={category.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                    <div>
                      <h3 className="font-semibold text-slate-800">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{category.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={deletingCategoryId === category.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete category"
                    >
                      {deletingCategoryId === category.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {instructions.map((instruction) => (
                      <div
                        key={instruction.id}
                        className={`p-4 ${!instruction.isActive ? 'opacity-60 bg-slate-50' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-slate-800">{instruction.title}</h4>
                              <span className="text-xs text-slate-400">Priority: {instruction.priority}</span>
                            </div>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap mb-2">
                              {instruction.instructionText}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-slate-400">Applies to:</span>
                              {instruction.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-200"
                                >
                                  {getTagDisplayName(tag)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleInstructionActive(instruction)}
                              className={`p-2 rounded-lg transition-colors ${
                                instruction.isActive
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={instruction.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {instruction.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                            </button>
                            <button
                              onClick={() => openEditInstructionModal(instruction)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit instruction"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteInstruction(instruction.id)}
                              disabled={deletingInstructionId === instruction.id}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Delete instruction"
                            >
                              {deletingInstructionId === instruction.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Show empty categories */}
              {categoriesList.filter(c => !groupedInstructions.find(g => g.category.id === c.id)).map(category => (
                <div key={category.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
                    <div>
                      <h3 className="font-semibold text-slate-800">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{category.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={deletingCategoryId === category.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete category"
                    >
                      {deletingCategoryId === category.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                  <div className="p-8 text-center">
                    <p className="text-slate-400 text-sm">No instructions in this category</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Instruction Modal */}
          {showInstructionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800">
                    {editingInstruction ? 'Edit Instruction' : 'Add Instruction'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowInstructionModal(false);
                      setEditingInstruction(null);
                      resetInstructionForm();
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={instructionForm.title}
                      onChange={(e) => setInstructionForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Generic Item Prevention"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={instructionForm.categoryId}
                      onChange={(e) => setInstructionForm(prev => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      <option value="">Select a category</option>
                      {categoriesList.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Instruction Text */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Instruction Text *
                    </label>
                    <textarea
                      value={instructionForm.instructionText}
                      onChange={(e) => setInstructionForm(prev => ({ ...prev, instructionText: e.target.value }))}
                      placeholder="Enter the instruction that will be applied to AI prompts..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none h-32"
                    />
                  </div>

                  {/* AI Feature Categories */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Apply to AI Features (select all that apply)
                    </label>
                    <div className="space-y-2 bg-slate-50 rounded-xl p-4 border border-slate-200">
                      {([
                        { value: 'meal_planner', label: 'Meal Planner', description: 'Weekly meal plan generation' },
                        { value: 'recipe_generation', label: 'Recipe Generation', description: 'Creating new recipes from ingredients' },
                        { value: 'pantry_scanning', label: 'Pantry Scanning', description: 'Detecting items from photos' },
                        { value: 'video_generation', label: 'Cookbook Video', description: 'AI-generated cooking videos' },
                      ] as const).map((category) => (
                        <label
                          key={category.value}
                          className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-300 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={instructionForm.tags.includes(category.value)}
                            onChange={() => toggleInstructionTag(category.value)}
                            className="mt-0.5 w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-slate-800">{category.label}</span>
                            <p className="text-sm text-slate-500">{category.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    {instructionForm.tags.length === 0 && (
                      <p className="text-amber-600 text-sm mt-2 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Select at least one AI feature for this instruction to apply
                      </p>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Priority (higher = applied first)
                    </label>
                    <input
                      type="number"
                      value={instructionForm.priority}
                      onChange={(e) => setInstructionForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Active toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={instructionForm.isActive}
                      onChange={(e) => setInstructionForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-medium text-slate-700">Active</span>
                      <p className="text-xs text-slate-500">Active instructions are applied to AI prompts</p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                  <button
                    onClick={() => {
                      setShowInstructionModal(false);
                      setEditingInstruction(null);
                      resetInstructionForm();
                    }}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInstruction}
                    disabled={savingInstruction}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingInstruction ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        {editingInstruction ? 'Update Instruction' : 'Create Instruction'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category Modal */}
          {showCategoryModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FolderPlus size={20} className="text-emerald-600" />
                    Add Category
                  </h3>
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setCategoryForm({ name: '', description: '' });
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Meal Planning Rules"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this category..."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none h-24"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                  <button
                    onClick={() => {
                      setShowCategoryModal(false);
                      setCategoryForm({ name: '', description: '' });
                    }}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    disabled={savingCategory || !categoryForm.name.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingCategory ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <FolderPlus size={18} />
                        Create Category
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div>
          <SubscriptionSettings onMessage={setMessage} />
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div className="space-y-6">
          <GoogleDriveSetup onConfigChange={loadStats} />

          {/* Recipe Browser for Video Generation */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ChefHat size={20} className="text-orange-500" />
              All Recipes - Generate Videos
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Browse all recipes from all users and generate AI videos for them.
            </p>
            <AdminRecipeBrowser
              onVideoGenerated={() => setStats(prev => ({ ...prev, totalVideos: prev.totalVideos + 1 }))}
            />
          </div>

          {/* Existing Videos Management */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Film size={20} className="text-purple-500" />
              Existing Videos
            </h3>
            <VideoManagementTab
              onVideoCountChange={(count) => setStats(prev => ({ ...prev, totalVideos: count }))}
            />
          </div>
        </div>
      )}

      {/* Data Management Tab */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          {/* Hard Reload Section */}
          <div className="bg-white rounded-xl border border-blue-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <RefreshCw size={20} className="text-blue-600" />
              Force App Refresh
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Clear cache and reload the application. Useful after updates or to fix display issues.
            </p>
            <button
              onClick={() => {
                if (confirm('This will clear the cache and reload the app. Continue?')) {
                  // Clear service worker cache
                  if ('caches' in window) {
                    caches.keys().then(names => {
                      names.forEach(name => caches.delete(name));
                    });
                  }
                  // Unregister service workers
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(registrations => {
                      registrations.forEach(registration => registration.unregister());
                    });
                  }
                  // Clear local storage cache flags
                  localStorage.removeItem('app-version');
                  // Force hard reload
                  window.location.reload();
                }
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw size={18} />
              Hard Reload App
            </button>
          </div>

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
          {/* Search, Sort, and Actions */}
          <div className="flex flex-col gap-4">
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

            {/* Search and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 whitespace-nowrap">Sort by:</span>
                <select
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as typeof userSortBy)}
                  className="px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
                >
                  <option value="name">Name</option>
                  <option value="logins">Login Count</option>
                  <option value="recipes">Recipes</option>
                  <option value="plans">Plans</option>
                  <option value="storage">Storage</option>
                </select>
                <button
                  onClick={() => setUserSortOrder(userSortOrder === 'asc' ? 'desc' : 'asc')}
                  className={`p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors ${
                    userSortOrder === 'desc' ? 'bg-slate-100' : ''
                  }`}
                  title={userSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown size={16} className={`text-slate-600 ${userSortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </button>
              </div>
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
          ) : filteredAndSortedUsers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Users className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">
                {userSearch.trim() ? 'No users match your search.' : 'No users found.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Results count */}
              <div className="text-sm text-slate-500">
                Showing {filteredAndSortedUsers.length} of {usersList.length} users
              </div>
              {filteredAndSortedUsers.map((userItem) => {
                const isUserSuperAdmin = isSuperAdmin(userItem.email);
                const subDisplay = getSubscriptionDisplay(userItem.subscription);
                const hasAdminGrant = userItem.subscription?.adminGrantedPro;
                return (
                  <div key={userItem.userId} className="bg-white rounded-xl border border-slate-200 p-4">
                    {/* User header row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {userItem.avatarUrl ? (
                          <img
                            src={userItem.avatarUrl}
                            alt=""
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <Users size={20} className="text-slate-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-800 truncate">
                              {userItem.fullName || 'Unknown'}
                            </span>
                            {/* Subscription Badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${subDisplay.color}`}>
                              {subDisplay.icon}
                              {subDisplay.label}
                            </span>
                            {userItem.isAdmin || isUserSuperAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                                <ShieldCheck size={12} />
                                Admin
                              </span>
                            ) : null}
                            {isUserSuperAdmin && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                Super Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 truncate">{userItem.email}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Joined {new Date(userItem.createdAt).toLocaleDateString('en-NZ', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Grant/Revoke Pro Button */}
                        {currentUserIsSuperAdmin && (
                          hasAdminGrant ? (
                            <button
                              onClick={() => handleRevokePro(userItem.userId, userItem.email)}
                              disabled={grantingProUserId === userItem.userId}
                              className="p-1.5 text-purple-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Revoke Pro access"
                            >
                              {grantingProUserId === userItem.userId ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Crown size={16} />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setGrantProTarget({ userId: userItem.userId, email: userItem.email });
                                setShowGrantProModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Grant Pro access"
                            >
                              <Crown size={16} />
                            </button>
                          )
                        )}

                        {/* Reset Password Button */}
                        <button
                          onClick={() => handleResetPassword(userItem.email, userItem.userId)}
                          disabled={resettingPasswordUserId === userItem.userId}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Send password reset email"
                        >
                          {resettingPasswordUserId === userItem.userId ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Key size={16} />
                          )}
                        </button>

                        {/* Admin Toggle - Only for super admin */}
                        {currentUserIsSuperAdmin && !isUserSuperAdmin && (
                          <button
                            onClick={() => handleToggleAdmin(userItem.userId, userItem.isAdmin)}
                            disabled={updatingUserId === userItem.userId}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                              userItem.isAdmin
                                ? 'text-emerald-600 hover:text-red-600 hover:bg-red-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={userItem.isAdmin ? 'Revoke admin' : 'Make admin'}
                          >
                            {updatingUserId === userItem.userId ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : userItem.isAdmin ? (
                              <ShieldCheck size={16} />
                            ) : (
                              <ShieldX size={16} />
                            )}
                          </button>
                        )}

                        {/* Impersonate Button - Only for super admin, not for self or other admins */}
                        {currentUserIsSuperAdmin && !isUserSuperAdmin && !userItem.isAdmin && userItem.userId !== user?.id && (
                          <button
                            onClick={() => handleImpersonate(userItem.userId, userItem.fullName || userItem.email)}
                            disabled={impersonatingUserId === userItem.userId}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                            title="View as this user"
                          >
                            {impersonatingUserId === userItem.userId ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        )}

                        {/* Delete Button - Only for super admin, not for self or super admin */}
                        {currentUserIsSuperAdmin && !isUserSuperAdmin && userItem.userId !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(userItem.userId, userItem.email)}
                            disabled={deletingUserId === userItem.userId}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete user"
                          >
                            {deletingUserId === userItem.userId ? (
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
                    </div>

                    {/* User Stats Row */}
                    {userItem.stats && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <BookOpen size={12} />
                          {userItem.stats.recipeCount} recipes
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {userItem.stats.mealPlanCount} plans
                        </span>
                        <span className="flex items-center gap-1">
                          <Upload size={12} />
                          {userItem.stats.mediaUploadCount} uploads
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive size={12} />
                          {formatBytes(userItem.stats.storageUsedBytes)}
                        </span>
                        {/* Subscription renewal date for Pro users */}
                        {userItem.subscription?.stripeCurrentPeriodEnd && userItem.subscription.tier === 'pro' && !userItem.subscription.adminGrantedPro && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <Crown size={12} />
                            {userItem.subscription.cancelAtPeriodEnd ? 'Expires' : 'Renews'}{' '}
                            {new Date(userItem.subscription.stripeCurrentPeriodEnd).toLocaleDateString('en-NZ', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                        {/* Admin grant expiry for admin-granted Pro */}
                        {userItem.subscription?.adminGrantedPro && userItem.subscription.adminGrantExpiresAt && (
                          <span className="flex items-center gap-1 text-purple-600">
                            <Crown size={12} />
                            Grant expires{' '}
                            {new Date(userItem.subscription.adminGrantExpiresAt).toLocaleDateString('en-NZ', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Login History */}
                    <UserLoginHistory
                      userId={userItem.userId}
                      userEmail={userItem.email}
                      loginSummary={userItem.loginSummary}
                      isExpanded={expandedUserId === userItem.userId}
                      onToggle={() => setExpandedUserId(
                        expandedUserId === userItem.userId ? null : userItem.userId
                      )}
                    />
                  </div>
                );
              })}
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

          {/* Grant Pro Modal */}
          {showGrantProModal && grantProTarget && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Crown size={20} className="text-purple-600" />
                    Grant Pro Access
                  </h3>
                  <button
                    onClick={() => {
                      setShowGrantProModal(false);
                      setGrantProTarget(null);
                      setGrantProExpiry('');
                      setGrantProNote('');
                      setGrantProPermanent(true);
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-slate-600">
                    Grant Pro access to <span className="font-medium text-slate-800">{grantProTarget.email}</span>
                  </p>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Duration
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={grantProPermanent}
                          onChange={() => setGrantProPermanent(true)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-slate-700">Permanent</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!grantProPermanent}
                          onChange={() => setGrantProPermanent(false)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-slate-700">Until date</span>
                      </label>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  {!grantProPermanent && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Expires On
                      </label>
                      <input
                        type="date"
                        value={grantProExpiry}
                        onChange={(e) => setGrantProExpiry(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                      />
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Note (optional)
                    </label>
                    <input
                      type="text"
                      value={grantProNote}
                      onChange={(e) => setGrantProNote(e.target.value)}
                      placeholder="e.g., Beta tester, Employee, etc."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                  <button
                    onClick={() => {
                      setShowGrantProModal(false);
                      setGrantProTarget(null);
                      setGrantProExpiry('');
                      setGrantProNote('');
                      setGrantProPermanent(true);
                    }}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGrantPro}
                    disabled={grantingProUserId !== null || (!grantProPermanent && !grantProExpiry)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {grantingProUserId ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Granting...
                      </>
                    ) : (
                      <>
                        <Crown size={18} />
                        Grant Pro
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Counter Modal */}
      {counterModalType && (
        <DashboardCounterModal
          type={counterModalType}
          onClose={() => setCounterModalType(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
