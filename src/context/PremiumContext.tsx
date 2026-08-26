import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/supabase';
import {
  PremiumContext,
  type PremiumEntitlement,
  type PremiumFeature,
  type PremiumLessonFlag,
  type PremiumSettings,
  type PremiumSubtopicFlag,
  type PremiumTopicFlag,
} from '@/context/premium-context';

function isCurrentlyActive(entitlement: PremiumEntitlement): boolean {
  const now = Date.now();
  return entitlement.status === 'active'
    && new Date(entitlement.starts_at).getTime() <= now
    && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > now);
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [features, setFeatures] = useState<PremiumFeature[]>([]);
  const [featuresLoaded, setFeaturesLoaded] = useState(false);
  const [topics, setTopics] = useState<PremiumTopicFlag[]>([]);
  const [subtopics, setSubtopics] = useState<PremiumSubtopicFlag[]>([]);
  const [lessonFlags, setLessonFlags] = useState<PremiumLessonFlag[]>([]);
  const [contentFlagsLoaded, setContentFlagsLoaded] = useState(false);
  const [entitlements, setEntitlements] = useState<PremiumEntitlement[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResult, featuresResult, topicsResult, subtopicsResult, lessonFlagsResult, entitlementsResult] = await Promise.all([
        supabase.from('premium_settings').select('id, is_enabled').eq('id', 'global').maybeSingle(),
        supabase.from('premium_features').select('key, is_premium'),
        supabase.from('premium_topics').select('topic_id, is_premium'),
        supabase.from('premium_subtopics').select('subtopic_id, is_premium'),
        supabase.from('premium_lessons').select('subtopic_id, is_premium'),
        user
          ? supabase.from('premium_entitlements').select('id, status, source, starts_at, expires_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
          : Promise.resolve({ data: [], error: null }),
      ]);

      setSettingsLoaded(!settingsResult.error && Boolean(settingsResult.data));
      if (!settingsResult.error && settingsResult.data) {
        setGlobalEnabled(Boolean((settingsResult.data as PremiumSettings).is_enabled));
      }
      setFeaturesLoaded(!featuresResult.error);
      if (!featuresResult.error) {
        setFeatures((featuresResult.data || []) as PremiumFeature[]);
      }
      const contentFlagsSucceeded = !topicsResult.error && !subtopicsResult.error && !lessonFlagsResult.error;
      setContentFlagsLoaded(contentFlagsSucceeded);
      if (contentFlagsSucceeded) {
        setTopics((topicsResult.data || []) as PremiumTopicFlag[]);
        setSubtopics((subtopicsResult.data || []) as PremiumSubtopicFlag[]);
        setLessonFlags((lessonFlagsResult.data || []) as PremiumLessonFlag[]);
      }
      if (!entitlementsResult.error) {
        setEntitlements((entitlementsResult.data || []) as PremiumEntitlement[]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const handle = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(handle);
  }, [refresh]);

  const hasActiveGrant = useMemo(() => entitlements.some(isCurrentlyActive), [entitlements]);
  const featureMap = useMemo(() => new Map(features.map((feature) => [feature.key, feature])), [features]);
  const topicMap = useMemo(() => new Map(topics.map((flag) => [flag.topic_id, flag])), [topics]);
  const subtopicMap = useMemo(() => new Map(subtopics.map((flag) => [flag.subtopic_id, flag])), [subtopics]);
  const lessonFlagMap = useMemo(() => new Map(lessonFlags.map((flag) => [flag.subtopic_id, flag])), [lessonFlags]);

  const canUseMarkedContent = useCallback((isPremium: boolean) => {
    if (!isPremium) return true;
    if (!settingsLoaded || !globalEnabled) return false;
    return hasActiveGrant;
  }, [globalEnabled, hasActiveGrant, settingsLoaded]);

  // Feature-level Premium is intentionally unchanged.
  const isPremiumFeature = useCallback((featureKey: string) => Boolean(featureMap.get(featureKey)?.is_premium), [featureMap]);
  const canUse = useCallback((featureKey: string) => {
    if (!featuresLoaded) return false;
    const feature = featureMap.get(featureKey);
    if (!feature) return false;
    return canUseMarkedContent(feature.is_premium);
  }, [canUseMarkedContent, featureMap, featuresLoaded]);

  const isPremiumTopic = useCallback((topicId: string) => Boolean(topicMap.get(topicId)?.is_premium), [topicMap]);
  const canUseTopic = useCallback((topicId: string) => {
    if (!contentFlagsLoaded) return false;
    return canUseMarkedContent(Boolean(topicMap.get(topicId)?.is_premium));
  }, [canUseMarkedContent, contentFlagsLoaded, topicMap]);

  const isPremiumSubtopic = useCallback((subtopicId: string) => Boolean(subtopicMap.get(subtopicId)?.is_premium), [subtopicMap]);
  const canUseSubtopic = useCallback((subtopicId: string) => {
    if (!contentFlagsLoaded) return false;
    return canUseMarkedContent(Boolean(subtopicMap.get(subtopicId)?.is_premium));
  }, [canUseMarkedContent, contentFlagsLoaded, subtopicMap]);

  const isPremiumLesson = useCallback((subtopicId: string) => Boolean(lessonFlagMap.get(subtopicId)?.is_premium), [lessonFlagMap]);
  const canUseLesson = useCallback((topicId: string, subtopicId: string) => {
    if (!contentFlagsLoaded) return false;
    return canUseTopic(topicId)
      && canUseSubtopic(subtopicId)
      && canUseMarkedContent(Boolean(lessonFlagMap.get(subtopicId)?.is_premium));
  }, [canUseMarkedContent, canUseSubtopic, canUseTopic, contentFlagsLoaded, lessonFlagMap]);

  const value = useMemo(() => ({
    loading,
    globalEnabled,
    features,
    topics,
    subtopics,
    lessonFlags,
    entitlements,
    hasActiveGrant,
    isPremiumFeature,
    canUse,
    isPremiumTopic,
    canUseTopic,
    isPremiumSubtopic,
    canUseSubtopic,
    isPremiumLesson,
    canUseLesson,
    refresh,
  }), [
    loading,
    globalEnabled,
    features,
    topics,
    subtopics,
    lessonFlags,
    entitlements,
    hasActiveGrant,
    isPremiumFeature,
    canUse,
    isPremiumTopic,
    canUseTopic,
    isPremiumSubtopic,
    canUseSubtopic,
    isPremiumLesson,
    canUseLesson,
    refresh,
  ]);

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}
