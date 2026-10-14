"""
ETHORISE ADMIN DASHBOARD
Professional Local Product Manager

Features:
- Product Dashboard
- Add / Edit / Delete Products
- Image and Video Upload
- Media Library
- Bulk CSV Import
- Import Preview
- Duplicate Detection
- Safe Merge
- Automatic Backups
- JSON Website Export

Run:
python -m streamlit run automation/admin_dashboard.py --server.address 127.0.0.1
"""

import io
import shutil
import subprocess
import sys
import uuid

from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import streamlit as st


# ======================================
# CONFIGURATION
# ======================================

BASE = Path(__file__).resolve().parent.parent

DATA = BASE / "data"
CSV = DATA / "products.csv"
JSON = DATA / "products.json"

BACKUPS = DATA / "backups"

IMAGES = BASE / "assets" / "images"
VIDEOS = BASE / "assets" / "videos"

MANAGER = BASE / "automation" / "product_manager.py"

for folder in [DATA, BACKUPS, IMAGES, VIDEOS]:
    folder.mkdir(parents=True, exist_ok=True)


CATEGORIES = [
    "Electronics",
    "Home",
    "Fashion",
    "Beauty",
    "Fitness",
    "Accessories",
    "Office",
    "Lifestyle"
]

PLATFORMS = ["Amazon", "AliExpress"]

COUNTRIES = ["USA", "UK", "Canada"]

STATUSES = ["active", "inactive"]

COLUMNS = [
    "id",
    "name",
    "brand",
    "category",
    "subcategory",
    "description",
    "features",
    "image",
    "images",
    "video",
    "countries",
    "affiliatePlatform",
    "affiliateLink",
    "productUrl",
    "asin",
    "tags",
    "relatedProductIds",
    "status"
]

IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_TYPES = {".mp4", ".webm"}

MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_VIDEO_SIZE = 30 * 1024 * 1024

MAX_IMPORT_ROWS = 5000
MAX_IMPORT_SIZE = 10 * 1024 * 1024


# ======================================
# STREAMLIT CONFIG
# ======================================

st.set_page_config(
    page_title="ETHORISE Admin",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ======================================
# DATABASE HELPERS
# ======================================

def load_data():

    if not CSV.exists():
        return pd.DataFrame(columns=COLUMNS)

    df = pd.read_csv(
        CSV,
        dtype=str,
        keep_default_na=False,
        encoding="utf-8-sig"
    )

    for column in COLUMNS:
        if column not in df.columns:
            df[column] = ""

    return df[COLUMNS].fillna("")


def create_backup():

    if not CSV.exists():
        return

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S_%f"
    )

    destination = BACKUPS / f"products_{timestamp}.csv"

    shutil.copy2(CSV, destination)


def save_data(df):

    create_backup()

    temporary = CSV.with_suffix(".csv.tmp")

    try:

        df[COLUMNS].to_csv(
            temporary,
            index=False,
            encoding="utf-8"
        )

        temporary.replace(CSV)

    finally:

        if temporary.exists():
            temporary.unlink()


def next_id(df):

    if df.empty:
        return 1

    numbers = pd.to_numeric(
        df["id"],
        errors="coerce"
    ).dropna()

    if numbers.empty:
        return 1

    return int(numbers.max()) + 1


def split_values(text):

    return [
        value.strip()
        for value in str(text).split("|")
        if value.strip()
    ]


def valid_https(url):

    try:

        parsed = urlparse(str(url).strip())

        return (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and not parsed.username
            and not parsed.password
        )

    except ValueError:
        return False


def valid_media_path(value, kind="image"):

    value = str(value).strip()

    if not value:
        return False

    if valid_https(value):
        return True

    prefix = (
        "assets/images/"
        if kind == "image"
        else "assets/videos/"
    )

    if not value.startswith(prefix):
        return False

    resolved = (BASE / value).resolve()

    folder = (
        IMAGES if kind == "image"
        else VIDEOS
    ).resolve()

    allowed = (
        IMAGE_TYPES if kind == "image"
        else VIDEO_TYPES
    )

    return (
        resolved.is_relative_to(folder)
        and resolved.is_file()
        and resolved.suffix.lower() in allowed
    )


# ======================================
# MEDIA UPLOAD
# ======================================

