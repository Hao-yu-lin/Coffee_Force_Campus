// Records the brewing-chart playback to a downloadable video.
//
// MediaRecorder captures a canvas in real time, so the recording simply runs
// alongside one playback lap: a 10-second playback yields a 10-second video.
// The frames are composed by the same compositor the PNG export uses, so the
// video carries the dataset colour legend too.

import { createChartCompositor, downloadBlob, makeTimestamp } from './chartExport.js';

const FPS     = 30;
const BITRATE = 8_000_000;   // generous for line art; keeps the curves crisp

// MP4/H.264 first: WebM plays in browsers but not in Keynote, PowerPoint or
// QuickTime, which is where these clips usually end up.
const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t)) ?? null;
}

/** True when this browser can record a canvas at all. */
export function canRecordVideo() {
  return typeof MediaRecorder !== 'undefined'
    && typeof document.createElement('canvas').captureStream === 'function'
    && pickMimeType() !== null;
}

/**
 * Start recording the given chart canvases.
 *
 * @param {HTMLCanvasElement[]} sources  chart canvases to stack into each frame
 * @param {{name:string,color:string}[]} entries  dataset colour legend
 * @returns {{frame: () => void, finish: () => Promise<void>, cancel: () => void}}
 *   `frame()` composites the charts' current contents — call it once per
 *   animation step; `finish()` stops and downloads; `cancel()` throws it away.
 */
export function startPlaybackRecording(sources, entries) {
  const mimeType = pickMimeType();
  if (!mimeType) throw new Error('MediaRecorder cannot encode video here');

  const { canvas, paint } = createChartCompositor(sources, entries);
  const stream   = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: BITRATE });
  const chunks   = [];
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };

  const stopped = new Promise(resolve => { recorder.onstop = resolve; });
  const stopTracks = () => stream.getTracks().forEach(t => t.stop());

  recorder.start();

  let done = false;

  return {
    frame() {
      if (!done && recorder.state === 'recording') paint();
    },

    async finish() {
      if (done) return;
      done = true;
      if (recorder.state !== 'inactive') recorder.stop();
      await stopped;
      stopTracks();
      if (!chunks.length) return;
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
      downloadBlob(new Blob(chunks, { type: mimeType }),
                   `brewing_playback_${makeTimestamp(new Date())}.${ext}`);
    },

    cancel() {
      if (done) return;
      done = true;
      if (recorder.state !== 'inactive') recorder.stop();
      stopTracks();
      chunks.length = 0;
    },
  };
}
