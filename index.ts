import vacationSheetDownloader from './vacation_sheet_downloader';
import vacationSheetExtractor from './vacation_sheet_extractor';
import path from "path";
import fs from 'fs';

console.log('germany vacations API start');

/**
 * Download current vacation sheets PDFs
 */
const vacDownloader = new vacationSheetDownloader();
vacDownloader.download();


/**
 * Extract vaction dates from PDF files.
 */
const pdfDir = 'vacation_sheets';
const vacationSheetsPath = path.join(__dirname, `../${pdfDir}`);

const vacExtractor = new vacationSheetExtractor();

vacExtractor.extractVacationSheets(vacationSheetsPath).then(vacationDateSheets => {
   fs.writeFile(`vacationSheets.json`, JSON.stringify(vacationDateSheets), 'utf8', () => {
      console.log('Writing file with vacationDateSheets successful.');
   });
});
