import { execSync } from "child_process";
import os from 'os';
import fs from 'fs';
import path from "path";

class VacationSheetExtractor {

    TABULA_JAR_PATH = 'lib/tabula-1.0.5-jar-with-dependencies.jar';

    vacationDateSheets = [] as VacationDateSheet[];

    constructor() { }

    public async extractVacationSheets(vacationSheetsPath: string): Promise<VacationDateSheet[]> {
        this.convertPdfTableFilesToJson(vacationSheetsPath);

        this.vacationDateSheets = await this.extractVactionSheetsFromJsonFiles(vacationSheetsPath);

        return this.vacationDateSheets;
    }

    private convertPdfTableFilesToJson(vacationSheetsPath: string) {

        const tubulaCommand = `java -Dfile.encoding=utf-8 -jar ${this.TABULA_JAR_PATH} --spreadsheet --use-line-returns --format JSON --batch ${vacationSheetsPath}`;

        try {
            const execOutput = execSync(tubulaCommand).toString();
            if (execOutput === '') {
                console.log('Converted all .pdf files to .json' + os.EOL);
            } else {
                throw new Error('Something went wrong while converting.');
            }
        } catch (error) {
            console.error('Error on converting .pdf files to .json');
        }

    }

    private async extractVactionSheetsFromJsonFiles(vacationSheetsPath: string): Promise<VacationDateSheet[]> {

        const files = await fs.promises.readdir(vacationSheetsPath);
        const jsonFiles = files.filter((file: string) => file.endsWith('.json'));

        const vacationDateSheets = [] as VacationDateSheet[];

        for (const jsonFile of jsonFiles) {

            const rawFileName = jsonFile.split('.')[0];
            const manualFileSuffix = '_MANUAL_OVERRIDE';
            const jsonFileMaunal = `${rawFileName}${manualFileSuffix}.json`;
            if (jsonFiles.includes(jsonFileMaunal)) {
                // a manual export of a tabula file exist, so skip the automated generated file
                // some .pdf files can be only correctly exported with the tabula UI version or with a different java version
                console.log(`Using file ${jsonFileMaunal} instead of ${jsonFile}`);
                continue;
            }

            console.log(`Processing file: ${jsonFile}`);
            const vactionSheet = await this.processTabulaJsonFile(path.join(vacationSheetsPath, jsonFile));
            vacationDateSheets.push(vactionSheet);
            console.log('');

        }

        vacationDateSheets.sort((a, b) => {return a.schoolYearStart-b.schoolYearStart});
        return vacationDateSheets;
    }

    private async processTabulaJsonFile(jsonFilePath: string): Promise<VacationDateSheet> | null {
        const fileData = await fs.promises.readFile(jsonFilePath);
        const jsonData = fileData.toString();

        const tabulaObject = JSON.parse(jsonData);
        const table = tabulaObject[0].data;
        // console.log(JSON.stringify(table))
        const preparedTable = this.removeEmptyCellsAndRowsFromTable(table);

        if (preparedTable.length !== 17) console.warn('Table data maybe incomplete! Unexpected number of rows!');

        preparedTable.forEach((row: any, rowIdx: number) => {
            if (row.length !== 7) console.warn(`Table data maybe incomplete! Unexpected number of columns in row ${rowIdx}`);
        });

        // console.log(os.EOL)
        // console.log(JSON.stringify(preparedTable))

        return this.processTabulaTable(preparedTable)
    }

    private removeEmptyCellsAndRowsFromTable(table: any): any {
        let previousTableLength = table.length;
        let emptyCellsInNonEmptyRow = 0;
        for (let i = 0; i < table.length; i++) {

            const rowEmpty: boolean = table[i].every((cell: any) => cell.text === '');
            // remove a complete empty row
            if (rowEmpty) {
                table.splice(i, 1);
                i--;
                continue;
            }

            if (table[i].length > 7) {
                // remove single empty cells
                table[i] = table[i].filter((cell: any) => {
                    emptyCellsInNonEmptyRow++;
                    return cell.text !== '';
                });
            }

            // remove complete row, something wrong
            if (table[i].length < 7) {
                table.splice(i, 1);
                i--;
                continue;
            }

        }

        if (previousTableLength !== table.length) {
            console.log(`Removed ${previousTableLength - table.length} complete rows.`);
        }

        if (emptyCellsInNonEmptyRow) {
            console.log(`Removed ${emptyCellsInNonEmptyRow} empty cells.`);
        }

        return table;

    }

