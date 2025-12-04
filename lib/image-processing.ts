/**
 * Enhanced Image processing utilities for roof analysis
 * Version 2.0 - Maximum Accuracy Edition
 * Includes: Dynamic scaling, shadow compensation, adaptive contrast,
 * multi-threshold edge detection, k-means segmentation, quality assessment
 */

export interface ImageMetadata {
  timestamp: Date
  zoom: number
  tilt: number
  heading: number
  lat: number
  lng: number
  metersPerPixel: number
  processingOptions: ProcessingOptions
  imageQuality: number
}

export interface ProcessingOptions {
  enhanceEdges?: boolean
  enhanceContrast?: boolean
  addMeasurementGrid?: boolean
  compensateShadows?: boolean
  sharpenImage?: boolean
  dimensions?: { width: number; height: number }
  zoom?: number
  latitude?: number
}

export interface EnhancedImageResult {
  imageData: string
  metadata: ImageMetadata
  qualityScore: number
}

// Calculate real-world scale based on zoom level and latitude
export const calculateScale = (
  zoom: number,
  latitude: number
): { metersPerPixel: number; pixelsFor10m: number } => {
  // Web Mercator projection formula
  const metersPerPixel =
    (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoom)
  const pixelsFor10m = 10 / metersPerPixel

  return { metersPerPixel, pixelsFor10m: Math.round(pixelsFor10m) }
}

// Estimate property bounds based on typical residential property sizes
// Returns estimated width/height in meters
export const estimatePropertySize = (
  lat: number,
  lng: number
): { widthMeters: number; heightMeters: number } => {
  // Default to typical residential property size
  // Small: 15m x 15m (small urban lot)
  // Medium: 30m x 30m (suburban home)
  // Large: 50m x 50m (large suburban/rural)

  // For now, use medium as default
  // In future, could query Google Maps Places API or use building footprint data
  return {
    widthMeters: 40, // Conservative estimate to ensure full capture
    heightMeters: 40
  }
}

// Calculate optimal zoom level to fit property in frame
export const calculateOptimalZoom = (
  propertyWidthMeters: number,
  propertyHeightMeters: number,
  latitude: number,
  viewportWidthPixels: number = 1200,
  viewportHeightPixels: number = 800,
  targetCoveragePercent: number = 0.7 // Property should fill 70% of frame
): { optimalZoom: number; zoomLevels: number[]; metersPerPixel: number } => {
  // Calculate how many meters we need to show to fit the property
  const requiredWidthMeters = propertyWidthMeters / targetCoveragePercent
  const requiredHeightMeters = propertyHeightMeters / targetCoveragePercent

  // Use the larger dimension to ensure both fit
  const requiredMeters = Math.max(requiredWidthMeters, requiredHeightMeters)

  // Calculate required meters per pixel
  const requiredMetersPerPixel =
    requiredMeters / Math.min(viewportWidthPixels, viewportHeightPixels)

  // Calculate zoom level from meters per pixel
  // Formula: metersPerPixel = 156543.03392 * cos(latitude) / 2^zoom
  // Solving for zoom: zoom = log2(156543.03392 * cos(latitude) / metersPerPixel)
  const cosLat = Math.cos((latitude * Math.PI) / 180)
  const calculatedZoom = Math.log2(
    (156543.03392 * cosLat) / requiredMetersPerPixel
  )

  // Round to nearest integer and constrain to valid Google Maps zoom range (0-22)
  let optimalZoom = Math.round(calculatedZoom)
  optimalZoom = Math.max(17, Math.min(22, optimalZoom)) // Min 17, Max 22

  // Generate 2 zoom levels with maximum spread for very distinct perspectives
  const zoomLevels = [
    Math.max(17, optimalZoom - 3), // Context view (much more zoomed out)
    Math.min(22, optimalZoom + 3) // Detail view (much more zoomed in)
  ]

  // Calculate actual meters per pixel at optimal zoom
  const actualMetersPerPixel =
    (156543.03392 * cosLat) / Math.pow(2, optimalZoom)

  return {
    optimalZoom,
    zoomLevels,
    metersPerPixel: actualMetersPerPixel
  }
}

