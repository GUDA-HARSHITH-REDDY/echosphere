import { NextRequest, NextResponse } from "next/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
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
      clearTimeout(timeoutId);

      if (!mlResponse.ok) throw new Error(`ML engine status: ${mlResponse.status}`);
      const result = await mlResponse.json();

      return NextResponse.json({ success: true, aiAssisted: true, data: result });
    } catch (mlErr) {
      return NextResponse.json({
        success: true,
        aiAssisted: false,
        fallback: true,
        message: "AI classifier offline. Manual mode enabled.",
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
