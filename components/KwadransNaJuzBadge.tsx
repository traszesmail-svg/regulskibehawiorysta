// handoff/components/KwadransNaJuzBadge.tsx
// Badge "Kwadrans na już" — używaj WSZÄDZIE gdzie wspomniana jest ta opcja
// Strony: /, /book, /cennik, /psy, /koty

import { Icon } from '@/components/icons-config';
import { PUBLIC_OFFER_PRICE_LABELS } from '@/lib/public-offer-copy';

interface KwadransNaJuzBadgeProps {
  variant?: 'inline' | 'box';
  showPrice?: boolean;
}

export function KwadransNaJuzBadge({ variant = 'box', showPrice = true }: KwadransNaJuzBadgeProps) {
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1.5 text-accent-dark font-semibold">
        <Icon name="zap" size={16} className="text-accent" strokeWidth={3} />
        Zapytaj teraz{showPrice && ` · ${PUBLIC_OFFER_PRICE_LABELS.urgent}`}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-accent-light border-l-4 border-accent rounded-r-lg px-4 py-3.5 max-w-xl">
      <Icon name="zap" size={20} className="text-accent shrink-0" strokeWidth={3} />
      <span className="text-sm text-accent-dark">
        <strong>Zapytaj teraz</strong> — najbliższy realny termin przy włączonej dostępności
        {showPrice && <span className="opacity-80"> · {PUBLIC_OFFER_PRICE_LABELS.urgent}</span>}
      </span>
    </div>
  );
}

