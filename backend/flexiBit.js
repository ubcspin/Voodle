var coreAudio = require("node-core-audio");
var pitchFinder = require('pitchfinder');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var five = require('johnny-five');
var midi = require('midi');
var colors = require('colors')

// Local requires
var IoHandler = require('./iohandler.js');
var iohandle = new IoHandler(io);

var Recorder = require('./recorder.js');
var recHandler = new Recorder();

// Globals

var parameters = {
	smoothValue: 0,
	gain_for_amp: 0.19685039370078738,
	gain_for_pitch: 0.8031496062992126,
	scaleFactor: 1.9291338582677164,
	servoMax: 180,
	servoMin: 0,
	motorMinSpeed: 60,
	motorMaxSpeed: 255,
	frameRate: 34,
	framesPerBuffer: 10,
	sampleRate: 1000,
	reverse: true,
	on: true,
	minFrequency: 0,
	maxFrequency: 0,
	p: 0.18,
	i: 0,
	d: 0.031496062992125984,
	r: 0,
	wheelControl: true,
	currentServoPos: 0,
}

var startRecTime = new Date();
var startRecTimeString = Date.now() // string like 123214312341234
// David

var led;
var ledCreated = false;
var servoMode = true;
var motorMode = false;
var ledMode = false;

var motor;
var motorCreated = false;

var servoCreated = false;
var servo;


//

var board;


var pitch;
var ampRaw;
var smoothOut = 1;

var detectPitchAMDF;

// var detectPitchDW = new pitchFinder.DynamicWavelet();
var last = new Date() //imposes a framerate with `var now`

var recording = false
var name;

//////// PID
var i_term = 0
var prev_error = 0
var current = 0
var target = 0



function setTarget(val) {
	target = val
}

function smooth() {
	r_term = Math.random() - 0.5
	error = (target + (parameters.r * r_term) ) - current
	d_term = error - prev_error
	i_term += error

	prev_error = error

	change = ((parameters.p * error) - (parameters.d * d_term))

	outpos = current + change

	current = outpos

	return outpos
}

////////


