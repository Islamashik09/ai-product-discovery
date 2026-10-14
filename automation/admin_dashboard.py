"""
ETHORISE ADMIN DASHBOARD

Professional Local Affiliate Product Manager

Features:
- Dashboard
- Add / Edit / Delete Products
- Main Image Upload
- Multiple Gallery Images
- Product Video Upload
- AI Image Labeling
- Media Library
- Bulk CSV Import
- Import Preview
- Duplicate Detection
- Safe Merge
- Automatic CSV Backups
- Website JSON / Sitemap Export

Run:
python -m streamlit run automation/admin_dashboard.py --server.address 127.0.0.1
"""

import io
import json
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

for folder in (DATA, BACKUPS, IMAGES, VIDEOS):
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

AI_LABEL = "AI-generated illustration"

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
    "mediaLabels",
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
# DATABASE
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
        return None

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S_%f"
    )

    destination = BACKUPS / f"products_{timestamp}.csv"

    shutil.copy2(CSV, destination)

    return destination


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
        item.strip()
        for item in str(text).split("|")
        if item.strip()
    ]


def unique_values(values):

    return list(dict.fromkeys(
        item for item in values if item
    ))


# ======================================
# URL / MEDIA VALIDATION
# ======================================

def valid_https(value):

    try:

        parsed = urlparse(str(value).strip())

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

    folder = IMAGES if kind == "image" else VIDEOS

    prefix = (
        "assets/images/"
        if kind == "image"
        else "assets/videos/"
    )

    allowed = (
        IMAGE_TYPES
        if kind == "image"
        else VIDEO_TYPES
    )

    if not value.startswith(prefix):
        return False

    target = (BASE / value).resolve()

    return (
        target.is_relative_to(folder.resolve())
        and target.is_file()
        and target.suffix.lower() in allowed
    )


# ======================================
# AI MEDIA LABEL HELPERS
# ======================================

def parse_media_labels(value):

    if isinstance(value, dict):
        data = value

    else:

        text = str(value or "").strip()

        if not text:
            return {}

        try:
            data = json.loads(text)
        except (ValueError, TypeError):
            raise ValueError(
                "mediaLabels must contain valid JSON."
            )

    if not isinstance(data, dict):
        raise ValueError(
            "mediaLabels must be a JSON object."
        )

    result = {}

    for path, label in data.items():

        path = str(path).strip()
        label = str(label).strip()

        if label != AI_LABEL:
            raise ValueError(
                f"Unsupported media label: {label}"
            )

        if not valid_media_path(path, "image"):
            raise ValueError(
                f"Invalid labeled image: {path}"
            )

        result[path] = label

    return result


def serialize_media_labels(labels):

    if not labels:
        return ""

    return json.dumps(
        labels,
        ensure_ascii=False,
        separators=(",", ":")
    )


def all_product_images(product):

    return unique_values(
        [str(product.get("image", "")).strip()]
        + split_values(product.get("images", ""))
    )


# ======================================
# MEDIA UPLOAD
# ======================================

