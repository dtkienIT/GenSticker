import { AnalyticsEvent } from '../types';

const events: AnalyticsEvent[] = [];

export const trackEvent = (name: string, metadata?: Record<string, unknown>) => {
  const event: AnalyticsEvent = {
    name,
    timestamp: new Date().toISOString(),
    metadata
  };
  events.push(event);
  console.log('[Analytics]', event);
};

export const getEvents = () => [...events];

export const clearEvents = () => {
  events.length = 0;
};
