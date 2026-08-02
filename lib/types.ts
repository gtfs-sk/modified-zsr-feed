// Core

export interface Agency {
	agency_id?: string;
	agency_name: string;
	agency_url: string;
	agency_timezone: string;
	agency_lang?: string;
	agency_phone?: string;
	agency_fare_url?: string;
	agency_email?: string;
}

export interface Stop {
	stop_id: string;
	stop_code?: string;
	stop_name?: string;
	stop_desc?: string;
	stop_lat?: string;
	stop_lon?: string;
	zone_id?: string;
	stop_url?: string;
	location_type?: string;
	parent_station?: string;
	stop_timezone?: string;
	wheelchair_boarding?: string;
	level_id?: string;
	platform_code?: string;
}

export interface Route {
	route_id: string;
	agency_id?: string;
	route_short_name?: string;
	route_long_name?: string;
	route_desc?: string;
	route_type: string;
	route_url?: string;
	route_color?: string;
	route_text_color?: string;
	route_sort_order?: string;
	continuous_pickup?: string;
	continuous_drop_off?: string;
	network_id?: string;
}

export interface Trip {
	route_id: string;
	service_id: string;
	trip_id: string;
	trip_headsign?: string;
	trip_short_name?: string;
	direction_id?: string;
	block_id?: string;
	shape_id?: string;
	wheelchair_accessible?: string;
	bikes_allowed?: string;
}

export interface StopTime {
	trip_id: string;
	arrival_time?: string;
	departure_time?: string;
	stop_id: string;
	location_group_id?: string;
	location_id?: string;
	stop_sequence: string;
	stop_headsign?: string;
	start_pickup_drop_off_window?: string;
	end_pickup_drop_off_window?: string;
	pickup_type?: string;
	drop_off_type?: string;
	continuous_pickup?: string;
	continuous_drop_off?: string;
	shape_dist_traveled?: string;
	timepoint?: string;
	pickup_booking_rule_id?: string;
	drop_off_booking_rule_id?: string;
}

export interface Calendar {
	service_id: string;
	monday: string;
	tuesday: string;
	wednesday: string;
	thursday: string;
	friday: string;
	saturday: string;
	sunday: string;
	start_date: string;
	end_date: string;
}

export interface CalendarDate {
	service_id: string;
	date: string;
	exception_type: string;
}

// Fares v1

export interface FareAttribute {
	fare_id: string;
	price: string;
	currency_type: string;
	payment_method: string;
	transfers: string;
	agency_id?: string;
	transfer_duration?: string;
}

export interface FareRule {
	fare_id: string;
	route_id?: string;
	origin_id?: string;
	destination_id?: string;
	contains_id?: string;
}

// Fares v2

export interface Timeframe {
	timeframe_group_id: string;
	start_time?: string;
	end_time?: string;
	service_id: string;
}

export interface RiderCategory {
	rider_category_id: string;
	rider_category_name: string;
	min_age?: string;
	max_age?: string;
	eligibility_url?: string;
}

export interface FareMedia {
	fare_media_id: string;
	fare_media_name?: string;
	fare_media_type: string;
}

export interface FareProduct {
	fare_product_id: string;
	fare_product_name?: string;
	fare_media_id?: string;
	amount: string;
	currency: string;
	rider_category_id?: string;
}

export interface FareLegRule {
	leg_group_id?: string;
	network_id?: string;
	from_area_id?: string;
	to_area_id?: string;
	from_timeframe_group_id?: string;
	to_timeframe_group_id?: string;
	fare_product_id: string;
	rule_priority?: string;
	rider_category_id?: string;
}

export interface FareLegJoinRule {
	from_leg_group_id: string;
	to_leg_group_id: string;
	fare_product_id?: string;
}

export interface FareTransferRule {
	from_leg_group_id?: string;
	to_leg_group_id?: string;
	in_final_vehicle?: string;
	transfer_count?: string;
	duration_limit?: string;
	duration_limit_type?: string;
	fare_transfer_type: string;
	fare_product_id?: string;
}

export interface Area {
	area_id: string;
	area_name?: string;
}

export interface StopArea {
	area_id: string;
	stop_id: string;
}

export interface Network {
	network_id: string;
	network_name?: string;
}

export interface RouteNetwork {
	network_id: string;
	route_id: string;
}

// Shapes & service patterns

export interface Shape {
	shape_id: string;
	shape_pt_lat: string;
	shape_pt_lon: string;
	shape_pt_sequence: string;
	shape_dist_traveled?: string;
}

