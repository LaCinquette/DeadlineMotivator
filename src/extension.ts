// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Console } from 'console';
import { posix } from 'path';
import { TextDecoder, TextEncoder } from 'util';
import * as vscode from 'vscode';
import { window } from 'vscode';
import * as quotes from './quotes.json';
import * as ds from './DeadlineSettings.json';

var timeoutsArray: NodeJS.Timeout[] = []
var intervalsArray: NodeJS.Timer[] = []
var dailyTimeoutsArray: NodeJS.Timeout[] = []
var deadlineDate: Date;
var dsObj = JSON.parse(JSON.stringify(ds))

function deleteDeadlineReminders(){
	timeoutsArray.forEach(element => clearTimeout(element))
	timeoutsArray = []
}

function deleteIntervalMotivators(){
	intervalsArray.forEach(element => clearInterval(element))
	intervalsArray = []
}

function deleteDailyMotivators(){
	dailyTimeoutsArray.forEach(element => clearTimeout(element))
	dailyTimeoutsArray = []
}

function deleteAll(){
	timeoutsArray.forEach(element => clearTimeout(element))
	timeoutsArray = []
	intervalsArray.forEach(element => clearInterval(element))
	intervalsArray = []
	dailyTimeoutsArray.forEach(element => clearTimeout(element))
	dailyTimeoutsArray = []
}

function getRandomInt(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}

async function provideDeadlineSettings(dsJson: any) {
	var workingDir = vscode.workspace.workspaceFolders![0].uri.path
	workingDir = workingDir.replace(/\\/, "")
	workingDir = workingDir.replace(/\\/g, "/")
	dsJson["default"] = undefined;
	var uint8array = new TextEncoder().encode(JSON.stringify(dsJson, null, 2));
	//var string = new TextDecoder().decode(uint8array);
	await vscode.workspace.fs.writeFile(vscode.Uri.file(workingDir + "/.vscode/DeadlineSettings.json"), uint8array)
}

async function checkForConfig() {
	var workingDir = vscode.workspace.workspaceFolders![0].uri.path
	workingDir = workingDir.replace(/\\/, "")
	workingDir = workingDir.replace(/\\/g, "/")
	try{
		let dsConfigContent = await vscode.workspace.fs.readFile(vscode.Uri.file(workingDir + "/.vscode/DeadlineSettings.json"));
		var dsJSONString = new TextDecoder().decode(dsConfigContent);
		dsObj = JSON.parse(dsJSONString)
		console.log(`${JSON.stringify(dsObj, null, 2)}`)
		//initializeFromConfig()
	}
	catch{
		console.log('No config')
	}
}

async function initializeFromConfig() {
	
}

async function deleteDeadlineSettings() {
	var workingDir = vscode.workspace.workspaceFolders![0].uri.path
	workingDir = workingDir.replace(/\\/, "")
	workingDir = workingDir.replace(/\\/g, "/")
	await vscode.workspace.fs.delete(vscode.Uri.file(workingDir + "/.vscode/DeadlineSettings.json"))
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

	dsObj["dailyMotivators"].push({
		"hour" : timeMatch![1],
		"minutes" : timeMatch![2],
		"seconds" : timeMatch![3]
	})
	provideDeadlineSettings(dsObj)

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
	dsObj["intervalMotivators"].push({
		activationDate: (new Date()).toISOString(),
		interval: {
			hour : timeMatch![1],
			minutes : timeMatch![2],
			seconds : timeMatch![3]
		}
	})
	provideDeadlineSettings(dsObj)
	intervalsArray.push(
		setInterval(Motivate, (parseInt(timeMatch![1])*60*60 + parseInt(timeMatch![2])*60 + parseInt(timeMatch![3])) * 1000)
	)
	window.showInformationMessage(`Interval reminder with interval of ${result} setted!`, "OK")
}	

