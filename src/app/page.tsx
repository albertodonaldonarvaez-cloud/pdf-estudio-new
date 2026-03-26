"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ScanLine,
  FileOutput,
  ImageIcon,
  Layers,
  Merge,
  PenTool,
  Sparkles,
  LogOut,
  Shield,
  Menu,
  X,
  FileSpreadsheet,
  Presentation,
  FileType,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Import components for each tab
import { OCREditor } from "@/components/pdf/OCREditor";
import { DocumentCreator } from "@/components/pdf/DocumentCreator";
import { PDFToWord } from "@/components/pdf/PDFToWord";
import { ImageToPDF } from "@/components/pdf/ImageToPDF";
import { PDFOrganizer } from "@/components/pdf/PDFOrganizer";
import { PDFMerger } from "@/components/pdf/PDFMerger";

interface Tool {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
  component: any;
  gradient: string;
  iconBg: string;
}

const tools: Tool[] = [
  {
    id: "ocr",
    label: "OCR",
    shortLabel: "OCR",
    description: "Extraer texto de imágenes y PDFs",
    icon: ScanLine,
    component: OCREditor,
    gradient: "from-emerald-400 to-teal-500",
    iconBg: "bg-gradient-to-br from-emerald-400/20 to-teal-500/20",
  },
  {
    id: "create",
    label: "Crear PDF",
    shortLabel: "Crear",
    description: "Editor estilo Word para documentos",
    icon: PenTool,
    component: DocumentCreator,
    gradient: "from-violet-400 to-purple-500",
    iconBg: "bg-gradient-to-br from-violet-400/20 to-purple-500/20",
  },
  {
    id: "pdf-to-word",
    label: "Convertir PDF",
    shortLabel: "Convertir",
    description: "PDF a Word, Excel, PPT, TXT",
    icon: FileOutput,
    component: PDFToWord,
    gradient: "from-orange-400 to-amber-500",
    iconBg: "bg-gradient-to-br from-orange-400/20 to-amber-500/20",
  },
  {
    id: "image-to-pdf",
    label: "Imagen a PDF",
    shortLabel: "Imagen",
    description: "Convertir imágenes a PDF",
    icon: ImageIcon,
    component: ImageToPDF,
    gradient: "from-rose-400 to-pink-500",
    iconBg: "bg-gradient-to-br from-rose-400/20 to-pink-500/20",
  },
  {
    id: "organize",
    label: "Organizar PDF",
    shortLabel: "Organizar",
    description: "Reordenar y rotar páginas",
    icon: Layers,
    component: PDFOrganizer,
    gradient: "from-cyan-400 to-sky-500",
    iconBg: "bg-gradient-to-br from-cyan-400/20 to-sky-500/20",
  },
  {
    id: "merge",
    label: "Unir PDFs",
    shortLabel: "Unir",
    description: "Combinar múltiples PDFs",
    icon: Merge,
    component: PDFMerger,
    gradient: "from-amber-400 to-yellow-500",
    iconBg: "bg-gradient-to-br from-amber-400/20 to-yellow-500/20",
  },
];

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "USER";
  storageLimit: number;
  storageUsed: number;
}

