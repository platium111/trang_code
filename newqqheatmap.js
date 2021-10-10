const express = require('express');
const axios = require("axios");

var app = express();
var server = app.listen(3000);
server.keepAliveTimeout = 30000;

const createCsvWriter = require('csv-writer').createObjectCsvWriter;

fs = require('fs');

// Overpassing CORC
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

const logger = fs.createWriteStream('errorsHeatmap.txt', {
  flags: 'a' // 'a' means appending (old data will be preserved)
})

async function asynFetchData(arrayDates, waitingTime = 8000, errorDates) {
  (async () => {
    // create folder to save data
    const dir = './heatmap';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    console.log("Start fetching....")
    await Promise.all(arrayDates.map((item, i) => new Promise(res => setTimeout(() => {
      // doing logic here
      fetchData(item, errorDates);

      res();
    }, i * waitingTime))));
    console.log("loop/timeout is done executing");

    // log error dates into file
    if(errorDates.length > 0) {
      fs.appendFile(`errorsHeatmap.txt`, errorDates.toString(), function (err) {
        if (err) return console.log(err);
        console.log(`Write file > ${date}.txt`);    });
    } else {
      console.log(`RESULT: Write ${arrayDates.length} successfully`)
    }
  })();
}

function fetchData(fullDate, errorDates) {
  // https://heat.qq.com/api/getHeatDataByDate.php?region_id=515&date=2021-04-01&sub_domain=
  const fullDateFormated = fullDate.replace('%3A', '')
  const url = `https://heat.qq.com/api/getHeatDataByDate.php?region_id=515&date=${fullDate}&sub_domain=`;
  console.log('url=', url);
  console.log('fulldate', fullDateFormated)
    axios.get(url, {
      timeout: 5000,
      headers: {
        Host: 'heat.qq.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language':'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        Connection: 'keep-alive',
        Cookie: 'PHPSESSID=nou562dkmbi6km9so172rvdr14',
        'Upgrade-Insecure-Requests': 1,
        'Content-Encoding': 'identity'
      },
      method: 'get',
      crossdomain: true 
      })
    .then(function(response) {
      console.log('vao day')
      const {data} = response;
      console.log('data response', data)
      const csvWriter = createCsvWriter({
        path: `./heatmap/${fullDateFormated}.csv`,
        append: true,
        header: [
          {id: 'url', title: 'URL'},
          {id: 'key', title: 'Key'},
          {id: 'value', title: 'Value'},
        ]
      });
      const csvValueFormated = data && Object.keys(data).map(key => {
        return {url, key, value: data[key]};
      });
      csvWriter
        .writeRecords(csvValueFormated)
        .then(()=> console.log(`Write file > ${fullDateFormated}.csv successfully`))
        .catch((err)=> {
          errorDates.push(fullDate);
          console.log(err)
          console.log(`Write error > ${fullDateFormated}.csv`)
        }); 
    })
    .catch(function(error) {
      errorDates.push(fullDate);
      // handle error
      console.log(`Writing log error of ${fullDateFormated}.txt`)
    })
}

const buildFullDate = (dates, hours, minutes) => {
    const fullArrayDates = dates.reduce((accumulator, date) => {
      const buildHourMinuteArray = hours.reduce((accum, hour) => {
        const hourMinutesArray = minutes.reduce((accHourMinute, minute) => {
          return [...accHourMinute, `${hour}%3A${minute}`]
        }, [])
        return [...accum, ...hourMinutesArray]
      }, []);
      const buildFullDateArray = buildHourMinuteArray.map(hourMinute => `${date}+${hourMinute}`)
      return [...accumulator, ...buildFullDateArray];
    }, []);
    return fullArrayDates;
}

function getDaysArray(start, end) {
  let arr;
  for(arr=[],dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
      arr.push(new Date(dt));
  }
  return arr;
};

app.get('/', (req, res) => {
  const FROM_DATE = new Date("2021-07-01"); // dinh dang yyyy-mm-dd
  const END_DATE = new Date("2021-07-02") || new Date();
  const WAITING_TIME = 8000; // cho 8 giay moi lan request
  // * get date array
  const daylist = getDaysArray(FROM_DATE, END_DATE); // Date data type
  const dayArray = daylist.map((v)=> v.toISOString().slice(0,10));

  console.log(`Total need to download ${dayArray.length} files`);

  // ! can use predefined day array
  // muon dung 2 cach -> cach 1: dayArray | cach2: dung customDayArray cho vao tham so dau tien cua ham asyncFetchData
  const customDayArray = ["2020-08-05", "2021-01-07","2021-01-08"]
  const errorDates = [];
  // asynFetchData(dayArray, WAITING_TIME, errorDates);
});
// chay = npm run start1 

const PORT = process.env.PORT || 3000;

server.on('connection', function(socket) {
  console.log("A new connection was made by a client.");
  server.keepAliveTimeout = 0;
  socket.setTimeout(30 * 1000); 
  // 30 second timeout. Change this as you see fit.
});
