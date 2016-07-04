//------------------------------------------------------------------------------
// Voodle
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Requires
//------------------------------------------------------------------------------
var coreAudio = require("node-core-audio");
var pitchFinder = require('pitchfinder');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var fs = require('fs');
var five = require('johnny-five');
var serialPort = require('serialport'); // for checking if serial ports are open

// Local requires
var IoHandler = require('./iohandler.js');
var iohandle = new IoHandler(io);

var Recorder = require('./recorder.js');
var recHandler = new Recorder();

//------------------------------------------------------------------------------
// Globals
//------------------------------------------------------------------------------
var recordingFilePath = '/Users/maclean/Documents/HOME/WORK/CODE/MacaronBit/recordings/'

var parameters = {
	smoothValue: 0.8, 
	gain_for_amp: 0.4,
	gain_for_pitch: 0.6,
	scaleFactor: 3,
	servoMax: 75,
	servoMin: 10,
	motorMinSpeed:50,
	motorMaxSpeed:255,
	frameRate:34,
	framesPerBuffer:400,
	sampleRate:40000,
	reverse:false,
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

	detectPitchAMDF = new pitchFinder.AMDF({
		sampleRate:40000,
		minFrequency:5,
		maxFrequency:1200
	});

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

	io.on('connection', function (socket) {
		console.log("connected to client!");
	  	socket.on("updateParams", function (data) {

	  		console.log("UpdateParams", data) //remember that this is slightly asynch. with the render loop.
	  		if ('ap_weight' in data){
	  			parameters.gain_for_amp = data.ap_weight;
	  			parameters.gain_for_pitch = 1 - parameters.gain_for_amp;
	  		}
	  		if('scale' in data){
	  			parameters.scaleFactor = data.scale;
	  			console.log("\nnew scale factor: " + parameters.scaleFactor)
	  		}
	  		if('smoothing' in data){
	  			parameters.smoothValue = data.smoothing;
	  			console.log("\nnew smooth factor: "+ parameters.smoothValue)
	  		}
	  		if ('servoMax' in data){
	  			console.log("\nnew max servo range:" + parameters.servoMax)
	  			parameters.servoMax = data.servoMax;
	  		}
			if ('servoMin' in data){
				console.log("\nnew min servo range:" + parameters.servoMin)
				parameters.servoMin = data.servoMin;
			}
			if ('motorMax' in data){
				console.log("\nnew max motor speed: "+ parameters.motorMaxSpeed)
				parameters.motorMaxSpeed = data.motorMax;
			}
			if ('motorMin' in data){
				console.log("\nnew min motor speed: "+ parameters.motorMinSpeed)
				parameters.motorMinSpeed = data.motorMin;
			}
	 
	  });
	  	socket.on("startRec",function(){
	  		startRecording()
	  	})
	  	socket.on("stopRec", function(){
	  		stopRecording()
	  	})
	  	socket.on("reverse", function(){
	  		parameters.reverse = !parameters.reverse
	  	})
	});

	// // Deal with the stupid boards
	// serialPort.list(function (err, ports) {
	// 	var filtered = ports.filter(function(port){
	// 		// SerialPort(path,options,openImmediately)
	// 		var srlport = new serialPort.SerialPort(port.comName,{},false)
	// 		return 	(port.comName.slice(0,11) == '/dev/cu.usb') &&
	// 				(!srlport.isOpen()) ? true : false;
	// 	})
	// 	boardload(filtered[0].comName);
	// 	console.log(filtered)
	// });

}

// function boardload(portPath) {
// 	console.log("Portpath",portPath)
// 	board = new five.Board( { port: portPath } );

// 	board.on("ready", function() {

// 	if (servoMode){
// 			console.log('servo created!')
// 			servo = new five.Servo({
// 		    pin: 10,
// 		    startAt: 90
// 		  });

// 		  servoCreated=true;
// 		};
// 	if (motorMode){
// 		//this uses the adafruit shield (v2).
// 		var configs = five.Motor.SHIELD_CONFIGS.ADAFRUIT_V2;
// 	  		motor = new five.Motor(configs.M1);

