"""
ETHORISE PRODUCT MANAGER

Amazon + AliExpress Affiliate Product Management

Features:
- CSV Product Import
- Product Validation
- Duplicate Detection
- Product Tags
- Related Product IDs
- Affiliate URL Validation
- Product Status
- Automatic Backup
- Safe JSON Export

No external Python packages required.
"""

import csv
import json
import shutil
import tempfile
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

BACKUP_DIR = DATA_DIR / "backups"


# ==========================================
# CONFIGURATION
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
    ids = []

    for item in parse_list(value):
        if not item.isdigit():
            raise ValueError(
                f"Invalid related product ID: {item}"
            )

        ids.append(int(item))

    return ids


def valid_url(value):
    try:
        parsed = urlparse(value)

        return (
            parsed.scheme == "https"
            and bool(parsed.hostname)
        )

    except ValueError:
        return False


def normalize_url(value):
    parsed = urlparse(value)

    return (
        parsed.scheme.lower(),
        (parsed.hostname or "").lower(),
        parsed.path.rstrip("/"),
    )


# ==========================================
# BACKUP
# ==========================================

def create_backup():
    if not JSON_FILE.exists():
        return

    BACKUP_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S_%f"
    )

    backup_file = BACKUP_DIR / (
        f"products_{timestamp}.json"
    )

    shutil.copy2(
        JSON_FILE,
        backup_file
    )

    print(
        f"[BACKUP] {backup_file.name}"
    )


# ==========================================
# VALIDATE PRODUCT
# ==========================================

def validate_product(row, row_number):
    errors = []

    product_id_text = clean(
        row.get("id")
    )

    if not product_id_text.isdigit():
        errors.append("Invalid product ID")
        product_id = None
    else:
        product_id = int(product_id_text)

        if product_id <= 0:
            errors.append("Product ID must be positive")

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
            f"Invalid affiliate platform: {platform}"
        )

    affiliate_link = clean(
        row.get("affiliateLink")
    )

    if not valid_url(affiliate_link):
        errors.append(
            "Invalid affiliate link"
        )

    product_url = clean(
        row.get("productUrl")
    )

    if not valid_url(product_url):
        errors.append(
            "Invalid product URL"
        )

    image = clean(row.get("image"))

    if not valid_url(image):
        errors.append(
            "Invalid image URL"
        )

    countries = parse_list(
        row.get("countries")
    )

    if not countries:
        errors.append(
            "At least one target country required"
        )

    for country in countries:
        if country not in ALLOWED_COUNTRIES:
            errors.append(
                f"Invalid country: {country}"
            )

    tags = parse_list(
        row.get("tags")
    )

    try:
        related_ids = parse_ids(
            row.get("relatedProductIds")
        )
    except ValueError as error:
        errors.append(str(error))
        related_ids = []

    status = clean(
        row.get("status")
    ) or "active"

    if status not in ALLOWED_STATUSES:
        errors.append(
            f"Invalid status: {status}"
        )

    asin = clean(
        row.get("asin")
    )

    if platform == "Amazon":
        if len(asin) != 10 or not asin.isalnum():
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
        "images": [image],
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

        required_columns = {
            "id",
            "name",
            "brand",
            "category",
            "subcategory",
            "description",
            "features",
            "image",
            "countries",
            "affiliatePlatform",
            "affiliateLink",
            "productUrl",
            "asin",
            "tags",
            "relatedProductIds",
            "status",
        }

        missing = required_columns - set(
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

            if platform == "Amazon" and asin in seen_asins:
                print(
                    f"[DUPLICATE] Row {row_number}: ASIN {asin}"
                )

                errors_found = True
                continue

            seen_ids.add(product_id)
            seen_urls.add(url_key)

            if platform == "Amazon":
                seen_asins.add(asin)

            products.append(product)

    # Validate related IDs after loading all products.
    valid_ids = {
        product["id"]
        for product in products
    }

    for product in products:
        for related_id in product["relatedProductIds"]:
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
            "Validation failed. Existing JSON was not replaced."
        )

    return products


# ==========================================
# SAFE JSON EXPORT
# ==========================================

def export_json(products):
    if not products:
        print(
            "[STOPPED] No valid products found."
        )
        return

    active_products = [
        product
        for product in products
        if product["status"] == "active"
    ]

    if not active_products:
        print(
            "[STOPPED] No active products found."
        )
        return

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".json",
            prefix="ethorise_",
            dir=DATA_DIR,
            delete=False
        ) as temp_file:

            json.dump(
                active_products,
                temp_file,
                indent=2,
                ensure_ascii=False
            )

            temp_path = Path(
                temp_file.name
            )

        # Ensure generated JSON is readable.
        with temp_path.open(
            "r",
            encoding="utf-8"
        ) as file:
            json.load(file)

        create_backup()

        temp_path.replace(
            JSON_FILE
        )

        print(
            f"\n[SUCCESS] Exported {len(active_products)} active products."
        )

        print(
            f"[FILE] {JSON_FILE}"
        )

    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()


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

        export_json(products)

    except Exception as error:
        print(
            f"\n[FAILED] {error}"
        )

        print(
            "[SAFE] Existing products.json was not replaced."
        )


if __name__ == "__main__":
    main()