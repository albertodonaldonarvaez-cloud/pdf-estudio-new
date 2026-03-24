import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface TextBlock {
  id: string;
  type: "paragraph" | "heading1" | "heading2" | "heading3" | "bullet" | "numbered";
  content: string;
  formatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
  alignment: "left" | "center" | "right" | "justify";
}

interface ImageBlock {
  id: string;
  type: "image";
  src: string;
  width: number;
  height: number;
  alignment: "left" | "center" | "right";
  base64?: string;
}

type ContentBlock = TextBlock | ImageBlock;

interface DocumentSettings {
  pageSize: {
    width: number;
    height: number;
    name: string;
  };
  orientation: "portrait" | "landscape";
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

// Convert mm to points (1 mm = 2.83465 points)
const mmToPoints = (mm: number) => mm * 2.83465;

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    
    let blocks: ContentBlock[] = [];
    let title = "Documento";
    let settings: DocumentSettings = {
      pageSize: { width: 210, height: 297, name: "A4" },
      orientation: "portrait",
      marginTop: 25,
      marginBottom: 25,
      marginLeft: 25,
      marginRight: 25,
    };
    let images: Map<string, string> = new Map(); // id -> base64
    
    if (contentType.includes("multipart/form-data")) {
      // Handle form data with images
      const formData = await request.formData();
      const jsonStr = formData.get("data") as string;
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        title = data.title || title;
        blocks = data.blocks || [];
        settings = { ...settings, ...data.settings };
      }
      
