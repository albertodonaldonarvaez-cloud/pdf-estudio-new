import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { PDFDocument } from "pdf-lib";

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const preserveImages = formData.get("preserveImages") === "true";

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
    }

    // Get PDF page count and dimensions
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();
    const pages = pdfDoc.getPages();
    
    // Get page dimensions for each page
    const pageDimensions = pages.map(page => {
      const { width, height } = page.getSize();
      return { width, height };
    });
    
    if (preserveImages) {
      // Return PDF pages as-is for exact preservation
      const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");
      
      // Also extract text using VLM for editable content
      const zai = await ZAI.create();
      const dataUrl = `data:application/pdf;base64,${pdfBase64}`;

      const response = await zai.chat.completions.createVision({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analiza este documento PDF y extrae su contenido de texto estructurado.
IMPORTANTE: Si hay imágenes en el documento, indícalas en la respuesta.

Devuelve un JSON con esta estructura:
{
  "title": "título del documento",
  "hasImages": true/false,
  "imageCount": número de imágenes detectadas,
  "blocks": [
    {
      "id": "unique-id",
      "type": "heading1|heading2|heading3|paragraph|bullet|numbered|image",
      "content": "texto del bloque o descripción de imagen",
      "formatting": { "bold": false, "italic": false, "underline": false },
      "alignment": "left|center|right|justify"
    }
  ]
}`,
              },
              {
                type: "file_url",
                file_url: { url: dataUrl },
              },
            ],
          },
        ],
        thinking: { type: "disabled" },
      });

      const extractedContent = response.choices[0]?.message?.content || "";
      let documentData;
      
      try {
        const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          documentData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found");
        }
      } catch {
        documentData = {
          title: file.name.replace(".pdf", ""),
          hasImages: true,
          imageCount: 0,
          blocks: [{
            id: "block-0",
            type: "paragraph",
            content: "Documento PDF cargado",
            formatting: { bold: false, italic: false, underline: false },
            alignment: "left",
          }],
        };
      }
      
      // Ensure all blocks have required fields
      if (documentData.blocks) {
        documentData.blocks = documentData.blocks.map((block: any, i: number) => ({
          id: block.id || `block-${i}`,
          type: block.type || "paragraph",
          content: block.content || "",
          formatting: block.formatting || { bold: false, italic: false, underline: false },
          alignment: block.alignment || "left",
        }));
      }
      
      return NextResponse.json({
        ...documentData,
        pageCount,
        pageDimensions,
        pdfBase64,
        preserveExact: true,
        originalFileName: file.name,
      });
    }

    // Standard text extraction mode
    const zai = await ZAI.create();
    const base64 = await fileToBase64(file);
    const dataUrl = `data:application/pdf;base64,${base64}`;

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza este documento PDF y extrae TODO su contenido de forma estructurada.

INSTRUCCIONES IMPORTANTES:
1. Extrae TODO el texto del documento, sin omitir nada
2. Identifica la estructura: títulos, subtítulos, párrafos, listas
3. Para cada elemento, determina su tipo:
   - heading1: Títulos principales
   - heading2: Subtítulos
   - heading3: Sub-subtítulos
   - paragraph: Párrafos de texto
   - bullet: Elementos de lista con viñetas
   - numbered: Elementos de lista numerada

4. Devuelve SOLO un JSON con esta estructura exacta:
{
  "title": "título del documento",
  "blocks": [
    {
      "id": "unique-id",
      "type": "heading1|heading2|heading3|paragraph|bullet|numbered",
      "content": "texto del bloque",
      "formatting": { "bold": false, "italic": false, "underline": false },
      "alignment": "left|center|right|justify"
    }
  ]
}

IMPORTANTE: 
- Extrae TODO el contenido, no resumas
- Mantén el orden original
- Si hay texto en negrita/cursiva, marca formatting.bold/formatting.italic como true`,
            },
            {
              type: "file_url",
              file_url: { url: dataUrl },
            },
          ],
        },
      ],
      thinking: { type: "disabled" },
    });

    const extractedContent = response.choices[0]?.message?.content || "";

    // Parse JSON from response
    let documentData;
    try {
      const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        documentData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback: create blocks from plain text
      const lines = extractedContent.split("\n").filter((l) => l.trim());
      documentData = {
        title: file.name.replace(".pdf", ""),
        blocks: lines.map((line, i) => ({
          id: `block-${i}`,
          type: line.length < 50 ? "heading2" : "paragraph",
          content: line,
          formatting: { bold: false, italic: false, underline: false },
          alignment: "left",
        })),
      };
    }

    // Ensure all blocks have required fields
    if (documentData.blocks) {
      documentData.blocks = documentData.blocks.map((block: any, i: number) => ({
        id: block.id || `block-${i}`,
        type: block.type || "paragraph",
        content: block.content || "",
        formatting: block.formatting || { bold: false, italic: false, underline: false },
        alignment: block.alignment || "left",
      }));
    }

    return NextResponse.json({
      ...documentData,
      pageCount,
      pageDimensions,
    });
  } catch (error) {
    console.error("Extract content API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
