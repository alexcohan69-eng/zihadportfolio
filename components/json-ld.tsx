/**
 * Server component that injects a structured-data (JSON-LD) document.
 *
 * Rendered as a plain <script> so the payload is present in the initial HTML
 * and is parsed by crawlers without waiting for hydration.
 */
export function JsonLd({ data }: { data: string }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped below to neutralise `</script>` breakouts.
      dangerouslySetInnerHTML={{
        __html: data.replace(/</g, '\\u003c'),
      }}
    />
  )
}
