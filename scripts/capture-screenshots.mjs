import puppeteer from "../backend/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(ROOT_DIR, "docs", "screenshots");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_URL = "https://sketch-battle-rho.vercel.app";

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
  console.log("🚀 Launching Headless Chrome via puppeteer-core...");
  console.log(`Target: ${TARGET_URL}`);
  console.log(`Saving screenshots to: ${SCREENSHOTS_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  try {
    // 1. Desktop Landing Page - Join Tab
    console.log("📸 [1/8] Capturing Desktop Landing (Join Tab)...");
    await page.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await page.waitForSelector("input", { timeout: 10000 });

    const usernameInput = await page.$('input[placeholder*="username"], input[placeholder*="MasterArtist"]');
    if (usernameInput) {
      await usernameInput.type("PixelMaster", { delay: 30 });
    }

    await new Promise((r) => setTimeout(r, 1000));
    const shot1 = path.join(SCREENSHOTS_DIR, "01-landing-join.png");
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`Saved: ${shot1}`);

    // 2. Desktop Landing Page - Create Room Tab with Customized Settings
    console.log("📸 [2/8] Capturing Desktop Landing (Create Room & Settings)...");
    const createTabBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent && b.textContent.includes("Create Room"));
    });

    const uniqueRoomId = `TOUR_${Math.floor(1000 + Math.random() * 9000)}`;

    if (createTabBtn && createTabBtn.asElement()) {
      await createTabBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 600));

      // Expand settings
      const customizeBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        return buttons.find(
          (b) => b.textContent && (b.textContent.includes("Customize") || b.textContent.includes("Settings"))
        );
      });

      if (customizeBtn && customizeBtn.asElement()) {
        try {
          await customizeBtn.asElement().click();
          await new Promise((r) => setTimeout(r, 500));
        } catch (_) {}
      }

      // Enter sample room ID
      const roomIdInput = await page.$('input[placeholder*="COOL_ROOM"], input[placeholder*="MYROOM"]');
      if (roomIdInput) {
        await roomIdInput.type(uniqueRoomId, { delay: 20 });
      }

      // Enter sample password
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.type("pass123", { delay: 20 });
      }
    }

    await new Promise((r) => setTimeout(r, 800));
    const shot2 = path.join(SCREENSHOTS_DIR, "02-landing-create.png");
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`Saved: ${shot2}`);

    // Submit room creation for Player 1
    console.log(`🎮 Creating room ${uniqueRoomId} as PixelMaster...`);
    const submitCreateBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find(
        (b) => b.textContent && b.textContent.includes("Create Room") && b.getAttribute("type") !== "button"
      ) || buttons.find((b) => b.textContent && b.textContent.includes("Create Room ✨"));
    });

    if (submitCreateBtn && submitCreateBtn.asElement()) {
      await submitCreateBtn.asElement().click();
      await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 25000 }).catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 2500));

    // 3. Game Lobby Snapshot (with Player 1)
    console.log("📸 [3/8] Capturing Desktop Game Lobby...");
    const shot3 = path.join(SCREENSHOTS_DIR, "03-game-lobby.png");
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`Saved: ${shot3}`);

    // 4. Interactive Drawing Board & Room View
    console.log("📸 [4/8] Capturing Interactive Drawing Canvas & Game Arena...");
    const shot4 = path.join(SCREENSHOTS_DIR, "04-game-canvas-tools.png");
    await page.screenshot({ path: shot4, fullPage: false });
    console.log(`Saved: ${shot4}`);

    // 5. Mobile Landing Page
    console.log("📱 Setting up Mobile Viewport (iPhone 14 / 390x844)...");
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    console.log("📸 [5/8] Capturing Mobile Landing Page...");
    await mobilePage.goto(TARGET_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await mobilePage.evaluate(() => {
      const input = document.querySelector('input[placeholder*="MasterArtist"]');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(input, "PocketArtist");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 800));
    const shot5 = path.join(SCREENSHOTS_DIR, "05-mobile-landing.png");
    await mobilePage.screenshot({ path: shot5, fullPage: false });
    console.log(`Saved: ${shot5}`);

    // 6. Mobile Game Page with On-Screen Chat & Guess Bar
    console.log("📸 [6/8] Capturing Mobile Gameplay (with Main-Screen Chat Input)...");
    const roomUrl = `${TARGET_URL}/play/${uniqueRoomId}`;
    await mobilePage.goto(roomUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Type a sample guess into the mobile on-screen chat
    const mobileChatInput = await mobilePage.$('input[placeholder*="Type your"], input[placeholder*="guess"]');
    if (mobileChatInput) {
      await mobileChatInput.type("Pizza!", { delay: 25 });
      await mobilePage.keyboard.press("Enter");
      await new Promise((r) => setTimeout(r, 800));
    }

    const shot6 = path.join(SCREENSHOTS_DIR, "06-mobile-gameplay.png");
    await mobilePage.screenshot({ path: shot6, fullPage: false });
    console.log(`Saved: ${shot6}`);

    // 7. Mobile Players & Video Drawer Bottom Sheet
    console.log("📸 [7/8] Capturing Mobile Sliding Players & Video Drawer...");
    const mobilePlayersBtn = await mobilePage.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      return buttons.find((b) => b.textContent && b.textContent.includes("Players"));
    });

    if (mobilePlayersBtn && mobilePlayersBtn.asElement()) {
      await mobilePlayersBtn.asElement().click();
      await new Promise((r) => setTimeout(r, 1000));
    }

    const shot7 = path.join(SCREENSHOTS_DIR, "07-mobile-drawer.png");
    await mobilePage.screenshot({ path: shot7, fullPage: false });
    console.log(`Saved: ${shot7}`);

    console.log("🎉 All visual tour screenshots captured successfully!");
  } catch (err) {
    console.error("❌ Error during screenshot automation:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

run();
