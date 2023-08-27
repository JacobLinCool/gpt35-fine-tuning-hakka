import fs from "node:fs";
import path from "node:path";
import { OpenAI } from "openai";
import { config } from "dotenv";
import { program } from "commander";

config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY is not defined");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

program
	.argument("<file-id>")
	.argument("<output>")
	.action(async (id: string, out: string) => {
		const dir = path.dirname(out);
		fs.mkdirSync(dir, { recursive: true });

		const result_file = await openai.files.retrieve(id);
		const filename = result_file.filename;
		const content = await openai.files.retrieveContent(result_file.id);
		fs.writeFileSync(out, content);
		console.log(`Saved ${filename} to ${out}`);
	})
	.parse();
