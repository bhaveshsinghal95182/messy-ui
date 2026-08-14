/**
 * Renders schema.org structured data as a JSON-LD script tag.
 *
 * Server component by design - the markup has to exist in the initial HTML
 * for crawlers that never run JavaScript.
 */
interface JsonLdProps {
  /** One schema object, or several to emit as a @graph. */
  schema: Record<string, unknown> | Record<string, unknown>[];
}

export default function JsonLd({ schema }: JsonLdProps) {
  const payload = Array.isArray(schema)
    ? {
        '@context': 'https://schema.org',
        // The @context lives on the graph, not on each node inside it.
        '@graph': schema.map((entry) => {
          const node = { ...entry };
          delete node['@context'];
          return node;
        }),
      }
    : schema;

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped below to keep a "</script>" inside any
      // string value from closing the tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, '\\u003c'),
      }}
    />
  );
}
