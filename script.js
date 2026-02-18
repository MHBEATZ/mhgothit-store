
document.addEventListener("DOMContentLoaded", function() {

// 3D Background
VANTA.NET({
el: "#vanta-bg",
color: 0xff3c00,
backgroundColor: 0x0b0b0f,
points: 12.0,
maxDistance: 22.0,
spacing: 18.0
});

// PayPal Button Init
function initPayPal(beatName, selectId, containerId) {

if (typeof paypal === 'undefined') {
document.getElementById(containerId).innerHTML = "<p style='color:red;'>PayPal failed to load. Check Client ID.</p>";
return;
}

paypal.Buttons({
style: {
shape: 'pill',
color: 'black',
label: 'buynow',
height: 45
},
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
alert("Payment successful for " + beatName + "!");
});
}
}).render("#" + containerId);

}

initPayPal("Inferno Trap", "license1", "paypal1");
initPayPal("Nightfall Drill", "license2", "paypal2");

});
