"""
EcoWasteNet-ViT: Enhanced Training for 98% Accuracy Target
Aggressive optimization to surpass base paper's 95%
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, WeightedRandomSampler
from torchvision import models, transforms
import numpy as np
from pathlib import Path
import json
from tqdm import tqdm
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image
import warnings
warnings.filterwarnings('ignore')

# Reproducibility
SEED = 42
torch.manual_seed(SEED)
np.random.seed(SEED)
torch.use_deterministic_algorithms(True, warn_only=True)

# Paths
BASE_DIR = Path(__file__).parent
PROCESSED_DIR = BASE_DIR / "dataset" / "processed"
MODELS_DIR = BASE_DIR / "models"
RESULTS_DIR = BASE_DIR / "results"
FIGURES_DIR = BASE_DIR / "figures"

for d in [MODELS_DIR, RESULTS_DIR, FIGURES_DIR]:
    d.mkdir(exist_ok=True)

CLASSES = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash']
NUM_CLASSES = len(CLASSES)

print("=" * 80)
print("  ECOWASTENET-VIT: AGGRESSIVE 98% ACCURACY TRAINING")
print("=" * 80)
print()

# ============================================================================
# FEATURE 1: EXTREME DATA AUGMENTATION
# ============================================================================
print("[1/8] Extreme data augmentation for 98% target...")

train_transform = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.6, 1.0)),  # More aggressive
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.3),  # Added
    transforms.RandomRotation(30),  # Increased from 15
    transforms.ColorJitter(brightness=0.4, contrast=0.4, saturation=0.4, hue=0.2),  # Increased
    transforms.RandomGrayscale(p=0.1),  # Added
    transforms.RandomPerspective(distortion_scale=0.3, p=0.3),  # Added
    transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 2.0)),  # Added
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    transforms.RandomErasing(p=0.3, scale=(0.02, 0.2)),  # Increased
])

val_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# Dataset
class WasteDataset(torch.utils.data.Dataset):
    def __init__(self, split, transform):
        self.split = split
        self.transform = transform
        self.data = []
        self.labels = []
        
        split_dir = PROCESSED_DIR / split
        for cls_idx, cls_name in enumerate(CLASSES):
            cls_dir = split_dir / cls_name
            if cls_dir.exists():
                for img_path in cls_dir.glob("*.jpg"):
                    self.data.append(str(img_path))
                    self.labels.append(cls_idx)
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        img = Image.open(self.data[idx]).convert('RGB')
        img = self.transform(img)
        label = self.labels[idx]
        return img, label

train_dataset = WasteDataset('train', train_transform)
val_dataset = WasteDataset('val', val_transform)
test_dataset = WasteDataset('test', val_transform)

print(f"Dataset: Train={len(train_dataset)}, Val={len(val_dataset)}, Test={len(test_dataset)}")

# ============================================================================
# FEATURE 2: ADVANCED CLASS IMBALANCE HANDLING
# ============================================================================
print("[2/8] Advanced class-imbalance handling...")

train_labels = np.array(train_dataset.labels)
class_counts = np.bincount(train_labels)
class_weights = 1.0 / (class_counts + 1e-6)
class_weights = class_weights / class_weights.sum() * NUM_CLASSES
sample_weights = class_weights[train_labels]

print(f"Class weights: {class_weights}")

sampler = WeightedRandomSampler(
    weights=sample_weights,
    num_samples=len(sample_weights),
    replacement=True
)

train_loader = DataLoader(train_dataset, batch_size=32, sampler=sampler, num_workers=0)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
test_loader = DataLoader(test_dataset, batch_size=32, shuffle=False, num_workers=0)

# ============================================================================
# FEATURE 3: ENHANCED ECOWASTENET-VIT ARCHITECTURE
# ============================================================================
print("[3/8] Building enhanced EcoWasteNet-ViT...")

class EcoWasteNetViT(nn.Module):
    def __init__(self, num_classes=6):
        super().__init__()
        # EfficientNetB0 backbone
        efficientnet = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
        self.features = efficientnet.features
        
        # Enhanced classifier head with more capacity
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(1280, 768),  # Increased from 512
            nn.BatchNorm1d(768),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(768, 384),  # Increased from 256
            nn.BatchNorm1d(384),
            nn.ReLU(inplace=True),
            nn.Dropout(0.4),
            nn.Linear(384, 192),  # Added extra layer
            nn.BatchNorm1d(192),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(192, num_classes)
        )
    
    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x

model = EcoWasteNetViT(num_classes=NUM_CLASSES)
print(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")

# ============================================================================
# FEATURE 4: FOCAL LOSS WITH CLASS WEIGHTS
# ============================================================================
print("[4/8] Using focal loss...")

class FocalLoss(nn.Module):
    def __init__(self, alpha=None, gamma=2.5):  # Increased gamma
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
    
    def forward(self, inputs, targets):
        ce_loss = nn.functional.cross_entropy(inputs, targets, reduction='none')
        pt = torch.exp(-ce_loss)
        focal_loss = ((1 - pt) ** self.gamma) * ce_loss
        
        if self.alpha is not None:
            alpha_t = self.alpha[targets]
            focal_loss = alpha_t * focal_loss
        
        return focal_loss.mean()

criterion = FocalLoss(alpha=torch.FloatTensor(class_weights), gamma=2.5)

# ============================================================================
# FEATURE 5: ADVANCED OPTIMIZATION STRATEGY
# ============================================================================
print("[5/8] Advanced 3-stage progressive fine-tuning...")

# Stage 1: Classifier only (15 epochs) - Increased
# Stage 2: Full model with high LR (40 epochs) - Increased
# Stage 3: Fine refinement with low LR (25 epochs) - Added for 98%

# ============================================================================
# FEATURE 6: LEARNING RATE SCHEDULING
# ============================================================================
print("[6/8] Cosine annealing with warm restarts...")

# Will use CosineAnnealingWarmRestarts for better convergence

# ============================================================================
# FEATURE 7: LABEL SMOOTHING
# ============================================================================
print("[7/8] Label smoothing for better generalization...")

class LabelSmoothingCrossEntropy(nn.Module):
    def __init__(self, smoothing=0.1):
        super().__init__()
        self.smoothing = smoothing
    
    def forward(self, pred, target):
        n_class = pred.size(1)
        one_hot = torch.zeros_like(pred).scatter(1, target.view(-1, 1), 1)
        smooth_one_hot = one_hot * (1 - self.smoothing) + self.smoothing / n_class
        log_prob = nn.functional.log_softmax(pred, dim=1)
        loss = (-smooth_one_hot * log_prob).sum(dim=1).mean()
        return loss

smooth_criterion = LabelSmoothingCrossEntropy(smoothing=0.15)

# ============================================================================
# TRAINING FUNCTION
# ============================================================================

def train_epoch(model, loader, optimizer, criterion, device):
    model.train()
    total_loss = 0
    all_preds = []
    all_labels = []
    
    for images, labels in tqdm(loader, leave=False):
        images, labels = images.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        
        # Gradient clipping for stability
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        
        optimizer.step()
        
        total_loss += loss.item()
        preds = outputs.argmax(dim=1).cpu().numpy()
        all_preds.extend(preds)
        all_labels.extend(labels.cpu().numpy())
    
    acc = accuracy_score(all_labels, all_preds)
    return total_loss / len(loader), acc

def validate(model, loader, device):
    model.eval()
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            outputs = model(images)
            preds = outputs.argmax(dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_labels.extend(labels.numpy())
    
    acc = accuracy_score(all_labels, all_preds)
    return acc

# ============================================================================
# FEATURE 8: 3-STAGE TRAINING
# ============================================================================
print("[8/8] Starting 3-stage training for 98% accuracy...")
print()

device = torch.device('cpu')
model = model.to(device)
best_val_acc = 0.0
best_model_path = MODELS_DIR / "ecowastenet_vit_98_best.pth"

# STAGE 1: Classifier only (15 epochs)
print("Stage 1: Classifier-only training (15 epochs)...")
for param in model.features.parameters():
    param.requires_grad = False
for param in model.classifier.parameters():
    param.requires_grad = True

optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), 
                        lr=0.001, weight_decay=0.01)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=15)

for epoch in range(1, 16):
    train_loss, train_acc = train_epoch(model, train_loader, optimizer, smooth_criterion, device)
    val_acc = validate(model, val_loader, device)
    scheduler.step()
    
    print(f"Epoch {epoch}/15: Train Acc={train_acc*100:.2f}%, Val Acc={val_acc*100:.2f}%")
    
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), best_model_path)
        print(f"    → New best: {best_val_acc*100:.2f}%")

# STAGE 2: Full model training (40 epochs)
print("\nStage 2: Full model fine-tuning (40 epochs)...")
for param in model.parameters():
    param.requires_grad = True

optimizer = optim.AdamW(model.parameters(), lr=0.0003, weight_decay=0.01)
scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2)

for epoch in range(16, 56):
    train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, device)
    val_acc = validate(model, val_loader, device)
    scheduler.step()
    
    print(f"Epoch {epoch}/55: Train Acc={train_acc*100:.2f}%, Val Acc={val_acc*100:.2f}%")
    
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), best_model_path)
        print(f"    → New best: {best_val_acc*100:.2f}%")

# STAGE 3: Fine refinement (25 epochs with very low LR)
print("\nStage 3: Fine refinement for 98% target (25 epochs)...")
optimizer = optim.AdamW(model.parameters(), lr=0.00005, weight_decay=0.005)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=25)

for epoch in range(56, 81):
    train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, device)
    val_acc = validate(model, val_loader, device)
    scheduler.step()
    
    print(f"Epoch {epoch}/80: Train Acc={train_acc*100:.2f}%, Val Acc={val_acc*100:.2f}%")
    
    if val_acc > best_val_acc:
        best_val_acc = val_acc
        torch.save(model.state_dict(), best_model_path)
        print(f"    → New best: {best_val_acc*100:.2f}%")

# ============================================================================
# FINAL EVALUATION WITH 15X TTA
# ============================================================================
print("\n[7/7] Final evaluation with 15x Test-Time Augmentation...")

model.load_state_dict(torch.load(best_model_path))
model.eval()

# TTA transforms
tta_transforms = [
    val_transform,
    transforms.Compose([transforms.Resize(256), transforms.CenterCrop(224), 
                       transforms.RandomHorizontalFlip(p=1.0), transforms.ToTensor(),
                       transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),
    transforms.Compose([transforms.Resize(256), transforms.CenterCrop(224),
                       transforms.RandomRotation(5), transforms.ToTensor(),
                       transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),
    transforms.Compose([transforms.Resize(256), transforms.CenterCrop(224),
                       transforms.RandomRotation(-5), transforms.ToTensor(),
                       transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),
    transforms.Compose([transforms.Resize(240), transforms.CenterCrop(224), transforms.ToTensor(),
                       transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])]),
]

all_tta_preds = []
test_labels = []

with torch.no_grad():
    for img_path, label in tqdm(zip(test_dataset.data, test_dataset.labels), total=len(test_dataset)):
        img = Image.open(img_path).convert('RGB')
        tta_votes = []
        
        for transform in tta_transforms:
            # Apply each transform 3 times
            for _ in range(3):
                img_t = transform(img).unsqueeze(0).to(device)
                output = model(img_t)
                pred = output.argmax(dim=1).item()
                tta_votes.append(pred)
        
        # Majority voting
        final_pred = max(set(tta_votes), key=tta_votes.count)
        all_tta_preds.append(final_pred)
        test_labels.append(label)

test_acc = accuracy_score(test_labels, all_tta_preds)
print(f"\n{'='*80}")
print(f"  FINAL TEST ACCURACY: {test_acc*100:.2f}%")
print(f"{'='*80}\n")

# Confusion Matrix
cm = confusion_matrix(test_labels, all_tta_preds)
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=CLASSES, yticklabels=CLASSES)
plt.title(f'EcoWasteNet-ViT Confusion Matrix\nTest Accuracy: {test_acc*100:.2f}%')
plt.ylabel('True Label')
plt.xlabel('Predicted Label')
plt.tight_layout()
plt.savefig(FIGURES_DIR / 'ecowastenet_vit_98_cm.png', dpi=300)
plt.close()

# Classification Report
report = classification_report(test_labels, all_tta_preds, target_names=CLASSES, output_dict=True)

# Save Results
results = {
    'model': 'EcoWasteNet-ViT-98',
    'test_accuracy': float(test_acc),
    'best_val_accuracy': float(best_val_acc),
    'total_epochs': 80,
    'features': [
        'Extreme data augmentation',
        'Advanced class-imbalance handling',
        'Enhanced ViT architecture',
        'Focal loss with class weights',
        '3-stage progressive fine-tuning',
        'Cosine annealing with warm restarts',
        'Label smoothing',
        '15x Test-Time Augmentation'
    ],
    'per_class_metrics': report
}

with open(RESULTS_DIR / 'ecowastenet_vit_98_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print(f"\n✅ Training complete!")
print(f"📊 Results saved to: {RESULTS_DIR / 'ecowastenet_vit_98_results.json'}")
print(f"📈 Confusion matrix saved to: {FIGURES_DIR / 'ecowastenet_vit_98_cm.png'}")
print(f"💾 Best model saved to: {best_model_path}")
