// handoff-7/components/LeadMagnetForm.tsx
// Wspólny formularz email + RODO consent
// Używany w popup, banner, section

'use client';

import { useState, FormEvent } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface LeadMagnetFormProps {
  magnetId: string;
  source: 'popup' | 'banner' | 'section';
  onSuccess?: () => void;
  layout?: 'horizontal' | 'vertical';
}

export function LeadMagnetForm({ magnetId, source, onSuccess, layout = 'vertical' }: LeadMagnetFormProps) {
  const [email, setEmail] = useState('');
  const [consentGdpr, setConsentGdpr] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consentGdpr) {
      setErrorMsg('Wyrażenie zgody jest wymagane');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/lead-magnet-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          magnetId,
          source,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Coś poszło nie tak');
      }

      setStatus('success');
      try { localStorage.setItem('regulski-lm-submitted', String(Date.now())); } catch {}
      onSuccess?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Błąd');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-light border border-accent/30">
        <CheckCircle className="text-accent shrink-0 mt-0.5" size={20} />
        <div>
          <p className="font-semibold text-ink">Sprawdź skrzynkę 📬</p>
          <p className="text-sm text-muted mt-1">
            Wysłałem PDF na <strong>{email}</strong>. Jeśli nie widzisz — sprawdź spam.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={layout === 'horizontal' ? 'flex gap-2' : 'space-y-2'}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="twoj@email.pl"
          disabled={status === 'loading'}
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-ink placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === 'loading' || !consentGdpr}
          className="px-6 py-3 rounded-xl bg-accent text-accent-fg font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
        >
          {status === 'loading' ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            'Chcę dostać PDF i zacząć spokojnie'
          )}
        </button>
      </div>

      <label className="flex items-start gap-2.5 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={consentGdpr}
          onChange={(e) => setConsentGdpr(e.target.checked)}
          required
          className="mt-0.5 accent-accent shrink-0"
        />
        <span>
          Wyrażam zgodę na przetwarzanie mojego adresu email w celu wysłania PDF.{' '}
          <a href="/polityka-prywatnosci" className="underline hover:text-accent">Polityka prywatności</a>
        </span>
      </label>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
          <AlertCircle size={14} />
          {errorMsg}
        </div>
      )}
    </form>
  );
}
