
# Vacation Dates API for Germany

This project downloads the current PDF sheets with the vacation dates from the official [KMK](https://www.kmk.org/service/ferien.html) office website.
Each PDF file contains a table with the vacation dates for all federal states for one school year.

In the next step the PDFs are parsed with the tool [tabula-java](https://github.com/tabulapdf/tabula-java) to .json files.

The .json files with the raw table content is then converted in a structured format.

The express.js API server provides access to the following REST routes:

| HTTP Method  | Path                           | Description                                                                         |
|--------------|--------------------------------|-------------------------------------------------------------------------------------|
| GET          | /vacation-sheets               | Returns an array of all available vacation sheets                                   |
| GET          | /vacation-sheet/%YEAR%         | Returns a vactions sheet for the given year `%YEAR%`                                  |
| GET          | /vacation-sheets/update/%KEY%  | Triggers an update of vacation sheets. This includes a download of the current<br> vacation PDF files from the offical website. The `%KEY%` is new generate at every start<br>  and is set in the environment variable `UPDATE_VACATION_KEY` |

## Requirements
Node.js has to be installed in version `18.15.0` or higher.

Java has to be installed in version `20.0.2` or higher.

## Development
Install dependencies with `npm install`.
Start project with `npm start`.

## Run API Server with Docker
To easily run the API Server with the depenencies like Node.js and Java you can use the `Dockerfile` to build and run a container.
The API Server is exposed on port 80.

## Remarks

### Manual override .json files
Sometimes `tabula-java` converts the PDF files not always to correct .json files.
(looks like this depends on the used java version or tabula-java version)

In this case a .json file can be manual corrected and be renamed with the suffix `_MANUAL_OVERRIDE` to be used instead of the automatic generated file.

### Asumptions for the extracted vacation date sheets

1. Christmas starts always in december and ends always in january. (otherwise the extractor would lead to wrong dates)
