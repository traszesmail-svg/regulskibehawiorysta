import { renderOgImage, OG_IMAGE_SIZE } from '@/lib/og-image'

export const runtime = 'edge'
export const size = OG_IMAGE_SIZE
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return renderOgImage({
    title: 'Rezerwacja: Zapytaj behawiorystę',
    subtitle: 'Wybierz gatunek, temat i przejdź do spokojnej rezerwacji online.',
  })
}
