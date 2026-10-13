/* ==========================================
   ETHORISE — MAIN APPLICATION
   Premium Affiliate Product Discovery
========================================== */

"use strict";

/* ==========================================
   APPLICATION STATE
========================================== */

let products = [];

const MAX_COMPARE = 3;

let wishlistOnly = false;

function readSavedIds(key) {
    try {
        const saved = JSON.parse(
            localStorage.getItem(key) || "[]"
        );

        if (!Array.isArray(saved)) return [];

        return saved.filter(Number.isInteger);

    } catch (error) {
        console.warn("Could not read saved data:", error);
        return [];
    }
}

const wishlist = new Set(
    readSavedIds("ethoriseWishlist")
);

const comparison = new Set(
    readSavedIds("ethoriseComparison")
);

/* ==========================================
   DOM ELEMENTS
========================================== */

const grid = document.getElementById("productGrid");

const searchInput = document.getElementById("searchInput");

const categoryFilter = document.getElementById("categoryFilter");

const countryFilter = document.getElementById("countryFilter");

const sortFilter = document.getElementById("sortFilter");

const productCount = document.getElementById("productCount");

const wishlistCount = document.getElementById("wishlistCount");

const compareCount = document.getElementById("compareCount");

const compareBar = document.getElementById("compareBar");

const compareBarCount = document.getElementById("compareBarCount");

const modal = document.getElementById("quickViewModal");

const modalBody = document.getElementById("modalBody");

const compareModal = document.getElementById("compareModal");

const compareContent = document.getElementById("compareContent");

/* ==========================================
   HELPER FUNCTIONS
========================================== */