// Validate that property will fit in frame at given zoom
export const validatePropertyFitsInFrame = (
  propertyWidthMeters: number,
  propertyHeightMeters: number,
  zoom: number,
  latitude: number,
  viewportWidthPixels: number = 1200,
  viewportHeightPixels: number = 800
): { fits: boolean; coveragePercent: number; warning?: string } => {
  const scale = calculateScale(zoom, latitude)
  const metersPerPixel = scale.metersPerPixel

  // Calculate how many meters are visible in the viewport
  const visibleWidthMeters = viewportWidthPixels * metersPerPixel
  const visibleHeightMeters = viewportHeightPixels * metersPerPixel

  // Check if property fits
  const widthFits = propertyWidthMeters <= visibleWidthMeters
  const heightFits = propertyHeightMeters <= visibleHeightMeters
  const fits = widthFits && heightFits

  // Calculate coverage percentage
  const widthCoverage = propertyWidthMeters / visibleWidthMeters
  const heightCoverage = propertyHeightMeters / visibleHeightMeters
  const coveragePercent = Math.max(widthCoverage, heightCoverage)

  let warning: string | undefined
  if (!fits) {
    warning = `Property (${propertyWidthMeters}m x ${propertyHeightMeters}m) won't fit in frame at zoom ${zoom}. Visible area: ${visibleWidthMeters.toFixed(0)}m x ${visibleHeightMeters.toFixed(0)}m`
  } else if (coveragePercent < 0.3) {
    warning = `Property only fills ${(coveragePercent * 100).toFixed(0)}% of frame - consider zooming in`
  } else if (coveragePercent > 0.9) {
    warning = `Property fills ${(coveragePercent * 100).toFixed(0)}% of frame - may be too tight, consider zooming out`
  }

  return {
    fits,
    coveragePercent,
    warning
  }
}

// Calculate optimal zoom for a specific viewing angle
// This accounts for property orientation, viewing angle, and tilt perspective
export const calculateZoomForAngle = (
  propertyWidthMeters: number,
  propertyHeightMeters: number,
  heading: number, // 0°, 90°, 180°, 270°
  tilt: number, // 0° for overhead, 60° for angled views
  latitude: number,
  viewportWidthPixels: number = 1200,
  viewportHeightPixels: number = 800,
  targetCoverage: number = 0.85 // Target 85% frame coverage for tight shots
): number => {
  // Convert heading to radians
  const headingRad = (heading * Math.PI) / 180

  // Calculate apparent dimensions from this viewing angle
  // Property might be rectangular (e.g., 20m x 40m), so apparent width varies by angle
  const apparentWidth =
    Math.abs(propertyWidthMeters * Math.cos(headingRad)) +
    Math.abs(propertyHeightMeters * Math.sin(headingRad))

  const apparentDepth =
    Math.abs(propertyWidthMeters * Math.sin(headingRad)) +
    Math.abs(propertyHeightMeters * Math.cos(headingRad))

  // Adjust for tilt perspective
  // At 60° tilt, we need more vertical space because we're viewing at an angle
  // The vertical space needed increases by 1/cos(tilt)
  let effectiveHeight = apparentDepth
  if (tilt > 0) {
    const tiltRad = (tilt * Math.PI) / 180
    effectiveHeight = apparentDepth / Math.cos(tiltRad)
  }

  // Calculate required dimensions with target coverage
  const requiredWidthMeters = apparentWidth / targetCoverage
  const requiredHeightMeters = effectiveHeight / targetCoverage

  // Use the larger dimension to ensure both fit
  const requiredMeters = Math.max(requiredWidthMeters, requiredHeightMeters)

  // Calculate required meters per pixel
  const requiredMetersPerPixel =
    requiredMeters / Math.min(viewportWidthPixels, viewportHeightPixels)

  // Calculate zoom level from meters per pixel
  const cosLat = Math.cos((latitude * Math.PI) / 180)
  const calculatedZoom = Math.log2(
    (156543.03392 * cosLat) / requiredMetersPerPixel
  )

  // Round and constrain to valid Google Maps zoom range
  let optimalZoom = Math.round(calculatedZoom)
  optimalZoom = Math.max(17, Math.min(22, optimalZoom))

  // Validate that property fits at this zoom
  const validation = validatePropertyFitsInFrame(
    apparentWidth,
    effectiveHeight,
    optimalZoom,
    latitude,
    viewportWidthPixels,
    viewportHeightPixels
  )

  // If property doesn't fit, reduce zoom until it does
  while (!validation.fits && optimalZoom > 17) {
    optimalZoom--
    const newValidation = validatePropertyFitsInFrame(
      apparentWidth,
      effectiveHeight,
      optimalZoom,
      latitude,
      viewportWidthPixels,
      viewportHeightPixels
    )
    if (newValidation.fits) break
  }

  // If we can zoom in more while staying under 90% coverage, do it
  let testZoom = optimalZoom + 1
  while (testZoom <= 22) {
    const testValidation = validatePropertyFitsInFrame(
      apparentWidth,
      effectiveHeight,
      testZoom,
      latitude,
      viewportWidthPixels,
      viewportHeightPixels
    )
    if (testValidation.fits && testValidation.coveragePercent < 0.9) {
      optimalZoom = testZoom
      testZoom++
    } else {
      break
    }
  }

  return optimalZoom
}

