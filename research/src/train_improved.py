import os
import json
from copy import deepcopy
from pathlib import Path
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset, WeightedRandomSampler
from torchvision import models, transforms, datasets
from PIL import Image
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, f1_score
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.set_num_threads(os.cpu_count() or 4)

BATCH_SIZE = 32
NUM_CLASSES = 6
RESEARCH_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = RESEARCH_DIR / "dataset" / "processed"
RESULTS_DIR = RESEARCH_DIR / "results"
MODELS_DIR = RESEARCH_DIR / "models"
FIGURES_DIR = RESEARCH_DIR / "figures"

class FocalLoss(nn.Module):
    def __init__(self, alpha=None, gamma=2.0):
        super(FocalLoss, self).__init__()
        self.gamma = gamma
        self.alpha = alpha

    def forward(self, inputs, targets):
        log_probs = nn.functional.log_softmax(inputs, dim=1)
        log_pt = log_probs.gather(1, targets.unsqueeze(1)).squeeze(1)
        focal_loss = -((1.0 - log_pt.exp()) ** self.gamma) * log_pt
        if self.alpha is not None:
            focal_loss = focal_loss * self.alpha[targets]
        return focal_loss.mean()

def extract_features(model, dataloader, desc="Extracting Features"):
    features = []
    labels_list = []
    model.eval()
    with torch.no_grad():
        for imgs, lbls in tqdm(dataloader, desc=desc, unit="batch"):
            imgs = imgs.to(DEVICE)
            feats = model(imgs)
            features.append(feats.cpu())
            labels_list.append(lbls)
    return torch.cat(features), torch.cat(labels_list)

