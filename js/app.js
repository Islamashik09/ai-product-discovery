"use strict";

/* ==========================================
   ETHORISE — MAIN APPLICATION

   Premium Product Discovery
   Cinematic Hero Slider
   Fashion Background Video
   Wishlist + Comparison + Shopping List
========================================== */

let products = [];

const MAX_COMPARE = 3;

const CART_KEY = "ethoriseCart";
const WISHLIST_KEY = "ethoriseWishlist";
const COMPARE_KEY = "ethoriseComparison";

const HERO_VIDEO = "assets/videos/ethorise-fashion.mp4";
const SLIDE_INTERVAL = 6500;

const $ = id => document.getElementById(id);

/* ==========================================
   LOCAL STORAGE
========================================== */

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

function refreshSavedCollections() {
    wishlist.clear();
    comparison.clear();

    readIds(WISHLIST_KEY).forEach(id => {
        wishlist.add(id);
    });

    readIds(COMPARE_KEY)
        .slice(0, MAX_COMPARE)
        .forEach(id => {
            comparison.add(id);
        });
}

/* ==========================================
   CINEMATIC HERO SLIDER
========================================== */

function setupHeroSlider() {
    const slider = $("heroSlider");

    if (!slider) return;

    const slides = [
        ...slider.querySelectorAll(".hero-slide")
    ];

    const dots = [
        ...slider.querySelectorAll(".hero-dot")
    ];

    const previousButton = $("heroPrev");
    const nextButton = $("heroNext");
    const pauseButton = $("heroPause");

    if (!slides.length) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let activeSlide = 0;
    let timer = null;
    let manuallyPaused = false;

    let touchStartX = 0;
    let touchStartY = 0;

    let fashionVideo = null;

    /* ======================================
       FASHION BACKGROUND VIDEO
    ====================================== */

    function setupFashionVideo() {
        if (reducedMotion.matches) return;

        const firstSlide = slides[0];

        const imageBox = firstSlide.querySelector(
            ".hero-slide-image"
        );

        if (!imageBox) return;

        const video = el(
            "video",
            "hero-background-video"
        );

        video.src = HERO_VIDEO;

        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        video.preload = "metadata";

        video.setAttribute("muted", "");
        video.setAttribute("playsinline", "");

        video.setAttribute(
            "aria-hidden",
            "true"
        );

        Object.assign(video.style, {
            position: "absolute",
            inset: "0",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: "0",
            transition: "opacity .8s ease"
        });

        video.addEventListener(
            "playing",
            () => {
                video.style.opacity = "1";
            }
        );

        video.addEventListener(
            "error",
            () => {
                video.style.display = "none";
            }
        );

        imageBox.appendChild(video);

        fashionVideo = video;
    }

    function updateVideo() {
        if (!fashionVideo) return;

        if (
            activeSlide === 0 &&
            !manuallyPaused &&
            !document.hidden
        ) {
            const playPromise = fashionVideo.play();

            if (
                playPromise &&
                typeof playPromise.catch === "function"
            ) {
                playPromise.catch(() => {});
            }
        } else {
            fashionVideo.pause();
        }
    }

    /* ======================================
       SLIDE CONTROLS
    ====================================== */

    function showSlide(index) {
        activeSlide = (
            index + slides.length
        ) % slides.length;

        slides.forEach((slide, slideIndex) => {
            const active = slideIndex === activeSlide;

            slide.classList.toggle(
                "active",
                active
            );

            slide.setAttribute(
                "aria-hidden",
                String(!active)
            );

            slide.querySelectorAll(
                "a, button"
            ).forEach(control => {
                control.tabIndex = active ? 0 : -1;
            });
        });

        dots.forEach((dot, dotIndex) => {
            const active = dotIndex === activeSlide;

            dot.classList.toggle(
                "active",
                active
            );

            if (active) {
                dot.setAttribute(
                    "aria-current",
                    "true"
                );
            } else {
                dot.removeAttribute(
                    "aria-current"
                );
            }
        });

        updateVideo();
    }

    function clearTimer() {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }
    }

    function startTimer() {
        clearTimer();

        if (
            manuallyPaused ||
            reducedMotion.matches ||
            document.hidden
        ) {
            return;
        }

        timer = setInterval(() => {
            showSlide(activeSlide + 1);
        }, SLIDE_INTERVAL);
    }

    function moveSlide(direction) {
        showSlide(activeSlide + direction);
        startTimer();
    }

    function updatePauseButton() {
        if (!pauseButton) return;

        pauseButton.textContent =
            manuallyPaused ? "▶" : "Ⅱ";

        pauseButton.setAttribute(
            "aria-label",
            manuallyPaused
                ? "Resume automatic slides"
                : "Pause automatic slides"
        );

        pauseButton.setAttribute(
            "aria-pressed",
            String(manuallyPaused)
        );
    }

    /* ======================================
       BUTTON EVENTS
    ====================================== */

    if (previousButton) {
        previousButton.onclick = () => {
            moveSlide(-1);
        };
    }

    if (nextButton) {
        nextButton.onclick = () => {
            moveSlide(1);
        };
    }

    if (pauseButton) {
        pauseButton.onclick = () => {
            manuallyPaused = !manuallyPaused;

            updatePauseButton();

            if (manuallyPaused) {
                clearTimer();
            } else {
                startTimer();
            }

            updateVideo();
        };
    }

    dots.forEach(dot => {
        dot.onclick = () => {
            const index = Number(
                dot.dataset.slideTo
            );

            if (Number.isInteger(index)) {
                showSlide(index);
                startTimer();
            }
        };
    });

    /* ======================================
       MOBILE TOUCH SWIPE
    ====================================== */

    slider.addEventListener(
        "touchstart",
        event => {
            if (!event.touches.length) return;

            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        },
        { passive: true }
    );

    slider.addEventListener(
        "touchend",
        event => {
            if (!event.changedTouches.length) return;

            const deltaX =
                event.changedTouches[0].clientX -
                touchStartX;

            const deltaY =
                event.changedTouches[0].clientY -
                touchStartY;

            if (
                Math.abs(deltaX) > 55 &&
                Math.abs(deltaX) > Math.abs(deltaY)
            ) {
                moveSlide(deltaX < 0 ? 1 : -1);
            }
        },
        { passive: true }
    );

    /* ======================================
       AUTO PLAY CONTROL
    ====================================== */

    slider.addEventListener(
        "mouseenter",
        clearTimer
    );

    slider.addEventListener(
        "mouseleave",
        startTimer
    );

    slider.addEventListener(
        "focusin",
        clearTimer
    );

    slider.addEventListener(
        "focusout",
        event => {
            if (
                !slider.contains(event.relatedTarget)
            ) {
                startTimer();
            }
        }
    );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (document.hidden) {
                clearTimer();
            } else {
                startTimer();
            }

            updateVideo();
        }
    );

    function onMotionChange() {
        if (reducedMotion.matches) {
            clearTimer();

            if (fashionVideo) {
                fashionVideo.pause();
                fashionVideo.style.opacity = "0";
            }
        } else {
            startTimer();
            updateVideo();
        }
    }

    if (typeof reducedMotion.addEventListener === "function") {
        reducedMotion.addEventListener(
            "change",
            onMotionChange
        );
    }

    setupFashionVideo();

    showSlide(0);

    updatePauseButton();

    startTimer();

    /* ======================================
       HERO CATEGORY BUTTONS
    ====================================== */

    slider.querySelectorAll(
        "[data-hero-category]"
    ).forEach(link => {
        link.addEventListener(
            "click",
            event => {
                event.preventDefault();

                selectCategory(
                    link.dataset.heroCategory
                );
            }
        );
    });
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
    const count = $("cartCount");

    if (count) {
        count.textContent = cartQuantity();
    }
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

    saveStorage(
        WISHLIST_KEY,
        [...wishlist]
    );

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

    saveStorage(
        COMPARE_KEY,
        [...comparison]
    );

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
    image.decoding = "async";

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
        product.category || ""
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

    const quick = el(
        "button",
        "",
        "Quick View"
    );

    quick.type = "button";

    quick.onclick = () => openQuickView(product);

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

    addButton.onclick = () => {
        addToCart(product.id);
    };

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

    compare.onclick = () => {
        toggleCompare(product.id);
    };

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
    if (!grid) return;

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
    if (
        !searchInput ||
        !categoryFilter ||
        !countryFilter ||
        !sortFilter
    ) {
        return;
    }

    const search =
        searchInput.value.trim().toLowerCase();

    const category = categoryFilter.value;
    const country = countryFilter.value;
    const sort = sortFilter.value;

    const filtered = products.filter(product => {
        const text = [
            product.name,
            product.brand || "",
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

            return (
                product.price == null ||
                !Number.isFinite(price) ||
                price <= 0
            )
                ? null
                : price;
        };

        filtered.sort((a, b) => {
            const pa = getPrice(a);
            const pb = getPrice(b);

            if (pa === null) {
                return pb === null ? 0 : 1;
            }

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
    if (!categoryFilter) return;

    searchInput.value = "";
    countryFilter.value = "All";
    sortFilter.value = "default";
    categoryFilter.value = category;

    filterProducts();

    const shop = $("shop");

    if (shop) {
        shop.scrollIntoView({
            behavior: "smooth"
        });
    }
}

/* ==========================================
   QUICK VIEW
========================================== */

function openQuickView(product) {
    if (!quickModal) return;

    const body = $("modalBody");

    if (!body) return;

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

    addButton.onclick = () => {
        addToCart(product.id);
    };

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

    const closeButton = $("closeModal");

    if (closeButton) {
        closeButton.focus();
    }
}

/* ==========================================
   MODALS
========================================== */

function closeModal(modal) {
    if (!modal) return;

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

    if (!container || !compareModal) return;

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
        [
            "Features",
            product => (product.features || []).join(", ")
        ]
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

    const closeButton = $("closeCompareModal");

    if (closeButton) {
        closeButton.focus();
    }
}

/* ==========================================
   EVENTS
========================================== */

function setupEvents() {
    if (searchInput) {
        searchInput.addEventListener(
            "input",
            filterProducts
        );
    }

    if (categoryFilter) {
        categoryFilter.addEventListener(
            "change",
            filterProducts
        );
    }

    if (countryFilter) {
        countryFilter.addEventListener(
            "change",
            filterProducts
        );
    }

    if (sortFilter) {
        sortFilter.addEventListener(
            "change",
            filterProducts
        );
    }

    const clearFilters = $("clearFilters");

    if (clearFilters) {
        clearFilters.onclick = () => {
            searchInput.value = "";
            categoryFilter.value = "All";
            countryFilter.value = "All";
            sortFilter.value = "default";

            filterProducts();
        };
    }

    const wishlistButton = $("wishlistBtn");

    if (wishlistButton) {
        wishlistButton.onclick = () => {
            window.location.href = "wishlist.html";
        };
    }

    const compareButton = $("compareNavBtn");

    if (compareButton) {
        compareButton.onclick = () => {
            window.location.href = "compare.html";
        };
    }

    const openCompare = $("openCompare");

    if (openCompare) {
        openCompare.onclick = openComparison;
    }

    const clearCompare = $("clearCompare");

    if (clearCompare) {
        clearCompare.onclick = () => {
            comparison.clear();

            saveStorage(COMPARE_KEY, []);

            updateCounters();
            filterProducts();
        };
    }

    const closeQuick = $("closeModal");

    if (closeQuick) {
        closeQuick.onclick = () => {
            closeModal(quickModal);
        };
    }

    const closeCompare = $("closeCompareModal");

    if (closeCompare) {
        closeCompare.onclick = () => {
            closeModal(compareModal);
        };
    }

    [quickModal, compareModal].forEach(modal => {
        if (!modal) return;

        modal.addEventListener(
            "click",
            event => {
                if (event.target === modal) {
                    closeModal(modal);
                }
            }
        );
    });

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                closeModal(quickModal);
                closeModal(compareModal);
            }
        }
    );

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
        ".collection-card, .fashion-editorial-content [data-collection], .technology-editorial-content [data-collection]"
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

    if (menu && toggle) {
        toggle.onclick = () => {
            const active = menu.classList.toggle(
                "active"
            );

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

    window.addEventListener(
        "pageshow",
        () => {
            refreshSavedCollections();
            updateCounters();

            if (products.length) {
                filterProducts();
            }
        }
    );

    window.addEventListener(
        "storage",
        event => {
            if (
                event.key === WISHLIST_KEY ||
                event.key === COMPARE_KEY ||
                event.key === CART_KEY
            ) {
                refreshSavedCollections();
                updateCounters();

                if (products.length) {
                    filterProducts();
                }
            }
        }
    );
}

/* ==========================================
   INITIALIZE
========================================== */

async function init() {
    createCartNavigation();

    setupEvents();

    setupHeroSlider();

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
            if (!validIds.has(id)) {
                wishlist.delete(id);
            }
        }

        for (const id of comparison) {
            if (!validIds.has(id)) {
                comparison.delete(id);
            }
        }

        saveStorage(
            WISHLIST_KEY,
            [...wishlist]
        );

        saveStorage(
            COMPARE_KEY,
            [...comparison]
        );

        updateCounters();

        filterProducts();

    } catch (error) {
        console.error(error);

        if (grid) {
            grid.textContent =
                "Unable to load products.";
        }
    }
}

init();