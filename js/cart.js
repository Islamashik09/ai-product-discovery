"use strict";

/* ==========================================
   ETHORISE SHOPPING LIST
========================================== */

const CART_KEY = "ethoriseCart";

const cartItems = document.getElementById("cartItems");

const cartItemCount = document.getElementById("cartItemCount");

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
        console.warn(
            "Unable to save shopping list:",
            error
        );
    }
}

/* ==========================================
   HELPERS
========================================== */

function createElement(tag, className = "", text = null) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== null) {
        element.textContent = text;
    }

    return element;
}

function getProduct(id) {
    return products.find(product => product.id === id);
}

/* ==========================================
   AFFILIATE LINKS
========================================== */

function createAffiliateLink(product) {
    const platform = product.affiliatePlatform || "Retailer";

    const link = createElement(
        "a",
        "",
        `Buy on ${platform} ↗`
    );

    try {
        const url = new URL(
            product.affiliateLink
        );

        if (url.protocol !== "https:") {
            throw new Error("Invalid affiliate URL");
        }

        link.href = url.href;
        link.target = "_blank";

        link.rel =
            "sponsored nofollow noopener noreferrer";

    } catch {
        link.href = "#";

        link.addEventListener("click", event => {
            event.preventDefault();

            alert(
                "Retailer link is currently unavailable."
            );
        });
    }

    return link;
}

/* ==========================================
   CART QUANTITY
========================================== */

function updateQuantity(id, change) {
    const cart = readCart();

    const item = cart.find(
        product => product.id === id
    );

    if (!item) return;

    item.quantity += change;

    const updated = cart.filter(
        product => product.quantity > 0
    );

    saveCart(updated);

    renderCart();
}

/* ==========================================
   REMOVE PRODUCT
========================================== */

function removeProduct(id) {
    const cart = readCart();

    const updated = cart.filter(
        product => product.id !== id
    );

    saveCart(updated);

    renderCart();
}

/* ==========================================
   RENDER CART
========================================== */

function renderCart() {
    cartItems.replaceChildren();

    const cart = readCart();

    const validItems = cart.filter(
        item => getProduct(item.id)
    );

    const totalQuantity = validItems.reduce(
        (total, item) => total + item.quantity,
        0
    );

    cartItemCount.textContent =
        `${totalQuantity} item${totalQuantity === 1 ? "" : "s"} selected`;

    if (!validItems.length) {
        const empty = createElement(
            "div",
            "cart-empty"
        );

        const title = createElement(
            "h2",
            "",
            "Your Shopping List Is Empty"
        );

        const text = createElement(
            "p",
            "",
            "Explore ETHORISE and save products you're interested in."
        );

        const link = createElement(
            "a",
            "btn btn-primary",
            "Explore Products →"
        );

        link.href = "index.html#shop";

        empty.append(
            title,
            text,
            link
        );

        cartItems.appendChild(empty);

        return;
    }

    validItems.forEach(item => {
        const product = getProduct(item.id);

        const card = createElement(
            "article",
            "cart-item"
        );

        const image = createElement("img");

        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";

        const info = createElement("div");

        const title = createElement(
            "h3",
            "",
            product.name
        );

        const category = createElement(
            "p",
            "",
            `Category: ${product.category}`
        );

        const retailer = createElement(
            "p",
            "",
            `Retailer: ${product.affiliatePlatform || "External retailer"}`
        );

        const quantityText = createElement(
            "p",
            "",
            `Quantity: ${item.quantity}`
        );

        const actions = createElement(
            "div",
            "cart-item-actions"
        );

        const minus = createElement(
            "button",
            "",
            "−"
        );

        minus.type = "button";

        minus.setAttribute(
            "aria-label",
            `Decrease quantity of ${product.name}`
        );

        minus.addEventListener("click", () => {
            updateQuantity(product.id, -1);
        });

        const plus = createElement(
            "button",
            "",
            "+"
        );

        plus.type = "button";

        plus.setAttribute(
            "aria-label",
            `Increase quantity of ${product.name}`
        );

        plus.addEventListener("click", () => {
            updateQuantity(product.id, 1);
        });

        const remove = createElement(
            "button",
            "",
            "Remove"
        );

        remove.type = "button";

        remove.addEventListener("click", () => {
            removeProduct(product.id);
        });

        const affiliateLink =
            createAffiliateLink(product);

        actions.append(
            minus,
            plus,
            remove,
            affiliateLink
        );

        info.append(
            title,
            category,
            retailer,
            quantityText,
            actions
        );

        card.append(
            image,
            info
        );

        cartItems.appendChild(card);
    });
}

/* ==========================================
   MOBILE NAVIGATION
========================================== */

function setupNavigation() {
    const toggle = document.getElementById(
        "cartMenuToggle"
    );

    const menu = document.getElementById(
        "cartNavLinks"
    );

    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
        menu.classList.toggle("active");

        toggle.setAttribute(
            "aria-expanded",
            String(menu.classList.contains("active"))
        );
    });

    menu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            menu.classList.remove("active");

            toggle.setAttribute(
                "aria-expanded",
                "false"
            );
        });
    });
}

/* ==========================================
   LOAD PRODUCT DATABASE
========================================== */

async function loadProducts() {
    try {
        const response = await fetch(
            "data/products.json"
        );

        if (!response.ok) {
            throw new Error(
                "Unable to load product database."
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "Invalid product database."
            );
        }

        products = data.filter(
            product => product.status !== "inactive"
        );

        renderCart();

    } catch (error) {
        console.error(error);

        cartItems.textContent =
            "Unable to load shopping list.";
    }
}

/* ==========================================
   INITIALIZE
========================================== */

setupNavigation();

loadProducts();