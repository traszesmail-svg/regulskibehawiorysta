import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { AdminPageShell } from '@/components/AdminPageShell'
import { AdminPromoCodeGenerator } from '@/components/AdminPromoCodeGenerator'
import { formatDateLabel } from '@/lib/data'
import { listPromoCampaigns } from '@/lib/server/promo-codes'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function formatDateTime(value: string | null) {
  if (!value) {
    return 'bez daty'
  }

  return `${formatDateLabel(value.slice(0, 10))}, ${value.slice(11, 16)}`
}

export default async function AdminPromoCodesPage() {
  noStore()
  let campaigns: Awaited<ReturnType<typeof listPromoCampaigns>> = []
  let dataError: string | null = null

  try {
    campaigns = await listPromoCampaigns()
  } catch (error) {
    dataError = error instanceof Error ? error.message : 'Nie udało się wczytać kampanii.'
  }

  return (
    <AdminPageShell
      eyebrow="Promocje dla lecznic"
      title="Kody na Kwadrans z behawiorystą"
      actions={
        <>
          <Link href="/admin" className="button button-ghost">
            Panel admina
          </Link>
          <Link href="/payment" className="button button-primary">
            Podgląd płatności
          </Link>
        </>
      }
    >
      <div className="summary-grid top-gap">
        <div className="summary-card">
          <div className="stat-label">Kampanie</div>
          <div className="summary-value">{campaigns.length}</div>
        </div>
        <div className="summary-card">
          <div className="stat-label">Wolne kody</div>
          <div className="summary-value">{campaigns.reduce((sum, campaign) => sum + campaign.activeCount, 0)}</div>
        </div>
        <div className="summary-card">
          <div className="stat-label">Użyte kody</div>
          <div className="summary-value">{campaigns.reduce((sum, campaign) => sum + campaign.usedCount, 0)}</div>
        </div>
      </div>

      <div className="top-gap">
        <div className="section-eyebrow">Generator</div>
        <h2>Nowa pula kodów</h2>
        <AdminPromoCodeGenerator />
      </div>

      <div className="top-gap">
        <div className="section-eyebrow">Historia</div>
        <h2>Pule kodów</h2>

        {dataError ? <div className="error-box">{dataError}</div> : null}

        {campaigns.length === 0 ? (
          <div className="empty-box">Nie ma jeszcze wygenerowanych kodów promocyjnych.</div>
        ) : (
          <div className="booking-list">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="booking-row" data-promo-campaign-id={campaign.id}>
                <div>
                  <div className="booking-title">{campaign.clinicName}</div>
                  <div className="booking-meta">Status: {campaign.status}</div>
                  <div className="booking-meta">Ważne do: {formatDateTime(campaign.expiresAt)}</div>
                </div>
                <div className="booking-description">
                  <div className="summary-grid promo-code-stats">
                    <div className="summary-card">
                      <div className="stat-label">Wygenerowane</div>
                      <div className="summary-value">{campaign.generatedCount}</div>
                    </div>
                    <div className="summary-card">
                      <div className="stat-label">Wolne</div>
                      <div className="summary-value">{campaign.activeCount}</div>
                    </div>
                    <div className="summary-card">
                      <div className="stat-label">Użyte</div>
                      <div className="summary-value">{campaign.usedCount}</div>
                    </div>
                  </div>
                  <div className="promo-code-chip-row">
                    {campaign.codes.map((code) => (
                      <span key={code.id} className={`promo-code-chip promo-code-chip--${code.status}`}>
                        {code.codeLabel} / {code.usageCount}/{code.usageLimit}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="booking-actions">
                  <span className={`status-pill ${campaign.activeCount > 0 ? 'status-paid' : 'status-pending'}`}>
                    {campaign.activeCount > 0 ? 'aktywna pula' : 'brak wolnych'}
                  </span>
                  {campaign.lastUsedAt ? <span className="booking-meta">Ostatnio: {formatDateTime(campaign.lastUsedAt)}</span> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPageShell>
  )
}
