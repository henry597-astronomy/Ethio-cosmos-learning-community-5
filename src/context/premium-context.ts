import { createContext } from 'react';

export type PremiumSettings = {
  id: string;
  is_enabled: boolean;
  manual_payment_enabled: boolean;
  manual_payment_method: string;
  manual_payment_receiver_name: string;
  manual_payment_account: string;
  manual_payment_instructions: string;
};

export type PremiumFeature = {
  key: string;
  is_premium: boolean;
};

export type PremiumTopicFlag = {
  topic_id: string;
  is_premium: boolean;
};

export type PremiumSubtopicFlag = {
  subtopic_id: string;
  is_premium: boolean;
};

export type PremiumLessonFlag = {
  subtopic_id: string;
  is_premium: boolean;
};

export type PremiumEntitlement = {
  id: string;
  status: 'active' | 'revoked';
  source: 'manual' | 'payment' | 'test';
  starts_at: string;
  expires_at: string | null;
};

export type PremiumContextValue = {
  loading: boolean;
  globalEnabled: boolean;
  manualPayment: PremiumSettings;
  hasManualPaymentDetails: boolean;
  features: PremiumFeature[];
  topics: PremiumTopicFlag[];
  subtopics: PremiumSubtopicFlag[];
  lessonFlags: PremiumLessonFlag[];
  entitlements: PremiumEntitlement[];
  hasActiveGrant: boolean;
  isPremiumFeature: (featureKey: string) => boolean;
  canUse: (featureKey: string) => boolean;
  isPremiumTopic: (topicId: string) => boolean;
  canUseTopic: (topicId: string) => boolean;
  isPremiumSubtopic: (subtopicId: string) => boolean;
  canUseSubtopic: (subtopicId: string) => boolean;
  isPremiumLesson: (subtopicId: string) => boolean;
  canUseLesson: (topicId: string, subtopicId: string) => boolean;
  refresh: () => Promise<void>;
};

export const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);