// Assess image quality before processing
const assessImageQuality = (
  data: Uint8ClampedArray,
  width: number,
  height: number
): number => {
  let totalContrast = 0
  let totalSharpness = 0
  let darkPixels = 0
  let count = 0

  // Calculate local contrast and sharpness
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const center = (data[idx] + data[idx + 1] + data[idx + 2]) / 3

      // Calculate local contrast (difference from neighbors)
      const top =
        (data[((y - 1) * width + x) * 4] +
          data[((y - 1) * width + x) * 4 + 1] +
          data[((y - 1) * width + x) * 4 + 2]) /
        3
      const bottom =
        (data[((y + 1) * width + x) * 4] +
          data[((y + 1) * width + x) * 4 + 1] +
          data[((y + 1) * width + x) * 4 + 2]) /
        3
      const left =
        (data[(y * width + (x - 1)) * 4] +
          data[(y * width + (x - 1)) * 4 + 1] +
          data[(y * width + (x - 1)) * 4 + 2]) /
        3
      const right =
        (data[(y * width + (x + 1)) * 4] +
          data[(y * width + (x + 1)) * 4 + 1] +
          data[(y * width + (x + 1)) * 4 + 2]) /
        3

      const localContrast =
        Math.abs(center - top) +
        Math.abs(center - bottom) +
        Math.abs(center - left) +
        Math.abs(center - right)

      totalContrast += localContrast
      totalSharpness += localContrast > 10 ? 1 : 0

      if (center < 80) darkPixels++
      count++
    }
  }

  const avgContrast = totalContrast / count
  const sharpnessRatio = totalSharpness / count
  const darkRatio = darkPixels / count

  // Score from 0-100
  // High contrast + high sharpness + not too dark = high quality
  const contrastScore = Math.min((avgContrast / 50) * 100, 100)
  const sharpnessScore = sharpnessRatio * 100
  const brightnessScore = (1 - darkRatio) * 100

  const qualityScore =
    contrastScore * 0.4 + sharpnessScore * 0.4 + brightnessScore * 0.2

  return Math.round(qualityScore)
}

// Adaptive contrast based on histogram analysis
const calculateAdaptiveContrast = (data: Uint8ClampedArray): number => {
  let sum = 0
  let count = 0
  let variance = 0

  // Calculate mean brightness
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    sum += brightness
    count++
  }
  const mean = sum / count

  // Calculate variance
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    variance += Math.pow(brightness - mean, 2)
  }
  variance = variance / count
  const stdDev = Math.sqrt(variance)

  // Low variance (flat image) needs more contrast
  // High variance (already contrasty) needs less
  if (stdDev < 30) {
    return 15 // High contrast boost for flat images
  } else if (stdDev < 50) {
    return 10 // Moderate boost
  } else if (stdDev < 70) {
    return 6 // Slight boost
  } else {
    return 3 // Minimal boost for already contrasty images
  }
}

// Shadow detection and compensation
const compensateShadows = (data: Uint8ClampedArray): void => {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const brightness = (r + g + b) / 3
    const maxChannel = Math.max(r, g, b)
    const minChannel = Math.min(r, g, b)
    const saturation = maxChannel - minChannel

    // Dark + low saturation = likely shadow
    if (brightness < 90 && saturation < 40) {
      // Calculate lift factor (darker shadows get more lift)
      const liftFactor = 1.3 + (90 - brightness) / 200

      data[i] = Math.min(255, r * liftFactor)
      data[i + 1] = Math.min(255, g * liftFactor)
      data[i + 2] = Math.min(255, b * liftFactor)
    }
  }
}

