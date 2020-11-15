"use strict";
var config = require('./config.json');
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


