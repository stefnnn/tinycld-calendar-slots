import { describe, expect, it } from 'vitest'
import manifest from '../manifest'

describe('calendar-slots manifest', () => {
    it('declares required identifiers', () => {
        expect(manifest.name).toBe('Calendar Slots')
        expect(manifest.slug).toBe('calendar-slots')
        expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/)
    })

    it('has a description', () => {
        expect(manifest.description).toBe('Let users book a slot on your calendar')
    })

    // The bookings collection relates into calendar's pbc_cal_calendars_01, so the
    // create migration only succeeds with calendar installed. These declarations
    // make that requirement explicit: `dependencies` orders seeds after calendar;
    // `peerVersions` is the enforced range the compat solver gates installs on.
    it('depends on the calendar package', () => {
        expect(manifest.dependencies).toContain('calendar')
        expect(manifest.peerVersions).toMatchObject({ calendar: expect.any(String) })
    })
})
