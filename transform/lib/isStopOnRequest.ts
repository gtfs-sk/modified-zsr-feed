import Papa from "papaparse";
import fs from "fs/promises";

const onRequestStopsList = (await fs.readFile("./transform/help/OnRequest Stations.txt", "utf-8")).split("\n").map(e => e.trim())

export function isStopOnRequest(stopName: string) {
	return onRequestStopsList.includes(stopName);
}