export default function PDFEditorPage() {
  const [activeTool, setActiveTool] = useState("create");
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mx-auto mb-4"
          />
          <p className="text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  const storagePercent = user ? (user.storageUsed / user.storageLimit) * 100 : 0;
  const ActiveComponent = tools.find(t => t.id === activeTool)?.component || DocumentCreator;
  const activeToolData = tools.find(t => t.id === activeTool);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-20 sm:pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                </div>
              </div>
              <span className="text-sm sm:text-base font-semibold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                PDF Studio
              </span>
            </motion.div>

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="rounded-full px-2 h-8 sm:h-9 gap-1.5 sm:gap-2 hover:bg-white/50 dark:hover:bg-slate-800/50"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium shadow-sm">
                  {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm text-slate-600 dark:text-slate-300 max-w-[100px] truncate">
                  {user?.name || user?.email?.split("@")[0]}
                </span>
              </Button>

              {/* User Dropdown */}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-10 sm:top-12 w-52 sm:w-56 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl border border-slate-200/50 dark:border-slate-800/50 p-2 overflow-hidden"
                  >
                    <div className="p-2 sm:p-3 border-b border-slate-100 dark:border-slate-800">
                      <p className="font-medium text-sm text-slate-900 dark:text-white truncate">
                        {user?.name || "Usuario"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                      
                      {/* Storage */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Almacenamiento</span>
                          <span>{user?.storageUsed} / {user?.storageLimit} MB</span>
                        </div>
                        <Progress value={storagePercent} className="h-1.5" />
                      </div>
                    </div>

                    <div className="p-1">
                      {user?.role === "ADMIN" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push("/admin")}
                          className="w-full justify-start gap-2 rounded-lg sm:rounded-xl text-sm"
                        >
                          <Shield className="w-4 h-4 text-violet-500" />
                          Panel Admin
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className="w-full justify-start gap-2 rounded-lg sm:rounded-xl text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Page Title - Hidden on mobile for more space */}
        <motion.div
          key={activeTool}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 sm:mb-6 hidden sm:block"
        >
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {activeToolData?.label}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeToolData?.description}
          </p>
        </motion.div>

        {/* Tool Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar - Optimized for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-2 sm:px-4 pb-2 sm:pb-4 pointer-events-none safe-area-inset-bottom">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="max-w-lg mx-auto pointer-events-auto"
        >
          {/* Liquid Glass Container */}
          <div className="relative">
            {/* Glass Background */}
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-white/10 dark:bg-slate-900/10 backdrop-blur-2xl" />
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/20 to-white/5 dark:from-slate-700/20 dark:to-slate-900/5" />
            <div className="absolute inset-[1px] rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/30 to-transparent dark:from-white/10 dark:to-transparent opacity-50" />
            
            {/* Content */}
            <div className="relative flex items-center justify-around px-1 sm:px-2 py-2 sm:py-3 rounded-2xl sm:rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl shadow-black/5 dark:shadow-black/20">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                const isHovered = hoveredTool === tool.id;

                return (
                  <motion.button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    onMouseEnter={() => setHoveredTool(tool.id)}
                    onMouseLeave={() => setHoveredTool(null)}
                    className="relative flex flex-col items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl transition-all duration-300 group touch-manipulation"
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Active Background */}
                    {isActive && (
                      <motion.div
                        layoutId="activeToolBg"
                        className={cn(
                          "absolute inset-0 rounded-xl sm:rounded-2xl",
                          "bg-gradient-to-br",
                          tool.gradient,
                          "shadow-lg"
                        )}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Hover Glow - Desktop only */}
                    {!isActive && isHovered && !isMobile && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          "absolute inset-0 rounded-xl sm:rounded-2xl",
                          tool.iconBg
                        )}
                      />
                    )}

                    {/* Icon */}
                    <div className="relative z-10">
                      <Icon
                        className={cn(
                          "w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300",
                          isActive
                            ? "text-white"
                            : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                        )}
                      />
                    </div>

                    {/* Label */}
                    <span
                      className={cn(
                        "text-[9px] sm:text-[10px] font-medium transition-all duration-300 relative z-10",
                        isActive
                          ? "text-white/90"
                          : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                      )}
                    >
                      {tool.shortLabel}
                    </span>

                    {/* Tooltip on Hover - Desktop only */}
                    <AnimatePresence>
                      {isHovered && !isActive && !isMobile && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          className="absolute -top-14 left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 text-xs whitespace-nowrap shadow-xl backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="font-medium">{tool.label}</span>
                          </div>
                          <p className="text-[10px] opacity-70 mt-0.5 max-w-[150px] text-center">
                            {tool.description}
                          </p>
                          {/* Arrow */}
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900/95 dark:bg-white/95 rotate-45 rounded-sm" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
