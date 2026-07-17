'use client'

import { useEffect, useRef } from 'react'
import { trackCaseMapPrivateAnalyticsEvent } from '@/lib/case-map-analytics'
import { readCaseMapBookingHandoff } from '@/lib/case-map-booking-handoff'
import type { BookingServiceType } from '@/lib/booking-services'
import type { BookingSpecies } from '@/lib/booking-routing'
import type { ProblemType } from '@/lib/types'

type CaseMapBookingAnalyticsProps = {
  problemType: ProblemType
  serviceType: BookingServiceType
  species: BookingSpecies
}

/** Marks a real arrival at the booking calendar, not merely an intent click. */
export function CaseMapBookingAnalytics({ problemType, serviceType, species }: CaseMapBookingAnalyticsProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (trackedRef.current) return

    const handoff = readCaseMapBookingHandoff({ problemType, serviceType, species })
    if (!handoff) return

    trackedRef.current = true
    trackCaseMapPrivateAnalyticsEvent('case_map_booking_started', {
      service_key: handoff.serviceType,
      entry_source: 'case_map',
    })
  }, [problemType, serviceType, species])

  return null
}
