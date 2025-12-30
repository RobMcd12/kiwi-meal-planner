import React, { useState, useEffect } from 'react';
import {
  X,
  Crown,
  Check,
  Camera,
  Video,
  Mic,
  FileAudio,
  Infinity,
  Loader2,
  Sparkles
} from 'lucide-react';
import { getSubscriptionConfig, createCheckoutSession, formatPrice } from '../services/subscriptionService';
import type { SubscriptionConfig, BillingInterval } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureHighlight?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  featureHighlight
}) => {
  const [config, setConfig] = useState<SubscriptionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInterval, setSelectedInterval] = useState<BillingInterval>('monthly');
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const configData = await getSubscriptionConfig();
      setConfig(configData);
    } catch (err) {
      console.error('Failed to load subscription config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckingOut(true);
    setError(null);

    try {
      const result = await createCheckoutSession(selectedInterval);
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

  if (!isOpen) return null;

  const proFeatures = [
    { icon: Camera, text: 'Scan pantry with photos', highlight: 'pantry_scanner' },
    { icon: Video, text: 'Video pantry scanning', highlight: 'video_scanner' },
    { icon: Mic, text: 'Live voice dictation', highlight: 'live_dictation' },
    { icon: FileAudio, text: 'Upload audio recordings', highlight: 'audio_recorder' },
    { icon: Infinity, text: 'Unlimited saved recipes', highlight: 'unlimited_recipes' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X size={20} className="text-white" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
              <Crown size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Upgrade to Pro</h2>
              <p className="text-emerald-100 text-sm">Unlock all features</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
            </div>
          ) : (
            <>
              {/* Features list */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Pro Features
                </h3>
                <div className="space-y-2">
                  {proFeatures.map((feature, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        featureHighlight === feature.highlight
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${
                        featureHighlight === feature.highlight
                          ? 'bg-emerald-100'
                          : 'bg-slate-200'
                      }`}>
                        <feature.icon size={18} className={
                          featureHighlight === feature.highlight
                            ? 'text-emerald-600'
                            : 'text-slate-500'
                        } />
                      </div>
                      <span className="font-medium text-slate-700">{feature.text}</span>
                      <Check size={18} className="ml-auto text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing options */}
              {config && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    Choose your plan
                  </h3>

                  {/* Monthly */}
                  <button
                    onClick={() => setSelectedInterval('monthly')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedInterval === 'monthly'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">Monthly</div>
                        <div className="text-sm text-slate-500">Billed monthly</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-slate-800">
                          {formatPrice(config.priceMonthlyCents)}
                        </div>
                        <div className="text-xs text-slate-400">/month</div>
                      </div>
                    </div>
                  </button>

                  {/* Yearly */}
                  <button
                    onClick={() => setSelectedInterval('yearly')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left relative ${
                      selectedInterval === 'yearly'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <Sparkles size={10} />
                      Save {config.yearlyDiscountPercent}%
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">Yearly</div>
                        <div className="text-sm text-slate-500">Billed annually</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-slate-800">
                          {formatPrice(config.priceYearlyCents)}
                        </div>
                        <div className="text-xs text-slate-400">/year</div>
                      </div>
                    </div>
                  </button>

                  {/* Weekly */}
                  <button
                    onClick={() => setSelectedInterval('weekly')}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedInterval === 'weekly'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">Weekly</div>
                        <div className="text-sm text-slate-500">Billed weekly</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold text-slate-800">
                          {formatPrice(config.priceWeeklyCents)}
                        </div>
                        <div className="text-xs text-slate-400">/week</div>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* CTA Button */}
              <button
                onClick={handleUpgrade}
                disabled={checkingOut || !config}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {checkingOut ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Starting checkout...
                  </>
                ) : (
                  <>
                    <Crown size={20} />
                    Upgrade Now
                  </>
                )}
              </button>

              {/* Terms */}
              <p className="mt-4 text-xs text-center text-slate-400">
                Cancel anytime. Secure payment via Stripe.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
