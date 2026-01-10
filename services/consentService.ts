/**
 * User Consent Service
 *
 * Manages user consent for analytics, marketing, and data processing.
 * Ensures compliance with privacy regulations.
 */

import { supabase, isSupabaseConfigured } from './authService';

export type ConsentType =
  | 'analytics'
  | 'marketing'
  | 'personalization'
  | 'third_party_sharing'
  | 'login_tracking';

export interface UserConsent {
  id: string;
  userId: string;
  consentType: ConsentType;
  consented: boolean;
  consentedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentStatus {
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  thirdPartySharing: boolean;
  loginTracking: boolean;
}

// Default consent status (all false by default for privacy)
export const DEFAULT_CONSENT_STATUS: ConsentStatus = {
  analytics: false,
  marketing: false,
  personalization: true, // Personalization is core to the app functionality
  thirdPartySharing: false,
  loginTracking: true, // Login tracking is for security
};

/**
 * Get all consent statuses for a user
 */
export const getConsentStatus = async (userId: string): Promise<ConsentStatus> => {
  if (!isSupabaseConfigured()) {
    return DEFAULT_CONSENT_STATUS;
  }

  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('consent_type, consented')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching consent status:', error);
      return DEFAULT_CONSENT_STATUS;
    }

    // Start with defaults
    const status = { ...DEFAULT_CONSENT_STATUS };

    // Override with user's saved preferences
    for (const consent of data || []) {
      const type = consent.consent_type as ConsentType;
      switch (type) {
        case 'analytics':
          status.analytics = consent.consented;
          break;
        case 'marketing':
          status.marketing = consent.consented;
          break;
        case 'personalization':
          status.personalization = consent.consented;
          break;
        case 'third_party_sharing':
          status.thirdPartySharing = consent.consented;
          break;
        case 'login_tracking':
          status.loginTracking = consent.consented;
          break;
      }
    }

    return status;
  } catch (err) {
    console.error('Error fetching consent status:', err);
    return DEFAULT_CONSENT_STATUS;
  }
};

/**
 * Update a specific consent
 */
export const updateConsent = async (
  userId: string,
  consentType: ConsentType,
  consented: boolean
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('user_consents')
      .upsert({
        user_id: userId,
        consent_type: consentType,
        consented,
        consented_at: consented ? now : null,
        updated_at: now,
      }, {
        onConflict: 'user_id,consent_type',
      });

    if (error) {
      console.error('Error updating consent:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating consent:', err);
    return false;
  }
};

/**
 * Update multiple consents at once
 */
export const updateAllConsents = async (
  userId: string,
  consents: Partial<ConsentStatus>
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const now = new Date().toISOString();
    const updates: Array<{
      user_id: string;
      consent_type: ConsentType;
      consented: boolean;
      consented_at: string | null;
      updated_at: string;
    }> = [];

    if (consents.analytics !== undefined) {
      updates.push({
        user_id: userId,
        consent_type: 'analytics',
        consented: consents.analytics,
        consented_at: consents.analytics ? now : null,
        updated_at: now,
      });
    }

    if (consents.marketing !== undefined) {
      updates.push({
        user_id: userId,
        consent_type: 'marketing',
        consented: consents.marketing,
        consented_at: consents.marketing ? now : null,
        updated_at: now,
      });
    }

    if (consents.personalization !== undefined) {
      updates.push({
        user_id: userId,
        consent_type: 'personalization',
        consented: consents.personalization,
        consented_at: consents.personalization ? now : null,
        updated_at: now,
      });
    }

    if (consents.thirdPartySharing !== undefined) {
      updates.push({
        user_id: userId,
        consent_type: 'third_party_sharing',
        consented: consents.thirdPartySharing,
        consented_at: consents.thirdPartySharing ? now : null,
        updated_at: now,
      });
    }

    if (consents.loginTracking !== undefined) {
      updates.push({
        user_id: userId,
        consent_type: 'login_tracking',
        consented: consents.loginTracking,
        consented_at: consents.loginTracking ? now : null,
        updated_at: now,
      });
    }

    if (updates.length === 0) {
      return true;
    }

    const { error } = await supabase
      .from('user_consents')
      .upsert(updates, {
        onConflict: 'user_id,consent_type',
      });

    if (error) {
      console.error('Error updating consents:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating consents:', err);
    return false;
  }
};

/**
 * Check if user has given consent for a specific type
 */
export const hasConsent = async (
  userId: string,
  consentType: ConsentType
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    // Return default value for the consent type
    switch (consentType) {
      case 'personalization':
      case 'login_tracking':
        return true;
      default:
        return false;
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('consented')
      .eq('user_id', userId)
      .eq('consent_type', consentType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found, return default
        switch (consentType) {
          case 'personalization':
          case 'login_tracking':
            return true;
          default:
            return false;
        }
      }
      console.error('Error checking consent:', error);
      return false;
    }

    return data?.consented === true;
  } catch (err) {
    console.error('Error checking consent:', err);
    return false;
  }
};

/**
 * Record consent with metadata (IP, user agent) for compliance
 */
export const recordConsentWithMetadata = async (
  userId: string,
  consentType: ConsentType,
  consented: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('user_consents')
      .upsert({
        user_id: userId,
        consent_type: consentType,
        consented,
        consented_at: consented ? now : null,
        ip_address: ipAddress,
        user_agent: userAgent,
        updated_at: now,
      }, {
        onConflict: 'user_id,consent_type',
      });

    if (error) {
      console.error('Error recording consent with metadata:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error recording consent with metadata:', err);
    return false;
  }
};

/**
 * Get consent history for compliance reporting
 */
export const getConsentHistory = async (userId: string): Promise<UserConsent[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching consent history:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type,
      consented: row.consented,
      consentedAt: row.consented_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('Error fetching consent history:', err);
    return [];
  }
};

/**
 * Accept all consents (convenience method for "Accept All" button)
 */
export const acceptAllConsents = async (userId: string): Promise<boolean> => {
  return updateAllConsents(userId, {
    analytics: true,
    marketing: true,
    personalization: true,
    thirdPartySharing: true,
    loginTracking: true,
  });
};

/**
 * Reject all optional consents (keep essential ones)
 */
export const rejectOptionalConsents = async (userId: string): Promise<boolean> => {
  return updateAllConsents(userId, {
    analytics: false,
    marketing: false,
    personalization: true, // Keep - essential for app function
    thirdPartySharing: false,
    loginTracking: true, // Keep - security feature
  });
};
