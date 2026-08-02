import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import Papa from "papaparse";
import type { Mutable, GtfsFileMap, LocationsGeoJson } from "./types.ts";
import { _openFeed, type Feed } from "./_openFeed.ts";
import { getPrimaryKey, type CsvFile } from "./primaryKeys.ts";

export interface ManipulateConfig {
	feedId: string;
	baseFeedPath?: string;
	outFeedPath?: string;
}

export interface ManipulateMetadata {
	feedId: string;
	changedIdsMap: { [K in CsvFile]?: Record<string, string> };
}

export type FullMetadata<TMeta extends Record<string, unknown>> = ManipulateMetadata & TMeta;

export type MergeResult<K extends CsvFile> = {
	_: GtfsFileMap[K];
	mappedIds: Record<string, string>;
}

export type MapperResult<K extends CsvFile> =
	| GtfsFileMap[K]
	| MergeResult<K>
	| null

function isMerge<K extends CsvFile>(r: NonNullable<MapperResult<K>>): r is MergeResult<K> {
	return "_" in r && "mappedIds" in r;
}

// Internal shorthand — the generics on outFeed are verified at the method boundaries
type AnyRows = any[];
type OutFeed = { [K in CsvFile]?: AnyRows } & { locations?: LocationsGeoJson };

export class Manipulate<TMeta extends Record<string, unknown> = Record<never, never>> {
	feedId: string;
	baseFeed: Feed;
	outFeedPath: string;
	outFeed: OutFeed;
	keptMetadata: FullMetadata<TMeta>;

	constructor(config: ManipulateConfig) {
		this.feedId = config.feedId;
		this.baseFeed = _openFeed(config.baseFeedPath ?? "./tmp/feed");
		this.outFeedPath = config.outFeedPath ?? "./data";
		this.outFeed = {};
		this.keptMetadata = {
			feedId: this.feedId,
			changedIdsMap: {},
		} as FullMetadata<TMeta>;
	}

	setupMetadata<K extends string, V>(key: K, value: V): Manipulate<TMeta & Record<K, V>> {
		(this.keptMetadata as Record<string, unknown>)[key] = value;
		return this as unknown as Manipulate<TMeta & Record<K, V>>;
	}

	mapper<K extends CsvFile>(file: K, mapperCallback: (row: GtfsFileMap[K], metadata: FullMetadata<TMeta>, counter: number) => MapperResult<K>) {
		if (!(file in this.baseFeed)) throw new Error(`Base feed does not contain file: ${file}`);
		if (file in this.outFeed) throw new Error(`Output feed already contains file: ${file}`);

		console.time(`Mapping ${file}`);
		this.outFeed[file] = [];
		const idMap: Record<string, string> = {};
		(this.keptMetadata.changedIdsMap as Record<string, Record<string, string>>)[file] = idMap;
		let falseResultsCounter = 0;
		const seen = new Set<string>();

		const baseRows = this.baseFeed[file] as GtfsFileMap[K][];
		for (let i = 0; i < baseRows.length; i++) {
			const result = mapperCallback(baseRows[i]!, this.keptMetadata, i);

			if (result === null) {
				falseResultsCounter++;
				continue;
			}

			if (isMerge(result)) {
				Object.assign(idMap, result.mappedIds);
				const outKey = getPrimaryKey(file, result._);
				if (!seen.has(outKey)) {
					seen.add(outKey);
					this.outFeed[file]!.push(result._);
				}
			} else {
				const baseKey = getPrimaryKey(file, baseRows[i]!);
				const outKey = getPrimaryKey(file, result);
				if (baseKey !== outKey) idMap[baseKey] = outKey;
				this.outFeed[file]!.push(result);
			}
		}
		console.timeEnd(`Mapping ${file}`);
		console.log(`Mapped ${this.outFeed[file]!.length} rows for ${file}, with ${falseResultsCounter} filtered out.`);
	}

