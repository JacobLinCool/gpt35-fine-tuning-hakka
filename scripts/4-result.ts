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

const dirs = fs
	.readdirSync(path.resolve(__dirname, "..", "data", "result"))
	.filter((file) =>
		fs
			.statSync(path.resolve(__dirname, "..", "data", "result", file))
			.isDirectory(),
	);

retrieve(dirs);

async function retrieve(dirs: string[]) {
	for (let dir of dirs) {
		dir = path.resolve(__dirname, "..", "data", "result", dir);
		const result: OpenAI.FineTuning.Jobs.FineTuningJob = JSON.parse(
			fs.readFileSync(path.join(dir, "result.json"), "utf8"),
		);

		fs.rmSync(dir, { recursive: true, force: true });
		fs.mkdirSync(dir, { recursive: true });
		console.log(`Created directory ${dir}`);

		for (const result_file_id of result.result_files) {
			const result_file = await openai.files.retrieve(
				result_file_id as unknown as string,
			);
			const filename = result_file.filename;
			const content = await openai.files.retrieveContent(result_file.id);
			fs.writeFileSync(path.resolve(dir, filename), content);
			console.log(`Saved ${filename} to ${dir}`);
		}
	}
}