///////////////////////////////////////////////////////////////////
// Main
function main() {
	//set up server
	server.listen(2000);

	app.use(express.static(__dirname + '/js'));

	app.get('/', function (req, res) {
	  res.sendfile(__dirname + '/voodle-index.html');
	});
	console.log("dir name: ",__dirname)

	app.use(express.static(__dirname + '/css'));

	board = new five.Board();

	detectPitchAMDF = new pitchFinder.AMDF({
		sampleRate:parameters.sampleRate,
		minFrequency:parameters.minFrequency,
		maxFrequency:parameters.maxFrequency
	});


	///////////////////////////////////////////////////////////////////
	// Midi
	// Set up a new input.
	var input = new midi.input();

	// Count the available input ports.
	input.getPortCount();

	// Get the name of a specified input port.
	input.getPortName(0);

	// Configure a callback.
	input.on('message', function(deltaTime, message) {
		// The message is an array of numbers corresponding to the MIDI bytes:
		//   [status, data1, data2]
		// https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
		// information interpreting the messages.

		// sample message
		// m:144,43,0 d:0.007319826000000001
		// m:area,controller,value d:velocity
		// note that controller is NOT unique, but (area,controller) is
		// example: keyboard key five has controller == 5, and knob 5 has controller == 5

		var area = message[0]
		var controller = message[1];
		var value = message[2];

		midiconfig[area][controller] = value;
		if ((area == midi_area_map_reverse['pads']) && (controller == 49)) {
			doreverse(value);
		}
		if ((area == midi_area_map_reverse['pads']) && (controller == 42)) {
			doWheelChange(value);
		}
		if ((area == midi_area_map_reverse['knobs_buttons']) && (controller == 25)){
			if (!recording){
				startRecording();
			}
			else {
				stopRecording();
			}
		}
		updateMidi()

		 console.log('m:' + message + ' d:' + deltaTime);

	});

	// Open the first available input port.
	input.openPort(0);

	// Sysex, timing, and active sensing messages are ignored
	// by default. To enable these message types, pass false for
	// the appropriate type in the function below.
	// Order: (Sysex, Timing, Active Sensing)
	// For example if you want to receive only MIDI Clock beats
	// you should use
	// input.ignoreTypes(true, false, true)
	input.ignoreTypes(false, false, false);

	// ... receive MIDI messages ...

	// Close the port when done.
	// input.closePort(); // uncomment me for close script

	///////////////////////////////////////////////////////////////
	//start of audio analysis//////////////////////////////////////
	///////////////////////////////////////////////////////////////

	// Create a new audio engine
	var engine = coreAudio.createNewAudioEngine();

		engine.setOptions({
		outputChannels:1,
		inputChannels:1,
		framesPerBuffer:parameters.framesPerBuffer,
		sampleRate:parameters.sampleRate
	});

	engine.addAudioCallback( processAudio );

	//////////listens for updates from frontend/////////////////////////////

	// io.on('connection', function (socket) {
	// 	console.log("connected to client!");
	//   	socket.on("updateParams", function (data) {

	//   		console.log("UpdateParams", data) //remember that this is slightly asynch. with the render loop.
	//   		if ('ap_weight' in data){
	//   			parameters.gain_for_amp = data.ap_weight;
	//   			parameters.gain_for_pitch = 1 - parameters.gain_for_amp;
	//   		}
	//   		if('scale' in data){
	//   			parameters.scaleFactor = data.scale;
	//   			console.log("\nnew scale factor: " + parameters.scaleFactor)
	//   		}
	//   		if('smoothing' in data){
	//   			parameters.smoothValue = data.smoothing;
	//   			console.log("\nnew smooth factor: "+ parameters.smoothValue)
	//   		}
	//   		if ('servoMax' in data){
	//   			console.log("\nnew max servo range:" + parameters.servoMax)
	//   			parameters.servoMax = data.servoMax;
	//   		}
	// 		if ('servoMin' in data){
	// 			console.log("\nnew min servo range:" + parameters.servoMin)
	// 			parameters.servoMin = data.servoMin;
	// 		}
	// 		if ('motorMax' in data){
	// 			console.log("\nnew max motor speed: "+ parameters.motorMaxSpeed)
	// 			parameters.motorMaxSpeed = data.motorMax;
	// 		}
	// 		if ('motorMin' in data){
	// 			console.log("\nnew min motor speed: "+ parameters.motorMinSpeed)
	// 			parameters.motorMinSpeed = data.motorMin;
	// 		}

	//   });
	//   	socket.on("startRec",function(){
	//   		startRecording()
	//   	})
	//   	socket.on("stopRec", function(){
	//   		stopRecording()
	//   	})
	//   	socket.on("reverse", function(){
	//   		parameters.reverse = !parameters.reverse
	//   	})
	//   	socket.on("toggleOn", function(){
	//   		parameters.on = !parameters.on
	//   	})
	//   	socket.on("exportParams", function(){
	//   		var time = new Date().getTime();
	//   		bigFatParametersList = "";

	//   		for (key in parameters) {
	//   			console.log(key);
	//   			console.log(parameters[key])

	//   			bigFatParametersList = bigFatParametersList+key+": "+parameters[key]+"  \n"
	//   		};
 //            console.log('exporting parameters!');
 //            fs.writeFile('recordings/'+time+'_parameters_snapshot.txt', bigFatParametersList, function (err) {
 //                  if (err) return console.log(err);
 //              })
	//   	})
	// });

	board.on("ready", function() {

	if (servoMode){
			console.log('servo created!')
			servo = new five.Servo({
		    pin: 10,
		    startAt: 90
		  });

		  servoCreated=true;
		};
	if (motorMode){
		//this uses the adafruit shield (v2).
		var configs = five.Motor.SHIELD_CONFIGS.ADAFRUIT_V2;
	  		motor = new five.Motor(configs.M1);
		console.log("new motor created", motor);

	  // Inject the `motor` hardware into
	  // the Repl instance's context;
	  // allows direct command line access
		board.repl.inject({
	    motor: motor,
			parameters: parameters
			});
	    motorCreated=true;

	};
	if (ledMode){
		//constructs an RGB LED
	  led = new five.Led.RGB({
	    pins: {
	      red: 9,
	      green: 10,
	      blue: 11,
	    }
	  });

	  this.repl.inject({
	    led: led
	  });
	  ledCreated =true;
	}

});

}

