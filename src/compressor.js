"use strict"
const fs =  require('fs');
var ffmpeg = require('fluent-ffmpeg');
module.exports = class Compressor 
{
	lock = false;
	framesFolder
	segmentsFolder
	cameraConfig
	config

	framesInFolder = 0;
	waitForFrames = 250;
	compressorProcesses

	_listener = null

	_currentFrames

	constructor(mainFolder, cameraConfig, compressorConfig)
	{
		if(cameraConfig.id == null)
			return false;
		if(cameraConfig.url == null)
			return false;
		this.segmentsFolder = mainFolder + '/segments/' + cameraConfig.id;
		this.framesFolder = mainFolder + '/frames/' + cameraConfig.id;
		this.cameraConfig = cameraConfig;
		this.config = compressorConfig;
		this.compressorProcesses = [];
		if(!fs.existsSync(this.segmentsFolder)) 
		{
			fs.mkdirSync(this.segmentsFolder, { recursive: true });	
		}
	}
	start()
	{
		this.addListener();
	}
	addListener()
	{
		console.log("Adding listener for: " + this.framesFolder);
		this._listener = fs.watch(this.framesFolder, '', (eventType, file) => this.validateListener(eventType));
	}
	validateListener(eventType)
	{
		if(this.lock || eventType != 'rename')
			return;
		this.framesInFolder++;
		console.log("new frame for camera: " + this.cameraConfig.id + " (" + this.framesInFolder + "/" + this.waitForFrames + ")");
		if(this.framesInFolder >= this.waitForFrames)
		{
			console.log("new frame segment for camera: " + this.cameraConfig.id + " (" + this.framesInFolder + "/" + this.waitForFrames + ")");
			this.execute();
		}
	}
	execute()
	{
		if(this.lock)
			return;
		this.lock = true;
		if(!this.loadFrames())
		{
			this.lock = false;
			return;
		}
		for(var i in this.config.compressions)
		{
			var compression = this.config.compressions[i];
			if(compression != parseInt(compression, 10)) // make sure it's an integer
			{
				throw("Invalid config");
				return false;
			}
			var folder = this.createSymlinks(compression);
			this.compressorProcesses.push(this.generateCompressorProcess(compression, folder));
		}
		this.dequeueNextProcess();
	}
	loadFrames()
	{
		var frameFiles = fs.readdirSync(this.framesFolder);
		frameFiles.sort();
		var numFiles = frameFiles.length;
		var realFrames = [];
		for(var i = 0; i < numFiles; i++)
		{
			var match = frameFiles[i].match(/frame-\d{5}\.jpg/)
			if(match !== null)
			{
				realFrames.push(frameFiles[i]);
			}
		}
		console.log(realFrames);
		var numFiles = realFrames.length;
		if(numFiles == 0) //No new files 
			return false;
		this._currentFrames = realFrames;
		return true;
	}
	deleteCompressedFrames()
	{
		var numFiles = this._currentFrames.length;
		var playlistString = '';
		
		for(var i = 0; i < numFiles; i++)
		{
			fs.unlinkSync(this.framesFolder + '/' + this._currentFrames[i]);
			console.log('Deleted file: ' + this._currentFrames[i]);
		}
		this._currentFrames = null;

	}

	createSymlinks(scale)
	{
		var folder = fs.mkdtempSync(this.framesFolder + '/x' + scale);
		var realScale = Math.ceil(scale / this.config.secondsPerFrame); //adjust scale to match number of frames per second of video
		if(realScale < 1) // Can't make video go slower than real time.
		{
			throw("Compressor: Error in config, adjusted scale < 1")
		}
		// Loop through frames
		var counter = realScale;
		var frameCounter = 0;
		for(var i in this._currentFrames)
		{
			if(counter == realScale) //Only select every N'th frame
			{
				var fileName = 'frame-' + frameCounter.toString().padStart(5, '0') + '.jpg';
				fs.symlinkSync(this.framesFolder + '/' + this._currentFrames[i], folder + '/' + fileName)
				frameCounter++;
				counter = 0;
			}
			counter++;
		}
		return folder;
	}

	finishedProcessing()
	{
		this.deleteCompressedFrames();
		this.framesInFolder = 0;
		this.lock = false;
	}

	dequeueNextProcess()
	{
		var process = this.compressorProcesses.pop();
		if(process == null)
		{
			this.finishedProcessing();
			return false;
		}
		process.run();
	}

	generateCompressorProcess(scale, framesFolder)
	{
		var outputFolder = this.segmentsFolder + '/x' + scale;
		var segmentNumber = 0;
		if(!fs.existsSync(outputFolder)) 
		{
			fs.mkdirSync(outputFolder, { recursive: true });	
		}
		else
		{
			var segmentFiles = fs.readdirSync(outputFolder);
			segmentFiles.sort();
			for(var j = segmentFiles.length -1; j >= 0; j--)
			{
				var match = segmentFiles[j].match(/segment-(\d{5})\.mp4/)
				if(match !== null)
				{
					segmentNumber = parseInt(match[1], 10) + 1;
					break;
				}
			}
		}
		var outputFilename = 'segment-' + segmentNumber.toString().padStart(5, '0') + '.mp4';
		var fileMask = framesFolder + '/frame-%05d.jpg';
		var process = ffmpeg();
		var outputTmpName = outputFolder + '/.tmp.' + outputFilename;
		var outputRealName = outputFolder + '/' + outputFilename;
		process.input(fileMask);
		process.output(outputTmpName);
		process.outputOptions(['-framerate 24', '-safe 0']);
		//process.outputOptions(['-c copy', '-safe 0']);
		process.on('start', (commandLine) => {
			console.log('Spawned Ffmpeg for x' + scale + ' from camera: ' + this.cameraConfig.id + ' with command: ' + commandLine);
		});
		process.on('error', (commandLine) => {
			console.log('Error Ffmpeg with command: ' + commandLine);
			this.dequeueNextProcess();
		});
		process.on('end', () => { 
			fs.rmdirSync(framesFolder, { 'recursive': true });
			fs.renameSync(outputTmpName, outputRealName);
			this.dequeueNextProcess();
			console.log('Ending compress x' + scale + ' process for: ' + this.cameraConfig.id);
		});
		process.renice(10);
		return process;
	}
}
