/* ==========================================
   ETHORISE — PRODUCT DETAILS
========================================== */

"use strict";

/* ==========================================
   DOM ELEMENTS
========================================== */

const productDetail =
    document.getElementById("productDetail");

const relatedProducts =
    document.getElementById("relatedProducts");

/* ==========================================
   PRODUCT ID FROM URL
========================================== */

const params = new URLSearchParams(
    window.location.search
);

const productId = Number(
    params.get("id")
);

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

function formatPrice(price) {
    return `$${Number(price).toFixed(2)} USD (Demo)`;
}

function createAffiliateLink(product) {
    const link = createElement(
        "a",
        "btn btn-primary",
        "View Product ↗"
    );

    try {
        if (!product.affiliateLink ||
            product.affiliateLink === "#") {
            throw new Error("No affiliate link");
        }

        const url = new URL(product.affiliateLink);

        if (!["https:", "http:"].includes(url.protocol)) {
            throw new Error("Unsupported link");
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
                "Affiliate product link is coming soon."
            );
        });
    }

    return link;
}

/* ==========================================
   SAVE PRODUCT TO WISHLIST
========================================== */

function addToWishlist(productId) {
    let wishlist = [];

    try {
        const saved = JSON.parse(
            localStorage.getItem("ethoriseWishlist") || "[]"
        );

        if (Array.isArray(saved)) {
            wishlist = saved.filter(Number.isInteger);
        }
    } catch {
        wishlist = [];
    }

    if (!wishlist.includes(productId)) {
        wishlist.push(productId);
    }

    localStorage.setItem(
        "ethoriseWishlist",
        JSON.stringify(wishlist)
    );

    alert("Product added to your wishlist!");
}

/* ==========================================
   PRODUCT DETAILS RENDER
========================================== */

function renderProduct(product) {
    productDetail.replaceChildren();

    const grid = createElement(
        "div",
        "product-detail-grid"
    );

    /* PRODUCT IMAGE */

    const imageWrapper = createElement(
        "div",
        "product-detail-image"
    );

    const image = createElement("img");

    image.src = product.image;
    image.alt = product.name;

    imageWrapper.appendChild(image);

    /* PRODUCT INFORMATION */

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
        formatPrice(product.price)
    );

    const description = createElement(
        "p",
        "",
        product.description ||
        "Product information is not available."
    );

    /* FEATURES */

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
        const item = createElement(
            "li",
            "",
            feature
        );

        featureList.appendChild(item);
    });

    featuresBox.append(
        featuresTitle,
        featureList
    );

    /* MARKET AVAILABILITY */

    const availability = createElement(
        "p",
        "",
        `Listed Markets (Demo): ${product.countries.join(", ")}`
    );

    availability.style.marginTop = "20px";

    /* ACTION BUTTONS */

    const actions = createElement(
        "div",
        "product-detail-actions"
    );

    const affiliateLink =
        createAffiliateLink(product);

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

    grid.append(
        imageWrapper,
        info
    );

    productDetail.appendChild(grid);

    /* UPDATE PAGE TITLE */

    document.title =
        `${product.name} | ETHORISE`;
}

/* ==========================================
   RELATED PRODUCTS
========================================== */

function renderRelatedProducts(allProducts, currentProduct) {
    relatedProducts.replaceChildren();

    const related = allProducts
        .filter(product =>
            product.id !== currentProduct.id &&
            product.category === currentProduct.category
        )
        .slice(0, 4);

    if (related.length === 0) {
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
            formatPrice(product.price)
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

        card.append(
            imageBox,
            info
        );

        relatedProducts.appendChild(card);
    });
}

/* ==========================================
   LOAD PRODUCTS
========================================== */

async function loadProductDetails() {
    try {
        if (!Number.isInteger(productId) || productId <= 0) {
            throw new Error("Invalid product ID");
        }

        const response = await fetch(
            "data/products.json"
        );

        if (!response.ok) {
            throw new Error(
                "Unable to load product database."
            );
        }

        const products = await response.json();

        if (!Array.isArray(products)) {
            throw new Error(
                "Invalid product database."
            );
        }

        const product = products.find(
            item => item.id === productId
        );

        if (!product) {
            productDetail.textContent =
                "Product not found.";

            return;
        }

        renderProduct(product);

        renderRelatedProducts(
            products,
            product
        );

    } catch (error) {
        console.error(error);

        productDetail.textContent =
            "Unable to load product details.";

    }
}

/* ==========================================
   MOBILE NAVIGATION
========================================== */

const menuToggle = document.getElementById(
    "productMenuToggle"
);

const navLinks = document.getElementById(
    "productNavLinks"
);

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
   INITIALIZE
========================================== */

loadProductDetails();