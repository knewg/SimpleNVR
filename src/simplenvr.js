"use strict";
var config = {
	"recorder": 
	{
		"logLevel": "verbose",
		"segmentLength": 300,
		"breakingTime": "05:00:00",
	},
	"compressor": 
	{
		"logLevel": "verbose",
		"secondsPerFrame": 10, //How many frames are rendered in the recorder per second of video
		"compressions": [
			10,
			20,
			50
		]
	},
	"stapler": {

		"logLevel": "verbose",
	},
	"scheduler": {
		"logLevel": "verbose",
		"limitRecordingTime": null,
	},
	"logLevel": "verbose",
	"mainFolder": '/bulk/videotest/videos',
	"cameras": [
		/*{
			'id': 1,
			'name': "Chicken Coop",
			'url': "rtsp://192.168.42.21:554/s0" 
		},*/
		{
			'id': 2,
			'name': "Barn Surveillance",
			'url': "rtsp://192.168.42.22:554/s0" 
		},
		{
			'id': 3,
			'name': 'Balcony',
			'url': 'rtsp://192.168.42.26:554/s0'
		},
		/*{
			'name': 'Duck Barn Box 1',
			'url': 'rtsp://192.168.42.23:554/s0'
		},
		{
			'name': 'Duck Barn Box 2',
			'url': 'rtsp://192.168.42.29:554/s0'
		},
		{
			'name': 'Quail box',
			'url': 'rtsp://192.168.42.25:554/s0'
		},
		{
			'name': 'Duck Winter Pen 1',
			'url': 'rtsp://192.168.42.24:554/s0'
		},
		{
			'name': 'River Pasture 1',
			'url': 'rtsp://192.168.42.27:554/s0'
		},
		{
			'name': 'River Pasture 2',
			'url': 'rtsp://192.168.42.28:554/s0'
		}*/
	]
};
const fs =  require('fs');
//var camera = require('./camera');
var scheduler = require('./scheduler');
var cameras = {};
for (var i in config.cameras) 
{
	var id = config.cameras[i].id;
	cameras[id] = {}
	//cameras[id] = new recorder(dailyFolder, cameraConfig[i]);
//	cameras[id] = new camera(id, config.cameras[i]);
	cameras[id].scheduler = new scheduler(config.scheduler, config.mainFolder, config.logLevel, config.cameras[i], config.recorder, config.stapler, config.compressor);
}

//ffmpeg -rtsp_transport tcp -i rtsp://192.168.42.21:554/s0 -c copy -map 0 -f segment -segment_time 30 -segment_atclocktime 1 -segment_start_number -segment_format mp4 "/bulk/videotest/capture-%03d.mp4"


