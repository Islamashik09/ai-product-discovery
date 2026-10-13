"""
ETHORISE PRODUCT MANAGER

CSV -> JSON + XML Sitemap Generator

Supports:
- Amazon & AliExpress Affiliate Products
- Main Images
- Multiple Product Images
- Product Videos
- Tags & Recommendations
- Duplicate Detection
- Product Validation
- Safe JSON Export
- Automatic Product Sitemap
- Automatic Backups

No external packages required.
"""

import csv
import json
import re
import shutil
import tempfile
import xml.etree.ElementTree as ET

from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


# ==========================================
# PROJECT PATHS
# ==========================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "data"

CSV_FILE = DATA_DIR / "products.csv"

JSON_FILE = DATA_DIR / "products.json"

SITEMAP_FILE = BASE_DIR / "sitemap.xml"

BACKUP_DIR = DATA_DIR / "backups"

IMAGE_DIR = BASE_DIR / "assets" / "images"

VIDEO_DIR = BASE_DIR / "assets" / "videos"


# ==========================================
# SITE CONFIGURATION
# ==========================================

SITE_URL = (
    "https://islamashik09.github.io/ethorise/"
)

STATIC_PAGES = [
    "",
    "about.html",
    "contact.html",
    "privacy.html",
    "affiliate-disclosure.html",
]


# ==========================================
# PRODUCT CONFIGURATION
# ==========================================

ALLOWED_CATEGORIES = {
    "Electronics",
    "Home",
    "Fashion",
    "Beauty",
    "Fitness",
    "Accessories",
    "Office",
    "Lifestyle",
}

ALLOWED_PLATFORMS = {
    "Amazon",
    "AliExpress",
}

ALLOWED_COUNTRIES = {
    "USA",
    "UK",
    "Canada",
}

ALLOWED_STATUSES = {
    "active",
    "inactive",
}

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

VIDEO_EXTENSIONS = {
    ".mp4",
    ".webm",
}

REQUIRED_COLUMNS = {
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
    "status",
}


# ==========================================
# HELPERS
# ==========================================

def clean(value):
    return str(value or "").strip()


def parse_list(value):
    return [
        item.strip()
        for item in clean(value).split("|")
        if item.strip()
    ]


def parse_ids(value):
    result = []

    for item in parse_list(value):

        if not item.isdigit():
            raise ValueError(
                f"Invalid related product ID: {item}"
            )

        result.append(int(item))

    return result


def valid_https_url(value):
    try:

        parsed = urlparse(value)

        return (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and not parsed.username
            and not parsed.password
        )

    except ValueError:
        return False


def normalize_url(value):
    parsed = urlparse(value)

    return (
        parsed.scheme.lower(),
        (parsed.hostname or "").lower(),
        parsed.path.rstrip("/"),
        parsed.query
    )


# ==========================================
# MEDIA VALIDATION
# ==========================================

def validate_media(value, media_type="image"):
    value = clean(value)

    if not value:
        return False

    if valid_https_url(value):
        return True

    allowed_dir = (
        IMAGE_DIR
        if media_type == "image"
        else VIDEO_DIR
    ).resolve()

    expected_prefix = (
        "assets/images/"
        if media_type == "image"
        else "assets/videos/"
    )

    if not value.startswith(expected_prefix):
        return False

    target = (BASE_DIR / value).resolve()

    if not target.is_relative_to(allowed_dir):
        return False

    if not target.is_file():
        return False

    allowed_extensions = (
        IMAGE_EXTENSIONS
        if media_type == "image"
        else VIDEO_EXTENSIONS
    )

    if target.suffix.lower() not in allowed_extensions:
        return False

    return True


# ==========================================
# BACKUP HELPERS
# ==========================================

def backup_file(source, label):

    if not source.exists():
        return None

    BACKUP_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S_%f"
    )

    destination = BACKUP_DIR / (
        f"{label}_{timestamp}{source.suffix}"
    )

    shutil.copy2(
        source,
        destination
    )

    print(
        f"[BACKUP] {destination.name}"
    )

    return destination


# ==========================================
# PRODUCT VALIDATION
# ==========================================

