"use strict";

/* ==========================================
   ETHORISE — MAIN APPLICATION
   Product Discovery + Shopping List
========================================== */

let products = [];

const MAX_COMPARE = 3;

const CART_KEY = "ethoriseCart";
const WISHLIST_KEY = "ethoriseWishlist";
const COMPARE_KEY = "ethoriseComparison";

let wishlistOnly = false;

const $ = id => document.getElementById(id);

/* ==========================================
   LOCAL STORAGE
========================================== */

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

const wishlist = new Set(
    readIds(WISHLIST_KEY)
);

const comparison = new Set(
    readIds(COMPARE_KEY)
);

/* ==========================================
   DOM ELEMENTS
========================================== */

const grid = $("productGrid");

const searchInput = $("searchInput");
const categoryFilter = $("categoryFilter");
const countryFilter = $("countryFilter");
const sortFilter = $("sortFilter");

const quickModal = $("quickViewModal");
const compareModal = $("compareModal");

/* ==========================================
   HELPERS
========================================== */

function el(tag, className = "", text = null) {
    const node = document.createElement(tag);

    if (className) node.className = className;

    if (text !== null) node.textContent = text;

    return node;
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
    const count = $("cartCount");

    if (count) count.textContent = cartQuantity();
}

function addToCart(productId) {
    const product = products.find(
        item => item.id === productId
    );

    if (!product) return;

    const cart = readCart();

    const existing = cart.find(
        item => item.id === productId
    );

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: productId,
            quantity: 1
        });
    }

    saveStorage(CART_KEY, cart);

    updateCartCount();

    showCartNotification(product.name);
}

function showCartNotification(name) {
    const previous = $("cartNotification");

    if (previous) previous.remove();

    const notification = el(
        "div",
        "cart-notification"
    );

    notification.id = "cartNotification";

    const message = el(
        "span",
        "",
        `${name} added to your shopping list.`
    );

    const link = el(
        "a",
        "",
        "View Shopping List →"
    );

    link.href = "cart.html";

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
        boxShadow: "0 15px 45px rgba(0,0,0,.2)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        fontSize: "13px"
    });

    link.style.color = "#ff6b35";

    notification.append(message, link);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

/* ==========================================
   CART NAVIGATION
========================================== */

function createCartNavigation() {
    const actions = document.querySelector(
        ".nav-actions"
    );

    if (!actions || $("cartNavLink")) return;

    const link = el(
        "a",
        "nav-icon-btn",
        "🛒"
    );

    link.id = "cartNavLink";

    link.href = "cart.html";

    link.setAttribute(
        "aria-label",
        "View shopping list"
    );

    link.style.position = "relative";
    link.style.fontSize = "22px";

    const count = el(
        "span",
        "",
        "0"
    );

    count.id = "cartCount";

    Object.assign(count.style, {
        position: "absolute",
        top: "-8px",
        right: "-10px",
        background: "#ff6b35",
        color: "#fff",
        borderRadius: "50%",
        minWidth: "18px",
        height: "18px",
        padding: "0 4px",
        fontSize: "10px",
        display: "grid",
        placeItems: "center"
    });

    link.appendChild(count);

    const toggle = $("menuToggle");

    if (toggle) {
        actions.insertBefore(link, toggle);
    } else {
        actions.appendChild(link);
    }

    updateCartCount();
}

/* ==========================================
   WISHLIST
========================================== */

function toggleWishlist(id) {
    if (wishlist.has(id)) {
        wishlist.delete(id);
    } else {
        wishlist.add(id);
    }

    saveStorage(WISHLIST_KEY, [...wishlist]);

    updateCounters();

    filterProducts();
}

/* ==========================================
   COMPARISON
========================================== */

function toggleCompare(id) {
    if (comparison.has(id)) {
        comparison.delete(id);
    } else {
        if (comparison.size >= MAX_COMPARE) {
            alert("You can compare up to 3 products.");
            return;
        }

        comparison.add(id);
    }

    saveStorage(COMPARE_KEY, [...comparison]);

    updateCounters();

    filterProducts();
}

function updateCounters() {
    const wishlistCount = $("wishlistCount");
    const compareCount = $("compareCount");
    const compareBarCount = $("compareBarCount");
    const compareBar = $("compareBar");

    if (wishlistCount) {
        wishlistCount.textContent = wishlist.size;
    }

    if (compareCount) {
        compareCount.textContent = comparison.size;
    }

    if (compareBarCount) {
        compareBarCount.textContent =
            `${comparison.size} of ${MAX_COMPARE} products selected`;
    }

    if (compareBar) {
        compareBar.hidden = comparison.size === 0;
    }

    updateCartCount();
}

