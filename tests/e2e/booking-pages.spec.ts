import { expect, test } from '@playwright/test'
import { login, navigateToPackage, ORG_SLUG } from '../../../app/tests/e2e/helpers'

test.describe('Calendar Slots — Booking Pages', () => {
    test.beforeEach(async ({ page }) => {
        await login(page)
        await navigateToPackage(page, 'calendar-slots', {
            waitFor: page.getByText('Booking Pages'),
        })
    })

    test('list screen renders seeded demo page', async ({ page }) => {
        await expect(page.getByText('Demo Booking Page')).toBeVisible()
        await expect(page.getByText('Active')).toBeVisible()
    })

    test('new page button is visible', async ({ page }) => {
        await expect(page.getByText('New Page')).toBeVisible()
    })

    test('booking URL is displayed for the demo page', async ({ page }) => {
        await expect(page.getByText(new RegExp(`/p/calendar-slots/${ORG_SLUG}/demo`))).toBeVisible()
    })
})
