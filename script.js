
const beats = [
    { id: 1, title: "Midnight Drill", price: 29.99, audio: "audio1.mp3", artwork: "https://via.placeholder.com/500" },
    { id: 2, title: "No Warning", price: 39.99, audio: "audio2.mp3", artwork: "https://via.placeholder.com/500" }
];

let cart = [];
let audioContext;

const beatsContainer = document.getElementById("beats");

beats.forEach(beat => {
    const card = document.createElement("div");
    card.className = "beat-card";

    card.innerHTML = `
        <img src="${beat.artwork}">
        <div class="overlay">
            <button onclick="togglePlay(${beat.id})">Play</button>
        </div>
        <h3>${beat.title}</h3>
        <p>$${beat.price}</p>
        <button onclick="addToCart(${beat.id})">Add to Cart</button>
        <canvas id="canvas-${beat.id}"></canvas>
        <audio id="audio-${beat.id}" src="${beat.audio}"></audio>
    `;

    beatsContainer.appendChild(card);
});

function addToCart(id) {
    const beat = beats.find(b => b.id === id);
    cart.push(beat);
    updateCart();
}

function updateCart() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    document.getElementById("cart-info").innerText =
        `Cart: ${cart.length} items | Total: $${total.toFixed(2)}`;
    document.getElementById("paypal-amount").value = total.toFixed(2);
}

function togglePlay(id) {
    const audio = document.getElementById(`audio-${id}`);
    if (!audioContext) audioContext = new AudioContext();

    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    audio.play();
    visualize(analyser, document.getElementById(`canvas-${id}`));
}

function visualize(analyser, canvas) {
    const ctx = canvas.getContext("2d");
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.beginPath();
        let x = 0;
        const sliceWidth = canvas.width / bufferLength;

        for (let i = 0; i < bufferLength; i++) {
            const y = dataArray[i] / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }

        ctx.strokeStyle = "white";
        ctx.stroke();
    }

    draw();
}
