
let cart = [];

function addToCart() {
    const price = parseFloat(document.getElementById("license").value);
    cart.push(price);
    updateCart();
}

function updateCart() {
    const total = cart.reduce((a, b) => a + b, 0);
    document.getElementById("total").innerText = total.toFixed(2);
}

paypal.Buttons({
    createOrder: function(data, actions) {
        const total = cart.reduce((a, b) => a + b, 0);
        return actions.order.create({
            purchase_units: [{
                amount: { value: total.toFixed(2) }
            }]
        });
    },
    onApprove: function(data, actions) {
        return actions.order.capture().then(function(details) {
            alert('Payment completed! Download link will be sent to your email.');
        });
    }
}).render('#paypal-button-container');
