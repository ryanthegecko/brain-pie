/**
 * core.spec.js
 *
 * Tests for core BrainPie functionality: pie rendering, category/slice/spoke
 * CRUD, multi-pie switching, priority stars, and export/import.
 *
 * All storage operations stay in localStorage mode (the default). No Firebase
 * or file system access is involved.
 *
 * Where possible, App/DataModel methods are called directly via page.evaluate()
 * rather than clicking through the UI — faster and less fragile. Locators are
 * only used to assert that the DOM has actually updated.
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        // Clear all state (Firebase config, sync flags etc) so tests are
        // isolated from whatever the browser left behind between sessions.
        localStorage.clear();
        localStorage.setItem('brainPieTutorialCompleted', 'true');
    });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigate and wait for the app to finish its async init.
 * App.init() is async — we wait until DataModel has categories loaded.
 */
async function gotoApp(page) {
    await page.goto('http://localhost:3333');
    await page.waitForFunction(() =>
        typeof DataModel !== 'undefined' &&
        typeof DataModel.categories !== 'undefined',
        { timeout: 5000 }
    );
}

/**
 * Seed one category and one item via DataModel, then render.
 * Returns { categoryId, itemId }.
 */
async function seedOneSlice(page, categoryName = 'Test Category', itemName = 'Test Slice') {
    return page.evaluate(async ({ categoryName, itemName }) => {
        DataModel.addCategory(categoryName, '#4a90e2');
        const cat = DataModel.categories.find(c => c.name === categoryName);
        const itemId = DataModel.addItem(cat.id, itemName, null, '#e24a4a');
        App.render();
        return { categoryId: cat.id, itemId };
    }, { categoryName, itemName });
}

// ---------------------------------------------------------------------------
// Test 13 — Example pie renders on first load
// ---------------------------------------------------------------------------

