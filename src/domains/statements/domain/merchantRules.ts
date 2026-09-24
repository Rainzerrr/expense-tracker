import type { CategoryId, SubcategoryId } from '@/domains/categorization';
import { normalizeSearchText } from '@/domains/expenses';
import type { IsoInstant } from '@/shared/lib/time';

/** Ce que l'utilisateur a décidé pour un commerçant : elle prime sur les règles livrées. */
export interface MerchantRule {
  /** Le commerçant normalisé (voir `merchantKey`). */
  id: string;
  categoryId: CategoryId | null;
  subcategoryId: SubcategoryId | null;
  /** Ne jamais importer ce commerçant. */
  ignore: boolean;
  updatedAt: IsoInstant;
  deletedAt: IsoInstant | null;
}

/** Ce que l'import propose pour un commerçant. `source` dit d'où vient la proposition. */
export interface Classification {
  categoryId: CategoryId | null;
  subcategoryId: SubcategoryId | null;
  ignore: boolean;
  source: 'user' | 'default' | 'unknown';
}

/** « Alwaha  Market » et « ALWAHA MARKET » sont le même commerçant. */
export const merchantKey = (description: string) => normalizeSearchText(description);

const UNKNOWN: Classification = {
  categoryId: null,
  subcategoryId: null,
  ignore: false,
  source: 'unknown',
};

// Règles livrées : des enseignes courantes au Portugal et en France, dans les catégories par défaut.
// Chaque entrée : mots-clés (début de mot, sans accents) → « catégorie.sous-catégorie » (ou « catégorie »).
// Volontairement prudentes : un commerçant ambigu reste « à classer » plutôt qu'être mal classé en silence.
const DEFAULT_RULES: readonly (readonly [keywords: readonly string[], target: string])[] = [
  [
    [
      'continente',
      'pingo doce',
      'lidl',
      'auchan',
      'primaprix',
      'minipreco',
      'mini preco',
      'intermarche',
      'carrefour',
      'mercadona',
      'aldi',
      'supermercado',
      'mercearia',
      'mini mercado',
      'halal',
      'alwaha',
    ],
    'groceries.staples',
  ],
  [['padaria', 'boulangerie'], 'groceries.bakery'],
  [
    [
      'gelato',
      'gelateria',
      'gelat',
      'pastel',
      'pasteis',
      'pastelaria',
      'cafe',
      'coffee',
      'starbucks',
      'esplanada',
    ],
    'activities.cafes',
  ],
  [
    [
      'restaurant',
      'restaurante',
      'kebab',
      'pizz',
      'burger',
      'mcdonald',
      'kfc',
      'sushi',
      'grill',
      'tasca',
      'cantina',
      'bistro',
      'brasserie',
      'taberna',
      'churrasq',
    ],
    'activities.restaurants',
  ],
  [['telecabine', 'teleferico', 'cruzeiro'], 'activities.excursions'],
  [
    [
      'headout',
      'getyourguide',
      'viator',
      'museu',
      'museum',
      'castelo',
      'palacio',
      'quinta da regaleira',
    ],
    'activities.culture',
  ],
  [
    ['metro de lisboa', 'metropolitano', 'carris', 'viva viagem', 'transtejo', 'soflusa'],
    'transport.singleTickets',
  ],
  [['navegante'], 'transport.navegante'],
  [['uber', 'bolt', 'freenow', 'free now', 'cabify'], 'transport.rideshare'],
  [['comboios', 'flixbus', 'blablacar'], 'transport.train'],
  [['ryanair', 'easyjet', 'vueling', 'transavia', 'tap air'], 'travel.flights'],
  [['airbnb', 'booking.com', 'hostel', 'hotel'], 'travel.lodging'],
  [
    ['anthropic', 'openai', 'chatgpt', 'github', 'notion', 'apple.com/bill', 'icloud'],
    'subscriptions.apps',
  ],
  [['spotify', 'netflix', 'disney', 'youtube', 'hbo', 'deezer'], 'subscriptions.streaming'],
  [['vodafone', 'nowo', 'meo ', 'nos comunicacoes'], 'subscriptions.phone'],
  [['farmacia', 'pharmacie', 'pharmacy'], 'health.pharmacy'],
  [['clinica', 'hospital', 'dentista', 'medico'], 'health.doctor'],
  [['zara', 'h&m', 'primark', 'bershka', 'pull&bear', 'pull and bear'], 'shopping.clothes'],
  [['fnac', 'worten', 'apple store'], 'shopping.electronics'],
  [['amazon', 'decathlon'], 'shopping.other'],
  [['ikea', 'leroy merlin', 'aki '], 'housing.homeEquipment'],
];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startsAWord = (key: string, keyword: string) =>
  new RegExp(`(^|[^a-z0-9])${escape(keyword)}`).test(key);

/**
 * Propose une catégorie pour un commerçant : d'abord ce que l'utilisateur a déjà décidé,
 * puis les règles livrées, sinon « inconnu » (l'utilisateur choisira une fois, et l'app retiendra).
 */
export function classifyMerchant(key: string, userRules: readonly MerchantRule[]): Classification {
  const learned = userRules.find((rule) => rule.id === key && rule.deletedAt === null);
  if (learned) {
    return {
      categoryId: learned.categoryId,
      subcategoryId: learned.subcategoryId,
      ignore: learned.ignore,
      source: 'user',
    };
  }

  for (const [keywords, target] of DEFAULT_RULES) {
    if (keywords.some((keyword) => startsAWord(key, keyword))) {
      const [category] = target.split('.');
      return {
        categoryId: category as CategoryId,
        subcategoryId: target.includes('.') ? (target as SubcategoryId) : null,
        ignore: false,
        source: 'default',
      };
    }
  }
  return UNKNOWN;
}

/** Deux propositions identiques ? Sert à ne retenir une règle que si l'utilisateur a changé d'avis. */
export const sameClassification = (
  a: Pick<Classification, 'categoryId' | 'subcategoryId' | 'ignore'>,
  b: Pick<Classification, 'categoryId' | 'subcategoryId' | 'ignore'>,
) => a.ignore === b.ignore && a.categoryId === b.categoryId && a.subcategoryId === b.subcategoryId;
