var Track = {
	file: ""
, howler: null
, events: null
, isWarning: false
, shouldBePlaying: false
, scoreValue: 0
, targetVolume: 0
};

var tracks = [jQuery.extend({}, Track), jQuery.extend({}, Track), jQuery.extend({}, Track)]

tracks[0].file = "audio/vocal1.mp3";
tracks[1].file = "audio/vocal2.mp3";
tracks[2].file = "audio/percussion.mp3";

// vocal 1
tracks[0].events = [
{start: 0, end: 15, targetVolume: 0.7},
{start: 30, end: 61, targetVolume: 0.7},
{start: 110, end: 122, targetVolume: 0.9}
];

// pharrell

tracks[1].events = [
{start: 45, end: 121, targetVolume: 0.95}
];

// percussions

tracks[2].events = [
{start: 0, end: 13, targetVolume: 0.7},
{start: 17, end: 28, targetVolume: 0.7},
{start: 30, end: 57, targetVolume: 0.6},
{start: 90.5, end: 174, targetVolume: 0.75}
];

var score = 0;
var startTime = null;
var prewarnTime = 1;
var scoreThreshold = 50;
var runIntervalHandle = null;
var backgroundTrack = null;

function start() {
	for (var i = 0; i < tracks.length; i++) {
		track = tracks[i];
		for (var x = 0; x < track.events.length; x++) {
			event = track.events[x];
			
			event.startWarn = Math.max(0, event.start - prewarnTime);
			event.endWarn = event.end - prewarnTime;
		}
		
		track.howler = new Howl({
			urls: [track.file]
		, onload: startGame
		, volume: 0
		});
	}

	backgroundTrack = new Howl({
		urls: ["audio/background.mp3"]
	, volume: 0.7
	,	onend: stop
	});
}

var loadcount = 0;
function startGame() {
	if (++loadcount < tracks.length) {
		return;
	}
	loadcount = 0;

	backgroundTrack.play();
	for (var i = 0; i < tracks.length; i++) {
		tracks[i].howler.play();
	}
	startTime = Date.now();

	runIntervalHandle = setInterval(gameTick, 1000);
}

function stop() {
	backgroundTrack.stop();
	for (var i = 0; i < tracks.length; i++) {
		tracks[i].howler.stop();
		clearInterval(tracks[i].progressInterval);
	}
	if (runIntervalHandle) {
		clearInterval(runIntervalHandle);
	}
}

function occured(currentTime, lastTime, eventTime) {
	return (eventTime <= currentTime && eventTime > lastTime);
}

var lastTimeTick = -10;
function gameTick() {
	var seconds = ((Date.now() - startTime)/1000);
	console.log(seconds);
	
	for (var i = 0; i < tracks.length; i++) {
		var track = tracks[i];

		if (track.howler) {
			track.scoreValue = (track.targetVolume == 0 ? 0 : scoreThreshold) - Math.abs(track.howler.volume() - track.targetVolume);
		}
		
		for (var e = 0; e < track.events.length; e++) {
			var event = track.events[e];

			// Kick off progress bar is warn time
			if (occured(seconds, lastTimeTick, event.startWarn)) {
				if (track.progressInterval) {
					clearInterval(track.progressInterval);
					track.progressInterval = null;
				}
				track.progressInterval = setInterval(function(d, t){doProgressBar(t, true, d)}, 50, event.start, i);

				$('#instrument' + i + ' #targetbar').width(event.targetVolume*100 + "%");
				
				$('#status' + i + ' .bar').addClass("bar-success");
				$('#status' + i + ' .bar').removeClass("bar-danger");
			}
			if (occured(seconds, lastTimeTick, event.endWarn)) {
				if (track.progressInterval) {
					clearInterval(track.progressInterval);
					track.progressInterval = null;
				}
				track.progressInterval = setInterval(function (d, t) {doProgressBar(t, false, d)}, 50, event.end, i);
				
				$('#status' + i + ' .bar').addClass("bar-danger");
				$('#status' + i + ' .bar').removeClass("bar-success");
			}
			
			if (occured(seconds, lastTimeTick, event.start)) {
				console.log("Track [" + i + "] started playing");
				track.shouldBePlaying = true;
				track.targetVolume = event.targetVolume;
				$('#instrument' + i).addClass('shouldBePlaying');
			}
			
			if (occured(seconds, lastTimeTick, event.end)) {
				console.log("Track [" + i + "] stopped playing");
				track.shouldBePlaying = false;
				track.targetVolume = -100;
				$('#instrument' + i).removeClass('shouldBePlaying');
				$('#instrument' + i + ' #targetbar').width("0%");
			}
		}
		
		if (track.shouldBePlaying || track.scoreValue < 0) {
			score += track.scoreValue;
		}
		
		
		
		
		// Update gui
		$('#score').text(Math.round(score));
	}
	
	lastTimeTick = seconds
}

