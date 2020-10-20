"use strict"
const fs =  require('fs');
var ffmpeg = require('fluent-ffmpeg');
module.exports = class Stapler 
{
	lock = false;
	segmentsFolder
	cameraFolder
	cameraConfig
	playlistFile
	outputFilename = 'video.1x.mp4';
	_listener = null

	_currentSegmentFiles

	constructor(mainFolder, cameraConfig, staplerConfig)
	{
		if(cameraConfig.id == null)
			return false;
		if(cameraConfig.url == null)
			return false;
		this.cameraFolder = mainFolder + '/' + cameraConfig.id;
		this.segmentsFolder = mainFolder + '/segments/' + cameraConfig.id;
		this.playlistFile = this.segmentsFolder + '/playlist.txt';
		this.cameraConfig = cameraConfig;
		if(!fs.existsSync(this.cameraFolder)) 
		{
			fs.mkdirSync(this.cameraFolder, { recursive: true });	
		}
	}
	start()
	{
		this.addListener();
	}
	addListener()
	{
		console.log("Adding listener for: " + this.segmentsFolder);
		this._listener = fs.watch(this.segmentsFolder, '', (eventType, file) => this.validateListener(eventType));	
	}
	validateListener(eventType)
	{
		if(eventType != 'rename')
			return;
		this.execute();
	}
	execute()
	{
		if(this.lock)
			return;
		this.lock = true;
		if(!this.generatePlaylist())
		{
			this.lock = false;
			return;
		}
		this.staple();
	}
	generatePlaylist()
	{
		var segmentFiles = fs.readdirSync(this.segmentsFolder);
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
		realSegmentFiles.pop(); //Remove the last file it's not finished yet.
		var numFiles = realSegmentFiles.length;
		if(numFiles == 0) //No new files 
			return false;
		var playlistString = '';
		var rows = 0;
		
		if(fs.existsSync(this.cameraFolder + '/' + this.outputFilename)) 
		{
			rows++;
			playlistString = "file '" + this.cameraFolder + '/' + this.outputFilename + "'\n";
		}

		for(var i = 0; i < numFiles; i++)
		{
			rows++;
			playlistString += "file '" + this.segmentsFolder + '/' + realSegmentFiles[i] + "'\n";
		}
		if(rows < 2) //Only combine 2 or more video files
			return false;
		this._currentSegmentFiles = realSegmentFiles;
		console.log(playlistString);
		fs.writeFileSync(this.playlistFile, playlistString);
		return true;
	}
	deleteStapledSegments()
	{
		var numFiles = this._currentSegmentFiles.length;
		var playlistString = '';
		
		for(var i = 0; i < numFiles; i++)
		{
			fs.unlinkSync(this.segmentsFolder + '/' + this._currentSegmentFiles[i]);
			console.log('Deleted file: ' + this._currentSegmentFiles[i]);
		}
	}
	renameStapeledFile()
	{
		if(!fs.existsSync(this.cameraFolder + '/.tmp.' + this.outputFilename)) 
		{
			console.log("WARNING: Temporary stapled video file does not exist for " + this.cameraConfig.id);
			return false;
		}
		if(fs.existsSync(this.cameraFolder + '/' + this.outputFilename)) 
		{
			fs.unlinkSync(this.cameraFolder + '/' + this.outputFilename);
		}
		fs.renameSync(this.cameraFolder + '/.tmp.' + this.outputFilename, this.cameraFolder + '/' + this.outputFilename);
	}
	staple()
	{
		//ffmpeg -f concat -i camera0.txt -c copy camera0.mp4
		this.ffmpeg = ffmpeg();
		this.ffmpeg.input(this.playlistFile);
		this.ffmpeg.output(this.cameraFolder + '/.tmp.' + this.outputFilename);
		this.ffmpeg.inputOptions(['-f concat', '-safe 0']);
		this.ffmpeg.outputOptions(['-c copy', '-safe 0']);
		this.ffmpeg.on('start', (commandLine) => {
			console.log('Spawned Ffmpeg for: ' + this.cameraConfig.id + ' with command: ' + commandLine);
		});
		this.ffmpeg.on('error', (commandLine) => {
			this.lock = false;
			console.log('Error Ffmpeg with command: ' + commandLine);
		});
		this.ffmpeg.on('end', () => { 
			this.renameStapeledFile();
			this.deleteStapledSegments();
			this.lock = false; 
			console.log('Ending Staple process for: ' + this.cameraConfig.id);
		});
		this.ffmpeg.renice(10);
		this.ffmpeg.run();
	}
}
