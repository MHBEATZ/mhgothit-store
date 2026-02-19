
// Local storage manager (works without backend)
function getBeats(){
 return JSON.parse(localStorage.getItem('mhbeats')||'[]');
}
function addBeat(beat){
 const beats=getBeats();
 beats.push(beat);
 localStorage.setItem('mhbeats',JSON.stringify(beats));
}
