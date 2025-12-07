// To run E2E tests, first install Playwright:
// pnpm add -D @playwright/test

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  
  test('should allow a user to navigate to sign up and create an account', async ({ page }: { page: Page }) => {
    await page.goto('/login');

    // 1. Check initial state (Login)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // 2. Switch to Sign Up
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /get started/i })).toBeVisible();

    // 3. Fill Form
    await page.getByPlaceholder('Full Name').fill('Test User');
    await page.getByPlaceholder('Email Address').fill(`test-${Date.now()}@example.com`);
    await page.getByPlaceholder('Password').fill('SecurePass123!');

    // 4. Select Role (Student is default, verify it)
    const studentBtn = page.getByRole('button', { name: 'student' });
    await expect(studentBtn).toHaveClass(/bg-white text-indigo-600/);

    // 5. Submit
    // Mocking the backend response isn't done here for true E2E, 
    // assuming Supabase or a mock server is running.
    // For this example, we check if the button goes into loading state.
    await page.getByRole('button', { name: /create account/i }).click();
    
    // Expect success message toast
    await expect(page.getByText('Account created! Please check your email.')).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }: { page: Page }) => {
    await page.goto('/login');

    await page.getByPlaceholder('Email Address').fill('wrong@example.com');
    await page.getByPlaceholder('Password').fill('wrongpass');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Expect error toast
    await expect(page.getByText(/login failed/i)).toBeVisible();
  });
});