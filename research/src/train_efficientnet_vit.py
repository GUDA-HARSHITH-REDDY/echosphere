"""
EfficientNetB0-ViT Hybrid Model for 98% Accuracy Target
Implements the architecture from the paper with advanced training techniques
"""
import os
import json
from copy import deepcopy
from pathlib import Path
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms, datasets
from PIL import Image
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import random

# Set seeds for reproducibility
SEED = 42
torch.manual_seed(SEED)
torch.cuda.manual_seed_all(SEED)
np.random.seed(SEED)
random.seed(SEED)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.set_num_threads(os.cpu_count() or 4)

# Hyperparameters optimized for 98% accuracy
BATCH_SIZE = 16  # Smaller batch for better generalization
NUM_CLASSES = 6
LEARNING_RATE = 1e-4
WEIGHT_DECAY = 1e-3
NUM_EPOCHS = 50
WARMUP_EPOCHS = 5

RESEARCH_DIR = Path(__file__).resolve().parents[1]
PROCESSED_DIR = RESEARCH_DIR / "dataset" / "processed"
RESULTS_DIR = RESEARCH_DIR / "results"
MODELS_DIR = RESEARCH_DIR / "models"
FIGURES_DIR = RESEARCH_DIR / "figures"

# ======================== Vision Transformer Components ========================
class PatchEmbedding(nn.Module):
    """Split image into patches and embed them"""
    def __init__(self, in_channels=1280, patch_size=7, embed_dim=512):
        super().__init__()
        self.patch_size = patch_size
        self.proj = nn.Conv2d(in_channels, embed_dim, kernel_size=patch_size, stride=patch_size)
        self.norm = nn.LayerNorm(embed_dim)
        
    def forward(self, x):
        # x: (B, 1280, 7, 7) from EfficientNet
        x = self.proj(x)  # (B, embed_dim, 1, 1)
        x = x.flatten(2).transpose(1, 2)  # (B, num_patches, embed_dim)
        x = self.norm(x)
        return x

class MultiHeadSelfAttention(nn.Module):
    """Multi-head self-attention mechanism"""
    def __init__(self, embed_dim=512, num_heads=8, dropout=0.1):
        super().__init__()
        self.num_heads = num_heads
        self.head_dim = embed_dim // num_heads
        self.scale = self.head_dim ** -0.5
        
        self.qkv = nn.Linear(embed_dim, embed_dim * 3)
        self.proj = nn.Linear(embed_dim, embed_dim)
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, x):
        B, N, C = x.shape
        qkv = self.qkv(x).reshape(B, N, 3, self.num_heads, self.head_dim).permute(2, 0, 3, 1, 4)
        q, k, v = qkv[0], qkv[1], qkv[2]
        
        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = attn.softmax(dim=-1)
        attn = self.dropout(attn)
        
        x = (attn @ v).transpose(1, 2).reshape(B, N, C)
        x = self.proj(x)
        x = self.dropout(x)
        return x

class TransformerBlock(nn.Module):
    """Transformer encoder block"""
    def __init__(self, embed_dim=512, num_heads=8, mlp_ratio=4.0, dropout=0.1):
        super().__init__()
        self.norm1 = nn.LayerNorm(embed_dim)
        self.attn = MultiHeadSelfAttention(embed_dim, num_heads, dropout)
        self.norm2 = nn.LayerNorm(embed_dim)
        
        mlp_hidden = int(embed_dim * mlp_ratio)
        self.mlp = nn.Sequential(
            nn.Linear(embed_dim, mlp_hidden),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(mlp_hidden, embed_dim),
            nn.Dropout(dropout)
        )
        
    def forward(self, x):
        x = x + self.attn(self.norm1(x))
        x = x + self.mlp(self.norm2(x))
        return x

