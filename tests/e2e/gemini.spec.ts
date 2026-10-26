import { expect, test, type Page } from '@playwright/test'

// Gemini is reached through a here.now proxy route that does not exist under `vite preview`,
// so these tests stand in for it with Playwright's request interception.
const geminiReply = (text: string) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }),
})

async function openTicket(page: Page, name: RegExp) {
  await page.goto('/')
  await page.getByRole('tab', { name: /HR reviewer/ }).click()
  await page.getByRole('button', { name }).click()
}

test('Gemini drafts an answer, can regenerate it, and the approval records it', async ({
  page,
}, info) => {
  const bodies: string[] = []
  let call = 0
  await page.route('**/api/gemini', async (route) => {
    bodies.push(route.request().postData() ?? '')
    call++
    await route.fulfill(
      geminiReply(`Hi, draft number ${call}: you get 20 days per year.\n\nNorthgate Realty HR`),
    )
  })

  await openTicket(page, /vacation days do I get after 4 years/)
  const answer = page.getByLabel(/Answer to the employee/)
  await page.getByRole('button', { name: '✨ Draft with Gemini' }).click()
  await expect(answer).toHaveValue(/draft number 1/)
  await expect(page.getByText('Drafted by Gemini from the policy sources above')).toBeVisible()

  // What the browser sent: policy text and the question, but no key.
  const sent = JSON.parse(bodies[0]!)
  expect(sent.contents[0].parts[0].text).toContain('20 days per year in years 4–7')
  expect(bodies[0]).not.toMatch(/api[_-]?key|AIza/i)

  await page.waitForTimeout(3100) // the regenerate cooldown
  await page.getByRole('button', { name: '↻ Regenerate with Gemini' }).click()
  await expect(answer).toHaveValue(/draft number 2/)
  await page.screenshot({
    path: `test-results/shots/${info.project.name}-gemini.png`,
    fullPage: true,
  })

  await page.getByRole('button', { name: 'Approve answer' }).click()
  await page.getByRole('tab', { name: /Approved/ }).click()
  await page.getByRole('button', { name: /vacation days do I get after 4 years/ }).click()
  await expect(page.getByText('· first draft by Gemini')).toBeVisible()
})

test('asks before replacing the reviewer’s own edits', async ({ page }) => {
  await page.route('**/api/gemini', (route) => route.fulfill(geminiReply('Gemini text')))
  await openTicket(page, /work from home on Fridays/)
  const answer = page.getByLabel(/Answer to the employee/)
  await answer.fill('My carefully edited answer')
  page.once('dialog', (d) => d.dismiss())
  await page.getByRole('button', { name: '✨ Draft with Gemini' }).click()
  await expect(answer).toHaveValue('My carefully edited answer')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: '✨ Draft with Gemini' }).click()
  await expect(answer).toHaveValue('Gemini text')
})

test('without the proxy route, explains that Gemini is not connected and keeps the draft', async ({
  page,
}) => {
  // No interception: `vite preview` answers like a site without proxy routes.
  await openTicket(page, /work from home on Fridays/)
  const answer = page.getByLabel(/Answer to the employee/)
  const before = await answer.inputValue()
  await page.getByRole('button', { name: '✨ Draft with Gemini' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Gemini is not connected on this copy of the site',
  )
  await expect(answer).toHaveValue(before)
})

test('a Gemini error is shown in plain words without leaking details', async ({ page }) => {
  await page.route('**/api/gemini', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: '{"error":{"message":"API key not valid AIzaSECRET"}}',
    }),
  )
  await openTicket(page, /work from home on Fridays/)
  await page.getByRole('button', { name: '✨ Draft with Gemini' }).click()
  await expect(page.getByRole('alert')).toContainText('Gemini returned an error (400)')
  await expect(page.getByText(/AIzaSECRET/)).toHaveCount(0)
})

test('HTML in a Gemini reply is shown as text, not run', async ({ page }) => {
  await page.route('**/api/gemini', (route) =>
    route.fulfill(geminiReply('<img src=x onerror="window.__pwned=1"> Hi')),
  )
  await openTicket(page, /work from home on Fridays/)
  await page.getByRole('button', { name: '✨ Draft with Gemini' }).click()
  await expect(page.getByLabel(/Answer to the employee/)).toHaveValue(/<img src=x/)
  expect(
    await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned),
  ).toBeUndefined()
})

test('the Gemini button is disabled when there is no matching policy', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Your question for HR').fill('Is there a parking garage near the office?')
  await page.getByRole('button', { name: 'Send' }).click()
  await page.getByRole('tab', { name: /HR reviewer/ }).click()
  await page.getByRole('button', { name: /parking garage/ }).click()
  await expect(page.getByRole('button', { name: '✨ Draft with Gemini' })).toBeDisabled()
})
