function generate(){
 output.innerText=JSON.stringify({
  name:name.value,
  cover:"assets/artwork/YOUR-ART.jpg",
  audio:"assets/beats/YOUR-BEAT.mp3",
  licenses:{MP3:+mp3.value,WAV:+wav.value,UNLIMITED:+unl.value}
 },null,2);
}