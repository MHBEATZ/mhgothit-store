
const beats = [
  {title:"Dark Industry Beat", audio:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"},
  {title:"Trap Anthem", audio:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"},
  {title:"Drill Heatwave", audio:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"}
];

let cart = JSON.parse(localStorage.getItem("mhCartV3")) || [];
const grid = document.getElementById("beatsGrid");
const cartDrawer = document.getElementById("cartDrawer");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");

cartCount.innerText = cart.length;

beats.forEach((beat,i)=>{
  const card = document.createElement("div");
  card.className="beat-card";
  card.innerHTML=`
    <h3>${beat.title}</h3>
    <audio controls src="${beat.audio}"></audio>
    <div>
      <button class="license-btn" onclick="addToCart('${beat.title}',40)">Basic $40</button>
      <button class="license-btn" onclick="addToCart('${beat.title}',80)">Premium $80</button>
      <button class="license-btn" onclick="addToCart('${beat.title}',200)">Exclusive $200</button>
    </div>
  `;
  grid.appendChild(card);
});

function addToCart(title,price){
  cart.push({title,price});
  localStorage.setItem("mhCartV3",JSON.stringify(cart));
  cartCount.innerText = cart.length;
  renderCart();
}

function renderCart(){
  cartItems.innerHTML="";
  let total=0;
  cart.forEach(item=>{
    total+=item.price;
    const div=document.createElement("div");
    div.innerHTML=`<p>${item.title} - $${item.price}</p>`;
    cartItems.appendChild(div);
  });
  cartTotal.innerText="Total: $"+total;
  document.getElementById("checkoutBtn").href="https://paypal.me/mhboss2/"+total;
}

document.getElementById("cartBtn").onclick=()=>{
  cartDrawer.classList.toggle("cart-open");
}

document.getElementById("themeToggle").onclick=()=>{
  document.body.classList.toggle("light-mode");
}

function saveEmail(){
  const email=document.getElementById("emailInput").value;
  localStorage.setItem("mhEmailV3",email);
  document.getElementById("emailMsg").innerText="You're locked in 🔥";
}

renderCart();
