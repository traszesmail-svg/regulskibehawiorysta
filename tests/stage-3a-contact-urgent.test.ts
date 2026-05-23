import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

function readSource(...segments: string[]) {
  return readFileSync(path.join(process.cwd(), ...segments), 'utf8')
}

test('stage 3a keeps contact and urgent species selection neutral and in sync with shared topic catalogs', () => {
  const contactSource = readSource('components', 'ContactLeadForm.tsx')
  const urgentSource = readSource('app', 'urgent', 'UrgentForm.tsx')

  assert.match(contactSource, /createInitialForm\(presetSpecies \?\? ''\)/)
  assert.match(contactSource, /const topicOptions = useMemo\(\(\) => \(form\.species \? getProblemOptionsForSpecies\(form\.species\) : \[\]\), \[form\.species\]\)/)
  assert.match(contactSource, /<option value="">Wybierz gatunek<\/option>/)
  assert.match(contactSource, /disabled=\{!form\.species\}/)
  assert.match(contactSource, /Wybierz, czy sprawa dotyczy psa czy kota\./)

  assert.match(urgentSource, /import \{ getProblemOptionsForSpecies, getPublicProblemOptionById, type FunnelSpecies \} from '@\/lib\/funnel'/)
  assert.doesNotMatch(urgentSource, /const DOG_TOPICS =/)
  assert.doesNotMatch(urgentSource, /const CAT_TOPICS =/)
  assert.match(urgentSource, /const topics = species \? getProblemOptionsForSpecies\(species\) : \[\]/)
  assert.match(urgentSource, /<option value="">Wybierz gatunek<\/option>/)
  assert.match(urgentSource, /<option value="">\{species \? 'Wybierz temat' : 'Najpierw wybierz gatunek'\}<\/option>/)
  assert.match(urgentSource, /disabled=\{!species\}/)
  assert.match(urgentSource, /Odpowiem priorytetowo/)
  assert.doesNotMatch(urgentSource, /OdpiszÄ™|wyslÄ™|â€”/)
})
