import vacationSheetDownloader from './vacation_sheet_downloader';
import vacationSheetExtractor, { VacationDateSheet } from './vacation_sheet_extractor';
import path from "path";
import fs from 'fs';
import express from 'express';
import crypto from 'crypto';

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
   if(reqYear > 1900 && reqYear < 9999) {
      result = vacationDateSheets.find((sheet: VacationDateSheet) => sheet.schoolYearStart === reqYear);
   }
   res.json(result);
})

app.get('/vacation-sheets/update/:key', async (req, res) => {
   if(req.params['key'].length > 10 && req.params['key'] === UPDATE_VACATION_KEY) {

      vacationDateSheets = await downloadAndExtract(vacationSheetsPath);

      fs.writeFile(savedFileName, JSON.stringify(vacationDateSheets), 'utf8', () => {
         console.log('Writing file with vacationDateSheets successful.');
      });

      return res.json({message: 'Update of vacation sheets successfull.'});
   
   }
   res.json({error: 'Key not valid.'});
})

app.listen(port, () => {
   console.log(`Vacations API listening on port ${port}`)
})

fs.readFile(savedFileName, 'utf8', (err, data) => {
   if (err) {
      console.error(err);
      return;
   }
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

   return await vacExtractor.extractVacationSheets(folderPath);
}
