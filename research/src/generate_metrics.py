import json
import os
from pathlib import Path
import matplotlib.pyplot as plt

RESEARCH_DIR = Path(__file__).resolve().parents[1]
RESULTS_DIR = RESEARCH_DIR / "results"
FIGURES_DIR = RESEARCH_DIR / "figures"

def load_accuracy(path):
    with open(path, encoding="utf-8") as results_file:
        results = json.load(results_file)
    return results["test_accuracy"], results.get("classification_report", {}).get("accuracy")

def generate_comparisons():
    b_path = os.path.join(RESULTS_DIR, "baseline_results.json")
    i_path = os.path.join(RESULTS_DIR, "improved_results.json")

    if not os.path.exists(b_path) or not os.path.exists(i_path):
        raise FileNotFoundError(
            f"Expected measured results in {RESULTS_DIR}. Run the experiments before generating metrics."
        )

    repro_base_acc, _ = load_accuracy(b_path)
    improved_acc, _ = load_accuracy(i_path)
    proposed_points = (improved_acc - repro_base_acc) * 100

    print("=" * 60)
    print("           EXPERIMENTAL RESULTS BENCHMARK")
    print("=" * 60)
    print(f"Reproduced Baseline:         {repro_base_acc * 100:.2f}%")
    print(f"EcoSphere Improved Model:    {improved_acc * 100:.2f}%")
    print(f"Proposed method gain:         {proposed_points:+.2f} percentage points")
    print("=" * 60)

    labels = ['Reproduced Baseline', 'EcoSphere Improved']
    vals = [repro_base_acc * 100, improved_acc * 100]
    plt.figure(figsize=(6, 4))
    plt.bar(labels, vals, color=['#94a3b8', '#64748b', '#10b981'])
    plt.ylabel('Accuracy (%)')
    plt.ylim(0, 100)
    plt.title('Accuracy Comparison across Models')
    plt.tight_layout()
    os.makedirs(FIGURES_DIR, exist_ok=True)
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    plt.savefig(FIGURES_DIR / "accuracy_comparison.png", dpi=300)
    plt.close()

if __name__ == "__main__":
    generate_comparisons()
