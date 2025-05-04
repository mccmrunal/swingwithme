import { getStocksFromChartink } from './chartLink.js';
import { sendWhatsAppMessages } from './whatsapp.js';
import { runChartinkScan, getZerodhaMarginMTF } from './fetchData.js';

let finalFilteredData = await mapZerodhaToChartlink();

async function mapZerodhaToChartlink() {
  let zerodhaMTFStocks = await getZerodhaMarginMTF();
  let filteredData = await filteredChartLinkData();

  // Create a new array to store only the stocks that are in zerodhaMTFStocks
  let finalFilteredData = [];

  for (let i = 0; i < zerodhaMTFStocks.length; i++) {
    if (filteredData.includes(zerodhaMTFStocks[i].tradingsymbol)) {
      finalFilteredData.push(zerodhaMTFStocks[i].tradingsymbol);
    }
  }
  if (finalFilteredData.length > 0) {
    await sendWhatsAppMessages(`Zerodha MTF Stocks: ${finalFilteredData}`);
  } else {
    await sendWhatsAppMessages(
      `No Zerodha MTF Stocks found in Chartlink , Please check manually`
    );
  }
  return finalFilteredData;
}

async function filteredChartLinkData() {
  let chartLinkData = await runChartinkScan(); // 30 days data
  let chartLinkStocks = await getStocksFromChartink(); // live data from today
  let chartLinkTodayData = chartLinkStocks.data.map((item) => {
    return item.nsecode;
  });

  let next10DaysStocks = [];
  for (let i = 1; i < 10; i++) {
    let dayStocks = chartLinkData.stocks[i];
    for (let j = 0; j < dayStocks.length; j += 3) {
      next10DaysStocks.push(dayStocks[j]);
    }
  }
  let filteredStocks = [];
  for (let i = 0; i < chartLinkTodayData.length; i++) {
    if (!next10DaysStocks.includes(chartLinkTodayData[i])) {
      filteredStocks.push(chartLinkTodayData[i]);
    }
  }

  return filteredStocks;
}