    private processTabulaTable(table: any): VacationDateSheet {
        const firstCell = table[0][1].text.replace(/\s/g, "");; // Herbst20xx
        const schoolYearStart = parseInt(firstCell.substr(firstCell.length - 4));

        if (schoolYearStart < 1900 || schoolYearStart > 9999) {
            console.error('Wrong school year:', schoolYearStart); return;
        }

        let vacationSheet: VacationDateSheet = {
            schoolYearStart,
            federalStates: [],
        }

        let headline = table[0];
        for (let i = 0; i < table.length; i++) {

            let federalState: FederalState = {
                code: '',
                displayName: '',
                vacations: [],
            };

            for (let j = 0; j < table[i].length; j++) {
                const tableCell = table[i][j].text;
                let vacation = {} as Vacation;
                if (i > 0) {
                    if (j === 0) {
                        const stateCode = this.getFederalStateCode(tableCell);
                        if (stateCode) {
                            federalState.code = this.getFederalStateCode(tableCell);
                            federalState.displayName = FEDERAL_STATE_NAMES[federalState.code];
                        }

                    }
                    if (j > 0) {
                        vacation.type = this.getVactionType(headline[j].text);
                        vacation.dates = this.getVacationDatesFromCellStr(tableCell, this.getVactionYears(headline[j].text));
                        federalState.vacations.push(vacation);
                    }
                }
            }

            if (federalState.code) {
                vacationSheet.federalStates.push(federalState);
            }
        }

        if (vacationSheet.federalStates.length !== 16) {
            console.warn(`Found only ${vacationSheet.federalStates.length} federal states. Might be missing some!`);
        }

        // console.log('Vacation Sheet: ', vacationSheet);

        return vacationSheet;

    }

    private getFederalStateCode(federalStateTableName: string): string | null {
        const firstWord = federalStateTableName.split(' ')[0];
        for (let [code, name] of Object.entries(FEDERAL_STATE_NAMES)) {
            if (firstWord.includes('-') && !name.includes('-')) {
                // avoid mismatch between 'Sachsen' and 'Sachsen-Anhalt'
                continue;
            }
            if (firstWord.includes(name)) return code;
        }

        return null;
    }

    private getVactionType(headlineName: string): VacationType | null {
        if (headlineName.includes('Herbst')) return VacationType.AUTUMN;
        if (headlineName.includes('Weihnachten')) return VacationType.CHRISTMAS;
        if (headlineName.includes('Winter')) return VacationType.WINTER;
        if (headlineName.includes('Ostern')) return VacationType.EASTERN;
        if (headlineName.includes('Himmelfahrt')) return VacationType.ASCENSION;
        if (headlineName.includes('Sommer')) return VacationType.SUMMER;
        console.error('Found no vacationType for string:', headlineName);
        return null;
    }

    private getVacationDatesFromCellStr(vacationDatesCellStr: string, years: number[]): VacationPeriod[] {
        const strSpaceFree = vacationDatesCellStr.replace(/\s/g, "");  // remove all whitespaces
        if (strSpaceFree === '-' || strSpaceFree === '--' || strSpaceFree === '') return [];

        let result: VacationPeriod[] = [];
        const linesDateStr = vacationDatesCellStr.split('\r'); // split in lines
        const lines = linesDateStr.map(line => line.replace(/\s/g, ""));  // remove all whitespaces

        lines.forEach(line => {
            /**
             * handle listing of vacation dates, e.g.:
             * - 9.05./30.05
             * - 30.04. und 02.05.
             * - 31.05./07.06. - 11.06.
             * - 24.05./ 26.05. und
             */
            const shortStrDates = line.split(/\/|und|\+/); // split by "/", "und", "+"
            shortStrDates.forEach(shortStrDate => {
                result = [...result, ...this.getVacationDatesFromStr(shortStrDate, years)];
            });

        });

        return result;
    }

