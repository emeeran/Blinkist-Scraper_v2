// const puppeteer = require('puppeteer');
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const delay = require("delay");

const os = require("os");
const fs = require("fs/promises");

const getActivePage = require("./utils/get-active-page");
const blockPageRequest = require("./utils/block-page-request");
const isWindows = os.platform() === "win32";

let executablePath = isWindows
  ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath,
    userDataDir: "./userDataDir",
  });
  const page = await browser.newPage();

  try {
    blockPageRequest(page);

    await page.goto("https://www.blinkist.com/en/nc/login", {
      waitUntil: "networkidle0",
    });

    // Step #1: Login
    const currentPage = await getActivePage(browser, 5000);

    if (currentPage.url().endsWith("/login")) {
      await page.type("#login-form_login_email", "emeeranjp@gmail.com", {
        delay: 300,
      });
      await page.type("#login-form_login_password", "Jeny13y@blk", {
        delay: 300,
      });
      await page.click(`.loginV2__control-group [type="submit"]`);
      await page.waitForNavigation({ waitUntil: "networkidle0" });
    } else {
      console.log("Already logged in. Redirecting to dashboard");
    }

    // Step #2: Go to book
    const bookUrl =
      "https://www.blinkist.com/en/nc/reader/who-will-cry-when-you-die-en";

    const urlSplitted = bookUrl.split("/");
    const bookName = urlSplitted[urlSplitted.length - 1].replaceAll("-en", "");

    await page.goto(bookUrl);
    const wantedUrlPattern = "/chapters";
    const bookInfoResponse = await page.waitForResponse((res) => {
      return (
        res.url().includes(wantedUrlPattern) && res.request().method() === "GET"
      );
    });

    const bookInfoResponseJson = await bookInfoResponse.json();

    // Step #3: Write book info to file.
    await fs.mkdir(`./dataset/${bookName}`);
    await fs.writeFile(
      `./dataset/${bookName}/book-info.json`,
      JSON.stringify(bookInfoResponseJson, null, 4)
    );

    // Step #4: Get all chapter data via api in their website.

    // https://geshan.com.np/blog/2022/08/javascript-wait-1-second/
    const chapters = await page.evaluate(
      async (bookInfoResponseJson) => {
        function delay(milliseconds) {
          return new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
          });
        }
        const bookId = bookInfoResponseJson.book.id;
        const chapterIds = bookInfoResponseJson.chapters.map((item) => item.id);
        const chapters = [];
        const fetchConfig = {
          headers: {
            accept: "application/json, */*",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua":
              '"Chromium";v="106", "Google Chrome";v="106", ";Not A Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Mac OS X"',
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-csrf-token": document
              .querySelector('meta[name="csrf-token"]')
              .getAttribute("content"),
            "x-requested-with": "XMLHttpRequest",
          },
          referrer:
            "https://www.blinkist.com/en/nc/reader/inflation-matters-en",
          referrerPolicy: "strict-origin-when-cross-origin",
          body: null,
          method: "GET",
          mode: "cors",
          credentials: "include",
        };

        for (const [position, chapterId] of chapterIds.entries()) {
          const url = `https://www.blinkist.com/api/books/${bookId}/chapters/${chapterId}`;
          console.log({ position, url });
          const chapterResponse = await (await fetch(url, fetchConfig)).json();
          chapters.push(chapterResponse);
          await delay(3000);
        }
        return chapters;
      },
      bookInfoResponseJson,
      delay
    );

    console.log(JSON.stringify(chapters, null, 4));

    await fs.writeFile(
      `./dataset/${bookName}/chapters.json`,
      JSON.stringify(chapters, null, 4)
    );
  } catch (error) {
    console.log(error);
  } finally {
    await page.close();
    await browser.close();
  }

  // 1. Go to the book page url. Get input via CLI

  // 2. Listen to "https://www.blinkist.com/api/books/inflation-matters-en/chapters" api request
  // -> save the response (all chapter ids), book meta, etc.

  // 3. In browser make a fetch request for every chapter using chapter id.
  // -> save all the response as json file
  // -> download all the signed url audio book

  console.log("done");
}

main();
