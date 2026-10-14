"use strict";

/* ==========================================
   ETHORISE — SHOPPING LIST
   Compatible with Updated cart.html
========================================== */

const CART_KEY = "ethoriseCart";

const cartItems = document.getElementById("cartItems");
const cartUniqueCount = document.getElementById("cartUniqueCount");
const cartTotalQuantity = document.getElementById("cartTotalQuantity");
const clearCartButton = document.getElementById("clearCart");

let products = [];

/* ==========================================
   STORAGE
========================================== */

function readCart() {
    try {
        const data = JSON.parse(
            localStorage.getItem(CART_KEY) || "[]"
        );

        if (!Array.isArray(data)) return [];

        return data.filter(item =>
            item &&
            Number.isInteger(item.id) &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        );
    } catch {
        return [];
    }
}

function saveCart(cart) {
    try {
        localStorage.setItem(
            CART_KEY,
            JSON.stringify(cart)
        );
    } catch (error) {
        console.warn("Unable to save shopping list:", error);
    }
}

/* ==========================================
   HELPERS
========================================== */

function createElement(tag, className = "", text = null) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== null) element.textContent = text;

    return element;
}

function getProduct(id) {
    return products.find(product => product.id === id);
}

function priceLabel(product) {
    const price = Number(product.price);

    if (
        product.price == null ||
        !Number.isFinite(price) ||
        price <= 0
    ) {
        return "See current price at retailer";
    }

    return `$${price.toFixed(2)} USD`;
}

/* ==========================================
   AFFILIATE PURCHASE LINKS
========================================== */

function createAffiliateLink(product) {
    const platform = product.affiliatePlatform || "Retailer";

    const link = createElement(
        "a",
        "btn cart-retailer-link",
        `Buy on ${platform} ↗`
    );

    try {
        const url = new URL(product.affiliateLink);

        if (
            url.protocol !== "https:" ||
            !url.hostname ||
            url.username ||
            url.password
        ) {
            throw new Error("Invalid affiliate URL");
        }

        link.href = url.href;
        link.target = "_blank";
        link.rel = "sponsored nofollow noopener noreferrer";

        link.setAttribute(
            "aria-label",
            `Visit ${platform} to purchase ${product.name}`
        );

    } catch {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.textContent = "Retailer Link Unavailable";
    }

    return link;
}

/* ==========================================
   QUANTITY
========================================== */

function updateQuantity(id, change) {
    const cart = readCart();

    const item = cart.find(product => product.id === id);

    if (!item) return;

    item.quantity = Math.max(0, item.quantity + change);

    saveCart(cart.filter(product => product.quantity > 0));

    renderCart();
}

/* ==========================================
   REMOVE PRODUCT
========================================== */

function removeProduct(id) {
    saveCart(
        readCart().filter(product => product.id !== id)
    );

    renderCart();
}

/* ==========================================
   CLEAR CART
========================================== */

function clearShoppingList() {
    if (!readCart().length) return;

    if (!confirm("Clear your entire shopping list?")) {
        return;
    }

    saveCart([]);
    renderCart();
}

/* ==========================================
   EMPTY STATE
========================================== */

function renderEmpty() {
    const empty = createElement("div", "cart-empty");

    empty.append(
        createElement("div", "cart-empty-icon", "🛒"),
        createElement("h2", "", "Your Shopping List Is Empty"),
        createElement(
            "p",
            "",
            "Explore ETHORISE and save products you're interested in."
        )
    );

    const link = createElement(
        "a",
        "btn btn-primary",
        "Explore Products →"
    );

    link.href = "index.html#shop";

    empty.appendChild(link);
    cartItems.appendChild(empty);
}

/* ==========================================
   PRODUCT CARD
========================================== */