function doProgressBar(trackNumber, isStart, deadline) {
	
	track = tracks[trackNumber];

	now = (Date.now() - startTime)/1000;
	if (now >= deadline) {
		clearInterval(track.progressInterval);
		track.progressInterval = null;
	}
	
	percentage = (1.0 - ((deadline - now) / prewarnTime)) * 100.0;
	
	if (!isStart) {
		percentage = 100.0 - percentage;
	}

	$('#status' + trackNumber + ' .bar').width(percentage + "%");
}

function trackSetVol(trackNumber, volume) {
	volume = Math.round(volume*100);
	if (volume>100) {volume = 100;}
	else if (volume<0) {volume =0;}

	var track = tracks[trackNumber];
	if (track.howler)  {
		track.howler.volume(volume/100);
	}
	
	$('#instrument' + trackNumber + ' #volume').width(volume + "%");
}

// Leap Motion Code
$(document).ready(function() {
	var ctl = new Leap.Controller({enableGestures: true});
	ctl.on('frame', onFrame);

	ctl.connect();

	var intr0x = [-window.innerWidth, 0.2*window.innerWidth];
	var intr1x = [0.2*window.innerWidth,0.8*window.innerWidth];
	var intr2x = [0.8*window.innerWidth, 2*window.innerWidth];

	selected1 = false;
	selected2 = false;

	function onFrame(frame) {

		if (frame.hands.length>0 && frame.hands[0]){
			var position1 = frame.hands[0].palmPosition;
			var normalized1 = frame.interactionBox.normalizePoint(position1);
			var x1 = window.innerWidth * normalized1[0];
			var y1 = window.innerHeight * (1 - normalized1[1]);

			if (frame.hands[1]){
				var position2 = frame.hands[1].palmPosition;
				var normalized2 = frame.interactionBox.normalizePoint(position2);
				var x2 = window.innerWidth * normalized2[0];
				var y2 = window.innerHeight * (1 - normalized2[1]);
			}

			$('.instrument').removeClass('highlight');
			var volume1 = 1-y1/window.innerHeight;
			if(x1>=intr0x[0] && x1<=intr0x[1]) {
				selected1=0;
				trackSetVol(0, volume1);
			}
			if(x1>=intr1x[0] && x1<=intr1x[1]) {
				selected1=1;
				trackSetVol(1, volume1);
			}
			if(x1>=intr2x[0] && x1<=intr2x[1]) {
				selected1=2;
				trackSetVol(2, volume1);
			}
			$('#instrument'+selected1).addClass('highlight');

			if (frame.hands[1]){
				var volume2 = 1-y2/window.innerHeight;
				if(x2>=intr0x[0] && x2<=intr0x[1]) {
					selected2=0;
					trackSetVol(0, volume2);
				}
				if(x2>=intr1x[0] && x2<=intr1x[1]) {
					selected2=1;
					trackSetVol(1, volume2);
				}
				if(x2>=intr2x[0] && x2<=intr2x[1]) {
					selected2=2;
					trackSetVol(2, volume2);
				}

				$('#instrument'+selected2).addClass('highlight');
			}
		}
	}
});