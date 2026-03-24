"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Upload,
  FileText,
  Download,
  Loader2,
  Trash2,
  RotateCw,
  RotateCcw,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Layers,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PDFDocument } from "pdf-lib";

interface PDFPage {
  id: string;
  pageNumber: number;
  rotation: number;
  selected: boolean;
  thumbnail?: string;
}

interface PDFFile {
  id: string;
  name: string;
  file: File;
  pages: PDFPage[];
  pageCount: number;
}

export function PDFOrganizer() {
  const [pdfFile, setPdfFile] = useState<PDFFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [previewPage, setPreviewPage] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((f) => f.type === "application/pdf");
    if (pdfFile) {
      loadPDF(pdfFile);
    } else {
      toast.error("Por favor, sube un archivo PDF");
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadPDF(file);
    }
  };

  const loadPDF = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      setProgress(50);

      const pages: PDFPage[] = [];
      for (let i = 0; i < pageCount; i++) {
        pages.push({
          id: `page-${i}`,
          pageNumber: i + 1,
          rotation: 0,
          selected: false,
        });
      }

      setProgress(100);

      setPdfFile({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        file,
        pages,
        pageCount,
      });

      toast.success(`PDF cargado: ${pageCount} páginas`);
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error("Error al cargar el PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const reorderPages = (newOrder: PDFPage[]) => {
    if (pdfFile) {
      setPdfFile({ ...pdfFile, pages: newOrder });
    }
  };

  const rotatePage = (pageId: string, direction: "cw" | "ccw") => {
    if (pdfFile) {
      setPdfFile({
        ...pdfFile,
        pages: pdfFile.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                rotation:
                  direction === "cw"
                    ? (page.rotation + 90) % 360
                    : (page.rotation - 90 + 360) % 360,
              }
            : page
        ),
      });
    }
  };

  const deletePage = (pageId: string) => {
    if (pdfFile && pdfFile.pages.length > 1) {
      setPdfFile({
        ...pdfFile,
        pages: pdfFile.pages.filter((p) => p.id !== pageId),
      });
      toast.success("Página eliminada");
    } else {
      toast.error("El PDF debe tener al menos una página");
    }
  };

  const deleteSelected = () => {
    if (pdfFile && selectedPages.size > 0) {
      if (pdfFile.pages.length - selectedPages.size < 1) {
        toast.error("El PDF debe tener al menos una página");
        return;
      }
      setPdfFile({
        ...pdfFile,
        pages: pdfFile.pages.filter((p) => !selectedPages.has(p.id)),
      });
      setSelectedPages(new Set());
      toast.success(`${selectedPages.size} página(s) eliminada(s)`);
    }
  };

  const togglePageSelection = (pageId: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(pageId)) {
      newSelected.delete(pageId);
    } else {
      newSelected.add(pageId);
    }
    setSelectedPages(newSelected);
  };

  const savePDF = async () => {
    if (!pdfFile) return;

    setIsSaving(true);

    try {
      const arrayBuffer = await pdfFile.file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const newDoc = await PDFDocument.create();

      for (const page of pdfFile.pages) {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [
          page.pageNumber - 1,
        ]);
        if (page.rotation !== 0) {
          copiedPage.setRotation({ angle: page.rotation as 0 | 90 | 180 | 270 });
        }
        newDoc.addPage(copiedPage);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `organizado_${pdfFile.name}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("PDF guardado exitosamente");
    } catch (error) {
      console.error("Error saving PDF:", error);
      toast.error("Error al guardar el PDF");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!pdfFile ? (
        /* Upload Area */
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300",
                dragActive
                  ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
                  : "border-slate-300 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-600"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <motion.div
                animate={{ scale: dragActive ? 1.1 : 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Layers className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="text-xl font-medium text-slate-700 dark:text-slate-200">
                    Arrastra un PDF aquí
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    o haz clic para seleccionar
                  </p>
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Organiza, rota y elimina páginas
                </p>
              </motion.div>
            </div>

            {isProcessing && (
              <div className="mt-6 space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-slate-500">
                  Cargando PDF... {progress}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Editor */
        <div className="space-y-4">
          {/* Header */}
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {pdfFile.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {pdfFile.pages.length} páginas
                      {selectedPages.size > 0 && ` • ${selectedPages.size} seleccionadas`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedPages.size > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={deleteSelected}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar ({selectedPages.size})
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPdfFile(null);
                      setSelectedPages(new Set());
                    }}
                    className="border-slate-200 dark:border-slate-700"
                  >
                    Nuevo PDF
                  </Button>
                  <Button
                    onClick={savePDF}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-600 hover:to-sky-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Guardar PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pages Grid */}
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Arrastra las páginas para reordenar. Usa los controles para rotar o eliminar.
              </p>

              <Reorder.Group
                axis="x"
                values={pdfFile.pages}
                onReorder={reorderPages}
                className="flex flex-wrap gap-4"
              >
                <AnimatePresence>
                  {pdfFile.pages.map((page) => (
                    <Reorder.Item
                      key={page.id}
                      value={page}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={cn(
                          "relative w-32 h-44 rounded-xl overflow-hidden border-2 transition-colors",
                          selectedPages.has(page.id)
                            ? "border-cyan-500 shadow-lg shadow-cyan-500/25"
                            : "border-slate-200 dark:border-slate-700 hover:border-cyan-400"
                        )}
                        style={{
                          transform: `rotate(${page.rotation}deg)`,
                        }}
                      >
                        {/* Page Preview */}
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                          <div className="text-center">
                            <FileText className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
                            <p className="text-lg font-bold text-slate-500 dark:text-slate-400 mt-2">
                              {page.pageNumber}
                            </p>
                          </div>
                        </div>

                        {/* Selection Checkbox */}
                        <div className="absolute top-2 left-2">
                          <Checkbox
                            checked={selectedPages.has(page.id)}
                            onCheckedChange={() => togglePageSelection(page.id)}
                            className="bg-white dark:bg-slate-800"
                          />
                        </div>

                        {/* Page Number Badge */}
                        <Badge
                          variant="secondary"
                          className="absolute top-2 right-2 bg-black/50 text-white text-xs"
                        >
                          #{pdfFile.pages.findIndex((p) => p.id === page.id) + 1}
                        </Badge>

                        {/* Controls */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePage(page.id, "ccw");
                            }}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              rotatePage(page.id, "cw");
                            }}
                          >
                            <RotateCw className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-red-500/50"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePage(page.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Drag Handle */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-6 h-6 text-white drop-shadow-lg" />
                        </div>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