function processAudio( inputBuffer ) {
	var now = new Date()
	handleRecording(inputBuffer[0])
	//vars `now` and `last` ensures it runs at 30fps
	if ((now-last)>parameters.frameRate){

		ampRaw = Math.abs(Math.max.apply(Math, inputBuffer[0]));

			detectPitchAMDF = new pitchFinder.AMDF({
		sampleRate:parameters.sampleRate,
		minFrequency:parameters.minFrequency,
		maxFrequency:parameters.maxFrequency
	});


		//start of pitch analysis///////////////////////////////////////////
		pitch = detectPitchAMDF(inputBuffer[0]);
		if (pitch==null){
			pitch = 0
		}
		else{
			pitch = mapValue(pitch, 0,1000,0,1)
		}

		//end of pitch analysis///////////////////////////////////////////

		//mixes amplitude and frequency, while scaling it up by scaleFactor.
		var ampPitchMix = (parameters.gain_for_amp * ampRaw + parameters.gain_for_pitch * pitch) * parameters.scaleFactor;

		//smooths values
		//Note: smoothValue is a number between 0-1
		smoothOut = parameters.smoothValue * smoothOut + (1 - parameters.smoothValue) * ampPitchMix;

		//writes values to arduino
		if(!parameters.wheelControl){
				setTarget(ampPitchMix);
		}
		//resets timer to impose a framerate
		last = now;

		//broadcasts values to frontend
		if (parameters.on) {
				// broadcastValues();
		}
	}

	return inputBuffer;

}

function handleRecording(buffer){
	if (recording ==  true){
		writeToAudioBufferFile(name, buffer)

	}
}

function writeToAudioBufferFile(name, buffer) {
	var out = ''
	buffer.forEach(function(f){
		out = out +'0,' + f + '\n'
	})
	fs.appendFile("/Users/andrewmoore/Documents/Voodle-record/"+name+"_recording.csv", out, function(err){
		if (err){
			return console.log(err);
		}
	})

}

function startRecording(){
	console.log("start rec. has been called!")
	recording = true;
	startRecTime = new Date()
	startRecTimeString = Date.now() // unix time like 37452342345243
	name = startRecTime.getTime();
}

function stopRecording(){
	recording = false;
	writeParams();

}

function writeParams(){
	var url = "/Users/andrewmoore/Documents/Voodle-record/" + name + "_parameters.json";
	fs.appendFile(url, JSON.stringify(parameters), function(err){
	if (err){
		return console.log(err);
	}
	console.log("wrote params file to" + url)
	})
}

///////////////////////////////////////////////////////////////
//start of audio analysis//////////////////////////////////////
///////////////////////////////////////////////////////////////

// Add an audio processing callback
// This function accepts an input buffer coming from the sound card,
// and returns an ourput buffer to be sent to your speakers.
//
// Note: This function must return an output buffer
//		if you don't want the function to playback to your speakers,
//		return an array of 0 (maybe).

//// Midi functions

var midiconfig = {
	144: { 0: 0 },
	153: { 0: 0, 42: 0, 49: 0 },
  176:
   { 1: 0,
     5: 108,
     7: 126,
     10: 4,
     71: 101,
     84: 27,
     91: 51,
     93: 10 },
  224: { 0: 64, 127: 127 } }

midi_area_map = {
	224:'pitch bend',
	176:'modulation',
	144:'keyboard',
	176:'knobs_buttons',
	153:'pads'
}

midi_area_map_reverse = {
	'pitch': 224,
	'modulation': 176,
	'keyboard': 144,
	'knobs_buttons': 176,
	'pads': 153
}

