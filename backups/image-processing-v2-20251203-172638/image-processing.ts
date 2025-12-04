/**
 * Image processing utilities for roof analysis
 * Uses client-side processing to enhance satellite images before AI analysis
 */

// Function to enhance image for roof analysis
export const enhanceImageForRoofAnalysis = async (
  imageData: string,
  options: {
    enhanceEdges?: boolean
    enhanceContrast?: boolean
    addMeasurementGrid?: boolean
    dimensions?: { width: number; height: number }
  } = {}
): Promise<string> => {
  // Default options
  const settings = {
    enhanceEdges: true,
    enhanceContrast: true,
    addMeasurementGrid: true,
    dimensions: { width: 800, height: 600 },
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
  canvas.width = settings.dimensions.width || img.width
  canvas.height = settings.dimensions.height || img.height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    console.error("Could not get canvas context for image processing")
    return imageData // Return original if processing fails
  }

  // Draw the image on the canvas with high quality settings
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  ctx.filter = "none"

  // Get image data for processing
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  boxBlur(data, canvas.width, canvas.height, 1)

  // Store a copy of the original image data for blending later
  const originalData = new Uint8ClampedArray(data)

  // Apply contrast enhancement if enabled (reduced strength for more subtle enhancement)
  if (settings.enhanceContrast) {
    applyContrastEnhancement(data, 8) // Even lower value for more subtle contrast
  }

  // Apply edge detection if enabled with improved blending
  if (settings.enhanceEdges) {
    const edgeData = applyEdgeDetection(data, canvas.width, canvas.height)
    for (let i = 0; i < data.length; i += 4) {
      // Blend the edge detection with the original image more subtly (0.2 instead of 0.3)
      data[i] = Math.min(255, data[i] + edgeData[i] * 0.4) // R
      data[i + 1] = Math.min(255, data[i + 1] + edgeData[i] * 0.4) // G
      data[i + 2] = Math.min(255, data[i + 2] + edgeData[i] * 0.4) // B
      // Alpha remains unchanged
    }
  }

  // Put the processed image data back
  ctx.putImageData(imgData, 0, 0)

  // Add measurement grid if enabled (improved for better visibility)
  if (settings.addMeasurementGrid) {
    drawMeasurementGrid(ctx, canvas.width, canvas.height)
  }

  // Convert back to data URL with higher quality
  return canvas.toDataURL("image/jpeg", 1) // Higher quality (0.98 instead of 0.95)
}

// Function to apply contrast enhancement
function applyContrastEnhancement(
  data: Uint8ClampedArray,
  contrast: number
): void {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128 // R
    data[i + 1] = factor * (data[i + 1] - 128) + 128 // G
    data[i + 2] = factor * (data[i + 2] - 128) + 128 // B
    // Alpha remains unchanged
  }
}

// Function to apply edge detection (improved Sobel operator)
function applyEdgeDetection(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length)
  const grayscale = new Uint8ClampedArray(width * height)

  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    // Weighted method for grayscale
    grayscale[i / 4] = 0.999 * r + 0.587 * g + 0.114 * b
  }

  // Apply Sobel operator with improved settings
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const pixelIdx = y * width + x

      // Sobel kernels
      const gx =
        -1 * grayscale[pixelIdx - width - 1] +
        -2 * grayscale[pixelIdx - width] +
        -1 * grayscale[pixelIdx - width + 1] +
        1 * grayscale[pixelIdx + width - 1] +
        2 * grayscale[pixelIdx + width] +
        1 * grayscale[pixelIdx + width + 1]

      const gy =
        -1 * grayscale[pixelIdx - width - 1] +
        -2 * grayscale[pixelIdx - 1] +
        -1 * grayscale[pixelIdx + width - 1] +
        1 * grayscale[pixelIdx - width + 1] +
        2 * grayscale[pixelIdx + 1] +
        1 * grayscale[pixelIdx + width + 1]

      // Magnitude
      const mag = Math.sqrt(gx * gx + gy * gy)

      // Lower threshold for more visible edges, but use a softer value
      const threshold = 40 // Lowered from 30
      const edgeValue = mag > threshold ? 200 : 0 // Lowered from 200 for less intrusive edges

      output[idx] = edgeValue
      output[idx + 1] = edgeValue
      output[idx + 2] = edgeValue
      output[idx + 3] = 255
    }
  }

  return output
}

// Function to draw measurement grid on the image (improved visibility)
function drawMeasurementGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  // Calculate grid size (approximately 10x10 grid)
  const gridSizeX = Math.floor(width / 10)
  const gridSizeY = Math.floor(height / 10)

  // Save current context
  ctx.save()

  // Set grid style - more visible but less interfering with the underlying image
  ctx.strokeStyle = "rgba(0, 255, 26, 0.9)" // Brighter, more visible, slightly transparent
  ctx.lineWidth = 1.0 // Consistent width

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

  // Add grid coordinates with better visibility
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)" // More opaque for better visibility
  ctx.font = "bold 12px Arial" // Slightly larger and bold
  ctx.textAlign = "center"

  // Label columns with letters in the top row with shadow for better visibility
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  for (let i = 0; i < 10 && i < letters.length; i++) {
    // Add text shadow for better visibility
    ctx.shadowColor = "rgba(0, 0, 0, 0.7)"
    ctx.shadowBlur = 3
    ctx.shadowOffsetX = 1
    ctx.shadowOffsetY = 1

    ctx.fillText(letters.charAt(i), i * gridSizeX + gridSizeX / 2, 15)
  }

  // Label rows with numbers with shadow for better visibility
  for (let i = 0; i < 10; i++) {
    ctx.fillText(`${i + 1}`, 12, i * gridSizeY + gridSizeY / 2 + 5)
  }

  // Reset shadow for the rest of the drawing
  ctx.shadowColor = "transparent"
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0

  // Draw scale reference (10 meter/30 ft indicator at bottom left)
  const scaleLength = 100 // pixels
  const startX = 50
  const startY = height - 30

  // Draw scale background for better visibility
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
  ctx.fillRect(startX - 10, startY - 20, scaleLength + 20, 30)

  // Draw scale line
  ctx.strokeStyle = "rgba(255, 255, 255, 1.0)" // Full white for better visibility
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(startX + scaleLength, startY)
  ctx.stroke()

  // Draw end caps
  ctx.beginPath()
  ctx.moveTo(startX, startY - 5)
  ctx.lineTo(startX, startY + 5)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(startX + scaleLength, startY - 5)
  ctx.lineTo(startX + scaleLength, startY + 5)
  ctx.stroke()

  // Add scale text
  ctx.fillStyle = "rgba(255, 255, 255, 1.0)" // Brighter text
  ctx.font = "bold 12px Arial"
  ctx.textAlign = "center"
  ctx.fillText("10m / 30ft (approx.)", startX + scaleLength / 2, startY - 10)

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

