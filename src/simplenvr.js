"use strict";
//var stapler = require('./stapler');
var mainFolder = '/bulk/videotest/videos';
var cameraConfig = [
	{
		'id': 1,
		'name': "Chicken Coop",
		'url': "rtsp://192.168.42.21:554/s0" 
	},
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
];
const fs =  require('fs');
var recorder = require('./recorder');
var cameras = {};
var today = new Date();
var year = today.getFullYear();
var month = (today.getMonth() + 1).toString(10).padStart(2, '0');
var day = today.getDate().toString(10).padStart(2, '0');
var dailyFolder = mainFolder + '/' + year + '-' + month + '-' + day;
if(!fs.existsSync(dailyFolder)) 
{
	fs.mkdirSync(dailyFolder, { recursive: true });	
}
for (var i in cameraConfig) 
{
	var id = cameraConfig[i].id;
	cameras[id] = new recorder(dailyFolder, cameraConfig[i]);
	cameras[id].start();
}

//ffmpeg -rtsp_transport tcp -i rtsp://192.168.42.21:554/s0 -c copy -map 0 -f segment -segment_time 30 -segment_atclocktime 1 -segment_start_number -segment_format mp4 "/bulk/videotest/capture-%03d.mp4"