var mapping = {
	'mix': {
		'area': midi_area_map_reverse['knobs_buttons'],
		'controller': 71, // top left
		'scale': [0,127],
		'target_scale':[0,1]
	},
	'smoothingFactor': {
		'area': midi_area_map_reverse['modulation'],
		'controller': 1,
		'scale': [0,127],
		'target_scale':[0,1]
	},
	'scaleFactor': {
		'area': midi_area_map_reverse['knobs_buttons'],
		'controller': 91, //second from top left
		'scale': [0,127],
		'target_scale':[0,5]
	},
	'minFrequency': {
		'area': midi_area_map_reverse['knobs_buttons'],
		'controller': 93,
		'scale': [0,127],
		'target_scale':[5,1200]
	},
	'maxFrequency': {
		'area': midi_area_map_reverse['knobs_buttons'],
		'controller': 5,
		'scale': [0,127],
		'target_scale':[5,1200]
	},
	'position': {
		'area': midi_area_map_reverse['pitch'],
		'controller': 0,
		'scale': [0,127],
		'target_scale':[0,1]
	},
	'random': {
		'area': midi_area_map_reverse['modulation'],
		'controller': 1,
		'scale': [0,127],
		'target_scale':[0,1.0]
	},
	'p': {
		'area': midi_area_map_reverse['knobs_buttons'],
		'controller': 7, //top right
		'scale': [0,127],
		'target_scale':[0,0.18]
	},

	'd': {
		'area': midi_area_map_reverse['knobs_buttons'],
		'controller': 10, //bottom right
		'scale': [0,127],
		'target_scale':[0,1]
	},
	'reverse': {
		'area': 153, //pads
		'controller': 49, //top right
		'scale': [0,127],
		'target_scale':[0,0.18]
	},



}

midi_fn_map = {
	'mix': domix,
	'smoothingFactor': dosmooth,
	'scaleFactor' : doscale,
	'maxFrequency': domaxhz,
	'minFrequency': dominhz,
	'position': dopos,
	'random': dorandom,
	'p': dop,
	'd': dod,

}

function dop(val) {
	parameters.p = val
}
function dod(val) {
	parameters.d = val
}
function dorandom(val) {
	parameters.r = val
}

function dopos(val) {
	if (parameters.wheelControl){
		setTarget(val)
	}
}
function domix(val) {
	parameters.gain_for_amp = 1 - val
	parameters.gain_for_pitch = val
}
function dosmooth(val) {
	parameters.smoothValue = val
}
function doscale(val) {
	parameters.scaleFactor = val
}
function domaxhz(val) {
	parameters.maxFrequency = val
	detectPitchAMDF.maxFrequency = val
}
function dominhz(val) {
	parameters.minFrequency = val
	detectPitchAMDF.minFrequency = val
}

function doreverse(val){
	if (val == 0) {
		// console.log('in doreverse', parameters.reverse,'\n---------')
		parameters.reverse = !parameters.reverse;
		// console.log('changed val: ', parameters.reverse)
	}
}

function pad(str,n,chr) {
	var k = n - str.length
	for (var i = 0; i< k; i++) {
		str = chr + str
	}
	return str
 }

function doWheelChange(val){
	if (val == 0) {
		// console.log('switching control setup')
		parameters.wheelControl = !parameters.wheelControl
	}
}
function updateMidi() {
	getmidi('mix');
	getmidi('smoothingFactor');
	getmidi('scaleFactor');
	getmidi('minFrequency');
	getmidi('maxFrequency');
	getmidi('position');
	getmidi('random');
	getmidi('p');
	getmidi('d');

	speciallog(parameters)

}
function speciallog(p) {
	console.log('\033[2J');
	var keys = Object.keys(p)
	var stopwords = {'frameRate':0,
					 'servoMax':0,
					 'servoMin':0,
					 'smoothValue':0,
					 'motorMinSpeed':0,
					 'motorMaxSpeed':0,
					 'framesPerBuffer':0,
					 'sampleRate': 0,
					 'on': 0,
					}
					console.log(pad("amp bias",20,' '),drawSliderBar(p[keys[2]],0,1),' pitch bias' )
					for (var i = 0; i < keys.length; i++) {


						if (!(keys[i] in stopwords)) {
							if(keys[i]=="scaleFactor"){

								 console.log(pad(keys[i],20,' '), drawBar(p[keys[i]],mapping.scaleFactor.target_scale[0],mapping.scaleFactor.target_scale[1]));
							}
							else if(keys[i]=="p"){
								 console.log(pad(keys[i],20,' '), drawBar(p[keys[i]],mapping.p.target_scale[0],mapping.p.target_scale[1]));
							}
							else if(keys[i]=="d"){
								 console.log(pad(keys[i],20,' '), drawBar(p[keys[i]],mapping.d.target_scale[0],mapping.d.target_scale[1]));
							}
							else if(keys[i]=="r"){
								 console.log(pad(keys[i],20,' '), drawBar(p[keys[i]],mapping.random.target_scale[0],mapping.random.target_scale[1]));
							}
							else{
							console.log(pad(keys[i],20,' '), p[keys[i]].toString().bold);
							}
						}

					}

}
function getmidi(tag) {

	var i = mapping[tag]['area']
	var j = mapping[tag]['controller']
	var minIn = mapping[tag]['scale'][0]
	var maxIn = mapping[tag]['scale'][1]

	var minOut = mapping[tag]['target_scale'][0]
	var maxOut = mapping[tag]['target_scale'][1]

	var ret = 0
	if (midiconfig[i][j]) {
		var val = midiconfig[i][j]
		ret = mapValue(val, minIn, maxIn, minOut, maxOut)
	}
	midi_fn_map[tag](ret)
	return ret
}

