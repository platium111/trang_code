const express = require("express");
const axios = require("axios");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

fs = require("fs");
const app = express();

// Overpassing CORC
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

const logger = fs.createWriteStream("errors.txt", {
  flags: "a", // 'a' means appending (old data will be preserved)
});

const recursiveDownloadingErrorLinks = (errorDatesObj) => () => {
  // log error dates into file
  if (errorDatesObj && errorDatesObj.length > 0) {
    console.log("----> Total error links: ", errorDatesObj.length);
    console.log("Retrying dowload error file....");
    asynFetchData(errorDatesObj, 8000, []);
  }
  return;
};

async function asynFetchData(arrayDates, waitingTime = 8000, errorDatesObj) {
  (async () => {
    console.log("Start fetching....");
    await Promise.all(
      arrayDates.map(
        (item, i) =>
          new Promise((res) =>
            setTimeout(() => {
              // doing logic here
              fetchData(item, errorDatesObj);

              res();
            }, i * waitingTime)
          )
      )
    );
    setTimeout(recursiveDownloadingErrorLinks(errorDatesObj), 3000);
    console.log("loop/timeout is done executing");
  })();
}

function fetchData(fullDateObj, errorDatesObj) {
  const { fullDate, code, url } = fullDateObj;
  const fullDateFormated = fullDate.replace("%3A", "");
  // const url = `https://heat.qq.com/api/getHeatDataByTime.php?region_id=512&datetime=${fullDate}%3A00&sub_domain=`;
  console.log("url=", url);
  axios
    .get(url, {
      timeout: 5000,
      headers: {
        Authority: "report.amap.com",
        "Cache-Control": "max-age=0",
        Method: "GET",
        Path: `/api/getHeatDataByTime.php?region_id=512&datetime=${fullDate}%3A00&sub_domain=`,
        Origin: "report.amap.com",
        Scheme: "https",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Accept-Language":
          "en,vi-VN;q=0.9,vi;q=0.8,fr-FR;q=0.7,fr;q=0.6,en-US;q=0.5",
        Cookie: "user_unique_id=a187b9ae738e3f310173b8b4826d52a4",
      },
      method: "get",
      crossdomain: true,
    })
    .then(function (response) {
      // create folder to save data
      const dir = `./${code}`;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      const { data } = response;
      const csvWriter = createCsvWriter({
        path: `./${code}/${fullDateFormated}.csv`,
        append: true,
        header: [
          { id: "url", title: "URL" },
          { id: "key", title: "Key" },
          { id: "value", title: "Value" },
        ],
      });
      const csvValueFormated =
        data &&
        Object.keys(data).map((key) => {
          return { url, key, value: data[key] };
        });
      csvWriter
        .writeRecords(csvValueFormated)
        .then(() =>
          console.log(`Write file > ${fullDateFormated}.csv successfully`)
        )
        .catch((err) => {
          errorDatesObj.push(fullDateObj);
          console.log(err);
          console.log(`Write error > ${fullDateFormated}.csv`);
        });
    })
    .catch(function (error) {
      errorDatesObj.push(fullDateObj);
      console.log("error");
      // handle error
      console.log(`Writing log error of ${fullDateFormated}.txt`);
    });
}

const buildFullDate = (dates, hours, minutes) => {
  const fullArrayDates = dates.reduce((accumulator, date) => {
    const buildHourMinuteArray = hours.reduce((accum, hour) => {
      const hourMinutesArray = minutes.reduce((accHourMinute, minute) => {
        return [...accHourMinute, `${hour}%3A${minute}`];
      }, []);
      return [...accum, ...hourMinutesArray];
    }, []);
    const buildFullDateArray = buildHourMinuteArray.map(
      (hourMinute) => `${date}+${hourMinute}`
    );
    return [...accumulator, ...buildFullDateArray];
  }, []);
  return fullArrayDates;
};

const transformDateWithCode = (fullDateArr, codeArr) => {
  const result = codeArr.map((code) => {
    return fullDateArr.map((dateItem) => {
      const url = `https://heat.qq.com/api/getHeatDataByTime.php?region_id=${code}&datetime=${dateItem}%3A00&sub_domain=`;
      return { fullDate: dateItem, url, code };
    });
  });

  return result.flat();
};

function getDaysArray(start, end) {
  let arr;
  for (
    arr = [], dt = new Date(start);
    dt <= end;
    dt.setDate(dt.getDate() + 1)
  ) {
    arr.push(new Date(dt));
  }
  return arr;
}

function range(start, end) {
  return Array(end - start + 1)
    .fill()
    .map((_, idx) => start + idx);
}

app.get("/", (req, res) => {
  const FROM_DATE = new Date("2021-03-06"); // dinh dang yyyy-mm-dd
  const END_DATE = new Date("2021-03-06") || new Date();
  const HOURS = ["00"];
  const MINUTES = ["00", "05"];

  const CODE_LIST = [786];
  const WAITING_TIME = 4000; // cho 8 giay moi lan request
  // * get date array
  const daylist = getDaysArray(FROM_DATE, END_DATE); // Date data type
  const dayArray = daylist.map((v) => v.toISOString().slice(0, 10));
  const fullDateArray = buildFullDate(dayArray, HOURS, MINUTES);

  // build date with CODE LIST
  const transformWithCodeRange = transformDateWithCode(
    fullDateArray,
    CODE_LIST
  );
  console.log(`Total need to download ${transformWithCodeRange.length} files`);

  // ! can use predefined day array
  // muon dung 2 cach -> cach 1: dayArray | cach2: dung customDayArray cho vao tham so dau tien cua ham asyncFetchData
  const customDayArray = ["2020-08-05", "2021-01-07", "2021-01-08"];
  const errorDatesObj = [];
  asynFetchData(transformWithCodeRange, WAITING_TIME, errorDatesObj);
});
// chay = npm run start1

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));

// console.log(`Writing log error of ${fullDateFormated}.txt`);
// fs.appendFile(`errors.txt`, `${url},\n`, function (err) {
//   if (err) return console.log(err);
//   console.log(`Write file > ${url}`);
// });
