const beats=[{name:"HELL DRILL",cover:"assets/artwork/demo-cover.jpg",audio:"assets/beats/demo-beat.mp3",licenses:{MP3:29.99,WAV:59.99,UNLIMITED:149.99}}];
let cart=[];
const store=document.getElementById("beatStore");
const cartItems=document.getElementById("cartItems");
const cartTotal=document.getElementById("cartTotal");

beats.forEach(b=>{
 const c=document.createElement("div");
 c.className="beat-card";
 c.innerHTML=`<img src="${b.cover}"><h3>${b.name}</h3><audio controls src="${b.audio}"></audio>
 <select><option value="MP3">MP3 – $${b.licenses.MP3}</option>
 <option value="WAV">WAV – $${b.licenses.WAV}</option>
 <option value="UNLIMITED">Unlimited – $${b.licenses.UNLIMITED}</option></select>
 <button>Add to Cart</button>`;
 c.querySelector("button").onclick=()=>{
  const l=c.querySelector("select").value;
  cart.push({name:b.name,license:l,price:b.licenses[l]});
  updateCart();
 };
 store.appendChild(c);
});

function updateCart(){
 cartItems.innerHTML="";
 let t=0;
 cart.forEach((i,x)=>{
  t+=i.price;
  cartItems.innerHTML+=`<li>${i.name} (${i.license}) - $${i.price}
  <button onclick="removeItem(${x})">❌</button></li>`;
 });
 cartTotal.innerText=t.toFixed(2);
}
function removeItem(i){cart.splice(i,1);updateCart();}
function checkout(){
 const t=cart.reduce((s,i)=>s+i.price,0).toFixed(2);
 if(t>0) window.open(`https://www.paypal.me/mhboss2/${t}`,"_blank");
}