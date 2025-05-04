let fetchData = require("./fetchData");
let { getStocksFromChartink } = require("./chartLink");
let {sendWhatsAppMessages} = require("./whatsapp");

async function mapZerodhaToChartlink(){

    let zerodhaMTFStocks = await fetchData.getZerodhaMarginMTF();
    let filteredData = await filteredChartLinkData();

// Create a new array to store only the stocks that are in zerodhaMTFStocks
    let finalFilteredData = [];

    for (let i = 0; i < zerodhaMTFStocks.length; i++) {
        if (filteredData.includes(zerodhaMTFStocks[i].tradingsymbol)) {
            finalFilteredData.push(zerodhaMTFStocks[i].tradingsymbol);
        }
    }
    if(finalFilteredData.length > 0){
        await sendWhatsAppMessages(`Zerodha MTF Stocks: ${finalFilteredData}`);
    }else{
        await sendWhatsAppMessages(`No Zerodha MTF Stocks found in Chartlink , Please check manually`);
    }
    return finalFilteredData;
};


async function filteredChartLinkData(){
    let chartLinkData = await fetchData.runChartinkScan();// 30 days data
    let chartLinkStocks = await getStocksFromChartink();// live data from today
    let chartLinkTodayData = chartLinkStocks.data.map((item)=>{
            return item.nsecode;
      
    });
    // let chartLinkTodayData = chartLinkData.stocks[0].filter((item,index)=>{
    //     if(index%3 ===0){
    //         return item;
    //     }
    // });
    let next10DaysStocks = [];
    for(let i=1;i<10;i++){
        let dayStocks = chartLinkData.stocks[i];
        for(let j=0;j<dayStocks.length;j+=3){
            next10DaysStocks.push(dayStocks[j]);
        }
    };
    let filterdStocks = [];
    for(let i=0;i<chartLinkTodayData.length;i++){
        if(!next10DaysStocks.includes(chartLinkTodayData[i])){
            filterdStocks.push(chartLinkTodayData[i]);
        }
    }

    return filterdStocks;

}
mapZerodhaToChartlink()