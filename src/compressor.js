"use strict"
const fs =  require('fs');
var ffmpeg = require('fluent-ffmpeg');
var logger = require('./logger');
var eventEmitter = require('events').EventEmitter;
module.exports = class Compressor extends eventEmitter
{
	lock = false;
	framesFolder
	segmentsFolder
	cameraConfig
	config

	logger

	finished = false

	framesInFolder = 0;
	waitForFrames = 250;
	compressorProcesses

	_listener = null

	_currentFrames

	constructor(mainFolder, cameraConfig, compressorConfig)
	{
		super();
		this.logger = new logger("Compressor", compressorConfig.logLevel)
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
		this.logger.notice("Adding listener for: " + this.framesFolder);
		this._listener = fs.watch(this.framesFolder, '', (eventType, file) => this.validateListener(eventType));
	}

	removeListener()
	{
		this._listener.close();
	}

	validateListener(eventType)
	{
		if(this.lock || eventType != 'rename')
			return;
		this.framesInFolder++;
		this.logger.debug("new frame for camera: " + this.cameraConfig.id + " (" + this.framesInFolder + "/" + this.waitForFrames + ")");
		if(this.framesInFolder >= this.waitForFrames)
		{
			this.logger.notice("new frame segment for camera: " + this.cameraConfig.id + " (" + this.framesInFolder + "/" + this.waitForFrames + ")");
			this.execute();
		}
	}
	execute()
	{
		if(this.lock)
			return false;
		this.lock = true;
		if(!this.loadFrames())
		{
			this.lock = false;
			return;
		}
		for(var i in this.config.compressions)
		{
			var compression = this.config.compressions[i];
			this.emit("Executing", compression); 
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

	finish()
	{
		setTimeout(() => {
			if(this.execute() === false)
			{
				this.finish();
			}
			else
			{
				this.finished = true;
				this.removeListener();
			}
		}, 1000);
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
		this.logger.debug(realFrames);
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
			this.logger.debug('Deleted file: ' + this._currentFrames[i]);
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
		this.logger.debug("Finished processing frames");
		//TODO: Send finished event to Scheduler
		this.lock = false;
		this.emit("Finished");
		if(this.finished === true)
		{
			this.logger.notice("Finished last compressor job");
			this.emit("FinishedEverything");
		}

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
			this.logger.verbose('Spawned Ffmpeg for x' + scale + ' from camera: ' + this.cameraConfig.id + ' with command: ' + commandLine);
		});
		process.on('error', (commandLine) => {
			this.logger.warn('Error Ffmpeg with command: ' + commandLine);
			this.dequeueNextProcess();
		});
		process.on('end', () => { 
			fs.rmdirSync(framesFolder, { 'recursive': true });
			fs.renameSync(outputTmpName, outputRealName);
			this.dequeueNextProcess();
			this.logger.notice('Ending compress x' + scale + ' process for: ' + this.cameraConfig.id);
		});
		process.renice(10);
		return process;
	}
}
