var folder = '/bulk/videotest/'
var segmentFilename = 'capture-';
var cameras = [
	{
		'name': "Chicken Coop",
		'url': "rtsp://192.168.42.21:554/s0" 
	},
	{
		'name': "Barn Surveillance",
		'url': "rtsp://192.168.42.22:554/s0" 
	},
	{
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
var ffmpeg = require('fluent-ffmpeg');
const fs =  require('fs');
function collector() 
{
	for (var i in cameras) 
	{
		var cameraFolder = folder + 'camera' + i;
		var framesFolder = cameraFolder + '/frames';
		if(!fs.existsSync(cameraFolder)) 
		{
			fs.mkdirSync(cameraFolder);	
		}
		if(!fs.existsSync(framesFolder)) 
		{
			fs.mkdirSync(framesFolder);	
		}
		var cameraFiles = fs.readdirSync(cameraFolder);
		cameraFiles.sort();
		var latestCamera = 0;
		for(var j = cameraFiles.length -1; j >= 0; j--)
		{
			var match = cameraFiles[j].match(/capture-(\d{5})\.mp4/)
			if(match !== null)
			{
				latestCamera = parseInt(match[1], 10);
				break;
			}
		}
		console.log(latestCamera);

		var frameFiles = fs.readdirSync(framesFolder);
		frameFiles.sort();
		var latestFrame = 0;
		for(var j = frameFiles.length -1; j >= 0; j--)
		{
			var match = frameFiles[j].match(/frame-(\d{5})\.jpg/)
			if(match !== null)
			{
				latestFrame = parseInt(match[1], 10);
				break;
			}
		}
		console.log(latestFrame);

		var streamer = ffmpeg();
		streamer.input(cameras[i].url);
		streamer.inputOptions([
			'-rtsp_transport tcp'
		]);
		streamer.output(cameraFolder + '/capture-%05d.mp4');
		streamer.outputOptions([
			'-c copy',
			'-map 0',
			'-f segment',
			'-segment_time 30',
			'-segment_atclocktime 1',
			'-segment_start_number ' + latestCamera,
			'-segment_format mp4'
		]);
		streamer.output(framesFolder + '/frame-%05d.jpg');
		streamer.outputOptions([
			'-f image2', 
			'-r 0.1',
			'-start_number ' + latestFrame
		]);
		streamer.on('start', function(commandLine) {
			console.log('Spawned Ffmpeg with command: ' + commandLine);
		});
		streamer.on('error', function(commandLine) {
			console.log('Error Ffmpeg with command: ' + commandLine);
		});
		streamer.run();
	}
}
collector();

//ffmpeg -rtsp_transport tcp -i rtsp://192.168.42.21:554/s0 -c copy -map 0 -f segment -segment_time 30 -segment_atclocktime 1 -segment_start_number -segment_format mp4 "/bulk/videotest/capture-%03d.mp4"


