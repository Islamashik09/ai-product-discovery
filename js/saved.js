"use strict";

/* ==========================================
   ETHORISE — WISHLIST & COMPARISON
========================================== */

const $ = id => document.getElementById(id);

const WISHLIST_KEY = "ethoriseWishlist";
const COMPARE_KEY = "ethoriseComparison";
const CART_KEY = "ethoriseCart";

const pageType = document.body.dataset.savedPage;

let allProducts = [];

/* ==========================================
   HELPERS
========================================== */

function el(tag, className = "", text = null) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== null) {
        element.textContent = text;
    }

    return element;
}

function readStorage(key) {
    try {
        const data = JSON.parse(
            localStorage.getItem(key) || "[]"
        );

        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveStorage(key, value) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    } catch (error) {
        console.warn("Storage unavailable:", error);
    }
}

function readIds(key) {
    return readStorage(key).filter(Number.isInteger);
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

function getVisibleProducts(key) {
    const ids = readIds(key);

    const productMap = new Map(
        allProducts.map(product => [
            product.id,
            product
        ])
    );

    return ids
        .map(id => productMap.get(id))
        .filter(Boolean)
        .filter(product =>
            product.status !== "inactive"
        );
}

/* ==========================================
   COUNTERS
========================================== */

function updateCounters() {
    const wishlist = $("savedWishlistCount");
    const cart = $("savedCartCount");

    if (wishlist) {
        wishlist.textContent =
            readIds(WISHLIST_KEY).length;
    }

    if (cart) {
        cart.textContent = readStorage(CART_KEY)
            .reduce((total, item) => {
                const quantity = Number(item.quantity);

                return total + (
                    Number.isInteger(quantity) &&
                    quantity > 0
                        ? quantity
                        : 0
                );
            }, 0);
    }
}

/* ==========================================
   SHOPPING LIST
========================================== */

function addToCart(id) {
    const cart = readStorage(CART_KEY);

    const existing = cart.find(
        item => item && item.id === id
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

    updateCounters();

    alert("Product added to your shopping list!");
}

/* ==========================================
   REMOVE SAVED PRODUCT
========================================== */

function removeSaved(id) {
    const key = pageType === "wishlist"
        ? WISHLIST_KEY
        : COMPARE_KEY;

    const updated = readIds(key)
        .filter(savedId => savedId !== id);

    saveStorage(key, updated);

    renderPage();
}

/* ==========================================
   EMPTY STATE
========================================== */

function renderEmpty(container, title, message) {
    const box = el(
        "div",
        pageType === "wishlist"
            ? "saved-empty"
            : "compare-empty"
    );

    box.append(
        el("div", "saved-empty-icon", "♡"),
        el("h2", "", title),
        el("p", "", message)
    );

    const link = el(
        "a",
        "btn btn-primary",
        "Explore Products →"
    );

    link.href = "index.html#shop";

    box.appendChild(link);

    container.appendChild(box);
}

/* ==========================================
   WISHLIST
========================================== */

function renderWishlist(products) {
    const grid = $("savedGrid");

    grid.replaceChildren();

    if (!products.length) {
        renderEmpty(
            grid,
            "Your wishlist is empty",
            "Save products you love to see them here."
        );

        return;
    }

    products.forEach(product => {
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

        const actions = el(
            "div",
            "saved-product-actions"
        );

        const details = el(
            "a",
            "btn btn-outline",
            "View Details →"
        );

        details.href =
            `product.html?id=${encodeURIComponent(product.id)}`;

        const cartButton = el(
            "button",
            "btn btn-primary",
            "🛒 Add to Shopping List"
        );

        cartButton.type = "button";

        cartButton.onclick = () => {
            addToCart(product.id);
        };

        const removeButton = el(
            "button",
            "saved-remove",
            "Remove from Wishlist"
        );

        removeButton.type = "button";

        removeButton.onclick = () => {
            removeSaved(product.id);
        };

        actions.append(
            details,
            cartButton,
            removeButton
        );

        info.appendChild(actions);

        card.append(
            imageBox,
            info
        );

        grid.appendChild(card);
    });
}

/* ==========================================
   COMPARISON
========================================== */

function renderComparison(products) {
    const container = $("savedGrid");

    container.replaceChildren();

    if (!products.length) {
        renderEmpty(
            container,
            "No products selected",
            "Select products from the shop to compare them."
        );

        return;
    }

    const wrapper = el(
        "div",
        "compare-table-wrapper"
    );

    const table = el(
        "table",
        "compare-table"
    );

    function addRow(label, renderCell) {
        const row = el("tr");

        const heading = el(
            "th",
            "",
            label
        );

        heading.scope = "row";

        row.appendChild(heading);

        products.forEach(product => {
            const cell = el("td");

            renderCell(cell, product);

            row.appendChild(cell);
        });

        table.appendChild(row);
    }

    addRow("Product", (cell, product) => {
        const image = el("img");

        image.src = product.image;
        image.alt = product.name;

        const title = el(
            "p",
            "compare-product-title",
            product.name
        );

        cell.append(
            image,
            title
        );
    });

    addRow("Brand", (cell, product) => {
        cell.textContent =
            product.brand || "Not specified";
    });

    addRow("Category", (cell, product) => {
        cell.textContent =
            product.category || "Not specified";
    });

    addRow("Subcategory", (cell, product) => {
        cell.textContent =
            product.subcategory || "Not specified";
    });

    addRow("Price", (cell, product) => {
        cell.textContent = priceLabel(product);
    });

    addRow("Description", (cell, product) => {
        cell.textContent =
            product.description || "Not available";
    });

    addRow("Features", (cell, product) => {
        const features = Array.isArray(product.features)
            ? product.features
            : [];

        if (!features.length) {
            cell.textContent = "Not specified";
            return;
        }

        const list = el(
            "ul",
            "compare-feature-list"
        );

        features.forEach(feature => {
            list.appendChild(
                el("li", "", feature)
            );
        });

        cell.appendChild(list);
    });

    addRow("Actions", (cell, product) => {
        const actions = el(
            "div",
            "compare-actions"
        );

        const details = el(
            "a",
            "btn btn-outline",
            "View Details"
        );

        details.href =
            `product.html?id=${encodeURIComponent(product.id)}`;

        const cartButton = el(
            "button",
            "btn btn-primary",
            "Add to Shopping List"
        );

        cartButton.type = "button";

        cartButton.onclick = () => {
            addToCart(product.id);
        };

        const removeButton = el(
            "button",
            "compare-remove",
            "Remove"
        );

        removeButton.type = "button";

        removeButton.onclick = () => {
            removeSaved(product.id);
        };

        actions.append(
            details,
            cartButton,
            removeButton
        );

        cell.appendChild(actions);
    });

    wrapper.appendChild(table);

    container.appendChild(wrapper);
}

/* ==========================================
   RENDER PAGE
========================================== */

function renderPage() {
    const key = pageType === "wishlist"
        ? WISHLIST_KEY
        : COMPARE_KEY;

    const products = getVisibleProducts(key);

    const count = $("savedCount");

    if (count) {
        count.textContent =
            `${products.length} product(s) selected`;
    }

    const clearButton = $("clearSaved");

    if (clearButton) {
        clearButton.disabled = products.length === 0;
    }

    if (pageType === "wishlist") {
        renderWishlist(products);
    } else {
        renderComparison(products);
    }

    updateCounters();
}

/* ==========================================
   CLEAR ALL
========================================== */

function setupClearButton() {
    const button = $("clearSaved");

    if (!button) return;

    button.onclick = () => {
        const key = pageType === "wishlist"
            ? WISHLIST_KEY
            : COMPARE_KEY;

        const label = pageType === "wishlist"
            ? "wishlist"
            : "comparison";

        if (!confirm(`Clear your ${label}?`)) {
            return;
        }

        saveStorage(key, []);

        renderPage();
    };
}

/* ==========================================
   MOBILE NAVIGATION
========================================== */

function setupMenu() {
    const toggle = $("savedMenuToggle");
    const menu = $("savedNavLinks");

    if (!toggle || !menu) return;

    toggle.onclick = () => {
        const isOpen = menu.classList.toggle("active");

        toggle.setAttribute(
            "aria-expanded",
            String(isOpen)
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
   INITIALIZE
========================================== */

async function init() {
    setupMenu();
    setupClearButton();
    updateCounters();

    try {
        const response = await fetch(
            "data/products.json"
        );

        if (!response.ok) {
            throw new Error("Unable to load products.");
        }

        const products = await response.json();

        if (!Array.isArray(products)) {
            throw new Error("Invalid product database.");
        }

        allProducts = products;

        renderPage();

    } catch (error) {
        console.error(error);

        const grid = $("savedGrid");

        if (grid) {
            grid.textContent =
                "Unable to load saved products. Please try again.";
        }
    }
}

init();