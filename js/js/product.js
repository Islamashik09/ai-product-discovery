/* ==========================================
   ETHORISE — PRODUCT DETAILS
========================================== */

"use strict";

const productDetail =
    document.getElementById("productDetail");

const relatedProducts =
    document.getElementById("relatedProducts");

const params = new URLSearchParams(
    window.location.search
);

const productId = Number(params.get("id"));

/* HELPERS */

function createElement(tag, className = "", text) {
    const element = document.createElement(tag);

    if (className) element.className = className;

    if (text !== undefined) element.textContent = text;

    return element;
}

function formatPrice(product) {
    if (
        product.price === null ||
        product.price === undefined ||
        Number(product.price) <= 0
    ) {
        return product.affiliatePlatform === "Amazon"
            ? "Check Price on Amazon"
            : "Check Latest Price";
    }

    return `$${Number(product.price).toFixed(2)} USD (Demo)`;
}

/* AFFILIATE LINK */

function createAffiliateLink(product) {
    const isAmazon =
        product.affiliatePlatform === "Amazon";

    const link = createElement(
        "a",
        "btn btn-primary",
        isAmazon
            ? "View on Amazon ↗"
            : "View Product ↗"
    );

    try {
        if (
            !product.affiliateLink ||
            product.affiliateLink === "#"
        ) {
            throw new Error("Missing link");
        }

        const url = new URL(product.affiliateLink);

        if (
            url.protocol !== "https:" &&
            url.protocol !== "http:"
        ) {
            throw new Error("Invalid URL");
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

/* WISHLIST */

function addToWishlist(id) {
    let saved = [];

    try {
        const data = JSON.parse(
            localStorage.getItem("ethoriseWishlist") || "[]"
        );

        if (Array.isArray(data)) {
            saved = data.filter(Number.isInteger);
        }

    } catch {
        saved = [];
    }

    if (!saved.includes(id)) {
        saved.push(id);
    }

    localStorage.setItem(
        "ethoriseWishlist",
        JSON.stringify(saved)
    );

    alert("Product saved to wishlist!");
}

/* RENDER PRODUCT DETAILS */

function renderProduct(product) {
    productDetail.replaceChildren();

    const grid = createElement(
        "div",
        "product-detail-grid"
    );

    const imageBox = createElement(
        "div",
        "product-detail-image"
    );

    const image = createElement("img");

    image.src = product.image;
    image.alt = product.name;

    imageBox.appendChild(image);

    const info = createElement(
        "div",
        "product-detail-info"
    );

    const category = createElement(
        "span",
        "eyebrow",
        product.category
    );

    const title = createElement(
        "h1",
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
        "",
        product.description || "Description unavailable."
    );

    const featuresBox = createElement(
        "div",
        "product-features"
    );

    const featuresTitle = createElement(
        "h3",
        "",
        "Product Features"
    );

    const featureList = createElement("ul");

    (product.features || []).forEach(feature => {
        const item = createElement("li", "", feature);

        featureList.appendChild(item);
    });

    featuresBox.append(featuresTitle, featureList);

    const availability = createElement(
        "p",
        "",
        `Listed Markets (Demo): ${(product.countries || []).join(", ")}`
    );

    availability.style.marginTop = "20px";

    const actions = createElement(
        "div",
        "product-detail-actions"
    );

    const affiliateLink = createAffiliateLink(product);

    const wishlistButton = createElement(
        "button",
        "btn btn-outline",
        "♡ Save to Wishlist"
    );

    wishlistButton.type = "button";

    wishlistButton.addEventListener("click", () => {
        addToWishlist(product.id);
    });

    actions.append(
        affiliateLink,
        wishlistButton
    );

    info.append(
        category,
        title,
        price,
        description,
        featuresBox,
        availability,
        actions
    );

    grid.append(imageBox, info);

    productDetail.appendChild(grid);

    document.title = `${product.name} | ETHORISE`;
}

/* RELATED PRODUCTS */

function renderRelatedProducts(allProducts, currentProduct) {
    relatedProducts.replaceChildren();

    const related = allProducts
        .filter(product =>
            product.id !== currentProduct.id &&
            product.category === currentProduct.category
        )
        .slice(0, 4);

    if (!related.length) {
        relatedProducts.textContent =
            "No related products available.";

        return;
    }

    related.forEach(product => {
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

        imageBox.appendChild(image);

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

        const link = createElement(
            "a",
            "btn btn-primary",
            "View Details →"
        );

        link.href =
            `product.html?id=${encodeURIComponent(product.id)}`;

        info.append(
            category,
            title,
            price,
            link
        );

        card.append(imageBox, info);

        relatedProducts.appendChild(card);
    });
}

/* LOAD PRODUCT */

async function loadProductDetails() {
    try {
        if (!Number.isInteger(productId) || productId <= 0) {
            throw new Error("Invalid product ID");
        }

        const response = await fetch("data/products.json");

        if (!response.ok) {
            throw new Error("Failed to load products.");
        }

        const products = await response.json();

        if (!Array.isArray(products)) {
            throw new Error("Invalid product database.");
        }

        const product = products.find(
            item => item.id === productId
        );

        if (!product) {
            productDetail.textContent = "Product not found.";
            return;
        }

        renderProduct(product);

        renderRelatedProducts(products, product);

    } catch (error) {
        console.error(error);

        productDetail.textContent =
            "Unable to load product details.";
    }
}

/* MOBILE NAVIGATION */

const menuToggle =
    document.getElementById("productMenuToggle");

const navLinks =
    document.getElementById("productNavLinks");

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

        menuToggle.setAttribute("aria-expanded", "false");
    });
});

/* INITIALIZE */

loadProductDetails();