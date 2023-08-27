import fs from "node:fs";
import path from "node:path";
import { OpenAI } from "openai";
import { config } from "dotenv";

config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY is not defined");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// find all jsonl files in data directory
const files = fs
	.readdirSync(path.resolve(__dirname, "..", "data"))
	.filter((file) => file.endsWith(".jsonl"));

upload(files);

async function upload(files: string[]) {
	const uploaded: Record<string, string> = {};

	for (const file of files) {
		const task = await openai.files.create({
			purpose: "fine-tune",
			file: fs.createReadStream(
				path.resolve(__dirname, "..", "data", file),
			),
		});
		console.log(`Uploaded ${file} as ${task.id}`, task);
		uploaded[file] = task.id;
	}

	fs.writeFileSync(
		path.resolve(__dirname, "..", "data", "uploaded.json"),
		JSON.stringify(uploaded, null, 2),
	);
	console.log("All files uploaded, results saved to data/uploaded.json");
}
