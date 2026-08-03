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

// Merges overlapping/touching [start, end] index ranges into the fewest disjoint ranges,
// so a trip matching several adjacent ruling patterns (e.g. a chain of segments sharing a
// boundary stop) yields one branded segment instead of one row per pattern.
function mergeRanges(ranges: [number, number][]): [number, number][] {
	if (ranges.length === 0) return []
	const sorted = [...ranges].sort((a, b) => a[0] - b[0])
	const merged: [number, number][] = [sorted[0]!]
	for (const [start, end] of sorted.slice(1)) {
		const last = merged[merged.length - 1]!
		if (start <= last[1]) last[1] = Math.max(last[1], end)
		else merged.push([start, end])
	}
	return merged
}

// Finds trips whose stop sequence matches an IDS ruling pattern and records the
// matching segment as a branded-route overlay, without altering the trip itself.
// Adjacent/overlapping matches for the same trip + ruling are merged into a single
// row. Ruling entries that get at least one match gain a corresponding row in outputRoutes.
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

			const matchRanges: [number, number][] = []
			for (const pattern of ruling.identified_route_pattern) {
				for (const start of findContiguousMatches(stopNames, pattern)) {
					matchRanges.push([start, start + pattern.length - 1])
				}
			}
			if (matchRanges.length === 0) continue

			for (const [start, end] of mergeRanges(matchRanges)) {
				if (!brandedRouteIdByRuling.has(rulingIndex)) {
					const physicalRouteId = routeIdMap[trip.route_id] ?? trip.route_id
					const physicalRoute = outputRouteById.get(physicalRouteId)
					const brandedRouteId = `${feedId}-BRAND-${ruling.route.network_id}-${ruling.route.route_short_name}`
					outputRoutes.push({
						route_id: brandedRouteId,
						agency_id: physicalRoute?.agency_id,
						route_short_name: ruling.route.route_short_name,
						route_long_name: ruling.route.route_long_name,
						route_type: physicalRoute?.route_type ?? "109",
						route_color: ruling.route.route_color,
						route_text_color: ruling.route.route_text_color,
						network_id: ruling.route.network_id,
					})
					brandedRouteIdByRuling.set(rulingIndex, brandedRouteId)
				}

				overlayRows.push({
					trip_id: tripIdMap[trip.trip_id] ?? trip.trip_id,
					from_stop_id: stopIdMap[stopTimeRows[start]!.stop_id] ?? stopTimeRows[start]!.stop_id,
					to_stop_id: stopIdMap[stopTimeRows[end]!.stop_id] ?? stopTimeRows[end]!.stop_id,
					applied_route_id: brandedRouteIdByRuling.get(rulingIndex)!,
				})
			}
		}
	}

	return overlayRows
}
