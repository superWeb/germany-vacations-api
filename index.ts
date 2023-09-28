import vacationSheetDownloader from './vacation_sheet_downloader';
import vacationSheetExtractor from './vacation_sheet_extractor';
import path from "path";
import fs from 'fs';

console.log('germany vacations API start');

const pdfDir = 'vacation_sheets';
const vacationSheetsPath = path.join(__dirname, `../${pdfDir}`);

downloadAndExtract(vacationSheetsPath);

async function downloadAndExtract(folderPath: string){
   /**
    * Download current vacation sheet PDFs
    */
   const vacDownloader = new vacationSheetDownloader(folderPath);
   await vacDownloader.download();

   /**
    * Extract vaction dates from PDF files.
    */
   const vacExtractor = new vacationSheetExtractor();

   vacExtractor.extractVacationSheets(folderPath).then(vacationDateSheets => {
      fs.writeFile(`vacationSheets.json`, JSON.stringify(vacationDateSheets), 'utf8', () => {
         console.log('Writing file with vacationDateSheets successful.');
      });
   });

}
