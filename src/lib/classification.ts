// Rule-based breakdown classification engine.
//
// Five supported categories:
//   1. Mechanical   2. Tyre   3. Accident   4. Fuel   5. Electrical
//
// Classification uses configurable keyword sets. When multiple categories match,
// a deterministic priority rule picks one. When no category matches, the report
// is flagged for manual review rather than being forced into an arbitrary category.

export type Category = 'Mechanical' | 'Tyre' | 'Accident' | 'Fuel' | 'Electrical';

export interface ClassificationResult {
  category: Category | null;
  manualReview: boolean;
  matchedCategories: Category[];
  matchedKeywords: string[];
  reason: string;
}

// Configurable keyword map. Each keyword maps to a category.
// Order of categories here defines the deterministic tie-break priority.
const KEYWORD_MAP: Array<{ category: Category; keywords: string[] }> = [
  {
    category: 'Accident',
    keywords: [
      'collision', 'crash', 'accident', 'hit', 'rammed', 'smashed',
      'struck', 'side-swipe', 'rear-ended', 'overturned',
    ],
  },
  {
    category: 'Mechanical',
    keywords: [
      'engine', 'brake', 'gearbox', 'transmission', 'clutch', 'radiator',
      'overheating', 'mechanical', 'steering', 'suspension', 'exhaust',
      'motor', 'coolant leak', 'belt',
    ],
  },
  {
    category: 'Tyre',
    keywords: [
      'tyre', 'tire', 'puncture', 'flat', 'blowout', 'wheel burst',
      'tread', 'sidewall',
    ],
  },
  {
    category: 'Fuel',
    keywords: [
      'fuel', 'diesel', 'petrol', 'gas', 'empty tank', 'shortage',
      'out of fuel', 'refuel', 'leak in tank',
    ],
  },
  {
    category: 'Electrical',
    keywords: [
      'battery', 'electrical', 'wiring', 'alternator', 'starter',
      'headlight', 'fuse', 'short circuit', 'spark', 'ignition',
      'lights not working', 'dashboard dead',
    ],
  },
];

export const CATEGORY_PRIORITY: Category[] = [
  'Accident',
  'Mechanical',
  'Tyre',
  'Fuel',
  'Electrical',
];

export const ALL_CATEGORIES: Category[] = [
  'Mechanical', 'Tyre', 'Accident', 'Fuel', 'Electrical',
];

export function classifyBreakdown(description: string): ClassificationResult {
  const text = description.toLowerCase();
  const matched: Array<{ category: Category; keyword: string }> = [];

  for (const { category, keywords } of KEYWORD_MAP) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        matched.push({ category, keyword: kw });
      }
    }
  }

  if (matched.length === 0) {
    return {
      category: null,
      manualReview: true,
      matchedCategories: [],
      matchedKeywords: [],
      reason:
        'No known breakdown keywords matched. Report queued for manual review and category correction.',
    };
  }

  const matchedCategories = Array.from(new Set(matched.map((m) => m.category)));
  const matchedKeywords = matched.map((m) => m.keyword);

  // Deterministic tie-break: use CATEGORY_PRIORITY order.
  // Accident > Mechanical > Tyre > Fuel > Electrical.
  let winner: Category = matchedCategories[0];
  for (const cat of CATEGORY_PRIORITY) {
    if (matchedCategories.includes(cat)) {
      winner = cat;
      break;
    }
  }

  const reason =
    matchedCategories.length > 1
      ? `Multiple categories matched (${matchedCategories.join(', ')}). Selected "${winner}" per deterministic priority rule (Accident > Mechanical > Tyre > Fuel > Electrical).`
      : `Matched category "${winner}" via keyword(s): ${matchedKeywords.join(', ')}.`;

  return {
    category: winner,
    manualReview: false,
    matchedCategories,
    matchedKeywords,
    reason,
  };
}