def save_uploaded_file(upload, folder, allowed, max_size):

    if upload is None:
        return ""

    extension = Path(upload.name).suffix.lower()

    if extension not in allowed:
        raise ValueError("Unsupported file extension.")

    content = upload.getvalue()

    if len(content) > max_size:
        raise ValueError(
            f"File exceeds {max_size // (1024 * 1024)} MB limit."
        )

    if not content:
        raise ValueError("Uploaded file is empty.")

    if folder == IMAGES:

        if extension in {".jpg", ".jpeg"}:
            if not content.startswith(b"\xff\xd8\xff"):
                raise ValueError("Invalid JPEG file.")

        elif extension == ".png":
            if not content.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("Invalid PNG file.")

        elif extension == ".webp":
            if not (
                content.startswith(b"RIFF")
                and content[8:12] == b"WEBP"
            ):
                raise ValueError("Invalid WebP file.")

    filename = uuid.uuid4().hex + extension

    destination = folder / filename

    destination.write_bytes(content)

    return destination.relative_to(BASE).as_posix()


def preview_image(source):

    if not source:
        return

    try:

        if source.startswith("assets/"):

            path = (BASE / source).resolve()

            if not path.is_relative_to(IMAGES.resolve()):
                return

            if path.exists():
                st.image(str(path), width=300)

        elif valid_https(source):
            st.image(source, width=300)

    except Exception:
        st.info("Image preview unavailable.")


def preview_video(source):

    if not source:
        return

    try:

        if source.startswith("assets/"):

            path = (BASE / source).resolve()

            if not path.is_relative_to(VIDEOS.resolve()):
                return

            if path.exists():
                st.video(str(path))

        elif valid_https(source):
            st.video(source)

    except Exception:
        st.info("Video preview unavailable.")


# ======================================
# PRODUCT EDITOR
# ======================================

