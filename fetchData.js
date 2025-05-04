const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');


async function runChartinkScan() {
  try {
    
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar, withCredentials: true }));
    // Step 1: Visit the Chartink screener page to get cookies and CSRF token
    await client.get('https://chartink.com/screener/');

    // Step 2: Extract CSRF token from cookies
    const cookies = await jar.getCookies('https://chartink.com');
    const xsrfCookie = cookies.find(c => c.key === 'XSRF-TOKEN');
    const csrfToken = xsrfCookie ? decodeURIComponent(xsrfCookie.value) : null;

    if (!csrfToken) {
      throw new Error('CSRF token not found in cookies');
    }

    // Step 3: Make POST request with token in both header and body
    const scanClause = `( {cash} ( ( {cash} ( ( {cash} ( weekly macd line( 21,3,9 ) >= weekly macd signal( 21,3,9 ) and weekly ha-close  > weekly "wma( ( ( 2 * wma( (weekly ha-close ), 15) ) - wma((weekly ha-close ), 30) ), 5)" and 1 week ago  ha-close  <= 1 week ago  "wma( ( ( 2 * wma( (weekly ha-close ), 15) ) - wma((weekly ha-close ), 30) ), 5)" and 1 week ago ha-close  < weekly "wma( ( ( 2 * wma( (1 week ago min( 12 , weekly ha-close  )), 15) ) - wma((1 week ago min( 12 , weekly ha-close  )), 30) ), 5)" ) ) or( {cash} ( weekly ha-close  >= weekly "wma( ( ( 2 * wma( (weekly ha-close ), 15) ) - wma((weekly ha-close ), 30) ), 5)" and 1 week ago ha-close  < weekly "wma( ( ( 2 * wma( (1 week ago min( 12 , weekly ha-close  )), 15) ) - wma((1 week ago min( 12 , weekly ha-close  )), 30) ), 5)" and weekly macd line( 11,3,9 ) > weekly macd signal( 11,3,9 ) and 1 week ago  macd line( 11,3,9 ) <= 1 week ago  macd signal( 11,3,9 ) and 1 week ago max( 7 , 1 week ago macd histogram( 21,3,9 ) ) < 0 ) ) ) ) and weekly wma( weekly rsi( 9 ) , 11 ) < weekly rsi( 9 ) and latest close > 50 and 1 day ago volume > 50000 and market cap > 1000 and weekly macd histogram( 21,3,9 ) > 0 and weekly ha-close  > weekly ha-open  and latest close > latest open and weekly min( 10 , weekly macd histogram( 21,3,9 ) ) < -20 and weekly volume > weekly sma( weekly close , 7 ) ) ) `;

    const formData = new URLSearchParams();
    formData.append('scan_clause', scanClause);
    formData.append('max_rows', '30');

    const response = await client.post(
      'https://chartink.com/backtest/process',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-XSRF-TOKEN': csrfToken,
          'cookie':cookies[0]
        }
      }
    );

    return {stocks:response.data.aggregatedStockList.reverse() ,timeFrame:  response.data.metaData[0].tradeTimes.reverse()}    
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
};

async function getZerodhaMarginMTF() {
    let res = await axios.get('https://public.zrd.sh/crux/approved-mtf-securities.json');
    return res.data;
}

module.exports = {
    runChartinkScan,
    getZerodhaMarginMTF
}