    private getVactionYears(headlineName: string): number[] {
        let result: number[] = [];
        const strSpaceFre = headlineName.replace(/\s/g, ""); // remove all whitespaces
        const lastYear = strSpaceFre.slice(-4);
        const yearDivider = strSpaceFre.substring(strSpaceFre.length - 5, strSpaceFre.length - 4); // looking for /

        if (yearDivider === '/') {
            const firstYear = strSpaceFre.substring(strSpaceFre.length - 9, strSpaceFre.length - 5);
            result.push(Number(firstYear));
        }
        result.push(Number(lastYear));

        for (let i = 0; result.length < i; i++) {
            if (!(result[i] > 1900 && result[i] < 9999)) {
                console.error('Found no vacationYears for string:', headlineName);
                return null;
            }
        }

        return result;
    }

    private getVacationDatesFromStr(vacationDatesStr: string, years: number[]): VacationPeriod[] {
        let result: VacationPeriod[] = [];

        if (vacationDatesStr.length === 6) { // e.g. 19.05.
            const date = this.getIsoDateFromShortStr(vacationDatesStr, years);
            result.push({ from: date, until: date })
        }

        // handle vacation ranges
        const dateSplittingCharsRange = ['–', '-']; // e.g. 17.10. – 29.10. or 24.10. - 04.11.
        dateSplittingCharsRange.forEach(splitCharRange => {
            if (vacationDatesStr.includes(splitCharRange)) {
                const [fromShortDateStr, untilShortDateStr] = vacationDatesStr.split(splitCharRange);
                result.push({
                    from: this.getIsoDateFromShortStr(fromShortDateStr, years),
                    until: this.getIsoDateFromShortStr(untilShortDateStr, years)
                });
            }
        });

        return result;
    }

    private getIsoDateFromShortStr(shortDateStr: string, years: number[]): string {
        const datesArray = shortDateStr.split('.');
        const month = ('0' + datesArray[1]).slice(-2);
        const day = ('0' + datesArray[0]).slice(-2);
        let year = years[0];
        if (years.length > 1 && month === '01') year = years[1];

        let isoDate = `${year}-${month}-${day}`;
        const validIsoDate: boolean = new RegExp(/(\d{4})-[0-1][0-9]-[0-3][0-9]/).test(isoDate); // e.g. valid: 2005-12-07
        if (!validIsoDate) {
            console.error(`Extracted wrong ISO date: ${isoDate} from string: ${shortDateStr}`);
            isoDate = '';
        }

        return isoDate;
    }

}

const FEDERAL_STATE_NAMES: { [index: string]: any } = {
    'DE-BW': 'Baden-Württemberg',
    'DE-BY': 'Bayern',
    'DE-BE': 'Berlin',
    'DE-BB': 'Brandenburg',
    'DE-HB': 'Bremen',
    'DE-HH': 'Hamburg',
    'DE-HE': 'Hessen',
    'DE-MV': 'Mecklenburg-Vorpommern',
    'DE-NI': 'Niedersachsen',
    'DE-NW': 'Nordrhein-Westfalen',
    'DE-RP': 'Rheinland-Pfalz',
    'DE-SL': 'Saarland',
    'DE-SN': 'Sachsen',
    'DE-ST': 'Sachsen-Anhalt',
    'DE-SH': 'Schleswig-Holstein',
    'DE-TH': 'Thüringen',
}

export interface VacationDateSheet {
    schoolYearStart: number;
    federalStates: FederalState[];
}

interface FederalState {
    code: string, // 'DE-NI'
    displayName: string, // 'Niedersachsen'
    vacations: Vacation[],
}

interface Vacation {
    type: VacationType;
    displayName: string, // 'Herbst'
    dates: VacationPeriod[],
}

interface VacationPeriod {
    from: string; // '2022-10-31'
    until: string; // '2022-10-31'
}

enum VacationType {
    AUTUMN = 'AUTUMN', // Herbst
    CHRISTMAS = 'CHRISTMAS', // Weihnachten
    WINTER = 'WINTER', // Winter
    EASTERN = 'EASTERN', // Ostern/Frühling
    ASCENSION = 'ASCENSION', // Himmelfahrt/Pfingsten
    SUMMER = 'SUMMER', // Sommer
}

export default VacationSheetExtractor;
