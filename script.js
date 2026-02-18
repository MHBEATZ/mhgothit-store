
// Vanta Animated Background
VANTA.NET({
  el: "#vanta-bg",
  color: 0xff3c00,
  backgroundColor: 0x0b0b0f,
  points: 10.0,
  maxDistance: 20.0,
  spacing: 15.0
});

// PayPal Buttons Function
function initPayPal(beatName, selectId, containerId) {
  paypal.Buttons({
    style: { shape: 'pill', label: 'buynow' },
    createOrder: function(data, actions) {
      const select = document.getElementById(selectId);
      const price = select.value;
      const licenseText = select.options[select.selectedIndex].text;
      return actions.order.create({
        purchase_units: [{
          description: beatName + " - " + licenseText,
          amount: { value: price }
        }]
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        alert("Payment successful. Check your email for delivery instructions.");
      });
    }
  }).render("#" + containerId);
}

initPayPal("Inferno Trap", "license1", "paypal1");
initPayPal("Nightfall Drill", "license2", "paypal2");
