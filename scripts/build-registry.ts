/**
 * Build script to generate shadcn registry JSON files from component meta.ts files
 * 
 * This script:
 * 1. Reads all component directories in registry/new-york/
 * 2. Imports each component's meta.ts and component code
 * 3. Generates registry.json (index of all components)
 * 4. Generates individual public/r/{component}.json files
 * 
 * Run with: npx tsx scripts/build-registry.ts
 */

import * as fs from "fs";
import * as path from "path";

const REGISTRY_DIR = path.resolve(__dirname, "../registry/new-york");
const PUBLIC_R_DIR = path.resolve(__dirname, "../public/r");
const REGISTRY_JSON_PATH = path.resolve(__dirname, "../registry.json");
const BASE_URL = "https://bhavesh-ui.vercel.app";

interface RegistryFile {
  path: string;
  content: string;
  type: string;
}

interface RegistryItem {
  $schema?: string;
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies: string[];
  files: RegistryFile[];
}

interface RegistryIndex {
  $schema: string;
  name: string;
  homepage: string;
  items: Omit<RegistryItem, "$schema">[];
}

async function getComponentDirs(): Promise<string[]> {
  const entries = fs.readdirSync(REGISTRY_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

async function buildComponentRegistry(componentDir: string): Promise<RegistryItem | null> {
  const componentPath = path.join(REGISTRY_DIR, componentDir);
  const metaPath = path.join(componentPath, "meta.ts");
  const indexPath = path.join(componentPath, "index.ts");

  if (!fs.existsSync(metaPath) || !fs.existsSync(indexPath)) {
    console.warn(`⚠️  Skipping ${componentDir}: missing meta.ts or index.ts`);
    return null;
  }

  // We need to read the files and extract the data
  // Since we can't directly import TypeScript, we'll read and parse the files
  const metaContent = fs.readFileSync(metaPath, "utf-8");
  const indexContent = fs.readFileSync(indexPath, "utf-8");

  // Extract component slug from meta
  const slugMatch = metaContent.match(/slug:\s*["']([^"']+)["']/);
  const nameMatch = metaContent.match(/name:\s*["']([^"']+)["']/);
  const descriptionMatch = metaContent.match(/description:\s*["']([^"']+)["']/);
  
  // Extract dependencies array
  const depsMatch = metaContent.match(/dependencies:\s*\[([^\]]*)\]/);
  const dependencies: string[] = [];
  if (depsMatch) {
    const depsString = depsMatch[1];
    const depMatches = depsString.match(/["']([^"']+)["']/g);
    if (depMatches) {
      depMatches.forEach((d) => dependencies.push(d.replace(/["']/g, "")));
    }
  }

  if (!slugMatch || !nameMatch) {
    console.warn(`⚠️  Skipping ${componentDir}: could not extract slug or name`);
    return null;
  }

  const slug = slugMatch[1];
  const name = nameMatch[1];
  const description = descriptionMatch ? descriptionMatch[1] : "";

  // Find the main component file
  const componentFiles = fs.readdirSync(componentPath).filter(
    (f) => f.endsWith(".tsx") && f !== "index.ts" && !f.includes(".test.")
  );

  const files: RegistryFile[] = [];

  // Add main component files
  for (const file of componentFiles) {
    const filePath = path.join(componentPath, file);
    const content = fs.readFileSync(filePath, "utf-8");
    files.push({
      path: `registry/new-york/${componentDir}/${file}`,
      content: content,
      type: "registry:component",
    });
  }

  // Extract snippets with targetPath from meta.ts
  // Look for snippets array in meta
  const snippetsMatch = metaContent.match(/snippets:\s*\[([\s\S]*?)\],\s*(?:props:|notes:|cliDependencies:|$)/);
  if (snippetsMatch) {
    // Parse each snippet - look for targetPath
    const snippetsContent = snippetsMatch[1];
    const snippetBlocks = snippetsContent.split(/},\s*{/).map((s, i, arr) => {
      if (i === 0) return s;
      return "{" + s;
    }).map((s, i, arr) => {
      if (i === arr.length - 1) return s;
      return s + "}";
    });

    for (const block of snippetBlocks) {
      const targetPathMatch = block.match(/targetPath:\s*["']([^"']+)["']/);
      const codeMatch = block.match(/code:\s*`([\s\S]*?)`/);
      const registryTypeMatch = block.match(/registryType:\s*["']([^"']+)["']/);

      if (targetPathMatch && codeMatch) {
        files.push({
          path: targetPathMatch[1],
          content: codeMatch[1],
          type: registryTypeMatch ? registryTypeMatch[1] : "registry:file",
        });
      }
    }
  }

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: slug,
    type: "registry:component",
    title: name,
    description,
    dependencies,
    files,
  };
}

async function main() {
  console.log("🔨 Building shadcn registry...\n");

  // Ensure public/r directory exists
  if (!fs.existsSync(PUBLIC_R_DIR)) {
    fs.mkdirSync(PUBLIC_R_DIR, { recursive: true });
  }

  const componentDirs = await getComponentDirs();
  console.log(`📦 Found ${componentDirs.length} components\n`);

  const registryItems: RegistryItem[] = [];

  for (const dir of componentDirs) {
    console.log(`  Processing ${dir}...`);
    const item = await buildComponentRegistry(dir);
    if (item) {
      registryItems.push(item);

      // Write individual component JSON
      const componentJsonPath = path.join(PUBLIC_R_DIR, `${item.name}.json`);
      fs.writeFileSync(componentJsonPath, JSON.stringify(item, null, 2));
      console.log(`    ✅ Generated ${item.name}.json (${item.files.length} files)`);
    }
  }

  // Write registry.json index
  const registryIndex: RegistryIndex = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "bhavesh-ui",
    homepage: BASE_URL,
    items: registryItems.map(({ $schema, ...item }) => item),
  };

  fs.writeFileSync(REGISTRY_JSON_PATH, JSON.stringify(registryIndex, null, 2));
  console.log(`\n✅ Generated registry.json with ${registryItems.length} components`);

  console.log("\n🎉 Registry build complete!");
}

main().catch(console.error);
