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
  Check,
  X,
  Percent,
  MessageSquare
} from 'lucide-react';
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

const SubscriptionSettings: React.FC<SubscriptionSettingsProps> = ({ onMessage }) => {
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

  return (
    <div className="space-y-8">
      {/* Configuration Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Settings size={20} className="text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Subscription Configuration</h3>
              <p className="text-sm text-slate-500">Manage pricing and trial settings</p>
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
          {/* Trial Settings */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock size={16} />
              Trial Settings
            </h4>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Trial Period (days)
                </label>
                <input
                  type="number"
                  value={config.trialPeriodDays}
                  onChange={(e) => setConfig({ ...config, trialPeriodDays: parseInt(e.target.value) || 0 })}
                  min="0"
                  max="365"
                  className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign size={16} />
              Pricing
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Weekly Price (cents)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.priceWeeklyCents}
                    onChange={(e) => setConfig({ ...config, priceWeeklyCents: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-sm text-slate-400">{formatPrice(config.priceWeeklyCents)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monthly Price (cents)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.priceMonthlyCents}
                    onChange={(e) => setConfig({ ...config, priceMonthlyCents: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-sm text-slate-400">{formatPrice(config.priceMonthlyCents)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Yearly Price (cents)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.priceYearlyCents}
                    onChange={(e) => setConfig({ ...config, priceYearlyCents: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                  <span className="text-sm text-slate-400">{formatPrice(config.priceYearlyCents)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Yearly Discount (%)
              </label>
              <input
                type="number"
                value={config.yearlyDiscountPercent}
                onChange={(e) => setConfig({ ...config, yearlyDiscountPercent: parseInt(e.target.value) || 0 })}
                min="0"
                max="100"
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <p className="text-xs text-slate-400 mt-1">Shown to users as "Save {config.yearlyDiscountPercent}%"</p>
            </div>
          </div>

          {/* Stripe Price IDs */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
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

          {/* Free Tier Limits */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={16} />
              Free Tier Limits
            </h4>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Max Recipes (Free Tier)
              </label>
              <input
                type="number"
                value={config.freeRecipeLimit}
                onChange={(e) => setConfig({ ...config, freeRecipeLimit: parseInt(e.target.value) || 0 })}
                min="0"
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Cancel Offer Settings */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Percent size={16} />
              Cancellation Retention Offer
            </h4>
            <div className="space-y-4">
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
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        value={config.cancelOfferDiscountPercent}
                        onChange={(e) => setConfig({ ...config, cancelOfferDiscountPercent: parseInt(e.target.value) || 0 })}
                        min="1"
                        max="100"
                        className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-1">e.g., 50 for 50% off</p>
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
                        className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-1">How long the discount applies</p>
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
                    <p className="text-xs text-slate-400 mt-1">Shown to users when they try to cancel</p>
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
                    <p className="text-sm text-emerald-800">
                      <strong>Preview:</strong> Users will see "{config.cancelOfferDiscountPercent}% OFF for {config.cancelOfferDurationMonths} months" when they try to cancel.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grant Pro Access Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Gift size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Grant Pro Access</h3>
              <p className="text-sm text-slate-500">Manually grant Pro access to users</p>
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
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            {userSearch && filteredUsers.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredUsers.slice(0, 10).map((user) => {
                  const sub = getUserSubscription(user.userId);
                  return (
                    <button
                      key={user.userId}
                      onClick={() => {
                        setSelectedUserId(user.userId);
                        setUserSearch(user.email);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between ${
                        selectedUserId === user.userId ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div>
                        <div className="font-medium text-sm text-slate-800">{user.email}</div>
                        {user.fullName && <div className="text-xs text-slate-400">{user.fullName}</div>}
                      </div>
                      {sub?.adminGrantedPro && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                          Pro (Admin)
                        </span>
                      )}
                      {sub?.tier === 'pro' && !sub.adminGrantedPro && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                          Pro (Stripe)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Duration
            </label>
            <div className="flex items-center gap-4">
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
                <span className="text-sm text-slate-700">Until date</span>
              </label>
            </div>
            {!isPermanent && (
              <input
                type="date"
                value={grantExpiry}
                onChange={(e) => setGrantExpiry(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-2 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
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
              placeholder="e.g., Beta tester, Support case #123"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          <button
            onClick={handleGrantPro}
            disabled={!selectedUserId || granting}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {granting ? <Loader2 size={18} className="animate-spin" /> : <Crown size={18} />}
            Grant Pro Access
          </button>
        </div>
      </div>

      {/* Admin-Granted Users */}
      {adminGrantedUsers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-semibold text-slate-800">Admin-Granted Pro Users</h3>
            <p className="text-sm text-slate-500">{adminGrantedUsers.length} users with admin-granted Pro access</p>
          </div>

          <div className="divide-y divide-slate-100">
            {adminGrantedUsers.map((sub) => {
              const user = users.find(u => u.userId === sub.userId);
              return (
                <div key={sub.userId} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800">{user?.email || sub.userId}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      {sub.adminGrantExpiresAt ? (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          Until {new Date(sub.adminGrantExpiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span>Permanent</span>
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
        </div>
      )}
    </div>
  );
};

export default SubscriptionSettings;
