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
  FileSpreadsheet,
  Presentation,
  FileType,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OutputFormat = "word" | "excel" | "pptx" | "txt";

interface OutputFormatOption {
  id: OutputFormat;
  label: string;
  extension: string;
  icon: any;
  description: string;
}

const outputFormats: OutputFormatOption[] = [
  {
    id: "word",
    label: "Word (.docx)",
    extension: ".docx",
    icon: FileText,
    description: "Documento Word editable",
  },
  {
    id: "excel",
    label: "Excel (.xlsx)",
    extension: ".xlsx",
    icon: FileSpreadsheet,
    description: "Hoja de cálculo con tablas",
  },
  {
    id: "pptx",
    label: "PowerPoint (.pptx)",
    extension: ".pptx",
    icon: Presentation,
    description: "Presentación de diapositivas",
  },
  {
    id: "txt",
    label: "Texto (.txt)",
    extension: ".txt",
    icon: FileType,
    description: "Texto plano sin formato",
  },
];

interface PDFFile {
  id: string;
  name: string;
  size: number;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  downloadUrl?: string;
  outputFormat: OutputFormat;
}

export function PDFToWord() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [defaultFormat, setDefaultFormat] = useState<OutputFormat>("word");

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
      outputFormat: defaultFormat,
    }));

    setFiles((prev) => [...prev, ...processedFiles]);
    toast.success(`${processedFiles.length} archivo(s) PDF añadido(s)`);
  };

  const updateFileFormat = (id: string, format: OutputFormat) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, outputFormat: format } : f))
    );
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

  const convertFiles = async () => {
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
        formData.append("format", file.outputFormat);

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
      const format = outputFormats.find((f) => f.id === file.outputFormat);
      const a = document.createElement("a");
      a.href = file.downloadUrl;
      a.download = file.name.replace(".pdf", format?.extension || ".docx");
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
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Upload Area */}
      <div className="space-y-4">
        {/* Format Selector */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Formato de salida:
                </p>
                <Select
                  value={defaultFormat}
                  onValueChange={(v) => setDefaultFormat(v as OutputFormat)}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {outputFormats.map((format) => {
                      const Icon = format.icon;
                      return (
                        <SelectItem key={format.id} value={format.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{format.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-slate-500">
                {outputFormats.find((f) => f.id === defaultFormat)?.description}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-300",
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
                className="flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-medium text-slate-700 dark:text-slate-200">
                    Arrastra archivos PDF aquí
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    o haz clic para seleccionar
                  </p>
                </div>
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 text-xs">
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
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-200">
                  Archivos ({files.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  className="text-slate-500 hover:text-red-500 h-8"
                >
                  <Trash2 className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Limpiar</span>
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file) => {
                  const format = outputFormats.find((f) => f.id === file.outputFormat);
                  const FormatIcon = format?.icon || FileText;
                  
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl",
                        file.status === "done"
                          ? "bg-green-50 dark:bg-green-950/30"
                          : file.status === "error"
                          ? "bg-red-50 dark:bg-red-950/30"
                          : file.status === "processing"
                          ? "bg-orange-50 dark:bg-orange-950/30"
                          : "bg-slate-100 dark:bg-slate-800"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0">
                          {file.status === "processing" ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
                          ) : file.status === "done" ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : file.status === "error" ? (
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <File className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                            {formatFileSize(file.size)}
                            {file.status === "done" && ` • Convertido a ${format?.label}`}
                            {file.status === "processing" && " • Convirtiendo..."}
                            {file.status === "error" && " • Error"}
                          </p>
                        </div>
                      </div>
                      
                      {/* Format selector for individual file */}
                      {file.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={file.outputFormat}
                            onValueChange={(v) => updateFileFormat(file.id, v as OutputFormat)}
                          >
                            <SelectTrigger className="h-8 w-full sm:w-28 text-xs bg-white dark:bg-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {outputFormats.map((fmt) => {
                                const Icon = fmt.icon;
                                return (
                                  <SelectItem key={fmt.id} value={fmt.id} className="text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <Icon className="w-3 h-3" />
                                      <span>{fmt.extension}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(file.id)}
                            className="text-slate-400 hover:text-red-500 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      
                      {file.status === "done" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(file)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30 h-8"
                        >
                          <Download className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">Descargar</span>
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Convert Button */}
        <Button
          onClick={convertFiles}
          disabled={files.filter((f) => f.status === "pending").length === 0 || isProcessing}
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Convirtiendo...
            </>
          ) : (
            <>
              <FileOutput className="w-5 h-5 mr-2" />
              Convertir ({files.filter((f) => f.status === "pending").length} archivos)
            </>
          )}
        </Button>
      </div>

      {/* Info Panel */}
      <div className="space-y-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500/10 to-amber-600/10">
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold text-orange-700 dark:text-orange-300 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <FileOutput className="w-4 h-4 sm:w-5 sm:h-5" />
              Conversión PDF Multi-Formato
            </h3>
            <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <p>
                Convierte tus PDFs a múltiples formatos de manera rápida y sencilla.
              </p>
              
              {/* Format Cards */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {outputFormats.map((format) => {
                  const Icon = format.icon;
                  return (
                    <div
                      key={format.id}
                      className={cn(
                        "p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-slate-900/50 border",
                        defaultFormat === format.id
                          ? "border-orange-300 dark:border-orange-700"
                          : "border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="font-medium text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                          {format.label}
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        {format.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-orange-200 dark:border-orange-800">
                <div className="text-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                  <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {files.filter((f) => f.status === "done").length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Convertidos</p>
                </div>
                <div className="text-center p-2 sm:p-3 rounded-lg bg-white/50 dark:bg-slate-900/50">
                  <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {files.filter((f) => f.status === "pending").length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Pendientes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <h4 className="font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-300 mb-3 sm:mb-4">
              Características
            </h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Extrae texto, tablas e imágenes</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Selecciona el formato de salida</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Documentos completamente editables</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Conversión múltiple en lote</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
