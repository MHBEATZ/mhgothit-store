
const slogans = [
"BUILT FOR HUNGRY ARTISTS",
"DARK. CINEMATIC. DEADLY.",
"YOUR NEXT HIT STARTS HERE",
"NO MERCY. JUST PRESSURE."
];

let index = 0;
setInterval(() => {
    index = (index + 1) % slogans.length;
    document.getElementById("rotating-text").innerText = slogans[index];
}, 3000);

const beats = [
    {title:"Midnight Drill", price:"$29.99"},
    {title:"No Warning", price:"$39.99"},
    {title:"War Ready", price:"$49.99"}
];

const container = document.getElementById("beats");

beats.forEach(b => {
    const div = document.createElement("div");
    div.className = "beat-card";
    div.innerHTML = `
        <h3>${b.title}</h3>
        <p style="color:white">${b.price}</p>
        <button>PREVIEW</button>
        <button>BUY NOW</button>
    `;
    container.appendChild(div);
});
