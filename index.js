const chalk = require("chalk");
const puppeteer = require("puppeteer");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BOT_VERSION = "1.0.0";
const KAHOOT_JOIN_PAGE = "https://kahoot.it/";

// Selectors
const GAME_PIN_INPUT_SELECTOR = '[data-functional-selector="game-pin-input"]';
const JOIN_GAME_SELECTOR = '[data-functional-selector="join-game-pin"]';
const NICKNAME_INPUT_SELECTOR = '[data-functional-selector="username-input"]';
const SUBMIT_NICKNAME_SELECTOR = '[data-functional-selector="join-button-username"]';
const NICKNAME_ON_WAITING_PAGE_SELECTOR = '[data-functional-selector="nickname"]';

let GAME_PIN = "";

function getTimestamp() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const sgTime = new Date(utc + (8 * 60 * 60000));
  const dd = String(sgTime.getDate()).padStart(2, "0");
  const mm = String(sgTime.getMonth() + 1).padStart(2, "0");
  const yy = String(sgTime.getFullYear()).slice(-2);
  const hh = String(sgTime.getHours()).padStart(2, "0");
  const min = String(sgTime.getMinutes()).padStart(2, "0");
  const ss = String(sgTime.getSeconds()).padStart(2, "0");
  const mss = String(sgTime.getMilliseconds()).padStart(3, "0");
  // return `${dd}-${mm}-${yy} ${hh}:${min}:${ss}.${mss}`;
  return `${hh}:${min}:${ss}.${mss}`;
}

async function runBot(taskNumber="") {
    function log(taskNumber, message, color="white") {
        if (color === "red") {
            console.log(`${getTimestamp()} (Bot ${taskNumber}) ${chalk.red(message)}`);
        }
        else if (color === "green") {
            console.log(`${getTimestamp()} (Bot ${taskNumber}) ${chalk.green(message)}`);
        }
        else if (color === "cyan") {
            console.log(`${getTimestamp()} (Bot ${taskNumber}) ${chalk.cyan(message)}`);
        }
        else { // Default log is yellow color
            console.log(`${getTimestamp()} (Bot ${taskNumber}) ${chalk.white(message)}`);
        }
    }

    log(taskNumber, "Creating Bot...");

    const browser = await puppeteer.launch({ 
        headless: true,
        defaultViewport: false,
        args: [
            "--window-size=1200,800",
            "--disable-infobars",
            "--no-default-browser-check",
        ]
    });

    // Close the default about:blank page
    const pages = await browser.pages();
    if (pages.length > 0) await pages[0].close();

    const page = await browser.newPage();
    log(taskNumber, "Bot Created", "cyan");

    // Enable request interception
    await page.setRequestInterception(true);

    page.on("request", (req) => {
        const resourceType = req.resourceType();
        // Block images, stylesheets, fonts, media for faster loading
        if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
          req.abort();
        } 
        else {
          req.continue();
        }
    });

    log(taskNumber, "Loading Room");
    await page.goto(KAHOOT_JOIN_PAGE);

    const gamePinInputElement = await page.waitForSelector(GAME_PIN_INPUT_SELECTOR);
    const gamePinInputPlaceholder = await page.evaluate(el => el.placeholder, gamePinInputElement);

    if (gamePinInputPlaceholder === "Game PIN") {
        log(taskNumber, "Joining Room With Game PIN");
        await page.locator(GAME_PIN_INPUT_SELECTOR).fill(GAME_PIN);
        await page.locator(JOIN_GAME_SELECTOR).click();

        try {
            const nicknameInputElement = await page.waitForSelector(NICKNAME_INPUT_SELECTOR, { timeout: 5000 });
            const nicknameInputPlaceholder = await page.evaluate(el => el.placeholder, nicknameInputElement);
    
            if (nicknameInputPlaceholder === "Nickname") {
                log(taskNumber, "Submitting Nickname");
                await page.locator(NICKNAME_INPUT_SELECTOR).fill(`BOT--${Math.random()}`);
                await page.locator(SUBMIT_NICKNAME_SELECTOR).click();
    
                try {
                    const nicknameOnWaitingPageElement = await page.waitForSelector(NICKNAME_ON_WAITING_PAGE_SELECTOR, { timeout: 5000 });
                    const nicknameOnWaitingPage = await page.evaluate(el => el.textContent, nicknameOnWaitingPageElement);
                    if (nicknameOnWaitingPage !== "") log(taskNumber, "Successfully Joined Game!", "green");
                } 
                catch (error) {
                    log(taskNumber, "Error Joining Game", "red");
                }
            }
            else {
                log(taskNumber, `Error Joining Game With Game PIN ${GAME_PIN}`, "red");
            }    
        } 
        catch (error) {
            log(taskNumber, "Error Joining Game", "red");
        }
    }

    // log(taskNumber, "Bot Stopped.");
    // await browser.close();
}

(async () => {
    console.log(`\nKahoot Join Bot - V ${BOT_VERSION}\n`);

    rl.question("Game PIN> ", (pin) => {
        if (!pin) return;

        GAME_PIN = pin;

        rl.question("Number of bots> ", (count) => {
            const botCount = parseInt(count, 10);

            if (isNaN(botCount) || botCount <= 0) {
                console.log("Invalid Number Of Bots");
                return;
            }

            // Initial run
            for (let i = 0; i < botCount; i++) {
                runBot(i+1);
            }
        });
    });
})();