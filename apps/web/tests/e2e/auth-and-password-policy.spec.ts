import { expect, type Page, test } from '@playwright/test'

type PasswordPolicyPayload = {
  len: number
  hasUpperCase: 0 | 1
  hasLowerCase: 0 | 1
  hasNumbers: 0 | 1
  hasSpecialChars: 0 | 1
  checkPwned: boolean
  pwnedRecheckEnabled: boolean
  pwnedRecheckMaxAgeSeconds: number
  pwnedRecheckAction: 'none' | 'notify' | 'expire'
  resetBySms: boolean
  emailAttribute: string
  mobileAttribute: string
  redirectUrl: string
  goodComplexity: number
  minComplexity: number
  resetCodeTTL: number
  initTokenTTL: number
  passwordExpirationReminderDaysBefore: number
  passwordExpirationReminderDaysBeforeList: number[]
  passwordExpirationReminderSteps: Array<{ daysBefore: number; template: string; subject: string }>
  passwordExpirationReminderTemplatesByDays: Record<string, string>
  passwordExpirationReminderSubject: string
  passwordExpirationReminderSubjectsByDays: Record<string, string>
}

const defaultPolicy: PasswordPolicyPayload = {
  len: 10,
  hasUpperCase: 1,
  hasLowerCase: 1,
  hasNumbers: 1,
  hasSpecialChars: 0,
  checkPwned: false,
  pwnedRecheckEnabled: false,
  pwnedRecheckMaxAgeSeconds: 604800,
  pwnedRecheckAction: 'none',
  resetBySms: false,
  emailAttribute: 'mail',
  mobileAttribute: 'mobile',
  redirectUrl: 'https://example.org',
  goodComplexity: 60,
  minComplexity: 40,
  resetCodeTTL: 900,
  initTokenTTL: 3600,
  passwordExpirationReminderDaysBefore: -1,
  passwordExpirationReminderDaysBeforeList: [30, 7, 1],
  passwordExpirationReminderSteps: [
    { daysBefore: 30, template: 'mail_password_expire_j30', subject: 'Votre mot de passe expire dans 30 jours' },
    { daysBefore: 7, template: 'mail_password_expire_j7', subject: 'Votre mot de passe expire dans 7 jours' },
    { daysBefore: 1, template: 'mail_password_expire_j1', subject: 'Votre mot de passe expire demain' },
  ],
  passwordExpirationReminderTemplatesByDays: {
    '30': 'mail_password_expire_j30',
    '7': 'mail_password_expire_j7',
    '1': 'mail_password_expire_j1',
  },
  passwordExpirationReminderSubject: 'Votre mot de passe expire bientôt',
  passwordExpirationReminderSubjectsByDays: {
    '30': 'Votre mot de passe expire dans 30 jours',
    '7': 'Votre mot de passe expire dans 7 jours',
    '1': 'Votre mot de passe expire demain',
  },
}

async function mockAuthEndpoints(page: Page): Promise<void> {
  await page.route('**/api/core/auth/local', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-access-token',
        refresh_token: 'fake-refresh-token',
      }),
    })
  })

  await page.route('**/api/core/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'e2e-admin',
          username: 'admin',
          roles: ['admin'],
          access: {},
        },
      }),
    })
  })
}

async function loginFromUi(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel("Nom d'utilisateur").fill('admin')
  await page.getByLabel('Mot de passe').fill('password')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('affiche une erreur utilisateur quand la connexion échoue', async ({ page }) => {
  await page.route('**/api/core/auth/local', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Identifiants invalides' }),
    })
  })

  await page.goto('/login')
  await page.getByLabel("Nom d'utilisateur").fill('wrong')
  await page.getByLabel('Mot de passe').fill('wrong')
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page.getByText('Erreur de connexion')).toBeVisible()
})

test("envoie la sauvegarde de politique de mot de passe a l'API", async ({ page }) => {
  let capturedSaveBody: unknown

  await mockAuthEndpoints(page)

  await page.route('**/api/settings/passwdadm/getpolicies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: defaultPolicy }),
    })
  })

  await page.route('**/api/settings/passwdadm/hibp-keystatus', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          valid: true,
          reason: null,
        },
      }),
    })
  })

  await page.route('**/api/management/mail/templates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: ['mail_password_expire_j30', 'mail_password_expire_j7', 'mail_password_expire_j1'],
      }),
    })
  })

  await page.route('**/api/settings/passwdadm/setpolicies', async (route) => {
    capturedSaveBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { ok: true } }),
    })
  })

  await loginFromUi(page)
  await page.goto('/settings/password-policy')

  await expect(page.getByText('Politique des mots de passe')).toBeVisible()
  await page.getByLabel('Longueur minimale').fill('14')
  await page.getByRole('button', { name: 'Sauvegarder les paramètres' }).click()

  await expect.poll(() => capturedSaveBody).toBeTruthy()
  expect(capturedSaveBody).toMatchObject({
    len: 14,
  })
  await expect(page.getByText('Les paramètres ont été sauvegardés')).toBeVisible()
})
