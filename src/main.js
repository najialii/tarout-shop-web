// Minimal storefront. Talks to tarout-shop-api. The API base URL comes from
// the VITE_API_URL env var at build time (see .env.example); falls back to
// localhost:3000 for `npm run dev`.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const fmt = (cents) =>
	new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
		cents / 100,
	);

// --- state -----------------------------------------------------------------
/** Map<productId, { product, quantity }> */
const cart = new Map();
let products = [];

// --- elements --------------------------------------------------------------
const catalogEl = document.getElementById("catalog");
const cartCountEl = document.getElementById("cart-count");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const cartDrawerEl = document.getElementById("cart-drawer");
const overlayEl = document.getElementById("overlay");
const checkoutBtn = document.getElementById("checkout");
const checkoutMsgEl = document.getElementById("checkout-msg");

// --- catalog ---------------------------------------------------------------
async function loadProducts() {
	try {
		const res = await fetch(`${API_URL}/api/products`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		products = await res.json();
		renderCatalog();
	} catch (err) {
		catalogEl.setAttribute("aria-busy", "false");
		catalogEl.innerHTML = `<p class="state">Couldn't load products from ${API_URL} — is the API running?<br><small>${err.message}</small></p>`;
	}
}

function renderCatalog() {
	catalogEl.setAttribute("aria-busy", "false");
	catalogEl.innerHTML = "";
	for (const p of products) {
		const inCart = cart.get(p.id)?.quantity ?? 0;
		const soldOut = inCart >= p.stock;
		const lowStock = p.stock <= 10;
		const card = document.createElement("article");
		card.className = "card";
		card.innerHTML = `
			<img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
			<div class="body">
				<h3>${escapeHtml(p.name)}</h3>
				<p>${escapeHtml(p.description)}</p>
				<div class="price-row">
					<span class="price">${fmt(p.price)}</span>
					<span class="stock ${lowStock ? "low" : ""}">${p.stock} in stock</span>
				</div>
				<button class="add-btn" data-id="${p.id}" ${soldOut ? "disabled" : ""}>
					${soldOut ? "Max in cart" : "Add to cart"}
				</button>
			</div>`;
		card.querySelector(".add-btn").addEventListener("click", () => addToCart(p.id));
		catalogEl.appendChild(card);
	}
}

// --- cart ------------------------------------------------------------------
function addToCart(productId) {
	const product = products.find((p) => p.id === productId);
	if (!product) return;
	const entry = cart.get(productId) ?? { product, quantity: 0 };
	if (entry.quantity >= product.stock) return;
	entry.quantity += 1;
	cart.set(productId, entry);
	renderCart();
	renderCatalog();
}

function changeQty(productId, delta) {
	const entry = cart.get(productId);
	if (!entry) return;
	entry.quantity += delta;
	if (entry.quantity < 1) {
		cart.delete(productId);
	} else if (entry.quantity > entry.product.stock) {
		entry.quantity = entry.product.stock;
	}
	renderCart();
	renderCatalog();
}

function cartTotal() {
	let total = 0;
	for (const { product, quantity } of cart.values()) total += product.price * quantity;
	return total;
}

function renderCart() {
	const count = [...cart.values()].reduce((n, e) => n + e.quantity, 0);
	cartCountEl.textContent = String(count);
	cartItemsEl.innerHTML = "";
	if (cart.size === 0) {
		cartItemsEl.innerHTML = `<li><span class="ci-name state">Your cart is empty.</span></li>`;
	} else {
		for (const { product, quantity } of cart.values()) {
			const li = document.createElement("li");
			li.innerHTML = `
				<div class="ci-name">
					${escapeHtml(product.name)}
					<div class="ci-sub">${fmt(product.price)} × ${quantity} = ${fmt(product.price * quantity)}</div>
				</div>
				<div class="qty">
					<button data-act="dec" aria-label="Decrease">−</button>
					<span>${quantity}</span>
					<button data-act="inc" aria-label="Increase">+</button>
				</div>`;
			li.querySelector('[data-act="dec"]').addEventListener("click", () => changeQty(product.id, -1));
			li.querySelector('[data-act="inc"]').addEventListener("click", () => changeQty(product.id, +1));
			cartItemsEl.appendChild(li);
		}
	}
	cartTotalEl.textContent = fmt(cartTotal());
	checkoutBtn.disabled = cart.size === 0;
}

// --- drawer ----------------------------------------------------------------
function openCart() {
	cartDrawerEl.hidden = false;
	overlayEl.hidden = false;
	checkoutMsgEl.hidden = true;
}
function closeCart() {
	cartDrawerEl.hidden = true;
	overlayEl.hidden = true;
}

// --- checkout --------------------------------------------------------------
async function checkout() {
	if (cart.size === 0) return;
	checkoutBtn.disabled = true;
	checkoutMsgEl.hidden = false;
	checkoutMsgEl.classList.remove("ok");
	checkoutMsgEl.textContent = "Placing order…";
	try {
		const items = [...cart.values()].map(({ product, quantity }) => ({
			productId: product.id,
			quantity,
		}));
		const res = await fetch(`${API_URL}/api/orders`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ items }),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
		checkoutMsgEl.classList.add("ok");
		checkoutMsgEl.textContent = `Order ${data.orderId.slice(0, 8)} placed — total ${fmt(data.total)}. Thanks!`;
		cart.clear();
		renderCart();
		renderCatalog();
	} catch (err) {
		checkoutMsgEl.textContent = `Checkout failed: ${err.message}`;
		checkoutBtn.disabled = false;
	}
}

// --- util ------------------------------------------------------------------
function escapeHtml(str) {
	return String(str).replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
	);
}

// --- wire up ---------------------------------------------------------------
document.getElementById("cart-toggle").addEventListener("click", openCart);
document.getElementById("cart-close").addEventListener("click", closeCart);
overlayEl.addEventListener("click", closeCart);
checkoutBtn.addEventListener("click", checkout);

renderCart();
loadProducts();
