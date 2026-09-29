// handoff/components/Testimonial.tsx
// Pojedyncza opinia z 5 gwiazdkami Lucide
// Używaj na stronach opinii i podsumowania usług.

import { Icon } from '@/components/icons-config';

interface TestimonialProps {
  text: string;
  author: string;
  rating?: number;
}

export function Testimonial({ text, author, rating = 5 }: TestimonialProps) {
  return (
    <article className="bg-white border border-neutral-200 rounded-2xl p-7">
      <div className="flex gap-0.5 mb-3 text-amber-400">
        {Array.from({ length: rating }).map((_, i) => (
          <Icon key={i} name="star" size={18} className="fill-current" strokeWidth={1.5} />
        ))}
      </div>
      <p className="italic text-neutral-900 text-base leading-relaxed mb-3">&bdquo;{text}&rdquo;</p>
      <p className="text-xs text-neutral-500 font-medium">— {author}</p>
    </article>
  );
}