// 	  // Inject the `motor` hardware into
// 	  // the Repl instance's context;
// 	  // allows direct command line access
// 		board.repl.inject({
// 	    motor: motor
// 	    });
// 	    motorCreated=true;	
// 	};
// 	if (ledMode){
// 		//constructs an RGB LED
// 	  led = new five.Led.RGB({
// 	    pins: {
// 	      red: 9,
// 	      green: 10,
// 	      blue: 11,
// 	    }
// 	  });

// 	  this.repl.inject({
// 	    led: led
// 	  });
// 	  ledCreated =true;
// 	}

// });

// }


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
	fs.appendFile(recordingFilePath +name+"_recording.csv", out, function(err){
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
	fs.appendFile(recordingFilePath  + name + "_parameters.json", JSON.stringify(parameters), function(err){
	if (err){
		return console.log(err);
	}
	console.log("wrote params file!")
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


function processAudio( inputBuffer ) {
	var now = new Date()
	handleRecording(inputBuffer[0])
	//vars `now` and `last` ensures it runs at 30fps
	if ((now-last)>parameters.frameRate){	

		ampRaw = Math.abs(Math.max.apply(Math, inputBuffer[0]));
		
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
		setArduino(smoothOut);

		//resets timer to impose a framerate
		last = now;
		
		//broadcasts values to frontend
		broadcastValues();

		}

		return inputBuffer;

}

//////////////socket.io emit functions////////////////
function broadcastValues() {
		//applies gain to pitch
		var pitchGain = parameters.gain_for_pitch * pitch
		if (pitchGain > 1.5) {
			pitchGain = 1.5;
		};

		var ampGain = parameters.gain_for_amp * ampRaw
		if (ampGain > 1) {
			ampGain = 1;
		};

		iohandle.broadcast({
				amp:ampGain,
				pitch:pitchGain,
				mix:smoothOut,
				recording:recording,
				startRecTimeString:startRecTimeString, // in unix time like 123123413413
			}
		);
		// iohandle.broadcastPitch(pitchGain);
		// iohandle.broadcastMix(smoothOut);
		// iohandle.broadcastAmpGain(parameters.gain_for_amp)
		// iohandle.broadcastPitchGain(parameters.gain_for_pitch) 
		// iohandle.broadcastScale(parameters.scaleFactor);
		
}

function sendDirtySocket(to) {
	// servo.to(to)
	iohandle.emit('dirty_reroute',to);
}


//////////////////////////////////////////////////////////////
//Arduino communication code/////////////////////////////////
////////////////////////////////////////////////////////////

function setArduino(sm) {
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

	// if (servoCreated){ uncomment me later when things are better
		var sendme = 0;
		if (parameters.reverse){
			sendme = parameters.servoMax - mapValue(sm, 0, 1, parameters.servoMin, parameters.servoMax);
		} else {
			sendme = mapValue(sm, 0, 1, parameters.servoMin, parameters.servoMax);
		}
		sendDirtySocket(sendme);
		console.log("Send me val ", sendme)
		// if (parameters.reverse){
		// //maps the audio input to the servo value range, and calculates the difference
		// //so that it moves upwards with increased amplitude.
		// 	servo.to(parameters.servoMax - mapValue(sm, 0, 1, parameters.servoMin, parameters.servoMax));
		// }
		// else {
		// 		servo.to(mapValue(sm, 0, 1, parameters.servoMin, parameters.servoMax));
		// 	}
	// };
	if(motorCreated){
		if (parameters.reverse){
			motor.reverse(mapValue(sm, 0, 1, parameters.motorMinSpeed, parameters.motorMaxSpeed));
		}
		else {
			motor.forward(mapValue(sm, 0, 1, parameters.motorMinSpeed, parameters.motorMaxSpeed));
			}
	};
	if(ledCreated){
		n = mapValue(sm, 0, 1, 0, 255)
	    led.color(n,0,n);
  	};
};

function mapValue(value, minIn, maxIn, minOut, maxOut){
	return (value / (maxIn - minIn) )*(maxOut - minOut);
}

///////////////////////////////////////////////////////////////////////////
// RUN MAIN
main()