      // Collect images
      formData.forEach((value, key) => {
        if (key.startsWith("image_") && value instanceof File) {
          const id = key.replace("image_", "");
          const reader = new FileReader();
          // Store file for later processing
        }
      });
    } else {
      // Handle JSON
      const body = await request.json();
      title = body.title || title;
      blocks = body.blocks || [];
      settings = { ...settings, ...body.settings };
      if (body.images) {
        Object.entries(body.images).forEach(([id, base64]) => {
          images.set(id, base64 as string);
        });
      }
    }

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create();

    // Embed fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Page dimensions in points
    let pageWidth = mmToPoints(settings.pageSize.width);
    let pageHeight = mmToPoints(settings.pageSize.height);

    // Swap for landscape
    if (settings.orientation === "landscape") {
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }

    // Margins in points
    const marginTop = mmToPoints(settings.marginTop);
    const marginBottom = mmToPoints(settings.marginBottom);
    const marginLeft = mmToPoints(settings.marginLeft);
    const marginRight = mmToPoints(settings.marginRight);

    // Content area
    const contentWidth = pageWidth - marginLeft - marginRight;
    const contentHeight = pageHeight - marginTop - marginBottom;

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - marginTop;

    const addNewPage = () => {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - marginTop;
    };

    const checkSpace = (requiredSpace: number) => {
      if (yPosition - requiredSpace < marginBottom) {
        addNewPage();
      }
    };

    const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, size);

        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      return lines;
    };

    const drawText = (
      text: string,
      font: any,
      size: number,
      color: any = rgb(0, 0, 0),
      alignment: "left" | "center" | "right" | "justify" = "left",
      isUnderline: boolean = false
    ) => {
      const lines = wrapText(text, font, size, contentWidth);

      for (const line of lines) {
        checkSpace(size + 8);

        let x = marginLeft;
        const lineWidth = font.widthOfTextAtSize(line, size);

        if (alignment === "center") {
          x = marginLeft + (contentWidth - lineWidth) / 2;
        } else if (alignment === "right") {
          x = marginLeft + contentWidth - lineWidth;
        }

        currentPage.drawText(line, {
          x,
          y: yPosition,
          size,
          font,
          color,
        });

        // Underline
        if (isUnderline) {
          currentPage.drawLine({
            start: { x, y: yPosition - 2 },
            end: { x: x + lineWidth, y: yPosition - 2 },
            thickness: 0.5,
            color,
          });
        }

        yPosition -= size + 6;
      }
    };

    const drawImage = async (imageBlock: ImageBlock) => {
      const imageBase64 = imageBlock.base64 || images.get(imageBlock.id) || imageBlock.src;
      if (!imageBase64) {
        console.log("No image data for:", imageBlock.id);
        return;
      }

      try {
        let image;
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = base64ToUint8Array(cleanBase64);

        // Try to determine image type and embed
        if (imageBase64.includes("image/png") || imageBlock.src?.includes("png")) {
          image = await pdfDoc.embedPng(imageBytes);
        } else if (imageBase64.includes("image/jpg") || imageBase64.includes("image/jpeg") || imageBlock.src?.includes("jpg") || imageBlock.src?.includes("jpeg")) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          // Try PNG first, then JPG
          try {
            image = await pdfDoc.embedPng(imageBytes);
          } catch {
            try {
              image = await pdfDoc.embedJpg(imageBytes);
            } catch (e) {
              console.log("Could not embed image:", e);
              return;
            }
          }
        }

        // Calculate dimensions to fit content width
        const maxWidth = contentWidth;
        const scale = Math.min(1, maxWidth / image.width);
        const imgWidth = image.width * scale;
        const imgHeight = image.height * scale;

        checkSpace(imgHeight + 20);

        // Calculate x position based on alignment
        let x = marginLeft;
        if (imageBlock.alignment === "center") {
          x = marginLeft + (contentWidth - imgWidth) / 2;
        } else if (imageBlock.alignment === "right") {
          x = marginLeft + contentWidth - imgWidth;
        }

        currentPage.drawImage(image, {
          x,
          y: yPosition - imgHeight,
          width: imgWidth,
          height: imgHeight,
        });

        yPosition -= imgHeight + 20;
      } catch (error) {
        console.error("Error embedding image:", error);
      }
    };

    // Draw title
    checkSpace(40);
    const titleFont = helveticaBold;
    const titleSize = 24;
    const titleWidth = titleFont.widthOfTextAtSize(title, titleSize);
    currentPage.drawText(title, {
      x: marginLeft + (contentWidth - titleWidth) / 2,
      y: yPosition,
      size: titleSize,
      font: titleFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPosition -= 50;

    // Process blocks
    for (const block of blocks) {
      if (block.type === "image") {
        await drawImage(block as ImageBlock);
        continue;
      }

      // Text block
      const textBlock = block as TextBlock;
      if (!textBlock.content.trim()) continue;

      // Determine font
      let font = helvetica;
      if (textBlock.formatting.bold) {
        font = helveticaBold;
      } else if (textBlock.formatting.italic) {
        font = helveticaOblique;
      }

      switch (textBlock.type) {
        case "heading1":
          checkSpace(36);
          yPosition -= 10;
          drawText(
            textBlock.content,
            helveticaBold,
            22,
            rgb(0.1, 0.1, 0.1),
            textBlock.alignment,
            textBlock.formatting.underline
          );
          yPosition -= 10;
          break;

        case "heading2":
          checkSpace(30);
          yPosition -= 8;
          drawText(
            textBlock.content,
            helveticaBold,
            18,
            rgb(0.15, 0.15, 0.15),
            textBlock.alignment,
            textBlock.formatting.underline
          );
          yPosition -= 8;
          break;

        case "heading3":
          checkSpace(26);
          yPosition -= 6;
          drawText(
            textBlock.content,
            helveticaBold,
            14,
            rgb(0.2, 0.2, 0.2),
            textBlock.alignment,
            textBlock.formatting.underline
          );
          yPosition -= 6;
          break;

        case "bullet":
          const bulletLines = wrapText(textBlock.content, font, 11, contentWidth - 15);
          for (let i = 0; i < bulletLines.length; i++) {
            checkSpace(18);
            const prefix = i === 0 ? "• " : "   ";
            currentPage.drawText(prefix + bulletLines[i], {
              x: marginLeft + 10,
              y: yPosition,
              size: 11,
              font,
              color: rgb(0.2, 0.2, 0.2),
            });
            yPosition -= 16;
          }
          break;

        case "numbered":
          const numLines = wrapText(textBlock.content, font, 11, contentWidth - 20);
          for (let i = 0; i < numLines.length; i++) {
            checkSpace(18);
            const prefix = i === 0 ? "1. " : "    ";
            currentPage.drawText(prefix + numLines[i], {
              x: marginLeft + 10,
              y: yPosition,
              size: 11,
              font,
              color: rgb(0.2, 0.2, 0.2),
            });
            yPosition -= 16;
          }
          break;

        case "paragraph":
        default:
          drawText(
            textBlock.content,
            font,
            11,
            rgb(0.2, 0.2, 0.2),
            textBlock.alignment,
            textBlock.formatting.underline
          );
          yPosition -= 6;
          break;
      }
    }

    // Set metadata
    pdfDoc.setTitle(title);
    pdfDoc.setAuthor("PDF Studio");
    pdfDoc.setCreator("PDF Studio");
    pdfDoc.setSubject("Document created with PDF Studio");

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${title.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Create advanced PDF API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
