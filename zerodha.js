require("dotenv").config();
const puppeteer = require("puppeteer");
const { TOTP } = require('totp-generator');
const { KiteConnect } = require("kiteconnect");

const {
  Z_USERNAME,
  Z_PASSWORD,
  Z_TOTP_SECRET,
  Z_API_KEY,
  Z_API_SECRET
} = process.env;
const { otp, expires } = TOTP.generate(Z_TOTP_SECRET)


async function getRequestToken() {
  const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${Z_API_KEY}`;

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(loginUrl, { waitUntil: "networkidle2" });

  // Fill login form
  await page.type("input[id='userid']", Z_USERNAME);
  await page.type("input[placeholder='Password']", Z_PASSWORD);
  await page.click("button[type='submit']");

  // Generate and fill TOTP
  
  await page.type("input[placeholder='••••••']", otp);
//   await page.click("button[type='submit']");

  // Get redirected URL with request_token


  
  const currentUrl = page.url();
  const requestTokenMatch = currentUrl.match(/request_token=([^&]+)/);
  

  await browser.close();

  if (!requestTokenMatch) throw new Error("Request token not found in URL.");
  return requestTokenMatch[1];
}

async function getAccessToken(requestToken) {
  const kc = new KiteConnect({ api_key: Z_API_KEY });
  const session = await kc.generateSession(requestToken, Z_API_SECRET);
  return session.access_token;
}

async function main() {
  try {
    const requestToken = await getRequestToken();
    console.log("✅ Request Token:", requestToken);

    const accessToken = await getAccessToken(requestToken);
    console.log("🔐 Access Token:", accessToken);

    // You can now use this access token to fetch balance, orders, etc.

    // Optional: Save it to a file for the day
    const fs = require("fs");
    fs.writeFileSync("access_token.txt", accessToken);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

main();
