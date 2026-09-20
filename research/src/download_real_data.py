import os
import shutil
import zipfile
import urllib.request
from pathlib import Path

RAW_DIR = Path("research/dataset/raw")
TARGET_CLASSES = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash']

# Wipe existing raw directory
if RAW_DIR.exists():
    shutil.rmtree(RAW_DIR)
RAW_DIR.mkdir(parents=True, exist_ok=True)

# Check if the zip is already in the HF cache from the previous step
cache_dir = Path.home() / ".cache" / "huggingface" / "hub"
cached_zips = list(cache_dir.glob("**/dataset-resized.zip"))

zip_path = Path("research/dataset/dataset-resized.zip")

if cached_zips and cached_zips[0].exists():
    print(f"[*] Found already-downloaded zip in cache: {cached_zips[0]}")
    shutil.copy2(cached_zips[0], zip_path)
else:
    print("[*] Downloading clean dataset zip directly (approx 42 MB)...")
    url = "https://github.com/garythung/trashnet/raw/master/data/dataset-resized.zip"
    urllib.request.urlretrieve(url, zip_path)

print("[*] Extracting images into research/dataset/raw...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall("research/dataset/temp_extract")

# Move folders into research/dataset/raw/<class_name>
extracted_root = Path("research/dataset/temp_extract")
# Find folder containing class subfolders
found_dir = None
for p in extracted_root.rglob("*"):
    if p.is_dir() and p.name in TARGET_CLASSES:
        found_dir = p.parent
        break

if found_dir:
    for c in TARGET_CLASSES:
        src_c = found_dir / c
        dst_c = RAW_DIR / c
        dst_c.mkdir(parents=True, exist_ok=True)
        if src_c.exists():
            for img in src_c.glob("*.*"):
                if img.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                    shutil.copy2(img, dst_c / img.name)
            count = len(list(dst_c.glob('*.*')))
            print(f" -> Class '{c}': {count} images loaded.")

# Cleanup temp files
shutil.rmtree(extracted_root, ignore_errors=True)
if zip_path.exists():
    zip_path.unlink()

print("\n[+] Success! Real waste dataset ready in research/dataset/raw")
