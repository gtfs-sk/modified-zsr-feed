import globalAgencyMap from "./help/globalAgencyMap.json" with { type: "json" }
import { isWheelchairAccessible } from "./lib/accesibilityOverride";
import { getOSMStopByUIC } from "./lib/openStreetMapData";
import { computeBrandedRouteOverlay } from "./lib/idsRuling";
import { Manipulate } from "../lib/Manipulate";
import type { Route, Stop } from "../lib/types";
import { isStopOnRequest } from "./lib/isStopOnRequest";
import { getTrainCategoryStyle } from "./lib/trainCategoryStyle";
import fs from "fs/promises"

const m = new Manipulate({ feedId: "FEED_ZSR" })
	.setupMetadata("trainMeta", {} as Record<string, { category: string; number: string }>)
	.setupMetadata("onRequestStopIDList", [] as string[])
	.setupMetadata("universalization", [] as { table_name: string; old_id: string; new_id: string }[])

// Agency — ids stay as published today; the branded/universal id is only recorded, not applied
m.mapper("agency", (agency, meta) => {
	if (Object.hasOwn(globalAgencyMap, agency.agency_name)) {
		const mapped = globalAgencyMap[agency.agency_name as keyof typeof globalAgencyMap]
		if (mapped.agency_id && mapped.agency_id !== agency.agency_id) {
			meta.universalization.push({ table_name: "agency", old_id: agency.agency_id ?? "", new_id: mapped.agency_id })
		}
		return { ...agency, ...mapped, agency_id: agency.agency_id }
	}
	meta.universalization.push({ table_name: "agency", old_id: agency.agency_id ?? "", new_id: `${m.feedId}-${agency.agency_id}` })
	return agency
})

// Stops — ids stay as published today; the UIC-prefixed id is only recorded, not applied
m.mapper("stops", (stop, meta) => {
	const changed = { ...stop }
	meta.universalization.push({ table_name: "stops", old_id: stop.stop_id, new_id: `UIC-${stop.stop_id}` })
	changed.wheelchair_boarding = isWheelchairAccessible(stop.stop_name ?? "") ? "1" : "0"

	const osmData = getOSMStopByUIC(stop.stop_id)
	if (osmData) {
		changed.stop_lat = osmData.lat.toString()
		changed.stop_lon = osmData.lon.toString()
		changed.stop_name = osmData.tags.name ?? changed.stop_name
		changed.stop_code = osmData.tags["railway:ref"] ?? changed.stop_code
		changed.wheelchair_boarding =
			osmData.tags.wheelchair === "yes" || osmData.tags.wheelchair === "designated" ? "1"
			: osmData.tags.wheelchair === "no" ? "2"
			: changed.wheelchair_boarding
	}

	if (isStopOnRequest(stop.stop_name ?? "null")) meta.onRequestStopIDList.push(changed.stop_id)
	return changed
})

// Routes — many-to-one merge: multiple input rows collapse into one output row per group
const routeGroups = new Map<string, { route: Route; mappedIds: Record<string, string> }>()
const privateAgencyNames: Record<string, string> = {
	"1": "RegioJet",
	"2": "Leo Express",
	"3": "TREŽ",
}