function createElement(tag, className = "", text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function formatPrice(product) {
    const price = Number(product.price);

    if (
        product.price === null ||
        product.price === undefined ||
        !Number.isFinite(price) ||
        price <= 0
    ) {
        return product.affiliatePlatform === "Amazon"
            ? "Check Price on Amazon"
            : "Check Latest Price";
    }

    return `$${price.toFixed(2)} USD (Demo)`;
}

function saveSet(key, set) {
    try {
        localStorage.setItem(
            key,
            JSON.stringify([...set])
        );
    } catch (error) {
        console.warn("Unable to save data:", error);
    }
}

/* ==========================================
   WISHLIST
========================================== */

function saveWishlist() {
    saveSet("ethoriseWishlist", wishlist);

    wishlistCount.textContent = wishlist.size;
}

function toggleWishlist(productId) {
    if (wishlist.has(productId)) {
        wishlist.delete(productId);
    } else {
        wishlist.add(productId);
    }

    saveWishlist();
    applyFilters();
}

/* ==========================================
   PRODUCT COMPARISON
========================================== */

function saveComparison() {
    saveSet("ethoriseComparison", comparison);

    compareCount.textContent = comparison.size;

    compareBarCount.textContent =
        `${comparison.size} of ${MAX_COMPARE} products selected`;

    compareBar.hidden = comparison.size === 0;
}

function toggleComparison(productId) {
    if (comparison.has(productId)) {
        comparison.delete(productId);
    } else {
        if (comparison.size >= MAX_COMPARE) {
            alert("You can compare up to 3 products.");
            return;
        }

        comparison.add(productId);
    }

    saveComparison();
    applyFilters();
}

/* ==========================================
   AFFILIATE LINKS
========================================== */

function createAffiliateLink(product) {
    const platform = product.affiliatePlatform || "";

    const label = platform === "Amazon"
        ? "View on Amazon ↗"
        : platform === "AliExpress"
            ? "View on AliExpress ↗"
            : "View Product ↗";

    const link = createElement("a", "", label);

    try {
        if (
            !product.affiliateLink ||
            product.affiliateLink === "#"
        ) {
            throw new Error("Missing affiliate link");
        }

        const url = new URL(product.affiliateLink);

        if (
            url.protocol !== "https:" &&
            url.protocol !== "http:"
        ) {
            throw new Error("Unsupported protocol");
        }

        link.href = url.href;
        link.target = "_blank";

        link.rel =
            "sponsored nofollow noopener noreferrer";

    } catch {
        link.href = "#";

        link.addEventListener("click", event => {
            event.preventDefault();

            alert("Product link coming soon.");
        });
    }

    return link;
}

/* ==========================================
   PRODUCT CARDS
========================================== */

function createProductCard(product) {
    const card = createElement(
        "article",
        "product-card"
    );

    const imageBox = createElement(
        "div",
        "product-image"
    );

    const image = createElement("img");

    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    const wishlistButton = createElement(
        "button",
        "wishlist-toggle",
        wishlist.has(product.id) ? "♥" : "♡"
    );

    wishlistButton.type = "button";

    wishlistButton.setAttribute(
        "aria-label",
        `Save ${product.name} to wishlist`
    );

    wishlistButton.setAttribute(
        "aria-pressed",
        String(wishlist.has(product.id))
    );

    wishlistButton.addEventListener("click", () => {
        toggleWishlist(product.id);
    });

    imageBox.append(image, wishlistButton);

    const info = createElement(
        "div",
        "product-info"
    );

    const category = createElement(
        "p",
        "product-category",
        product.category
    );

    const title = createElement(
        "h3",
        "",
        product.name
    );

    const price = createElement(
        "p",
        "product-price",
        formatPrice(product)
    );

    const actions = createElement(
        "div",
        "product-actions"
    );

    const quickView = createElement(
        "button",
        "",
        "Quick View"
    );

    quickView.type = "button";

    quickView.addEventListener("click", () => {
        openQuickView(product);
    });

    actions.append(
        quickView,
        createAffiliateLink(product)
    );

    const compareButton = createElement(
        "button",
        "compare-toggle",
        comparison.has(product.id)
            ? "✓ Added to Compare"
            : "⚖ Add to Compare"
    );

    compareButton.type = "button";

    compareButton.setAttribute(
        "aria-pressed",
        String(comparison.has(product.id))
    );

    if (comparison.has(product.id)) {
        compareButton.classList.add("active");
    }

    compareButton.addEventListener("click", () => {
        toggleComparison(product.id);
    });

    const detailsLink = createElement(
        "a",
        "product-details-link",
        "View Details →"
    );

    detailsLink.href =
        `product.html?id=${encodeURIComponent(product.id)}`;

    detailsLink.style.display = "inline-block";
    detailsLink.style.marginTop = "12px";
    detailsLink.style.fontSize = "12px";
    detailsLink.style.fontWeight = "600";
    detailsLink.style.color = "#ff6b35";

    info.append(
        category,
        title,
        price,
        actions,
        compareButton,
        detailsLink
    );

    card.append(imageBox, info);

    return card;
}

/* ==========================================
   RENDER PRODUCTS
========================================== */

function renderProducts(items) {
    grid.replaceChildren();

    productCount.textContent =
        `${items.length} product${items.length === 1 ? "" : "s"} found`;

    if (!items.length) {
        const message = wishlistOnly
            ? "No saved products match your filters."
            : "No products found in this category yet.";

        const empty = createElement(
            "div",
            "empty-products",
            message
        );

        grid.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(product => {
        fragment.appendChild(
            createProductCard(product)
        );
    });

    grid.appendChild(fragment);
}

/* ==========================================
   SEARCH, FILTERING AND SORTING
========================================== */

function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();

    const category = categoryFilter.value;

    const country = countryFilter.value;

    const sort = sortFilter.value;

    const filtered = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(search) ||
            product.category.toLowerCase().includes(search) ||
            (product.description || "")
                .toLowerCase()
                .includes(search);

        const matchesCategory =
            category === "All" ||
            product.category === category;

        const matchesCountry =
            country === "All" ||
            (product.countries || []).includes(country);

        const matchesWishlist =
            !wishlistOnly ||
            wishlist.has(product.id);

        return (
            matchesSearch &&
            matchesCategory &&
            matchesCountry &&
            matchesWishlist
        );
    });

    function verifiedPrice(product) {
        const price = Number(product.price);

        return Number.isFinite(price) && price > 0
            ? price
            : null;
    }

    if (sort === "price-low" || sort === "price-high") {
        filtered.sort((a, b) => {
            const aPrice = verifiedPrice(a);
            const bPrice = verifiedPrice(b);

            if (aPrice === null && bPrice === null) return 0;
            if (aPrice === null) return 1;
            if (bPrice === null) return -1;

            return sort === "price-low"
                ? aPrice - bPrice
                : bPrice - aPrice;
        });
    }

    if (sort === "name") {
        filtered.sort(
            (a, b) => a.name.localeCompare(b.name)
        );
    }

    renderProducts(filtered);
}