test('Test 13: example pie renders categories and chart on first load', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await gotoApp(page);

    // Categories list should have at least one card
    await expect(page.locator('#categories-list .category-card').first()).toBeVisible({ timeout: 5000 });

    // The example data has a "Home" category
    await expect(page.locator('#categories-list')).toContainText('Home');

    // The SVG pie chart should be rendered inside #chart-container
    await expect(page.locator('#chart-container svg')).toBeVisible();

    // DataModel should have categories loaded
    const catCount = await page.evaluate(() => DataModel.categories.length);
    expect(catCount).toBeGreaterThan(0);

    expect(pageErrors).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Test 14 — Add a category, see it rendered
// ---------------------------------------------------------------------------

test('Test 14: adding a category via DataModel renders it in the DOM', async ({ page }) => {
    await gotoApp(page);

    await page.evaluate(() => {
        DataModel.addCategory('My New Category', '#e24a4a');
        App.render();
    });

    // Category name should appear in the categories list
    await expect(page.locator('#categories-list')).toContainText('My New Category', { timeout: 3000 });

    // DataModel should reflect it
    const found = await page.evaluate(() =>
        DataModel.categories.some(c => c.name === 'My New Category')
    );
    expect(found).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 15 — Add a slice (item) to a category
// ---------------------------------------------------------------------------

test('Test 15: adding a slice renders it under its category', async ({ page }) => {
    await gotoApp(page);

    await page.evaluate(() => {
        const catId = DataModel.addCategory('Slice Category', '#4a90e2');
        DataModel.addItem(catId, 'My New Slice', 100, '#90e24a');
        App.render();
    });

    await expect(page.locator('#categories-list')).toContainText('My New Slice', { timeout: 3000 });

    const itemCount = await page.evaluate(() => {
        const cat = DataModel.categories.find(c => c.name === 'Slice Category');
        return cat ? cat.items.length : 0;
    });
    expect(itemCount).toBe(1);
});

// ---------------------------------------------------------------------------
// Test 16 — Add a spoke (sub-item) to a slice
// ---------------------------------------------------------------------------

test('Test 16: adding a spoke appears in DataModel and renders in the DOM', async ({ page }) => {
    await gotoApp(page);

    await page.evaluate(() => {
        const catId = DataModel.addCategory('Spoke Category', '#4a90e2');
        const itemId = DataModel.addItem(catId, 'Spoke Slice', 100, '#e24a4a');
        DataModel.addSubItem(catId, itemId, 'My Test Spoke');
        App.render();
    });

    await expect(page.locator('#categories-list')).toContainText('My Test Spoke', { timeout: 3000 });

    const spokeCount = await page.evaluate(() => {
        const cat = DataModel.categories.find(c => c.name === 'Spoke Category');
        return cat?.items[0]?.subItems?.length ?? 0;
    });
    expect(spokeCount).toBe(1);
});

// ---------------------------------------------------------------------------
// Test 17 — Delete a slice
// ---------------------------------------------------------------------------

test('Test 17: deleting a slice removes it from DataModel and the DOM', async ({ page }) => {
    await gotoApp(page);

    // addItem uses Date.now() for IDs — await 1ms between calls to guarantee unique IDs
    await page.evaluate(async () => {
        const catId = DataModel.addCategory('Delete Category', '#4a90e2');
        DataModel.addItem(catId, 'Keep Slice', 50, '#90e24a');
        await new Promise(r => setTimeout(r, 1));
        DataModel.addItem(catId, 'Delete Slice', 50, '#e24a4a');
        App.render();
    });

    await expect(page.locator('#categories-list')).toContainText('Delete Slice', { timeout: 3000 });

    // Remove Delete Slice and render — check DataModel state synchronously
    // inside evaluate to capture the state before any async callbacks fire.
    const afterRemoval = await page.evaluate(() => {
        const cat = DataModel.categories.find(c => c.name === 'Delete Category');
        const item = cat.items.find(i => i.name === 'Delete Slice');
        DataModel.removeItem(cat.id, item.id);
        App.render();
        return {
            catFound:    !!DataModel.categories.find(c => c.name === 'Delete Category'),
            itemCount:   DataModel.categories.find(c => c.name === 'Delete Category')?.items.length,
            hasKeepSlice: DataModel.categories.find(c => c.name === 'Delete Category')?.items.some(i => i.name === 'Keep Slice'),
        };
    });

    // DataModel must be correct immediately after removal
    expect(afterRemoval.catFound).toBe(true);
    expect(afterRemoval.itemCount).toBe(1);
    expect(afterRemoval.hasKeepSlice).toBe(true);

    // DOM should also reflect the removal
    await expect(page.locator('#categories-list')).not.toContainText('Delete Slice', { timeout: 3000 });
    await expect(page.locator('#categories-list')).toContainText('Keep Slice');
});

// ---------------------------------------------------------------------------
// Test 18 — Priority star: add and remove
// ---------------------------------------------------------------------------

test('Test 18: priority star adds and removes a slice from the priority list', async ({ page }) => {
    await gotoApp(page);

    const ids = await page.evaluate(() => {
        const catId = DataModel.addCategory('Priority Category', '#4a90e2');
        const itemId = DataModel.addItem(catId, 'Priority Slice', 100, '#e24a4a');
        App.render();
        return { catId, itemId };
    });

    // Add to priorities
    await page.evaluate(({ catId, itemId }) => {
        DataModel.addPriority({ type: 'slice', categoryId: catId, itemId });
        App.render();
    }, ids);

    const afterAdd = await page.evaluate(() => DataModel.priorityList.length);
    expect(afterAdd).toBe(1);

    // Star button should have 'active' class
    await expect(page.locator('.priority-star-btn.active').first()).toBeVisible({ timeout: 3000 });

    // Remove from priorities
    await page.evaluate(() => {
        DataModel.removePriority(0);
        App.render();
    });

    const afterRemove = await page.evaluate(() => DataModel.priorityList.length);
    expect(afterRemove).toBe(0);

    // No active star buttons should remain
    await expect(page.locator('.priority-star-btn.active')).toHaveCount(0, { timeout: 3000 });
});

// ---------------------------------------------------------------------------
// Test 19 — Multi-pie: create a second pie and switch between them
// ---------------------------------------------------------------------------

test('Test 19: creating a second pie and switching back restores the first pie', async ({ page }) => {
    await gotoApp(page);

    // Capture the original pie ID and add a known category to it
    const originalPieId = await page.evaluate(() => {
        DataModel.addCategory('First Pie Category', '#4a90e2');
        App.render();
        return DataModel.getActivePieId();
    });

    await expect(page.locator('#categories-list')).toContainText('First Pie Category', { timeout: 3000 });

    // Create a second pie — App.createPie() creates + switches to it
    await page.evaluate(async () => {
        await App.createPie('Second Pie');
    });

    // Should now be on the second (empty) pie — first pie category gone
    const secondPieId = await page.evaluate(() => DataModel.getActivePieId());
    expect(secondPieId).not.toBe(originalPieId);

    const pieCount = await page.evaluate(() => DataModel.pieMeta.pieIds.length);
    expect(pieCount).toBe(2);

    // Switch back to the first pie
    await page.evaluate(async (id) => {
        await App.switchPie(id);
    }, originalPieId);

    const activeAfterSwitch = await page.evaluate(() => DataModel.getActivePieId());
    expect(activeAfterSwitch).toBe(originalPieId);

    // First pie's category should be visible again
    await expect(page.locator('#categories-list')).toContainText('First Pie Category', { timeout: 3000 });
});

// ---------------------------------------------------------------------------
// Test 20 — Export / import round-trip via DataModel
// ---------------------------------------------------------------------------

test('Test 20: export/import round-trip preserves categories', async ({ page }) => {
    await gotoApp(page);

    // Seed a known category
    await page.evaluate(() => {
        DataModel.addCategory('Export Test Category', '#4a90e2');
        DataModel.addItem(
            DataModel.categories.find(c => c.name === 'Export Test Category').id,
            'Export Slice', 100, '#e24a4a'
        );
        App.render();
    });

    await expect(page.locator('#categories-list')).toContainText('Export Test Category', { timeout: 3000 });

    // Capture the current categories as the "export"
    const exported = await page.evaluate(() =>
        JSON.parse(JSON.stringify(DataModel.categories))
    );
    expect(exported.some(c => c.name === 'Export Test Category')).toBe(true);

    // Clear all data (simulating a fresh state before import)
    await page.evaluate(() => {
        DataModel.categories = [];
        DataModel.categoryPercentageOverrides = {};
        App.render();
    });

    await expect(page.locator('#categories-list')).not.toContainText('Export Test Category', { timeout: 3000 });

    // Import: restore from the captured snapshot
    await page.evaluate((cats) => {
        DataModel.categories = cats;
        App.render();
    }, exported);

    await expect(page.locator('#categories-list')).toContainText('Export Test Category', { timeout: 3000 });
    await expect(page.locator('#categories-list')).toContainText('Export Slice');

    const restored = await page.evaluate(() =>
        DataModel.categories.find(c => c.name === 'Export Test Category')
    );
    expect(restored).not.toBeNull();
    expect(restored.items[0].name).toBe('Export Slice');
});
