import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll("images") as File[];
    const orders = formData.getAll("order") as string[];
    const pageSize = (formData.get("pageSize") as string) || "a4";
    const orientation = (formData.get("orientation") as string) || "portrait";

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    // Sort images by order
    const sortedImages = images.map((img, index) => ({
      image: img,
      order: parseInt(orders[index] || index.toString()),
    })).sort((a, b) => a.order - b.order);

    // Create PDF
    const pdfDoc = await PDFDocument.create();

    // Page sizes in points
    const pageSizes: Record<string, { width: number; height: number }> = {
      a4: { width: 595.28, height: 841.89 },
      letter: { width: 612, height: 792 },
      legal: { width: 612, height: 1008 },
      a5: { width: 420.94, height: 595.28 },
    };

    let { width, height } = pageSizes[pageSize] || pageSizes.a4;

    // Swap dimensions for landscape
    if (orientation === "landscape") {
      [width, height] = [height, width];
    }

    // Process each image
    for (const { image } of sortedImages) {
      const imageBytes = await image.arrayBuffer();

      let embeddedImage;
      try {
        if (image.type === "image/png") {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else if (image.type === "image/jpeg" || image.type === "image/jpg") {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          // Try to embed as PNG first, then JPG
          try {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } catch {
            try {
              embeddedImage = await pdfDoc.embedJpg(imageBytes);
            } catch {
              console.error(`Cannot embed image: ${image.name}`);
              continue;
            }
          }
        }
      } catch (error) {
        console.error(`Error embedding image ${image.name}:`, error);
        continue;
      }

      // Calculate dimensions
      let imgWidth = embeddedImage.width;
      let imgHeight = embeddedImage.height;
      let pageWidth = width;
      let pageHeight = height;

      // Auto orientation - choose based on image aspect ratio
      if (orientation === "auto") {
        const imgRatio = imgWidth / imgHeight;
        const pageRatioPortrait = pageSizes[pageSize].width / pageSizes[pageSize].height;
        
        if (imgRatio > pageRatioPortrait) {
          // Image is wider - use landscape
          pageWidth = pageSizes[pageSize].height;
          pageHeight = pageSizes[pageSize].width;
        } else {
          // Use portrait
          pageWidth = pageSizes[pageSize].width;
          pageHeight = pageSizes[pageSize].height;
        }
      }

      // Calculate scale to fit image in page with margins
      const margin = 36; // 0.5 inch margin
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const scaleX = availableWidth / imgWidth;
      const scaleY = availableHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't enlarge

      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;

      // Center image on page
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;

      // Add page and draw image
      const page = pdfDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(embeddedImage, {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
      });
    }

    // Set metadata
    pdfDoc.setTitle("Images to PDF");
    pdfDoc.setAuthor("PDF Studio");
    pdfDoc.setCreator("PDF Studio");
    pdfDoc.setSubject("PDF created from images");

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"imagenes.pdf\"",
      },
    });
  } catch (error) {
    console.error("Images to PDF API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
