import Papa from "papaparse";
import fs from "fs/promises";

interface AccessibilityOverrideEntry {
	"Názov stanice": string;
	"Cestovný poriadok": string;
	"Bezbariérový prístup": "áno" | ""
}

const accessibilityOverrideFile = (Papa.parse<AccessibilityOverrideEntry>(await fs.readFile("./transform/help/zoznam-stanic-a-zastavok.csv", "utf-8"))).data

export function isWheelchairAccessible(stationName: string) {
	return accessibilityOverrideFile.find(entry => entry["Názov stanice"] === stationName)?.["Bezbariérový prístup"] === "áno";
}