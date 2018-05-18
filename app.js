const child_process = require('child_process');
const express = require('express');
const fs = require('fs');
const rp = require('request-promise');

const fetchArtifacts = require('./shipping')

const app = express()

let isBuildProccessInProgress = false;
let token = null;

// var timeout = require('connect-timeout');
// app.use(timeout('10s'));

async function getLastBuildInfoFromCircleCI() {
    var options = {
        uri: 'https://circleci.com/api/v1.1/recent-builds?circle-token=eed011939ada4f762ed3178e18fa6118b4c00eca&limit=1',
        json: true,
        strictSSL: false
    };
    let response = await rp(options);
    return {
        build_num: response[0].build_num,
        status: response[0].status
        branch: response[0].branch
    };
}

async function buildAndStart(buildInfo) {
    console.log('triger build', buildInfo.build_num);
    isBuildProccessInProgress = true;
    await fetchArtifacts(buildInfo.build_num, token);
    fs.writeFileSync('lastcircleci.json', JSON.stringify(buildInfo));

    let apiPath = `${__dirname}/${buildInfo.build_num}/api`
    let outData = child_process.execSync(`run.bat "${apiPath}"`);

    isBuildProccessInProgress = false;
}

setInterval(async () => {
    try {
        if (token === null) {
            console.log('token is not defined');
            return;
        }
        if (isBuildProccessInProgress) return;
        let lastCircleCIBuild = await getLastBuildInfoFromCircleCI();
        if (lastCircleCIBuild.status !== 'success') {
            console.log('last build status from circle_ci isnt success', 'current status is : ', lastCircleCIBuild.status)
            return;
        }
        if (lastCircleCIBuild.branch !== 'master') {
            console.log('last build branch from circle_ci isnt master', 'current branch is : ', lastCircleCIBuild.branch)
            return;
        }

        let fileExists = fs.existsSync('lastcircleci.json');
        if (!fileExists) {
            await buildAndStart(lastCircleCIBuild);
        }
        let lastBuild = JSON.parse(fs.readFileSync('lastcircleci.json', 'utf8'));
        if (lastBuild.build_num === lastCircleCIBuild.build_num) {
            return;
        }
        lastBuild.build_num = lastCircleCIBuild.build_num;
        lastBuild.status = lastCircleCIBuild.status;
        await buildAndStart(lastBuild);
    } catch (error) {
        console.error(error);
        isBuildProccessInProgress = false;
    }

}, 1000)

app.get('/build/:buildNumber', async function (req, res, next) {
    let logs = await fetchArtifacts(req.params.buildNumber, req.query.token);
    res.send({ message: 'ok', logs });
})

app.get('/settoken/:token', async function (req, res, next) {
    token=req.params.token;
    res.send({ message: 'ok', token });
})

app.get('/start/:buildNumber', async function (req, res, next) {
    try {
        let apiPath = `${__dirname}/${req.params.buildNumber}/api`
        let outData = child_process.execSync(`run.bat "${apiPath}"`);
        let result = new Buffer(outData).toString();
        console.log(result);
        res.send(result)

    } catch (error) {
        console.error(error);
        res.send(error)
    }

})

app.listen('3001', () => console.log('start on 3001'));
