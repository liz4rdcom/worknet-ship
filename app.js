var child_process = require('child_process');
const express = require('express')

const fetchArtifacts = require('./shipping')

const app = express()

// var timeout = require('connect-timeout');
// app.use(timeout('10s'));

app.get('/build/:buildNumber', async function (req, res, next) {
    let logs = await fetchArtifacts(req.params.buildNumber, req.query.token);
    res.send({message:'ok',logs});
})

app.get('/start/:buildNumber', async function (req, res, next) {
    try {
        let apiPath=`${__dirname}/${req.params.buildNumber}/api`
        let outData = child_process.execSync(`run.bat "${apiPath}"`);
        let result = new Buffer(outData).toString();
        console.log(result);
        res.send(result)
            
    } catch (error) {
        console.error(error);
        res.send(error)
    }
    
})

app.listen('3001',()=>console.log('start on 3001'));