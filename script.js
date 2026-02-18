// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Simple glow pulse animation
setInterval(() => {
    document.querySelectorAll('.logo').forEach(logo => {
        logo.style.filter = "drop-shadow(0 0 35px #ff1a1a)";
        setTimeout(() => {
            logo.style.filter = "drop-shadow(0 0 20px #ff1a1a)";
        }, 500);
    });
}, 3000);
