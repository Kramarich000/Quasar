let audioContext = null;
let audioBuffer = null;
let sourceNode = null;
let gainNode = null;

export function initAudio(src) {
  if (audioContext) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.connect(audioContext.destination);

  const scheduleLoad =
    window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  scheduleLoad(async () => {
    try {
      const response = await fetch(src);
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.loop = true;
      sourceNode.connect(gainNode);

      sourceNode.start(0);

      const now = audioContext.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.4, now + 3.0);

      console.log('WebAudio: музыка запущена');
    } catch (err) {
      console.error(
        'WebAudio: не удалось загрузить или запустить музыку',
        err,
      );
    }
  });
}

export function stopAudio() {
  if (sourceNode) {
    sourceNode.stop(0);
    sourceNode.disconnect();
    sourceNode = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  audioBuffer = null;
}

export function setVolume(value) {
  if (gainNode) {
    const t = audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setTargetAtTime(value, t, 0.01);
  }
}
