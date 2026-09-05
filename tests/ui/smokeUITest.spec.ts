import { test, expect } from '@playwright/test';
import { config } from '../../api-test.config';

test.describe('ArticleHub Web UI Smoke Tests', () => {
  test('complete end-to-end user journey: login, publish article, delete article, and logout', async ({ page }) => {
    const testTitle = `Modern Web Architecture ${Date.now()}`;
    const testDesc = 'Exploring modern decoupled web design with Redis and PostgreSQL.';
    const testBody = 'This is an end-to-end automated UI validation test verifying complete user flows.';

    // 1. Navigate to the ArticleHub Web Client
    await page.goto(config.webUrl);
    await expect(page).toHaveTitle(/ArticleHub/);
    await expect(page.getByRole('heading', { name: 'Publish, Share & Explore Knowledge' })).toBeVisible();

    // 2. Open Login Modal and Sign In
    await page.locator('#btn-open-login').click();
    await expect(page.locator('#modal-login')).toHaveClass(/open/);

    await page.locator('#login-email').fill(config.usermail);
    await page.locator('#login-password').fill(config.password);
    await page.locator('#form-login button[type="submit"]').click();

    // 3. Verify Authenticated State
    const writeBtn = page.locator('#btn-new-article');
    await expect(writeBtn).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#btn-logout')).toBeVisible();

    // 4. Open Article Editor and Create New Article
    await writeBtn.click();
    await expect(page.locator('#modal-article')).toHaveClass(/open/);

    await page.locator('#art-title').fill(testTitle);
    await page.locator('#art-desc').fill(testDesc);
    await page.locator('#art-body').fill(testBody);
    await page.locator('#art-tags').fill('architecture, automation');
    await page.locator('#art-published').check();

    await page.locator('#btn-save-article').click();

    // 5. Verify Article is Published and Rendered on Feed
    const articleHeading = page.getByRole('heading', { name: testTitle });
    await expect(articleHeading).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Article published successfully!')).toBeVisible();

    // 6. Delete the Article (Handle Confirmation Dialog)
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const articleCard = page.locator('.article-card', { hasText: testTitle });
    await articleCard.locator('.btn-delete-action').click();

    // 7. Verify Deletion
    await expect(articleHeading).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Article permanently deleted.')).toBeVisible();

    // 8. Log out
    await page.locator('#btn-logout').click();
    await expect(page.locator('#btn-open-login')).toBeVisible({ timeout: 10000 });
    await expect(writeBtn).not.toBeVisible();
  });

  test('draft isolation workflow: verify un-published draft is hidden from public feed, then delete after re-login', async ({ page }) => {
    const draftTitle = `Internal Draft Architecture ${Date.now()}`;
    const draftDesc = 'Confidential architectural proposals kept in draft state.';
    const draftBody = 'This draft must only be visible to its author and completely hidden from unauthenticated public visitors.';

    // 1. Navigate to the ArticleHub Web Client
    await page.goto(config.webUrl);

    // 2. Open Login Modal and Sign In
    await page.locator('#btn-open-login').click();
    await page.locator('#login-email').fill(config.usermail);
    await page.locator('#login-password').fill(config.password);
    await page.locator('#form-login button[type="submit"]').click();

    const writeBtn = page.locator('#btn-new-article');
    await expect(writeBtn).toBeVisible({ timeout: 10000 });

    // 3. Create Draft Article (Leave art-published UNCHECKED)
    await writeBtn.click();
    await expect(page.locator('#modal-article')).toHaveClass(/open/);

    await page.locator('#art-title').fill(draftTitle);
    await page.locator('#art-desc').fill(draftDesc);
    await page.locator('#art-body').fill(draftBody);
    await page.locator('#art-tags').fill('internal, draft');
    await page.locator('#art-published').uncheck();

    await page.locator('#btn-save-article').click();

    // 4. Verify Draft Status & Badge visible to the author
    const draftHeading = page.getByRole('heading', { name: draftTitle });
    await expect(draftHeading).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Article saved as Draft.')).toBeVisible();

    const draftCard = page.locator('.article-card', { hasText: draftTitle });
    await expect(draftCard.locator('.badge-draft')).toBeVisible();

    // 5. Log out
    await page.locator('#btn-logout').click();
    await expect(page.locator('#btn-open-login')).toBeVisible({ timeout: 10000 });

    // 6. Verify Draft Article is NOT visible to unauthenticated public visitors
    await expect(draftHeading).not.toBeVisible({ timeout: 10000 });

    // 7. Log back in as the Author
    await page.locator('#btn-open-login').click();
    await page.locator('#login-email').fill(config.usermail);
    await page.locator('#login-password').fill(config.password);
    await page.locator('#form-login button[type="submit"]').click();
    await expect(writeBtn).toBeVisible({ timeout: 10000 });

    // 8. Verify Draft Article reappears for the authenticated author
    await expect(draftHeading).toBeVisible({ timeout: 10000 });

    // 9. Delete the Draft Article
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const authorDraftCard = page.locator('.article-card', { hasText: draftTitle });
    await authorDraftCard.locator('.btn-delete-action').click();

    await expect(draftHeading).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Article permanently deleted.')).toBeVisible();

    // 10. Clean Logout
    await page.locator('#btn-logout').click();
    await expect(page.locator('#btn-open-login')).toBeVisible({ timeout: 10000 });
    await expect(writeBtn).not.toBeVisible();
  });
});