def product_editor(defaults=None, prefix="add"):

    defaults = defaults or {}

    def value(key, fallback=""):
        return str(defaults.get(key, fallback) or "")

    st.subheader("📦 Basic Information")

    col1, col2 = st.columns(2)

    with col1:

        name = st.text_input(
            "Product Name *",
            value=value("name"),
            key=f"{prefix}_name"
        )

        brand = st.text_input(
            "Brand",
            value=value("brand"),
            key=f"{prefix}_brand"
        )

        selected_category = value(
            "category",
            "Electronics"
        )

        category = st.selectbox(
            "Category",
            CATEGORIES,
            index=(
                CATEGORIES.index(selected_category)
                if selected_category in CATEGORIES
                else 0
            ),
            key=f"{prefix}_category"
        )

    with col2:

        subcategory = st.text_input(
            "Subcategory",
            value=value("subcategory"),
            key=f"{prefix}_subcategory"
        )

        selected_platform = value(
            "affiliatePlatform",
            "Amazon"
        )

        platform = st.selectbox(
            "Affiliate Platform",
            PLATFORMS,
            index=(
                PLATFORMS.index(selected_platform)
                if selected_platform in PLATFORMS
                else 0
            ),
            key=f"{prefix}_platform"
        )

        selected_status = value(
            "status",
            "active"
        )

        status = st.selectbox(
            "Product Status",
            STATUSES,
            index=(
                STATUSES.index(selected_status)
                if selected_status in STATUSES
                else 0
            ),
            key=f"{prefix}_status"
        )

    description = st.text_area(
        "Product Description",
        value=value("description"),
        height=120,
        key=f"{prefix}_description"
    )

    features = st.text_area(
        "Product Features — separate with |",
        value=value("features"),
        key=f"{prefix}_features"
    )

    tags = st.text_input(
        "Product Tags — separate with |",
        value=value("tags"),
        key=f"{prefix}_tags"
    )

    related = st.text_input(
        "Related Product IDs — separate with |",
        value=value("relatedProductIds"),
        key=f"{prefix}_related"
    )

    st.divider()

    # ======================================
    # IMAGE MANAGEMENT
    # ======================================

    st.subheader("🖼️ Product Images")

    image_method = st.radio(
        "Main Product Image",
        ["Image URL", "Upload from PC"],
        horizontal=True,
        key=f"{prefix}_image_method"
    )

    main_image = value("image")
    main_upload = None

    if image_method == "Upload from PC":

        main_upload = st.file_uploader(
            "Choose Main Product Image",
            type=["jpg", "jpeg", "png", "webp"],
            key=f"{prefix}_main_upload"
        )

        if main_upload is not None:
            st.image(
                main_upload,
                caption="New Main Image Preview",
                width=300
            )

        elif main_image:
            st.caption("Current image:")
            preview_image(main_image)

    else:

        main_image = st.text_input(
            "Main Image URL",
            value=main_image,
            key=f"{prefix}_image_url"
        )

        if main_image:
            preview_image(main_image)

    st.markdown("#### Additional Product Images")

    gallery_method = st.radio(
        "Gallery Source",
        ["Image URLs", "Upload Multiple Images"],
        horizontal=True,
        key=f"{prefix}_gallery_method"
    )

    gallery = value("images")
    gallery_uploads = []

    if gallery_method == "Upload Multiple Images":

        gallery_uploads = st.file_uploader(
            "Choose Multiple Product Images",
            type=["jpg", "jpeg", "png", "webp"],
            accept_multiple_files=True,
            key=f"{prefix}_gallery_upload"
        )

        if gallery_uploads:

            st.caption(
                f"{len(gallery_uploads)} image(s) selected"
            )

            columns = st.columns(3)

            for index, image in enumerate(gallery_uploads):

                with columns[index % 3]:
                    st.image(
                        image,
                        use_container_width=True
                    )

        if gallery:
            st.caption("Existing gallery images:")
            st.text(gallery)

    else:

        gallery = st.text_area(
            "Additional Image URLs — separate with |",
            value=gallery,
            key=f"{prefix}_gallery_urls"
        )

    st.divider()

    # ======================================
    # VIDEO MANAGEMENT
    # ======================================

    st.subheader("🎬 Product Video")

    video_method = st.radio(
        "Product Video Source",
        ["Video URL", "Upload from PC"],
        horizontal=True,
        key=f"{prefix}_video_method"
    )

    video = value("video")
    video_upload = None

    if video_method == "Upload from PC":

        video_upload = st.file_uploader(
            "Choose Product Video",
            type=["mp4", "webm"],
            key=f"{prefix}_video_upload"
        )

        if video_upload is not None:

            st.video(video_upload)

        elif video:

            preview_video(video)

    else:

        video = st.text_input(
            "Product Video URL",
            value=video,
            key=f"{prefix}_video_url"
        )

        if video:
            preview_video(video)

    st.divider()

    # ======================================
    # AFFILIATE INFORMATION
    # ======================================

    st.subheader("🔗 Affiliate Information")

    affiliate_link = st.text_input(
        "Affiliate Tracking Link *",
        value=value("affiliateLink"),
        key=f"{prefix}_affiliate"
    )

    product_url = st.text_input(
        "Original Product URL *",
        value=value("productUrl"),
        key=f"{prefix}_url"
    )

    asin = st.text_input(
        "Amazon ASIN",
        value=value("asin"),
        key=f"{prefix}_asin"
    )

    selected_countries = [
        country
        for country in split_values(value("countries"))
        if country in COUNTRIES
    ]

    countries = st.multiselect(
        "Target Countries",
        COUNTRIES,
        default=selected_countries,
        key=f"{prefix}_countries"
    )

    product = {
        "name": name.strip(),
        "brand": brand.strip(),
        "category": category,
        "subcategory": subcategory.strip(),
        "description": description.strip(),
        "features": features.strip(),
        "image": main_image.strip(),
        "images": gallery.strip(),
        "video": video.strip(),
        "countries": "|".join(countries),
        "affiliatePlatform": platform,
        "affiliateLink": affiliate_link.strip(),
        "productUrl": product_url.strip(),
        "asin": asin.strip(),
        "tags": tags.strip(),
        "relatedProductIds": related.strip(),
        "status": status
    }

    uploads = {
        "main": main_upload,
        "gallery": gallery_uploads,
        "video": video_upload
    }

    return product, uploads


# ======================================
# PRODUCT VALIDATION
# ======================================

