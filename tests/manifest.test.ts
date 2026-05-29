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
})
