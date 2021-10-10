const puppeteer = require("puppeteer");
const firefoxOptions = {
  product: "firefox",
  extraPrefsFirefox: {
    // Enable additional Firefox logging from its protocol implementation
    // 'remote.log.level': 'Trace',
  },
  // Make browser logs visible
  dumpio: true,
};
(async () => {
  const browser = await puppeteer.launch(firefoxOptions);
  const page = await browser.newPage();
  await page.goto(
    "https://heat.qq.com/api/getHeatDataByTime.php?region_id=786&datetime=2021-03-06+00%3A00%3A00&sub_domain="
  );
  await page.screenshot({ path: "example.png" });

  await browser.close();
})();
