// shared audio element + analyser
export const audio = new Audio();
audio.preload = 'none';
audio.crossOrigin = 'anonymous';
export const audioState = { bass: 0, mid: 0, hi: 0, playing: false };

let ctx, an, fd, wired = false;
function wire() {
  if (wired) return; wired = true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    an = ctx.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.6;
    ctx.createMediaElementSource(audio).connect(an); an.connect(ctx.destination);
    fd = new Uint8Array(an.frequencyBinCount);
  } catch (e) { an = null; }
}
audio.addEventListener('play', () => { wire(); try { ctx && ctx.resume(); } catch (e) { } audioState.playing = true; });
audio.addEventListener('pause', () => { audioState.playing = false; });
audio.addEventListener('ended', () => { audioState.playing = false; });

let t0 = performance.now();
function tick() {
  requestAnimationFrame(tick);
  let b = 0, m = 0, h = 0;
  if (an && !audio.paused) {
    an.getByteFrequencyData(fd);
    for (let i = 1; i < 6; i++) b += fd[i]; b /= 5 * 255;
    for (let i = 6; i < 28; i++) m += fd[i]; m /= 22 * 255;
    for (let i = 28; i < 90; i++) h += fd[i]; h /= 62 * 255;
    b = Math.pow(b, 1.6) * 1.5; m *= 1.5; h *= 2.2;
  } else if (!audio.paused) { // analyser unavailable: gentle fake pulse
    const t = (performance.now() - t0) / 1000; b = .35 + .25 * Math.sin(t * 7.5); m = .3; h = .25;
  }
  const k = b > audioState.bass ? .5 : .12;
  audioState.bass += (Math.min(1, b) - audioState.bass) * k;
  audioState.mid += (Math.min(1, m) - audioState.mid) * .2;
  audioState.hi += (Math.min(1, h) - audioState.hi) * .2;
}
tick();
