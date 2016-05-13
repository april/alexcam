/*global $, console, MediaStream, MediaStreamRecorder */
var mirror = {
  container: document.getElementById('video-container'),
  defaultdelay: 5
};

function createAndInsertVideoElement(src, zindex) {
  'use strict';

  // create the element
  var v = document.createElement('video');
  v.src = src;
  v.style.zIndex = zindex;

  // give it the webcam id, if it's zindex of 0
  if (zindex === 0) {
    v.id = 'webcam';
  } else {

  // revoke the blob once it is finished being played and then remove the element from the page
    v.onended = function () {
      // revoke the blob once it is finished being played
      window.URL.revokeObjectURL(v.src);

      // remove the element from the page
      v.parentNode.removeChild(v);

      // and begin playing the next video
      mirror.container.firstChild.play();
    };
  }

  // add the element to the page
  mirror.container.appendChild(v);

  // we only ever want the last two recorded videos in the container
  if (mirror.container.childElementCount === 4) {
    window.URL.revokeObjectURL(mirror.container.childNodes[1].src);
    mirror.container.removeChild(mirror.container.childNodes[1]);
  }

  return v;
}

function playbackVideo(stream) {
  'use strict';

  if (mirror.delayed) {
    // remove the webcam
    mirror.container.removeChild(document.getElementById('webcam'));
  }

  // start playing the videos
  mirror.container.firstChild.play();
}

function recordVideo() {
  'use strict';

  // create a new MediaStreamRecorder
  mirror.recorder = new MediaStreamRecorder(mirror.stream);
  mirror.recorder.mimeType = 'video/webm';
  mirror.recorder.width = 640;
  mirror.recorder.height = 480;

  // when it's finished recording a segment, add the video to the container
  mirror.recorder.ondataavailable = function (blob) {
    if (mirror.discardNextVideo) {
      mirror.discardNextVideo = false;
    } else {
      createAndInsertVideoElement(window.URL.createObjectURL(blob), mirror.zindex);
      mirror.zindex = mirror.zindex - 1;
    }
  };

  mirror.recorder.delay = mirror.delay;

  mirror.recording = true;
  mirror.recorder.start(mirror.delay * 500);
}

function initializeMirror() {
  'use strict';
  // set the values in the mirror object
  mirror.delayed = false;
  mirror.fullstream = false;
  mirror.zindex = -1;

  if (!mirror.delay) {
    mirror.delay = mirror.defaultdelay;
  }

  // stop the recording
  if (mirror.recorder) {
    mirror.recorder.stop();
  }

  // remove all video elements in the container
  while (mirror.container.firstChild) {
    // revoke its blob, if it's not the stream
    if (mirror.container.firstChild.id !== 'webcam') {
      window.URL.revokeObjectURL(mirror.container.firstChild.src);
    }

    // remove the video element from the page
    mirror.container.removeChild(mirror.container.firstChild);
  }

  if (mirror.stream) {
    recordVideo();  // begin recording
  } else {  // request the webcam, if we don't have it

    // Attempt to get ahold of the media extension (webrtc)
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia
      || navigator.mozGetUserMedia || navigator.msGetUserMedia;

    navigator.getUserMedia({audio: false, video: true}, function (stream) {
      mirror.stream = stream;
      mirror.streamurl = window.URL.createObjectURL(mirror.stream);

      // reinitialize, to display the webcam on the page
      initializeMirror();
    }, function () {
      // if they refuse to grant webcam access
      document.querySelector('body').innerHTML = '<p>sorry, no media support</p>';
    });
  }

  if (mirror.streamurl) {
    // insert in a plain video element that just uses the webcam
    createAndInsertVideoElement(mirror.streamurl, 0);

    // start its playback
    playbackVideo();
  }
}

function delayStream() {
  'use strict';
  var delayButton = $('#delay');

  if (mirror.container.childElementCount < 3) {
    delayButton.button('option', 'label', 'Buffering...');
    setTimeout(delayStream, 100);
    return false;
  }

  // In case it was set to Buffering..., or it's delayed
  delayButton.button('option', 'label', 'Resume Normal Playback');

  playbackVideo();
}

$(document).ready(function () {
  'use strict';

  // configure the initial state of the Start Delay button
  $('#delay').button().on('click', function () {
    mirror.delayed = !mirror.delayed;

    if (mirror.delayed) {
      delayStream();
    } else {
      $('#delay').button('option', 'label', 'Start Delay');
      initializeMirror();
    }
  });

  $('#fullscreen').button().on('click', function () {
    var rfs = mirror.container.requestFullScreen || mirror.container.webkitRequestFullScreen || mirror.container.mozRequestFullScreen;
    rfs.call(mirror.container);
  });

  $('#seconds').slider({
    min: 1,
    max: 60,
    value: mirror.defaultdelay,
    create: function () {
      mirror.delay = $('#seconds').slider('option', 'value');
      $('#seconds-display').text(mirror.delay);
    },
    slide: function (event, ui) {
      $('#seconds-display').text(ui.value);
    },
    change: function () {
      mirror.delay = $('#seconds').slider('option', 'value');
      mirror.discardNextVideo = true;
      $('#seconds-display').text(mirror.delay);
      $('#delay').button('option', 'label', 'Start Delay');

      // Reinitialize everything
      initializeMirror();
    }
  });

  // load the default video stream on and request permissions, on page load
  initializeMirror();
});
