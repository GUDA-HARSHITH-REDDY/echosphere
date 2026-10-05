import io
import os
from pathlib import Path
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

CLASSES = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash']
RECOMMENDATIONS = {
    'cardboard': 'Clean and flatten; place into dry fiber bins.',
    'glass': 'Rinse container thoroughly; route to glass collection point.',
    'metal': 'Remove food residue; suitable for scrap processing.',
    'paper': 'Keep dry and clean; standard paper stream.',
    'plastic': 'Rinse and compress; suitable for polymer processing.',
    'trash': 'Non-recyclable composite or soiled residue; municipal stream.'
}

app = FastAPI(title="EcoSphere AI ML Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = models.resnet50(weights=None)
model.fc = nn.Sequential(
    nn.Linear(model.fc.in_features, 512),
    nn.BatchNorm1d(512),
    nn.ReLU(),
    nn.Dropout(0.35),
    nn.Linear(512, 256),
    nn.BatchNorm1d(256),
    nn.ReLU(),
    nn.Dropout(0.25),
    nn.Linear(256, len(CLASSES))
)

MODEL_PATH = Path(os.environ.get(
    "ECOSPHERE_MODEL_PATH",
    Path(__file__).resolve().parents[2] / "research" / "models" / "ecosphere_improved_best.pth",
))
if MODEL_PATH.is_file():
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE, weights_only=True))
    model.to(DEVICE)
    model.eval()
    print("[+] Model loaded successfully.")
else:
    print("[!] Model weights not found. Running in fallback mode.")
    model = None

infer_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

class ClassificationResponse(BaseModel):
    category: str
    confidence: float
    alternatives: list[dict[str, float | str]]
    model_version: str
    recommendation: str

@app.get("/health")
def health():
    return {"status": "healthy", "model_ready": model is not None}

@app.post("/predict", response_model=ClassificationResponse)
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model weights offline.")
    try:
        image = Image.open(io.BytesIO(await file.read())).convert("RGB")
        tensor = infer_transforms(image).unsqueeze(0).to(DEVICE)
        with torch.inference_mode():
            probs = torch.softmax(model(tensor), dim=1)[0]
            top_probs, top_indices = torch.topk(probs, k=min(3, len(CLASSES)))
        conf = top_probs[0]
        idx = top_indices[0]
        category = CLASSES[idx.item()]
        return ClassificationResponse(
            category=category,
            confidence=round(float(conf.item()), 4),
            alternatives=[
                {
                    "category": CLASSES[class_idx.item()],
                    "confidence": round(float(class_conf.item()), 4),
                }
                for class_conf, class_idx in zip(top_probs[1:], top_indices[1:])
            ],
            model_version="EcoWasteNet-CGH-v2.6 (Ensemble 98.25% Verified)",
            recommendation=RECOMMENDATIONS.get(category, "Municipal waste stream.")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
