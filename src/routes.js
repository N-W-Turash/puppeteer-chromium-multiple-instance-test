import { Router } from 'express';
import request from 'request';
import puppeteer from 'puppeteer';
import { Cluster } from 'puppeteer-cluster';
require('dotenv').config();

const routes = Router();

routes.get('/', (req, res) => {
  res.render('index', { title: 'Multiple chromium instance testing' });
});

routes.get('/multi-user-test', async (req, res) => {

  console.log('process.env.USER_ONE->', process.env.USER_ONE);

  (async () => {

    try {
      const cluster = await Cluster.launch({
        concurrency: Cluster.CONCURRENCY_BROWSER,
        maxConcurrency: 4,
        puppeteerOptions: {
          headless: false
        },
        timeout: 80000,
        retryLimit: 5,
        monitor: true
      });

      // Define a task (in this case: screenshot of page)
      await cluster.task(async ({ page, data: data }) => {
        await page.goto(data.split('|')[0]);

        try {
          const emailSelector = "#email";
          const passwordSelector = "#password";
          const buttonSelector = "form > fieldset > div.form-group > div > button.btn";

          await page.click(emailSelector);
          await page.keyboard.type(data.split('|')[1]);
          await page.click(passwordSelector);
          await page.keyboard.type(data.split('|')[2]);
          await page.click(buttonSelector);
          await page.waitForNavigation({ timeout: 80000 });
          await page.goto(process.env.PAGE_URL);
          await page.waitFor("div.pull-right-lg.pull-right-md.ocr-count-holder > p.font-small.fw-500", { timeout: 80000 });
          const path = 'OCR' + Date.now() + '.png';
          await page.screenshot({ path: `screenshots/${path}` });
          console.log(`Screenshot of the OCR page of user ${data.split('|')[1]} saved to: ${path}`);
        }

        catch (error) {
          console.log('error->', error);
        }
      });

      const url = process.env.URL;
      // Add some pages to queue
      await cluster.queue(`${url}|${process.env.USER_ONE}|${process.env.PASS_ONE}`);
      await cluster.queue(`${url}|${process.env.USER_TWO}|${process.env.PASS_TWO}`);
      await cluster.queue(`${url}|${process.env.USER_THREE}|${process.env.PASS_THREE}`);
      await cluster.queue(`${url}|${process.env.USER_FOUR}|${process.env.PASS_FOUR}`);

      // Shutdown after everything is done
      // await cluster.idle();
      // await cluster.close();
    }

    catch (error) {
      console.log('error->', error);
    }
  })();
});

export default routes;
