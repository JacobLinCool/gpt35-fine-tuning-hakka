import fs from "node:fs";
import path from "node:path";
import { OpenAI } from "openai";
import { config } from "dotenv";

config();

const FINE_TUNE_EPOCHS = process.env.FINE_TUNE_EPOCHS
	? parseInt(process.env.FINE_TUNE_EPOCHS)
	: "auto";
const FINE_TUNE_SUFFIX = process.env.FINE_TUNE_SUFFIX
	? process.env.FINE_TUNE_SUFFIX
	: "hakka";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY is not defined");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const list: Record<string, string> = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "..", "data", "uploaded.json"),
		"utf8",
	),
);

tune(list);

async function tune(files: Record<string, string>) {
	const validation_id = files["validation.jsonl"];
	const training_files = Object.entries(files)
		.filter(([file]) => file.startsWith("training-"))
		.sort(
			([a], [b]) => parseInt(a.split("-")[1]) - parseInt(b.split("-")[1]),
		);

	for (const [file, id] of training_files) {
		const result = await openai.fineTuning.jobs.create({
			model: "gpt-3.5-turbo",
			training_file: id,
			validation_file: validation_id,
			hyperparameters: { n_epochs: FINE_TUNE_EPOCHS },
			suffix: FINE_TUNE_SUFFIX,
		});
		console.log(`Start tuning ${file} as ${result.id}`, result);
		const tag = `Tuning ${file} as ${result.id}`;
		console.time(tag);

		let done =
			result.status === "succeeded" ||
			result.status === "failed" ||
			result.status === "cancelled";
		while (!done) {
			await new Promise((resolve) => setTimeout(resolve, 30_000));
			const new_result = await openai.fineTuning.jobs.retrieve(result.id);
			console.timeLog(tag, `Status: ${new_result.status}`, new_result);
			done =
				new_result.status === "succeeded" ||
				new_result.status === "failed" ||
				new_result.status === "cancelled";
		}

		const final_result = await openai.fineTuning.jobs.retrieve(result.id);
		const dir = path.resolve(
			__dirname,
			"..",
			"data",
			"result",
			file.split("-")[1].split(".")[0],
		);
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(
			path.join(dir, "result.json"),
			JSON.stringify(final_result, null, 2),
		);
		console.log(`Final result`, final_result);
		console.timeEnd(tag);
	}
}
