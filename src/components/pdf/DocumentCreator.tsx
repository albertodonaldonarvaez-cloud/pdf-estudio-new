"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Type,
  Download,
  Loader2,
  Plus,
  Minus,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Upload,
  Image as ImageIcon,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Settings,
  FileUp,
  Save,
  Printer,
  MoreHorizontal,
  FileImage,
  Layers,
  ArrowUpDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageBlock {
  id: string;
  type: "image";
  src: string;
  file?: File;
  width: number;
  height: number;
  alignment: "left" | "center" | "right";
  caption?: string;
  isPdfPage?: boolean;
  pageNum?: number;
}

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

interface PdfPageBlock {
  id: string;
  type: "pdfPage";
  pdfBase64: string;
  pageNum: number;
  width: number;
  height: number;
}

type ContentBlock = TextBlock | ImageBlock | PdfPageBlock;

interface DocumentSettings {
  pageSize: "a4" | "letter" | "legal" | "a5";
  orientation: "portrait" | "landscape";
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

const PAGE_SIZES = {
  a4: { width: 210, height: 297, name: "A4 (210 × 297 mm)" },
  letter: { width: 216, height: 279, name: "Carta (216 × 279 mm)" },
  legal: { width: 216, height: 356, name: "Legal (216 × 356 mm)" },
  a5: { width: 148, height: 210, name: "A5 (148 × 210 mm)" },
};

export function DocumentCreator() {
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: "1", type: "heading1", content: "Mi Documento", formatting: { bold: true, italic: false, underline: false }, alignment: "center" },
    { id: "2", type: "paragraph", content: "Comienza a escribir tu documento aquí. Puedes agregar texto, imágenes y más.", formatting: { bold: false, italic: false, underline: false }, alignment: "left" },
  ]);
  const [title, setTitle] = useState("Mi Documento");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [settings, setSettings] = useState<DocumentSettings>({
    pageSize: "a4",
    orientation: "portrait",
    marginTop: 25,
    marginBottom: 25,
    marginLeft: 25,
    marginRight: 25,
  });
  const [preserveExact, setPreserveExact] = useState(false);
  const [pdfPageOrder, setPdfPageOrder] = useState<Array<{ id: string; pageNum: number; pdfBase64: string }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Calculate page dimensions for preview
  const getPreviewDimensions = () => {
    const pageSize = PAGE_SIZES[settings.pageSize];
    const isLandscape = settings.orientation === "landscape";
    const width = isLandscape ? pageSize.height : pageSize.width;
    const height = isLandscape ? pageSize.width : pageSize.height;
    
    // Scale to fit preview
    const scale = zoom / 100;
    const previewWidth = Math.min(600, width * 3 * scale);
    const previewHeight = (height / width) * previewWidth;
    
    return { width: previewWidth, height: previewHeight, realWidth: width, realHeight: height };
  };

  const addBlock = (type: ContentBlock["type"], afterId?: string) => {
    const newBlock: ContentBlock = type === "image" 
      ? { id: Math.random().toString(36).substring(7), type: "image", src: "", width: 300, height: 200, alignment: "center" }
      : type === "pdfPage"
      ? { id: Math.random().toString(36).substring(7), type: "pdfPage", pdfBase64: "", pageNum: 1, width: 595, height: 842 }
      : { 
          id: Math.random().toString(36).substring(7), 
          type: type as TextBlock["type"], 
          content: "", 
          formatting: { bold: false, italic: false, underline: false },
          alignment: "left"
        };
    
    if (afterId) {
      setBlocks((prev) => {
        const index = prev.findIndex((b) => b.id === afterId);
        const newBlocks = [...prev];
        newBlocks.splice(index + 1, 0, newBlock);
        return newBlocks;
      });
    } else {
      setBlocks((prev) => [...prev, newBlock]);
    }
    setSelectedBlock(newBlock.id);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) {
      toast.error("Debe haber al menos un bloque");
      return;
    }
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setPdfPageOrder((prev) => prev.filter((p) => p.id !== id));
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
      return newBlocks;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const maxWidth = 400;
          const scale = Math.min(1, maxWidth / img.width);
          const newBlock: ImageBlock = {
            id: Math.random().toString(36).substring(7),
            type: "image",
            src: event.target?.result as string,
            file,
            width: img.width * scale,
            height: img.height * scale,
            alignment: "center",
          };
          setBlocks((prev) => [...prev, newBlock]);
          setSelectedBlock(newBlock.id);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("Por favor, sube un archivo PDF válido");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("preserveImages", "true");

    try {
      const response = await fetch("/api/pdf/extract-content", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Error al extraer contenido");

      const data = await response.json();
      
      if (data.preserveExact && data.pdfBase64) {
        // PDF has images or complex content - preserve exactly
        setPreserveExact(true);
        setTitle(data.title || file.name.replace(".pdf", ""));
        
        // Create PDF page blocks for each page
        const pageBlocks: PdfPageBlock[] = [];
        const newPdfPageOrder: Array<{ id: string; pageNum: number; pdfBase64: string }> = [];
        
        for (let i = 0; i < data.pageCount; i++) {
          const id = `pdf-page-${i + 1}`;
          const dims = data.pageDimensions?.[i] || { width: 595, height: 842 };
          
          pageBlocks.push({
            id,
            type: "pdfPage",
            pdfBase64: data.pdfBase64,
            pageNum: i + 1,
            width: dims.width,
            height: dims.height,
          });
          
          newPdfPageOrder.push({
            id,
            pageNum: i,
            pdfBase64: data.pdfBase64,
          });
        }
        
        setBlocks(pageBlocks);
        setPdfPageOrder(newPdfPageOrder);
        
        toast.success(`PDF cargado: ${data.pageCount} páginas preservadas exactamente`);
      } else if (data.blocks && data.blocks.length > 0) {
        // Simple text extraction
        setBlocks(data.blocks);
        setTitle(data.title || file.name.replace(".pdf", ""));
        toast.success(`PDF cargado: ${data.blocks.length} bloques extraídos`);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al cargar el PDF");
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Check if we have PDF pages to preserve exactly
      const pdfPageBlocks = blocks.filter(b => b.type === "pdfPage") as PdfPageBlock[];
      
      if (pdfPageBlocks.length > 0 && pdfPageOrder.length > 0) {
        // Merge PDF pages exactly
        const response = await fetch("/api/pdf/merge-exact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageOrder: pdfPageOrder.map(p => ({
              fileIndex: 0,
              pageIndex: p.pageNum - 1,
              pdfBase64: p.pdfBase64,
            })),
          }),
        });

        if (!response.ok) throw new Error("Error al generar el PDF");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/\s+/g, "_")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("¡PDF generado exitosamente!");
        return;
      }

      // Standard PDF generation with text and images
      const formData = new FormData();
      
      // Prepare blocks with image data
      const blocksForPdf = await Promise.all(blocks.map(async (block) => {
        if (block.type === "image" && block.file) {
          // Convert file to base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(block.file!);
          });
          return { ...block, base64 };
        }
        return block;
      }));

      const response = await fetch("/api/pdf/create-advanced", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          blocks: blocksForPdf,
          settings: {
            ...settings,
            pageSize: PAGE_SIZES[settings.pageSize],
          },
        }),
      });

      if (!response.ok) throw new Error("Error al generar el PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("¡PDF generado exitosamente!");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al generar el PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const getBlockStyle = (block: TextBlock) => {
    const baseStyles: Record<string, string> = {
      heading1: "text-2xl",
      heading2: "text-xl",
      heading3: "text-lg",
      paragraph: "text-base",
      bullet: "text-base",
      numbered: "text-base",
    };

    let style = baseStyles[block.type] || "text-base";
    
    if (block.formatting.bold) style += " font-bold";
    if (block.formatting.italic) style += " italic";
    if (block.formatting.underline) style += " underline";

    return style;
  };

  const { width: previewWidth, height: previewHeight, realWidth, realHeight } = getPreviewDimensions();

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left Toolbar */}
      <div className="lg:w-64 flex-shrink-0">
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-4">
          <CardContent className="p-4 space-y-4">
            {/* Document Title */}
            <div>
              <Label className="text-xs text-slate-500 mb-1">Título del documento</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título"
                className="border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Preserve Exact Mode Indicator */}
            {preserveExact && (
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs">
                  <Check className="w-4 h-4" />
                  <span>Modo preservación exacta</span>
                </div>
                <p className="text-[10px] text-emerald-500 mt-1">
                  Las páginas del PDF se mantienen exactamente como el original
                </p>
              </div>
            )}

            <Separator />

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pdfInputRef.current?.click()}
                className="justify-start border-slate-200 dark:border-slate-700"
              >
                <FileUp className="w-4 h-4 mr-2" />
                Cargar PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                className="justify-start border-slate-200 dark:border-slate-700"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Agregar Imagen
              </Button>
            </div>

            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePDFUpload}
              className="hidden"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <Separator />

            {/* Add Blocks - only show if not in exact mode */}
            {!preserveExact && (
              <div>
                <Label className="text-xs text-slate-500 mb-2">Agregar contenido</Label>
                <div className="grid grid-cols-2 gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock("heading1")}
                          className="border-slate-200 dark:border-slate-700"
                        >
                          <Heading1 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Título H1</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock("heading2")}
                          className="border-slate-200 dark:border-slate-700"
                        >
                          <Heading2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Título H2</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock("paragraph")}
                          className="border-slate-200 dark:border-slate-700"
                        >
                          <Type className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Párrafo</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock("bullet")}
                          className="border-slate-200 dark:border-slate-700"
                        >
                          <List className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lista viñeta</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock("numbered")}
                          className="border-slate-200 dark:border-slate-700"
                        >
                          <ListOrdered className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lista numerada</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => imageInputRef.current?.click()}
                          className="border-slate-200 dark:border-slate-700"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Imagen</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}

            {/* Page reordering controls for exact mode */}
            {preserveExact && (
              <div>
                <Label className="text-xs text-slate-500 mb-2">Organizar páginas</Label>
                <p className="text-xs text-slate-400 mb-2">
                  Arrastra los bloques para reordenar las páginas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreserveExact(false)}
                  className="w-full border-slate-200 dark:border-slate-700"
                >
                  Convertir a editable
                </Button>
              </div>
            )}

            <Separator />

            {/* Page Settings */}
            <div>
              <Label className="text-xs text-slate-500 mb-2">Configuración de página</Label>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-400">Tamaño</Label>
                  <Select 
                    value={settings.pageSize} 
                    onValueChange={(v) => setSettings(s => ({ ...s, pageSize: v as DocumentSettings["pageSize"] }))}
                  >
                    <SelectTrigger className="h-8 text-xs border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAGE_SIZES).map(([key, value]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {value.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-slate-400">Orientación</Label>
                  <Select 
                    value={settings.orientation}
                    onValueChange={(v) => setSettings(s => ({ ...s, orientation: v as DocumentSettings["orientation"] }))}
                  >
                    <SelectTrigger className="h-8 text-xs border-slate-200 dark:border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait" className="text-xs">Vertical</SelectItem>
                      <SelectItem value="landscape" className="text-xs">Horizontal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full border-slate-200 dark:border-slate-700">
                      <Settings className="w-4 h-4 mr-2" />
                      Márgenes
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs">Superior: {settings.marginTop}mm</Label>
                        <Slider
                          value={[settings.marginTop]}
                          onValueChange={([v]) => setSettings(s => ({ ...s, marginTop: v }))}
                          min={5}
                          max={50}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Inferior: {settings.marginBottom}mm</Label>
                        <Slider
                          value={[settings.marginBottom]}
                          onValueChange={([v]) => setSettings(s => ({ ...s, marginBottom: v }))}
                          min={5}
                          max={50}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Izquierdo: {settings.marginLeft}mm</Label>
                        <Slider
                          value={[settings.marginLeft]}
                          onValueChange={([v]) => setSettings(s => ({ ...s, marginLeft: v }))}
                          min={5}
                          max={50}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Derecho: {settings.marginRight}mm</Label>
                        <Slider
                          value={[settings.marginRight]}
                          onValueChange={([v]) => setSettings(s => ({ ...s, marginRight: v }))}
                          min={5}
                          max={50}
                          step={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            {/* Generate Button */}
            <Button
              onClick={generatePDF}
              disabled={isGenerating || isLoading}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 min-w-0">
        {/* Zoom Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="border-slate-200 dark:border-slate-700"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-500 w-12 text-center">{zoom}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="border-slate-200 dark:border-slate-700"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-xs text-slate-400">
            {preserveExact ? `${blocks.length} páginas` : `${realWidth} × ${realHeight} mm`}
          </div>
        </div>

        {/* Pages List for exact mode */}
        {preserveExact ? (
          <div className="space-y-4">
            {blocks.map((block, index) => {
              if (block.type !== "pdfPage") return null;
              const pdfBlock = block as PdfPageBlock;
              
              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden",
                    selectedBlock === block.id && "ring-2 ring-violet-400"
                  )}
                  onClick={() => setSelectedBlock(block.id)}
                >
                  {/* Page Controls */}
                  <div className="absolute top-2 right-2 z-10 flex gap-1">
                    {index > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(block.id, "up");
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUpDown className="w-4 h-4 rotate-180" />
                      </Button>
                    )}
                    {index < blocks.length - 1 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlock(block.id, "down");
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBlock(block.id);
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Page Preview */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900">
                    <div className="aspect-[8.5/11] bg-white shadow-inner flex items-center justify-center">
                      <div className="text-center p-4">
                        <FileImage className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                          Página {pdfBlock.pageNum}
                        </p>
                        <p className="text-sm text-slate-400">
                          {Math.round(pdfBlock.width)} × {Math.round(pdfBlock.height)} pts
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          PDF preservado exactamente
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Normal Document Editor */
          <div className="flex justify-center overflow-auto pb-8">
            <motion.div
              animate={{ scale: 1 }}
              className="relative bg-white shadow-2xl rounded-sm"
              style={{
                width: previewWidth,
                minHeight: previewHeight,
              }}
            >
              {/* Margin Indicators */}
              <div 
                className="absolute top-0 left-0 right-0 border-b-2 border-dashed border-blue-300 dark:border-blue-600 pointer-events-none"
                style={{ top: `${(settings.marginTop / realHeight) * 100}%` }}
              />
              <div 
                className="absolute bottom-0 left-0 right-0 border-t-2 border-dashed border-blue-300 dark:border-blue-600 pointer-events-none"
                style={{ bottom: `${(settings.marginBottom / realHeight) * 100}%` }}
              />
              <div 
                className="absolute top-0 bottom-0 left-0 border-r-2 border-dashed border-blue-300 dark:border-blue-600 pointer-events-none"
                style={{ left: `${(settings.marginLeft / realWidth) * 100}%` }}
              />
              <div 
                className="absolute top-0 bottom-0 right-0 border-l-2 border-dashed border-blue-300 dark:border-blue-600 pointer-events-none"
                style={{ right: `${(settings.marginRight / realWidth) * 100}%` }}
              />

              {/* Content Area */}
              <div 
                className="p-4"
                style={{
                  paddingTop: `${(settings.marginTop / realHeight) * previewHeight}px`,
                  paddingBottom: `${(settings.marginBottom / realHeight) * previewHeight}px`,
                  paddingLeft: `${(settings.marginLeft / realWidth) * previewWidth}px`,
                  paddingRight: `${(settings.marginRight / realWidth) * previewWidth}px`,
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                    <span className="ml-2 text-slate-500">Cargando PDF...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blocks.map((block, index) => (
                      <motion.div
                        key={block.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "group relative rounded transition-all",
                          selectedBlock === block.id 
                            ? "ring-2 ring-violet-400 ring-offset-2" 
                            : "hover:ring-1 hover:ring-slate-300"
                        )}
                        onClick={() => setSelectedBlock(block.id)}
                      >
                        {/* Block Controls */}
                        {selectedBlock === block.id && (
                          <div className="absolute -left-10 top-1 flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-green-500"
                              onClick={() => addBlock(block.type === "image" ? "paragraph" : block.type, block.id)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-blue-500"
                                onClick={() => moveBlock(block.id, "up")}
                              >
                                <ArrowUpDown className="w-3 h-3 rotate-180" />
                              </Button>
                            )}
                            {index < blocks.length - 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-blue-500"
                                onClick={() => moveBlock(block.id, "down")}
                              >
                                <ArrowUpDown className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-red-500"
                              onClick={() => removeBlock(block.id)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                          </div>
                        )}

                        {block.type === "image" ? (
                          <div className={cn(
                            "flex flex-col items-center gap-2",
                            (block as ImageBlock).alignment === "left" && "items-start",
                            (block as ImageBlock).alignment === "right" && "items-end"
                          )}>
                            {(block as ImageBlock).src ? (
                              <img
                                src={(block as ImageBlock).src}
                                alt="Imagen"
                                className="max-w-full rounded shadow"
                                style={{ 
                                  width: (block as ImageBlock).width,
                                  height: (block as ImageBlock).height 
                                }}
                              />
                            ) : (
                              <div 
                                className="bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center"
                                style={{ width: (block as ImageBlock).width, height: (block as ImageBlock).height }}
                              >
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                              </div>
                            )}
                            {selectedBlock === block.id && (
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateBlock(block.id, { alignment: "left" })}
                                  className={cn("h-6", (block as ImageBlock).alignment === "left" && "bg-slate-100")}
                                >
                                  <AlignLeft className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateBlock(block.id, { alignment: "center" })}
                                  className={cn("h-6", (block as ImageBlock).alignment === "center" && "bg-slate-100")}
                                >
                                  <AlignCenter className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => updateBlock(block.id, { alignment: "right" })}
                                  className={cn("h-6", (block as ImageBlock).alignment === "right" && "bg-slate-100")}
                                >
                                  <AlignRight className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Formatting Toolbar for selected text block */}
                            {selectedBlock === block.id && (
                              <div className="flex items-center gap-1 mb-2 p-1 bg-slate-50 dark:bg-slate-800 rounded">
                                <Select
                                  value={block.type as string}
                                  onValueChange={(v) => updateBlock(block.id, { type: v as TextBlock["type"] })}
                                >
                                  <SelectTrigger className="h-6 w-24 text-xs border-slate-200 dark:border-slate-700">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="heading1" className="text-xs">Título H1</SelectItem>
                                    <SelectItem value="heading2" className="text-xs">Título H2</SelectItem>
                                    <SelectItem value="heading3" className="text-xs">Título H3</SelectItem>
                                    <SelectItem value="paragraph" className="text-xs">Párrafo</SelectItem>
                                    <SelectItem value="bullet" className="text-xs">Viñeta</SelectItem>
                                    <SelectItem value="numbered" className="text-xs">Numerada</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                <Separator orientation="vertical" className="h-5 mx-1" />
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-6 w-6 p-0", (block as TextBlock).formatting?.bold && "bg-slate-200 dark:bg-slate-700")}
                                  onClick={() => updateBlock(block.id, { 
                                    formatting: { ...(block as TextBlock).formatting, bold: !(block as TextBlock).formatting?.bold }
                                  })}
                                >
                                  <Bold className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-6 w-6 p-0", (block as TextBlock).formatting?.italic && "bg-slate-200 dark:bg-slate-700")}
                                  onClick={() => updateBlock(block.id, { 
                                    formatting: { ...(block as TextBlock).formatting, italic: !(block as TextBlock).formatting?.italic }
                                  })}
                                >
                                  <Italic className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-6 w-6 p-0", (block as TextBlock).formatting?.underline && "bg-slate-200 dark:bg-slate-700")}
                                  onClick={() => updateBlock(block.id, { 
                                    formatting: { ...(block as TextBlock).formatting, underline: !(block as TextBlock).formatting?.underline }
                                  })}
                                >
                                  <Underline className="w-3 h-3" />
                                </Button>
                                
                                <Separator orientation="vertical" className="h-5 mx-1" />
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-6 w-6 p-0", (block as TextBlock).alignment === "left" && "bg-slate-200 dark:bg-slate-700")}
                                  onClick={() => updateBlock(block.id, { alignment: "left" })}
                                >
                                  <AlignLeft className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-6 w-6 p-0", (block as TextBlock).alignment === "center" && "bg-slate-200 dark:bg-slate-700")}
                                  onClick={() => updateBlock(block.id, { alignment: "center" })}
                                >
                                  <AlignCenter className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-6 w-6 p-0", (block as TextBlock).alignment === "right" && "bg-slate-200 dark:bg-slate-700")}
                                  onClick={() => updateBlock(block.id, { alignment: "right" })}
                                >
                                  <AlignRight className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn("h-6 w-6 p-0", (block as TextBlock).alignment === "justify" && "bg-slate-200 dark:bg-slate-700")}
                                  onClick={() => updateBlock(block.id, { alignment: "justify" })}
                                >
                                  <AlignJustify className="w-3 h-3" />
                                </Button>
                              </div>
                            )}

                            <Textarea
                              value={(block as TextBlock).content || ""}
                              onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                              placeholder={
                                block.type?.toString().startsWith("heading")
                                  ? "Escribe un título..."
                                  : "Escribe el contenido..."
                              }
                              className={cn(
                                "min-h-[40px] resize-none border-0 focus-visible:ring-0 p-1",
                                getBlockStyle(block as TextBlock),
                                (block as TextBlock).alignment === "center" && "text-center",
                                (block as TextBlock).alignment === "right" && "text-right",
                                (block as TextBlock).alignment === "justify" && "text-justify"
                              )}
                              style={{ 
                                background: "transparent",
                              }}
                            />
                          </>
                        )}
                      </motion.div>
                    ))}

                    {/* Add Block Button */}
                    <Button
                      variant="outline"
                      onClick={() => addBlock("paragraph")}
                      className="w-full border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir bloque
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Margin Legend */}
        {!preserveExact && (
          <div className="flex justify-center gap-4 mt-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-300" />
              Márgenes
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
