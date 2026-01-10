/**
 * Consent Banner Component
 *
 * Displays a consent banner for analytics and data collection.
 * Complies with privacy regulations by requiring explicit consent.
 */

import React, { useState, useEffect } from 'react';
import { Cookie, Shield, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import {
  getConsentStatus,
  updateAllConsents,
  acceptAllConsents,
  rejectOptionalConsents,
  ConsentStatus,
  DEFAULT_CONSENT_STATUS,
} from '../services/consentService';

interface ConsentBannerProps {
  onConsentGiven?: () => void;
}

const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentGiven }) => {
  const { user, isAuthenticated } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState<ConsentStatus>(DEFAULT_CONSENT_STATUS);

  // Check if consent has been given
  useEffect(() => {
    const checkConsent = async () => {
      // Check localStorage first for non-authenticated users
      const localConsent = localStorage.getItem('kiwi_consent_given');
      if (localConsent === 'true') {
        setShowBanner(false);
        return;
      }

      if (isAuthenticated && user?.id) {
        // Check database for authenticated users
        const status = await getConsentStatus(user.id);
        setConsents(status);

        // Show banner if analytics consent hasn't been explicitly set
        // We check by comparing to default - if they match, user hasn't made a choice
        const hasExplicitChoice = localStorage.getItem(`kiwi_consent_checked_${user.id}`);
        if (!hasExplicitChoice) {
          setShowBanner(true);
        }
      } else {
        // Show banner for non-authenticated users who haven't consented
        setShowBanner(true);
      }
    };

    checkConsent();
  }, [isAuthenticated, user?.id]);

  const handleAcceptAll = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && user?.id) {
        await acceptAllConsents(user.id);
        localStorage.setItem(`kiwi_consent_checked_${user.id}`, 'true');
      }
      localStorage.setItem('kiwi_consent_given', 'true');
      setShowBanner(false);
      onConsentGiven?.();
    } catch (err) {
      console.error('Error accepting consents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOptional = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && user?.id) {
        await rejectOptionalConsents(user.id);
        localStorage.setItem(`kiwi_consent_checked_${user.id}`, 'true');
      }
      localStorage.setItem('kiwi_consent_given', 'true');
      setShowBanner(false);
      onConsentGiven?.();
    } catch (err) {
      console.error('Error rejecting consents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      if (isAuthenticated && user?.id) {
        await updateAllConsents(user.id, consents);
        localStorage.setItem(`kiwi_consent_checked_${user.id}`, 'true');
      }
      localStorage.setItem('kiwi_consent_given', 'true');
      setShowBanner(false);
      onConsentGiven?.();
    } catch (err) {
      console.error('Error saving consent preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleConsent = (key: keyof ConsentStatus) => {
    // Don't allow toggling essential consents
    if (key === 'personalization' || key === 'loginTracking') {
      return;
    }
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-slate-200 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-100 p-2 rounded-lg flex-shrink-0">
            <Cookie className="text-emerald-600" size={24} />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-slate-800 mb-1">
              Your Privacy Matters
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              We use cookies and similar technologies to improve your experience,
              analyze usage, and personalize content. You can customize your preferences below.
            </p>

            {/* Expandable details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mb-3"
            >
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showDetails ? 'Hide details' : 'Customize preferences'}
            </button>

            {showDetails && (
              <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-3">
                {/* Essential - Always on */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-emerald-600" />
                      <span className="font-medium text-slate-700">Essential</span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                        Always on
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Required for app functionality and security
                    </p>
                  </div>
                  <div className="w-10 h-6 bg-emerald-500 rounded-full flex items-center justify-end px-1 cursor-not-allowed">
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-700">Analytics</span>
                    <p className="text-xs text-slate-500">
                      Help us improve by sharing anonymous usage data
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConsent('analytics')}
                    className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${
                      consents.analytics
                        ? 'bg-emerald-500 justify-end'
                        : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>

                {/* Marketing */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-700">Marketing</span>
                    <p className="text-xs text-slate-500">
                      Receive personalized offers and updates
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConsent('marketing')}
                    className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${
                      consents.marketing
                        ? 'bg-emerald-500 justify-end'
                        : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>

                {/* Third Party */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-700">Third-Party Sharing</span>
                    <p className="text-xs text-slate-500">
                      Share data with trusted partners for better service
                    </p>
                  </div>
                  <button
                    onClick={() => toggleConsent('thirdPartySharing')}
                    className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${
                      consents.thirdPartySharing
                        ? 'bg-emerald-500 justify-end'
                        : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {showDetails ? (
                <button
                  onClick={handleSavePreferences}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Check size={16} />
                  Save preferences
                </button>
              ) : (
                <>
                  <button
                    onClick={handleAcceptAll}
                    disabled={loading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Check size={16} />
                    Accept all
                  </button>
                  <button
                    onClick={handleRejectOptional}
                    disabled={loading}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 flex items-center gap-2"
                  >
                    <X size={16} />
                    Essential only
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Privacy policy link */}
        <div className="mt-3 text-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // Open privacy policy modal
              window.dispatchEvent(new CustomEvent('open-legal-page', { detail: 'privacy' }));
            }}
            className="text-xs text-slate-500 hover:text-emerald-600"
          >
            View our Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
