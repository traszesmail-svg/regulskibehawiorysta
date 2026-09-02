// handoff-7/components/LeadMagnetSection.tsx
// Inline sekcja z lead magnetem — wstaw na stronach (home, /psy, /koty, blog)
// Większa, bardziej widoczna niż banner

'use client';
import { BookOpen, FileText } from 'lucide-react';
import { LEAD_MAGNETS, pickLeadMagnet } from '@/lib/lead-magnet.config';
import { LeadMagnetForm } from './LeadMagnetForm';

interface LeadMagnetSectionProps {
  magnetId?: string;
  pathname?: string;
  variant?: 'card' | 'inline';
}

export function LeadMagnetSection({ magnetId, pathname = '/', variant = 'card' }: LeadMagnetSectionProps) {
  const magnet = magnetId
    ? LEAD_MAGNETS.find(m => m.id === magnetId) ?? pickLeadMagnet(pathname)
    : pickLeadMagnet(pathname);

  if (variant === 'inline') {
    // Wąska, do umieszczenia w środku artykułu
    return (
      <aside className="my-12 p-6 rounded-2xl bg-accent-light border border-accent/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <BookOpen className="text-accent-fg" size={22} />
          </div>
          <div className="flex-1">
            <p className="font-serif font-bold text-lg text-ink leading-tight">{magnet.title}</p>
            <p className="text-sm text-muted mt-1 mb-3">Darmowy {magnet.pages}-stronicowy PDF — wpisz email, wyślę Ci.</p>
            <LeadMagnetForm magnetId={magnet.id} source="section" layout="horizontal" />
          </div>
        </div>
      </aside>
    );
  }

  // Card variant — pełna sekcja na stronie
  return (
    <section className="py-16 md:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-surface rounded-3xl border border-border overflow-hidden grid md:grid-cols-2 shadow-md">

          {/* Lewa — wizual */}
          <div className="relative bg-gradient-to-br from-accent-light to-accent/15 p-8 md:p-12 flex flex-col justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-fg text-xs font-bold tracking-wide uppercase mb-4 self-start">
              <FileText size={12} />
              Darmowy PDF · {magnet.pages} stron
            </div>

            <p className="text-3xl md:text-4xl font-serif font-bold text-ink leading-tight tracking-tight">
              {magnet.title}
            </p>
            <p className="text-base text-muted mt-3">{magnet.subtitle}</p>

            <ul className="mt-6 space-y-2">
              {magnet.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <span className="text-accent shrink-0 font-bold">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prawa — formularz */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <p className="text-2xl font-serif font-bold text-ink leading-tight tracking-tight">
              Wyślę Ci na maila
            </p>
            <p className="text-sm text-muted mt-2 mb-6">
              Podaj email — dostaniesz link do PDF w 1 minutę. Bez spamu, bez sztuczek.
            </p>

            <LeadMagnetForm magnetId={magnet.id} source="section" layout="vertical" />

          </div>

        </div>
      </div>
    </section>
  );
}
