import { JSDOM } from "jsdom";

class VacationSheetDownloader {


    public async download() {

        const pdfs = await this.fetchPdfDownloadLinks();

        console.log('PDFs for download:', pdfs);
    }

    private async fetchPdfDownloadLinks(): Promise<string[]>{
        const pdfFilesForDownload: string[] = [];

        const baseUrl = 'https://www.kmk.org/';
        const resp = await fetch(`${baseUrl}service/ferien.html`);
        const respText = await resp.text();

        const pageDom = new JSDOM(respText);

        const vacationSheetsLinkSelector = "a[href^='/fileadmin/Dateien/pdf/Ferienkalender/']";
        const linkElements = pageDom.window.document.querySelectorAll(vacationSheetsLinkSelector);

        linkElements.forEach(linkElement => {
            const text = linkElement.textContent;
            const link = linkElement.getAttribute('href');

            if(text.startsWith('Ferientermine im Schuljahr') && link.endsWith('.pdf')){
                pdfFilesForDownload.push(baseUrl+link);
            }
        });

        if(pdfFilesForDownload.length === 0) console.warn('Found no pdf links for vacation sheet download!');

        return pdfFilesForDownload;

    }

}

export default VacationSheetDownloader