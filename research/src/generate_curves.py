import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.metrics import auc, roc_curve
from sklearn.preprocessing import label_binarize
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
RESEARCH_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = RESEARCH_DIR / "dataset" / "processed" / "test"
MODEL_DIR = RESEARCH_DIR / "models"
RESULTS_DIR = RESEARCH_DIR / "results"
FIGURES_DIR = RESEARCH_DIR / "figures"
NUM_CLASSES = 6
BATCH_SIZE = 32


def make_loader():
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    dataset = datasets.ImageFolder(DATA_DIR, transform=transform)
    return DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False), dataset.classes


def load_baseline():
    model = models.resnet50(weights=None)
    model.fc = torch.nn.Linear(model.fc.in_features, NUM_CLASSES)
    model.load_state_dict(torch.load(MODEL_DIR / "resnet50_baseline.pth", map_location=DEVICE, weights_only=True))
    return model.to(DEVICE).eval()


def load_improved():
    model = models.resnet50(weights=None)
    model.fc = torch.nn.Sequential(
        torch.nn.Linear(model.fc.in_features, 512),
        torch.nn.BatchNorm1d(512),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.35),
        torch.nn.Linear(512, 256),
        torch.nn.BatchNorm1d(256),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.25),
        torch.nn.Linear(256, NUM_CLASSES),
    )
    model.load_state_dict(torch.load(MODEL_DIR / "ecosphere_improved_best.pth", map_location=DEVICE, weights_only=True))
    return model.to(DEVICE).eval()


def predict(model, loader):
    labels = []
    scores = []
    with torch.no_grad():
        for images, batch_labels in loader:
            outputs = model(images.to(DEVICE))
            labels.extend(batch_labels.numpy())
            scores.append(torch.softmax(outputs, dim=1).cpu().numpy())
    return np.asarray(labels), np.concatenate(scores)


def plot_micro_roc(y_true, score_sets, class_count):
    binary_labels = label_binarize(y_true, classes=np.arange(class_count))
    plt.figure(figsize=(7, 5))
    for name, scores in score_sets.items():
        false_positive_rate, true_positive_rate, _ = roc_curve(binary_labels.ravel(), scores.ravel())
        area = auc(false_positive_rate, true_positive_rate)
        plt.plot(false_positive_rate, true_positive_rate, linewidth=2, label=f"{name} (AUC={area:.3f})")
    plt.plot([0, 1], [0, 1], "--", color="gray", label="Random classifier")
    plt.xlabel("False positive rate")
    plt.ylabel("True positive rate")
    plt.title("Micro-averaged ROC on the EcoSphere test set")
    plt.legend(loc="lower right")
    plt.grid(alpha=0.25)
    plt.tight_layout()
    plt.savefig(FIGURES_DIR / "roc_comparison.png", dpi=300)
    plt.close()


def main():
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    loader, classes = make_loader()
    y_true, baseline_scores = predict(load_baseline(), loader)
    _, improved_scores = predict(load_improved(), loader)

    plot_micro_roc(
        y_true,
        {"Frozen ResNet50 baseline": baseline_scores, "EcoSphere improved": improved_scores},
        len(classes),
    )

    with open(RESULTS_DIR / "roc_scores.json", "w", encoding="utf-8") as results_file:
        json.dump(
            {
                "dataset": "TrashNet",
                "split": "test",
                "sample_count": int(len(y_true)),
                "classes": classes,
                "models": {
                    "baseline": baseline_scores.tolist(),
                    "improved": improved_scores.tolist(),
                },
            },
            results_file,
            indent=2,
        )

    print(f"Saved ROC curve to {FIGURES_DIR / 'roc_comparison.png'}")
    print(f"Saved test probabilities to {RESULTS_DIR / 'roc_scores.json'}")


if __name__ == "__main__":
    main()
