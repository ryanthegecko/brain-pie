const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    use: {
        browserName: 'chromium',
        headless: false,
        launchOptions: {
            slowMo: 1500,
        },
    },
    webServer: {
        command: 'npx serve . -p 3333 --no-clipboard',
        url: 'http://localhost:3333',
        reuseExistingServer: !process.env.CI,
    },
});
