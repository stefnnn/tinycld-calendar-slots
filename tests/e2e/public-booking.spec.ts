import { expect, test } from '@playwright/test'
import { ORG_SLUG } from '@tinycld/core/e2e-helpers'

test.describe('Calendar Slots — Public Booking Page', () => {
    test('renders page name and slot types', async ({ page }) => {
        await page.goto(`/p/calendar-slots/${ORG_SLUG}/demo`)
        await expect(page.getByText('Demo Booking Page')).toBeVisible()
        await expect(page.getByText('Quick Chat')).toBeVisible()
        await expect(page.getByText('Meeting')).toBeVisible()
        await expect(page.getByText('Deep Dive')).toBeVisible()
    })

    test('renders available time slots', async ({ page }) => {
        await page.goto(`/p/calendar-slots/${ORG_SLUG}/demo`)
        await expect(page.getByText('SELECT A TIME')).toBeVisible()
        await expect(page.getByText(/\d{1,2}:\d{2} (AM|PM)/).first()).toBeVisible()
    })

    test('selecting a slot shows the booking form', async ({ page }) => {
        await page.goto(`/p/calendar-slots/${ORG_SLUG}/demo`)
        await page
            .getByText(/\d{1,2}:\d{2} (AM|PM)/)
            .first()
            .click()
        await expect(page.getByText('Enter your details')).toBeVisible()
        await expect(page.getByPlaceholder('Your name')).toBeVisible()
        await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
        await expect(page.getByText('Confirm Booking')).toBeVisible()
    })
})