// Unsharp mask sharpening
const applyUnsharpMask = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number = 0.5
): void => {
  const blurred = new Uint8ClampedArray(data)

  // Apply Gaussian blur to create blurred version
  boxBlur(blurred, width, height, 2)

  // Unsharp mask: original + amount * (original - blurred)
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const original = data[i + c]
      const blur = blurred[i + c]
      const sharpened = original + amount * (original - blur)
      data[i + c] = Math.max(0, Math.min(255, sharpened))
    }
  }
}

// Enhanced Canny-style edge detection with dual thresholds
const applyCannyEdgeDetection = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  lowThreshold: number = 30,
  highThreshold: number = 80
): Uint8ClampedArray => {
  const output = new Uint8ClampedArray(data.length)
  const grayscale = new Uint8ClampedArray(width * height)
  const magnitude = new Float32Array(width * height)
  const direction = new Float32Array(width * height)

  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    grayscale[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b
  }

  // Apply Sobel operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixelIdx = y * width + x

      // Sobel kernels
      const gx =
        -1 * grayscale[pixelIdx - width - 1] +
        -2 * grayscale[pixelIdx - 1] +
        -1 * grayscale[pixelIdx + width - 1] +
        1 * grayscale[pixelIdx - width + 1] +
        2 * grayscale[pixelIdx + 1] +
        1 * grayscale[pixelIdx + width + 1]

      const gy =
        -1 * grayscale[pixelIdx - width - 1] +
        -2 * grayscale[pixelIdx - width] +
        -1 * grayscale[pixelIdx - width + 1] +
        1 * grayscale[pixelIdx + width - 1] +
        2 * grayscale[pixelIdx + width] +
        1 * grayscale[pixelIdx + width + 1]

      magnitude[pixelIdx] = Math.sqrt(gx * gx + gy * gy)
      direction[pixelIdx] = Math.atan2(gy, gx)
    }
  }

  // Non-maximum suppression
  const suppressed = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixelIdx = y * width + x
      const angle = direction[pixelIdx] * (180 / Math.PI)
      const mag = magnitude[pixelIdx]

      let neighbor1 = 0,
        neighbor2 = 0

      // Check neighbors along gradient direction
      if (
        (angle >= -22.5 && angle < 22.5) ||
        angle >= 157.5 ||
        angle < -157.5
      ) {
        neighbor1 = magnitude[pixelIdx - 1]
        neighbor2 = magnitude[pixelIdx + 1]
      } else if (
        (angle >= 22.5 && angle < 67.5) ||
        (angle >= -157.5 && angle < -112.5)
      ) {
        neighbor1 = magnitude[pixelIdx - width + 1]
        neighbor2 = magnitude[pixelIdx + width - 1]
      } else if (
        (angle >= 67.5 && angle < 112.5) ||
        (angle >= -112.5 && angle < -67.5)
      ) {
        neighbor1 = magnitude[pixelIdx - width]
        neighbor2 = magnitude[pixelIdx + width]
      } else {
        neighbor1 = magnitude[pixelIdx - width - 1]
        neighbor2 = magnitude[pixelIdx + width + 1]
      }

      if (mag >= neighbor1 && mag >= neighbor2) {
        suppressed[pixelIdx] = mag
      }
    }
  }

  // Double thresholding and edge tracking by hysteresis
  const strong = 255
  const weak = 100
  const edges = new Uint8ClampedArray(width * height)

  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] >= highThreshold) {
      edges[i] = strong
    } else if (suppressed[i] >= lowThreshold) {
      edges[i] = weak
    }
  }

  // Connect weak edges to strong edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixelIdx = y * width + x

      if (edges[pixelIdx] === weak) {
        // Check if connected to strong edge
        const hasStrongNeighbor =
          edges[pixelIdx - width - 1] === strong ||
          edges[pixelIdx - width] === strong ||
          edges[pixelIdx - width + 1] === strong ||
          edges[pixelIdx - 1] === strong ||
          edges[pixelIdx + 1] === strong ||
          edges[pixelIdx + width - 1] === strong ||
          edges[pixelIdx + width] === strong ||
          edges[pixelIdx + width + 1] === strong

        if (hasStrongNeighbor) {
          edges[pixelIdx] = strong
        } else {
          edges[pixelIdx] = 0
        }
      }
    }
  }

  // Convert to RGBA
  for (let i = 0; i < edges.length; i++) {
    const idx = i * 4
    output[idx] = edges[i]
    output[idx + 1] = edges[i]
    output[idx + 2] = edges[i]
    output[idx + 3] = 255
  }

  return output
}

