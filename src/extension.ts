// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Console } from 'console';
import { posix } from 'path';
import * as vscode from 'vscode';
import { window } from 'vscode';
import * as quotes from './quotes.json';

var timeoutsArray: NodeJS.Timeout[] = []
var intervalsArray: NodeJS.Timer[] = []
var dailyTimeoutsArray: NodeJS.Timeout[] = []

function deleteTimeouts(){
	timeoutsArray.forEach(element => clearTimeout(element))
	timeoutsArray = []
}

function deleteIntervals(){
	intervalsArray.forEach(element => clearInterval(element))
	intervalsArray = []
}

function deleteDailyTimeouts(){
	dailyTimeoutsArray.forEach(element => clearTimeout(element))
	dailyTimeoutsArray = []
}

function getRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
  }

async function Motivate(){
	var match = ((/(.*)\\(.*)$/).exec(__dirname))
	var filesList =  await vscode.workspace.fs.readDirectory(vscode.Uri.file(match![1]+'\\media'))
	var n = getRandomInt(0, filesList.length)
	var chosenFileName = match![1]+'\\media\\' + filesList[n][0]
	const panel = vscode.window.createWebviewPanel(
        'deadlineMotivator',
        'Motivation',
        vscode.ViewColumn.Active,
        {}
    );
	var motivationalText = quotes[getRandomInt(0, Object.keys(quotes).length - 1)]
	panel.webview.html = getWebviewContent(panel.webview.asWebviewUri(vscode.Uri.file(chosenFileName)), motivationalText)
}

function DailyMotivator(deadlineDate: Date, dailyTime: string){
	var currentDate = new Date()
	var timeStamp = new Date()
	var timeMatch = (/(\d+):(\d+):(\d+)/).exec(dailyTime)
	timeStamp.setHours(parseInt(timeMatch![1]))
	timeStamp.setMinutes(parseInt(timeMatch![2]))
	timeStamp.setSeconds(parseInt(timeMatch![3]))
	while(timeStamp < deadlineDate){
		if(currentDate < timeStamp){
			dailyTimeoutsArray.push(
				setTimeout(Motivate, timeStamp.getTime() - Date.now()) // setting daily remindings
			)
		}
		timeStamp.setDate(timeStamp.getDate() + 1)
	}
	window.showInformationMessage(`Daily reminder on ${dailyTime} everyday setted!`, "OK")
}

function IntervalMotivator(deadlineDate: Date, result: string){
	var timeMatch = (/(\d+):(\d+):(\d+)/).exec(result!)
	intervalsArray.push(
		setInterval(Motivate, (parseInt(timeMatch![1])*60*60 + parseInt(timeMatch![2])*60 + parseInt(timeMatch![3])) * 1000)
	)
	window.showInformationMessage(`Interval reminder with interval of ${result} setted!`, "OK")
}	

function DeadlineInfo(deadlineDate: Date){
	var criticalPercent = 90
	var milestonePercents = [
		10,
		25,
		50,
		75,
		80,
		90,
		95,
		99
	]
	for(let i = 0; i < milestonePercents.length; i++){
		if(milestonePercents[i] < criticalPercent){
			timeoutsArray.push(
				setTimeout(() => {window.showInformationMessage(`Deadline info: ${milestonePercents[i]}% time before deadline has passed`, 'OK')}, (deadlineDate.getTime() - Date.now())*milestonePercents[i]/100)
			)
		}
		else{
			timeoutsArray.push(
				setTimeout(() => {window.showWarningMessage(`WARNING! DEADLINE IS COMING! ${milestonePercents[i]}% time before deadline has passed`)}, (deadlineDate.getTime() - Date.now())*milestonePercents[i]/100)
			)
		}
	}
	timeoutsArray.push(
		setTimeout(() => {
			window.showWarningMessage(`Deadline has passed!`)
			deleteIntervals()
		}, (deadlineDate.getTime() - Date.now()))
	)
}

export async function activate(context: vscode.ExtensionContext) {
	let deadlineDate: Date

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.SetDeadline', async () => {
		const result = await window.showInputBox({
			placeHolder: 'Please use the YYYY-MM-DD hh:mm:ss format', //2021-05-28 22:00:00
			ignoreFocusOut: true
		});
		
		const dateRegex = /(\S+)\s*(\S+)/
		var match = dateRegex.exec(result!)
		deadlineDate = new Date(`${match![1]}T${match![2]}`)
		window.showInformationMessage(`Deadline time setted to ${deadlineDate}`)
		DeadlineInfo(deadlineDate)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.DailyMotivator', async () => {
		const result = await window.showInputBox({
			placeHolder: 'Please use the hh:mm:ss format',
			value: "09:30:00",
			ignoreFocusOut: true
		});

		DailyMotivator(deadlineDate, result!)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.IntervalMotivator', async () => {
		const result = await window.showInputBox({
			placeHolder: 'Please use the hh:mm:ss format',
			value: "01:30:00",
			ignoreFocusOut: true
		});
		
		IntervalMotivator(deadlineDate, result!)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.MotivateMe', async () => {
		Motivate()
	}));

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.FinishDeadline', async () => {
		deleteTimeouts()
		deleteIntervals()
		deleteDailyTimeouts()
	}));

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.DeactivateDailyMotivator', async () => {
		deleteDailyTimeouts()
	}));

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.DeactivateIntervalMotivator', async () => {
		deleteIntervals()
	}));
}

export function deactivate() {}

function getWebviewContent(chosenFileName: vscode.Uri, motivationalText: string) {
	return `<!DOCTYPE html>
  <html lang="en">
  <head>
	  <meta charset="UTF-8">
	  <meta name="viewport" content="width=device-width, initial-scale=1.0">
	  <title>Motivation</title>
	  <style>
		p {
			font-family: Arial; 
			font-size: 17pt;
		}
  	  </style>
  </head>
  <body>
	  <img src="${chosenFileName}" width=50%vw; style="float:left; padding:3px 10px 10px 10px;" />
	  <p>${motivationalText}</p>
  </body>
  </html>`;
} 