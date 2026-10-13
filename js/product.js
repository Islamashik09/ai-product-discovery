"use strict";

/* ==========================================
   ETHORISE — PRODUCT DETAILS
   Shopping List + Smart Recommendations
========================================== */

const $ = id => document.getElementById(id);

const detailContainer = $("productDetail");

const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id"));

const CART_KEY = "ethoriseCart";
const WISHLIST_KEY = "ethoriseWishlist";
const RECENT_KEY = "ethoriseRecentlyViewed";

const MAX_RECOMMENDATIONS = 4;

/* ==========================================
   HELPERS
========================================== */

function el(tag, className = "", text = null) {
    const element = document.createElement(tag);

    if (className) element.className = className;

    if (text !== null) element.textContent = text;

    return element;
}

function readStorage(key) {
    try {
        return JSON.parse(
            localStorage.getItem(key) || "[]"
        );
    } catch {
        return [];
    }
}

function saveStorage(key, data) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify(data)
        );
    } catch (error) {
        console.warn("Storage unavailable:", error);
    }
}

function readIds(key) {
    const data = readStorage(key);

    return Array.isArray(data)
        ? data.filter(Number.isInteger)
        : [];
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
   SHOPPING LIST
========================================== */

function readCart() {
    const data = readStorage(CART_KEY);

    if (!Array.isArray(data)) return [];

    return data.filter(item =>
        item &&
        Number.isInteger(item.id) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    );
}

function cartQuantity() {
    return readCart().reduce(
        (total, item) => total + item.quantity,
        0
    );
}

function updateCartCount() {
    const counter = $("productCartCount");

    if (counter) {
        counter.textContent = cartQuantity();
    }
}

function addToCart(id) {
    const cart = readCart();

    const existing = cart.find(
        item => item.id === id
    );

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id,
            quantity: 1
        });
    }

    saveStorage(CART_KEY, cart);

    updateCartCount();

    showCartNotification();
}

