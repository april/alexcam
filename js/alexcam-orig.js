/*global $, jQuery, console, LocalMediaStream, MediaStreamRecorder */
var mirror = {};

function playbackVideo(stream) {
    'use strict';
    var video;
    video = document.querySelector('video');
    
    if (stream instanceof LocalMediaStream) {
        video.src = window.URL.createObjectURL(stream); // initial page playback
    } else {
        video.src = mirror.recorded_videos[0]; // the unending stream of delayed videos
        video.onended = function () {
            window.URL.revokeObjectURL(video.src);
            playbackVideo(true);
        };
        mirror.recorded_videos.shift();
    }
}

function delayedStream(stream) {
    'use strict';
    var i, mediaRecorder = new MediaStreamRecorder(stream); // eventually move this into the app itself
    mediaRecorder.mimeType = 'video/webm';
    mediaRecorder.ondataavailable = function (blob) {
        mirror.recorded_videos.push(window.URL.createObjectURL(blob));
        if ((mirror.delayed === true) && (mirror.recorded_videos.length === 2)) {
            playbackVideo(true);
        } else if (mirror.delayed === false) {
            mediaRecorder.stop();
            for (i = 0; i < mirror.recorded_videos.length; i += 1) { window.URL.revokeObjectURL(mirror.recorded_videos[i]); }
            mirror.recorded_videos = [];
        }
    };
    mediaRecorder.start(mirror.delay * 500);
}

function getVideoStream() {
    'use strict';
    
    // Attempt to get ahold of the media extension (webrtc)
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    
    navigator.getUserMedia({audio: false, video: true}, function (stream) {
        mirror.webcamstream = stream;
        playbackVideo(stream);
    }, function () {
        document.querySelector('body').innerHTML = "<p>sorry, no media support</p>";
    });
}

$(document).ready(function () {
    'use strict';
    var i;
    mirror.delayed = false; // set the mirror as not being delayed
    mirror.defaultdelay = 10;
    mirror.delay = mirror.defaultdelay;
    mirror.recorded_videos = [];

    $("#delay").button().on("click", function () {
        if (mirror.delayed === false) {
            mirror.delayed = true;
            delayedStream(mirror.webcamstream);
        } else {
            mirror.delayed = false;
            playbackVideo(mirror.webcamstream);
        }
    });

    $("#seconds").slider({
        min: 1,
        max: 30,
        value: mirror.defaultdelay,
        create: function () {
            mirror.delay = $("#seconds").slider("option", "value");
            $("#delay").button("option", "label", "Delay Playback " + mirror.delay + " Seconds");
        },
        change: function () {
            mirror.delay = $("#seconds").slider("option", "value");
            $("#delay").button("option", "label", "Delay Playback " + mirror.delay + " Seconds");
        }
    });
    ®
    // load the default video stream on and request permissions, on page load
    getVideoStream();

});