// K-means color segmentation (improved)
const applyKMeansSegmentation = (
  data: Uint8ClampedArray,
  k: number = 6
): Uint8ClampedArray => {
  const pixels: number[][] = []

  // Extract RGB values
  for (let i = 0; i < data.length; i += 4) {
    pixels.push([data[i], data[i + 1], data[i + 2]])
  }

  // Initialize centroids randomly
  const centroids: number[][] = []
  for (let i = 0; i < k; i++) {
    const randomIdx = Math.floor(Math.random() * pixels.length)
    centroids.push([...pixels[randomIdx]])
  }

  // K-means iterations
  const maxIterations = 10
  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters: number[][] = Array(k)
      .fill(null)
      .map(() => [])

    // Assign pixels to nearest centroid
    pixels.forEach((pixel, idx) => {
      let minDist = Infinity
      let bestCluster = 0

      centroids.forEach((centroid, cIdx) => {
        const dist = Math.sqrt(
          Math.pow(pixel[0] - centroid[0], 2) +
            Math.pow(pixel[1] - centroid[1], 2) +
            Math.pow(pixel[2] - centroid[2], 2)
        )

        if (dist < minDist) {
          minDist = dist
          bestCluster = cIdx
        }
      })

      clusters[bestCluster].push(idx)
    })

    // Update centroids
    clusters.forEach((cluster, cIdx) => {
      if (cluster.length === 0) return

      let sumR = 0,
        sumG = 0,
        sumB = 0
      cluster.forEach(pixelIdx => {
        sumR += pixels[pixelIdx][0]
        sumG += pixels[pixelIdx][1]
        sumB += pixels[pixelIdx][2]
      })

      centroids[cIdx] = [
        sumR / cluster.length,
        sumG / cluster.length,
        sumB / cluster.length
      ]
    })
  }

  // Apply segmentation
  const segmented = new Uint8ClampedArray(data.length)
  pixels.forEach((pixel, idx) => {
    let minDist = Infinity
    let bestCentroid = centroids[0]

    centroids.forEach(centroid => {
      const dist = Math.sqrt(
        Math.pow(pixel[0] - centroid[0], 2) +
          Math.pow(pixel[1] - centroid[1], 2) +
          Math.pow(pixel[2] - centroid[2], 2)
      )

      if (dist < minDist) {
        minDist = dist
        bestCentroid = centroid
      }
    })

    const i = idx * 4
    segmented[i] = bestCentroid[0]
    segmented[i + 1] = bestCentroid[1]
    segmented[i + 2] = bestCentroid[2]
    segmented[i + 3] = 255
  })

  return segmented
}

