let cart = [];

function addToCart(name, price){
    cart.push({name, price});
    updateCart();
}

function updateCart(){
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');

    cartItems.innerHTML = '';
    let total = 0;

    cart.forEach((item,index)=>{
        total += item.price;
        cartItems.innerHTML += `
            <p>${item.name} - $${item.price}
            <button onclick="removeItem(${index})">X</button></p>
        `;
    });

    cartCount.innerText = cart.length;
    cartTotal.innerText = total;
}

function removeItem(index){
    cart.splice(index,1);
    updateCart();
}

function checkout(){
    let total = cart.reduce((sum,item)=>sum+item.price,0);
    if(total === 0){
        alert("Cart is empty");
        return;
    }

    // Replace YOURUSERNAME with your PayPal.Me username
    window.location.href = `https://www.paypal.com/paypalme/YOURUSERNAME/${total}`;
}