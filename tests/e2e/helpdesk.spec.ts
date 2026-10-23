import { expect, test, type Page } from '@playwright/test'

// Fail any test that logs a console error or throws in the page.
test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  ;(page as Page & { errors: string[] }).errors = errors
  await page.goto('/')
})
test.afterEach(async ({ page }) => {
  expect((page as Page & { errors: string[] }).errors).toEqual([])
})

const ask = async (page: Page, q: string) => {
  await page.getByLabel('Your question for HR').fill(q)
  await page.getByRole('button', { name: 'Send' }).click()
}
const asReviewer = (page: Page) => page.getByRole('tab', { name: /HR reviewer/ }).click()
const asEmployee = (page: Page) => page.getByRole('tab', { name: 'Employee' }).click()

test('first visit shows the demo conversation', async ({ page }, info) => {
  await expect(page.getByRole('heading', { name: 'Northgate HR Helpdesk' })).toBeVisible()
  await expect(page.getByText('✓ Reviewed by HR')).toBeVisible()
  await expect(page.getByText('HR will contact you directly about this one.')).toBeVisible()
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-employee.png`,
    fullPage: true,
  })
})

test('a question is held for review, approved, released, then shown to the employee', async ({
  page,
}, info) => {
  await ask(page, 'How long do I have to submit an expense report?')
  const mine = page.getByTestId('exchange').last()
  await expect(mine).toContainText('Your question is with HR')
  await expect(mine).not.toContainText('within 30 days') // the draft must not leak

  await asReviewer(page)
  await page.getByRole('button', { name: /How long do I have to submit an expense report/ }).click()
  await expect(
    page.locator('summary', { hasText: 'Travel and Expense Reimbursement – Submitting expenses' }),
  ).toBeVisible()
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-review.png`,
    fullPage: true,
  })
  const answer = page.getByLabel(/Answer to the employee/)
  await expect(answer).toHaveValue(/within 30 days/)
  await answer.fill('You have 30 days from the expense to submit it, with receipts over $25.')
  await page.getByRole('button', { name: 'Approve answer' }).click()
  await expect(page.getByRole('status')).toContainText('Approved')

  // Approved but unreleased: still hidden from the employee.
  await asEmployee(page)
  await expect(page.getByTestId('exchange').last()).toContainText('Your question is with HR')

  await asReviewer(page)
  await page.getByRole('tab', { name: /Approved/ }).click()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: /Release 2 approved answers/ }).click()
  await expect(page.getByRole('status')).toContainText('2 answers released')

  await asEmployee(page)
  await expect(page.getByTestId('exchange').last()).toContainText(
    'You have 30 days from the expense',
  )
  await expect(page.getByTestId('exchange').last()).toContainText('Reviewed by HR')
})

test('a high-risk answer cannot be approved without the legal confirmation', async ({ page }) => {
  await asReviewer(page)
  await page.getByRole('button', { name: /I am pregnant/ }).click()
  await expect(page.getByText('High-risk topic: check against current law')).toBeVisible()
  await page.getByRole('button', { name: 'Approve answer' }).click()
  await expect(page.getByRole('alert')).toContainText('Confirm you checked the answer')
  await page.getByLabel(/I checked this answer against current employment law/).check()
  await page.getByRole('button', { name: 'Approve answer' }).click()
  await expect(page.getByRole('status')).toContainText('Approved')
})

test('a question with no matching policy is flagged and has no draft', async ({ page }) => {
  await ask(page, 'Is there a parking garage near the downtown office?')
  await asReviewer(page)
  const item = page.getByRole('button', { name: /parking garage/ })
  await expect(item).toContainText('No policy match')
  await item.click()
  await expect(page.getByText('No matching policy was found')).toBeVisible()
  await expect(page.getByLabel(/Answer to the employee/)).toHaveValue('')
})

test('personal details are removed before saving', async ({ page }) => {
  await ask(page, 'Can I change my direct deposit? My SSN is 123-45-6789')
  await expect(page.getByText('[SSN removed]')).toBeVisible()
  await expect(page.getByText('123-45-6789')).toHaveCount(0)
  await expect(page.getByText('We removed a Social Security number before saving.')).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('northgate-hr-helpdesk'))
  expect(stored).not.toContain('123-45-6789')
})

test('HTML in a question is shown as text, not run', async ({ page }) => {
  const payload = '<img src=x onerror="window.__pwned=1"> what is the dress code?'
  await ask(page, payload)
  await expect(page.getByText(payload)).toBeVisible()
  await asReviewer(page)
  await page.getByRole('button', { name: /dress code/ }).click()
  expect(
    await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
  ).toBeUndefined()
  expect(await page.locator('img[src="x"]').count()).toBe(0)
})

test('rapid repeat questions are slowed down', async ({ page }) => {
  await ask(page, 'How many sick days do I have?')
  await ask(page, 'How many floating holidays do I have?')
  await expect(page.getByRole('alert')).toContainText('Please wait a few seconds')
})

test('tickets survive a reload, and Reset demo restores the sample data', async ({ page }) => {
  await ask(page, 'When is open enrollment for benefits?')
  await page.reload()
  await expect(page.getByText('When is open enrollment for benefits?')).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByText('When is open enrollment for benefits?')).toHaveCount(0)
})

test('corrupt saved data falls back to the demo with a notice', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('northgate-hr-helpdesk', '{broken'))
  await page.reload()
  await expect(page.getByText('Some saved data could not be read')).toBeVisible()
  await expect(page.getByText('✓ Reviewed by HR')).toBeVisible()
})