def save_uploaded_file(upload, folder, allowed, max_size):

    if upload is None:
        return ""

    extension = Path(upload.name).suffix.lower()

    if extension not in allowed:
        raise ValueError(
            "Unsupported file extension."
        )

    content = upload.getvalue()

    if not content:
        raise ValueError(
            "Uploaded file is empty."
        )

    if len(content) > max_size:
        raise ValueError(
            f"File exceeds {max_size // 1048576} MB."
        )

    if folder == IMAGES:

        if extension in {".jpg", ".jpeg"}:

            if not content.startswith(b"\xff\xd8\xff"):
                raise ValueError("Invalid JPEG.")

        elif extension == ".png":

            if not content.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError("Invalid PNG.")

        elif extension == ".webp":

            if not (
                content.startswith(b"RIFF")
                and content[8:12] == b"WEBP"
            ):
                raise ValueError("Invalid WebP.")

    elif folder == VIDEOS:

        if extension == ".mp4":

            if b"ftyp" not in content[:32]:
                raise ValueError("Invalid MP4.")

        elif extension == ".webm":

            if not content.startswith(b"\x1a\x45\xdf\xa3"):
                raise ValueError("Invalid WebM.")

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

            if (
                path.is_relative_to(IMAGES.resolve())
                and path.is_file()
            ):
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

            if (
                path.is_relative_to(VIDEOS.resolve())
                and path.is_file()
            ):
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

    left, right = st.columns(2)

    with left:

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

        current_category = value(
            "category",
            "Electronics"
        )

        category = st.selectbox(
            "Category",
            CATEGORIES,
            index=(
                CATEGORIES.index(current_category)
                if current_category in CATEGORIES
                else 0
            ),
            key=f"{prefix}_category"
        )

    with right:

        subcategory = st.text_input(
            "Subcategory",
            value=value("subcategory"),
            key=f"{prefix}_subcategory"
        )

        current_platform = value(
            "affiliatePlatform",
            "Amazon"
        )

        platform = st.selectbox(
            "Affiliate Platform",
            PLATFORMS,
            index=(
                PLATFORMS.index(current_platform)
                if current_platform in PLATFORMS
                else 0
            ),
            key=f"{prefix}_platform"
        )

        current_status = value(
            "status",
            "active"
        )

        status = st.selectbox(
            "Product Status",
            STATUSES,
            index=(
                STATUSES.index(current_status)
                if current_status in STATUSES
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

    # ==================================
    # MAIN IMAGE
    # ==================================

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
                caption="New Main Image",
                width=300
            )

        elif main_image:

            st.caption("Current main image")
            preview_image(main_image)

    else:

        main_image = st.text_input(
            "Main Image URL or assets/images/ path",
            value=main_image,
            key=f"{prefix}_image_url"
        )

        preview_image(main_image)

    main_ai = st.checkbox(
        "Main image is AI-generated",
        value=False,
        key=f"{prefix}_main_ai",
        help=(
            "Select only when the main image is an "
            "AI-generated illustration."
        )
    )

    # ==================================
    # GALLERY
    # ==================================

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

            columns = st.columns(3)

            for index, upload in enumerate(gallery_uploads):

                with columns[index % 3]:

                    st.image(
                        upload,
                        use_container_width=True
                    )

                    st.caption(upload.name)

        if gallery:

            st.caption("Existing gallery images:")
            st.text(gallery)

    else:

        gallery = st.text_area(
            "Additional Image URLs — separate with |",
            value=gallery,
            key=f"{prefix}_gallery_urls"
        )

    gallery_ai = st.checkbox(
        "Mark newly uploaded gallery images as AI-generated",
        value=False,
        key=f"{prefix}_gallery_ai"
    )

    # ==================================
    # EXISTING MEDIA LABELS
    # ==================================

    st.markdown("#### AI Image Labels")

    st.caption(
        "Choose existing image paths that contain "
        "AI-generated illustrations. "
        "New uploads can be labeled using the checkboxes above."
    )

    existing_images = all_product_images({
        "image": main_image,
        "images": gallery
    })

    try:

        existing_labels = parse_media_labels(
            value("mediaLabels")
        )

    except ValueError as error:

        st.warning(str(error))
        existing_labels = {}

    default_ai_images = [
        path
        for path in existing_images
        if existing_labels.get(path) == AI_LABEL
    ]

    labeled_images = st.multiselect(
        "Existing AI-generated Images",
        options=existing_images,
        default=default_ai_images,
        key=f"{prefix}_labeled_images"
    )

    st.info(
        "AI-generated visuals must not be presented "
        "as verified photographs of the advertised product."
    )

    st.divider()

    # ==================================
    # VIDEO
    # ==================================

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

        preview_video(video)

    st.divider()

    # ==================================
    # AFFILIATE INFORMATION
    # ==================================

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
        "mediaLabels": "",
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
        "video": video_upload,
        "main_ai": main_ai,
        "gallery_ai": gallery_ai,
        "labeled_images": labeled_images
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
        or uploads["main"] is not None
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

    if product["category"] not in CATEGORIES:
        errors.append("Invalid category.")

    if product["affiliatePlatform"] not in PLATFORMS:
        errors.append("Invalid affiliate platform.")

    if product["status"] not in STATUSES:
        errors.append("Invalid product status.")

    if product["affiliatePlatform"] == "Amazon":

        asin = product["asin"]

        if len(asin) != 10 or not asin.isalnum():
            errors.append(
                "Valid 10-character Amazon ASIN required."
            )

    for item in split_values(product["relatedProductIds"]):

        if not item.isdigit():
            errors.append(
                "Related product IDs must be numbers."
            )
            break

    return errors


# ======================================
# PROCESS MEDIA AND LABELS
# ======================================

def process_media(product, uploads):

    labels = {
        path: AI_LABEL
        for path in uploads["labeled_images"]
    }

    if uploads["main"] is not None:

        product["image"] = save_uploaded_file(
            uploads["main"],
            IMAGES,
            IMAGE_TYPES,
            MAX_IMAGE_SIZE
        )

        if uploads["main_ai"]:
            labels[product["image"]] = AI_LABEL

    elif uploads["main_ai"] and product["image"]:

        labels[product["image"]] = AI_LABEL

    if uploads["gallery"]:

        existing = split_values(product["images"])

        uploaded = []

        for image in uploads["gallery"]:

            path = save_uploaded_file(
                image,
                IMAGES,
                IMAGE_TYPES,
                MAX_IMAGE_SIZE
            )

            uploaded.append(path)

            if uploads["gallery_ai"]:
                labels[path] = AI_LABEL

        product["images"] = "|".join(
            unique_values(existing + uploaded)
        )

    if uploads["video"] is not None:

        product["video"] = save_uploaded_file(
            uploads["video"],
            VIDEOS,
            VIDEO_TYPES,
            MAX_VIDEO_SIZE
        )

    valid_images = set(all_product_images(product))

    labels = {
        path: label
        for path, label in labels.items()
        if path in valid_images
    }

    product["mediaLabels"] = serialize_media_labels(labels)

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

    product_url = normalize_url(
        row.get("productUrl", "")
    )

    keys = []

    if product_url:
        keys.append(("URL", product_url))

    if platform == "amazon" and asin:
        keys.append(("ASIN", asin))

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
            errors.append("Invalid gallery image")
            break

    if (
        field("video")
        and not valid_media_path(field("video"), "video")
    ):
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

    for related_id in split_values(
        field("relatedProductIds")
    ):

        if not related_id.isdigit():
            errors.append(
                "Related product IDs must be numbers"
            )
            break

    try:

        labels = parse_media_labels(
            field("mediaLabels")
        )

        image_paths = set(
            all_product_images(row)
        )

        for path in labels:

            if path not in image_paths:
                errors.append(
                    "Labeled image is not part of product gallery"
                )

    except ValueError as error:

        errors.append(str(error))

    return errors


# ======================================
# BULK IMPORT PROCESSOR
# ======================================

def prepare_bulk_import(upload, existing_df):

    if upload.size > MAX_IMPORT_SIZE:
        raise ValueError(
            "CSV exceeds 10 MB."
        )

    incoming = pd.read_csv(
        io.BytesIO(upload.getvalue()),
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
            "Missing CSV columns: " + ", ".join(missing)
        )

    for column in COLUMNS:

        if column not in incoming.columns:
            incoming[column] = ""

    incoming = incoming[COLUMNS].fillna("")

    incoming["status"] = incoming["status"].replace(
        "",
        "active"
    )

    existing_keys = existing_duplicate_index(existing_df)

    imported_keys = {}

    preview_rows = []
    clean_rows = []

    new_id = next_id(existing_df)

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

            elif key in imported_keys:

                duplicates.append(
                    f"Duplicate in CSV: {key[0]} "
                    f"(Row {imported_keys[key]})"
                )

        if errors:

            decision = "Invalid"

        elif duplicates:

            decision = "Duplicate"

        else:

            decision = "Ready"

            product["id"] = str(new_id)

            new_id += 1

            clean_rows.append(product)

        for key in duplicate_keys(product):
            imported_keys.setdefault(key, position)

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

    return (
        pd.DataFrame(preview_rows),
        pd.DataFrame(clean_rows, columns=COLUMNS)
    )


# ======================================
# SIDEBAR
# ======================================

st.sidebar.title("✦ ETHORISE")

st.sidebar.caption("Professional Commerce Admin")

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

st.sidebar.caption("Local Management System")


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
        int((df["affiliatePlatform"] == "Amazon").sum())
        if not df.empty else 0
    )

    aliexpress = (
        int((df["affiliatePlatform"] == "AliExpress").sum())
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
        placeholder="Search by name, brand or category"
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
        "Use real affiliate products and media "
        "that you have permission to publish."
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

                product["id"] = str(next_id(df))

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
            "I understand this product will be deleted."
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

            st.success("Product deleted.")

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
        "Duplicates and invalid rows are skipped."
    )

    st.subheader("1. Download Import Template")

    template = pd.DataFrame(columns=COLUMNS)

    st.download_button(
        "⬇️ Download CSV Template",
        data=template.to_csv(index=False),
        file_name="ethorise_import_template.csv",
        mime="text/csv"
    )

    st.caption(
        "Use | to separate features, images, "
        "countries, tags and related IDs. "
        "mediaLabels uses JSON."
    )

    st.divider()

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

            ready_count = (
                int((preview["Status"] == "Ready").sum())
                if total_rows else 0
            )

            duplicate_count = (
                int((preview["Status"] == "Duplicate").sum())
                if total_rows else 0
            )

            invalid_count = (
                int((preview["Status"] == "Invalid").sum())
                if total_rows else 0
            )

            c1, c2, c3, c4 = st.columns(4)

            c1.metric("CSV Products", total_rows)
            c2.metric("Ready", ready_count)
            c3.metric("Duplicates", duplicate_count)
            c4.metric("Invalid", invalid_count)

            st.divider()

            st.subheader("3. Import Preview")

            st.dataframe(
                preview,
                use_container_width=True,
                hide_index=True
            )

            st.download_button(
                "⬇️ Download Validation Report",
                data=preview.to_csv(index=False),
                file_name="ethorise_import_validation.csv",
                mime="text/csv"
            )

            st.divider()

            st.subheader("4. Confirm Import")

            if ready_count == 0:

                st.warning(
                    "No valid new products to import."
                )

            else:

                st.success(
                    f"{ready_count} products ready."
                )

                confirm = st.checkbox(
                    "I confirm the product information "
                    "is accurate and I have permission "
                    "to publish the supplied media.",
                    key="confirm_bulk_import"
                )

                if st.button(
                    f"📥 Import {ready_count} Products",
                    type="primary",
                    disabled=not confirm
                ):

                    try:

                        updated = pd.concat(
                            [df, ready],
                            ignore_index=True
                        )

                        save_data(updated)

                        st.success(
                            f"Imported {ready_count} products!"
                        )

                        st.info(
                            "Next: Export Website → "
                            "Validate & Generate JSON."
                        )

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

    tabs = st.tabs(["Images", "Videos"])

    with tabs[0]:

        images = sorted([
            path
            for path in IMAGES.iterdir()
            if path.suffix.lower() in IMAGE_TYPES
        ])

        st.write(f"Total Images: {len(images)}")

        if images:

            columns = st.columns(4)

            for index, image in enumerate(images):

                with columns[index % 4]:

                    st.image(
                        str(image),
                        use_container_width=True
                    )

                    st.caption(image.name)

    with tabs[1]:

        videos = sorted([
            path
            for path in VIDEOS.iterdir()
            if path.suffix.lower() in VIDEO_TYPES
        ])

        st.write(f"Total Videos: {len(videos)}")

        for video in videos:

            st.video(str(video))

            st.caption(video.name)


# ======================================
# EXPORT WEBSITE
# ======================================

elif page == "Export Website":

    st.title("🚀 Export Product Database")

    st.write(
        "Validate products.csv and generate "
        "website JSON and sitemap."
    )

    st.metric("CSV Products", len(df))

    st.caption(
        "Images, videos and AI image labels "
        "are supported by the Dashboard."
    )

    st.warning(
        "Product Manager must also support mediaLabels "
        "before labels appear in products.json."
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

            st.code(result.stdout or "No output")

            if result.stderr:
                st.error(result.stderr)

            if (
                "[SUCCESS]" in result.stdout
                and result.returncode == 0
            ):

                st.success(
                    "Website export completed!"
                )

            else:

                st.error(
                    "Export failed. Check validation output."
                )

        except Exception as error:

            st.error(
                f"Export error: {error}"
            )