	process<K extends CsvFile>(file: K, processCallback: (baseRows: GtfsFileMap[K][], metadata: FullMetadata<TMeta>) => (GtfsFileMap[K] | null)[]) {
		if (!(file in this.baseFeed)) throw new Error(`Base feed does not contain file: ${file}`);
		if (file in this.outFeed) throw new Error(`Output feed already contains file: ${file}`);

		console.time(`Processing ${file}`);
		this.outFeed[file] = [];
		const idMap: Record<string, string> = {};
		(this.keptMetadata.changedIdsMap as Record<string, Record<string, string>>)[file] = idMap;
		let falseResultsCounter = 0;

		const baseRows = this.baseFeed[file] as GtfsFileMap[K][];
		const results = processCallback(baseRows, this.keptMetadata);
		for (let i = 0; i < results.length; i++) {
			const result = results[i]!;
			if (result === null) {
				falseResultsCounter++;
				continue;
			}
			const baseKey = getPrimaryKey(file, baseRows[i]!);
			const outKey = getPrimaryKey(file, result);
			if (baseKey !== outKey) idMap[baseKey] = outKey;
			this.outFeed[file]!.push(result);
		}
		console.timeEnd(`Processing ${file}`);
		console.log(`Processed ${this.outFeed[file]!.length} rows for ${file}, with ${falseResultsCounter} filtered out.`);
	}

	copy<K extends CsvFile>(file: K) {
		if (!(file in this.baseFeed)) throw new Error(`Base feed does not contain file: ${file}`);
		if (file in this.outFeed) throw new Error(`Output feed already contains file: ${file}`);

		if (file === "stop_times") {
			const hasChangedTrips = Object.keys(this.keptMetadata.changedIdsMap.trips ?? {}).length > 0;
			const hasChangedStops = Object.keys(this.keptMetadata.changedIdsMap.stops ?? {}).length > 0;
			if (hasChangedTrips || hasChangedStops)
				throw new Error(`Cannot copy stop_times if trips or stops have changed. Use mapper() instead.`);
		}

		console.time(`Copying ${file}`);
		this.outFeed[file] = [...(this.baseFeed[file] as GtfsFileMap[K][])];
		console.timeEnd(`Copying ${file}`);
		console.log(`Copied ${this.outFeed[file]!.length} rows for ${file}.`);
	}

	add<K extends CsvFile>(file: K, processCallback: (metadata: FullMetadata<TMeta>) => (GtfsFileMap[K] | null)[]) {
		if (file in this.outFeed) throw new Error(`Output feed already contains file: ${file}`);
		console.time(`Adding ${file}`);
		const results = processCallback(this.keptMetadata);
		this.outFeed[file] = [];
		for (const result of results) {
			if (result === null) continue;
			this.outFeed[file]!.push(result);
		}
		console.timeEnd(`Adding ${file}`);
		console.log(`Added ${this.outFeed[file]!.length} rows for ${file}.`);
	}

	addAtribution(attribution: Omit<GtfsFileMap["attributions"], "attribution_id">) {
		if (!this.outFeed.attributions) this.outFeed.attributions = [];
		//@ts-ignore
		attribution.attribution_id = `attr-${this.outFeed.attributions.length + 1}`;
		this.outFeed.attributions.push(attribution as GtfsFileMap["attributions"]);
	}

	copyLocations() {
		this.outFeed.locations = this.baseFeed.locations ?? undefined;
	}

	saveFeed() {
		this._ensureFeedIntegrity();
		mkdirSync(this.outFeedPath, { recursive: true });
		console.time(`Saving feed to ${this.outFeedPath}`);

		for (const [file, rows] of Object.entries(this.outFeed)) {
			if (file === "locations") {
				writeFileSync(join(this.outFeedPath, "locations.geojson"), JSON.stringify(rows, null, 2));
			} else {
				writeFileSync(join(this.outFeedPath, `${file}.txt`), Papa.unparse(rows as object[], { header: true }));
			}
		}
		console.timeEnd(`Saving feed to ${this.outFeedPath}`);
	}

	private _ensureFeedIntegrity() {
		const required: CsvFile[] = ["agency", "stops", "routes", "trips", "stop_times"];
		for (const file of required) {
			if (!this.outFeed[file]?.length)
				throw new Error(`Output feed must contain at least one row in ${file}`);
		}
	}
}
