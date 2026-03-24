import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Invalid PDF file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    // Extract each page as an individual PDF and convert to base64
    const pages: Array<{
      pageNum: number;
      pdfBase64: string;
      width: number;
      height: number;
    }> = [];
    
    for (let i = 0; i < pageCount; i++) {
      // Create a new PDF with just this page
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
      singlePagePdf.addPage(copiedPage);
      
      const { width, height } = copiedPage.getSize();
      
      const pdfBytes = await singlePagePdf.save();
      const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
      
      pages.push({
        pageNum: i + 1,
        pdfBase64,
        width,
        height,
      });
    }
    
    return NextResponse.json({
      success: true,
      pageCount,
      pages,
      originalFileName: file.name,
    });
  } catch (error) {
    console.error("Render PDF pages error:", error);
    return NextResponse.json({ 
      error: "Failed to render PDF pages",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
