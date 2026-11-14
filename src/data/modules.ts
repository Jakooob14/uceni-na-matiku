import type { ModuleDefinition } from '#/types/app'

export const MATH_MODULES: ModuleDefinition[] = [
  {
    id: 'elementarni-funkce',
    title: 'Elementární funkce',
    shortTitle: 'Elementární funkce',
    description:
      'Poznávačka grafů, předpisů, názvů a vlastností základních elementárních funkcí (mocninné, exponenciální, logaritmické, goniometrické, cyklometrické a hyperbolické).',
    topics: [
      'Rozpoznání grafu a předpisu',
      'Definiční obor a obor hodnot',
      'Parita, monotonie a omezenost',
      'Asymptoty a význačné body',
    ],
    status: 'active',
    route: '/elementarni-funkce',
    accentColor: 'indigo',
  },
  {
    id: 'matematicka-logika',
    title: 'Matematická logika',
    shortTitle: 'Logika',
    description:
      'Výroky a logické spojky, pravdivostní tabulky, negace složených výroků, ekvivalence a kvantifikátory.',
    topics: [
      'Implikace a ekvivalence',
      'De Morganovy zákony',
      'Obecné a existenční kvantifikátory',
      'Tautologie a spory',
    ],
    status: 'planned',
    route: '/pripravujeme/matematicka-logika',
    accentColor: 'emerald',
  },
  {
    id: 'matice',
    title: 'Matice',
    shortTitle: 'Matice',
    description:
      'Základní pojmy, typy matic (jednotková, diagonální, trojúhelníková, symetrická), transpozice a elementární úpravy.',
    topics: [
      'Typy a rozměry matic',
      'Transpozice matice',
      'Odstupňovaný tvar matice',
      'Gaussova eliminační metoda',
    ],
    status: 'planned',
    route: '/pripravujeme/matice',
    accentColor: 'amber',
  },
  {
    id: 'maticova-algebra',
    title: 'Maticová algebra',
    shortTitle: 'Maticová algebra',
    description:
      'Sčítání, násobení matic, inverzní matice, hodnost matice a řešení soustav lineárních rovnic.',
    topics: [
      'Násobení matic a jeho vlastnosti',
      'Inverzní matice',
      'Hodnost matice',
      'Frobeniova věta',
    ],
    status: 'planned',
    route: '/pripravujeme/maticova-algebra',
    accentColor: 'cyan',
  },
  {
    id: 'determinant-matic',
    title: 'Determinant matic',
    shortTitle: 'Determinanty',
    description:
      'Výpočet determinantu 2×2 a 3×3 (Sarrusovo pravidlo), Laplaceův rozvoj, vlastnosti determinantů a Cramerovo pravidlo.',
    topics: [
      'Sarrusovo pravidlo',
      'Laplaceův rozvoj',
      'Řádkové úpravy determinantu',
      'Regularita matice',
    ],
    status: 'planned',
    route: '/pripravujeme/determinant-matic',
    accentColor: 'rose',
  },
  {
    id: 'limity-a-spojitost',
    title: 'Limity a spojitost funkcí',
    shortTitle: 'Limity',
    description:
      'Limita funkce v bodě a v nevlastních bodech, jednostranné limity, neurčité výrazy, asymptoty a klasifikace nespojitostí.',
    topics: [
      'Výpočet limit a neurčité výrazy',
      'Význačné limity (sin x / x, e)',
      'Spojitost v bodě a na intervalu',
      'Body nespojitosti 1. a 2. druhu',
    ],
    status: 'planned',
    route: '/pripravujeme/limity-a-spojitost',
    accentColor: 'violet',
  },
  {
    id: 'diferencialni-pocet',
    title: 'Diferenciální počet funkce jedné proměnné',
    shortTitle: 'Diferenciální počet',
    description:
      'Definice derivace, pravidla derivování, tečna a normála, L’Hospitalovo pravidlo, extrémy a vyšetření průběhu funkce.',
    topics: [
      'Tabulkové derivace a řetízkové pravidlo',
      'L’Hospitalovo pravidlo',
      'Monotonie a lokální extrémy',
      'Konvexnost, konkávnost a inflexní body',
    ],
    status: 'planned',
    route: '/pripravujeme/diferencialni-pocet',
    accentColor: 'orange',
  },
]
