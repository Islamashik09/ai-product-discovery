let products = [];

const wishlist = new Set(
    JSON.parse(localStorage.getItem("ethoriseWishlist") || "[]")
);

const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const countryFilter = document.getElementById("countryFilter");

const modal = document.getElementById("quickViewModal");
const modalBody = document.getElementById("modalBody");

function saveWishlist() {
    localStorage.setItem(
        "ethoriseWishlist",
        JSON.stringify([...wishlist])
    );

    document.getElementById("wishlistCount").textContent =
        wishlist.size;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function createAffiliateLink(product) {
    const link = createElement("a", "", "View Product");

    if (
        product.affiliateLink &&
        product.affiliateLink !== "#"
    ) {
        link.href = product.affiliateLink;
        link.target = "_blank";
        link.rel = "sponsored nofollow noopener noreferrer";
    } else {
        link.href = "#";
        link.addEventListener("click", event => {
            event.preventDefault();
            alert("Product link coming soon.");
        });
    }

    return link;
}

function renderProducts(items) {
    grid.innerHTML = "";

    if (!items.length) {
        grid.textContent = "No products found.";
        return;
    }

    items.forEach(product => {
        const card = createElement("article", "product-card");

        const imageBox = createElement("div", "product-image");

        const image = createElement("img");
        image.src = product.image;
        image.alt = product.name;
        image.loading = "lazy";

        const wishlistButton = createElement(
            "button",
            "wishlist-toggle",
            wishlist.has(product.id) ? "♥" : "♡"
        );

        wishlistButton.setAttribute(
            "aria-label",
            `Save ${product.name} to wishlist`
        );

        wishlistButton.addEventListener("click", () => {
            if (wishlist.has(product.id)) {
                wishlist.delete(product.id);
            } else {
                wishlist.add(product.id);
            }

            saveWishlist();
            applyFilters();
        });

        imageBox.append(image, wishlistButton);

        const info = createElement("div", "product-info");

        const category = createElement(
            "p",
            "product-category",
            product.category
        );

        const title = createElement("h3", "", product.name);

        const price = createElement(
            "p",
            "product-price",
            `$${product.price.toFixed(2)} USD (Demo)`
        );

        const actions = createElement("div", "product-actions");

        const quickView = createElement(
            "button",
            "",
            "Quick View"
        );

        quickView.addEventListener("click", () => {
            openQuickView(product);
        });

        actions.append(
            quickView,
            createAffiliateLink(product)
        );

        info.append(category, title, price, actions);

        card.append(imageBox, info);

        grid.appendChild(card);
    });
}

function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;
    const country = countryFilter.value;

    const filtered = products.filter(product => {
        const matchesSearch =
            product.name.toLowerCase().includes(search) ||
            product.category.toLowerCase().includes(search);

        const matchesCategory =
            category === "All" ||
            product.category === category;

        const matchesCountry =
            country === "All" ||
            product.countries.includes(country);

        return matchesSearch &&
               matchesCategory &&
               matchesCountry;
    });

    renderProducts(filtered);
}

function openQuickView(product) {
    modalBody.innerHTML = "";

    const image = createElement("img");
    image.src = product.image;
    image.alt = product.name;

    const title = createElement("h2", "", product.name);

    const price = createElement(
        "p",
        "product-price",
        `$${product.price.toFixed(2)} USD (Demo)`
    );

    const category = createElement(
        "p",
        "",
        `Category: ${product.category}`
    );

    const link = createAffiliateLink(product);
    link.className = "btn btn-primary";
    link.style.marginTop = "20px";

    modalBody.append(
        image,
        title,
        price,
        category,
        link
    );

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("closeModal").focus();
}

function closeQuickView() {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
}

document.getElementById("closeModal")
    .addEventListener("click", closeQuickView);

modal.addEventListener("click", event => {
    if (event.target === modal) closeQuickView();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeQuickView();
});

document.getElementById("menuToggle")
    .addEventListener("click", () => {
        const menu = document.querySelector(".nav-links");
        const toggle = document.getElementById("menuToggle");

        menu.classList.toggle("active");

        toggle.setAttribute(
            "aria-expanded",
            menu.classList.contains("active")
        );
    });

document.querySelectorAll(".category-card").forEach(button => {
    button.addEventListener("click", () => {
        categoryFilter.value = button.dataset.category;

        applyFilters();

        document.getElementById("shop")
            .scrollIntoView({ behavior: "smooth" });
    });
});

document.getElementById("wishlistBtn")
    .addEventListener("click", () => {
        const saved = products.filter(product =>
            wishlist.has(product.id)
        );

        renderProducts(saved);

        document.getElementById("shop")
            .scrollIntoView({ behavior: "smooth" });
    });

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);
countryFilter.addEventListener("change", applyFilters);

async function loadProducts() {
    try {
        const response = await fetch("data/products.json");

        if (!response.ok) {
            throw new Error("Failed to load product database.");
        }

        products = await response.json();

        applyFilters();
    } catch (error) {
        console.error(error);

        grid.textContent =
            "Unable to load products. Please try again.";
    }
}

saveWishlist();
loadProducts();