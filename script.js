// FILTER
document.querySelectorAll('.filters button').forEach(btn=>{
btn.onclick=()=>{
const f=btn.dataset.filter;
document.querySelectorAll('.beat-card').forEach(card=>{
card.style.display=(f==='all'||card.classList.contains(f))?'block':'none';
});
};
});

// SEARCH
document.getElementById('search').oninput=e=>{
const q=e.target.value.toLowerCase();
document.querySelectorAll('.beat-card').forEach(card=>{
card.style.display=card.dataset.name.toLowerCase().includes(q)?'block':'none';
});
};

// CART
let cart=[];
const cartEl=document.getElementById('cart');
const cartItems=document.getElementById('cartItems');
const cartCount=document.getElementById('cartCount');
const paypalBtn=document.getElementById('paypalCheckout');

document.getElementById('openCart').onclick=()=>cartEl.classList.toggle('open');

document.querySelectorAll('.add').forEach(btn=>{
btn.onclick=e=>{
const card=e.target.closest('.beat-card');
cart.push(card.dataset.name);
cartCount.textContent=cart.length;
cartItems.innerHTML=cart.map(b=>'<p>'+b+' – $50</p>').join('');
paypalBtn.href="https://www.paypal.me/YOURPAYPAL/"+(cart.length*50);
};
});

// AUDIO pause others
document.querySelectorAll('audio').forEach(a=>{
a.onplay=()=>document.querySelectorAll('audio').forEach(b=>b!==a&&b.pause());
});
