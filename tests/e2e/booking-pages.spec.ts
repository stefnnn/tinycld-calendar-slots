import { expect, test } from '@playwright/test'
import { login, navigateToPackage, ORG_SLUG } from '../../../app/tests/e2e/helpers'

// calendar-slots has no rail entry of its own: booking pages are managed
// through a contribution in the calendar package's sidebar, which opens the
// BookingPageDialog. These specs drive that integrated flow.
test.describe('Calendar Slots — Booking Pages', () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
        await navigateToPackage(page, 'calendar', {
            waitFor: page.getByTestId('package-sidebar-mounted'),
        })
        await page.getByTestId('booking-pages-sidebar').waitFor({ state: 'visible' })
    })

    test('calendar sidebar lists the seeded demo page', async ({ page }) => {
        await expect(page.getByText('Demo Booking Page')).toBeVisible()
        await expect(page.getByText('New booking page')).toBeVisible()
    })

    test('opening the demo page shows its editor dialog', async ({ page }) => {
        await page.getByText('Demo Booking Page').click()
        // The dialog renders the public booking URL and the appointment-types
        // section — neither appears in the sidebar contribution, so they
        // confirm the editor opened on the existing page.
        await expect(page.getByText(new RegExp(`/p/calendar-slots/${ORG_SLUG}/demo`))).toBeVisible()
        await expect(page.getByText('Appointment Types')).toBeVisible()
    })
})
