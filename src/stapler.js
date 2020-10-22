"use strict"
const fs =  require('fs');
var ffmpeg = require('fluent-ffmpeg');
var logger = require('./logger');
module.exports = class Stapler 
{
	lock = false;
	segmentsFolder
	cameraFolder
	cameraConfig
	outputFilename = 'video.1x.mp4';

	processQueue

	constructor(mainFolder, cameraConfig, staplerConfig)
	{
		this.logger = new logger("Stapler", staplerConfig.logLevel)
		if(cameraConfig.id == null)
			return false;
		if(cameraConfig.url == null)
			return false;
		this.cameraFolder = mainFolder + '/' + cameraConfig.id;
		this.segmentsFolder = mainFolder + '/segments/' + cameraConfig.id;
		this.cameraConfig = cameraConfig;
		this.processQueue = [];
		if(!fs.existsSync(this.cameraFolder)) 
		{
			fs.mkdirSync(this.cameraFolder, { recursive: true });	
		}
	}

	runAll()
	{
		var types = fs.readdirSync(this.segmentsFolder, { 'withFileTypes': true });
		for(var i in types)
		{
			if(!types[i].isDirectory()) //Only look for directories (x1, x10 etc);
			{
				continue;	
			}
			var folder = this.segmentsFolder + '/' + types[i].name;
			var playlistFile = folder + '/playlist.txt';
			var outputFile = this.cameraFolder + '/video.' + types[i].name + '.mp4';
			if(this.generatePlaylist(folder, playlistFile) !== false)
			{
				this.processQueue.push(this.createNewProcess(playlistFile, outputFile, folder));
			}
			else
			{
				this.logger.warn("Stapler: No segments for type " + types[i].name);
			}
		}
		this.dequeueNextProcess();
	}


	dequeueNextProcess()
	{
		var process = this.processQueue.pop();
		if(process == null)
		{
			this.finishedProcessing();
			return false;
		}
		process.run();
	}

	finishedProcessing()
	{
		//Report event
		this.logger.notice("Finished stapling for " + this.cameraConfig.id)
	}

	generatePlaylist(segmentsFolder, playlistFile)
	{
		var segmentFiles = fs.readdirSync(segmentsFolder);
		segmentFiles.sort();
		var numFiles = segmentFiles.length;
		var realSegmentFiles = [];
		for(var i = 0; i < numFiles; i++)
		{
			var match = segmentFiles[i].match(/segment-\d{5}\.mp4/)
			if(match !== null)
			{
				realSegmentFiles.push(segmentFiles[i]);
			}
		}
		var numFiles = realSegmentFiles.length;
		if(numFiles == 0) //No new files 
			return false;
		var playlistString = '';
		var rows = 0;
		for(var i = 0; i < numFiles; i++)
		{
			rows++;
			playlistString += "file '" + segmentsFolder + '/' + realSegmentFiles[i] + "'\n";
		}
		//if(rows < 2) //Only combine 2 or more video files
		//	return false;
		//this._currentSegmentFiles = realSegmentFiles;
		//console.log(playlistString);
		fs.writeFileSync(playlistFile, playlistString);
		return true;
	}
	deleteSegmentFolder(segmentsFolder)
	{
		fs.rmdirSync(segmentsFolder, { 'recursive': true });
	}

	createNewProcess(playlistFile, outputFile, segmentsFolder)
	{
		//ffmpeg -f concat -i camera0.txt -c copy camera0.mp4
		var process = ffmpeg();
		process.input(playlistFile);
		process.output(outputFile);
		process.inputOptions(['-f concat', '-safe 0']);
		process.outputOptions(['-c copy', '-safe 0']);
		process.on('start', (commandLine) => {
			this.logger.verbose('Spawned Ffmpeg for: ' + this.cameraConfig.id + ' with command: ' + commandLine);
		});
		process.on('error', (commandLine) => {
			this.logger.warn('Error Ffmpeg for: ' + this.cameraConfig.id + ' with command: ' + commandLine);
		});
		process.on('end', () => { 
			this.deleteSegmentFolder(segmentsFolder);
			this.dequeueNextProcess();
			this.logger.verbose('Ending Staple process for: ' + this.cameraConfig.id);
		});
		process.renice(10);
		return process;
	}
}