/* ==========================================
   CLEAR FILTERS
========================================== */

document.getElementById("clearFilters")
    .addEventListener("click", () => {
        searchInput.value = "";
        categoryFilter.value = "All";
        countryFilter.value = "All";
        sortFilter.value = "default";

        wishlistOnly = false;

        applyFilters();
    });

/* ==========================================
   QUICK VIEW MODAL
========================================== */

function openQuickView(product) {
    modalBody.replaceChildren();

    const image = createElement("img");
    image.src = product.image;
    image.alt = product.name;

    const category = createElement(
        "p",
        "product-category",
        product.category
    );

    const title = createElement(
        "h2",
        "",
        product.name
    );

    const price = createElement(
        "p",
        "product-price",
        formatPrice(product)
    );

    const description = createElement(
        "p",
        "product-description",
        product.description || ""
    );

    const detailsLink = createElement(
        "a",
        "btn btn-outline",
        "Full Details →"
    );

    detailsLink.href =
        `product.html?id=${encodeURIComponent(product.id)}`;

    detailsLink.style.marginTop = "15px";
    detailsLink.style.marginRight = "10px";

    const affiliateLink = createAffiliateLink(product);

    affiliateLink.className = "btn btn-primary";
    affiliateLink.style.marginTop = "15px";

    modalBody.append(
        image,
        category,
        title,
        price,
        description,
        detailsLink,
        affiliateLink
    );

    modal.classList.add("active");

    modal.setAttribute("aria-hidden", "false");

    document.getElementById("closeModal").focus();
}

function closeQuickView() {
    modal.classList.remove("active");

    modal.setAttribute("aria-hidden", "true");
}

/* ==========================================
   COMPARISON MODAL
========================================== */