// Main enhancement function with all improvements
export const enhanceImageForRoofAnalysis = async (
  imageData: string,
  options: ProcessingOptions = {}
): Promise<EnhancedImageResult> => {
  // Default options
  const settings: ProcessingOptions = {
    enhanceEdges: true,
    enhanceContrast: true,
    addMeasurementGrid: true,
    compensateShadows: true,
    sharpenImage: true,
    dimensions: { width: 800, height: 600 },
    zoom: 20,
    latitude: 0,
    ...options
  }

  // Create an image from the data URL
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = imageData
  })

  // Create a canvas to process the image
  const canvas = document.createElement("canvas")
  canvas.width = settings.dimensions!.width || img.width
  canvas.height = settings.dimensions!.height || img.height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    console.error("Could not get canvas context for image processing")
    const defaultMetadata: ImageMetadata = {
      timestamp: new Date(),
      zoom: settings.zoom || 20,
      tilt: 0,
      heading: 0,
      lat: settings.latitude || 0,
      lng: 0,
      metersPerPixel: 0,
      processingOptions: settings,
      imageQuality: 0
    }
    return { imageData, metadata: defaultMetadata, qualityScore: 0 }
  }

  // Draw the image on the canvas with high quality settings
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  ctx.filter = "none"

  // Get image data for processing
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  // Assess initial quality
  const initialQuality = assessImageQuality(data, canvas.width, canvas.height)
  console.log(`Initial image quality: ${initialQuality}/100`)

  // Apply initial blur to reduce noise
  boxBlur(data, canvas.width, canvas.height, 1)

  // Store a copy of the original for reference
  const originalData = new Uint8ClampedArray(data)

  // Step 1: Shadow compensation (if enabled)
  if (settings.compensateShadows) {
    compensateShadows(data)
    console.log("Shadow compensation applied")
  }

  // Step 2: Sharpening (if enabled) - Increased for better accuracy
  if (settings.sharpenImage) {
    applyUnsharpMask(data, canvas.width, canvas.height, 0.8) // Increased from 0.6 to 0.8
    console.log("Image sharpening applied (strength: 0.8)")
  }

  // Step 3: Adaptive contrast enhancement
  if (settings.enhanceContrast) {
    const contrastValue = calculateAdaptiveContrast(data)
    console.log(`Applying adaptive contrast: ${contrastValue}`)
    applyContrastEnhancement(data, contrastValue * 1.1) // Slightly boost contrast
  }

  // Step 4: Enhanced edge detection with Canny algorithm - Stronger for better facet detection
  if (settings.enhanceEdges) {
    const edgeData = applyCannyEdgeDetection(
      data,
      canvas.width,
      canvas.height,
      25,
      90
    ) // More sensitive thresholds

    // Blend edges with stronger intensity for clearer facet boundaries
    for (let i = 0; i < data.length; i += 4) {
      const edgeIntensity = edgeData[i] / 255
      data[i] = Math.min(255, data[i] + edgeData[i] * 0.4) // Increased from 0.3 to 0.4
      data[i + 1] = Math.min(255, data[i + 1] + edgeData[i] * 0.4)
      data[i + 2] = Math.min(255, data[i + 2] + edgeData[i] * 0.4)
    }
    console.log(
      "Canny edge detection applied (thresholds: 25-90, intensity: 0.4)"
    )
  }

  // Put the processed image data back
  ctx.putImageData(imgData, 0, 0)

  // Step 5: Add measurement grid with dynamic scale
  if (settings.addMeasurementGrid) {
    const scale = calculateScale(settings.zoom || 20, settings.latitude || 0)
    drawMeasurementGrid(
      ctx,
      canvas.width,
      canvas.height,
      scale,
      settings.zoom || 20
    )
    console.log(
      `Measurement grid applied with scale: ${scale.metersPerPixel.toFixed(2)}m/pixel`
    )
  }

  // Assess final quality
  const finalImgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const finalQuality = assessImageQuality(
    finalImgData.data,
    canvas.width,
    canvas.height
  )
  console.log(
    `Final image quality: ${finalQuality}/100 (improvement: ${finalQuality - initialQuality})`
  )

  // Calculate scale info
  const scaleInfo = calculateScale(settings.zoom || 20, settings.latitude || 0)

  // Create metadata
  const metadata: ImageMetadata = {
    timestamp: new Date(),
    zoom: settings.zoom || 20,
    tilt: 0,
    heading: 0,
    lat: settings.latitude || 0,
    lng: 0,
    metersPerPixel: scaleInfo.metersPerPixel,
    processingOptions: settings,
    imageQuality: finalQuality
  }

  // Convert back to data URL with high quality
  const enhancedImageData = canvas.toDataURL("image/jpeg", 0.98)

  return {
    imageData: enhancedImageData,
    metadata,
    qualityScore: finalQuality
  }
}

// Function to apply contrast enhancement
function applyContrastEnhancement(
  data: Uint8ClampedArray,
  contrast: number
): void {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128))
    data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128))
    data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128))
  }
}

