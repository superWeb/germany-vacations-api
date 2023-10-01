import vacationSheetDownloader from './vacation_sheet_downloader';
import vacationSheetExtractor, { VacationDateSheet } from './vacation_sheet_extractor';
import path from "path";
import fs from 'fs/promises';
import express from 'express';
import crypto from 'crypto';
import schedule from 'node-schedule';

console.log('Vacations API start.');

const app = express()
const port = 80
const UPDATE_VACATION_KEY = crypto.randomBytes(16).toString("hex")
process.env['UPDATE_VACATION_KEY'] = UPDATE_VACATION_KEY
console.log(`Update vacation dates key to ${UPDATE_VACATION_KEY}`)

let vacationDateSheets: VacationDateSheet[] = [];
const pdfDir = 'vacation_sheets';
const savedFileName = 'vacation_sheets.json';
const vacationSheetsPath = path.join(__dirname, `../${pdfDir}`);

app.get('/', (req, res) => {
   res.send('Hello World from Vacations API.');
})

app.get('/vacation-sheets', (req, res) => {
   res.json(vacationDateSheets);
})

app.get('/vacation-sheet/:startSchooYear', (req, res) => {
   const reqYear = parseInt(req.params['startSchooYear']);
   let result = {};
   if (reqYear > 1900 && reqYear < 9999) {
      result = vacationDateSheets.find((sheet: VacationDateSheet) => sheet.schoolYearStart === reqYear);
   }
   res.json(result);
})

app.get('/vacation-sheets/update/:key', async (req, res) => {
   let result: any = {};

   if (req.params['key'].length > 10 && req.params['key'] === UPDATE_VACATION_KEY) {
      await downloadAndExtract(vacationSheetsPath);
      result.message = 'Updated vaction dates.';
   } else {
      result.error = 'Key not valid.';
   }

   res.json(result);
})

app.listen(port, () => {
   console.log(`Vacations API listening on port ${port}`)
})

const file = fs.readFile(savedFileName, 'utf8').then((data: any) => {
   console.log(`Read saved vacations from file: ${savedFileName}`);
   vacationDateSheets = JSON.parse(data);
});

async function downloadAndExtract(folderPath: string): Promise<VacationDateSheet[]> {
   /**
    * Download current vacation sheet PDFs
    */
   const vacDownloader = new vacationSheetDownloader(folderPath);
   await vacDownloader.download();

   /**
    * Extract vaction dates from PDF files.
    */
   const vacExtractor = new vacationSheetExtractor();
   const vacationDateSheets = await vacExtractor.extractVacationSheets(folderPath);

   /**
    * Save vacation dates to file.
    */
   try {
      await fs.writeFile(savedFileName, JSON.stringify(vacationDateSheets), 'utf8');
      console.log('Writing file with vacationDateSheets successful.');
   } catch (err) {
      console.log(err);
   }

   return vacationDateSheets;
}

// update vacation dates each week on thuesday at 08:03 
const cronJob = schedule.scheduleJob('3 8 * * 2', function () {
   console.log('Schedule job started!');
   downloadAndExtract(vacationSheetsPath);
});