def validate_product(product, uploads):

    errors = []

    if not product["name"]:
        errors.append("Product name is required.")

    if not (
        product["image"]
        or uploads["main"]
    ):
        errors.append("Main image is required.")

    if product["image"] and not valid_media_path(
        product["image"], "image"
    ):
        errors.append("Invalid main image URL/path.")

    for image in split_values(product["images"]):

        if not valid_media_path(image, "image"):
            errors.append(
                f"Invalid gallery image: {image}"
            )

    if product["video"] and not valid_media_path(
        product["video"], "video"
    ):
        errors.append("Invalid product video URL/path.")

    if not valid_https(product["affiliateLink"]):
        errors.append("Valid HTTPS affiliate link required.")

    if not valid_https(product["productUrl"]):
        errors.append("Valid HTTPS product URL required.")

    if not product["countries"]:
        errors.append("Select at least one target country.")

    if product["affiliatePlatform"] == "Amazon":

        asin = product["asin"]

        if len(asin) != 10 or not asin.isalnum():
            errors.append("Valid 10-character ASIN required.")

    return errors


# ======================================
# PROCESS MEDIA
# ======================================

def process_media(product, uploads):

    if uploads["main"] is not None:

        product["image"] = save_uploaded_file(
            uploads["main"],
            IMAGES,
            IMAGE_TYPES,
            MAX_IMAGE_SIZE
        )

    if uploads["gallery"]:

        existing = split_values(product["images"])

        uploaded = []

        for image in uploads["gallery"]:

            uploaded.append(
                save_uploaded_file(
                    image,
                    IMAGES,
                    IMAGE_TYPES,
                    MAX_IMAGE_SIZE
                )
            )

        product["images"] = "|".join(
            dict.fromkeys(existing + uploaded)
        )

    if uploads["video"] is not None:

        product["video"] = save_uploaded_file(
            uploads["video"],
            VIDEOS,
            VIDEO_TYPES,
            MAX_VIDEO_SIZE
        )

    return product


# ======================================
# DUPLICATE DETECTION
# ======================================

def normalize_url(value):

    value = str(value).strip()

    if not value:
        return ""

    try:

        parsed = urlparse(value)

        host = (parsed.hostname or "").lower()

        path = parsed.path.rstrip("/").lower()

        return f"{host}{path}"

    except ValueError:

        return value.lower()


def duplicate_keys(row):

    platform = str(
        row.get("affiliatePlatform", "")
    ).strip().lower()

    asin = str(
        row.get("asin", "")
    ).strip().upper()

    original_url = normalize_url(
        row.get("productUrl", "")
    )

    keys = []

    if original_url:
        keys.append(
            ("URL", original_url)
        )

    if platform == "amazon" and asin:
        keys.append(
            ("ASIN", asin)
        )

    return keys


def existing_duplicate_index(df):

    indexed = {}

    for _, row in df.iterrows():

        for key in duplicate_keys(row):

            indexed[key] = str(row.get("id", ""))

    return indexed


# ======================================
# BULK IMPORT VALIDATION
# ======================================

def validate_import_row(row, row_number):

    errors = []

    def field(name):
        return str(row.get(name, "")).strip()

    if not field("name"):
        errors.append("Missing product name")

    if field("category") not in CATEGORIES:
        errors.append("Invalid category")

    if field("affiliatePlatform") not in PLATFORMS:
        errors.append("Invalid affiliate platform")

    if field("status") not in STATUSES:
        errors.append("Invalid status")

    if not valid_https(field("affiliateLink")):
        errors.append("Invalid affiliate link")

    if not valid_https(field("productUrl")):
        errors.append("Invalid product URL")

    if not valid_media_path(field("image"), "image"):
        errors.append("Invalid main image")

    for image in split_values(field("images")):

        if not valid_media_path(image, "image"):
            errors.append(
                "Invalid gallery image"
            )
            break

    video = field("video")

    if video and not valid_media_path(video, "video"):
        errors.append("Invalid video")

    countries = split_values(field("countries"))

    if not countries:
        errors.append("Missing target countries")

    elif any(
        country not in COUNTRIES
        for country in countries
    ):
        errors.append("Invalid target countries")

    if field("affiliatePlatform") == "Amazon":

        asin = field("asin")

        if len(asin) != 10 or not asin.isalnum():
            errors.append("Invalid Amazon ASIN")

    related_ids = split_values(
        field("relatedProductIds")
    )

    for related_id in related_ids:

        if not related_id.isdigit():
            errors.append(
                "Related product IDs must be numbers"
            )
            break

    return errors


# ======================================
# BULK IMPORT PROCESSOR
# ======================================

