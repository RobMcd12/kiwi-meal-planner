import React, { useState, useEffect } from 'react';
import {
  Crown,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  Calendar,
  CreditCard,
  Clock,
  Camera,
  Video,
  Mic,
  FileAudio,
  Infinity,
  Gift,
  Pause,
  Play,
  X,
  Percent,
  AlertTriangle
} from 'lucide-react';
import {
  getSubscriptionState,
  getSubscriptionConfig,
  createCheckoutSession,
  createPortalSession,
  formatPrice,
  pauseSubscription,
  resumeSubscription,
  getCancelOffer,
  acceptCancelOffer,
  cancelSubscription,
  cancelTrial,
  resetToFreeTier,
  syncSubscription
} from '../services/subscriptionService';
import type { SubscriptionState, SubscriptionConfig, BillingInterval } from '../types';

interface SubscriptionManagerProps {
  onRefresh?: () => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onRefresh }) => {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(null);
  const [config, setConfig] = useState<SubscriptionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pause modal state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseResumeDate, setPauseResumeDate] = useState('');
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState<'reason' | 'offer' | 'confirm'>('reason');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelOffer, setCancelOffer] = useState<{
    offerAvailable: boolean;
    discountPercent?: number;
    durationMonths?: number;
    message?: string;
  } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Check for checkout success on mount and sync subscription
  useEffect(() => {
    const checkCheckoutSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const subscriptionParam = urlParams.get('subscription');

      if (subscriptionParam === 'success') {
        console.log('Checkout success detected, syncing subscription...');
        setSyncing(true);
        setSuccessMessage('Payment successful! Activating your subscription...');

        // Clear the URL parameter
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);

        // Try to sync subscription from Stripe (fallback for webhook)
        try {
          const syncResult = await syncSubscription();
          console.log('Sync result:', syncResult);

          if (syncResult?.synced && syncResult.tier === 'pro') {
            setSuccessMessage('Welcome to Pro! Your subscription is now active.');
          } else {
            // Webhook might have already processed it, or there was an issue
            // Either way, reload the subscription state
            setSuccessMessage('Your subscription has been processed.');
          }
        } catch (err) {
          console.error('Error syncing subscription:', err);
          // Don't show error - the webhook may have already processed it
        } finally {
          setSyncing(false);
        }

        // Reload subscription state after sync
        await loadSubscription();
        onRefresh?.();
      } else if (subscriptionParam === 'cancelled') {
        setError('Checkout was cancelled. You can try again anytime.');
        // Clear the URL parameter
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    };

    checkCheckoutSuccess();
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      const [state, configData] = await Promise.all([
        getSubscriptionState(),
        getSubscriptionConfig()
      ]);
      setSubscriptionState(state);
      setConfig(configData);
    } catch (err) {
      console.error('Failed to load subscription:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (interval: BillingInterval) => {
    setCheckingOut(true);
    setError(null);
    try {
      const result = await createCheckoutSession(interval);
      if (result?.url) {
        window.location.href = result.url;
      } else {
        setError('Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to start checkout. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleManageSubscription = async () => {
    setOpeningPortal(true);
    setError(null);
    try {
      const result = await createPortalSession();
      if (result && 'url' in result) {
        window.location.href = result.url;
      } else if (result && 'error' in result) {
        // Handle structured errors
        if (result.error === 'no_subscription') {
          setError('You need to subscribe first before you can manage billing. Choose a plan below to get started!');
        } else {
          setError(result.message || 'Failed to open billing portal.');
        }
      } else {
        setError('Failed to open billing portal. Please try again.');
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError('Failed to open billing portal. Please try again.');
    } finally {
      setOpeningPortal(false);
    }
  };

  // Pause handlers
  const handleOpenPauseModal = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    setPauseResumeDate(minDate.toISOString().split('T')[0]);
    setShowPauseModal(true);
  };

  const handlePause = async () => {
    if (!pauseResumeDate) return;
    setPausing(true);
    setError(null);
    try {
      const result = await pauseSubscription(pauseResumeDate);
      if (result.success) {
        setSuccessMessage('Subscription paused successfully');
        setShowPauseModal(false);
        await loadSubscription();
        onRefresh?.();
      } else {
        setError(result.message || 'Failed to pause subscription');
      }
    } catch (err) {
      console.error('Pause error:', err);
      setError('Failed to pause subscription');
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    setError(null);
    try {
      const result = await resumeSubscription();
      if (result.success) {
        setSuccessMessage('Subscription resumed successfully');
        await loadSubscription();
        onRefresh?.();
      } else {
        setError(result.message || 'Failed to resume subscription');
      }
    } catch (err) {
      console.error('Resume error:', err);
      setError('Failed to resume subscription');
    } finally {
      setResuming(false);
    }
  };

  // Cancel handlers
  const handleOpenCancelModal = async () => {
    setCancelStep('reason');
    setCancelReason('');
    setShowCancelModal(true);

    // Pre-fetch the cancel offer (only for Stripe subscriptions, not trials)
    const hasStripe = !!subscriptionState?.subscription?.stripeSubscriptionId;
    if (hasStripe) {
      const offer = await getCancelOffer();
      setCancelOffer(offer);
    } else {
      setCancelOffer(null);
    }
  };

  const handleCancelNext = () => {
    // Skip offer step for trial users
    const hasStripe = !!subscriptionState?.subscription?.stripeSubscriptionId;
    if (!hasStripe || !cancelOffer?.offerAvailable) {
      setCancelStep('confirm');
    } else {
      setCancelStep('offer');
    }
  };

  const handleAcceptOffer = async () => {
    setAcceptingOffer(true);
    setError(null);
    try {
      const result = await acceptCancelOffer();
      if (result.success) {
        setSuccessMessage(result.message || 'Discount applied successfully!');
        setShowCancelModal(false);
        await loadSubscription();
        onRefresh?.();
      } else {
        setError(result.message || 'Failed to apply discount');
      }
    } catch (err) {
      console.error('Accept offer error:', err);
      setError('Failed to apply discount');
    } finally {
      setAcceptingOffer(false);
    }
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const hasStripe = !!subscriptionState?.subscription?.stripeSubscriptionId;
      const isTrial = subscriptionState?.isTrialing && !hasStripe;

      let result;
      if (isTrial) {
        result = await cancelTrial(cancelReason);
      } else {
        result = await cancelSubscription(cancelReason);
      }

      if (result.success) {
        const message = isTrial
          ? 'Trial cancelled. You are now on the free plan.'
          : 'Subscription cancelled. You will retain access until the end of your billing period.';
        setSuccessMessage(message);
        setShowCancelModal(false);
        await loadSubscription();
        onRefresh?.();
      } else {
        setError(result.message || 'Failed to cancel');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setError('Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  // Reset to free tier handler
  const handleResetToFree = async () => {
    if (!confirm('Are you sure you want to reset to the free tier? This will remove all Pro access.')) {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      const result = await resetToFreeTier();
      if (result.success) {
        setSuccessMessage(result.message || 'Reset to free tier successfully');
        await loadSubscription();
        onRefresh?.();
      } else {
        setError(result.message || 'Failed to reset');
      }
    } catch (err) {
      console.error('Reset error:', err);
      setError('Failed to reset subscription');
    } finally {
      setResetting(false);
    }
  };

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (loading || syncing) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        {syncing && (
          <p className="text-sm text-emerald-600 font-medium">Activating your subscription...</p>
        )}
      </div>
    );
  }

  if (!subscriptionState || !config) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-red-800 font-medium">Unable to load subscription</p>
          <button
            onClick={loadSubscription}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { subscription, hasPro, isTrialing, daysLeftInTrial, recipeCount, recipeLimit } = subscriptionState;
  const isPaused = !!subscription?.pausedAt;
  const hasStripeSubscription = !!subscription?.stripeSubscriptionId;

  // Pro features list
  const proFeatures = [
    { icon: Camera, text: 'Scan pantry with photos' },
    { icon: Video, text: 'Video pantry scanning' },
    { icon: Mic, text: 'Live voice dictation' },
    { icon: FileAudio, text: 'Upload audio recordings' },
    { icon: Infinity, text: 'Unlimited saved recipes' },
  ];

  return (
    <div className="space-y-6">
      {/* Success message */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <Check className="text-emerald-500 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-emerald-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className={`p-6 ${hasPro ? 'bg-gradient-to-r from-amber-50 to-orange-50' : 'bg-slate-50'}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {hasPro ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-full">
                    <Crown size={16} />
                    Pro Plan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-600 text-sm font-medium rounded-full">
                    Free Plan
                  </span>
                )}
                {isTrialing && daysLeftInTrial !== null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    <Gift size={12} />
                    {daysLeftInTrial} days left in trial
                  </span>
                )}
                {isPaused && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                    <Pause size={12} />
                    Paused
                  </span>
                )}
              </div>
              {subscription?.adminGrantedPro && (
                <p className="text-sm text-amber-600 flex items-center gap-1 mt-1">
                  <Gift size={14} />
                  Pro access granted by admin
                  {subscription.adminGrantExpiresAt && (
                    <span className="text-amber-500">
                      (until {new Date(subscription.adminGrantExpiresAt).toLocaleDateString()})
                    </span>
                  )}
                </p>
              )}
            </div>

            {hasPro && hasStripeSubscription && (
              <button
                onClick={handleManageSubscription}
                disabled={openingPortal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {openingPortal ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ExternalLink size={16} />
                )}
                Manage Billing
              </button>
            )}
          </div>

          {/* Usage stats for free users */}
          {!hasPro && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Saved Recipes</span>
                <span className="text-sm text-slate-500">
                  {recipeCount} / {recipeLimit}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    recipeCount >= recipeLimit
                      ? 'bg-red-500'
                      : recipeCount >= recipeLimit * 0.8
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (recipeCount / recipeLimit) * 100)}%` }}
                />
              </div>
              {recipeCount >= recipeLimit && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  Recipe limit reached. Upgrade to Pro for unlimited recipes.
                </p>
              )}
            </div>
          )}

          {/* Paused status */}
          {isPaused && subscription?.pauseResumesAt && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 flex items-center gap-2">
                <Pause size={16} />
                Subscription paused until {new Date(subscription.pauseResumesAt).toLocaleDateString()}
              </p>
              <button
                onClick={handleResume}
                disabled={resuming}
                className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {resuming ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                Resume Now
              </button>
            </div>
          )}

          {/* Stripe subscription details */}
          {hasPro && subscription?.stripeCurrentPeriodEnd && !isPaused && (
            <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                {new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}
              </span>
              {subscription.cancelAtPeriodEnd && (
                <span className="text-amber-600 font-medium">
                  (Cancelled - access until end of period)
                </span>
              )}
            </div>
          )}

          {/* Pause and Cancel buttons for Pro users with active Stripe subscription */}
          {hasPro && hasStripeSubscription && !subscription?.cancelAtPeriodEnd && !isPaused && (
            <div className="mt-4 pt-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={handleOpenPauseModal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
              >
                <Pause size={16} />
                Pause Subscription
              </button>
              <button
                onClick={handleOpenCancelModal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg transition-colors"
              >
                <X size={16} />
                Cancel Subscription
              </button>
            </div>
          )}

          {/* Cancel trial option for trialing users */}
          {isTrialing && !hasStripeSubscription && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={handleOpenCancelModal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg transition-colors"
              >
                <X size={16} />
                Cancel Trial
              </button>
            </div>
          )}

          {/* Info for admin-granted Pro users without Stripe subscription */}
          {hasPro && subscription?.adminGrantedPro && !hasStripeSubscription && (
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                Your Pro access was granted by an administrator. To modify your subscription, please contact support.
              </p>
            </div>
          )}

          {/* Reset option for Pro users without Stripe subscription (for fixing issues) */}
          {hasPro && !hasStripeSubscription && !isTrialing && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={handleResetToFree}
                disabled={resetting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {resetting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <X size={16} />
                )}
                Reset to Free Tier
              </button>
              <p className="mt-2 text-xs text-slate-400">
                Use this to fix subscription issues or to re-subscribe through Stripe
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade options for free users */}
      {!hasPro && config && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Upgrade to Pro</h3>

          {/* Pro features */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
            <h4 className="font-semibold text-emerald-800 mb-3">Pro Features</h4>
            <div className="grid gap-2">
              {proFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="p-1.5 bg-emerald-200 rounded-lg">
                    <feature.icon size={16} className="text-emerald-700" />
                  </div>
                  <span className="text-sm text-emerald-800">{feature.text}</span>
                  <Check size={16} className="ml-auto text-emerald-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Pricing options */}
          <div className="grid gap-3">
            {/* Monthly */}
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={checkingOut}
              className="w-full p-4 bg-white rounded-xl border-2 border-emerald-500 hover:bg-emerald-50 transition-colors text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <div className="font-semibold text-slate-800">Monthly</div>
                <div className="text-sm text-slate-500">Billed monthly, cancel anytime</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-emerald-600">
                  {formatPrice(config.priceMonthlyCents)}
                </div>
                <div className="text-xs text-slate-400">/month</div>
              </div>
            </button>

            {/* Yearly */}
            <button
              onClick={() => handleUpgrade('yearly')}
              disabled={checkingOut}
              className="w-full p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border-2 border-amber-400 hover:from-amber-100 hover:to-orange-100 transition-colors text-left flex items-center justify-between relative disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                Save {config.yearlyDiscountPercent}%
              </div>
              <div>
                <div className="font-semibold text-slate-800">Yearly</div>
                <div className="text-sm text-slate-500">Best value, cancel anytime</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-amber-600">
                  {formatPrice(config.priceYearlyCents)}
                </div>
                <div className="text-xs text-slate-400">/year</div>
              </div>
            </button>

            {/* Weekly */}
            <button
              onClick={() => handleUpgrade('weekly')}
              disabled={checkingOut}
              className="w-full p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <div className="font-semibold text-slate-800">Weekly</div>
                <div className="text-sm text-slate-500">Try it out first</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-slate-600">
                  {formatPrice(config.priceWeeklyCents)}
                </div>
                <div className="text-xs text-slate-400">/week</div>
              </div>
            </button>
          </div>

          {checkingOut && (
            <div className="flex items-center justify-center gap-2 py-4 text-emerald-600">
              <Loader2 size={20} className="animate-spin" />
              Starting checkout...
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Secure payment notice */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <CreditCard size={14} />
        Secure payment processed by Stripe
      </div>

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Pause size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-800">Pause Subscription</h3>
                <p className="text-sm text-slate-500">Take a break, we'll be here when you get back</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Resume Date
                </label>
                <input
                  type="date"
                  value={pauseResumeDate}
                  onChange={(e) => setPauseResumeDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  max={new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">Maximum pause: 90 days</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600">
                  You won't be charged while paused. Your subscription will automatically resume on the selected date.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPauseModal(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePause}
                disabled={pausing || !pauseResumeDate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {pausing ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
                Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            {cancelStep === 'reason' && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle size={24} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">Cancel Subscription</h3>
                    <p className="text-sm text-slate-500">We're sorry to see you go</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Why are you cancelling? (optional)
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Let us know how we can improve..."
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancelNext}
                    className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {cancelStep === 'offer' && cancelOffer?.offerAvailable && (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex p-3 bg-emerald-100 rounded-full mb-4">
                    <Percent size={32} className="text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-xl text-slate-800 mb-2">Wait! Special Offer</h3>
                  <p className="text-slate-600">{cancelOffer.message}</p>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200 text-center mb-6">
                  <div className="text-4xl font-bold text-emerald-600 mb-1">
                    {cancelOffer.discountPercent}% OFF
                  </div>
                  <div className="text-slate-600">
                    for the next {cancelOffer.durationMonths} months
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelStep('confirm')}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    No Thanks
                  </button>
                  <button
                    onClick={handleAcceptOffer}
                    disabled={acceptingOffer}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {acceptingOffer ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Accept Offer
                  </button>
                </div>
              </>
            )}

            {cancelStep === 'confirm' && (() => {
              const hasStripe = !!subscriptionState?.subscription?.stripeSubscriptionId;
              const isTrial = subscriptionState?.isTrialing && !hasStripe;
              return (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <X size={24} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800">
                        {isTrial ? 'Cancel Trial' : 'Confirm Cancellation'}
                      </h3>
                      <p className="text-sm text-slate-500">This action cannot be undone</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    {isTrial ? (
                      <>
                        <p className="text-sm text-slate-600 mb-2">
                          Your trial will end immediately and you will be moved to the free plan.
                        </p>
                        <p className="text-sm text-slate-600">
                          You can upgrade to Pro at any time to regain access to premium features.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600 mb-2">
                          Your subscription will be cancelled at the end of your current billing period.
                        </p>
                        <p className="text-sm text-slate-600">
                          You will continue to have access to Pro features until then.
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                      {isTrial ? 'Keep Trial' : 'Keep Subscription'}
                    </button>
                    <button
                      onClick={handleConfirmCancel}
                      disabled={cancelling}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {cancelling ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <X size={16} />
                      )}
                      {isTrial ? 'Cancel Trial' : 'Cancel Subscription'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
