"use strict";

/* ETHORISE — MAIN APPLICATION */

let products = [];

const MAX_COMPARE = 3;

const wishlist = new Set(readIds("ethoriseWishlist"));
const comparison = new Set(readIds("ethoriseComparison"));

let wishlistOnly = false;

const $ = id => document.getElementById(id);

const grid = $("productGrid");
const searchInput = $("searchInput");
const categoryFilter = $("categoryFilter");
const countryFilter = $("countryFilter");
const sortFilter = $("sortFilter");

const quickModal = $("quickViewModal");
const compareModal = $("compareModal");

function readIds(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(data)
            ? data.filter(Number.isInteger)
            : [];
    } catch {
        return [];
    }
}

function saveIds(key, values) {
    try {
        localStorage.setItem(key, JSON.stringify([...values]));
    } catch (error) {
        console.warn("Storage unavailable:", error);
    }
}

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

    const link = el("a", "", label);

    try {
        const url = new URL(product.affiliateLink);

        if (url.protocol !== "https:") {
            throw new Error("Invalid link");
        }

        link.href = url.href;
        link.target = "_blank";
        link.rel = "sponsored nofollow noopener noreferrer";

    } catch {
        link.href = "#";
        link.addEventListener("click", event => {
            event.preventDefault();
            alert("Product link unavailable.");
        });
    }

    return link;
}

function updateCounters() {
    $("wishlistCount").textContent = wishlist.size;
    $("compareCount").textContent = comparison.size;

    $("compareBarCount").textContent =
        `${comparison.size} of ${MAX_COMPARE} products selected`;

    $("compareBar").hidden = comparison.size === 0;
}

function toggleWishlist(id) {
    wishlist.has(id) ? wishlist.delete(id) : wishlist.add(id);

    saveIds("ethoriseWishlist", wishlist);
    updateCounters();
    filterProducts();
}

function toggleCompare(id) {
    if (comparison.has(id)) {
        comparison.delete(id);
    } else {
        if (comparison.size >= MAX_COMPARE) {
            alert("Maximum 3 products can be compared.");
            return;
        }
        comparison.add(id);
    }

    saveIds("ethoriseComparison", comparison);
    updateCounters();
    filterProducts();
}

function productCard(product) {
    const card = el("article", "product-card");

    const imageBox = el("div", "product-image");
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
    heart.setAttribute("aria-label", "Toggle wishlist");
    heart.setAttribute(
        "aria-pressed",
        String(wishlist.has(product.id))
    );
    heart.onclick = () => toggleWishlist(product.id);

    imageBox.append(image, heart);

    const info = el("div", "product-info");

    const category = el(
        "p",
        "product-category",
        product.category
    );

    const title = el("h3", "", product.name);
    const price = el("p", "product-price", priceLabel(product));

    const actions = el("div", "product-actions");

    const quick = el("button", "", "Quick View");
    quick.type = "button";
    quick.onclick = () => openQuickView(product);

    actions.append(quick, affiliateLink(product));

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

    const details = el(
        "a",
        "product-details-link",
        "View Details →"
    );

    details.href = `product.html?id=${encodeURIComponent(product.id)}`;
    details.style.cssText =
        "display:block;margin-top:12px;color:#ff6b35;font-size:12px;font-weight:600";

    info.append(
        category,
        title,
        price,
        actions,
        compare,
        details
    );

    card.append(imageBox, info);

    return card;
}

function renderProducts(items) {
    grid.replaceChildren();

    $("productCount").textContent =
        `${items.length} product${items.length === 1 ? "" : "s"} found`;

    if (!items.length) {
        grid.appendChild(
            el("p", "", "No products found.")
        );
        return;
    }

    items.forEach(product => {
        grid.appendChild(productCard(product));
    });
}

function filterProducts() {
    const search = searchInput.value.trim().toLowerCase();
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
            (category === "All" || product.category === category) &&
            (
                country === "All" ||
                (product.countries || []).includes(country)
            ) &&
            (!wishlistOnly || wishlist.has(product.id))
        );
    });

    if (sort === "name") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sort === "price-low" || sort === "price-high") {
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

            return sort === "price-low" ? pa - pb : pb - pa;
        });
    }

    renderProducts(filtered);
}

