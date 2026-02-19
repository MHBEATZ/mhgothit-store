
fetch('data/beats.json')
.then(r=>r.json())
.then(beats=>{
 const el=document.getElementById('beats');
 beats.forEach(b=>{
  el.innerHTML+=`
   <div class="card">
     <img src="${b.artwork}">
     <h3 style="padding:10px">${b.title}</h3>
     <audio controls style="width:90%;margin:10px" src="${b.preview}"></audio>

     <div class="tiers">
       <div class="tier">
         <strong>Basic</strong>
         <p>$${b.basic}</p>
         <button onclick="buy(${b.basic})">Buy</button>
       </div>
       <div class="tier">
         <strong>Premium</strong>
         <p>$${b.premium}</p>
         <button onclick="buy(${b.premium})">Buy</button>
       </div>
       <div class="tier">
         <strong>Exclusive</strong>
         <p>$${b.exclusive}</p>
         <button onclick="buy(${b.exclusive})">Buy</button>
       </div>
     </div>
   </div>`;
 });
});

function buy(price){
 window.location.href=`https://www.paypal.com/paypalme/mhboss2/${price}`;
}
