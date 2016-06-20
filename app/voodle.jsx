import React from 'react';
var Settings = require("./settings.jsx")
var io = require('socket.io-client/socket.io');


var Voodle = React.createClass({
	getInitialState: function() {
		return {
			mix:0.0,
			smoothingFactor:0.0,
			scaleFactor:0.0,
			scale:500,
			amp:0.0,
			pitch:0.0,
			socket:{}
		}
	},
	emit: function(st,msg) {
		this.state.socket.emit(st,msg)
	},
	componentDidMount: function() {
		var socket = io.connect("http://localhost:2000");

		socket.on("broadcast",function(msg){
			this.setState(msg);
		}.bind(this))

		this.setState({socket:socket})
	},
	render: function(){
		var radius;
		if ( ((this.state.mix) * (this.state.scale)) < 0) {
			radius = 0.1;
		}
		else {
			radius = (this.state.mix) * (this.state.scale)
		}
		return (
			<div>
			<div id = "canvas">

				
				
			</div>
			<div id ="overlay">
					<div id ="readOut">
						<b>Amplitude:</b> {(this.state.amp).toString().substring(0,5)}
						<p />
						<b>Pitch:</b> {(this.state.pitch).toString().substring(0,5)}
					</div>
					<Settings emit={this.emit}/>
				</div>

			</div>)
	}
});


module.exports = Voodle;
