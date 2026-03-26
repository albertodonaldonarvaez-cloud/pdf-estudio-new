"use client";

import { useState, useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import {
  Upload,
  Image,
  Download,
  Loader2,
  File,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Eye,
  X,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageFile {
  id: string;
  name: string;
  size: number;
  file: File;
  preview: string;
  order: number;
}

export function ImageToPDF() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pageSize, setPageSize] = useState("a4");
  const [orientation, setOrientation] = useState("portrait");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
    const validFiles = newFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length !== newFiles.length) {
      toast.error("Algunos archivos no son imágenes válidas");
    }

    const processedFiles = validFiles.map((file, index) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      file,
      preview: URL.createObjectURL(file),
      order: images.length + index + 1,
    }));

    setImages((prev) => [...prev, ...processedFiles]);
    toast.success(`${processedFiles.length} imagen(es) añadida(s)`);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const moveImage = (id: string, direction: "up" | "down") => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (
        (direction === "up" && index === 0) ||
        (direction === "down" && index === prev.length - 1)
      ) {
        return prev;
      }

      const newImages = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [newImages[index], newImages[swapIndex]] = [
        newImages[swapIndex],
        newImages[index],
      ];
      return newImages.map((img, i) => ({ ...img, order: i + 1 }));
    });
  };

  const generatePDF = async () => {
    if (images.length === 0) {
      toast.error("Por favor, añade al menos una imagen");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      images.forEach((img, index) => {
        formData.append("images", img.file);
        formData.append("order", index.toString());
      });
      formData.append("pageSize", pageSize);
      formData.append("orientation", orientation);

      const response = await fetch("/api/pdf/from-images", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al generar el PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "imagenes.pdf";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("¡PDF generado exitosamente!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setIsProcessing(false);
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
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Upload Area */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300",
                dragActive
                  ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30"
                  : "border-slate-300 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-600"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <motion.div
                animate={{ scale: dragActive ? 1.1 : 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-200">
                    Arrastra imágenes aquí
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    o haz clic para seleccionar
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                    PNG
                  </Badge>
                  <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300">
                    JPG
                  </Badge>
                  <Badge variant="secondary" className="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-300">
                    WebP
                  </Badge>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Image Grid */}
        {images.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                  Imágenes ({images.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    images.forEach((img) => URL.revokeObjectURL(img.preview));
                    setImages([]);
                  }}
                  className="text-slate-500 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((image, index) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />

                    {/* Order Badge */}
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                      {index + 1}
                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewImage(image.preview)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveImage(image.id, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveImage(image.id, "down")}
                        disabled={index === images.length - 1}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeImage(image.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* File Info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white truncate">{image.name}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
                Usa las flechas para reordenar las imágenes. El orden determina las páginas del PDF.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settings Panel */}
      <div className="space-y-4">
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-rose-500" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                Configuración
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm text-slate-600 dark:text-slate-400">
                  Tamaño de página
                </Label>
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="mt-1 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="letter">Carta (216 × 279 mm)</SelectItem>
                    <SelectItem value="legal">Legal (216 × 356 mm)</SelectItem>
                    <SelectItem value="a5">A5 (148 × 210 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm text-slate-600 dark:text-slate-400">
                  Orientación
                </Label>
                <Select value={orientation} onValueChange={setOrientation}>
                  <SelectTrigger className="mt-1 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Vertical</SelectItem>
                    <SelectItem value="landscape">Horizontal</SelectItem>
                    <SelectItem value="auto">Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={generatePDF}
              disabled={images.length === 0 || isProcessing}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generar PDF ({images.length} {images.length === 1 ? "página" : "páginas"})
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-500/10 to-pink-600/10">
          <CardContent className="p-4">
            <h4 className="font-semibold text-rose-700 dark:text-rose-300 mb-2">
              💡 Consejos
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Arrastra para reordenar las imágenes</li>
              <li>• Cada imagen será una página</li>
              <li>• El tamaño se ajusta automáticamente</li>
              <li>• Soporta PNG, JPG, WebP, GIF</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
