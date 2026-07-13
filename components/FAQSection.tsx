// handoff/components/FAQSection.tsx
// Sekcja FAQ â€” kaĹĽde pytanie z dopasowanÄ… ikonÄ… Lucide
// Strony: /, /faq

import { Icon, type IconName } from '@/components/icons-config';

interface FAQ {
  icon: IconName;
  question: string;
  answer: string;
}

const defaultFAQs: FAQ[] = [
  {
    icon: 'help-circle',
    question: 'Czym rĂłĹĽni siÄ™ Kwadrans 69 zĹ‚ od Kwadransu na juĹĽ 99 zĹ‚?',
    answer: 'Forma rozmowy jest taka sama. Przy 99 zĹ‚ otrzymujesz priorytet i moĹĽliwie szybki termin.',
  },
  {
    icon: 'clock',
    question: 'Kiedy wybraÄ‡ Dwa kwadranse?',
    answer: 'Gdy 15 minut to za maĹ‚o, temat ma kilka wÄ…tkĂłw lub chcesz spokojnie uporzÄ…dkowaÄ‡ sytuacjÄ™.',
  },
  {
    icon: 'clipboard-list',
    question: 'Co obejmuje PeĹ‚na konsultacja 470 zĹ‚?',
    answer: 'OkoĹ‚o 2h online, analizÄ™ zachowania, prawdopodobnÄ… przyczynÄ™ problemu, plan dziaĹ‚ania i 14 dni komunikacji w pokoju klienta.',
  },
  {
    icon: 'lightbulb',
    question: 'Co jeĹ›li nie wiem, od czego zaczÄ…Ä‡?',
    answer: 'Najprostszy start to Kwadrans 69 zĹ‚ albo materiaĹ‚ PDF. Po krĂłtkim opisie sytuacji wybierzemy najrozsÄ…dniejszy krok na ten moment.',
  },
];

export function FAQSection({ items = defaultFAQs }: { items?: FAQ[] }) {
  return (
    <section className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      {items.map((f, i) => (
        <div
          key={i}
          className={`flex items-start gap-4 p-7 ${i < items.length - 1 ? 'border-b border-neutral-200' : ''}`}
        >
          <div className="w-10 h-10 rounded-full bg-accent-light text-accent flex items-center justify-center shrink-0">
            <Icon name={f.icon} size={20} />
          </div>
          <div>
            <h4 className="font-semibold mb-1.5">{f.question}</h4>
            <p className="text-sm text-neutral-600 leading-relaxed">{f.answer}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

