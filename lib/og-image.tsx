import { ImageResponse } from 'next/og'

export const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
}

type OgImageInput = {
  title: string
  subtitle: string
}

export function renderOgImage({ title, subtitle }: OgImageInput) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          background:
            'radial-gradient(circle at top left, rgba(192,125,58,0.18), transparent 34%), linear-gradient(135deg, #faf8f4 0%, #f3ede3 55%, #efe7db 100%)',
          color: '#201816',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'sans-serif',
            fontSize: 24,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#7a6758',
          }}
        >
          <div>regulskibehawiorysta.pl</div>
          <div>Regulski</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: '86%' }}>
          <div
            style={{
              width: 160,
              height: 8,
              borderRadius: 999,
              background: '#c07d3a',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontFamily: 'serif',
              fontSize: 68,
              lineHeight: 1.06,
              fontWeight: 700,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'sans-serif',
              fontSize: 28,
              lineHeight: 1.35,
              color: '#5f5046',
              maxWidth: '90%',
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontFamily: 'sans-serif',
              fontSize: 22,
              color: '#6d5a4d',
            }}
          >
            <div>Behawiorysta psów i kotów online</div>
            <div>Zapytaj behawiorystę / pełna konsultacja / blog</div>
          </div>
          <div
            style={{
              width: 168,
              height: 168,
              borderRadius: 999,
              border: '2px solid rgba(192,125,58,0.35)',
              background:
                'radial-gradient(circle at 35% 35%, rgba(192,125,58,0.22), rgba(192,125,58,0.06) 56%, transparent 57%)',
            }}
          />
        </div>
      </div>
    ),
    OG_IMAGE_SIZE,
  )
}
