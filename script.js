
const container=document.getElementById('beats');
const beats=JSON.parse(localStorage.getItem('mhbeats')||'[]');

beats.forEach((beat,i)=>{
 const el=document.createElement('div');
 el.className='card';
 el.innerHTML=`
  <h2>${beat.title}</h2>
  <div id="wave${i}" class="wave"></div>

  <div class="controls">
    <button onclick="waves[${i}].playPause()">Play</button>
    <span id="time${i}">0:00</span>
    <input type="range" min="0" max="1" step="0.01"
      onchange="waves[${i}].setVolume(this.value)" />
  </div>

  <p>Basic $${beat.basic}</p>
  <button onclick="buy(${beat.basic})">Buy</button>

  <p>Premium $${beat.premium}</p>
  <button onclick="buy(${beat.premium})">Buy</button>

  <p>Exclusive $${beat.exclusive}</p>
  <button onclick="buy(${beat.exclusive})">Buy</button>
 `;
 container.appendChild(el);
});

window.waves=[];

beats.forEach((beat,i)=>{
 const wave=WaveSurfer.create({
  container:`#wave${i}`,
  waveColor:'#555',
  progressColor:'#ff4d00',
  height:120,
  url:beat.preview
 });

 wave.on('audioprocess',()=>{
  const t=wave.getCurrentTime();
  document.getElementById(`time${i}`).innerText=format(t);
 });

 waves.push(wave);
});

function format(sec){
 const m=Math.floor(sec/60);
 const s=Math.floor(sec%60).toString().padStart(2,'0');
 return m+":"+s;
}

function buy(price){
 window.location.href=`https://www.paypal.com/paypalme/mhboss2/${price}`;
}
