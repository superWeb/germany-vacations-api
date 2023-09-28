import vacationSheetExtractor from './vacation_sheet_extractor';
import path from "path";
import fs from 'fs';

console.log('germany vacations API start');

const pdfDir = 'vacation_sheets';
const vacationSheetsPath = path.join(__dirname, `../${pdfDir}`);

const vacExtractor = new vacationSheetExtractor();

vacExtractor.extractVacationSheets(vacationSheetsPath).then(vacationDateSheets => {
   fs.writeFile(`vacationSheets.json`, JSON.stringify(vacationDateSheets), 'utf8', () => {
      console.log('Writing file with vacationDateSheets successful.');
   });
});
