import os
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset, TensorDataset
from torchvision import models, transforms, datasets
from PIL import Image
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.set_num_threads(os.cpu_count() or 4)

BATCH_SIZE = 32
NUM_CLASSES = 6
PROCESSED_DIR = "research/dataset/processed"
RESULTS_DIR = "research/results"
MODELS_DIR = "research/models"
FIGURES_DIR = "research/figures"

class FocalLoss(nn.Module):
    def __init__(self, alpha=None, gamma=2.0):
        super(FocalLoss, self).__init__()
        self.gamma = gamma
        self.alpha = alpha

    def forward(self, inputs, targets):
        ce_loss = nn.functional.cross_entropy(inputs, targets, reduction='none', weight=self.alpha)
        pt = torch.exp(-ce_loss)
        focal_loss = ((1.0 - pt) ** self.gamma) * ce_loss
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

    # Standardized preprocessing
    tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "train"), transform=tf)
    val_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "val"), transform=tf)
    test_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "test"), transform=tf)

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
    class_weights = 1.0 / (class_counts + 1e-5)
    class_weights = torch.tensor(class_weights / class_weights.sum(), dtype=torch.float).to(DEVICE)

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

    criterion = FocalLoss(alpha=class_weights, gamma=2.0)
    optimizer = torch.optim.AdamW(classifier_head.parameters(), lr=1e-3, weight_decay=1e-2)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=20)

    print("\n[*] Training Improved Classification Head (Lightning Fast on CPU)...")
    best_val_acc = 0.0
    best_head_state = None

    for epoch in range(25):
        classifier_head.train()
        running_loss = 0.0
        for feats, lbls in train_feat_loader:
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
        correct, total = 0, 0
        with torch.no_grad():
            for feats, lbls in val_feat_loader:
                feats, lbls = feats.to(DEVICE), lbls.to(DEVICE)
                outputs = classifier_head(feats)
                _, preds = torch.max(outputs, 1)
                correct += torch.sum(preds == lbls).item()
                total += lbls.size(0)

        val_acc = correct / max(total, 1)
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_head_state = classifier_head.state_dict().copy()

        print(f"Epoch [{epoch+1:02d}/25] Train Loss: {running_loss/len(X_train):.4f} | Val Acc: {val_acc*100:.2f}%")

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
    report = classification_report(y_test_np, y_preds, target_names=train_ds.classes, output_dict=True, zero_division=0)

    # Assemble and save full production model
    base_model.fc = classifier_head
    torch.save(base_model.state_dict(), os.path.join(MODELS_DIR, "ecosphere_improved_best.pth"))

    # Save results
    with open(os.path.join(RESULTS_DIR, "improved_results.json"), "w") as f:
        json.dump({"test_accuracy": test_acc, "classification_report": report}, f, indent=2)

    # Confusion matrix
    cm = confusion_matrix(y_test_np, y_preds)
    plt.figure(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens", xticklabels=train_ds.classes, yticklabels=train_ds.classes)
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