def prepare_bulk_import(upload, existing_df):

    if upload.size > MAX_IMPORT_SIZE:
        raise ValueError(
            "CSV file exceeds 10 MB limit."
        )

    content = upload.getvalue()

    incoming = pd.read_csv(
        io.BytesIO(content),
        dtype=str,
        keep_default_na=False,
        encoding="utf-8-sig"
    )

    if len(incoming) > MAX_IMPORT_ROWS:
        raise ValueError(
            f"Maximum {MAX_IMPORT_ROWS} products per import."
        )

    required = [
        "name",
        "category",
        "image",
        "affiliatePlatform",
        "affiliateLink",
        "productUrl",
        "countries"
    ]

    missing = [
        column
        for column in required
        if column not in incoming.columns
    ]

    if missing:
        raise ValueError(
            "Missing CSV columns: " +
            ", ".join(missing)
        )

    for column in COLUMNS:

        if column not in incoming.columns:
            incoming[column] = ""

    incoming = incoming[COLUMNS].fillna("")

    incoming["status"] = incoming["status"].replace(
        "",
        "active"
    )

    existing_keys = existing_duplicate_index(
        existing_df
    )

    import_keys = {}

    preview_rows = []

    clean_rows = []

    next_product_id = next_id(existing_df)

    for position, (_, row) in enumerate(
        incoming.iterrows(),
        start=2
    ):

        product = row.to_dict()

        errors = validate_import_row(
            product,
            position
        )

        duplicates = []

        for key in duplicate_keys(product):

            if key in existing_keys:

                duplicates.append(
                    f"Already exists: {key[0]} "
                    f"(Product ID {existing_keys[key]})"
                )

            elif key in import_keys:

                duplicates.append(
                    f"Duplicate inside import: "
                    f"{key[0]} (CSV row {import_keys[key]})"
                )

        if errors:

            decision = "Invalid"

        elif duplicates:

            decision = "Duplicate"

        else:

            decision = "Ready"

            product["id"] = str(next_product_id)

            next_product_id += 1

            clean_rows.append(product)

        for key in duplicate_keys(product):

            if key not in import_keys:
                import_keys[key] = position

        preview_rows.append({
            "CSV Row": position,
            "Product": product.get("name", ""),
            "Platform": product.get(
                "affiliatePlatform", ""
            ),
            "Category": product.get(
                "category", ""
            ),
            "Status": decision,
            "Details": "; ".join(
                errors + duplicates
            )
        })

    preview = pd.DataFrame(preview_rows)

    ready = pd.DataFrame(
        clean_rows,
        columns=COLUMNS
    )

    return preview, ready


# ======================================
# SIDEBAR
# ======================================

st.sidebar.title("✦ ETHORISE")

st.sidebar.caption(
    "Professional Commerce Admin"
)

page = st.sidebar.radio(
    "Navigation",
    [
        "Dashboard",
        "All Products",
        "Add Product",
        "Edit Product",
        "Delete Product",
        "Bulk Import",
        "Media Library",
        "Export Website"
    ]
)

st.sidebar.divider()

st.sidebar.caption(
    "Local Management System"
)


# ======================================
# LOAD DATABASE
# ======================================

df = load_data()


# ======================================
# DASHBOARD
# ======================================

if page == "Dashboard":

    st.title("ETHORISE Dashboard")

    st.caption(
        "Manage your affiliate commerce platform."
    )

    total = len(df)

    active = (
        int((df["status"] == "active").sum())
        if not df.empty else 0
    )

    amazon = (
        int(
            (df["affiliatePlatform"] == "Amazon").sum()
        )
        if not df.empty else 0
    )

    aliexpress = (
        int(
            (df["affiliatePlatform"] == "AliExpress").sum()
        )
        if not df.empty else 0
    )

    c1, c2, c3, c4 = st.columns(4)

    c1.metric("Total Products", total)
    c2.metric("Active Products", active)
    c3.metric("Amazon", amazon)
    c4.metric("AliExpress", aliexpress)

    st.divider()

    st.subheader("Recent Products")

    st.dataframe(
        df.tail(10),
        use_container_width=True,
        hide_index=True
    )


# ======================================
# ALL PRODUCTS
# ======================================

