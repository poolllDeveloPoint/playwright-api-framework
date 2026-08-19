import { test, expect } from '@playwright/test';
import { config } from '../../api-test.config';

test('test', async ({ page }) => {
    await page.goto('https://conduit.bondaracademy.com/');
    await page.getByRole('link', { name: 'Sign in' }).click();
    await page.getByRole('textbox', { name: 'Email' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill(config.usermail);
    await page.getByRole('textbox', { name: 'Email' }).press('Tab');
    await page.getByRole('textbox', { name: 'Password' }).fill(config.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByRole('link', { name: '  New Article' }).click();
    await page.getByRole('textbox', { name: 'Article Title' }).click();
    await page.getByRole('textbox', { name: 'Article Title' }).fill('Test');
    await page.getByRole('textbox', { name: 'What\'s this article about?' }).click();
    await page.getByRole('textbox', { name: 'What\'s this article about?' }).fill('this is abount');
    await page.getByRole('textbox', { name: 'Write your article (in' }).click();
    await page.getByRole('textbox', { name: 'Write your article (in' }).fill('This is main area');
    await page.getByRole('button', { name: 'Publish Article' }).click();
    await page.getByRole('button', { name: ' Delete Article' }).first().click();
    await page.goto('https://conduit.bondaracademy.com/settings');
    await page.getByRole('button', { name: 'Or click here to logout.' }).click();
});