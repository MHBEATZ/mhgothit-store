
// Loader
window.addEventListener("load",()=>{
    setTimeout(()=>{
        document.getElementById("loader").style.display="none";
    },1500);
});

// Stripe placeholder
function buyNow(price){
    alert("Connect your Stripe Checkout link here for $" + price);
}

// Particles
tsParticles.load("particles",{
    particles:{
        number:{value:80},
        color:{value:"#ff0000"},
        links:{enable:true,color:"#ff0000"},
        move:{enable:true,speed:1}
    }
});
