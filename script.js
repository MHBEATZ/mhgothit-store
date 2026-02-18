
gsap.registerPlugin(ScrollTrigger);

window.addEventListener("load", () => {
    gsap.to(".loader", {opacity:0, duration:1.5, delay:1, onComplete:()=>{
        document.querySelector(".loader").style.display="none";
    }});

    gsap.from(".mega-title", {y:-200, opacity:0, duration:1.5});
});

gsap.utils.toArray("section").forEach(section => {
    gsap.from(section, {
        scrollTrigger: section,
        y:100,
        opacity:0,
        duration:1.2
    });
});

function scrollToBeats(){
    document.getElementById("beats").scrollIntoView({behavior:"smooth"});
}

document.getElementById("artworkInput").addEventListener("change", function(e){
    const preview = document.getElementById("previewGrid");
    [...e.target.files].forEach(file => {
        const reader = new FileReader();
        reader.onload = function(ev){
            const img = document.createElement("img");
            img.src = ev.target.result;
            preview.appendChild(img);
        }
        reader.readAsDataURL(file);
    });
});

/* PARTICLE BACKGROUND */
const canvas = document.getElementById("particleCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];

for(let i=0;i<120;i++){
    particles.push({
        x:Math.random()*canvas.width,
        y:Math.random()*canvas.height,
        radius:Math.random()*2,
        dx:(Math.random()-0.5)*1,
        dy:(Math.random()-0.5)*1
    });
}

function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#ff003c";
    particles.forEach(p=>{
        p.x+=p.dx;
        p.y+=p.dy;
        if(p.x<0||p.x>canvas.width) p.dx*=-1;
        if(p.y<0||p.y>canvas.height) p.dy*=-1;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);
        ctx.fill();
    });
    requestAnimationFrame(animate);
}
animate();