export interface Frequency {
	trip_id: string;
	start_time: string;
	end_time: string;
	headway_secs: string;
	exact_times?: string;
}

export interface Transfer {
	from_stop_id?: string;
	to_stop_id?: string;
	from_route_id?: string;
	to_route_id?: string;
	from_trip_id?: string;
	to_trip_id?: string;
	transfer_type: string;
	min_transfer_time?: string;
}

// Pathways

export interface Pathway {
	pathway_id: string;
	from_stop_id: string;
	to_stop_id: string;
	pathway_mode: string;
	is_bidirectional: string;
	length?: string;
	traversal_time?: string;
	stair_count?: string;
	max_slope?: string;
	min_width?: string;
	signposted_as?: string;
	reversed_signposted_as?: string;
}

export interface Level {
	level_id: string;
	level_index: string;
	level_name?: string;
}

// Flex

export interface LocationGroup {
	location_group_id: string;
	location_group_name?: string;
}

export interface LocationGroupStop {
	location_group_id: string;
	stop_id: string;
}

export interface GeoJsonFeature {
	type: "Feature";
	id?: string;
	geometry: {
		type: string;
		coordinates: unknown;
	};
	properties: {
		stop_name?: string;
		stop_desc?: string;
		zone_id?: string;
		booking_rule_id?: string;
		[key: string]: unknown;
	} | null;
}

export interface LocationsGeoJson {
	type: "FeatureCollection";
	features: GeoJsonFeature[];
}

export interface BookingRule {
	booking_rule_id: string;
	booking_type: string;
	prior_notice_duration_min?: string;
	prior_notice_duration_max?: string;
	prior_notice_last_day?: string;
	prior_notice_last_time?: string;
	prior_notice_start_day?: string;
	prior_notice_start_time?: string;
	prior_notice_service_id?: string;
	message?: string;
	pickup_message?: string;
	drop_off_message?: string;
	phone_number?: string;
	info_url?: string;
	booking_url?: string;
}

// Metadata

export interface Translation {
	table_name: string;
	field_name: string;
	language: string;
	translation: string;
	record_id?: string;
	record_sub_id?: string;
	field_value?: string;
}

export interface FeedInfo {
	feed_publisher_name: string;
	feed_publisher_url: string;
	feed_lang: string;
	default_lang?: string;
	feed_start_date?: string;
	feed_end_date?: string;
	feed_version?: string;
	feed_contact_email?: string;
	feed_contact_url?: string;
}

export interface Attribution {
	attribution_id?: string;
	agency_id?: string;
	route_id?: string;
	trip_id?: string;
	organization_name: string;
	is_producer?: string;
	is_operator?: string;
	is_authority?: string;
	attribution_url?: string;
	attribution_email?: string;
	attribution_phone?: string;
	// own ext
	attribution_notes?: string;
}

// Own Extension
export interface TripBrandedOverlay {
	trip_id: string;
	from_stop_id: string;
	to_stop_id: string;
	applied_route_id: string; // Relation to routes.route_id
}

// Mutable
export type Mutable<T> = {
	-readonly [K in keyof T]: T[K];
};

// Filename → row type map
export interface GtfsFileMap {
	agency:               Agency;
	stops:                Stop;
	routes:               Route;
	trips:                Trip;
	stop_times:           StopTime;
	calendar:             Calendar;
	calendar_dates:       CalendarDate;
	fare_attributes:      FareAttribute;
	fare_rules:           FareRule;
	timeframes:           Timeframe;
	rider_categories:     RiderCategory;
	fare_media:           FareMedia;
	fare_products:        FareProduct;
	fare_leg_rules:       FareLegRule;
	fare_leg_join_rules:  FareLegJoinRule;
	fare_transfer_rules:  FareTransferRule;
	areas:                Area;
	stop_areas:           StopArea;
	networks:             Network;
	route_networks:       RouteNetwork;
	shapes:               Shape;
	frequencies:          Frequency;
	transfers:            Transfer;
	pathways:             Pathway;
	levels:               Level;
	location_groups:      LocationGroup;
	location_group_stops: LocationGroupStop;
	locations:            LocationsGeoJson;
	booking_rules:        BookingRule;
	translations:         Translation;
	feed_info:            FeedInfo;
	attributions:         Attribution;
	trip_branded_overlay: TripBrandedOverlay;
}
