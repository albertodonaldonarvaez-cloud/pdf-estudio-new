import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import ZAI from "z-ai-web-dev-sdk";

type OutputFormat = "word" | "excel" | "pptx" | "txt";

// Helper to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const format = (formData.get("format") as OutputFormat) || "word";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert PDF to images and extract text using VLM
    const zai = await ZAI.create();
    const base64 = await fileToBase64(file);
    const dataUrl = `data:application/pdf;base64,${base64}`;

    // Use VLM to extract content from PDF
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza este documento PDF y extrae todo su contenido en formato estructurado.
              
Instrucciones:
1. Extrae todo el texto manteniendo la estructura
2. Identifica títulos, subtítulos y párrafos
3. Para cada sección, indica el nivel de encabezado
4. Mantiene el formato de listas y tablas
5. Devuelve el contenido en este formato JSON:

{
  "title": "título del documento",
  "sections": [
    {
      "type": "heading1|heading2|heading3|paragraph|bullet|table",
      "content": "contenido del texto"
    }
  ]
}

Solo devuelve el JSON, sin explicaciones adicionales.`,
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

    // Parse the JSON response
    let documentData;
    try {
      const jsonMatch = extractedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        documentData = JSON.parse(jsonMatch[0]);
      } else {
        documentData = {
          title: file.name.replace(".pdf", ""),
          sections: [{ type: "paragraph", content: extractedContent }],
        };
      }
    } catch {
      documentData = {
        title: file.name.replace(".pdf", ""),
        sections: [{ type: "paragraph", content: extractedContent }],
      };
    }

    // Generate content based on format
    let outputContent: Buffer;
    let contentType: string;
    let extension: string;

    switch (format) {
      case "excel":
        outputContent = generateExcelXml(documentData);
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        extension = ".xlsx";
        break;
      case "pptx":
        outputContent = generatePptxXml(documentData);
        contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        extension = ".pptx";
        break;
      case "txt":
        outputContent = generateTxt(documentData);
        contentType = "text/plain";
        extension = ".txt";
        break;
      case "word":
      default:
        outputContent = generateDocxXml(documentData);
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        extension = ".docx";
        break;
    }

    return new Response(outputContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${file.name.replace(".pdf", extension)}"`,
      },
    });
  } catch (error) {
    console.error("Convert API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function generateDocxXml(data: { title: string; sections: any[] }): Buffer {
  const { title, sections } = data;
  let bodyContent = "";

  // Title
  bodyContent += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="400"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="48"/>
        </w:rPr>
        <w:t>${escapeXml(title)}</w:t>
      </w:r>
    </w:p>
  `;

  for (const section of sections) {
    switch (section.type) {
      case "heading1":
        bodyContent += `
          <w:p>
            <w:pPr><w:spacing w:before="400" w:after="200"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
              <w:t>${escapeXml(section.content)}</w:t>
            </w:r>
          </w:p>
        `;
        break;
      case "heading2":
        bodyContent += `
          <w:p>
            <w:pPr><w:spacing w:before="300" w:after="150"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr>
              <w:t>${escapeXml(section.content)}</w:t>
            </w:r>
          </w:p>
        `;
        break;
      case "heading3":
        bodyContent += `
          <w:p>
            <w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
            <w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr>
              <w:t>${escapeXml(section.content)}</w:t>
            </w:r>
          </w:p>
        `;
        break;
      case "bullet":
        bodyContent += `
          <w:p>
            <w:pPr><w:ind w:left="720"/><w:spacing w:after="100"/></w:pPr>
            <w:r><w:t>• ${escapeXml(section.content)}</w:t></w:r>
          </w:p>
        `;
        break;
      default:
        bodyContent += `
          <w:p>
            <w:pPr><w:spacing w:after="200"/></w:pPr>
            <w:r><w:t>${escapeXml(section.content)}</w:t></w:r>
          </w:p>
        `;
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyContent}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  return Buffer.from(documentXml, "utf-8");
}

function generateExcelXml(data: { title: string; sections: any[] }): Buffer {
  const { title, sections } = data;
  let rows = "";

  // Title row
  rows += `
    <row r="1">
      <c r="A1" t="inlineStr">
        <is><t>${escapeXml(title)}</t></is>
      </c>
    </row>
    <row r="2"/>`;

  let rowNum = 3;
  for (const section of sections) {
    const typeLabel = section.type.startsWith("heading") ? section.type.toUpperCase() : section.type.toUpperCase();
    rows += `
    <row r="${rowNum}">
      <c r="A${rowNum}" t="inlineStr">
        <is><t>${typeLabel}</t></is>
      </c>
      <c r="B${rowNum}" t="inlineStr">
        <is><t>${escapeXml(section.content)}</t></is>
      </c>
    </row>`;
    rowNum++;
  }

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${rows}
  </sheetData>
</worksheet>`;

  return Buffer.from(sheetXml, "utf-8");
}

function generatePptxXml(data: { title: string; sections: any[] }): Buffer {
  const { title, sections } = data;
  let slides = "";

  // Title slide
  slides += `
    <p:sp>
      <p:nvSpPr>
        <p:nvPr><p:ph type="title"/></p:nvPr>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="457200" y="274638"/><a:ext cx="8229600" cy="1143000"/></a:xfrm>
      </p:spPr>
      <p:txBody>
        <a:p><a:r><a:rPr lang="es-ES"/><a:t>${escapeXml(title)}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>`;

  // Group sections into slides (3-4 items per slide)
  const itemsPerSlide = 4;
  for (let i = 0; i < sections.length; i += itemsPerSlide) {
    const slideSections = sections.slice(i, i + itemsPerSlide);
    let contentText = slideSections.map(s => {
      const prefix = s.type.startsWith("heading") ? `\n● ${s.content}` : s.content;
      return prefix;
    }).join("\n");

    slides += `
    <p:sp>
      <p:nvSpPr>
        <p:nvPr><p:ph type="body"/></p:nvPr>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm><a:off x="457200" y="1600200"/><a:ext cx="8229600" cy="5486400"/></a:xfrm>
      </p:spPr>
      <p:txBody>
        <a:p><a:r><a:rPr lang="es-ES"/><a:t>${escapeXml(contentText)}</a:t></a:r></a:p>
      </p:txBody>
    </p:sp>`;
  }

  const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" 
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
      </p:nvGrpSpPr>
      ${slides}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr>
    <a:masterClrMapping/>
  </p:clrMapOvr>
</p:sld>`;

  return Buffer.from(presentationXml, "utf-8");
}

function generateTxt(data: { title: string; sections: any[] }): Buffer {
  const { title, sections } = data;
  let text = `${title}\n${"=".repeat(title.length)}\n\n`;

  for (const section of sections) {
    switch (section.type) {
      case "heading1":
        text += `\n${section.content}\n${"-".repeat(section.content.length)}\n\n`;
        break;
      case "heading2":
        text += `\n${section.content}\n${"~".repeat(section.content.length)}\n\n`;
        break;
      case "heading3":
        text += `\n### ${section.content}\n\n`;
        break;
      case "bullet":
        text += `• ${section.content}\n`;
        break;
      case "table":
        text += `\n[TABLA]\n${section.content}\n`;
        break;
      default:
        text += `${section.content}\n\n`;
    }
  }

  return Buffer.from(text, "utf-8");
}
