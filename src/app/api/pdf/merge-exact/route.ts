import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get all PDF files
    const files: File[] = [];
    formData.forEach((value, key) => {
      if (key === "files" && value instanceof File) {
        files.push(value);
      }
    });
    
    // Get page order if provided
    const pageOrderStr = formData.get("pageOrder") as string;
    const pageOrder = pageOrderStr ? JSON.parse(pageOrderStr) : null;
    
    if (files.length === 0 && !pageOrder) {
      return NextResponse.json({ error: "No PDF files provided" }, { status: 400 });
    }
    
    const mergedPdf = await PDFDocument.create();
    
    if (pageOrder && Array.isArray(pageOrder)) {
      // Handle reordering - each item has { fileIndex, pageIndex }
      // We need to process files and extract specific pages
      
      for (const order of pageOrder) {
        const { fileIndex, pageIndex, pdfBase64 } = order;
        
        let sourcePdf: PDFDocument;
        
        if (pdfBase64) {
          // Use the base64 PDF data directly
          const pdfBytes = Buffer.from(pdfBase64, "base64");
          sourcePdf = await PDFDocument.load(pdfBytes);
        } else if (files[fileIndex]) {
          // Load from file
          const arrayBuffer = await files[fileIndex].arrayBuffer();
          sourcePdf = await PDFDocument.load(arrayBuffer);
        } else {
          continue;
        }
        
        // Copy the specific page
        const pages = await mergedPdf.copyPages(sourcePdf, [pageIndex]);
        pages.forEach(page => mergedPdf.addPage(page));
      }
    } else {
      // Simple merge - all pages in order
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      }
    }
    
    // Set metadata
    mergedPdf.setTitle("Merged PDF");
    mergedPdf.setCreator("PDF Studio");
    
    // Save
    const pdfBytes = await mergedPdf.save();
    
    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="merged_document.pdf"`,
      },
    });
  } catch (error) {
    console.error("Merge exact PDF error:", error);
    return NextResponse.json({ 
      error: "Failed to merge PDFs",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
