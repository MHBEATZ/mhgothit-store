
// RED SMOKE BACKGROUND
const canvas = document.getElementById('smoke');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];
for (let i = 0; i < 80; i++) {
    particles.push({
        x: Math.random()*canvas.width,
        y: Math.random()*canvas.height,
        radius: Math.random()*100,
        alpha: Math.random()*0.5
    });
}

function animateSmoke() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
        ctx.fillStyle = 'rgba(255,0,0,'+p.alpha+')';
        ctx.fill();
        p.y -= 0.3;
        if (p.y < 0) p.y = canvas.height;
    });
    requestAnimationFrame(animateSmoke);
}
animateSmoke();

// BASIC BEATS + CART
const beats = [
    { id:1,title:"Midnight Drill",price:29.99 },
    { id:2,title:"No Warning",price:39.99 }
];

let cart=[];
const container=document.getElementById('beats');

beats.forEach(b=>{
    const div=document.createElement('div');
    div.className='beat-card';
    div.innerHTML=`
        <h3>${b.title}</h3>
        <p>$${b.price}</p>
        <button onclick="addToCart(${b.id})">ADD TO CART</button>
    `;
    container.appendChild(div);
});

function addToCart(id){
    const beat=beats.find(b=>b.id===id);
    cart.push(beat);
    updateCart();
}

function updateCart(){
    const total=cart.reduce((s,i)=>s+i.price,0);
    document.getElementById('cart-info').innerText=
        `Cart: ${cart.length} | $${total.toFixed(2)}`;
    document.getElementById('paypal-amount').value=total.toFixed(2);
}
