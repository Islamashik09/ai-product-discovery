"use strict";

/* ==========================================
   ETHORISE — PRODUCT DETAILS

   Features:
   - Dynamic SEO + Structured Data
   - Interactive Image Gallery
   - Product Video Player
   - AI Image Labels
   - Fullscreen Image Viewer
   - Shopping List
   - Wishlist
   - Smart Recommendations
   - Recently Viewed
   - Mobile Navigation
========================================== */

const $ = id => document.getElementById(id);

const detailContainer = $("productDetail");

const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id"));

const SITE_URL = "https://islamashik09.github.io/ethorise/";

const CART_KEY = "ethoriseCart";
const WISHLIST_KEY = "ethoriseWishlist";
const RECENT_KEY = "ethoriseRecentlyViewed";

const AI_LABEL = "AI-generated illustration";

const MAX_RECOMMENDATIONS = 4;

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

/* ==========================================
   AI IMAGE HELPERS
========================================== */

function isAIImage(product, imagePath) {
    if (
        !product ||
        !product.mediaLabels ||
        typeof product.mediaLabels !== "object" ||
        Array.isArray(product.mediaLabels)
    ) {
        return false;
    }

    return (
        product.mediaLabels[imagePath] === AI_LABEL
    );
}

function createAIBadge() {
    const badge = el(
        "span",
        "ethorise-ai-badge",
        "AI ILLUSTRATION"
    );

    badge.title =
        "AI-generated illustration — actual product may differ.";

    return badge;
}

function createAIDisclosure() {
    return el(
        "p",
        "ethorise-ai-disclosure",
        "AI-generated illustration — actual product may differ."
    );
}

/* ==========================================
   PRODUCT SEO
========================================== */

function absoluteUrl(value) {
    if (!value || typeof value !== "string") {
        return "";
    }

    try {
        const url = new URL(value, SITE_URL);

        if (
            url.protocol !== "https:" &&
            url.protocol !== "http:"
        ) {
            return "";
        }

        return url.href;
    } catch {
        return "";
    }
}

function setMeta(selector, content) {
    const meta = document.querySelector(selector);

    if (meta) {
        meta.setAttribute("content", content);
    }
}

function setRobots(content) {
    setMeta('meta[name="robots"]', content);
}

function seoDescription(product) {
    const source = [
        product.description,
        product.name,
        product.category
    ].find(value =>
        typeof value === "string" &&
        value.trim()
    ) || "";

    const normalized = source
        .replace(/\s+/g, " ")
        .trim();

    if (normalized.length <= 155) {
        return normalized;
    }

    return normalized.slice(0, 152).trimEnd() + "...";
}

function productPageUrl(product) {
    return (
        SITE_URL +
        "product.html?id=" +
        encodeURIComponent(product.id)
    );
}

function buildProductSchema(product, pageUrl) {
    const images = getProductImages(product)
        .filter(src => !isAIImage(product, src))
        .map(absoluteUrl)
        .filter(Boolean);

    const schema = {
        "@type": "Product",
        "@id": pageUrl + "#product",
        "name": product.name,
        "url": pageUrl
    };

    if (product.description) {
        schema.description = product.description;
    }

    /*
      Only non-AI product image references are included
      in Product structured data.

      Illustrations should not be represented as
      verified product photographs.
    */

    if (images.length) {
        schema.image = images;
    }

    if (product.brand) {
        schema.brand = {
            "@type": "Brand",
            "name": product.brand
        };
    }

    if (product.category) {
        schema.category = product.category;
    }

    if (
        product.affiliatePlatform === "Amazon" &&
        product.asin
    ) {
        schema.sku = product.asin;
    }

    /*
      No invented pricing, ratings or availability.
    */

    return schema;
}

function buildBreadcrumbSchema(product, pageUrl) {
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": SITE_URL
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": product.category || "Products",
                "item": SITE_URL + "#shop"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product.name,
                "item": pageUrl
            }
        ]
    };
}

