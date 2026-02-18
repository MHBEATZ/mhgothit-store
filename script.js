// CART
let cart=[];
const cartEl=document.getElementById("cart");
const cartItems=document.getElementById("cartItems");
const cartCount=document.getElementById("cartCount");

document.getElementById("openCart").onclick=()=>cartEl.classList.toggle("open");

document.querySelectorAll(".add").forEach(btn=>{
btn.onclick=e=>{
const card=e.target.closest(".beat-card");
cart.push(card.dataset.name);
cartCount.textContent=cart.length;
cartItems.innerHTML=cart.map(b=>"<p>"+b+"</p>").join("");
document.getElementById("checkout").href=
"https://www.paypal.me/YOURPAYPAL/"+(cart.length*50);
};
});

// LICENSE MODAL
document.querySelectorAll(".license").forEach(b=>b.onclick=()=>{
document.getElementById("licenseModal").style.display="flex";
});
function closeLicense(){
document.getElementById("licenseModal").style.display="none";
}

// AUDIO + WAVEFORM (simple animated bars)
document.querySelectorAll(".beat-card").forEach(card=>{
const audio=card.querySelector("audio");
const canvas=card.querySelector("canvas");
const ctx=canvas.getContext("2d");
canvas.width=300;canvas.height=60;

card.querySelector(".play").onclick=()=>{
audio.paused?audio.play():audio.pause();
};

audio.ontimeupdate=()=>{
ctx.clearRect(0,0,300,60);
for(let i=0;i<40;i++){
let h=Math.random()*60;
ctx.fillStyle="#ff5a5a";
ctx.fillRect(i*7,60-h,4,h);
}
};
});
