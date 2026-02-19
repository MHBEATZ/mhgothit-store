
let beats=[], cart=[], discount=0;

fetch('data/beats.json')
.then(r=>r.json())
.then(data=>{beats=data;render(beats);});

function render(list){
 const el=document.getElementById('beats');
 el.innerHTML='';
 list.forEach(b=>{
  el.innerHTML+=`
   <div class="card">
     <img src="${b.artwork}">
     <h3>${b.title}</h3>
     <audio controls src="${b.preview}"></audio>
     <div class="price">$${b.price}</div>
     <button onclick='addToCart(${JSON.stringify(b)})'>Add to Cart</button>
   </div>`;
 });
}

function addToCart(b){
 cart.push(b);
 updateCart();
}

function updateCart(){
 document.getElementById('cartCount').innerText=cart.length;
 const items=document.getElementById('cartItems');
 items.innerHTML='';
 let total=0;
 cart.forEach(i=>{
  total+=i.price;
  items.innerHTML+=`<p>${i.title} - $${i.price}</p>`;
 });
 total=total-(total*discount);
 document.getElementById('total').innerText="Total: $"+total.toFixed(2);
}

function toggleCart(){
 document.getElementById('cartPanel').classList.toggle('hidden');
}

function applyPromo(){
 const code=document.getElementById('promo').value.trim();
 if(code==="MH10"){discount=0.10;alert("10% OFF Applied");}
 else if(code==="FIRE20"){discount=0.20;alert("20% OFF Applied");}
 else alert("Invalid Code");
 updateCart();
}

function checkout(){
 let total=cart.reduce((a,b)=>a+b.price,0);
 total=total-(total*discount);
 window.location.href=`https://www.paypal.com/paypalme/mhboss2/${total.toFixed(2)}`;
}
