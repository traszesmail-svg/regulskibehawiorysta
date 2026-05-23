// handoff/components/CredBadge.tsx
// Pojedynczy chip kwalifikacji — pasek w hero każdej strony
// Zastępuje stary "COAPE seal" z okręgiem

import { Icon, type IconName } from '@/components/icons-config';

interface CredBadgeProps {
  icon: IconName;
  children: React.ReactNode;
  emphasis?: boolean;  // pogrubiony, dla COAPE
}

export function CredBadge({ icon, children, emphasis = false }: CredBadgeProps) {
  return (
    <div
      className={[
        'inline-flex items-center gap-2',
        'px-3.5 py-2 rounded-full',
        'border bg-white text-sm font-medium',
        emphasis
          ? 'border-accent text-accent-dark bg-accent-light'
          : 'border-neutral-200 text-neutral-800',
      ].join(' ')}
    >
      <Icon name={icon} size={16} className={emphasis ? 'text-accent' : 'text-accent'} />
      <span>{children}</span>
    </div>
  );
}

// Pasek kwalifikacji — używaj na KAŻDEJ stronie pod nagłówkiem hero
export function TrustBar() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <CredBadge icon="award" emphasis>COAPE / CAPBT</CredBadge>
      <CredBadge icon="stethoscope">Technik weterynarii</CredBadge>
      <CredBadge icon="hand-heart">Bez kar i przymusu</CredBadge>
      <CredBadge icon="mail">Kontakt e-mail</CredBadge>
      <CredBadge icon="credit-card">Płatność po potwierdzeniu</CredBadge>
    </div>
  );
}
