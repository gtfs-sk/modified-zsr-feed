import fs from "fs/promises"

interface OSMData {
	version: 0.6,
	generator: "Overpass API 0.7.62.11 87bfad18",
	osm3s: {
		[key: string]: string
	},
	elements: {
		type: "node",
		id: number,
		lat: number,
		lon: number,
		tags: {
			name?: string,
			"railway:ref"?: string,
			"uic_ref"?: "5614656",
			wheelchair?: "yes" | "limited" | "no" | "designated",
			[property: string]: string | undefined
		}
	}[]
}

const OSMStops = JSON.parse(await fs.readFile("./tmp/OSMStops.json", "utf-8")) as OSMData

export function getOSMStopByUIC(uic: string) {
	return OSMStops.elements.find(node => node.tags.uic_ref == uic)
}