def validate_product(row, row_number):
    errors = []

    id_text = clean(row.get("id"))

    if not id_text.isdigit() or int(id_text) <= 0:
        errors.append("Invalid product ID")
        product_id = None
    else:
        product_id = int(id_text)

    name = clean(row.get("name"))

    if not name:
        errors.append("Product name missing")

    brand = clean(row.get("brand"))

    category = clean(row.get("category"))

    if category not in ALLOWED_CATEGORIES:
        errors.append(
            f"Invalid category: {category}"
        )

    platform = clean(
        row.get("affiliatePlatform")
    )

    if platform not in ALLOWED_PLATFORMS:
        errors.append(
            f"Invalid platform: {platform}"
        )

    affiliate_link = clean(
        row.get("affiliateLink")
    )

    if not valid_https_url(affiliate_link):
        errors.append(
            "Invalid affiliate link"
        )

    product_url = clean(
        row.get("productUrl")
    )

    if not valid_https_url(product_url):
        errors.append(
            "Invalid product URL"
        )

    # MAIN IMAGE

    image = clean(row.get("image"))

    if not validate_media(image, "image"):
        errors.append(
            "Invalid main product image"
        )

    # ADDITIONAL IMAGES

    images = parse_list(
        row.get("images")
    )

    for gallery_image in images:

        if not validate_media(
            gallery_image,
            "image"
        ):
            errors.append(
                f"Invalid gallery image: {gallery_image}"
            )

    all_images = list(
        dict.fromkeys(
            [image] + images
        )
    )

    # VIDEO

    video = clean(row.get("video"))

    if video and not validate_media(
        video,
        "video"
    ):
        errors.append(
            "Invalid product video"
        )

    # COUNTRIES

    countries = parse_list(
        row.get("countries")
    )

    if not countries:
        errors.append(
            "At least one country required"
        )

    for country in countries:

        if country not in ALLOWED_COUNTRIES:
            errors.append(
                f"Invalid country: {country}"
            )

    # TAGS

    tags = parse_list(
        row.get("tags")
    )

    # RELATED IDS

    try:

        related_ids = parse_ids(
            row.get("relatedProductIds")
        )

    except ValueError as error:

        errors.append(str(error))

        related_ids = []

    # STATUS

    status = clean(
        row.get("status")
    ) or "active"

    if status not in ALLOWED_STATUSES:
        errors.append(
            f"Invalid status: {status}"
        )

    # AMAZON ASIN

    asin = clean(
        row.get("asin")
    )

    if platform == "Amazon":

        if not re.fullmatch(
            r"[A-Za-z0-9]{10}",
            asin
        ):
            errors.append(
                "Amazon ASIN must contain 10 letters/numbers"
            )

    if errors:

        print(
            f"\n[ERROR] CSV Row {row_number}"
        )

        for error in errors:
            print(f" - {error}")

        return None

    return {
        "id": product_id,
        "name": name,
        "brand": brand,
        "category": category,
        "subcategory": clean(
            row.get("subcategory")
        ),
        "description": clean(
            row.get("description")
        ),
        "features": parse_list(
            row.get("features")
        ),
        "tags": tags,
        "relatedProductIds": related_ids,
        "price": None,
        "currency": "USD",
        "image": image,
        "images": all_images,
        "video": video,
        "countries": countries,
        "affiliatePlatform": platform,
        "affiliateLink": affiliate_link,
        "productUrl": product_url,
        "asin": asin,
        "status": status,
    }


# ==========================================
# LOAD CSV
# ==========================================

def load_csv():

    if not CSV_FILE.exists():
        raise FileNotFoundError(
            "products.csv not found"
        )

    products = []

    errors_found = False

    seen_ids = set()
    seen_urls = set()
    seen_asins = set()

    with CSV_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        if not reader.fieldnames:
            raise ValueError(
                "CSV header missing"
            )

        missing = REQUIRED_COLUMNS - set(
            reader.fieldnames
        )

        if missing:
            raise ValueError(
                "Missing CSV columns: "
                + ", ".join(sorted(missing))
            )

        for row_number, row in enumerate(
            reader,
            start=2
        ):

            product = validate_product(
                row,
                row_number
            )

            if product is None:
                errors_found = True
                continue

            product_id = product["id"]

            url_key = normalize_url(
                product["productUrl"]
            )

            asin = product["asin"]

            platform = product[
                "affiliatePlatform"
            ]

            if product_id in seen_ids:

                print(
                    f"[DUPLICATE] Row {row_number}: ID {product_id}"
                )

                errors_found = True
                continue

            if url_key in seen_urls:

                print(
                    f"[DUPLICATE] Row {row_number}: Product URL"
                )

                errors_found = True
                continue

            if (
                platform == "Amazon"
                and asin.upper() in seen_asins
            ):

                print(
                    f"[DUPLICATE] Row {row_number}: ASIN {asin}"
                )

                errors_found = True
                continue

            seen_ids.add(product_id)
            seen_urls.add(url_key)

            if platform == "Amazon":
                seen_asins.add(
                    asin.upper()
                )

            products.append(product)

    # VALIDATE RELATED PRODUCTS

    valid_ids = {
        product["id"]
        for product in products
    }

    for product in products:

        for related_id in product[
            "relatedProductIds"
        ]:

            if related_id == product["id"]:

                print(
                    f"[ERROR] Product {product['id']} references itself"
                )

                errors_found = True

            elif related_id not in valid_ids:

                print(
                    f"[ERROR] Product {product['id']} references "
                    f"missing product {related_id}"
                )

                errors_found = True

    if errors_found:
        raise ValueError(
            "Validation failed. Existing website files preserved."
        )

    return products


