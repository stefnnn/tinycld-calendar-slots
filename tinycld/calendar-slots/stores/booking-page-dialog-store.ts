import { create } from '@tinycld/core/lib/store'

interface BookingPageDialogState {
    isOpen: boolean
    pageId: string | null
    open: (pageId?: string | null) => void
    close: () => void
    setPageId: (pageId: string) => void
}

export const useBookingPageDialogStore = create<BookingPageDialogState>()(set => ({
    isOpen: false,
    pageId: null,
    open: (pageId = null) => set({ isOpen: true, pageId }),
    close: () => set({ isOpen: false, pageId: null }),
    setPageId: pageId => set({ pageId }),
}))