/* ==========================================
   PRODUCT CARDS
========================================== */

function productCard(product) {
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

    const heart = el(
        "button",
        "wishlist-toggle",
        wishlist.has(product.id) ? "♥" : "♡"
    );

    heart.type = "button";

    heart.setAttribute(
        "aria-label",
        `Toggle wishlist for ${product.name}`
    );

    heart.setAttribute(
        "aria-pressed",
        String(wishlist.has(product.id))
    );

    heart.onclick = () => toggleWishlist(product.id);

    imageBox.append(image, heart);

    const info = el(
        "div",
        "product-info"
    );

    const category = el(
        "p",
        "product-category",
        product.category
    );

    const title = el(
        "h3",
        "",
        product.name
    );

    const price = el(
        "p",
        "product-price",
        priceLabel(product)
    );

    const actions = el(
        "div",
        "product-actions"
    );

    /* QUICK VIEW */

    const quick = el(
        "button",
        "",
        "Quick View"
    );

    quick.type = "button";
    quick.onclick = () => openQuickView(product);

    /* DETAILS */

    const details = el(
        "a",
        "",
        "View Details →"
    );

    details.href =
        `product.html?id=${encodeURIComponent(product.id)}`;

    actions.append(
        quick,
        details
    );

    /* ADD TO CART */

    const addButton = el(
        "button",
        "add-to-cart-btn",
        "🛒 Add to Cart"
    );

    addButton.type = "button";

    Object.assign(addButton.style, {
        width: "100%",
        padding: "13px",
        marginTop: "14px",
        background: "#ff6b35",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer"
    });

    addButton.onclick = () => addToCart(product.id);

    /* COMPARE */

    const compare = el(
        "button",
        "compare-toggle",
        comparison.has(product.id)
            ? "✓ Added to Compare"
            : "⚖ Add to Compare"
    );

    compare.type = "button";

    compare.setAttribute(
        "aria-pressed",
        String(comparison.has(product.id))
    );

    compare.onclick = () => toggleCompare(product.id);

    info.append(
        category,
        title,
        price,
        actions,
        addButton,
        compare
    );

    card.append(
        imageBox,
        info
    );

    return card;
}

/* ==========================================
   RENDER PRODUCTS
========================================== */

