"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getComponentBySlug, components } from "@/config/components";
import ComponentPreview from "@/components/docs/components-preview";
import PropsTable from "@/components/docs/props-table";
import InstallCommand from "@/components/docs/install-command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const ComponentPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const component = slug ? getComponentBySlug(slug) : undefined;

  if (!component) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-4">Component Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The component you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Gallery
          </Link>
        </Button>
      </div>
    );
  }

  // Get related components from same category
  const relatedComponents = components
    .filter((c) => c.category === component.category && c.slug !== component.slug)
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Components
        </Link>
        <span>/</span>
        <Link
          href={`/?category=${component.category}`}
          className="hover:text-foreground transition-colors"
        >
          {component.category}
        </Link>
        <span>/</span>
        <span className="text-foreground">{component.name}</span>
      </div>

      {/* Header */}
      <div className="space-y-4">
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
      </div>

      {/* Preview */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Preview</h2>
        <ComponentPreview component={component} />
      </section>

      <Separator />

      {/* Installation */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Installation</h2>
        <p className="text-muted-foreground mb-4">
          Install the required dependencies:
        </p>
        <InstallCommand packageName={component.installCommand} />
      </section>

      <Separator />

      {/* Props */}
      <section>
        <h2 className="text-xl font-semibold text-foreground mb-4">Props</h2>
        <PropsTable props={component.props} />
      </section>

      {/* Related Components */}
      {relatedComponents.length > 0 && (
        <>
          <Separator />
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Related Components
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {relatedComponents.map((related) => (
                <Link
                  key={related.slug}
                  href={`/components/${related.slug}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                >
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {related.name}
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default ComponentPage;