// Enhanced measurement grid with dynamic scale
function drawMeasurementGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: { metersPerPixel: number; pixelsFor10m: number },
  zoom: number
): void {
  // Calculate grid size (approximately 10x10 grid)
  const gridSizeX = Math.floor(width / 10)
  const gridSizeY = Math.floor(height / 10)

  // Save current context
  ctx.save()

  // Set grid style - brighter and more visible
  ctx.strokeStyle = "rgba(0, 255, 26, 0.95)"
  ctx.lineWidth = 2.0

  // Draw vertical lines
  for (let x = 0; x <= width; x += gridSizeX) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Draw horizontal lines
  for (let y = 0; y <= height; y += gridSizeY) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Add grid coordinates
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
  ctx.font = "bold 12px Arial"
  ctx.textAlign = "center"
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)"
  ctx.shadowBlur = 3
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1

  // Label columns with letters
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  for (let i = 0; i < 10 && i < letters.length; i++) {
    ctx.fillText(letters.charAt(i), i * gridSizeX + gridSizeX / 2, 15)
  }

  // Label rows with numbers
  for (let i = 0; i < 10; i++) {
    ctx.fillText(`${i + 1}`, 12, i * gridSizeY + gridSizeY / 2 + 5)
  }

  // Reset shadow
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Draw ENHANCED SCALE REFERENCE with multiple measurements for better accuracy
  const scalePixels10m = scale.pixelsFor10m
  const scalePixels5m = scalePixels10m / 2
  const scalePixels20m = scalePixels10m * 2
  const startX = 50
  const startY = height - 50

  // Draw large, prominent background with bright border
  const scaleWidth = Math.max(scalePixels20m + 40, 320)
  const scaleHeight = 80
  ctx.fillStyle = "rgba(0, 0, 0, 0.90)"
  ctx.fillRect(startX - 15, startY - 50, scaleWidth, scaleHeight)

  // Draw bright yellow border for maximum visibility
  ctx.strokeStyle = "rgba(255, 255, 0, 0.9)"
  ctx.lineWidth = 3
  ctx.strokeRect(startX - 15, startY - 50, scaleWidth, scaleHeight)

  // Draw main 20m scale bar (extra thick bright line)
  ctx.strokeStyle = "rgba(255, 255, 0, 1.0)"
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(startX + scalePixels20m, startY)
  ctx.stroke()

  // Draw tick marks at 0m, 5m, 10m, 15m, 20m
  ctx.lineWidth = 3
  for (let i = 0; i <= 4; i++) {
    const tickX = startX + scalePixels5m * i
    ctx.beginPath()
    ctx.moveTo(tickX, startY - 8)
    ctx.lineTo(tickX, startY + 8)
    ctx.stroke()
  }

  // Add measurement labels below the scale bar
  ctx.fillStyle = "rgba(255, 255, 255, 1.0)"
  ctx.font = "bold 13px Arial"
  ctx.textAlign = "center"

  // Label each tick mark
  const labels = [
    "0m",
    "5m\n(16ft)",
    "10m\n(33ft)",
    "15m\n(49ft)",
    "20m\n(66ft)"
  ]
  for (let i = 0; i <= 4; i++) {
    const labelX = startX + scalePixels5m * i
    ctx.fillText(labels[i].split("\n")[0], labelX, startY + 20)
    if (i > 0) {
      ctx.font = "10px Arial"
      ctx.fillText(labels[i].split("\n")[1], labelX, startY + 32)
      ctx.font = "bold 13px Arial"
    }
  }

  // Add title above scale bar
  ctx.font = "bold 16px Arial"
  ctx.textAlign = "left"
  ctx.fillStyle = "rgba(255, 255, 0, 1.0)"
  ctx.fillText("📏 MEASUREMENT SCALE", startX, startY - 35)

  // Add zoom and resolution info
  ctx.font = "bold 12px Arial"
  ctx.fillStyle = "rgba(255, 255, 255, 1.0)"
  ctx.fillText(
    `Zoom: ${zoom} | Scale: ${scale.metersPerPixel.toFixed(3)}m/pixel | Grid: ~${(scale.metersPerPixel * (width / 10)).toFixed(1)}m per square`,
    startX,
    startY - 17
  )

  // Add compass indicator (North arrow) at top right
  const compassX = width - 60
  const compassY = 60
  const arrowSize = 20

  // Draw compass background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
  ctx.fillRect(
    compassX - arrowSize - 5,
    compassY - arrowSize - 15,
    arrowSize * 2 + 10,
    arrowSize * 2 + 20
  )

  // Draw arrow
  ctx.strokeStyle = "rgba(255, 255, 255, 1.0)"
  ctx.fillStyle = "rgba(255, 255, 255, 1.0)"
  ctx.lineWidth = 2

  // Arrow body
  ctx.beginPath()
  ctx.moveTo(compassX, compassY + arrowSize)
  ctx.lineTo(compassX, compassY - arrowSize)
  ctx.stroke()

  // Arrow head
  ctx.beginPath()
  ctx.moveTo(compassX - arrowSize / 2, compassY - arrowSize / 2)
  ctx.lineTo(compassX, compassY - arrowSize)
  ctx.lineTo(compassX + arrowSize / 2, compassY - arrowSize / 2)
  ctx.closePath()
  ctx.fill()

  // Add N label
  ctx.font = "bold 12px Arial"
  ctx.textAlign = "center"
  ctx.fillText("N", compassX, compassY - arrowSize - 5)

  // Restore context
  ctx.restore()
}