# ==========================================
# GENERATE JSON
# ==========================================

def generate_json(products):

    return json.dumps(
        products,
        indent=2,
        ensure_ascii=False
    ) + "\n"


# ==========================================
# GENERATE SITEMAP XML
# ==========================================

def generate_sitemap(products):

    namespace = (
        "http://www.sitemaps.org/schemas/sitemap/0.9"
    )

    ET.register_namespace(
        "",
        namespace
    )

    root = ET.Element(
        f"{{{namespace}}}urlset"
    )

    urls = []

    # STATIC PAGES

    for page in STATIC_PAGES:
        urls.append(
            SITE_URL + page
        )

    # ACTIVE PRODUCT PAGES

    for product in products:

        if product["status"] == "active":

            urls.append(
                SITE_URL +
                f"product.html?id={product['id']}"
            )

    # REMOVE DUPLICATES

    urls = list(
        dict.fromkeys(urls)
    )

    for url in urls:

        item = ET.SubElement(
            root,
            f"{{{namespace}}}url"
        )

        location = ET.SubElement(
            item,
            f"{{{namespace}}}loc"
        )

        location.text = url

    ET.indent(
        root,
        space="    "
    )

    xml_content = ET.tostring(
        root,
        encoding="unicode"
    )

    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        + xml_content
        + "\n"
    )


# ==========================================
# TEMPORARY FILE WRITER
# ==========================================

def write_temp_file(
    directory,
    suffix,
    content
):

    directory.mkdir(
        parents=True,
        exist_ok=True
    )

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        suffix=suffix,
        prefix="ethorise_",
        dir=directory,
        delete=False
    ) as temporary:

        temporary.write(content)

        return Path(
            temporary.name
        )


# ==========================================
# SAFE WEBSITE EXPORT
# ==========================================

def export_website(products):

    active_products = [
        product
        for product in products
        if product["status"] == "active"
    ]

    if not active_products:

        raise ValueError(
            "No active products found. Export stopped."
        )

    json_content = generate_json(
        active_products
    )

    sitemap_content = generate_sitemap(
        active_products
    )

    temporary_json = None
    temporary_sitemap = None

    json_backup = None
    sitemap_backup = None

    json_replaced = False
    sitemap_replaced = False

    try:

        # GENERATE TEMPORARY FILES

        temporary_json = write_temp_file(
            DATA_DIR,
            ".json",
            json_content
        )

        temporary_sitemap = write_temp_file(
            BASE_DIR,
            ".xml",
            sitemap_content
        )

        # VERIFY JSON

        with temporary_json.open(
            "r",
            encoding="utf-8"
        ) as file:

            verified_json = json.load(
                file
            )

        if not isinstance(
            verified_json,
            list
        ):
            raise ValueError(
                "Generated JSON is invalid."
            )

        # VERIFY XML

        ET.parse(
            temporary_sitemap
        )

        # BACKUP EXISTING FILES

        json_backup = backup_file(
            JSON_FILE,
            "products"
        )

        sitemap_backup = backup_file(
            SITEMAP_FILE,
            "sitemap"
        )

        # REPLACE WEBSITE FILES

        temporary_json.replace(
            JSON_FILE
        )

        json_replaced = True

        temporary_sitemap.replace(
            SITEMAP_FILE
        )

        sitemap_replaced = True

        print(
            f"\n[SUCCESS] Exported {len(active_products)} active products."
        )

        print(
            f"[SITEMAP] {len(STATIC_PAGES) + len(active_products)} URLs generated."
        )

        print(
            f"[FILE] {JSON_FILE}"
        )

        print(
            f"[FILE] {SITEMAP_FILE}"
        )

    except Exception:

        # ROLLBACK IF ONE FILE CHANGED

        if json_replaced:

            if json_backup:
                shutil.copy2(
                    json_backup,
                    JSON_FILE
                )

            elif JSON_FILE.exists():
                JSON_FILE.unlink()

        if sitemap_replaced:

            if sitemap_backup:
                shutil.copy2(
                    sitemap_backup,
                    SITEMAP_FILE
                )

            elif SITEMAP_FILE.exists():
                SITEMAP_FILE.unlink()

        raise

    finally:

        for temporary in [
            temporary_json,
            temporary_sitemap
        ]:

            if (
                temporary is not None
                and temporary.exists()
            ):
                temporary.unlink()


# ==========================================
# MAIN
# ==========================================

def main():

    print(
        "\n======================================"
    )

    print(
        "       ETHORISE PRODUCT MANAGER"
    )

    print(
        "======================================"
    )

    try:

        products = load_csv()

        print(
            f"\nValidated products: {len(products)}"
        )

        export_website(products)

    except Exception as error:

        print(
            f"\n[FAILED] {error}"
        )

        print(
            "[SAFE] Export was not completed."
        )

        raise SystemExit(1)


if __name__ == "__main__":
    main()