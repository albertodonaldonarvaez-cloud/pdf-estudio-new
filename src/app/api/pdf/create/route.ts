import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface ContentBlock {
  type: "paragraph" | "heading1" | "heading2" | "heading3" | "bullet" | "numbered";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, blocks }: { title: string; blocks: ContentBlock[] } = body;

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Page setup
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points
    const margin = 72; // 1 inch margin
    const contentWidth = pageWidth - margin * 2;
    
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    const addNewPage = () => {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    };

    const checkSpace = (requiredSpace: number) => {
      if (yPosition - requiredSpace < margin) {
        addNewPage();
      }
    };

    const drawText = (text: string, font: any, size: number, color: any = rgb(0, 0, 0)) => {
      const lines = wrapText(text, font, size, contentWidth);
      
      for (const line of lines) {
        checkSpace(size + 6);
        currentPage.drawText(line, {
          x: margin,
          y: yPosition,
          size,
          font,
          color,
        });
        yPosition -= size + 4;
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

    // Draw title on first page
    checkSpace(40);
    currentPage.drawText(title, {
      x: margin,
      y: yPosition,
      size: 28,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    yPosition -= 50;

    // Process blocks
    for (const block of blocks) {
      switch (block.type) {
        case "heading1":
          checkSpace(36);
          yPosition -= 10;
          drawText(block.content, helveticaBold, 24, rgb(0.15, 0.15, 0.15));
          yPosition -= 10;
          break;

        case "heading2":
          checkSpace(30);
          yPosition -= 8;
          drawText(block.content, helveticaBold, 18, rgb(0.2, 0.2, 0.2));
          yPosition -= 8;
          break;

        case "heading3":
          checkSpace(26);
          yPosition -= 6;
          drawText(block.content, helveticaBold, 14, rgb(0.25, 0.25, 0.25));
          yPosition -= 6;
          break;

        case "bullet":
          const bulletLines = wrapText(block.content, helvetica, 12, contentWidth - 20);
          for (let i = 0; i < bulletLines.length; i++) {
            checkSpace(18);
            const prefix = i === 0 ? "• " : "   ";
            currentPage.drawText(prefix + bulletLines[i], {
              x: margin,
              y: yPosition,
              size: 12,
              font: helvetica,
              color: rgb(0.2, 0.2, 0.2),
            });
            yPosition -= 16;
          }
          break;

        case "numbered":
          const numLines = wrapText(block.content, helvetica, 12, contentWidth - 25);
          for (let i = 0; i < numLines.length; i++) {
            checkSpace(18);
            const prefix = i === 0 ? "1. " : "    ";
            currentPage.drawText(prefix + numLines[i], {
              x: margin,
              y: yPosition,
              size: 12,
              font: helvetica,
              color: rgb(0.2, 0.2, 0.2),
            });
            yPosition -= 16;
          }
          break;

        case "paragraph":
        default:
          if (block.content.trim()) {
            drawText(block.content, helvetica, 12, rgb(0.2, 0.2, 0.2));
            yPosition -= 8;
          }
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
    console.error("Create PDF API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