function openComparison() {
    compareContent.replaceChildren();

    const selected = products.filter(product =>
        comparison.has(product.id)
    );

    if (!selected.length) {
        alert("Select products to compare.");
        return;
    }

    const table = createElement(
        "table",
        "compare-table"
    );

    const tbody = createElement("tbody");

    function addRow(label, getValue) {
        const row = createElement("tr");

        const heading = createElement(
            "th",
            "",
            label
        );

        heading.scope = "row";
        row.appendChild(heading);

        selected.forEach(product => {
            const cell = createElement("td");

            const value = getValue(product);

            if (value instanceof Node) {
                cell.appendChild(value);
            } else {
                cell.textContent = String(value);
            }

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    }

    addRow("Product", product => {
        const wrapper = createElement("div");

        const image = createElement("img");
        image.src = product.image;
        image.alt = product.name;

        const name = createElement(
            "strong",
            "",
            product.name
        );

        wrapper.append(image, name);

        return wrapper;
    });

    addRow(
        "Price",
        product => formatPrice(product)
    );

    addRow(
        "Category",
        product => product.category
    );

    addRow(
        "Listed Markets (Demo)",
        product => (product.countries || []).join(", ")
    );

    addRow(
        "Description",
        product => product.description || "Not available"
    );

    addRow(
        "Features",
        product => (product.features || []).join(" • ")
    );

    addRow("Details", product => {
        const link = createElement(
            "a",
            "",
            "View Details →"
        );

        link.href =
            `product.html?id=${encodeURIComponent(product.id)}`;

        link.style.color = "#ff6b35";

        return link;
    });

    table.appendChild(tbody);

    compareContent.appendChild(table);

    compareModal.classList.add("active");

    compareModal.setAttribute("aria-hidden", "false");

    document.getElementById("closeCompareModal").focus();
}

function closeComparison() {
    compareModal.classList.remove("active");

    compareModal.setAttribute("aria-hidden", "true");
}

/* ==========================================
   MODAL EVENTS
========================================== */

document.getElementById("closeModal")
    .addEventListener("click", closeQuickView);

document.getElementById("closeCompareModal")
    .addEventListener("click", closeComparison);

modal.addEventListener("click", event => {
    if (event.target === modal) {
        closeQuickView();
    }
});

compareModal.addEventListener("click", event => {
    if (event.target === compareModal) {
        closeComparison();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeQuickView();
        closeComparison();
    }
});

/* ==========================================
   COMPARISON CONTROLS
========================================== */

document.getElementById("openCompare")
    .addEventListener("click", openComparison);

document.getElementById("compareNavBtn")
    .addEventListener("click", openComparison);

document.getElementById("clearCompare")
    .addEventListener("click", () => {
        comparison.clear();

        saveComparison();
        applyFilters();
    });

/* ==========================================
   WISHLIST NAVIGATION
========================================== */

document.getElementById("wishlistBtn")
    .addEventListener("click", () => {
        wishlistOnly = true;

        searchInput.value = "";
        categoryFilter.value = "All";
        countryFilter.value = "All";
        sortFilter.value = "default";

        applyFilters();

        document.getElementById("shop")
            .scrollIntoView({
                behavior: "smooth"
            });
    });

/* ==========================================
   CATEGORY SELECTION
========================================== */

function selectCategory(category) {
    wishlistOnly = false;

    searchInput.value = "";

    countryFilter.value = "All";

    sortFilter.value = "default";

    const availableOptions = [
        ...categoryFilter.options
    ].map(option => option.value);

    categoryFilter.value = availableOptions.includes(category)
        ? category
        : "All";

    applyFilters();

    document.getElementById("shop")
        .scrollIntoView({
            behavior: "smooth"
        });
}

document.querySelectorAll(".category-card")
    .forEach(button => {
        button.addEventListener("click", () => {
            selectCategory(
                button.dataset.category
            );
        });
    });

/* ==========================================
   FEATURED COLLECTIONS
========================================== */

document.querySelectorAll(".collection-card")
    .forEach(card => {
        card.addEventListener("click", event => {
            event.preventDefault();

            const category =
                card.dataset.collection;

            selectCategory(category);
        });
    });

/* ==========================================
   MOBILE MENU
========================================== */

const menuToggle =
    document.getElementById("menuToggle");

const navLinks =
    document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");

    menuToggle.setAttribute(
        "aria-expanded",
        String(navLinks.classList.contains("active"))
    );
});

navLinks.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
        navLinks.classList.remove("active");

        menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );
    });
});

/* ==========================================
   FILTER EVENTS
========================================== */

searchInput.addEventListener("input", applyFilters);

categoryFilter.addEventListener("change", applyFilters);

countryFilter.addEventListener("change", applyFilters);

sortFilter.addEventListener("change", applyFilters);

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
                "Invalid product database format."
            );
        }

        products = data;

        const validIds = new Set(
            products.map(product => product.id)
        );

        for (const id of wishlist) {
            if (!validIds.has(id)) {
                wishlist.delete(id);
            }
        }

        for (const id of comparison) {
            if (!validIds.has(id)) {
                comparison.delete(id);
            }
        }

        saveWishlist();
        saveComparison();

        applyFilters();

    } catch (error) {
        console.error(error);

        grid.textContent =
            "Unable to load products. Please try again.";

        productCount.textContent =
            "Products unavailable";
    }
}

/* ==========================================
   INITIALIZE
========================================== */

saveWishlist();
saveComparison();

loadProducts();