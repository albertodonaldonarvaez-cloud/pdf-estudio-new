"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Upload,
  FileText,
  Download,
  Loader2,
  Trash2,
  GripVertical,
  Merge,
  Plus,
  FilePlus,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PDFDocument } from "pdf-lib";

interface PDFFileItem {
  id: string;
  name: string;
  file: File;
  pageCount: number;
  size: number;
}

export function PDFMerger() {
  const [files, setFiles] = useState<PDFFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

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

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = async (newFiles: File[]) => {
    const validFiles = newFiles.filter(
      (file) => file.type === "application/pdf"
    );

    if (validFiles.length !== newFiles.length) {
      toast.error("Solo se aceptan archivos PDF");
    }

    if (validFiles.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    const processedFiles: PDFFileItem[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pageCount = pdfDoc.getPageCount();

        processedFiles.push({
          id: Math.random().toString(36).substring(7),
          name: file.name,
          file,
          pageCount,
          size: file.size,
        });

        setProgress(((i + 1) / validFiles.length) * 100);
      } catch (error) {
        console.error(`Error loading ${file.name}:`, error);
        toast.error(`Error al cargar ${file.name}`);
      }
    }

    setFiles((prev) => [...prev, ...processedFiles]);
    setIsProcessing(false);
    toast.success(`${processedFiles.length} PDF(s) añadido(s)`);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const reorderFiles = (newOrder: PDFFileItem[]) => {
    setFiles(newOrder);
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      toast.error("Necesitas al menos 2 PDFs para combinar");
      return;
    }

    setIsMerging(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const arrayBuffer = await file.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "combinado.pdf";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("PDFs combinados exitosamente");
    } catch (error) {
      console.error("Error merging PDFs:", error);
      toast.error("Error al combinar los PDFs");
    } finally {
      setIsMerging(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Upload Area */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300",
                dragActive
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                  : "border-slate-300 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-600"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <motion.div
                animate={{ scale: dragActive ? 1.1 : 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                    Añadir archivos PDF
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Arrastra o haz clic para seleccionar
                  </p>
                </div>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                  <FilePlus className="w-3 h-3 mr-1" />
                  Múltiples PDFs
                </Badge>
              </motion.div>
            </div>

            {isProcessing && (
              <div className="mt-4 space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-center text-slate-500">
                  Procesando archivos... {Math.round(progress)}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File List */}
        {files.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                  PDFs a combinar ({files.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  className="text-slate-500 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Arrastra para reordenar. El orden determina la secuencia en el PDF final.
              </p>

              <Reorder.Group
                axis="y"
                values={files}
                onReorder={reorderFiles}
                className="space-y-2"
              >
                <AnimatePresence>
                  {files.map((file, index) => (
                    <Reorder.Item
                      key={file.id}
                      value={file}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 group hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      >
                        {/* Order Number */}
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {index + 1}
                        </div>

                        {/* File Icon */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {file.pageCount} {file.pageCount === 1 ? "página" : "páginas"} • {formatFileSize(file.size)}
                          </p>
                        </div>

                        {/* Drag Handle */}
                        <GripVertical className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(file.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Side Panel */}
      <div className="space-y-4">
        {/* Summary */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-500/10 to-yellow-600/10">
          <CardContent className="p-6">
            <h3 className="font-semibold text-amber-700 dark:text-amber-300 mb-4 flex items-center gap-2">
              <Merge className="w-5 h-5" />
              Resumen
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-slate-900/50">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {files.length}
                </p>
                <p className="text-xs text-slate-500">Archivos</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/50 dark:bg-slate-900/50">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {totalPages}
                </p>
                <p className="text-xs text-slate-500">Páginas totales</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/30 dark:bg-slate-900/30 mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Tamaño total: <strong className="text-amber-700 dark:text-amber-300">{formatFileSize(totalSize)}</strong>
              </p>
            </div>

            <Button
              onClick={mergePDFs}
              disabled={files.length < 2 || isMerging}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 shadow-lg shadow-amber-500/25"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Combinando...
                </>
              ) : (
                <>
                  <Merge className="w-5 h-5 mr-2" />
                  Combinar PDFs
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">
              💡 Cómo usar
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Añade al menos 2 archivos PDF</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Arrastra para cambiar el orden</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Haz clic en "Combinar PDFs"</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>El archivo se descargará automáticamente</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
