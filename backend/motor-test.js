var five = require("johnny-five"),
  board, motor, led;

board = new five.Board();

board.on("ready", function() {




  var configs = five.Motor.SHIELD_CONFIGS.ADAFRUIT_V2;
      motor = new five.Motor(configs.M1);
  console.log("new motor created", motor);

  // Inject the `motor` hardware into
  // the Repl instance's context;
  // allows direct command line access
  board.repl.inject({
    motor: motor
    });
    motorCreated=true;


  // Motor Event API
  motor.on("start", function() {
    console.log("start");


    // Demonstrate motor stop in 2 seconds
    board.wait(5000, function() {
      console.log("stop");
      motor.stop();
    });
  });


  // Motor API

  // start([speed)
  // Start the motor. `isOn` property set to |true|
  // Takes an optional parameter `speed` [0-255]
  // to define the motor speed if a PWM Pin is
  // used to connect the motor.
  motor.start(125);


  //stop()
  // Stop the motor. `isOn` property set to |false|
});
