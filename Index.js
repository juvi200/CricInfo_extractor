
//node CricinfoExtractor.js --url=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --datafolder=WP --excel=worldcup.csv
//1_Download html from website using axios
//2_Read using JSDOM
//3_Make excel file using excel4node
//4_make pdf using pdf-lib
let minimist=require("minimist");
let axios=require("axios");
let jsdom=require("jsdom");
let excel4node=require("excel4node");
let fs=require("fs");
let pdf=require("pdf-lib");
let path=require("path");

let args=minimist(process.argv);
//here we r getting html from url  using axios lib
let responsepr=axios.get(args.url);
responsepr.then(function(response){
    let html=response.data;
    //console.log(html);

let dom=new jsdom.JSDOM(html);
let document=dom.window.document;

let matchscoreDivs=document.querySelectorAll("div.match-score-block");
console.log(matchscoreDivs.length);

let matches=[];
for(let i=0;i<matchscoreDivs.length;i++)
{

let match={
    t1:"",
    t2:"",
    t1s:"",
    t2s:"",
    result:""
};
let teamNames=matchscoreDivs[i].querySelectorAll("div.name-detail>p.name");
match.t1=teamNames[0].textContent;
match.t2=teamNames[1].textContent;

let scoreSpan=matchscoreDivs[i].querySelectorAll("div.score-detail>span.score");   

if(scoreSpan.length==2)
{
    match.t1s=scoreSpan[0].textContent;
    match.t2s=scoreSpan[1].textContent;
} 
else if(scoreSpan.length==1)
{
    match.t1s=scoreSpan[0].textContent;
    match.t2s="";
}
else{
    match.t1s="";
    match.t2s="";
}

let resultscore=matchscoreDivs[i].querySelector("div.status-text>span");//here not using all coz we want only 1 result from i
match.result=resultscore.textContent;

//now push match array to matches
matches.push(match);
}


let matcheskajson=JSON.stringify(matches);
fs.writeFileSync("matches.json",matcheskajson,"utf-8");
//console.log(matches);
//now we got mathes json now create teams json team name n all its matches
let teams=[];
for(let i=0;i<matches.length;i++)
{
    //now remove all repeated teams and take only 10 teams for 10 files
   
    putTeaminTeamsIfalreadynotThere(teams,matches[i].t1);
    putTeaminTeamsIfalreadynotThere(teams,matches[i].t2);
    

}


for(let i=0;i<matches.length;i++)
{
    putMatchInAppropriateTeam(teams, matches[i].t1, matches[i].t2, matches[i].t1s, matches[i].t2s, matches[i].result);
    putMatchInAppropriateTeam(teams, matches[i].t2, matches[i].t1, matches[i].t2s, matches[i].t1s, matches[i].result);

let teamskajson=JSON.stringify(teams);
fs.writeFileSync("teams1.json",teamskajson,"utf-8");


prepareExcel(teams,args.excel);

//make folders and pdfs for teams

preparepdf(teams,args.datafolder);


}}).catch(function(err)
{
    console.log(err);
})

function preparepdf(teams,datafolder)
{
    //here make folder for data
    if(fs.existsSync(datafolder)==false)
    {
        fs.mkdirSync(datafolder);
    }
    for(let i=0;i<teams.length;i++)
    {
        //here make folders for all names from teams
        let teamFolderName=path.join(datafolder,teams[i].name);
        if(fs.existsSync(teamFolderName)==false)
    {
        fs.mkdirSync(teamFolderName);
    }
    
    //make matches file
    for(let j=0;j<teams[i].matches.length;j++)
    {
        let match=teams[i].matches[j];
        creatematchpdf(teamFolderName,teams[i].name,match);
        
        
    }
}

}

function creatematchpdf(teamFolderName,homeTeam,match)
{
    let matchFileName=path.join(teamFolderName,match.vs+".pdf");
   let templateFileBytes=fs.readFileSync("Template.pdf");

   let pdfkapr=pdf.PDFDocument.load(templateFileBytes);
   pdfkapr.then(function(pdfdoc)
   {
       let page=pdfdoc.getPage(0);
       page.drawText(homeTeam,{
           x:270,
           y:700,size:14
       });
       page.drawText(match.vs,{
        x:270,
        y:670,size:14
       });
       page.drawText(match.selfScore,{
        x:270,
        y:640,size:14
    });
       page.drawText(match.oppScore,{
        x:270,
        y:610,size:14
    });
       page.drawText(match.result,{
        x:270,
        y:590,size:14
    });

       
       //now after changing we need to convert again in bytes
       let changedBytespr=pdfdoc.save();
       changedBytespr.then(function(changedBytes)
       {
           fs.writeFileSync(matchFileName,changedBytes);
       })
   })
}

function prepareExcel(teams,excelFilename)
{
    let wb=new excel4node.Workbook();
    for(let i=0;i<teams.length;i++)
    {
        let Tsheet=wb.addWorksheet(teams[i].name);
        Tsheet.cell(1,1).string("vs");
        Tsheet.cell(1,2).string("Self Score");
        Tsheet.cell(1,3).string("Opp Score");
        Tsheet.cell(1,4).string("Result");
        for(let j=0;j<teams[i].matches.length;j++)
        {
            Tsheet.cell(2+j,1).string(teams[i].matches[j].vs);
            Tsheet.cell(2+j,2).string(teams[i].matches[j].selfScore);
            Tsheet.cell(2+j,3).string(teams[i].matches[j].oppScore);
            Tsheet.cell(2+j,4).string(teams[i].matches[j].result);
            
        }
        

    }
    wb.write(excelFilename);
}


function putTeaminTeamsIfalreadynotThere(teams,teamN)
{
    let t1idx=-1;
    for(let j=0;j<teams.length;j++)
    {
            if(teams[j].name==teamN)
            {
                t1idx=j;


            }
            
    }

    if(t1idx==-1)
    {
        let team={
            name:teamN,
            matches:[]
        }

        teams.push(team);

    }
   
}

function putMatchInAppropriateTeam(teams, homeTeam, oppTeam, selfScore, oppScore, result)
{
    let t1idx=-1;
    for(let j=0;j<teams.length;j++)
    {
            if(teams[j].name==homeTeam)
            {
               t1idx=j;
                break;
            }
            
    }

    let team = teams[t1idx];
    team.matches.push({
        vs: oppTeam,
        selfScore: selfScore,
        oppScore: oppScore,
        result: result

    })

}