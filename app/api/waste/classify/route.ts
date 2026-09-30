import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { orchestrateWastePrediction, type WastePrediction } from "../../../../lib/wasteOrchestrator";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const workflowId = randomUUID();
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const forwardData = new FormData();
    forwardData.append("file", file);

    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: "POST",
        body: forwardData,
        signal: controller.signal,
      });

      if (!mlResponse.ok) throw new Error(`ML engine status: ${mlResponse.status}`);
      const result = (await mlResponse.json()) as WastePrediction;
      const latitudeValue = formData.get("latitude");
      const longitudeValue = formData.get("longitude");
      const latitude = latitudeValue === null ? Number.NaN : Number(latitudeValue);
      const longitude = longitudeValue === null ? Number.NaN : Number(longitudeValue);
      const prediction = await orchestrateWastePrediction(
        result,
        workflowId,
        Number.isFinite(latitude) && Number.isFinite(longitude)
          ? { latitude, longitude }
          : undefined
      );

      return NextResponse.json({ success: true, aiAssisted: true, workflowId, data: prediction });
    } catch (mlErr) {
      return NextResponse.json({
        success: true,
        aiAssisted: false,
        fallback: true,
        workflowId,
        failure: mlErr instanceof Error ? mlErr.message : "AI classification failed.",
        message: "AI classifier offline. Manual mode enabled.",
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message, workflowId }, { status: 500 });
  }
}
