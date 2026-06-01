import type { ReactNode } from 'react'
import { BookingPageDialog } from './components/BookingPageDialog'

export default function CalendarSlotsProvider({ children }: { children: ReactNode }) {
    return (
        <>
            {children}
            <BookingPageDialog />
        </>
    )
}
