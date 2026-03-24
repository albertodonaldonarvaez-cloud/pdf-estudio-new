"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Download,
  Loader2,
  File,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileOutput,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PDFFile {
  id: string;
  name: string;
  size: number;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  downloadUrl?: string;
  preview?: string;
}

export function PDFToWord() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(
      (file) => file.type === "application/pdf"
    );

    if (validFiles.length !== newFiles.length) {
      toast.error("Solo se aceptan archivos PDF");
    }

    const processedFiles = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      file,
      status: "pending" as const,
    }));

    setFiles((prev) => [...prev, ...processedFiles]);
    toast.success(`${processedFiles.length} archivo(s) PDF añadido(s)`);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.downloadUrl) {
        URL.revokeObjectURL(file.downloadUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const convertToWord = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) {
      toast.error("No hay archivos para convertir");
      return;
    }

    setIsProcessing(true);

    for (const file of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, status: "processing" } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", file.file);

        const response = await fetch("/api/pdf/convert-to-word", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Error al convertir");
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "done", downloadUrl }
              : f
          )
        );
      } catch (error) {
        console.error("Error:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error" } : f
          )
        );
      }
    }

    setIsProcessing(false);
    toast.success("Conversión completada");
  };

  const downloadFile = (file: PDFFile) => {
    if (file.downloadUrl) {
      const a = document.createElement("a");
      a.href = file.downloadUrl;
      a.download = file.name.replace(".pdf", ".docx");
      a.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Upload Area */}
      <div className="space-y-4">
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300",
                dragActive
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                  : "border-slate-300 dark:border-slate-700 hover:border-orange-400 dark:hover:border-orange-600"
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                    Arrastra archivos PDF aquí
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    o haz clic para seleccionar
                  </p>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  <FileText className="w-3 h-3 mr-1" />
                  Solo PDF
                </Badge>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        {files.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                  Archivos ({files.length})
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl",
                      file.status === "done"
                        ? "bg-green-50 dark:bg-green-950/30"
                        : file.status === "error"
                        ? "bg-red-50 dark:bg-red-950/30"
                        : file.status === "processing"
                        ? "bg-orange-50 dark:bg-orange-950/30"
                        : "bg-slate-100 dark:bg-slate-800"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                      {file.status === "processing" ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                      ) : file.status === "done" ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : file.status === "error" ? (
                        <AlertCircle className="w-5 h-5 text-white" />
                      ) : (
                        <File className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatFileSize(file.size)}
                        {file.status === "done" && " • Convertido"}
                        {file.status === "processing" && " • Convirtiendo..."}
                        {file.status === "error" && " • Error"}
                      </p>
                    </div>
                    {file.status === "done" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadFile(file)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Descargar
                      </Button>
                    )}
                    {file.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Convert Button */}
        <Button
          onClick={convertToWord}
          disabled={files.filter((f) => f.status === "pending").length === 0 || isProcessing}
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Convirtiendo...
            </>
          ) : (
            <>
              <FileOutput className="w-5 h-5 mr-2" />
              Convertir a Word ({files.filter((f) => f.status === "pending").length})
            </>
          )}
        </Button>
      </div>

      {/* Info Panel */}
      <div className="space-y-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500/10 to-amber-600/10">
          <CardContent className="p-6">
            <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-4 flex items-center gap-2">
              <FileOutput className="w-5 h-5" />
              Conversión PDF a Word
            </h3>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
              <p>
                Esta herramienta extrae el contenido de tus PDFs y lo convierte
                en documentos Word editables (.docx).
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-orange-200 dark:border-orange-800">
                <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {files.filter((f) => f.status === "done").length}
                  </p>
                  <p className="text-xs text-slate-500">Convertidos</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {files.filter((f) => f.status === "pending").length}
                  </p>
                  <p className="text-xs text-slate-500">Pendientes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">
              Características
            </h4>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Extrae texto e imágenes de PDFs</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Mantiene el formato original</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Soporta tablas y listas</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Documento Word completamente editable</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