// Enhanced color segmentation with k-means
export const segmentRoofColors = async (
  imageData: string,
  k: number = 6
): Promise<string> => {
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = imageData
  })

  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    return imageData
  }

  ctx.drawImage(img, 0, 0)

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const segmented = applyKMeansSegmentation(imgData.data, k)

  // Create new image data with segmented colors
  const segmentedImgData = new ImageData(segmented, canvas.width, canvas.height)
  ctx.putImageData(segmentedImgData, 0, 0)

  return canvas.toDataURL("image/jpeg", 0.95)
}

// Enhanced pitch visualization
export const enhanceRoofPitch = async (imageData: string): Promise<string> => {
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = imageData
  })

  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    return imageData
  }

  ctx.drawImage(img, 0, 0)

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  // Convert to grayscale first
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }

  // Apply gradient detection for pitch
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4

      const top = data[(y - 1) * canvas.width * 4 + x * 4]
      const bottom = data[(y + 1) * canvas.width * 4 + x * 4]
      const left = data[y * canvas.width * 4 + (x - 1) * 4]
      const right = data[y * canvas.width * 4 + (x + 1) * 4]

      const gradY = bottom - top
      const gradX = right - left

      const mag = Math.sqrt(gradX * gradX + gradY * gradY)
      const angle = Math.atan2(gradY, gradX)

      // Create false color based on gradient direction
      const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360
      const saturation = Math.min(mag / 50, 1) * 100
      const lightness = 50

      // HSL to RGB conversion
      let r = 0,
        g = 0,
        b = 0
      const c = ((1 - Math.abs((2 * lightness) / 100 - 1)) * saturation) / 100
      const x_val = c * (1 - Math.abs(((hue / 60) % 2) - 1))
      const m = lightness / 100 - c / 2

      if (hue >= 0 && hue < 60) {
        r = c
        g = x_val
        b = 0
      } else if (hue >= 60 && hue < 120) {
        r = x_val
        g = c
        b = 0
      } else if (hue >= 120 && hue < 180) {
        r = 0
        g = c
        b = x_val
      } else if (hue >= 180 && hue < 240) {
        r = 0
        g = x_val
        b = c
      } else if (hue >= 240 && hue < 300) {
        r = x_val
        g = 0
        b = c
      } else {
        r = c
        g = 0
        b = x_val
      }

      data[idx] = Math.round((r + m) * 255)
      data[idx + 1] = Math.round((g + m) * 255)
      data[idx + 2] = Math.round((b + m) * 255)
    }
  }

  ctx.putImageData(imgData, 0, 0)

  // Add pitch reference guide
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
  ctx.fillRect(10, canvas.height - 100, 130, 90)

  ctx.font = "bold 14px Arial"
  ctx.fillStyle = "white"
  ctx.fillText("Pitch Reference", 20, canvas.height - 80)

  const colors = [
    "#ff0000",
    "#ffff00",
    "#00ff00",
    "#00ffff",
    "#0000ff",
    "#ff00ff"
  ]
  const pitches = ["1/12", "3/12", "5/12", "7/12", "9/12", "12/12"]

  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i]
    ctx.fillRect(20, canvas.height - 65 + i * 10, 10, 8)
    ctx.fillStyle = "white"
    ctx.font = "11px Arial"
    ctx.fillText(pitches[i], 35, canvas.height - 58 + i * 10)
  }

  return canvas.toDataURL("image/jpeg", 0.95)
}

// Fast box blur for noise reduction
function boxBlur(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number = 1
): void {
  const tmp = new Uint8ClampedArray(data)
  for (let y = radius; y < h - radius; y++) {
    for (let x = radius; x < w - radius; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0,
          cnt = 0
        for (let oy = -radius; oy <= radius; oy++) {
          for (let ox = -radius; ox <= radius; ox++) {
            const idx = ((y + oy) * w + (x + ox)) * 4 + c
            sum += tmp[idx]
            cnt++
          }
        }
        data[(y * w + x) * 4 + c] = sum / cnt
      }
    }
  }
}
