"use strict"
const fs =  require('fs');
var ffmpeg = require('fluent-ffmpeg');
module.exports = class Recorder 
{

	segmentsFolder
	framesFolder
	cameraConfig

	latestSegment = 0
	latestFrame = 0;

	constructor(mainFolder, cameraConfig, recorderConfig) 
	{
		if(cameraConfig.id == null)
			return false;
		if(cameraConfig.url == null)
			return false;
		this.segmentsFolder = mainFolder + '/segments/' + cameraConfig.id;
		this.framesFolder = mainFolder + '/frames/' + cameraConfig.id;
		this.cameraConfig = cameraConfig;
		if(!fs.existsSync(this.segmentsFolder)) 
		{
			fs.mkdirSync(this.segmentsFolder, { recursive: true });	
		}
		if(!fs.existsSync(this.framesFolder)) 
		{
			fs.mkdirSync(this.framesFolder, { recursive: true });	
		}
		this.latestSegment = this.getLastSegmentNumber();
		this.latestFrame = this.getLastFrameNumber();
	}

	getLastSegmentNumber()
	{
		var segmentFiles = fs.readdirSync(this.segmentsFolder);
		segmentFiles.sort();
		for(var j = segmentFiles.length -1; j >= 0; j--)
		{
			var match = segmentFiles[j].match(/segment-(\d{5})\.mp4/)
			if(match !== null)
			{
				return parseInt(match[1], 10);
			}
		}
		return 0;
	}
	getLastFrameNumber()
	{

		var frameFiles = fs.readdirSync(this.framesFolder);
		frameFiles.sort();
		for(var j = frameFiles.length -1; j >= 0; j--)
		{
			var match = frameFiles[j].match(/frame-(\d{5})\.jpg/)
			if(match !== null)
			{
				return parseInt(match[1], 10);
			}
		}
		return 0;
	}
	start()
	{
		this.ffmpeg = ffmpeg();
		this.ffmpeg.input(this.cameraConfig.url);
		this.ffmpeg.inputOptions([
			'-rtsp_transport tcp'
		]);
		this.ffmpeg.output(this.segmentsFolder + '/segment-%05d.mp4');
		this.ffmpeg.outputOptions([
			'-c copy',
			'-map 0',
			'-f segment',
			'-segment_time 300',
			'-segment_atclocktime 1',
			'-segment_start_number ' + this.latestSegment
		]);
		this.ffmpeg.output(this.framesFolder + '/frame-%05d.jpg');
		this.ffmpeg.outputOptions([
			'-f image2', 
			'-r 0.1',
			'-start_number ' + this.latestFrame
		]);
		this.ffmpeg.on('start', function(commandLine) {
			console.log('Spawned Ffmpeg with command: ' + commandLine);
		});
		this.ffmpeg.on('error', function(commandLine) {
			console.log('Error Ffmpeg with command: ' + commandLine);
		});
		this.ffmpeg.on('end', function(commandLine) {
			console.log('End Ffmpeg with command: ' + commandLine);
		});
		this.ffmpeg.renice(-10);
		this.ffmpeg.run();
	}
}
