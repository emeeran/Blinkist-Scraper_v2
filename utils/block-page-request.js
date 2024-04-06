async function blockPageRequest(page) {
    page.setRequestInterception(true);

    page.on('request', (request) => {
        if (request.url().startsWith("https://consent.cookiebot.com")) {
            request.abort();
            return;
        }
        request.continue();
    });
}

module.exports = blockPageRequest;
