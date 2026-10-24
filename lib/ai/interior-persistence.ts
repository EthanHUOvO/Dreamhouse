type MetadataRecord = Record<string, any>
const record = (value: unknown): MetadataRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as MetadataRecord : null
const has = (value: MetadataRecord, field: string) => Object.prototype.hasOwnProperty.call(value, field)

function captureImages(captures: unknown): Map<string, string | null> {
  const images = new Map<string, string | null>()
  if (!Array.isArray(captures)) return images
  for (const value of captures) {
    const capture = record(value)
    if (!capture || typeof capture.id !== 'string' || !capture.id || typeof capture.image !== 'string' || !capture.image) continue
    // Duplicate IDs with different images cannot identify an unambiguous source.
    if (images.has(capture.id) && images.get(capture.id) !== capture.image) images.set(capture.id, null)
    else if (!images.has(capture.id)) images.set(capture.id, capture.image)
  }
  return images
}

/** Keep the canonical capture.image; omit only exactly identical aliases. */
export function compactInteriorMetadata<T>(value: T): T {
  const input = record(value)
  if (!input) return value
  const output = { ...input }
  const images = captureImages(input.capturedViews)
  if (Array.isArray(input.capturedViews)) output.capturedViews = input.capturedViews.map((value: unknown) => {
    const capture = record(value)
    if (!capture) return value
    const next = { ...capture }
    if (typeof capture.image === 'string' && capture.image) {
      if (capture.screenshotDataUrl === capture.image) delete next.screenshotDataUrl
      const rendered = record(capture.renderedImage)
      if (rendered && rendered.sourceImage === capture.image) {
        next.renderedImage = { ...rendered }
        delete next.renderedImage.sourceImage
      }
    }
    return next
  })
  if (Array.isArray(input.generatedInteriorImages)) output.generatedInteriorImages = input.generatedInteriorImages.map((value: unknown) => {
    const image = record(value)
    if (!image) return value
    const source = images.get(image.sourceCaptureId)
    if (!source || image.sourceImage !== source) return value
    const next = { ...image }
    delete next.sourceImage
    return next
  })
  return output as T
}

/** Rehydrate omitted aliases from the same capture, without touching scenes. */
export function inflateInteriorMetadata<T>(value: T): T {
  const input = record(value)
  if (!input) return value
  const output = { ...input }
  const images = captureImages(input.capturedViews)
  if (Array.isArray(input.capturedViews)) output.capturedViews = input.capturedViews.map((value: unknown) => {
    const capture = record(value)
    if (!capture) return value
    const next = { ...capture }
    if (typeof capture.image === 'string' && capture.image) {
      if (!has(capture, 'screenshotDataUrl')) next.screenshotDataUrl = capture.image
      const rendered = record(capture.renderedImage)
      if (rendered && !has(rendered, 'sourceImage')) next.renderedImage = { ...rendered, sourceImage: capture.image }
    }
    return next
  })
  if (Array.isArray(input.generatedInteriorImages)) output.generatedInteriorImages = input.generatedInteriorImages.map((value: unknown) => {
    const image = record(value)
    if (!image || has(image, 'sourceImage')) return value
    const source = images.get(image.sourceCaptureId)
    return source ? { ...image, sourceImage: source } : value
  })
  return output as T
}
