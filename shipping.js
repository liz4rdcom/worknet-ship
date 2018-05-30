const rp = require('request-promise');
const http = require('http');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const request = require('request');

const circleci_working_dir='circleci/repo/';

let pool = new http.Agent();
pool.maxSockets = 100;

const webFontExtensions = ['eot', 'ttf', 'woff', 'woff2']

function requestOptions(buildNumber, token) {
    const url = `https://circleci.com/api/v1.1/project/github/liz4rdcom/worknet/${buildNumber}/artifacts?circle-token=${token}`

    var options = {
        uri: url,
        json: true,
        strictSSL: false
    };

    return options
}

function generateFileFullPath(url,buildNumber) {
  let wdirindex = url.indexOf(circleci_working_dir);
  if(wdirindex===-1) throw new Error('cant find working dir');

  let pathToSave = url.substring(wdirindex+circleci_working_dir.length);

  const pathToCreate = path.dirname(pathToSave);

  let fullDir = `${buildNumber}/${pathToCreate}`;
  mkdirp.sync(fullDir);

  return `${buildNumber}/${pathToSave}`;
}

async function downloadAndSaveArtifactItem(url,buildNumber){

    let options = {
        strictSSL: false,
        pool: pool
    };

    try {
        let fullPath = generateFileFullPath(url, buildNumber)

        let fileStream = fs.createWriteStream(fullPath)

        return await new Promise(function (resolve, reject) {
          fileStream.on('finish', function () {
            resolve(`OK-${options.uri}`)
          })

          fileStream.on('error', reject)

          console.log('saving-',fullPath)

          request(url, options).pipe(fileStream)
        })

    } catch (error) {
        console.error(error);
        return `Error-${options.uri}`;
    }
}

async function fetchArtifacts(buildNumber, token) {
    try {
        outDir=buildNumber;
        let response  = await  rp(requestOptions(buildNumber, token));

        let downloadStatus = await Promise.all(response.map(async t=>{
            return await downloadAndSaveArtifactItem(t.url,buildNumber);
        }));

        console.log('fetch artifacts done');
        return downloadStatus;
    } catch (error) {
        console.error(error);
    }


}

module.exports = fetchArtifacts