# ======================== EfficientNetB0-ViT Hybrid Model ========================
class EfficientNetViT(nn.Module):
    """
    Hybrid architecture combining EfficientNetB0 and Vision Transformer
    Target: 98% accuracy
    """
    def __init__(self, num_classes=6, pretrained=True, dropout=0.3):
        super().__init__()
        
        # EfficientNetB0 backbone
        efficientnet = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT if pretrained else None)
        self.features = efficientnet.features  # Output: (B, 1280, 7, 7)
        
        # Vision Transformer components
        self.patch_embed = PatchEmbedding(in_channels=1280, patch_size=7, embed_dim=512)
        
        # Positional embedding
        self.pos_embed = nn.Parameter(torch.zeros(1, 1, 512))
        self.pos_drop = nn.Dropout(dropout)
        
        # Transformer blocks (4 layers for optimal performance)
        self.transformer_blocks = nn.ModuleList([
            TransformerBlock(embed_dim=512, num_heads=8, mlp_ratio=4.0, dropout=dropout)
            for _ in range(4)
        ])
        
        self.norm = nn.LayerNorm(512)
        
        # Classification head
        self.classifier = nn.Sequential(
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(128, num_classes)
        )
        
        # Initialize weights
        self._init_weights()
        
    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.trunc_normal_(m.weight, std=0.02)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.LayerNorm):
                nn.init.constant_(m.bias, 0)
                nn.init.constant_(m.weight, 1.0)
                
    def forward(self, x):
        # EfficientNet feature extraction
        x = self.features(x)  # (B, 1280, 7, 7)
        
        # Patch embedding
        x = self.patch_embed(x)  # (B, 1, 512)
        
        # Add positional embedding
        x = x + self.pos_embed
        x = self.pos_drop(x)
        
        # Apply transformer blocks
        for block in self.transformer_blocks:
            x = block(x)
        
        x = self.norm(x)
        
        # Global average pooling
        x = x.mean(dim=1)  # (B, 512)
        
        # Classification
        x = self.classifier(x)
        return x

# ======================== Advanced Data Augmentation ========================
class MixupDataset(Dataset):
    """Dataset wrapper for Mixup augmentation"""
    def __init__(self, dataset, alpha=0.2):
        self.dataset = dataset
        self.alpha = alpha
        
    def __len__(self):
        return len(self.dataset)
    
    def __getitem__(self, idx):
        img1, label1 = self.dataset[idx]
        
        # Random mixup
        if random.random() < 0.5:
            idx2 = random.randint(0, len(self.dataset) - 1)
            img2, label2 = self.dataset[idx2]
            
            lam = np.random.beta(self.alpha, self.alpha)
            img = lam * img1 + (1 - lam) * img2
            
            return img, label1, label2, lam
        else:
            return img1, label1, label1, 1.0

def mixup_criterion(pred, y_a, y_b, lam):
    """Mixed loss for mixup"""
    return lam * F.cross_entropy(pred, y_a) + (1 - lam) * F.cross_entropy(pred, y_b)

# ======================== Label Smoothing Loss ========================
class LabelSmoothingCrossEntropy(nn.Module):
    """Label smoothing for better generalization"""
    def __init__(self, epsilon=0.1, weight=None):
        super().__init__()
        self.epsilon = epsilon
        self.weight = weight
        
    def forward(self, pred, target):
        n_classes = pred.size(-1)
        log_probs = F.log_softmax(pred, dim=-1)
        
        # Create smoothed labels
        nll_loss = -log_probs.gather(dim=-1, index=target.unsqueeze(1)).squeeze(1)
        smooth_loss = -log_probs.mean(dim=-1)
        
        loss = (1 - self.epsilon) * nll_loss + self.epsilon * smooth_loss
        
        if self.weight is not None:
            loss = loss * self.weight[target]
        
        return loss.mean()

# ======================== Training Functions ========================
def train_one_epoch(model, dataloader, criterion, optimizer, scheduler, epoch, use_mixup=True):
    """Train for one epoch"""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(dataloader, desc=f"Epoch {epoch+1:02d} Train", unit="batch")
    
    for batch in pbar:
        if use_mixup and len(batch) == 4:
            imgs, labels_a, labels_b, lam = batch
            imgs = imgs.to(DEVICE)
            labels_a = labels_a.to(DEVICE)
            labels_b = labels_b.to(DEVICE)
            
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = mixup_criterion(outputs, labels_a, labels_b, lam)
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            optimizer.step()
            
            running_loss += loss.item() * imgs.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (lam * (preds == labels_a).sum().item() + (1 - lam) * (preds == labels_b).sum().item())
            total += imgs.size(0)
        else:
            imgs, labels = batch[:2]
            imgs = imgs.to(DEVICE)
            labels = labels.to(DEVICE)
            
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            optimizer.step()
            
            running_loss += loss.item() * imgs.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += imgs.size(0)
        
        pbar.set_postfix({"loss": f"{running_loss/total:.4f}", "acc": f"{100*correct/total:.2f}%"})
    
    if scheduler is not None:
        scheduler.step()
    
    return running_loss / total, correct / total

def validate(model, dataloader, criterion):
    """Validate the model"""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    with torch.no_grad():
        for imgs, labels in tqdm(dataloader, desc="Validation", unit="batch"):
            imgs = imgs.to(DEVICE)
            labels = labels.to(DEVICE)
            
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * imgs.size(0)
            _, preds = torch.max(outputs, 1)
            correct += (preds == labels).sum().item()
            total += imgs.size(0)
    
    return running_loss / total, correct / total

