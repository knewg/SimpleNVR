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

	config

	logger

	constructor(mainFolder, logLevel, cameraConfig, recorderConfig, staplerConfig, compressorConfig)
	{
		this.logger = new logger("Scheduler", logLevel)
		this.config = {};
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
		this.logger.notice("Waiting for " + difference + " seconds before starting a new day");
		setTimeout(() => {
			this.createNewDay(tomorrow);
			this.finishDay();
		}, difference);
	}

	finishDay()
	{
		var day = this.days.shift();
		this.logger.notice("Finishing day");
		day.recorder.stop();
		day.compressor.on("FinishedEverything", () => {
			day.stapler.runAll();
		});
		day.compressor.finish();

	}

	createNewDay(date)
	{
		var year = date.getFullYear();
		var month = (date.getMonth() + 1).toString(10).padStart(2, '0');
		var day = date.getDate().toString(10).padStart(2, '0');
		var dateString = year + '-' + month + '-' + day;
		var dailyFolder = this.config.mainFolder + '/' + dateString;
		if(!fs.existsSync(dailyFolder)) 
		{
			this.logger.notice("Creating folder " + dailyFolder);
			fs.mkdirSync(dailyFolder, { recursive: true });	
		}
		var thisRecorder = new recorder(dailyFolder, this.config.camera, this.config.recorder);
		var thisStapler = new stapler(dailyFolder, this.config.camera, this.config.stapler);
		var thisCompressor = new compressor(dailyFolder, this.config.camera, this.config.compressor);
		var thisDay = new dayInstance(dateString, thisRecorder, thisStapler, thisCompressor);
		thisDay.recorder.start();
		thisDay.compressor.start();
		//day.stapler.start();
		this.days.push(thisDay);
		this.waitForNextDay(date);
	}
}
