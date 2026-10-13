"use strict";

/* ETHORISE — PRODUCT DETAILS & RECOMMENDATIONS */

const $ = id => document.getElementById(id);

const detailContainer = $("productDetail");

const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id"));

const RECENT_KEY = "ethoriseRecentlyViewed";
const WISHLIST_KEY = "ethoriseWishlist";

function el(tag, className = "", text = null) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== null) node.textContent = text;
    return node;
}

function readIds(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(saved)
            ? saved.filter(Number.isInteger)
            : [];
    } catch {
        return [];
    }
}

function saveIds(key, ids) {
    try {
        localStorage.setItem(key, JSON.stringify(ids));
    } catch (error) {
        console.warn("Browser storage unavailable:", error);
    }
}

function priceLabel(product) {
    const price = Number(product.price);

    if (
        product.price == null ||
        !Number.isFinite(price) ||
        price <= 0
    ) {
        return product.affiliatePlatform === "Amazon"
            ? "Check Price on Amazon"
            : "Check Latest Price";
    }

    return `$${price.toFixed(2)} USD`;
}

function affiliateLink(product) {
    const platform = product.affiliatePlatform;

    const label = platform === "Amazon"
        ? "View on Amazon ↗"
        : platform === "AliExpress"
            ? "View on AliExpress ↗"
            : "View Product ↗";

    const link = el("a", "btn btn-primary", label);

    try {
        const url = new URL(product.affiliateLink);

        if (url.protocol !== "https:") {
            throw new Error("Invalid affiliate URL");
        }

        link.href = url.href;
        link.target = "_blank";
        link.rel = "sponsored nofollow noopener noreferrer";

    } catch {
        link.href = "#";
        link.onclick = event => {
            event.preventDefault();
            alert("Affiliate link unavailable.");
        };
    }

    return link;
}

function addWishlist(id) {
    const saved = new Set(readIds(WISHLIST_KEY));
    saved.add(id);

    saveIds(WISHLIST_KEY, [...saved]);

    alert("Added to wishlist!");
}

function renderProduct(product) {
    detailContainer.replaceChildren();

    const grid = el("div", "product-detail-grid");

    const imageBox = el("div", "product-detail-image");
    const image = el("img");

    image.src = product.image;
    image.alt = product.name;

    imageBox.appendChild(image);

    const info = el("div", "product-detail-info");

    const category = el("span", "eyebrow", product.category);
    const title = el("h1", "", product.name);
    const price = el("p", "product-price", priceLabel(product));
    const description = el("p", "", product.description || "");

    const featuresBox = el("div", "product-features");
    featuresBox.appendChild(el("h3", "", "Product Features"));

    const list = el("ul");

    (product.features || []).forEach(feature => {
        list.appendChild(el("li", "", feature));
    });

    featuresBox.appendChild(list);

    const actions = el("div", "product-detail-actions");

    const wishlistButton = el(
        "button",
        "btn btn-outline",
        "♡ Save to Wishlist"
    );

    wishlistButton.type = "button";
    wishlistButton.onclick = () => addWishlist(product.id);

    actions.append(
        affiliateLink(product),
        wishlistButton
    );

    info.append(
        category,
        title,
        price,
        description,
        featuresBox,
        actions
    );

    grid.append(imageBox, info);
    detailContainer.appendChild(grid);

    document.title = `${product.name} | ETHORISE`;
}

function recommendationCard(product) {
    const card = el("article", "product-card");

    const imageBox = el("div", "product-image");
    const image = el("img");

    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    imageBox.appendChild(image);

    const info = el("div", "product-info");

    info.append(
        el("p", "product-category", product.category),
        el("h3", "", product.name),
        el("p", "product-price", priceLabel(product))
    );

    const link = el("a", "btn btn-primary", "View Details →");
    link.href = `product.html?id=${encodeURIComponent(product.id)}`;

    info.appendChild(link);
    card.append(imageBox, info);

    return card;
}

function showSection(sectionId, gridId, items) {
    const section = $(sectionId);
    const grid = $(gridId);

    if (!section || !grid) return;

    section.hidden = items.length === 0;
    grid.replaceChildren();

    items.forEach(product => {
        grid.appendChild(recommendationCard(product));
    });
}

function recommendationScore(current, candidate) {
    let score = 0;

    if ((current.relatedProductIds || []).includes(candidate.id)) {
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

    const tags = new Set(current.tags || []);

    (candidate.tags || []).forEach(tag => {
        if (tags.has(tag)) score += 10;
    });

    return score;
}

function renderRecommendations(allProducts, current) {
    const candidates = allProducts
        .filter(p => p.id !== current.id && p.status !== "inactive")
        .map(product => ({
            product,
            score: recommendationScore(current, product)
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score);

    const explicitIds = new Set(current.relatedProductIds || []);

    const setup = candidates
        .filter(item => explicitIds.has(item.product.id))
        .slice(0, 4)
        .map(item => item.product);

    const used = new Set(setup.map(p => p.id));

    const related = candidates
        .filter(item => !used.has(item.product.id))
        .slice(0, 4)
        .map(item => item.product);

    showSection("setupSection", "setupProducts", setup);
    showSection("relatedSection", "relatedProducts", related);
}

function renderRecent(allProducts, current) {
    const ids = readIds(RECENT_KEY)
        .filter(id => id !== current.id);

    const map = new Map(
        allProducts.map(product => [product.id, product])
    );

    const recent = ids
        .map(id => map.get(id))
        .filter(Boolean)
        .filter(p => p.status !== "inactive")
        .slice(0, 4);

    showSection("recentSection", "recentProducts", recent);
}

function saveRecent(id) {
    const recent = readIds(RECENT_KEY);

    const updated = [
        id,
        ...recent.filter(item => item !== id)
    ].slice(0, 12);

    saveIds(RECENT_KEY, updated);
}

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
            toggle.setAttribute("aria-expanded", "false");
        };
    });
}

async function init() {
    setupMenu();

    try {
        if (!Number.isInteger(productId) || productId <= 0) {
            throw new Error("Invalid product ID");
        }

        const response = await fetch("data/products.json");

        if (!response.ok) {
            throw new Error("Cannot load product database");
        }

        const allProducts = await response.json();

        if (!Array.isArray(allProducts)) {
            throw new Error("Invalid product database");
        }

        const product = allProducts.find(
            p => p.id === productId && p.status !== "inactive"
        );

        if (!product) {
            detailContainer.textContent = "Product not found.";
            return;
        }

        renderProduct(product);
        renderRecommendations(allProducts, product);
        renderRecent(allProducts, product);
        saveRecent(product.id);

    } catch (error) {
        console.error(error);
        detailContainer.textContent =
            "Unable to load product details.";
    }
}

init();