function showCartNotification() {
    const previous = $("productCartNotification");

    if (previous) previous.remove();

    const notification = el(
        "div",
        "",
        "Product added to your shopping list!"
    );

    notification.id = "productCartNotification";

    Object.assign(notification.style, {
        position: "fixed",
        bottom: "25px",
        right: "25px",
        maxWidth: "350px",
        padding: "18px 22px",
        background: "#111",
        color: "#fff",
        borderRadius: "12px",
        zIndex: "9999",
        boxShadow: "0 15px 40px rgba(0,0,0,.2)",
        fontSize: "13px"
    });

    const link = el(
        "a",
        "",
        " View Shopping List →"
    );

    link.href = "cart.html";

    link.style.color = "#ff6b35";
    link.style.marginLeft = "10px";

    notification.appendChild(link);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

/* ==========================================
   NAVBAR CART ICON
========================================== */

function createCartNavigation() {
    const actions = document.querySelector(
        ".nav-actions"
    );

    if (!actions || $("productCartLink")) return;

    const link = el(
        "a",
        "nav-icon-btn",
        "🛒"
    );

    link.id = "productCartLink";
    link.href = "cart.html";

    link.setAttribute(
        "aria-label",
        "View shopping list"
    );

    link.style.position = "relative";
    link.style.fontSize = "22px";

    const counter = el(
        "span",
        "",
        "0"
    );

    counter.id = "productCartCount";

    Object.assign(counter.style, {
        position: "absolute",
        top: "-8px",
        right: "-10px",
        background: "#ff6b35",
        color: "white",
        borderRadius: "50%",
        minWidth: "18px",
        height: "18px",
        padding: "0 4px",
        fontSize: "10px",
        display: "grid",
        placeItems: "center"
    });

    link.appendChild(counter);

    const menuToggle = $("productMenuToggle");

    if (menuToggle) {
        actions.insertBefore(link, menuToggle);
    } else {
        actions.appendChild(link);
    }

    updateCartCount();
}

/* ==========================================
   WISHLIST
========================================== */

function addWishlist(id) {
    const wishlist = new Set(
        readIds(WISHLIST_KEY)
    );

    wishlist.add(id);

    saveStorage(
        WISHLIST_KEY,
        [...wishlist]
    );

    alert("Product added to wishlist!");
}

/* ==========================================
   PRODUCT DETAILS
========================================== */

function renderProduct(product) {
    detailContainer.replaceChildren();

    const grid = el(
        "div",
        "product-detail-grid"
    );

    const imageBox = el(
        "div",
        "product-detail-image"
    );

    const image = el("img");

    image.src = product.image;
    image.alt = product.name;

    imageBox.appendChild(image);

    const info = el(
        "div",
        "product-detail-info"
    );

    const category = el(
        "span",
        "eyebrow",
        product.category
    );

    const title = el(
        "h1",
        "",
        product.name
    );

    const price = el(
        "p",
        "product-price",
        priceLabel(product)
    );

    const description = el(
        "p",
        "",
        product.description || ""
    );

    const featuresBox = el(
        "div",
        "product-features"
    );

    featuresBox.appendChild(
        el("h3", "", "Product Features")
    );

    const list = el("ul");

    (product.features || []).forEach(feature => {
        list.appendChild(
            el("li", "", feature)
        );
    });

    featuresBox.appendChild(list);

    const actions = el(
        "div",
        "product-detail-actions"
    );

    /* ADD TO CART */

    const addButton = el(
        "button",
        "btn btn-primary",
        "🛒 Add to Cart"
    );

    addButton.type = "button";

    addButton.onclick = () => {
        addToCart(product.id);
    };

    /* WISHLIST */

    const wishlistButton = el(
        "button",
        "btn btn-outline",
        "♡ Save to Wishlist"
    );

    wishlistButton.type = "button";

    wishlistButton.onclick = () => {
        addWishlist(product.id);
    };

    /* VIEW SHOPPING LIST */

    const cartLink = el(
        "a",
        "btn btn-outline",
        "View Shopping List →"
    );

    cartLink.href = "cart.html";

    actions.append(
        addButton,
        wishlistButton,
        cartLink
    );

    info.append(
        category,
        title,
        price,
        description,
        featuresBox,
        actions
    );

    grid.append(
        imageBox,
        info
    );

    detailContainer.appendChild(grid);

    document.title =
        `${product.name} | ETHORISE`;
}

/* ==========================================
   RECOMMENDATION CARDS
========================================== */

function recommendationCard(product) {
    const card = el(
        "article",
        "product-card"
    );

    const imageBox = el(
        "div",
        "product-image"
    );

    const image = el("img");

    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    imageBox.appendChild(image);

    const info = el(
        "div",
        "product-info"
    );

    info.append(
        el("p", "product-category", product.category),
        el("h3", "", product.name),
        el("p", "product-price", priceLabel(product))
    );

    const details = el(
        "a",
        "btn btn-primary",
        "View Details →"
    );

    details.href =
        `product.html?id=${encodeURIComponent(product.id)}`;

    const addButton = el(
        "button",
        "btn btn-outline",
        "🛒 Add to Cart"
    );

    addButton.type = "button";

    addButton.style.marginTop = "10px";

    addButton.onclick = () => {
        addToCart(product.id);
    };

    info.append(
        details,
        addButton
    );

    card.append(
        imageBox,
        info
    );

    return card;
}

/* ==========================================
   RECOMMENDATION SECTIONS
========================================== */

function showSection(sectionId, gridId, items) {
    const section = $(sectionId);
    const grid = $(gridId);

    if (!section || !grid) return;

    section.hidden = items.length === 0;

    grid.replaceChildren();

    items.forEach(product => {
        grid.appendChild(
            recommendationCard(product)
        );
    });
}

/* ==========================================
   RECOMMENDATION SCORING
========================================== */

function recommendationScore(current, candidate) {
    let score = 0;

    if (
        (current.relatedProductIds || [])
            .includes(candidate.id)
    ) {
        score += 100;
    }

    if (current.category === candidate.category) {
        score += 20;
    }

    if (
        current.subcategory &&
        current.subcategory === candidate.subcategory
    ) {
        score += 15;
    }

    const currentTags = new Set(
        current.tags || []
    );

    (candidate.tags || []).forEach(tag => {
        if (currentTags.has(tag)) {
            score += 10;
        }
    });

    return score;
}

/* ==========================================
   SMART RECOMMENDATIONS
========================================== */

function renderRecommendations(allProducts, current) {
    const candidates = allProducts
        .filter(product =>
            product.id !== current.id &&
            product.status !== "inactive"
        )
        .map(product => ({
            product,
            score: recommendationScore(
                current,
                product
            )
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

    const explicitIds = new Set(
        current.relatedProductIds || []
    );

    const setup = candidates
        .filter(item =>
            explicitIds.has(item.product.id)
        )
        .slice(0, 4)
        .map(item => item.product);

    const used = new Set(
        setup.map(product => product.id)
    );

    const related = candidates
        .filter(item =>
            !used.has(item.product.id)
        )
        .slice(0, 4)
        .map(item => item.product);

    showSection(
        "setupSection",
        "setupProducts",
        setup
    );

    showSection(
        "relatedSection",
        "relatedProducts",
        related
    );
}

/* ==========================================
   RECENTLY VIEWED
========================================== */

function saveRecent(id) {
    const recent = readIds(RECENT_KEY);

    const updated = [
        id,
        ...recent.filter(item => item !== id)
    ].slice(0, 12);

    saveStorage(RECENT_KEY, updated);
}

function renderRecent(allProducts, current) {
    const ids = readIds(RECENT_KEY)
        .filter(id => id !== current.id);

    const map = new Map(
        allProducts.map(product => [
            product.id,
            product
        ])
    );

    const recent = ids
        .map(id => map.get(id))
        .filter(Boolean)
        .filter(product =>
            product.status !== "inactive"
        )
        .slice(0, 4);

    showSection(
        "recentSection",
        "recentProducts",
        recent
    );
}

/* ==========================================
   MOBILE NAVIGATION
========================================== */

function setupMenu() {
    const toggle = $("productMenuToggle");
    const menu = $("productNavLinks");

    if (!toggle || !menu) return;

    toggle.onclick = () => {
        menu.classList.toggle("active");

        toggle.setAttribute(
            "aria-expanded",
            String(menu.classList.contains("active"))
        );
    };

    menu.querySelectorAll("a").forEach(link => {
        link.onclick = () => {
            menu.classList.remove("active");

            toggle.setAttribute(
                "aria-expanded",
                "false"
            );
        };
    });
}

/* ==========================================
   INITIALIZE PRODUCT PAGE
========================================== */

async function init() {
    setupMenu();

    createCartNavigation();

    try {
        if (
            !Number.isInteger(productId) ||
            productId <= 0
        ) {
            throw new Error(
                "Invalid product ID"
            );
        }

        const response = await fetch(
            "data/products.json"
        );

        if (!response.ok) {
            throw new Error(
                "Unable to load products."
            );
        }

        const allProducts = await response.json();

        if (!Array.isArray(allProducts)) {
            throw new Error(
                "Invalid product database."
            );
        }

        const product = allProducts.find(
            item =>
                item.id === productId &&
                item.status !== "inactive"
        );

        if (!product) {
            detailContainer.textContent =
                "Product not found.";
            return;
        }

        renderProduct(product);

        renderRecommendations(
            allProducts,
            product
        );

        renderRecent(
            allProducts,
            product
        );

        saveRecent(product.id);

    } catch (error) {
        console.error(error);

        detailContainer.textContent =
            "Unable to load product details.";
    }
}

init();