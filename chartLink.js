import puppeteer from "puppeteer";
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
dotenv.config();
async function getStocksFromChartink() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });  const page = await browser.newPage();
  await page.goto("https://chartink.com/login", { waitUntil: 'networkidle2' });

  // Fill in credentials
  await page.type('input[name="email"]', process.env.CHARTINKEMAIL);
  await page.type('input[name="password"]', process.env.CHARTINKPASSWORD);

  console.log("Solve CAPTCHA manually...");

  // Wait for navigation after solving CAPTCHA and submitting
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    await page.click('.g-recaptcha')  
  ]);

  // Navigate to screener page to extract CSRF token
  await page.goto("https://chartink.com/screener/swing-setup-7869663837", { waitUntil: 'networkidle2' });

  // Get CSRF token from meta tag
  const csrfToken = await page.$eval('meta[name="csrf-token"]', el => el.content);

  // Get cookies and format them for axios
  const cookies = await page.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

  console.log("✅ Login successful");
  console.log("🔐 CSRF Token:", csrfToken);
  console.log("🍪 Cookies:", cookieHeader);

  // Close browser (optional)
  await browser.close();

  // Set headers for axios
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Origin": "https://chartink.com",
    "Referer": "https://chartink.com/screener/swing-setup-7869663837",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "X-CSRF-TOKEN": csrfToken,
    "Cookie": cookieHeader,
  };

  // Payload
  const payload = {
    scan_clause: `
( {1251110} ( ( {1251110} ( ( {1251110} ( weekly macd line( 21,3,9 ) >= weekly macd signal( 21,3,9 ) and weekly ha-close  > weekly "wma( ( ( 2 * wma( (weekly ha-close ), 15) ) - wma((weekly ha-close ), 30) ), 5)" and 1 week ago  ha-close  <= 1 week ago  "wma( ( ( 2 * wma( (weekly ha-close ), 15) ) - wma((weekly ha-close ), 30) ), 5)" and 1 week ago ha-close  < weekly "wma( ( ( 2 * wma( (1 week ago min( 12 , weekly ha-close  )), 15) ) - wma((1 week ago min( 12 , weekly ha-close  )), 30) ), 5)" ) ) or( {1251110} ( weekly ha-close  >= weekly "wma( ( ( 2 * wma( (weekly ha-close ), 15) ) - wma((weekly ha-close ), 30) ), 5)" and 1 week ago ha-close  < weekly "wma( ( ( 2 * wma( (1 week ago min( 12 , weekly ha-close  )), 15) ) - wma((1 week ago min( 12 , weekly ha-close  )), 30) ), 5)" and weekly macd line( 11,3,9 ) > weekly macd signal( 11,3,9 ) and 1 week ago  macd line( 11,3,9 ) <= 1 week ago  macd signal( 11,3,9 ) and 1 week ago max( 7 , 1 week ago macd histogram( 21,3,9 ) ) < 0 ) ) ) ) and weekly wma( weekly rsi( 9 ) , 11 ) < weekly rsi( 9 ) and latest close > 50 and 1 day ago volume > 50000 and market cap > 1000 and weekly macd histogram( 21,3,9 ) > 0 and weekly ha-close  > weekly ha-open  and latest close > latest open and weekly min( 10 , weekly macd histogram( 21,3,9 ) ) < -20 and weekly volume > weekly sma( weekly close , 7 ) ) ) `
  };

  // Make the request to Chartink
  try {
    const res = await axios.post(
      "https://chartink.com/screener/process",
      qs.stringify(payload),
      { headers }
    );

    console.log("📊 Screener Results:");
    console.dir(res.data, { depth: null });
    return res.data;
  } catch (error) {
    console.error("❌ Request failed:");
    console.error(error.response?.data || error.message);
  }
};

export{
  getStocksFromChartink,
};
