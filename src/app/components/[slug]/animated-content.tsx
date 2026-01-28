"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { ExternalLink } from "lucide-react";
import { ComponentConfig, InstallationNote } from "@/config/types";
import ComponentPreview from "@/components/docs/components-preview";
import PropsTable from "@/components/docs/props-table";
import InstallationSection from "@/components/docs/installation-section";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import ProgressBar from "@/registry/new-york/progress-bar/progress-bar";

interface AnimatedPageContentProps {
  component: ComponentConfig;
  relatedComponents: ComponentConfig[];
}

const noteStyles: Record<InstallationNote["type"], { icon: typeof Info; className: string }> = {
  info: {
    icon: Info,
    className: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  },
  tip: {
    icon: Lightbulb,
    className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  },
};



// Stagger animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad
    },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function AnimatedPageContent({
  component,
  relatedComponents,
}: AnimatedPageContentProps) {
  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <ProgressBar className="bg-foreground" origin="left" height={1.5} />
      {/* Breadcrumb */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/components" className="hover:text-foreground transition-colors">
          Components
        </Link>
        <span>/</span>
        <Link
          href={`/components?category=${component.category}`}
          className="hover:text-foreground transition-colors"
        >
          {component.category}
        </Link>
        <span>/</span>
        <span className="text-foreground">{component.name}</span>
      </motion.div>

      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">{component.name}</h1>
          <Badge variant="outline">{component.category}</Badge>
          <Badge variant={component.sandbox === "iframe" ? "default" : "secondary"}>
            {component.sandbox} sandbox
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground max-w-3xl">
          {component.description}
        </p>
        {/* SEO Keywords as tags */}
        <motion.div
          className="flex flex-wrap gap-1.5"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {component.keywords.slice(0, 5).map((keyword, index) => (
            <motion.div
              key={keyword}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
            >
              <Badge variant="outline" className="text-xs">
                {keyword}
              </Badge>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Preview */}
      <motion.section variants={sectionVariants}>
        <h2 className="text-xl font-semibold text-foreground mb-4">Preview</h2>
        <ComponentPreview component={component} />
      </motion.section>

      {/* Installation Notes - shown above tabs */}
      {component.notes && component.notes.length > 0 && (
        <div className="space-y-2">
          {component.notes.map((note, index) => {
            const style = noteStyles[note.type];
            const Icon = style.icon;
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border",
                  style.className
                )}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm">{note.message}</p>
              </div>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Installation */}
      <motion.section variants={sectionVariants}>
        <h2 className="text-xl font-semibold text-foreground mb-4">Installation</h2>
        <InstallationSection component={component} />
      </motion.section>

      <Separator />

      {/* Props */}
      <motion.section variants={sectionVariants}>
        <h2 className="text-xl font-semibold text-foreground mb-4">Props</h2>
        <PropsTable props={component.props} />
      </motion.section>

      {/* Related Components */}
      {relatedComponents.length > 0 && (
        <>
          <Separator />
          <motion.section variants={sectionVariants}>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Related Components
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {relatedComponents.map((related, index) => (
                <motion.div
                  key={related.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href={`/components/${related.slug}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                  >
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {related.name}
                    </span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </>
      )}
    </motion.div>
  );
}