def test_with_tta(model, dataloader, n_augmentations=5):
    """Test with Test-Time Augmentation for higher accuracy"""
    model.eval()
    all_preds = []
    all_labels = []
    
    # TTA transforms
    tta_transforms = [
        transforms.Compose([
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.1, contrast=0.1),
        ]) for _ in range(n_augmentations)
    ]
    
    with torch.no_grad():
        for imgs, labels in tqdm(dataloader, desc="Testing with TTA", unit="batch"):
            imgs = imgs.to(DEVICE)
            
            # Collect predictions from multiple augmentations
            batch_preds = []
            
            # Original prediction
            outputs = model(imgs)
            batch_preds.append(F.softmax(outputs, dim=1))
            
            # Augmented predictions
            for transform in tta_transforms[:n_augmentations-1]:
                augmented = torch.stack([transform(img.cpu()) for img in imgs]).to(DEVICE)
                outputs = model(augmented)
                batch_preds.append(F.softmax(outputs, dim=1))
            
            # Average predictions
            avg_pred = torch.stack(batch_preds).mean(dim=0)
            _, preds = torch.max(avg_pred, 1)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())
    
    return np.array(all_preds), np.array(all_labels)

# ======================== Main Training Loop ========================
def run_efficientnet_vit_experiment():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(FIGURES_DIR, exist_ok=True)
    
    print(f"[*] Training on device: {DEVICE}")
    print(f"[*] Target: 98% accuracy with EfficientNetB0-ViT hybrid\n")
    
    # Enhanced data augmentation
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.3),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.1, 0.1), scale=(0.9, 1.1)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        transforms.RandomErasing(p=0.3, scale=(0.02, 0.2))
    ])
    
    val_test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Load datasets
    train_ds_base = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "train"), transform=train_transform)
    train_ds = MixupDataset(train_ds_base, alpha=0.2)
    val_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "val"), transform=val_test_transform)
    test_ds = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "test"), transform=val_test_transform)
    
    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True, num_workers=0, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=True)
    test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0, pin_memory=True)
    
    print(f"[*] Dataset sizes: Train={len(train_ds_base)}, Val={len(val_ds)}, Test={len(test_ds)}")
    print(f"[*] Classes: {train_ds_base.classes}\n")
    
    # Calculate class weights
    class_counts = np.bincount([label for _, label in train_ds_base.samples], minlength=NUM_CLASSES)
    class_weights = 1.0 / (class_counts + 1e-5)
    class_weights = torch.tensor(class_weights / class_weights.sum(), dtype=torch.float).to(DEVICE)
    print(f"[*] Class weights: {class_weights.cpu().numpy()}\n")
    
    # Initialize model
    model = EfficientNetViT(num_classes=NUM_CLASSES, pretrained=True, dropout=0.3).to(DEVICE)
    
    # Count parameters
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[*] Model parameters: {total_params:,} total, {trainable_params:,} trainable\n")
    
    # Loss and optimizer
    criterion = LabelSmoothingCrossEntropy(epsilon=0.1, weight=class_weights)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)
    
    # Learning rate scheduler with warmup
    def warmup_lambda(epoch):
        if epoch < WARMUP_EPOCHS:
            return (epoch + 1) / WARMUP_EPOCHS
        return 0.5 * (1 + np.cos(np.pi * (epoch - WARMUP_EPOCHS) / (NUM_EPOCHS - WARMUP_EPOCHS)))
    
    scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda=warmup_lambda)
    
    # Training loop
    print("[*] Starting training...\n")
    best_val_acc = 0.0
    best_model_state = None
    patience = 10
    patience_counter = 0
    
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": []}
    
    for epoch in range(NUM_EPOCHS):
        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, scheduler, epoch, use_mixup=True)
        val_loss, val_acc = validate(model, val_loader, criterion)
        
        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)
        
        print(f"Epoch [{epoch+1:02d}/{NUM_EPOCHS}] "
              f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc*100:.2f}% | "
              f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc*100:.2f}% | "
              f"LR: {optimizer.param_groups[0]['lr']:.6f}")
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_model_state = deepcopy(model.state_dict())
            patience_counter = 0
            print(f"    → New best validation accuracy: {best_val_acc*100:.2f}%")
        else:
            patience_counter += 1
            
        # Early stopping
        if patience_counter >= patience:
            print(f"\n[!] Early stopping triggered after {epoch+1} epochs")
            break
    
    # Load best model
    model.load_state_dict(best_model_state)
    
    # Test with TTA
    print("\n[*] Evaluating best model on test set with Test-Time Augmentation...")
    y_preds, y_test = test_with_tta(model, test_loader, n_augmentations=5)
    
    # Calculate metrics
    test_acc = float(np.mean(y_test == y_preds))
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_preds, average='weighted', zero_division=0)
    
    print(f"\n{'='*60}")
    print(f"[+] FINAL TEST RESULTS")
    print(f"{'='*60}")
    print(f"Accuracy:  {test_acc*100:.2f}%")
    print(f"Precision: {precision*100:.2f}%")
    print(f"Recall:    {recall*100:.2f}%")
    print(f"F1-Score:  {f1*100:.2f}%")
    print(f"{'='*60}\n")
    
    # Detailed classification report
    report = classification_report(y_test, y_preds, target_names=train_ds_base.classes, output_dict=True, zero_division=0)
    print(classification_report(y_test, y_preds, target_names=train_ds_base.classes, zero_division=0))
    
    # Save model
    model_path = MODELS_DIR / "efficientnet_vit_98percent.pth"
    torch.save(model.state_dict(), model_path)
    print(f"[+] Model saved to: {model_path}")
    
    # Save complete model for inference
    torch.save({
        'model_state_dict': model.state_dict(),
        'model_architecture': 'EfficientNetB0-ViT',
        'num_classes': NUM_CLASSES,
        'classes': train_ds_base.classes,
        'test_accuracy': test_acc,
        'test_precision': precision,
        'test_recall': recall,
        'test_f1': f1
    }, MODELS_DIR / "efficientnet_vit_complete.pth")
    
    # Save results
    results = {
        "model": "EfficientNetB0-ViT Hybrid",
        "test_accuracy": float(test_acc),
        "test_precision": float(precision),
        "test_recall": float(recall),
        "test_f1": float(f1),
        "best_val_accuracy": float(best_val_acc),
        "classification_report": report,
        "hyperparameters": {
            "batch_size": BATCH_SIZE,
            "learning_rate": LEARNING_RATE,
            "weight_decay": WEIGHT_DECAY,
            "num_epochs": NUM_EPOCHS,
            "warmup_epochs": WARMUP_EPOCHS,
            "label_smoothing": 0.1,
            "mixup_alpha": 0.2,
            "dropout": 0.3,
            "tta_augmentations": 5
        },
        "dataset": {
            "train_size": len(train_ds_base),
            "val_size": len(val_ds),
            "test_size": len(test_ds),
            "classes": train_ds_base.classes
        }
    }
    
    with open(RESULTS_DIR / "efficientnet_vit_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    
    # Plot confusion matrix
    cm = confusion_matrix(y_test, y_preds)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", 
                xticklabels=train_ds_base.classes, 
                yticklabels=train_ds_base.classes,
                cbar_kws={'label': 'Count'})
    plt.title(f"EfficientNetB0-ViT Confusion Matrix\nTest Accuracy: {test_acc*100:.2f}%", fontsize=14, fontweight='bold')
    plt.ylabel("True Label", fontsize=12)
    plt.xlabel("Predicted Label", fontsize=12)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "efficientnet_vit_confusion_matrix.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    # Plot training history
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    epochs_range = range(1, len(history["train_loss"]) + 1)
    
    ax1.plot(epochs_range, history["train_loss"], 'b-', label='Train Loss', linewidth=2)
    ax1.plot(epochs_range, history["val_loss"], 'r-', label='Val Loss', linewidth=2)
    ax1.set_xlabel("Epoch", fontsize=12)
    ax1.set_ylabel("Loss", fontsize=12)
    ax1.set_title("Training and Validation Loss", fontsize=14, fontweight='bold')
    ax1.legend(fontsize=10)
    ax1.grid(True, alpha=0.3)
    
    ax2.plot(epochs_range, [acc*100 for acc in history["train_acc"]], 'b-', label='Train Acc', linewidth=2)
    ax2.plot(epochs_range, [acc*100 for acc in history["val_acc"]], 'r-', label='Val Acc', linewidth=2)
    ax2.axhline(y=98, color='g', linestyle='--', label='Target (98%)', linewidth=2)
    ax2.set_xlabel("Epoch", fontsize=12)
    ax2.set_ylabel("Accuracy (%)", fontsize=12)
    ax2.set_title("Training and Validation Accuracy", fontsize=14, fontweight='bold')
    ax2.legend(fontsize=10)
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "efficientnet_vit_training_history.png", dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"[+] Confusion matrix saved to: {FIGURES_DIR}/efficientnet_vit_confusion_matrix.png")
    print(f"[+] Training history saved to: {FIGURES_DIR}/efficientnet_vit_training_history.png")
    print(f"[+] Results saved to: {RESULTS_DIR}/efficientnet_vit_results.json")
    
    return test_acc

if __name__ == "__main__":
    final_accuracy = run_efficientnet_vit_experiment()
    print(f"\n{'='*60}")
    print(f"TRAINING COMPLETE!")
    print(f"Final Test Accuracy: {final_accuracy*100:.2f}%")
    print(f"{'='*60}")