elif page == "All Products":

    st.title("Product Catalog")

    search = st.text_input(
        "Search products",
        placeholder=(
            "Search by name, brand or category"
        )
    )

    filtered = df.copy()

    if search:

        mask = (
            filtered["name"].str.contains(
                search,
                case=False,
                regex=False
            )
            |
            filtered["brand"].str.contains(
                search,
                case=False,
                regex=False
            )
            |
            filtered["category"].str.contains(
                search,
                case=False,
                regex=False
            )
        )

        filtered = filtered[mask]

    st.dataframe(
        filtered,
        use_container_width=True,
        hide_index=True
    )

    st.download_button(
        "Download CSV",
        data=df.to_csv(index=False),
        file_name="ethorise_products.csv",
        mime="text/csv"
    )


# ======================================
# ADD PRODUCT
# ======================================

elif page == "Add Product":

    st.title("➕ Add Product")

    st.info(
        "Use only real products and media "
        "you have permission to publish."
    )

    product, uploads = product_editor(
        prefix="add"
    )

    if st.button(
        "💾 Save Product",
        type="primary"
    ):

        errors = validate_product(
            product,
            uploads
        )

        if errors:

            for error in errors:
                st.error(error)

        else:

            try:

                product = process_media(
                    product,
                    uploads
                )

                product["id"] = str(
                    next_id(df)
                )

                updated = pd.concat(
                    [
                        df,
                        pd.DataFrame([product])
                    ],
                    ignore_index=True
                )

                save_data(updated)

                st.success(
                    "Product saved successfully!"
                )

            except Exception as error:

                st.error(str(error))


# ======================================
# EDIT PRODUCT
# ======================================

elif page == "Edit Product":

    st.title("✏️ Edit Product")

    if df.empty:

        st.warning("No products found.")

    else:

        options = {
            f"{row['id']} — {row['name']}": index
            for index, row in df.iterrows()
        }

        selected = st.selectbox(
            "Choose Product",
            list(options.keys())
        )

        index = options[selected]

        defaults = df.loc[index].to_dict()

        product, uploads = product_editor(
            defaults,
            prefix=f"edit_{index}"
        )

        if st.button(
            "💾 Update Product",
            type="primary"
        ):

            errors = validate_product(
                product,
                uploads
            )

            if errors:

                for error in errors:
                    st.error(error)

            else:

                try:

                    product = process_media(
                        product,
                        uploads
                    )

                    for key, value in product.items():
                        df.at[index, key] = value

                    save_data(df)

                    st.success(
                        "Product updated successfully!"
                    )

                except Exception as error:

                    st.error(str(error))


# ======================================
# DELETE PRODUCT
# ======================================

elif page == "Delete Product":

    st.title("🗑️ Delete Product")

    if df.empty:

        st.warning("No products available.")

    else:

        options = {
            f"{row['id']} — {row['name']}": index
            for index, row in df.iterrows()
        }

        selected = st.selectbox(
            "Choose Product",
            list(options.keys())
        )

        confirm = st.checkbox(
            "I understand this product "
            "will be deleted."
        )

        if st.button(
            "Delete Product",
            type="primary",
            disabled=not confirm
        ):

            updated = df.drop(
                index=options[selected]
            ).reset_index(drop=True)

            save_data(updated)

            st.success(
                "Product deleted."
            )

            st.rerun()


# ======================================
# BULK IMPORT
# ======================================

