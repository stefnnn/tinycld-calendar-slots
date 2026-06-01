import { describe, expect, it, beforeEach } from 'vitest'
import { useBookingPageDialogStore } from '../tinycld/calendar-slots/stores/booking-page-dialog-store'

describe('useBookingPageDialogStore', () => {
    beforeEach(() => {
        useBookingPageDialogStore.setState({ isOpen: false, pageId: null })
    })

    it('starts closed with no pageId', () => {
        const state = useBookingPageDialogStore.getState()
        expect(state.isOpen).toBe(false)
        expect(state.pageId).toBeNull()
    })

    it('open() sets isOpen to true', () => {
        useBookingPageDialogStore.getState().open()
        const state = useBookingPageDialogStore.getState()
        expect(state.isOpen).toBe(true)
        expect(state.pageId).toBeNull()
    })

    it('open(pageId) sets isOpen and pageId', () => {
        useBookingPageDialogStore.getState().open('abc123')
        const state = useBookingPageDialogStore.getState()
        expect(state.isOpen).toBe(true)
        expect(state.pageId).toBe('abc123')
    })

    it('close() resets isOpen and pageId', () => {
        useBookingPageDialogStore.getState().open('abc123')
        useBookingPageDialogStore.getState().close()
        const state = useBookingPageDialogStore.getState()
        expect(state.isOpen).toBe(false)
        expect(state.pageId).toBeNull()
    })

    it('setPageId() updates pageId without changing isOpen', () => {
        useBookingPageDialogStore.getState().setPageId('xyz789')
        const state = useBookingPageDialogStore.getState()
        expect(state.isOpen).toBe(false)
        expect(state.pageId).toBe('xyz789')
    })
})
