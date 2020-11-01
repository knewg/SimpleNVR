"use strict"
const fs = require('fs');
var dayInstance = require('./day');
var recorder = require('./recorder');
var stapler = require('./stapler');
var compressor = require('./compressor');
var logger = require('./logger');
module.exports = class Scheduler 
{
	date

	days = [];

	inactiveDays = [];

	config

	logger

	constructor(schedulerConfig, mainFolder, logLevel, cameraConfig, recorderConfig, staplerConfig, compressorConfig)
	{
		this.logger = new logger("Scheduler", null, cameraConfig.id, logLevel)
		this.config = {};
		this.config.scheduler = schedulerConfig;
		this.config.mainFolder = mainFolder;
		this.config.camera = cameraConfig;
		this.config.recorder = recorderConfig;
		this.config.stapler = staplerConfig;
		this.config.compressor = compressorConfig;
		this.createNewDay(new Date());
	}

	waitForNextDay(dateReference) //Send last calculated tomorrow to account for drift, but use a new date for comparison.
	{
		var now = new Date();
		var tomorrow = dateReference;
		tomorrow.setHours(0);
		tomorrow.setMinutes(0);
		tomorrow.setSeconds(1);
		tomorrow.setMilliseconds(0);
		tomorrow.setDate(tomorrow.getDate() + 1);
		var difference = tomorrow.getTime() - now.getTime();
		//var difference =  2000;
		if(this.config.scheduler.limitRecordingTime != null && this.config.scheduler.limitRecordingTime > 0)
		{
			difference = this.config.scheduler.limitRecordingTime;
			this.logger.warn("Overriding recording time and create a new day every: " + difference + " seconds");
			difference = difference * 1000; //Convert to ms
		}
		this.logger.notice("Waiting for " + difference + " seconds before starting a new day");
		setTimeout(() => {
			this.createNewDay(tomorrow);
			this.finishDay();
		}, difference);
	}

	finishDay()
	{
		var day = this.days.shift();
		var index = this.inactiveDays.length;
		this.inactiveDays[index] = day;
		this.logger.notice("Finishing day");
		day.recorder.stop();
		day.compressor.on("FinishedEverything", () => {
			day.stapler.runAll();
		});
		day.stapler.on("FinishedEverything", () => {
			this.removePreviousDay(index);
		});
		day.compressor.finish();

	}

	removePreviousDay(index)
	{
		this.logger.notice("Post processing is complete, removing day");
		var day = this.inactiveDays[index] = null;
		//TODO: Better delete?

		//TODO: Delte segments and frames-folder
		//fs.rmdirSync(segmentsFolder, { 'recursive': true });
	}

	createNewDay(date)
	{
		var year = date.getFullYear();
		var month = (date.getMonth() + 1).toString(10).padStart(2, '0');
		var day = date.getDate().toString(10).padStart(2, '0');
		var dateString = year + '-' + month + '-' + day;
		var dailyFolder = this.config.mainFolder + '/' + dateString;
		var id = day;
		if(!fs.existsSync(dailyFolder)) 
		{
			this.logger.notice("Creating folder " + dailyFolder);
			fs.mkdirSync(dailyFolder, { recursive: true });	
		}
		var thisRecorder = new recorder(id, dailyFolder, this.config.camera, this.config.recorder);
		var thisStapler = new stapler(id, dailyFolder, this.config.camera, this.config.stapler);
		var thisCompressor = new compressor(id, dailyFolder, this.config.camera, this.config.compressor);
		var thisDay = new dayInstance(id, dateString, thisRecorder, thisStapler, thisCompressor);
		thisDay.recorder.start();
		thisDay.compressor.start();
		//day.stapler.start();
		this.days.push(thisDay);
		this.waitForNextDay(date);
	}
}