elif page == "Bulk Import":

    st.title("📥 Bulk Product Import")

    st.caption(
        "Import multiple real affiliate products "
        "from a CSV file."
    )

    st.info(
        "Existing products are preserved. "
        "Duplicates are skipped. "
        "Only validated new products are imported."
    )

    # ==================================
    # CSV TEMPLATE
    # ==================================

    st.subheader("1. Download Import Template")

    template = pd.DataFrame(
        columns=COLUMNS
    )

    st.download_button(
        "⬇️ Download CSV Template",
        data=template.to_csv(index=False),
        file_name="ethorise_import_template.csv",
        mime="text/csv"
    )

    st.caption(
        "Use | to separate images, tags, "
        "features, countries and related IDs."
    )

    st.divider()

    # ==================================
    # FILE UPLOAD
    # ==================================

    st.subheader("2. Upload Product CSV")

    uploaded_file = st.file_uploader(
        "Choose CSV File",
        type=["csv"],
        key="bulk_csv_upload"
    )

    if uploaded_file is not None:

        try:

            preview, ready = prepare_bulk_import(
                uploaded_file,
                df
            )

            total_rows = len(preview)

            ready_count = int(
                (preview["Status"] == "Ready").sum()
            ) if total_rows else 0

            duplicate_count = int(
                (preview["Status"] == "Duplicate").sum()
            ) if total_rows else 0

            invalid_count = int(
                (preview["Status"] == "Invalid").sum()
            ) if total_rows else 0

            c1, c2, c3, c4 = st.columns(4)

            c1.metric("CSV Products", total_rows)
            c2.metric("Ready", ready_count)
            c3.metric("Duplicates", duplicate_count)
            c4.metric("Invalid", invalid_count)

            st.divider()

            # ==============================
            # PREVIEW
            # ==============================

            st.subheader("3. Import Preview")

            st.dataframe(
                preview,
                use_container_width=True,
                hide_index=True
            )

            st.download_button(
                "⬇️ Download Validation Report",
                data=preview.to_csv(index=False),
                file_name=(
                    "ethorise_import_validation.csv"
                ),
                mime="text/csv"
            )

            st.divider()

            # ==============================
            # IMPORT CONFIRMATION
            # ==============================

            st.subheader("4. Confirm Import")

            if ready_count == 0:

                st.warning(
                    "No new valid products "
                    "available to import."
                )

            else:

                st.success(
                    f"{ready_count} new products "
                    "are ready to import."
                )

                confirm = st.checkbox(
                    "I confirm these are real "
                    "affiliate products and I have "
                    "permission to use their data/media.",
                    key="confirm_bulk_import"
                )

                if st.button(
                    f"📥 Import {ready_count} Products",
                    type="primary",
                    disabled=not confirm
                ):

                    try:

                        updated = pd.concat(
                            [
                                df,
                                ready
                            ],
                            ignore_index=True
                        )

                        save_data(updated)

                        st.success(
                            f"Successfully imported "
                            f"{ready_count} products!"
                        )

                        st.info(
                            "Next: Open Export Website "
                            "and generate products.json."
                        )

                        st.balloons()

                    except Exception as error:

                        st.error(
                            f"Import failed: {error}"
                        )

        except Exception as error:

            st.error(
                f"Unable to process CSV: {error}"
            )


# ======================================
# MEDIA LIBRARY
# ======================================

elif page == "Media Library":

    st.title("🖼️ Media Library")

    tabs = st.tabs([
        "Images",
        "Videos"
    ])

    with tabs[0]:

        images = sorted([
            p for p in IMAGES.iterdir()
            if p.suffix.lower() in IMAGE_TYPES
        ])

        st.write(
            f"Total Images: {len(images)}"
        )

        columns = st.columns(4)

        for index, image in enumerate(images):

            with columns[index % 4]:

                st.image(
                    str(image),
                    use_container_width=True
                )

                st.caption(
                    image.name
                )

    with tabs[1]:

        videos = sorted([
            p for p in VIDEOS.iterdir()
            if p.suffix.lower() in VIDEO_TYPES
        ])

        st.write(
            f"Total Videos: {len(videos)}"
        )

        for video in videos:

            st.video(
                str(video)
            )

            st.caption(
                video.name
            )


# ======================================
# EXPORT WEBSITE
# ======================================

elif page == "Export Website":

    st.title("🚀 Export Product Database")

    st.write(
        "Validate products.csv and generate "
        "products.json for your website."
    )

    st.metric(
        "CSV Products",
        len(df)
    )

    st.caption(
        "Multiple images and product videos "
        "are supported."
    )

    if st.button(
        "Validate & Generate JSON",
        type="primary"
    ):

        try:

            result = subprocess.run(
                [
                    sys.executable,
                    str(MANAGER)
                ],
                cwd=BASE,
                capture_output=True,
                text=True,
                timeout=120
            )

            st.code(
                result.stdout or "No output"
            )

            if result.stderr:
                st.error(result.stderr)

            if (
                "[SUCCESS]" in result.stdout
                and result.returncode == 0
            ):

                st.success(
                    "JSON generated successfully!"
                )

            else:

                st.error(
                    "Export failed. "
                    "Existing products.json "
                    "was not intentionally replaced."
                )

        except Exception as error:

            st.error(
                f"Export error: {error}"
            )