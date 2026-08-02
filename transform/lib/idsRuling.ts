import idsSBahnRuling from "../help/ids-s-bahn-ruling.json" with { type: "json" }
import type { Route, Trip, StopTime, Stop } from "../../lib/types";

export interface RulingEntry {
	"@comment": string
	route: { route_short_name: string; route_long_name: string; route_color: string; route_text_color: string; network_id: string }
	identified_route_train_category?: string[]
	identified_route_pattern: string[][]
}

export const rulings = idsSBahnRuling as RulingEntry[]

export interface BrandedOverlayRow {
	trip_id: string
	from_stop_id: string
	to_stop_id: string
	applied_route_id: string
}

export interface BrandedOverlayInput {
	feedId: string
	trips: Trip[]
	stopTimes: StopTime[]
	/** Already-mapped stops (post OSM-name-override) — ruling patterns are written against these names, not the raw feed's abbreviated ones */
	outputStops: Stop[]
	/** New branded route rows get pushed here, alongside whatever's already been mapped */
	outputRoutes: Route[]
	/** base route_id -> parsed train category (e.g. "Os", "REX"), as tracked while mapping routes */
	trainCategoryByRouteId: Record<string, string>
	tripIdMap: Record<string, string>
	stopIdMap: Record<string, string>
	routeIdMap: Record<string, string>
}

// Returns the start indices where haystack contains needle as a contiguous, order-preserving slice
export function findContiguousMatches(haystack: string[], needle: string[]): number[] {
	const starts: number[] = []
	outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
		for (let j = 0; j < needle.length; j++) {
			if (haystack[i + j] !== needle[j]) continue outer
		}
		starts.push(i)
	}
	return starts
}

// Finds trips whose stop sequence matches an IDS ruling pattern and records the
// matching segment as a branded-route overlay, without altering the trip itself.
// Ruling entries that get at least one match gain a corresponding row in outputRoutes.
export function computeBrandedRouteOverlay(input: BrandedOverlayInput): BrandedOverlayRow[] {
	const { feedId, trips, stopTimes, outputStops, outputRoutes, trainCategoryByRouteId, tripIdMap, stopIdMap, routeIdMap } = input

	const overlayRows: BrandedOverlayRow[] = []
	const brandedRouteIdByRuling = new Map<number, string>()
	const outputRouteById = new Map(outputRoutes.map((r) => [r.route_id, r]))

	const outputStopNameById = new Map(outputStops.map((s) => [s.stop_id, s.stop_name ?? ""]))
	// base stop_id -> output stop_name, since patterns are matched by name but trips reference base stop_ids
	const stopNameById = new Map(
		Array.from(new Set(stopTimes.map((st) => st.stop_id))).map((baseStopId) => [
			baseStopId,
			outputStopNameById.get(stopIdMap[baseStopId] ?? baseStopId) ?? "",
		])
	)
	const stopTimesByTrip = new Map<string, StopTime[]>()
	for (const st of stopTimes) {
		if (!stopTimesByTrip.has(st.trip_id)) stopTimesByTrip.set(st.trip_id, [])
		stopTimesByTrip.get(st.trip_id)!.push(st)
	}
	for (const rows of stopTimesByTrip.values()) rows.sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))

	for (const trip of trips) {
		const stopTimeRows = stopTimesByTrip.get(trip.trip_id)
		if (!stopTimeRows?.length) continue
		const stopNames = stopTimeRows.map((st) => stopNameById.get(st.stop_id) ?? "")
		const category = trainCategoryByRouteId[trip.route_id] ?? ""

		for (let rulingIndex = 0; rulingIndex < rulings.length; rulingIndex++) {
			const ruling = rulings[rulingIndex]!
			if (ruling.identified_route_train_category && !ruling.identified_route_train_category.includes(category)) continue

			for (const pattern of ruling.identified_route_pattern) {
				for (const start of findContiguousMatches(stopNames, pattern)) {
					if (!brandedRouteIdByRuling.has(rulingIndex)) {
						const physicalRouteId = routeIdMap[trip.route_id] ?? trip.route_id
						const physicalRoute = outputRouteById.get(physicalRouteId)
						const brandedRouteId = `${feedId}-BRAND-${ruling.route.network_id}-${ruling.route.route_short_name}`
						outputRoutes.push({
							route_id: brandedRouteId,
							agency_id: physicalRoute?.agency_id,
							route_short_name: ruling.route.route_short_name,
							route_long_name: ruling.route.route_long_name,
							route_type: physicalRoute?.route_type ?? "2",
							route_color: ruling.route.route_color,
							route_text_color: ruling.route.route_text_color,
							network_id: ruling.route.network_id,
						})
						brandedRouteIdByRuling.set(rulingIndex, brandedRouteId)
					}

					overlayRows.push({
						trip_id: tripIdMap[trip.trip_id] ?? trip.trip_id,
						from_stop_id: stopIdMap[stopTimeRows[start]!.stop_id] ?? stopTimeRows[start]!.stop_id,
						to_stop_id: stopIdMap[stopTimeRows[start + pattern.length - 1]!.stop_id] ?? stopTimeRows[start + pattern.length - 1]!.stop_id,
						applied_route_id: brandedRouteIdByRuling.get(rulingIndex)!,
					})
				}
			}
		}
	}

	return overlayRows
}