function renderProducts(items) {
    grid.replaceChildren();

    const count = $("productCount");

    if (count) {
        count.textContent =
            `${items.length} product${items.length === 1 ? "" : "s"} found`;
    }

    if (!items.length) {
        grid.appendChild(
            el(
                "p",
                "",
                "No products found."
            )
        );

        return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(product => {
        fragment.appendChild(
            productCard(product)
        );
    });

    grid.appendChild(fragment);
}

/* ==========================================
   FILTERS
========================================== */

function filterProducts() {
    const search =
        searchInput.value.trim().toLowerCase();

    const category = categoryFilter.value;
    const country = countryFilter.value;
    const sort = sortFilter.value;

    const filtered = products.filter(product => {
        const text = [
            product.name,
            product.category,
            product.description || "",
            ...(product.tags || [])
        ].join(" ").toLowerCase();

        return (
            text.includes(search) &&
            (
                category === "All" ||
                category === product.category
            ) &&
            (
                country === "All" ||
                (product.countries || []).includes(country)
            ) &&
            (
                !wishlistOnly ||
                wishlist.has(product.id)
            )
        );
    });

    if (sort === "name") {
        filtered.sort(
            (a, b) => a.name.localeCompare(b.name)
        );
    }

    if (
        sort === "price-low" ||
        sort === "price-high"
    ) {
        const getPrice = product => {
            const price = Number(product.price);

            return product.price == null || price <= 0
                ? null
                : price;
        };

        filtered.sort((a, b) => {
            const pa = getPrice(a);
            const pb = getPrice(b);

            if (pa === null) return pb === null ? 0 : 1;
            if (pb === null) return -1;

            return sort === "price-low"
                ? pa - pb
                : pb - pa;
        });
    }

    renderProducts(filtered);
}

/* ==========================================
   CATEGORY SELECTION
========================================== */

function selectCategory(category) {
    wishlistOnly = false;

    searchInput.value = "";
    countryFilter.value = "All";
    sortFilter.value = "default";

    categoryFilter.value = category;

    filterProducts();

    $("shop").scrollIntoView({
        behavior: "smooth"
    });
}

/* ==========================================
   QUICK VIEW
========================================== */

function openQuickView(product) {
    const body = $("modalBody");

    body.replaceChildren();

    const image = el("img");

    image.src = product.image;
    image.alt = product.name;

    const title = el(
        "h2",
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

    const details = el(
        "a",
        "btn btn-outline",
        "Full Product Details →"
    );

    details.href =
        `product.html?id=${encodeURIComponent(product.id)}`;

    const addButton = el(
        "button",
        "btn btn-primary",
        "🛒 Add to Cart"
    );

    addButton.type = "button";

    addButton.onclick = () => addToCart(product.id);

    const actions = el(
        "div",
        "product-detail-actions"
    );

    actions.append(
        details,
        addButton
    );

    body.append(
        image,
        title,
        price,
        description,
        actions
    );

    quickModal.classList.add("active");

    quickModal.setAttribute(
        "aria-hidden",
        "false"
    );

    $("closeModal").focus();
}

/* ==========================================
   MODALS
========================================== */

function closeModal(modal) {
    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );
}

function openComparison() {
    const selected = products.filter(
        product => comparison.has(product.id)
    );

    if (!selected.length) {
        alert("Select products to compare.");
        return;
    }

    const container = $("compareContent");

    container.replaceChildren();

    const table = el(
        "table",
        "compare-table"
    );

    const tbody = el("tbody");

    const rows = [
        ["Product", product => product.name],
        ["Price", priceLabel],
        ["Category", product => product.category],
        ["Description", product => product.description || ""],
        ["Features", product => (product.features || []).join(", ")]
    ];

    rows.forEach(([label, value]) => {
        const row = el("tr");

        const heading = el(
            "th",
            "",
            label
        );

        heading.scope = "row";

        row.appendChild(heading);

        selected.forEach(product => {
            row.appendChild(
                el("td", "", value(product))
            );
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    container.appendChild(table);

    compareModal.classList.add("active");

    compareModal.setAttribute(
        "aria-hidden",
        "false"
    );

    $("closeCompareModal").focus();
}

/* ==========================================
   EVENTS
========================================== */

function setupEvents() {
    searchInput.addEventListener(
        "input",
        filterProducts
    );

    categoryFilter.addEventListener(
        "change",
        filterProducts
    );

    countryFilter.addEventListener(
        "change",
        filterProducts
    );

    sortFilter.addEventListener(
        "change",
        filterProducts
    );

    $("clearFilters").onclick = () => {
        wishlistOnly = false;

        searchInput.value = "";
        categoryFilter.value = "All";
        countryFilter.value = "All";
        sortFilter.value = "default";

        filterProducts();
    };

    $("wishlistBtn").onclick = () => {
        wishlistOnly = true;

        filterProducts();

        $("shop").scrollIntoView({
            behavior: "smooth"
        });
    };

    $("compareNavBtn").onclick =
        openComparison;

    $("openCompare").onclick =
        openComparison;

    $("clearCompare").onclick = () => {
        comparison.clear();

        saveStorage(COMPARE_KEY, []);

        updateCounters();

        filterProducts();
    };

    $("closeModal").onclick = () => {
        closeModal(quickModal);
    };

    $("closeCompareModal").onclick = () => {
        closeModal(compareModal);
    };

    [quickModal, compareModal].forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal(quickModal);
            closeModal(compareModal);
        }
    });

    document.querySelectorAll(
        ".category-card"
    ).forEach(button => {
        button.onclick = () => {
            selectCategory(
                button.dataset.category
            );
        };
    });

    document.querySelectorAll(
        ".collection-card"
    ).forEach(card => {
        card.onclick = event => {
            event.preventDefault();

            selectCategory(
                card.dataset.collection
            );
        };
    });

    const menu = $("navLinks");
    const toggle = $("menuToggle");

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
   INITIALIZE
========================================== */

async function init() {
    createCartNavigation();

    setupEvents();

    updateCounters();

    try {
        const response = await fetch(
            "data/products.json"
        );

        if (!response.ok) {
            throw new Error(
                "Unable to load products."
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

        const validIds = new Set(
            products.map(product => product.id)
        );

        for (const id of wishlist) {
            if (!validIds.has(id)) wishlist.delete(id);
        }

        for (const id of comparison) {
            if (!validIds.has(id)) comparison.delete(id);
        }

        saveStorage(WISHLIST_KEY, [...wishlist]);
        saveStorage(COMPARE_KEY, [...comparison]);

        updateCounters();

        filterProducts();

    } catch (error) {
        console.error(error);

        grid.textContent =
            "Unable to load products.";
    }
}

init();