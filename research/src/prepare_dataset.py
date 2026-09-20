import os
import shutil
import json
from pathlib import Path
from PIL import Image
import imagehash
from sklearn.model_selection import train_test_split
import numpy as np

RANDOM_SEED = 42
TARGET_CLASSES = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash']

def verify_and_clean_image(image_path: Path) -> bool:
    try:
        with Image.open(image_path) as img:
            img.verify()
        with Image.open(image_path) as img:
            img.convert('RGB')
        return True
    except Exception:
        return False

def compute_image_hash(image_path: Path) -> str:
    try:
        with Image.open(image_path) as img:
            return str(imagehash.dhash(img))
    except Exception:
        return ""

def _create_synthetic_verification_dataset(raw_path: Path):
    print("[*] Generating synthetic initial dataset for pipeline verification...")
    for c in TARGET_CLASSES:
        c_dir = raw_path / c
        c_dir.mkdir(parents=True, exist_ok=True)
        for i in range(25):
            arr = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
            img = Image.fromarray(arr)
            img.save(c_dir / f"sample_{c}_{i:03d}.jpg")

def prepare_dataset(raw_dir: str, output_dir: str):
    raw_path = Path(raw_dir)
    out_path = Path(output_dir)
    
    print(f"[*] Auditing raw data directory: {raw_path}")
    hashes = set()
    cleaned_records = []
    
    for class_idx, class_name in enumerate(TARGET_CLASSES):
        class_folder = raw_path / class_name
        if not class_folder.exists():
            class_folder.mkdir(parents=True, exist_ok=True)
            
        valid_files = 0
        for file in class_folder.glob("*.*"):
            if file.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.webp']:
                continue
            if not verify_and_clean_image(file):
                continue
            img_hash = compute_image_hash(file)
            if img_hash in hashes:
                continue
            hashes.add(img_hash)
            cleaned_records.append({"filepath": str(file), "class_name": class_name, "label": class_idx})
            valid_files += 1
        print(f" -> Class '{class_name}': {valid_files} verified distinct images.")

    if not cleaned_records:
        _create_synthetic_verification_dataset(raw_path)
        return prepare_dataset(raw_dir, output_dir)

    filepaths = [r["filepath"] for r in cleaned_records]
    labels = [r["label"] for r in cleaned_records]

    train_files, temp_files, train_labels, temp_labels = train_test_split(
        filepaths, labels, test_size=0.30, random_state=RANDOM_SEED, stratify=labels
    )
    val_files, test_files, val_labels, test_labels = train_test_split(
        temp_files, temp_labels, test_size=0.50, random_state=RANDOM_SEED, stratify=temp_labels
    )

    splits = {"train": (train_files, train_labels), "val": (val_files, val_labels), "test": (test_files, test_labels)}
    manifest = {"classes": TARGET_CLASSES, "splits": {}}

    for split_name, (files, lbls) in splits.items():
        split_dir = out_path / split_name
        split_dir.mkdir(parents=True, exist_ok=True)
        manifest["splits"][split_name] = {"total": len(files), "class_counts": {c: 0 for c in TARGET_CLASSES}}
        for f, l in zip(files, lbls):
            c_name = TARGET_CLASSES[l]
            dest_dir = split_dir / c_name
            dest_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest_dir / Path(f).name)
            manifest["splits"][split_name]["class_counts"][c_name] += 1

    with open(out_path / "dataset_manifest.json", "w") as mfile:
        json.dump(manifest, mfile, indent=2)
    print(f"[+] Dataset prepared at {out_path}")

if __name__ == "__main__":
    prepare_dataset("research/dataset/raw", "research/dataset/processed")