function renderCartProduct(item, product) {
    const card = createElement("article", "cart-item");

    const image = createElement("img", "cart-item-image");

    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    const info = createElement("div", "cart-item-info");

    info.append(
        createElement("h3", "", product.name),
        createElement(
            "p",
            "",
            `Category: ${product.category || "Not specified"}`
        ),
        createElement(
            "p",
            "",
            `Retailer: ${product.affiliatePlatform || "External retailer"}`
        ),
        createElement(
            "p",
            "cart-item-price",
            priceLabel(product)
        )
    );

    /* QUANTITY CONTROLS */

    const quantity = createElement("div", "cart-quantity");

    quantity.setAttribute(
        "aria-label",
        `Shopping list quantity for ${product.name}`
    );

    const minus = createElement("button", "", "−");
    minus.type = "button";

    minus.setAttribute(
        "aria-label",
        `Decrease quantity of ${product.name}`
    );

    minus.onclick = () => updateQuantity(product.id, -1);

    const quantityValue = createElement(
        "span",
        "",
        String(item.quantity)
    );

    const plus = createElement("button", "", "+");
    plus.type = "button";

    plus.setAttribute(
        "aria-label",
        `Increase quantity of ${product.name}`
    );

    plus.onclick = () => updateQuantity(product.id, 1);

    quantity.append(minus, quantityValue, plus);

    /* ACTIONS */

    const actions = createElement("div", "cart-item-actions");

    const details = createElement(
        "a",
        "btn btn-outline",
        "View Details"
    );

    details.href =
        `product.html?id=${encodeURIComponent(product.id)}`;

    const affiliateLink = createAffiliateLink(product);

    const remove = createElement(
        "button",
        "cart-remove",
        "Remove"
    );

    remove.type = "button";

    remove.setAttribute(
        "aria-label",
        `Remove ${product.name} from shopping list`
    );

    remove.onclick = () => removeProduct(product.id);

    actions.append(details, affiliateLink, remove);

    const note = createElement(
        "p",
        "cart-retailer-note",
        "Confirm quantity, price and availability on the retailer website. Your ETHORISE list quantity is not transferred automatically."
    );

    info.append(quantity, actions, note);

    card.append(image, info);

    return card;
}

/* ==========================================
   RENDER CART
========================================== */

function renderCart() {
    if (!cartItems) return;

    cartItems.replaceChildren();

    const cart = readCart();

    const validItems = cart.filter(
        item => getProduct(item.id)
    );

    const uniqueCount = validItems.length;

    const totalQuantity = validItems.reduce(
        (total, item) => total + item.quantity,
        0
    );

    if (cartUniqueCount) {
        cartUniqueCount.textContent = String(uniqueCount);
    }

    if (cartTotalQuantity) {
        cartTotalQuantity.textContent = String(totalQuantity);
    }

    if (clearCartButton) {
        clearCartButton.disabled = cart.length === 0;
    }

    if (!validItems.length) {
        renderEmpty();
        return;
    }

    validItems.forEach(item => {
        const product = getProduct(item.id);

        cartItems.appendChild(
            renderCartProduct(item, product)
        );
    });
}

/* ==========================================
   MOBILE NAVIGATION
========================================== */

function setupNavigation() {
    const toggle = document.getElementById("cartMenuToggle");
    const menu = document.getElementById("cartNavLinks");

    if (!toggle || !menu) return;

    toggle.onclick = () => {
        const active = menu.classList.toggle("active");

        toggle.setAttribute(
            "aria-expanded",
            String(active)
        );
    };

    menu.querySelectorAll("a").forEach(link => {
        link.onclick = () => {
            menu.classList.remove("active");

            toggle.setAttribute("aria-expanded", "false");
        };
    });
}

/* ==========================================
   LOAD PRODUCTS
========================================== */

async function loadProducts() {
    try {
        const response = await fetch("data/products.json");

        if (!response.ok) {
            throw new Error("Unable to load product database.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid product database.");
        }

        products = data.filter(
            product => product.status !== "inactive"
        );

        renderCart();

    } catch (error) {
        console.error(error);

        if (cartItems) {
            cartItems.textContent =
                "Unable to load shopping list.";
        }
    }
}

/* ==========================================
   INITIALIZE
========================================== */

setupNavigation();

if (clearCartButton) {
    clearCartButton.onclick = clearShoppingList;
}

loadProducts();