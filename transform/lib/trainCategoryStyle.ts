import routesHelp from "../help/routes.json" with { type: "json" }

interface TrainCategoryEntry {
	value: number
	name: string
	description: string
	background?: string
	foreground?: string
}

const trainCategories = routesHelp.trainCategories as TrainCategoryEntry[]
const styleByCategoryName = new Map(trainCategories.map((c) => [c.name, c]))

function stripHash(color?: string): string | undefined {
	return color?.replace(/^#/, "")
}

export function getTrainCategoryStyle(category: string) {
	const entry = styleByCategoryName.get(category)
	return {
		route_long_name: entry?.description,
		route_color: stripHash(entry?.background),
		route_text_color: stripHash(entry?.foreground),
	}
}
