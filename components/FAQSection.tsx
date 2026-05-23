// handoff/components/FAQSection.tsx
// Sekcja FAQ — każde pytanie z dopasowaną ikoną Lucide
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
    question: 'Czym różni się Kwadrans 69 zł od Kwadransu na już 99 zł?',
    answer: 'Forma rozmowy jest taka sama. Przy 99 zł otrzymujesz priorytet i możliwie szybki termin.',
  },
  {
    icon: 'clock',
    question: 'Kiedy wybrać Dwa kwadranse?',
    answer: 'Gdy 15 minut to za mało, temat ma kilka wątków lub chcesz spokojnie uporządkować sytuację.',
  },
  {
    icon: 'clipboard-list',
    question: 'Co obejmuje Pełna konsultacja 470 zł?',
    answer: 'Około 2h online, analizę zachowania, prawdopodobną przyczynę problemu, plan działania i 7 dni wsparcia przez WhatsApp.',
  },
  {
    icon: 'lightbulb',
    question: 'Co jeśli nie wiem, od czego zacząć?',
    answer: 'Najprostszy start to Kwadrans 69 zł albo materiał PDF. Po krótkim opisie sytuacji wybierzemy najrozsądniejszy krok na ten moment.',
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
