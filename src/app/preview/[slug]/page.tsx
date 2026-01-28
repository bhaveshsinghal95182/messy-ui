import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { getComponentBySlugOrAlias } from "@/config/components";
import { Loader2 } from "lucide-react";

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PreviewPage({
  params,
  searchParams,
}: PreviewPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const component = getComponentBySlugOrAlias(slug);

  if (!component) {
    notFound();
  }

  const Component = component.component;

  const props: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (value === undefined) continue;
    const stringValue = Array.isArray(value) ? value[0] : value;
    
    if (stringValue === "true") props[key] = true;
    else if (stringValue === "false") props[key] = false;
    else {
      const num = parseFloat(stringValue);
      if (!isNaN(num) && stringValue.trim() !== "") {
        props[key] = num;
      } else {
        props[key] = stringValue;
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        }
      >
        <Component {...props} />
      </Suspense>
    </div>
  );
}
