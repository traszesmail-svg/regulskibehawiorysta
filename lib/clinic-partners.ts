export type ClinicPartner = {
  slug: string
  name: string
  logoSrc: string
  logoAlt: string
  website?: string
}

// Dodajemy wyłącznie lecznice, które zaakceptowały publikację nazwy i logotypu.
export const CLINIC_PARTNERS: ClinicPartner[] = []