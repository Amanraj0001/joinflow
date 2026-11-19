import { test, expect } from '@playwright/test'
async function login(page, role) {
  await page.goto('/')
  await page.getByRole('button', { name: role, exact: true }).click()
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}
test('an employee sees the laptop approval unlock setup, cites a policy and contacts HR', async ({
  page,
  browser,
}) => {
  await login(page, 'Employee')
  const setup = page.getByRole('button', { name: /Set up your workstation/ })
  await expect(setup).toContainText('Blocked')
  const mgr = await browser.newPage()
  await login(mgr, 'Manager')
  await mgr
    .locator('.decision')
    .filter({ hasText: 'Approve laptop request' })
    .filter({ hasText: 'Alex Park' })
    .getByRole('button', { name: 'Approve', exact: true })
    .click()
  await expect(
    mgr
      .locator('.decision')
      .filter({ hasText: 'Approve laptop request' })
      .filter({ hasText: 'Alex Park' })
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(setup).toContainText('Available')
  await page.getByRole('button', { name: 'Assistant' }).click()
  await page.getByRole('button', { name: 'When do benefits begin?' }).click()
  await page.getByText('Benefits enrollment', { exact: true }).click()
  await expect(page.locator('details[open]')).toContainText('start date')
  await page.getByLabel('Ask a question').fill('Is relocation covered?')
  await page.getByRole('button', { name: 'Send question', exact: true }).click()
  await page
    .locator('.response')
    .filter({ hasText: 'Is relocation covered?' })
    .getByRole('button', { name: 'Send question to HR' })
    .click()
  await expect(page.getByRole('button', { name: 'Sent to HR' })).toBeVisible()
  const hr = await browser.newPage()
  await login(hr, 'HR')
  await hr.getByRole('button', { name: 'HR inbox' }).click()
  await expect(hr.getByText('Is relocation covered?')).toBeVisible()
  await hr.getByLabel('Reply to employee').fill('I will send you the relocation guide.')
  await hr.getByRole('button', {name:'Send reply'}).click()
  await expect(hr.getByText('I will send you the relocation guide.')).toBeVisible()
  await page.getByRole('button', {name:'HR replies'}).click()
  await expect(page.getByText('I will send you the relocation guide.')).toBeVisible()
  await hr.getByRole('button', { name: 'Overview' }).click()
  await hr.getByRole('button', { name: 'Preview move to Austin' }).click()
  await hr.getByRole('button', { name: 'Cancel' }).click()
  await expect(
    hr.getByRole('button', { name: 'Preview move to Austin' })
  ).toBeVisible()
  await mgr.close()
  await hr.close()
})

test('HR creates an operations hire and applies a reviewed office move', async ({
  page,
}) => {
  await login(page, 'HR')
  await page.getByRole('button', { name: 'New hire' }).click()
  await page.getByLabel('Full name').fill('Robin West')
  await page.getByLabel('Work email').fill('robin@joinflow.example')
  await page.getByLabel('Initial password').fill('DemoAccount123!')
  await page.getByLabel('Start date').fill('2027-02-15')
  await page.getByLabel('Job role').selectOption('Operations')
  await page.getByRole('button', { name: 'Create checklist' }).click()
  await expect(
    page.getByRole('heading', { name: 'People overview' })
  ).toBeVisible()
  await page.getByRole('combobox').selectOption({ label: 'Robin West' })
  await expect(
    page.getByText('Review operations playbook', { exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Preview move to Austin' }).click()
  await page.getByRole('button', { name: 'Apply change' }).click()
  await expect(
    page.getByText('Collect Austin access pass', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('Collect London access pass', { exact: true })
  ).toHaveCount(0)
  await expect(
    page.getByText('Changed location from London to Austin.')
  ).toBeVisible()
})
