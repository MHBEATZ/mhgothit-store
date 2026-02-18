const glow = document.querySelector(".cursor-glow");
document.addEventListener("mousemove", e => {
  glow.style.left = e.clientX + "px";
  glow.style.top = e.clientY + "px";
});

document.getElementById("contactForm").addEventListener("submit", e => {
  e.preventDefault();
  alert("SIGNAL RECEIVED.");
  e.target.reset();
});
