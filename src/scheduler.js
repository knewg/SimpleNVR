"use strict"
const fs = require('fs');
var dayInstance = require('./day');
var recorder = require('./recorder');
var stapler = require('./stapler');
var compressor = require('./compressor');
module.exports = class Scheduler 
{
	date

	days = [];

	config

	constructor(mainFolder, cameraConfig, recorderConfig, staplerConfig, compressorConfig)
	{
		this.config = {};
		this.config.mainFolder = mainFolder;
		this.config.camera = cameraConfig;
		this.config.recorder = recorderConfig;
		this.config.stapler = staplerConfig;
		this.config.compressor = compressorConfig;
		this.createNewDay();
		this.waitForNewDay();
	}

	waitForNewDay()
	{

	}

	createNewDay()
	{
		var today = new Date();
		var year = today.getFullYear();
		var month = (today.getMonth() + 1).toString(10).padStart(2, '0');
		var day = today.getDate().toString(10).padStart(2, '0');
		var dateString = year + '-' + month + '-' + day;
		var dailyFolder = this.config.mainFolder + '/' + dateString;
		if(!fs.existsSync(dailyFolder)) 
		{
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
	}
}
