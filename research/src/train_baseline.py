import os
import json
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix
import numpy as np
from tqdm import tqdm

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.set_num_threads(os.cpu_count() or 4)

EPOCHS = 8
BATCH_SIZE = 32
LR = 0.002
NUM_CLASSES = 6
PROCESSED_DIR = "research/dataset/processed"
RESULTS_DIR = "research/results"

def run_baseline_experiment():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    os.makedirs("research/models", exist_ok=True)
    os.makedirs("research/figures", exist_ok=True)

    eval_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_dataset = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "train"), transform=eval_tf)
    val_dataset = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "val"), transform=eval_tf)
    test_dataset = datasets.ImageFolder(os.path.join(PROCESSED_DIR, "test"), transform=eval_tf)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, pin_memory=False)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False)

    print(f"[*] Initializing ResNet50 on device: {DEVICE} ({os.cpu_count()} CPU threads allocated)")
    model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
    
    # Freeze backbone weights
    for param in model.parameters():
        param.requires_grad = False
        
    model.fc = nn.Linear(model.fc.in_features, NUM_CLASSES)
    model = model.to(DEVICE)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.fc.parameters(), lr=LR)

    print(f"[*] Starting Baseline Training ({EPOCHS} Epochs)...")
    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        # Live progress bar per batch
        pbar = tqdm(train_loader, desc=f"Epoch [{epoch+1:02d}/{EPOCHS:02d}]", unit="batch")
        for images, labels in pbar:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels).item()
            total += labels.size(0)
            pbar.set_postfix({"loss": f"{loss.item():.3f}", "acc": f"{(correct/total)*100:.1f}%"})

    # Evaluate on fixed Test partition
    print("\n[*] Evaluating baseline on isolated test set...")
    model.eval()
    y_true, y_pred = [], []
    with torch.no_grad():
        for images, labels in tqdm(test_loader, desc="Testing", unit="batch"):
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            y_true.extend(labels.cpu().numpy())
            y_pred.extend(preds.cpu().numpy())

    y_true, y_pred = np.array(y_true), np.array(y_pred)
    test_acc = float(np.mean(y_true == y_pred))
    report = classification_report(y_true, y_pred, target_names=train_dataset.classes, output_dict=True, zero_division=0)

    torch.save(model.state_dict(), "research/models/resnet50_baseline.pth")
    with open(f"{RESULTS_DIR}/baseline_results.json", "w") as f:
        json.dump({"test_accuracy": test_acc, "classification_report": report, "published_baseline": 0.728}, f, indent=2)

    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=train_dataset.classes, yticklabels=train_dataset.classes)
    plt.title("Baseline ResNet50 Confusion Matrix")
    plt.tight_layout()
    plt.savefig("research/figures/baseline_confusion_matrix.png", dpi=300)
    plt.close()

    print(f"\n[+] Baseline Complete!")
    print(f"[+] Baseline Measured Test Accuracy: {test_acc * 100:.2f}% (Base Paper published: 72.8%)")

if __name__ == "__main__":
    run_baseline_experiment()