//////////////////////////////////////////////////////////////
//Arduino communication code/////////////////////////////////
////////////////////////////////////////////////////////////

function clamp(v,mn,mx) {
	if (v > mx) {
		return mx;
	}
	if (v < mn) {
		return mn
	}
	return v
}
function setArduino(sm) {

	sm = clamp(sm,0,1)
	// console.log('sending arduino to ' + sm)
	// if (servoCreated){
	// 	if (reverse){
	// 	//maps the audio input to the servo value range, and calculates the difference
	// 	//so that it moves upwards with increased amplitude.
	// 	servo.to(mapValue(sm, 0, 1, parameters.servoMin, parameters.servoMax));
	// 	}
	// 	else {

	// 			servo.to(parameters.servoMax - mapValue(sm, 0, 1, parameters.servoMin, parameters.servoMax));
	// 		}
	// };
	var setpoint = 0
	if (servoCreated){
		if (parameters.reverse){
			//maps the audio input to the servo value range, and calculates the difference
			//so that it moves upwards with increased amplitude.
			setpoint = parameters.servoMax - mapValue(sm, 0, 1, parameters.servoMin, parameters.servoMax)

			parameters.currentServoPos = setpoint;
		}
		else {
			setpoint = mapValue(sm, 0, 1, parameters.servoMin, parameters.servoMax)

			parameters.currentServoPos = setpoint;
		}
		servo.to(clamp(setpoint, parameters.servoMin, parameters.servoMax))
	};
	if(motorCreated){
		if (parameters.reverse){
			motor.reverse(mapValue(sm, 0, 1, parameters.motorMinSpeed, parameters.motorMaxSpeed));
		}
		else {
			motor.forward(mapValue(sm, 0, 1, parameters.motorMinSpeed, parameters.motorMaxSpeed));
			}
	};
	// if(ledCreated){
	// 	n = mapValue(sm, 0, 1, 0, 255)
	//     led.color(n,0,n);
 //  	};
};

function mapValue(value, minIn, maxIn, minOut, maxOut){
	return ((value / (maxIn - minIn) )*(maxOut - minOut))+minOut;
}

function loop() {
	setInterval(function() {
		setArduino(smooth())
	}, 10)

}

function drawBar(current,minValue,maxValue) {
	var barLength = Math.floor(mapValue(current,minValue,maxValue,0,20));

	var theRest = 20-barLength;
	var bar = "[";

	for (var i = 0; i < barLength; i++) {

		bar = bar+colors.green("+").bold
	}

	for (var i = 0; i<theRest;i++){
		bar = bar+colors.grey("-")
	}
	bar = bar+"]"
	return bar

}

function drawSliderBar(current,minValue,maxValue) {
	var barLength = Math.floor(mapValue(current,minValue,maxValue,0,20));

	var theRest = 20-barLength;
	var bar = "[";

	for (var i = 0; i < barLength-1; i++) {

		bar = bar+colors.grey("-")
	}
	bar = bar+colors.green("(^-^)").bold

	for (var i = 0; i<theRest;i++){
		bar = bar+colors.grey("-")
	}
	bar = bar+"]"
	return bar

}

///////////////////////////////////////////////////////////////////////////
// RUN MAIN
main()
loop()