m.mapper("routes", (route, meta, i) => {
	let result = { ...route }
	result.agency_id = route.agency_id
	result.route_id = `${m.feedId}-${i}`

	const [_sh, trainCategory, trainNumber, routeName, secondaryNumber] = /(.{1,4}) (\d+) (?:(.*)? ?(\/\d+)?)/g.exec(`${route.route_short_name} ${route.route_long_name}`) ?? []

	let mergeKey =
		route.route_long_name == "NAD" ? `NAD-${route.agency_id}` :
		Object.keys(privateAgencyNames).includes(route.agency_id ?? "") ? `agency:${route.agency_id}` : 
		routeName ? routeName :
		trainCategory ? trainCategory : route.route_short_name ?? ""

	if (!routeGroups.has(mergeKey)) {
		if (route.route_long_name == "NAD") {
			result.route_type = process.env.USE_ROUTE_TYPE_714 === "1" ? "714" : "700"
			result.route_short_name = "NAD"
			result.route_long_name = "Náhradná autobusová doprava"
		} else if (Object.keys(privateAgencyNames).includes(route.agency_id ?? "")) {
			result.route_short_name = privateAgencyNames[route.agency_id ?? ""]
			result.route_long_name = route.agency_id == "3" /* TREZ EXCEPTION */ ? route.route_desc : ""
		} else if (routeName) {
			result.route_short_name = `${trainCategory} ${routeName}`
			result.route_long_name = route.route_desc
		} else {
			result.route_short_name = trainCategory
		}

		if (trainCategory) {
			const style = getTrainCategoryStyle(trainCategory)
			result.route_color = style.route_color ?? result.route_color
			result.route_text_color = style.route_text_color ?? result.route_text_color
			result.route_long_name = result.route_long_name ?? style.route_long_name
		}

		result.route_desc = ""
		routeGroups.set(mergeKey, {
			route: result,
			mappedIds: {
				[route.route_id]: result.route_id
			},
		})
		meta.trainMeta[route.route_id] = { category: trainCategory ?? "", number: trainNumber ?? "" }

		return { _: result, mappedIds: { [route.route_id]: result.route_id } }
	} else {
		const group = routeGroups.get(mergeKey)!
		group.mappedIds[route.route_id] = group.route.route_id
		meta.trainMeta[route.route_id] = { category: trainCategory ?? "", number: trainNumber ?? "" }

		return { _: group.route, mappedIds: group.mappedIds }
	}
})

// Trips — id stays as published today; the branded id is only recorded, not applied
m.mapper("trips", (trip, meta) => {
	meta.universalization.push({ table_name: "trips", old_id: trip.trip_id, new_id: `${m.feedId}-${trip.trip_id}` })
	const trainMeta = meta.trainMeta[trip.route_id]
	return {
		...trip,
		route_id: meta.changedIdsMap.routes?.[trip.route_id] ?? trip.route_id,
		trip_short_name: trainMeta?.number ? `${trainMeta.category} ${trainMeta.number}` : trip.trip_short_name,
	}
})

// Stop times
m.mapper("stop_times", (st, meta) => {
	let changed = {
		...st,
		trip_id: meta.changedIdsMap.trips?.[st.trip_id] ?? st.trip_id,
		stop_id: meta.changedIdsMap.stops?.[st.stop_id] ?? st.stop_id,
	}

	if (meta.onRequestStopIDList.includes(changed.stop_id)) {
		changed.pickup_type = "3"
		changed.drop_off_type = "3"
	}
	
	return changed
})

// Branded route overlay — find trips whose stop sequence matches an IDS ruling
// pattern and record the matching segment, without altering the trip itself
const brandedRouteOverlay = computeBrandedRouteOverlay({
	feedId: m.feedId,
	trips: m.baseFeed.trips,
	stopTimes: m.baseFeed.stop_times,
	outputStops: m.outFeed.stops as Stop[],
	outputRoutes: m.outFeed.routes as Route[],
	trainCategoryByRouteId: Object.fromEntries(Object.entries(m.keptMetadata.trainMeta).map(([routeId, meta]) => [routeId, meta.category])),
	tripIdMap: m.keptMetadata.changedIdsMap.trips ?? {},
	stopIdMap: m.keptMetadata.changedIdsMap.stops ?? {},
	routeIdMap: m.keptMetadata.changedIdsMap.routes ?? {},
})
m.add("trip_branded_overlay", () => brandedRouteOverlay)
m.add("universalization", (meta) => meta.universalization)
let networks = JSON.parse(await fs.readFile("./transform/help/networks.json", "utf-8"))
m.add("networks", () => networks)

m.copy("calendar")
m.copy("calendar_dates")

m.addAtribution({
	organization_name: "Železnice Slovenskej republiky",
	is_producer: "1",
	is_operator: "0",
	is_authority: "1",
	attribution_url: "https://data.slovensko.sk/datasety/ebeeedf1-aca2-451a-bdc0-35d536714888",
	attribution_email: ""
})
m.addAtribution({
	organization_name: "gtfs.sk",
	is_producer: "1",
	attribution_url: "https://gtfs.sk"
})
m.addAtribution({
	organization_name: "OpenStreetMap contributors",
	attribution_url: "https://www.openstreetmap.org/copyright"	
})

m.saveFeed()