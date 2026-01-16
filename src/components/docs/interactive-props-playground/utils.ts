import { PropDefinition } from "@/config/components";

/**
 * Parse a default value string into its actual typed value
 */
export function parseDefaultValue(defaultStr: string, type: string): unknown {
  if (type === "boolean") return defaultStr === "true";
  if (type === "number") return parseFloat(defaultStr) || 0;
  // Remove surrounding quotes for strings
  return defaultStr.replace(/^["']|["']$/g, "");
}

/**
 * Format a prop value for JSX output
 */
export function formatPropValue(value: unknown, type: string): string {
  if (type === "boolean" || type === "number") {
    return `{${value}}`;
  }
  return `"${value}"`;
}

/**
 * Generates JSX code for component usage with the current props.
 * Only includes props that differ from their default values.
 */
export function generateUsageCode(
  componentName: string,
  currentProps: Record<string, unknown>,
  propDefinitions: PropDefinition[]
): string {
  const propsToInclude = propDefinitions
    .filter((prop) => {
      // Skip callback/function props
      if (prop.type.includes("=>")) return false;
      // Only include if different from default
      const currentValue = currentProps[prop.name];
      const defaultValue = parseDefaultValue(prop.default, prop.type);
      return currentValue !== defaultValue;
    })
    .map((prop) => ({
      name: prop.name,
      value: formatPropValue(currentProps[prop.name], prop.type),
    }));

  if (propsToInclude.length === 0) {
    return `<${componentName} />`;
  }

  const propsString = propsToInclude
    .map((p) => `  ${p.name}=${p.value}`)
    .join("\n");

  return `<${componentName}\n${propsString}\n/>`;
}

/**
 * Parse enum/union type string into array of options
 * e.g., '"sm" | "md" | "lg"' -> ["sm", "md", "lg"]
 */
export function parseEnumOptions(typeStr: string): string[] {
  return typeStr
    .split("|")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s) => s.length > 0);
}