function selectCategory(category) {
    wishlistOnly = false;
    searchInput.value = "";
    countryFilter.value = "All";
    sortFilter.value = "default";
    categoryFilter.value = category;

    filterProducts();

    $("shop").scrollIntoView({ behavior: "smooth" });
}

function openQuickView(product) {
    const body = $("modalBody");
    body.replaceChildren();

    const image = el("img");
    image.src = product.image;
    image.alt = product.name;

    const title = el("h2", "", product.name);
    const price = el("p", "product-price", priceLabel(product));
    const description = el("p", "", product.description || "");

    const details = el("a", "btn btn-outline", "Full Details →");
    details.href = `product.html?id=${encodeURIComponent(product.id)}`;

    const link = affiliateLink(product);
    link.className = "btn btn-primary";

    const actions = el("div", "product-detail-actions");
    actions.append(details, link);

    body.append(image, title, price, description, actions);

    quickModal.classList.add("active");
    quickModal.setAttribute("aria-hidden", "false");
    $("closeModal").focus();
}

function closeModal(modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
}

function openComparison() {
    const selected = products.filter(product =>
        comparison.has(product.id)
    );

    if (!selected.length) {
        alert("Select products first.");
        return;
    }

    const container = $("compareContent");
    container.replaceChildren();

    const table = el("table", "compare-table");
    const tbody = el("tbody");

    const rows = [
        ["Product", p => p.name],
        ["Price", priceLabel],
        ["Category", p => p.category],
        ["Description", p => p.description || ""],
        ["Features", p => (p.features || []).join(", ")]
    ];

    rows.forEach(([label, value]) => {
        const row = el("tr");
        const heading = el("th", "", label);
        heading.scope = "row";
        row.appendChild(heading);

        selected.forEach(product => {
            row.appendChild(el("td", "", value(product)));
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    compareModal.classList.add("active");
    compareModal.setAttribute("aria-hidden", "false");
    $("closeCompareModal").focus();
}

function setupEvents() {
    searchInput.addEventListener("input", filterProducts);
    categoryFilter.addEventListener("change", filterProducts);
    countryFilter.addEventListener("change", filterProducts);
    sortFilter.addEventListener("change", filterProducts);

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
        $("shop").scrollIntoView({ behavior: "smooth" });
    };

    $("compareNavBtn").onclick = openComparison;
    $("openCompare").onclick = openComparison;

    $("clearCompare").onclick = () => {
        comparison.clear();
        saveIds("ethoriseComparison", comparison);
        updateCounters();
        filterProducts();
    };

    $("closeModal").onclick = () => closeModal(quickModal);

    $("closeCompareModal").onclick = () =>
        closeModal(compareModal);

    [quickModal, compareModal].forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) closeModal(modal);
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal(quickModal);
            closeModal(compareModal);
        }
    });

    document.querySelectorAll(".category-card").forEach(button => {
        button.onclick = () => selectCategory(button.dataset.category);
    });

    document.querySelectorAll(".collection-card").forEach(card => {
        card.onclick = event => {
            event.preventDefault();
            selectCategory(card.dataset.collection);
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
            toggle.setAttribute("aria-expanded", "false");
        };
    });
}

async function init() {
    setupEvents();

    try {
        const response = await fetch("data/products.json");

        if (!response.ok) throw new Error("Product database unavailable");

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid product data");
        }

        products = data.filter(p => p.status !== "inactive");

        const ids = new Set(products.map(p => p.id));

        for (const id of wishlist) {
            if (!ids.has(id)) wishlist.delete(id);
        }

        for (const id of comparison) {
            if (!ids.has(id)) comparison.delete(id);
        }

        saveIds("ethoriseWishlist", wishlist);
        saveIds("ethoriseComparison", comparison);

        updateCounters();
        filterProducts();

    } catch (error) {
        console.error(error);
        grid.textContent = "Unable to load products.";
    }
}

updateCounters();
init();