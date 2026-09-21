import analytics from './locales/fr/analytics.json';
import categories from './locales/fr/categories.json';
import common from './locales/fr/common.json';
import settings from './locales/fr/settings.json';
import focus from './locales/fr/focus.json';
import expenses from './locales/fr/expenses.json';

export const defaultNS = 'common';

export const resources = {
  fr: { common, categories, expenses, analytics, settings, focus },
} as const;