function updateProductSEO(product) {
    const title = `${product.name} | ETHORISE`;

    const description = seoDescription(product);

    const pageUrl = productPageUrl(product);

    const primaryImage = getProductImages(product)
        .find(src => !isAIImage(product, src));

    const imageUrl = primaryImage
        ? absoluteUrl(primaryImage)
        : "";

    document.title = title;

    setMeta(
        'meta[name="description"]',
        description
    );

    setMeta(
        'meta[property="og:title"]',
        title
    );

    setMeta(
        'meta[property="og:description"]',
        description
    );

    setMeta(
        'meta[property="og:url"]',
        pageUrl
    );

    setMeta(
        'meta[property="og:image"]',
        imageUrl
    );

    setMeta(
        'meta[name="twitter:title"]',
        title
    );

    setMeta(
        'meta[name="twitter:description"]',
        description
    );

    setMeta(
        'meta[name="twitter:image"]',
        imageUrl
    );

    const canonical = $("productCanonical");

    if (canonical) {
        canonical.href = pageUrl;
    }

    const structuredData = $("productStructuredData");

    if (structuredData) {
        structuredData.textContent = JSON.stringify(
            {
                "@context": "https://schema.org",
                "@graph": [
                    buildProductSchema(
                        product,
                        pageUrl
                    ),
                    buildBreadcrumbSchema(
                        product,
                        pageUrl
                    )
                ]
            }
        );
    }

    setRobots("index, follow");
}

function markProductUnavailable(message) {
    document.title = "Product Not Found | ETHORISE";

    setMeta(
        'meta[name="description"]',
        "The requested product is unavailable on ETHORISE."
    );

    setRobots("noindex, follow");

    const schema = $("productStructuredData");

    if (schema) {
        schema.textContent = "";
    }

    if (detailContainer) {
        detailContainer.textContent = message;
    }
}

/* ==========================================
   MEDIA HELPERS
========================================== */

function getProductImages(product) {
    const images = [];

    if (
        typeof product.image === "string" &&
        product.image.trim()
    ) {
        images.push(product.image.trim());
    }

    if (Array.isArray(product.images)) {
        product.images.forEach(image => {
            if (
                typeof image === "string" &&
                image.trim()
            ) {
                images.push(image.trim());
            }
        });
    }

    return [...new Set(images)];
}

function getProductVideo(product) {
    return typeof product.video === "string"
        ? product.video.trim()
        : "";
}

function isDirectVideo(url) {
    try {
        const pathname = new URL(
            url,
            window.location.href
        ).pathname.toLowerCase();

        return /\.(mp4|webm|ogg)$/.test(pathname);
    } catch {
        return false;
    }
}

function getEmbedUrl(url) {
    try {
        const parsed = new URL(url);

        const hostname = parsed.hostname.toLowerCase();

        if (
            hostname === "youtube.com" ||
            hostname === "www.youtube.com"
        ) {
            const videoId = parsed.searchParams.get("v");

            if (
                videoId &&
                /^[a-zA-Z0-9_-]{11}$/.test(videoId)
            ) {
                return (
                    "https://www.youtube-nocookie.com/embed/" +
                    videoId
                );
            }

            const match = parsed.pathname.match(
                /^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/
            );

            if (match) {
                return (
                    "https://www.youtube-nocookie.com/embed/" +
                    match[1]
                );
            }
        }

        if (hostname === "youtu.be") {
            const videoId = parsed.pathname
                .split("/")
                .filter(Boolean)[0];

            if (
                videoId &&
                /^[a-zA-Z0-9_-]{11}$/.test(videoId)
            ) {
                return (
                    "https://www.youtube-nocookie.com/embed/" +
                    videoId
                );
            }
        }

        if (
            hostname === "youtube-nocookie.com" ||
            hostname === "www.youtube-nocookie.com" ||
            hostname === "player.vimeo.com"
        ) {
            return parsed.toString();
        }

        if (
            hostname === "vimeo.com" ||
            hostname === "www.vimeo.com"
        ) {
            const videoId = parsed.pathname
                .split("/")
                .filter(Boolean)[0];

            if (/^\d+$/.test(videoId || "")) {
                return (
                    "https://player.vimeo.com/video/" +
                    videoId
                );
            }
        }

        return "";
    } catch {
        return "";
    }
}

