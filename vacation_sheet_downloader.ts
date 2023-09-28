import { JSDOM } from "jsdom";
import fs from 'fs'

class VacationSheetDownloader {

    downloadFolderPath: string;

    constructor(downloadFolderPath: string){
        this.downloadFolderPath = downloadFolderPath;
    }

    public async download() {
        const pdfs = await this.fetchPdfDownloadLinks();
        await this.downloadFiles(pdfs);
    }

    private async fetchPdfDownloadLinks(): Promise<DownloadFile[]> {
        const pdfsForDownload: DownloadFile[] = [];

        const baseUrl = 'https://www.kmk.org';
        const resp = await fetch(`${baseUrl}/service/ferien.html`);
        const respText = await resp.text();

        const pageDom = new JSDOM(respText);

        const vacationSheetsLinkSelector = "a[href^='/fileadmin/Dateien/pdf/Ferienkalender/']";
        const linkElements = pageDom.window.document.querySelectorAll(vacationSheetsLinkSelector);

        linkElements.forEach(linkElement => {
            const text = linkElement.textContent;
            const link = linkElement.getAttribute('href');

            if (text.startsWith('Ferientermine im Schuljahr') && link.endsWith('.pdf')) {
                const splitLink = link.split('/');
                const dwldFile: DownloadFile = {
                    url: baseUrl + link,
                    filename: splitLink[splitLink.length-1],
                }
                pdfsForDownload.push(dwldFile);
            }
        });

        if (pdfsForDownload.length === 0) console.warn('Found no pdf links for vacation sheet download!');
        console.log(`Found ${pdfsForDownload.length} pdf links for downlod.`);

        return pdfsForDownload;

    }

    private async downloadFiles(downloadFiles: DownloadFile[]) {

        for (const file of downloadFiles) {
            const response = await fetch(file.url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await fs.createWriteStream(`${this.downloadFolderPath}/${file.filename}`).write(buffer);
        }

        const filenames = downloadFiles.map((file: DownloadFile) => file.filename)
        console.log(`Downloaded ${downloadFiles.length} files with the names: `, filenames);

        return;
    }

}

interface DownloadFile {
    url: string;
    filename: string;
}

export default VacationSheetDownloader