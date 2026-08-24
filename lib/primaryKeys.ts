import type { GtfsFileMap } from "./types.ts";

export type CsvFile = Exclude<keyof GtfsFileMap, "locations">;

// Fields that form the primary key per file, as defined in the GTFS spec.
// Files where every field together forms the key are marked with null — the
// function falls back to joining all values.
const primaryKeyFields: Record<CsvFile, (string[] | null)> = {
	agency:               ["agency_id"],
	stops:                ["stop_id"],
	routes:               ["route_id"],
	trips:                ["trip_id"],
	stop_times:           ["trip_id", "stop_sequence"],
	calendar:             ["service_id"],
	calendar_dates:       ["service_id", "date"],
	fare_attributes:      ["fare_id"],
	fare_rules:           null,
	timeframes:           null,
	rider_categories:     ["rider_category_id"],
	fare_media:           ["fare_media_id"],
	fare_products:        ["fare_product_id", "rider_category_id", "fare_media_id"],
	fare_leg_rules:       ["network_id", "from_area_id", "to_area_id", "from_timeframe_group_id", "to_timeframe_group_id", "fare_product_id"],
	fare_leg_join_rules:  ["from_leg_group_id", "to_leg_group_id"],
	fare_transfer_rules:  ["from_leg_group_id", "to_leg_group_id", "fare_product_id", "transfer_count", "duration_limit"],
	areas:                ["area_id"],
	stop_areas:           null,
	networks:             ["network_id"],
	route_networks:       ["route_id"],
	shapes:               ["shape_id", "shape_pt_sequence"],
	frequencies:          ["trip_id", "start_time"],
	transfers:            ["from_stop_id", "to_stop_id", "from_trip_id", "to_trip_id", "from_route_id", "to_route_id"],
	pathways:             ["pathway_id"],
	levels:               ["level_id"],
	location_groups:      ["location_group_id"],
	location_group_stops: null,
	booking_rules:        ["booking_rule_id"],
	translations:         ["table_name", "field_name", "language", "record_id", "record_sub_id", "field_value"],
	feed_info:            null,
	attributions:         ["attribution_id"],
	trip_branded_overlay: null,
	universalization:     ["table_name", "old_id", "new_id"],
};

export function getPrimaryKey<K extends CsvFile>(file: K, row: GtfsFileMap[K]): string {
	const fields = primaryKeyFields[file];
	const r = row as Record<string, string | undefined>;
	if (fields === null) return Object.values(r).map(v => v ?? "").join("|");
	return fields.map(f => r[f] ?? "").join("|");
}
