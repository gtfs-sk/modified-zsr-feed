import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import type {
	Agency, Stop, Route, Trip, StopTime,
	Calendar, CalendarDate,
	FareAttribute, FareRule,
	Timeframe, RiderCategory, FareMedia, FareProduct,
	FareLegRule, FareLegJoinRule, FareTransferRule,
	Area, StopArea, Network, RouteNetwork,
	Shape, Frequency, Transfer,
	Pathway, Level,
	LocationGroup, LocationGroupStop, LocationsGeoJson, BookingRule,
	Translation, FeedInfo, Attribution,
	TripBrandedOverlay, Universalization,
} from "./types.ts";

export function _openFeed(dir: string) {
	const cache = new Map<string, unknown>();

	function csv<T>(filename: string): T[] {
		if (!cache.has(filename)) {
			const path = join(dir, filename);
			if (!existsSync(path)) {
				cache.set(filename, []);
			} else {
				const result = Papa.parse<T>(readFileSync(path, "utf-8"), { header: true, skipEmptyLines: true });
				cache.set(filename, result.data);
			}
		}
		return cache.get(filename) as T[];
	}

	function json<T>(filename: string): T | null {
		if (!cache.has(filename)) {
			const path = join(dir, filename);
			cache.set(filename, existsSync(path) ? JSON.parse(readFileSync(path, "utf-8")) : null);
		}
		return cache.get(filename) as T | null;
	}

	return {
		// Core
		get agency()               { return csv<Agency>("agency.txt"); },
		get stops()                { return csv<Stop>("stops.txt"); },
		get routes()               { return csv<Route>("routes.txt"); },
		get trips()                { return csv<Trip>("trips.txt"); },
		get stop_times()           { return csv<StopTime>("stop_times.txt"); },
		get calendar()             { return csv<Calendar>("calendar.txt"); },
		get calendar_dates()       { return csv<CalendarDate>("calendar_dates.txt"); },

		// Fares v1
		get fare_attributes()      { return csv<FareAttribute>("fare_attributes.txt"); },
		get fare_rules()           { return csv<FareRule>("fare_rules.txt"); },

		// Fares v2
		get timeframes()           { return csv<Timeframe>("timeframes.txt"); },
		get rider_categories()     { return csv<RiderCategory>("rider_categories.txt"); },
		get fare_media()           { return csv<FareMedia>("fare_media.txt"); },
		get fare_products()        { return csv<FareProduct>("fare_products.txt"); },
		get fare_leg_rules()       { return csv<FareLegRule>("fare_leg_rules.txt"); },
		get fare_leg_join_rules()  { return csv<FareLegJoinRule>("fare_leg_join_rules.txt"); },
		get fare_transfer_rules()  { return csv<FareTransferRule>("fare_transfer_rules.txt"); },
		get areas()                { return csv<Area>("areas.txt"); },
		get stop_areas()           { return csv<StopArea>("stop_areas.txt"); },
		get networks()             { return csv<Network>("networks.txt"); },
		get route_networks()       { return csv<RouteNetwork>("route_networks.txt"); },

		// Shapes & service patterns
		get shapes()               { return csv<Shape>("shapes.txt"); },
		get frequencies()          { return csv<Frequency>("frequencies.txt"); },
		get transfers()            { return csv<Transfer>("transfers.txt"); },

		// Pathways
		get pathways()             { return csv<Pathway>("pathways.txt"); },
		get levels()               { return csv<Level>("levels.txt"); },

		// Flex
		get location_groups()      { return csv<LocationGroup>("location_groups.txt"); },
		get location_group_stops() { return csv<LocationGroupStop>("location_group_stops.txt"); },
		get locations()            { return json<LocationsGeoJson>("locations.geojson"); },
		get booking_rules()        { return csv<BookingRule>("booking_rules.txt"); },

		// Metadata
		get translations()         { return csv<Translation>("translations.txt"); },
		get feed_info()            { return csv<FeedInfo>("feed_info.txt"); },
		get attributions()         { return csv<Attribution>("attributions.txt"); },

		// Generated overlays
		get trip_branded_overlay() { return csv<TripBrandedOverlay>("trip_branded_overlay.txt"); },
		get universalization()     { return csv<Universalization>("universalization.txt"); },
	};
}

export type Feed = ReturnType<typeof _openFeed>;