/* ==========================================
   SHOPPING LIST
========================================== */

function readCart() {
    return readStorage(CART_KEY).filter(item =>
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

    const alreadySaved = wishlist.has(id);

    wishlist.add(id);

    saveStorage(
        WISHLIST_KEY,
        [...wishlist]
    );

    alert(
        alreadySaved
            ? "Product is already in your wishlist."
            : "Product added to wishlist!"
    );
}

/* ==========================================
   INTERACTIVE PRODUCT MEDIA GALLERY
========================================== */

function createProductGallery(product) {
    const images = getProductImages(product);
    const video = getProductVideo(product);

    const mediaItems = images.map(src => ({
        type: "image",
        src,
        isAI: isAIImage(product, src)
    }));

    if (video) {
        mediaItems.push({
            type: "video",
            src: video,
            isAI: false
        });
    }

    const gallery = el(
        "div",
        "ethorise-media-gallery"
    );

    const stage = el(
        "div",
        "ethorise-gallery-stage"
    );

    const stageContent = el(
        "div",
        "ethorise-gallery-content"
    );

    const thumbnails = el(
        "div",
        "ethorise-gallery-thumbnails"
    );

    thumbnails.setAttribute(
        "aria-label",
        "Product media thumbnails"
    );

    const disclosure = createAIDisclosure();
    disclosure.hidden = true;

    const position = el(
        "span",
        "ethorise-gallery-position"
    );

    const previous = el(
        "button",
        "ethorise-gallery-arrow ethorise-gallery-prev",
        "‹"
    );

    const next = el(
        "button",
        "ethorise-gallery-arrow ethorise-gallery-next",
        "›"
    );

    previous.type = "button";
    next.type = "button";

    previous.setAttribute(
        "aria-label",
        "Previous product media"
    );

    next.setAttribute(
        "aria-label",
        "Next product media"
    );

    let activeIndex = 0;

    function showMedia(index) {
        if (!mediaItems.length) return;

        activeIndex = (
            index + mediaItems.length
        ) % mediaItems.length;

        const item = mediaItems[activeIndex];

        stageContent.replaceChildren();

        disclosure.hidden = !item.isAI;

        if (item.type === "image") {
            const image = el("img");

            image.src = item.src;

            image.alt = item.isAI
                ? `${product.name} — AI-generated illustrative image`
                : `${product.name} — Image ${activeIndex + 1}`;

            image.className =
                "ethorise-gallery-main-image";

            image.decoding = "async";

            image.onerror = () => {
                image.alt = "Product image unavailable";
            };

            image.title = "Click to enlarge image";

            image.onclick = () => {
                openImageViewer(
                    item.src,
                    product.name,
                    item.isAI
                );
            };

            stageContent.appendChild(image);

            if (item.isAI) {
                stageContent.appendChild(
                    createAIBadge()
                );
            }

        } else {
            const source = item.src;

            if (isDirectVideo(source)) {
                const player = el("video");

                player.src = source;
                player.controls = true;
                player.preload = "metadata";
                player.playsInline = true;

                player.setAttribute(
                    "aria-label",
                    `${product.name} product video`
                );

                stageContent.appendChild(player);
            } else {
                const embedUrl = getEmbedUrl(source);

                if (embedUrl) {
                    const iframe = el("iframe");

                    iframe.src = embedUrl;
                    iframe.title =
                        `${product.name} product video`;

                    iframe.loading = "lazy";

                    iframe.allow =
                        "accelerometer; autoplay; " +
                        "clipboard-write; encrypted-media; " +
                        "gyroscope; picture-in-picture";

                    iframe.allowFullscreen = true;

                    iframe.referrerPolicy =
                        "strict-origin-when-cross-origin";

                    stageContent.appendChild(iframe);
                } else {
                    stageContent.appendChild(
                        el(
                            "div",
                            "ethorise-video-unavailable",
                            "Video preview is unavailable."
                        )
                    );
                }
            }
        }

        position.textContent =
            `${activeIndex + 1} / ${mediaItems.length}`;

        [...thumbnails.children].forEach(
            (button, buttonIndex) => {
                const selected =
                    buttonIndex === activeIndex;

                button.classList.toggle(
                    "active",
                    selected
                );

                button.setAttribute(
                    "aria-pressed",
                    String(selected)
                );
            }
        );

        previous.hidden = mediaItems.length < 2;
        next.hidden = mediaItems.length < 2;
    }

    previous.onclick = () => {
        showMedia(activeIndex - 1);
    };

    next.onclick = () => {
        showMedia(activeIndex + 1);
    };

    mediaItems.forEach((item, index) => {
        const button = el(
            "button",
            "ethorise-gallery-thumbnail"
        );

        button.type = "button";

        button.setAttribute(
            "aria-label",
            item.type === "video"
                ? "View product video"
                : (
                    item.isAI
                        ? `View AI illustration ${index + 1}`
                        : `View product image ${index + 1}`
                )
        );

        if (item.type === "image") {
            const image = el("img");

            image.src = item.src;
            image.alt = "";
            image.loading = "lazy";

            button.appendChild(image);

            if (item.isAI) {
                button.appendChild(
                    el(
                        "span",
                        "ethorise-thumbnail-ai",
                        "AI"
                    )
                );
            }

        } else {
            button.append(
                el(
                    "span",
                    "ethorise-video-icon",
                    "▶"
                ),
                el(
                    "small",
                    "",
                    "VIDEO"
                )
            );
        }

        button.onclick = () => {
            showMedia(index);
        };

        thumbnails.appendChild(button);
    });

    stage.append(
        stageContent,
        previous,
        next,
        position
    );

    gallery.append(
        stage,
        disclosure,
        thumbnails
    );

    if (mediaItems.length) {
        showMedia(0);
    } else {
        stageContent.textContent =
            "Product media unavailable.";

        previous.hidden = true;
        next.hidden = true;
        position.hidden = true;
    }

    return gallery;
}

/* ==========================================
   FULLSCREEN IMAGE VIEWER
========================================== */

function openImageViewer(src, name, isAI = false) {
    const existing = $("ethoriseImageViewer");

    if (existing) {
        existing.remove();
    }

    const viewer = el(
        "div",
        "ethorise-image-viewer"
    );

    viewer.id = "ethoriseImageViewer";

    viewer.setAttribute("role", "dialog");
    viewer.setAttribute("aria-modal", "true");

    viewer.setAttribute(
        "aria-label",
        "Enlarged product image"
    );

    const image = el("img");

    image.src = src;

    image.alt = isAI
        ? `${name} — AI-generated illustration`
        : name;

    const close = el(
        "button",
        "ethorise-viewer-close",
        "×"
    );

    close.type = "button";

    close.setAttribute(
        "aria-label",
        "Close image viewer"
    );

    const previouslyFocused = document.activeElement;

    function handleKeydown(event) {
        if (event.key === "Escape") {
            closeViewer();
        }

        if (event.key === "Tab") {
            event.preventDefault();
            close.focus();
        }
    }

    function closeViewer() {
        viewer.remove();

        document.removeEventListener(
            "keydown",
            handleKeydown
        );

        if (
            previouslyFocused &&
            typeof previouslyFocused.focus === "function"
        ) {
            previouslyFocused.focus();
        }
    }

    close.onclick = closeViewer;

    viewer.onclick = event => {
        if (event.target === viewer) {
            closeViewer();
        }
    };

    viewer.appendChild(image);

    if (isAI) {
        const disclosure = createAIDisclosure();

        disclosure.classList.add(
            "ethorise-viewer-disclosure"
        );

        viewer.appendChild(disclosure);
    }

    viewer.appendChild(close);

    document.body.appendChild(viewer);

    close.focus();

    document.addEventListener(
        "keydown",
        handleKeydown
    );
}

/* ==========================================
   GALLERY + AI STYLES
========================================== */

function injectGalleryStyles() {
    if ($("ethoriseGalleryStyles")) return;

    const style = el("style");

    style.id = "ethoriseGalleryStyles";

    style.textContent = `
        .ethorise-media-gallery {
            width: 100%;
            min-width: 0;
        }

        .ethorise-gallery-stage {
            position: relative;
            width: 100%;
            min-height: 300px;
            aspect-ratio: 1 / 1;
            background: #f5f6f8;
            border: 1px solid #e8e8e8;
            border-radius: 18px;
            overflow: hidden;
        }

        .ethorise-gallery-content {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .ethorise-gallery-content img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
            cursor: zoom-in;
        }

        .ethorise-gallery-content video,
        .ethorise-gallery-content iframe {
            display: block;
            width: 100%;
            height: 100%;
            border: 0;
            background: #000;
        }

        .ethorise-gallery-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border: 0;
            border-radius: 50%;
            background: rgba(255,255,255,.94);
            color: #111;
            font-size: 30px;
            line-height: 1;
            cursor: pointer;
            z-index: 2;
            box-shadow: 0 4px 14px rgba(0,0,0,.12);
        }

        .ethorise-gallery-arrow:hover {
            background: #ff6b35;
            color: #fff;
        }

        .ethorise-gallery-arrow[hidden] {
            display: none;
        }

        .ethorise-gallery-prev {
            left: 12px;
        }

        .ethorise-gallery-next {
            right: 12px;
        }

        .ethorise-gallery-position {
            position: absolute;
            right: 14px;
            bottom: 14px;
            padding: 6px 11px;
            background: rgba(0,0,0,.65);
            color: #fff;
            border-radius: 20px;
            font-size: 12px;
            z-index: 2;
        }

        .ethorise-gallery-thumbnails {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 14px;
        }

        .ethorise-gallery-thumbnail {
            position: relative;
            width: 76px;
            height: 76px;
            flex: 0 0 76px;
            padding: 4px;
            background: #f5f6f8;
            border: 2px solid transparent;
            border-radius: 12px;
            cursor: pointer;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 3px;
            color: #111;
        }

        .ethorise-gallery-thumbnail.active {
            border-color: #ff6b35;
        }

        .ethorise-gallery-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .ethorise-thumbnail-ai {
            position: absolute;
            bottom: 3px;
            left: 3px;
            padding: 2px 5px;
            border-radius: 4px;
            background: #111;
            color: #fff;
            font-size: 10px;
            font-weight: 800;
        }

        .ethorise-video-icon {
            font-size: 23px;
            color: #b93f12;
        }

        .ethorise-gallery-thumbnail small {
            font-size: 10px;
            font-weight: 700;
        }

        .ethorise-video-unavailable {
            padding: 20px;
            color: #333;
            text-align: center;
        }

        .ethorise-ai-badge {
            position: absolute;
            left: 12px;
            bottom: 12px;
            z-index: 5;
            padding: 7px 10px;
            background: rgba(17,17,17,.94);
            color: #fff;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .5px;
            line-height: 1.4;
            pointer-events: none;
        }

        .ethorise-ai-disclosure {
            margin: 12px 0;
            padding: 11px 13px;
            border-radius: 8px;
            border-left: 3px solid #b93f12;
            background: #fff7f2;
            color: #713b25;
            font-size: 12px;
            line-height: 1.7;
        }

        .ethorise-image-viewer {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: rgba(0,0,0,.94);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 20px 70px;
        }

        .ethorise-image-viewer img {
            max-width: 95%;
            max-height: 85%;
            object-fit: contain;
        }

        .ethorise-viewer-close {
            position: absolute;
            top: 15px;
            right: 20px;
            width: 45px;
            height: 45px;
            border: 0;
            border-radius: 50%;
            background: #fff;
            color: #111;
            font-size: 32px;
            cursor: pointer;
        }

        .ethorise-viewer-disclosure {
            position: absolute;
            left: 20px;
            right: 20px;
            bottom: 15px;
            max-width: 550px;
            margin: 0 auto;
            text-align: center;
        }

        @media (max-width: 768px) {
            .ethorise-gallery-stage {
                min-height: 260px;
                border-radius: 14px;
            }

            .ethorise-gallery-arrow {
                width: 35px;
                height: 35px;
                font-size: 25px;
            }

            .ethorise-gallery-thumbnail {
                width: 64px;
                height: 64px;
                flex-basis: 64px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .ethorise-media-gallery *,
            .ethorise-image-viewer * {
                animation: none !important;
                transition: none !important;
            }
        }
    `;

    document.head.appendChild(style);
}

/* ==========================================
   PRODUCT DETAILS
========================================== */

function renderProduct(product) {
    detailContainer.replaceChildren();

    injectGalleryStyles();

    const grid = el(
        "div",
        "product-detail-grid"
    );

    const galleryBox = el(
        "div",
        "product-detail-image"
    );

    galleryBox.appendChild(
        createProductGallery(product)
    );

    const info = el(
        "div",
        "product-detail-info"
    );

    const category = el(
        "span",
        "eyebrow",
        product.category || ""
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

    const features = Array.isArray(product.features)
        ? product.features
        : [];

    if (features.length) {
        featuresBox.appendChild(
            el("h3", "", "Product Features")
        );

        const list = el("ul");

        features.forEach(feature => {
            list.appendChild(
                el("li", "", feature)
            );
        });

        featuresBox.appendChild(list);
    }

    const actions = el(
        "div",
        "product-detail-actions"
    );

    const addButton = el(
        "button",
        "btn btn-primary",
        "🛒 Add to Cart"
    );

    addButton.type = "button";

    addButton.onclick = () => {
        addToCart(product.id);
    };

    const wishlistButton = el(
        "button",
        "btn btn-outline",
        "♡ Save to Wishlist"
    );

    wishlistButton.type = "button";

    wishlistButton.onclick = () => {
        addWishlist(product.id);
    };

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
        galleryBox,
        info
    );

    detailContainer.appendChild(grid);
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

    const mainIsAI = isAIImage(
        product,
        product.image
    );

    image.alt = mainIsAI
        ? `${product.name} — AI illustration`
        : product.name;

    image.loading = "lazy";

    imageBox.appendChild(image);

    if (mainIsAI) {
        imageBox.appendChild(createAIBadge());
    }

    const info = el(
        "div",
        "product-info"
    );

    info.append(
        el(
            "p",
            "product-category",
            product.category || ""
        ),
        el(
            "h3",
            "",
            product.name
        )
    );

    if (mainIsAI) {
        info.appendChild(createAIDisclosure());
    }

    info.appendChild(
        el(
            "p",
            "product-price",
            priceLabel(product)
        )
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
        .slice(0, MAX_RECOMMENDATIONS)
        .map(item => item.product);

    const used = new Set(
        setup.map(product => product.id)
    );

    const related = candidates
        .filter(item =>
            !used.has(item.product.id)
        )
        .slice(0, MAX_RECOMMENDATIONS)
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
        .slice(0, MAX_RECOMMENDATIONS);

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
        const active = menu.classList.toggle("active");

        toggle.setAttribute(
            "aria-expanded",
            String(active)
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

    if (!detailContainer) {
        console.error(
            "Missing #productDetail container."
        );

        return;
    }

    try {
        if (
            !Number.isInteger(productId) ||
            productId <= 0
        ) {
            markProductUnavailable(
                "Invalid product ID."
            );

            return;
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
            markProductUnavailable(
                "Product not found."
            );

            return;
        }

        updateProductSEO(product);

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

        markProductUnavailable(
            "Unable to load product details."
        );
    }
}

init();