import { prisma } from "./prisma"

export const WASTE_CONFIDENCE_THRESHOLD = 0.65

export type WastePrediction = {
  category: string
  confidence: number
  alternatives: Array<{ category: string; confidence: number }>
  model_version: string
  recommendation: string
}

const MATERIAL_ROUTES: Record<string, { category: string; centerTypes: string[] }> = {
  cardboard: { category: "cardboard", centerTypes: ["cardboard", "paper"] },
  glass: { category: "glass", centerTypes: ["glass"] },
  metal: { category: "metal", centerTypes: ["metal"] },
  paper: { category: "paper", centerTypes: ["paper"] },
  plastic: { category: "plastic", centerTypes: ["plastic"] },
  trash: { category: "trash", centerTypes: [] },
}

function distanceInKm(
  latitude: number,
  longitude: number,
  centerLatitude: number,
  centerLongitude: number
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDelta = radians(centerLatitude - latitude)
  const longitudeDelta = radians(centerLongitude - longitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitude)) *
      Math.cos(radians(centerLatitude)) *
      Math.sin(longitudeDelta / 2) ** 2

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

export async function orchestrateWastePrediction(
  prediction: WastePrediction,
  workflowId: string,
  location?: { latitude?: number; longitude?: number }
) {
  const mapping = MATERIAL_ROUTES[prediction.category.toLowerCase()]
  if (!mapping) throw new Error(`Unsupported classifier material: ${prediction.category}`)

  const confidence = Number.isFinite(prediction.confidence)
    ? Math.min(1, Math.max(0, prediction.confidence))
    : 0
  const confidenceAccepted = confidence >= WASTE_CONFIDENCE_THRESHOLD
  const hasLocation =
    Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)

  let serviceRoute: {
    service: string
    label: string
    status: "routed" | "fallback"
    centers: Array<{
      id: string
      name: string
      address: string
      city: string | null
      type: string
      distanceKm?: number
    }>
    fallbackReason?: string
  }

  if (mapping.centerTypes.length === 0) {
    serviceRoute = {
      service: "waste_report_review",
      label: "Municipal waste report review",
      status: "routed",
      centers: [],
    }
  } else {
    try {
      const centers = await prisma.recyclingCenter.findMany({
        where: { type: { in: mapping.centerTypes } },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          type: true,
          latitude: true,
          longitude: true,
        },
      })
      const routedCenters = centers
        .map((center) => ({
          id: center.id,
          name: center.name,
          address: center.address,
          city: center.city,
          type: center.type,
          distanceKm: hasLocation
            ? distanceInKm(
              location!.latitude!,
              location!.longitude!,
              center.latitude,
              center.longitude
            )
            : undefined,
        }))
        .sort((left, right) => {
          if (hasLocation) return left.distanceKm! - right.distanceKm!
          return left.name.localeCompare(right.name)
        })
        .slice(0, 5)

      serviceRoute = routedCenters.length
        ? {
            service: "recycling_centers",
            label: "Material recycling centers",
            status: "routed",
            centers: routedCenters,
          }
        : {
            service: "waste_report_review",
            label: "Waste report review",
            status: "fallback",
            centers: [],
            fallbackReason: `No service center is registered for ${mapping.category}.`,
          }
    } catch {
      serviceRoute = {
        service: "waste_report_review",
        label: "Waste report review",
        status: "fallback",
        centers: [],
        fallbackReason: "Service lookup failed; the report will remain in the review queue.",
      }
    }
  }

  return {
    ...prediction,
    category: prediction.category.toLowerCase(),
    confidence,
    workflowId,
    mappedCategory: mapping.category,
    confidenceThreshold: WASTE_CONFIDENCE_THRESHOLD,
    confidenceAccepted,
    serviceRoute,
  }
}