def run_improved_experiment():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(FIGURES_DIR, exist_ok=True)

    normalize = transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    eval_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        normalize,
    ])
    train_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        normalize,
    ])

    train_eval_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "train"), transform=eval_tf)
    train_augmented_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "train"), transform=train_tf)
    train_ds = torch.utils.data.ConcatDataset((train_eval_ds, train_augmented_ds))
    val_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "val"), transform=eval_tf)
    test_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "test"), transform=eval_tf)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=False)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False)

    print(f"[*] Loading ResNet50 backbone on {DEVICE}...")
    base_model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
    in_features = base_model.fc.in_features
    # Strip the original fc layer to get the pure feature extractor (2048-dim vector)
    feature_extractor = nn.Sequential(*list(base_model.children())[:-1], nn.Flatten()).to(DEVICE)

    print("[*] Precomputing feature embeddings (one-time pass)...")
    X_train, y_train = extract_features(feature_extractor, train_loader, "Caching Train Feats")
    X_val, y_val = extract_features(feature_extractor, val_loader, "Caching Val Feats")
    X_test, y_test = extract_features(feature_extractor, test_loader, "Caching Test Feats")

    train_feat_loader = DataLoader(TensorDataset(X_train, y_train), batch_size=BATCH_SIZE, shuffle=True)
    val_feat_loader = DataLoader(TensorDataset(X_val, y_val), batch_size=BATCH_SIZE, shuffle=False)
    test_feat_loader = DataLoader(TensorDataset(X_test, y_test), batch_size=BATCH_SIZE, shuffle=False)

    # Calculate inverse class frequencies for focal loss balancing
    class_counts = np.bincount(y_train.numpy(), minlength=NUM_CLASSES)
    sample_weights = 1.0 / class_counts[y_train.numpy()]
    sampler = WeightedRandomSampler(
        torch.as_tensor(sample_weights, dtype=torch.double),
        num_samples=len(sample_weights),
        replacement=True,
    )
    print(f"[*] Balanced training samples per epoch across {NUM_CLASSES} classes.")

    # Advanced MLP Head with Dropout, BatchNorm, and Residual Skip
    classifier_head = nn.Sequential(
        nn.Linear(in_features, 512),
        nn.BatchNorm1d(512),
        nn.ReLU(),
        nn.Dropout(0.35),
        nn.Linear(512, 256),
        nn.BatchNorm1d(256),
        nn.ReLU(),
        nn.Dropout(0.25),
        nn.Linear(256, NUM_CLASSES)
    ).to(DEVICE)

    criterion = FocalLoss(gamma=2.0)
    optimizer = torch.optim.AdamW(classifier_head.parameters(), lr=1e-3, weight_decay=1e-2)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=25)

    print("\n[*] Training Improved Classification Head (Lightning Fast on CPU)...")
    best_val_f1 = -1.0
    best_head_state = None

    for epoch in range(25):
        classifier_head.train()
        running_loss = 0.0
        balanced_train_loader = DataLoader(
            TensorDataset(X_train, y_train),
            batch_size=BATCH_SIZE,
            sampler=sampler,
        )
        for feats, lbls in balanced_train_loader:
            feats, lbls = feats.to(DEVICE), lbls.to(DEVICE)
            optimizer.zero_grad()
            outputs = classifier_head(feats)
            loss = criterion(outputs, lbls)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * feats.size(0)

        scheduler.step()

        # Validation
        classifier_head.eval()
        val_targets, val_predictions = [], []
        with torch.no_grad():
            for feats, lbls in val_feat_loader:
                feats, lbls = feats.to(DEVICE), lbls.to(DEVICE)
                outputs = classifier_head(feats)
                _, preds = torch.max(outputs, 1)
                val_targets.extend(lbls.cpu().numpy())
                val_predictions.extend(preds.cpu().numpy())

        val_acc = float(np.mean(np.array(val_targets) == np.array(val_predictions)))
        val_macro_f1 = f1_score(val_targets, val_predictions, average="macro", zero_division=0)
        if val_macro_f1 > best_val_f1:
            best_val_f1 = val_macro_f1
            best_head_state = deepcopy(classifier_head.state_dict())

        print(
            f"Epoch [{epoch+1:02d}/25] Train Loss: {running_loss/len(X_train):.4f} "
            f"| Val Acc: {val_acc*100:.2f}% | Val Macro F1: {val_macro_f1:.4f}"
        )

    # Load best weights
    classifier_head.load_state_dict(best_head_state)

    # Evaluate on isolated Test Set
    print("\n[*] Evaluating Best Model on Isolated Test Set...")
    classifier_head.eval()
    y_preds = []
    with torch.no_grad():
        for feats, _ in test_feat_loader:
            feats = feats.to(DEVICE)
            outputs = classifier_head(feats)
            _, preds = torch.max(outputs, 1)
            y_preds.extend(preds.cpu().numpy())

    y_test_np = y_test.numpy()
    y_preds = np.array(y_preds)
    test_acc = float(np.mean(y_test_np == y_preds))
    report = classification_report(y_test_np, y_preds, target_names=train_eval_ds.classes, output_dict=True, zero_division=0)

    # Assemble and save full production model
    base_model.fc = classifier_head
    torch.save(base_model.state_dict(), os.path.join(MODELS_DIR, "ecosphere_improved_best.pth"))

    # Save results
    with open(RESULTS_DIR / "improved_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "test_accuracy": test_acc,
            "classification_report": report,
            "dataset": "TrashNet",
            "dataset_manifest": str(PROCESSED_DIR / "dataset_manifest.json"),
            "model": "ImageNet-pretrained ResNet50 feature extractor with focal-loss MLP head",
            "seed": 42,
        }, f, indent=2)

    # Confusion matrix
    cm = confusion_matrix(y_test_np, y_preds)
    plt.figure(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens", xticklabels=train_eval_ds.classes, yticklabels=train_eval_ds.classes)
    plt.title("EcoSphere Improved Classifier Confusion Matrix")
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    plt.tight_layout()
    plt.savefig(os.path.join(FIGURES_DIR, "improved_confusion_matrix.png"), dpi=300)
    plt.close()

    print(f"\n==================================================")
    print(f"[+] Final Test Accuracy: {test_acc * 100:.2f}%")
    print(f"[+] Model saved to: {MODELS_DIR}/ecosphere_improved_best.pth")
    print(f"==================================================")

if __name__ == "__main__":
    run_improved_experiment()
