//terminal things

// node project01.js --excel=worldcup.csv --dest=worldcup --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results 

// mininist - creates objects 
// axios
// jsdom 
// excel4node
// pdf-lib
//process.argv - stores the i/p from the command line in array form
//we hand over process.argv to minimist so that it stores data into objects

let minimist = require("minimist");

let axios = require("axios");
let jsdom = require("jsdom");
let fs = require("fs");
let excel4node = require("excel4node");
let pdf = require("pdf-lib");

let path = require("path");

let args = minimist(process.argv);

let responseKaPromise = axios.get(args.source);
responseKaPromise.then(function (response) {
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = [];

    let matchScoreDivs = document.querySelectorAll("div.match-score-block");

    for (let i = 0; i < matchScoreDivs.length; i++) {
        let match =
        {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        }

        let name = matchScoreDivs[i].querySelectorAll("div.name-detail > p.name");
        match.t1 = name[0].textContent;
        match.t2 = name[1].textContent;

        let scoreSpan = matchScoreDivs[i].querySelectorAll("div.score-detail > span.score");
        if (scoreSpan.length == 2) {
            match.t1s = scoreSpan[0].textContent;
            match.t2s = scoreSpan[1].textContent;
        } else if (scoreSpan.length == 1) {
            match.t1s = scoreSpan[0].textContent;
            match.t2s = "";
        } else {
            match.t1s = "";
            match.t2s = "";
        }

        let spanResult = matchScoreDivs[i].querySelector("div.status-text > span");
        match.result = spanResult.textContent;

        matches.push(match);

    } // end of loop which is requiring the data

    let matchesJson = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJson, "utf-8");

    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        putTeamInTeamsKaArrayifMissing(teams, matches[i])
    }


    for (let i = 0; i < matches.length; i++) {
        putMatchinAppropriateTeam(teams, matches[i])
    }

    let teamsJson = JSON.stringify(teams);
    fs.writeFileSync("teamskaarray.json", teamsJson, "utf-8");



    createExcel(teams);
    createFolder(teams);

    // console.log(teams);
});


function createFolder(teams) {
    if (fs.existsSync(args.dest) == true) {
        fs.rmSync(args.dest, { recursive: true });
    }
    fs.mkdirSync(args.dest);

    for (let i = 0; i < teams.length; i++) {
        let teamsFolder = path.join(args.dest, teams[i].name);
        fs.mkdirSync(teamsFolder);
        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamsFolder, teams[i].matches[j].vs);
            // matchfilename = worldcup/india/pakistan.pdf;
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}

function createScoreCard(teamName, match, matchFileName) {

    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result = match.result;

    let originalBytes = fs.readFileSync("Template.pdf"); // bytes not string

    let promiseToLoadBytes = pdf.PDFDocument.load(originalBytes);
    promiseToLoadBytes.then(function (pdfdoc) {
        let page = pdfdoc.getPage(0);
        page.drawText(t1, {
            x: 210,
            y: 668,
            size: 14
        });
        page.drawText(t2, {
            x: 210,
            y: 652,
            size: 14
        });
        page.drawText(t1s, {
            x: 210,
            y: 635,
            size: 14
        });
        page.drawText(t2s, {
            x: 210,
            y: 620,
            size: 14
        });
        page.drawText(result, {
            x: 210,
            y: 600,
            size: 14
        });

        let promiseToSave = pdfdoc.save();
        promiseToSave.then(function (changedBytes) {
            if (fs.existsSync(matchFileName + ".pdf")) {
                fs.writeFileSync(matchFileName + "1.pdf", changedBytes);
            } else {
                fs.writeFileSync(matchFileName + ".pdf", changedBytes);
            }
        })
    });
}

function createExcel(teams) {

    let wb = new excel4node.Workbook();

    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1, 1).string("v/s");
        sheet.cell(1, 2).string("selfScore");
        sheet.cell(1, 3).string("oppScore");
        sheet.cell(1, 4).string("result");

        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(2 + j, 1).string(teams[i].matches[j].vs)
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore)
            sheet.cell(2 + j, 3).string(teams[i].matches[j].oppScore)
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result)
        }
    }

    wb.write(args.excel);
}


function putTeamInTeamsKaArrayifMissing(teams, match) {
    // team 1
    let t1idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        })
    }
    // team 2
    let t2idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        })
    }
}

function putMatchinAppropriateTeam(teams, match) {
    // team 1
    let t1idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }

    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    });

    // team 2
    let t2idx = -1;

    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }

    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    });

}

