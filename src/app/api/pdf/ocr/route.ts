import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// Helper to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

// Helper to get MIME type
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const zai = await ZAI.create();
          let totalProgress = 0;
          let fullText = "";

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const mimeType = file.type || getMimeType(file.name);

            // Send progress update
            totalProgress = (i / files.length) * 100;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ progress: Math.round(totalProgress) })}\n\n`)
            );

            try {
              const base64 = await fileToBase64(file);
              const dataUrl = `data:${mimeType};base64,${base64}`;

              // Use VLM for OCR
              const response = await zai.chat.completions.createVision({
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: "Extrae todo el texto de esta imagen/documento. Mantén el formato y estructura original tanto como sea posible. Si hay tablas, trata de mantener su estructura. Solo devuelve el texto extraído, sin explicaciones adicionales.",
                      },
                      {
                        type: "image_url",
                        image_url: { url: dataUrl },
                      },
                    ],
                  },
                ],
                thinking: { type: "disabled" },
              });

              const extractedText = response.choices[0]?.message?.content || "";
              fullText += extractedText + "\n\n";

              // Send extracted text
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: extractedText + "\n\n" })}\n\n`)
              );
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: `[Error procesando ${file.name}]\n\n` })}\n\n`
                )
              );
            }
          }

          // Send final progress
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ progress: 100 })}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Error processing files" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("OCR API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
