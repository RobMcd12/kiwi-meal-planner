import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Loader2,
  AlertCircle,
  DollarSign,
  Clock,
  Users,
  Crown,
  Gift,
  Calendar,
  Search,
  X,
  Percent,
  MessageSquare,
  CreditCard,
  Shield,
  Sliders
} from 'lucide-react';
import ResponsiveTabs from '../ResponsiveTabs';
import {
  getSubscriptionConfig,
  updateSubscriptionConfig,
  getAllSubscriptions,
  grantProAccess,
  revokeProAccess,
  formatPrice
} from '../../services/subscriptionService';
import { getAllUsersWithLoginSummary } from '../../services/loginHistoryService';
import type { SubscriptionConfig, UserSubscription } from '../../types';

interface SubscriptionSettingsProps {
  onMessage?: (message: { type: 'success' | 'error'; text: string }) => void;
}

type TabId = 'pricing' | 'access' | 'tiers';

const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({ onMessage }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('pricing');

  // Config state
  const [config, setConfig] = useState<SubscriptionConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Users state
  const [users, setUsers] = useState<Array<{ userId: string; email: string; fullName: string | null }>>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Grant Pro form
  const [selectedUserId, setSelectedUserId] = useState('');
  const [grantExpiry, setGrantExpiry] = useState('');
  const [grantNote, setGrantNote] = useState('');
  const [isPermanent, setIsPermanent] = useState(true);
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // User search
  const [userSearch, setUserSearch] = useState('');

  const tabs = [
    { id: 'pricing' as TabId, label: 'Pricing', icon: DollarSign },
    { id: 'access' as TabId, label: 'Access', icon: Shield },
    { id: 'tiers' as TabId, label: 'Tier Management', icon: Sliders },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setConfigLoading(true);
    setUsersLoading(true);
    try {
      const [configData, usersData, subsData] = await Promise.all([
        getSubscriptionConfig(),
        getAllUsersWithLoginSummary(),
        getAllSubscriptions()
      ]);
      setConfig(configData);
      setUsers(usersData.map(u => ({ userId: u.userId, email: u.email, fullName: u.fullName })));
      setSubscriptions(subsData);
    } catch (err) {
      console.error('Failed to load data:', err);
      onMessage?.({ type: 'error', text: 'Failed to load subscription data' });
    } finally {
      setConfigLoading(false);
      setUsersLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    setSavingConfig(true);
    try {
      const success = await updateSubscriptionConfig({
        trialPeriodDays: config.trialPeriodDays,
        priceWeeklyCents: config.priceWeeklyCents,
        priceMonthlyCents: config.priceMonthlyCents,
        priceYearlyCents: config.priceYearlyCents,
        yearlyDiscountPercent: config.yearlyDiscountPercent,
        freeRecipeLimit: config.freeRecipeLimit,
        stripeWeeklyPriceId: config.stripeWeeklyPriceId || undefined,
        stripeMonthlyPriceId: config.stripeMonthlyPriceId || undefined,
        stripeYearlyPriceId: config.stripeYearlyPriceId || undefined,
        cancelOfferEnabled: config.cancelOfferEnabled,
        cancelOfferDiscountPercent: config.cancelOfferDiscountPercent,
        cancelOfferDurationMonths: config.cancelOfferDurationMonths,
        cancelOfferMessage: config.cancelOfferMessage,
      });

      if (success) {
        onMessage?.({ type: 'success', text: 'Configuration saved successfully' });
      } else {
        onMessage?.({ type: 'error', text: 'Failed to save configuration' });
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      onMessage?.({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleGrantPro = async () => {
    if (!selectedUserId) {
      onMessage?.({ type: 'error', text: 'Please select a user' });
      return;
    }

    setGranting(true);
    try {
      const expiresAt = isPermanent ? null : grantExpiry || null;
      const success = await grantProAccess(selectedUserId, expiresAt, grantNote || null);

      if (success) {
        onMessage?.({ type: 'success', text: 'Pro access granted successfully' });
        // Reload subscriptions
        const subsData = await getAllSubscriptions();
        setSubscriptions(subsData);
        // Reset form
        setSelectedUserId('');
        setGrantExpiry('');
        setGrantNote('');
        setIsPermanent(true);
        setUserSearch('');
      } else {
        onMessage?.({ type: 'error', text: 'Failed to grant Pro access' });
      }
    } catch (err) {
      console.error('Failed to grant Pro:', err);
      onMessage?.({ type: 'error', text: 'Failed to grant Pro access' });
    } finally {
      setGranting(false);
    }
  };

  const handleRevokePro = async (userId: string) => {
    if (!confirm('Are you sure you want to revoke Pro access for this user?')) return;

    setRevoking(userId);
    try {
      const success = await revokeProAccess(userId);

      if (success) {
        onMessage?.({ type: 'success', text: 'Pro access revoked' });
        // Reload subscriptions
        const subsData = await getAllSubscriptions();
        setSubscriptions(subsData);
      } else {
        onMessage?.({ type: 'error', text: 'Failed to revoke Pro access' });
      }
    } catch (err) {
      console.error('Failed to revoke Pro:', err);
      onMessage?.({ type: 'error', text: 'Failed to revoke Pro access' });
    } finally {
      setRevoking(null);
    }
  };

  // Filter users for search
  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.fullName && u.fullName.toLowerCase().includes(userSearch.toLowerCase()))
  );

  // Get user's subscription
  const getUserSubscription = (userId: string) => subscriptions.find(s => s.userId === userId);

  // Get users with admin-granted Pro
  const adminGrantedUsers = subscriptions.filter(s => s.adminGrantedPro);

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-red-800 font-medium">Unable to load configuration</p>
          <button onClick={loadData} className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const renderPricingTab = () => (
    <div className="space-y-6">
      {/* Pricing */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Pricing Configuration</h3>
              <p className="text-sm text-slate-500">Set subscription prices and discount rates</p>
            </div>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {savingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Pricing Grid */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Subscription Prices
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Weekly Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    value={(config.priceWeeklyCents / 100).toFixed(2)}
                    onChange={(e) => setConfig({ ...config, priceWeeklyCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">Per week</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Monthly Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    value={(config.priceMonthlyCents / 100).toFixed(2)}
                    onChange={(e) => setConfig({ ...config, priceMonthlyCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">Per month</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Yearly Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">$</span>
                  <input
                    type="number"
                    value={(config.priceYearlyCents / 100).toFixed(2)}
                    onChange={(e) => setConfig({ ...config, priceYearlyCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">Per year</p>
              </div>
            </div>
          </div>

          {/* Yearly Discount */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-3">
              <Percent size={20} className="text-amber-600" />
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Yearly Discount Display
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.yearlyDiscountPercent}
                    onChange={(e) => setConfig({ ...config, yearlyDiscountPercent: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
              </div>
              <div className="bg-amber-100 px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-amber-700">Save {config.yearlyDiscountPercent}%</span>
              </div>
            </div>
          </div>

          {/* Stripe Price IDs */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard size={16} />
              Stripe Price IDs
            </h4>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Weekly Price ID
                </label>
                <input
                  type="text"
                  value={config.stripeWeeklyPriceId || ''}
                  onChange={(e) => setConfig({ ...config, stripeWeeklyPriceId: e.target.value || null })}
                  placeholder="price_..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monthly Price ID
                </label>
                <input
                  type="text"
                  value={config.stripeMonthlyPriceId || ''}
                  onChange={(e) => setConfig({ ...config, stripeMonthlyPriceId: e.target.value || null })}
                  placeholder="price_..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Yearly Price ID
                </label>
                <input
                  type="text"
                  value={config.stripeYearlyPriceId || ''}
                  onChange={(e) => setConfig({ ...config, stripeYearlyPriceId: e.target.value || null })}
                  placeholder="price_..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Retention Offer */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Percent size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Cancellation Retention Offer</h3>
              <p className="text-sm text-slate-500">Offer discounts to users who try to cancel</p>
            </div>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {savingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.cancelOfferEnabled}
                onChange={(e) => setConfig({ ...config, cancelOfferEnabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span className="text-sm font-medium text-slate-700">Enable retention offer when users try to cancel</span>
            </label>
          </div>

          {config.cancelOfferEnabled && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Discount Percentage
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={config.cancelOfferDiscountPercent}
                      onChange={(e) => setConfig({ ...config, cancelOfferDiscountPercent: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="100"
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <span className="text-slate-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration (months)
                  </label>
                  <input
                    type="number"
                    value={config.cancelOfferDurationMonths}
                    onChange={(e) => setConfig({ ...config, cancelOfferDurationMonths: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="12"
                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <MessageSquare size={14} />
                  Offer Message
                </label>
                <textarea
                  value={config.cancelOfferMessage}
                  onChange={(e) => setConfig({ ...config, cancelOfferMessage: e.target.value })}
                  placeholder="Before you go, we'd like to offer you a special discount!"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-purple-800">
                  <strong>Preview:</strong> Users will see "{config.cancelOfferDiscountPercent}% OFF for {config.cancelOfferDurationMonths} months" when they try to cancel.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderAccessTab = () => (
    <div className="space-y-6">
      {/* Grant Pro Access */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Gift size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Grant Pro Access</h3>
              <p className="text-sm text-slate-500">Manually grant Pro access to specific users</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select User
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by email or name..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            {userSearch && filteredUsers.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg shadow-sm">
                {filteredUsers.slice(0, 10).map((user) => {
                  const sub = getUserSubscription(user.userId);
                  return (
                    <button
                      key={user.userId}
                      onClick={() => {
                        setSelectedUserId(user.userId);
                        setUserSearch(user.email);
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-b-0 ${
                        selectedUserId === user.userId ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium text-sm text-slate-800">{user.email}</div>
                        {user.fullName && <div className="text-xs text-slate-400">{user.fullName}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {sub?.adminGrantedPro && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                            Pro (Admin)
                          </span>
                        )}
                        {sub?.tier === 'pro' && !sub.adminGrantedPro && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                            Pro (Stripe)
                          </span>
                        )}
                        {selectedUserId === user.userId && (
                          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="bg-slate-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Access Duration
            </label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isPermanent}
                  onChange={() => setIsPermanent(true)}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-sm text-slate-700">Permanent</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isPermanent}
                  onChange={() => setIsPermanent(false)}
                  className="w-4 h-4 text-emerald-600"
                />
                <span className="text-sm text-slate-700">Until specific date</span>
              </label>
            </div>
            {!isPermanent && (
              <input
                type="date"
                value={grantExpiry}
                onChange={(e) => setGrantExpiry(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-3 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="e.g., Beta tester, Support case #123, Partner account"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <button
            onClick={handleGrantPro}
            disabled={!selectedUserId || granting}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {granting ? <Loader2 size={18} className="animate-spin" /> : <Crown size={18} />}
            Grant Pro Access
          </button>
        </div>
      </div>

      {/* Admin-Granted Users List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Users size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Admin-Granted Pro Users</h3>
              <p className="text-sm text-slate-500">{adminGrantedUsers.length} user{adminGrantedUsers.length !== 1 ? 's' : ''} with admin-granted Pro access</p>
            </div>
          </div>
        </div>

        {adminGrantedUsers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">No users with admin-granted Pro access</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {adminGrantedUsers.map((sub) => {
              const user = users.find(u => u.userId === sub.userId);
              return (
                <div key={sub.userId} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="font-medium text-slate-800">{user?.email || sub.userId}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                      {sub.adminGrantExpiresAt ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Until {new Date(sub.adminGrantExpiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium">Permanent</span>
                      )}
                      {sub.adminGrantNote && (
                        <span className="text-slate-400">• {sub.adminGrantNote}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokePro(sub.userId)}
                    disabled={revoking === sub.userId}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Revoke Pro access"
                  >
                    {revoking === sub.userId ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <X size={18} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderTiersTab = () => (
    <div className="space-y-6">
      {/* Trial Settings */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Trial Settings</h3>
              <p className="text-sm text-slate-500">Configure the free trial period for new users</p>
            </div>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {savingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save
          </button>
        </div>

        <div className="p-6">
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Trial Period Duration
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.trialPeriodDays}
                onChange={(e) => setConfig({ ...config, trialPeriodDays: parseInt(e.target.value) || 0 })}
                min="0"
                max="365"
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center"
              />
              <span className="text-slate-600">days</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              New users will have Pro access for {config.trialPeriodDays} days before needing to subscribe.
              Set to 0 to disable trials.
            </p>
          </div>
        </div>
      </div>

      {/* Free Tier Limits */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Users size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Free Tier Limits</h3>
              <p className="text-sm text-slate-500">Set restrictions for free tier users</p>
            </div>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {savingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save
          </button>
        </div>

        <div className="p-6">
          <div className="max-w-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Maximum Saved Recipes
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={config.freeRecipeLimit}
                onChange={(e) => setConfig({ ...config, freeRecipeLimit: parseInt(e.target.value) || 0 })}
                min="0"
                max="1000"
                className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center"
              />
              <span className="text-slate-600">recipes</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Free tier users can save up to {config.freeRecipeLimit} recipes. Pro users have unlimited.
            </p>
          </div>
        </div>
      </div>

      {/* Tier Comparison */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Crown size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Tier Comparison</h3>
              <p className="text-sm text-slate-500">Features available in each tier</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Tier */}
            <div className="border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Users size={18} className="text-slate-600" />
                </div>
                <h4 className="font-semibold text-slate-800">Free Tier</h4>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  AI meal plans
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Shopping lists
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {config.freeRecipeLimit} saved recipes
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Basic pantry management
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <X size={16} />
                  Photo scanning
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <X size={16} />
                  Video scanning
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-400">
                  <X size={16} />
                  Voice dictation
                </li>
              </ul>
            </div>

            {/* Pro Tier */}
            <div className="border-2 border-emerald-500 rounded-xl p-5 bg-emerald-50/50">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <Crown size={18} className="text-white" />
                </div>
                <h4 className="font-semibold text-slate-800">Pro Tier</h4>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium ml-auto">
                  {formatPrice(config.priceMonthlyCents)}/mo
                </span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Everything in Free
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited recipes
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Photo scanning
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Video scanning
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Voice dictation
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Audio upload
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5">
        <ResponsiveTabs
          tabs={[
            { id: 'pricing', label: 'Pricing', icon: <DollarSign size={18} />, color: 'emerald' },
            { id: 'access', label: 'Access', icon: <Shield size={18} />, color: 'emerald' },
            { id: 'tiers', label: 'Tier Management', icon: <Sliders size={18} />, color: 'emerald' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as TabId)}
          variant="solid-pill"
          visibleCount={3}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'pricing' && renderPricingTab()}
      {activeTab === 'access' && renderAccessTab()}
      {activeTab === 'tiers' && renderTiersTab()}
    </div>
  );
};

export default SubscriptionSettings;