async function DeadlineInfo(deadlineDate: Date){
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

	dsObj["deadlineStarted"] = (new Date()).toISOString()
	dsObj["deadlineFinish"] = deadlineDate.toISOString()
	dsObj["milestonePercents"] = milestonePercents.map(el => {
		return String(el)
	})
	dsObj["milestoneCriticalPercent"] = String(criticalPercent)
	provideDeadlineSettings(dsObj)

	let currentTheme = await vscode.workspace.getConfiguration().get("workbench.colorTheme");		
	for(let i = 0; i < milestonePercents.length; i++){
		if(milestonePercents[i] < criticalPercent){
			timeoutsArray.push(
				setTimeout(() => {window.showInformationMessage(`Deadline info: ${milestonePercents[i]}% time before deadline has passed`, 'OK')}, 
				(deadlineDate.getTime() - Date.now())*milestonePercents[i]/100)
			)
		}
		else{
			timeoutsArray.push(
				setTimeout(async () => {
					window.showWarningMessage(`WARNING! DEADLINE IS COMING! ${milestonePercents[i]}% time before deadline has passed`)
					
					await vscode.workspace.getConfiguration().update("workbench.colorTheme", "Red");

					let currentTextEditor = vscode.window.activeTextEditor
					if(currentTextEditor != undefined){
						var diff = deadlineDate.getTime() - Date.now();

						var days = Math.floor(diff / (1000 * 60 * 60 * 24));
						diff -=  days * (1000 * 60 * 60 * 24);
						
						var hours = Math.floor(diff / (1000 * 60 * 60));
						diff -= hours * (1000 * 60 * 60);
						
						var mins = Math.floor(diff / (1000 * 60));
						diff -= mins * (1000 * 60);
						
						var seconds = Math.floor(diff / (1000));
						diff -= seconds * (1000);
						
						var cteText = currentTextEditor.document.getText(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(4, 0))).replace(/\/\*\sDeadline\sInfo:([^\*]{1}[^\\]{1}|[\r\n])*\*\//g, "") // /\/\*\sDeadline\sInfo:([^\*][^\\])+\*\//g

						currentTextEditor?.edit((editBuilder) => {
							if(cteText == '\r\n'){
								editBuilder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(4, 0)))
							}
							editBuilder.insert(new vscode.Position(0, 0), "/* Deadline Info:\n")
							editBuilder.insert(new vscode.Position(0, 0), `WARNING! DEADLINE IS COMING! ${milestonePercents[i]}% time before deadline has passed\n`)
							editBuilder.insert(new vscode.Position(0, 0), `Until deadline: ${days} days, ${hours} hours, ${mins} minutes, ${seconds} seconds\n`)
							editBuilder.insert(new vscode.Position(0, 0), `*/\n`)
						})
					}
				}, 
				(deadlineDate.getTime() - Date.now())*milestonePercents[i]/100)
			)
		}
	}
	timeoutsArray.push(
		setTimeout(async () => {
			window.showWarningMessage(`Deadline has passed!`)

			await vscode.workspace.getConfiguration().update("workbench.colorTheme", String(currentTheme));

			deleteIntervalMotivators()
		}, (deadlineDate.getTime() - Date.now()))
	)
}

export async function activate(context: vscode.ExtensionContext) {
	checkForConfig()

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.SetDeadline', async () => {
		const result = await window.showInputBox({
			placeHolder: 'Please use the YYYY-MM-DD hh:mm:ss format', //2021-06-01 14:00:00
			ignoreFocusOut: true
		});
		
		const dateRegex = /(\S+)\s*(\S+)/
		var match = dateRegex.exec(result!)
		if(deadlineDate != null){
			deleteAll()
		}
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
		deleteAll()
		deleteDeadlineSettings()
	}));

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.DeactivateDailyMotivators', async () => {
		deleteDailyMotivators()
		dsObj["dailyMotivators"] = []
		provideDeadlineSettings(dsObj)
	}));

	context.subscriptions.push(vscode.commands.registerCommand('deadlinemotivator.DeactivateIntervalMotivators', async () => {
		deleteIntervalMotivators()
		dsObj["intervalMotivators"] = []
		provideDeadlineSettings(dsObj)
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