async function getActivePage(browser, timeout) {
    var start = new Date().getTime();
    while (new Date().getTime() - start < timeout) {
        var pages = await browser.pages();
        var arr = [];
        for (const p of pages) {
            if (await p.evaluate(() => { return document.visibilityState == 'visible' })) {
                arr.push(p);
            }
        }
        if (arr.length == 1) return arr[0];
    }
    throw "Unable to get active page";
}

module.exports = getActivePage;