// Helper to apply a simple color segmentation to highlight different roof parts
export const segmentRoofColors = async (imageData: string): Promise<string> => {
  // Create an image from the data URL
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = imageData
  })

  // Create a canvas
  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    return imageData // Return original if processing fails
  }

  // Draw the image
  ctx.drawImage(img, 0, 0)

  // Get image data
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  // Simple k-means-inspired color quantization (4 colors)
  // This will group similar colors together, helping to identify different roof sections
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Calculate brightness
    const brightness = (r + g + b) / 3

    // Simplified color segmentation based on brightness
    if (brightness < 64) {
      // Dark areas (shadows, etc.)
      data[i] = 40 // Dark blue
      data[i + 1] = 40
      data[i + 2] = 100
    } else if (brightness < 128) {
      // Medium dark areas
      data[i] = 200 // Red/orange (common roof color)
      data[i + 1] = 100
      data[i + 2] = 50
    } else if (brightness < 192) {
      // Medium light areas
      data[i] = 80 // Green (vegetation)
      data[i + 1] = 160
      data[i + 2] = 80
    } else {
      // Light areas (could be reflective roof materials)
      data[i] = 220 // Light yellow
      data[i + 1] = 220
      data[i + 2] = 100
    }
  }

  // Put the processed image data back
  ctx.putImageData(imgData, 0, 0)

  // Convert back to data URL
  return canvas.toDataURL("image/jpeg", 1) // Higher quality
  // return canvas.toDataURL('image/png');
}

// Create a false-color composite to show pitch more clearly
export const enhanceRoofPitch = async (imageData: string): Promise<string> => {
  // Create an image from the data URL
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = imageData
  })

  // Create a canvas
  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")

  if (!ctx) {
    return imageData // Return original if processing fails
  }

  // Draw the image
  ctx.drawImage(img, 0, 0)

  // Get image data
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  // First, convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }

  // Apply gradient detection (simplified for pitch)
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4

      // Use a simple gradient approximation
      const top = data[(y - 1) * canvas.width * 4 + x * 4]
      const bottom = data[(y + 1) * canvas.width * 4 + x * 4]
      const left = data[y * canvas.width * 4 + (x - 1) * 4]
      const right = data[y * canvas.width * 4 + (x + 1) * 4]

      // Vertical and horizontal gradients
      const gradY = bottom - top
      const gradX = right - left

      // Magnitude and direction
      const mag = Math.sqrt(gradX * gradX + gradY * gradY)
      const angle = Math.atan2(gradY, gradX)

      // Create false color based on gradient direction (representing pitch)
      // Hue mapping: angle from -π to π maps to different colors
      const hue = ((angle + Math.PI) / (2 * Math.PI)) * 360
      const saturation = Math.min(mag / 50, 1) * 100 // Stronger gradient = more saturated
      const lightness = 50 // Mid lightness

      // Fixed HSL to RGB conversion
      let r = 0,
        g = 0,
        b = 0

      // Convert HSL to RGB - fixed logic
      const c = ((1 - Math.abs((2 * lightness) / 100 - 1)) * saturation) / 100
      const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
      const m = lightness / 100 - c / 2

      if (hue >= 0 && hue < 60) {
        r = c
        g = x
        b = 0
      } else if (hue >= 60 && hue < 120) {
        r = x
        g = c
        b = 0
      } else if (hue >= 120 && hue < 180) {
        r = 0
        g = c
        b = x
      } else if (hue >= 180 && hue < 240) {
        r = 0
        g = x
        b = c
      } else if (hue >= 240 && hue < 300) {
        r = x
        g = 0
        b = c
      } else {
        r = c
        g = 0
        b = x
      }

      data[idx] = Math.round((r + m) * 255)
      data[idx + 1] = Math.round((g + m) * 255)
      data[idx + 2] = Math.round((b + m) * 255)
    }
  }

  // Put the processed image data back
  ctx.putImageData(imgData, 0, 0)

  // Add a pitch reference guide with better visibility
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
  ctx.fillRect(10, canvas.height - 100, 120, 90)

  ctx.font = "18px Arial"
  ctx.fillStyle = "white"
  ctx.fillText("Pitch Reference", 20, canvas.height - 85)

  // Draw pitch reference
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
    ctx.fillRect(20, canvas.height - 70 + i * 10, 10, 10)
    ctx.fillStyle = "white"
    ctx.fillText(pitches[i], 40, canvas.height - 60 + i * 10)
  }

  // Convert back to data URL with higher quality
  return canvas.toDataURL("image/jpeg", 1)
}

// very fast 3×3 box-blur
function boxBlur(data, w, h, radius = 1) {
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
