import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";
import type { Feed } from "./_openFeed.ts";
import type { Mutable, LocationsGeoJson } from "./types.ts";

type SaveableFeed = Partial<Mutable<Feed>>;

const csvFiles: (keyof Omit<SaveableFeed, "locations">)[] = [
	"agency",
	"stops",
	"routes",
	"trips",
	"stop_times",
	"calendar",
	"calendar_dates",
	"fare_attributes",
	"fare_rules",
	"timeframes",
	"rider_categories",
	"fare_media",
	"fare_products",
	"fare_leg_rules",
	"fare_leg_join_rules",
	"fare_transfer_rules",
	"areas",
	"stop_areas",
	"networks",
	"route_networks",
	"shapes",
	"frequencies",
	"transfers",
	"pathways",
	"levels",
	"location_groups",
	"location_group_stops",
	"booking_rules",
	"translations",
	"feed_info",
	"attributions",
];

export function saveFeed(feed: SaveableFeed, dir: string = "./data"): void {
	mkdirSync(dir, { recursive: true });

	for (const key of csvFiles) {
		const rows = feed[key] as object[] | undefined;
		if (!rows?.length) continue;
		writeFileSync(join(dir, `${key}.txt`), Papa.unparse(rows));
	}

	const locations = feed.locations as LocationsGeoJson | null | undefined;
	if (locations) {
		writeFileSync(join(dir, "locations.geojson"), JSON.stringify(locations, null, 2));
	}
}
