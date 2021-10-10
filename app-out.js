const express = require('express');
const axios = require("axios");

fs = require('fs');
const app = express();

// Overpassing CORC
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

const logger = fs.createWriteStream('errors.txt', {
  flags: 'a' // 'a' means appending (old data will be preserved)
})

function asynFetchData(arrayDates, waitingTime = 8000) {
  (async () => {
    await Promise.all(arrayDates.map((item, i) => new Promise(res => setTimeout(() => {
      // doing logic here
      console.log(item);
      fetchData(item)

      res();
    }, i * waitingTime))));
    console.log("loop/timeout is done executing");
  })();

}
function fetchData(date) {
  const url = `http://report.amap.com/cityTravel/inAndOutCity.do?adcode=100000&dt=${date}&willReal=WILL&inOut=OUT&size=500`;
    axios.get(url, {
      timeout: 5000,
      headers: {
        'Authority':'report.amap.com',
        'Cache-Control':'max-age=0',
        'Method': "GET",
        "Path": `/cityTravel/inAndOutCity.do?adcode=100000&dt=${date}&willReal=WILL&inOut=IN&size=500`,
        'Origin':'report.amap.com',
        "Scheme": "https",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36',
        'Content-Type':'application/x-www-form-urlencoded',
        'Accept-Encoding':'gzip, deflate, br',
        "Sec-Fetch-Dest": "document",
        'Accept-Language':'en,vi-VN;q=0.9,vi;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5',
        'Cookie': "user_unique_id=a187b9ae738e3f310173b8b4826d52a4"
      },
      method: 'get',
      crossdomain: true 
      })
    .then(function(response) {
      // writing to file
      fs.appendFile(`${date}.txt`, JSON.stringify(response.data, null, 4), function (err) {
        if (err) return console.log(err);
        console.log(`Write file > ${date}.txt`);    });
      
    })
    .catch(function(error) {
      // handle error
      console.log(`Writing log error of ${date}`)
      logger.write(`${date}\n`);
    })
}

function getDaysArray(start, end) {
  let arr;
  for(arr=[],dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
      arr.push(new Date(dt));
  }
  return arr;
};

app.get('/', (req, res) => {
  const FROM_DATE = new Date("2020-08-05"); // dinh dang yyyy-mm-dd
  const END_DATE = new Date("2021-01-08") || new Date();
  const WAITING_TIME = 8000; // cho 8 giay moi lan request
  // * get date array
  const daylist = getDaysArray(FROM_DATE, END_DATE);
  const dayArray = daylist.map((v)=> v.toISOString().slice(0,10))
  
  // ! can use predefined day array
  // muon dung 2 cach -> cach 1: dayArray | cach2: dung customDayArray cho vao tham so dau tien cua ham asyncFetchData
  const customDayArray = ["2019-02-21", "2019-06-08", "2019-09-07", "2019-11-13", "2019-11-07", "2019-12-28", "2020-03-05",
    "2020-03-09", "2020-03-24"]
  asynFetchData(dayArray, WAITING_TIME);
});
// chay = npm start

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));