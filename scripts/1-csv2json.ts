import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";

config();

const TRAINING_START = process.env.TRAINING_START
	? parseInt(process.env.TRAINING_START)
	: 100;
const TRAINING_END = process.env.TRAINING_END
	? parseInt(process.env.TRAINING_END)
	: 1000;
const TRAINING_STEP = process.env.TRAINING_STEP
	? parseInt(process.env.TRAINING_STEP)
	: 100;
const VALIDATION_SIZE = process.env.VALIDATION_SIZE
	? parseInt(process.env.VALIDATION_SIZE)
	: 100;

const file = path.resolve(__dirname, "..", "data", "data.csv");
const csv = fs.readFileSync(file, "utf8");

const records: Data[] = parse(csv, { columns: true, skip_empty_lines: true });
const pairs = [
	...new Map<string, string>(
		records.map((record) => [
			clear_pinyin(record.客語拼音),
			clear_hanji(record.客語漢字),
		]),
	).entries(),
];
console.log(`Found ${pairs.length} unique pairs`);

for (let i = TRAINING_START; i <= TRAINING_END; i += TRAINING_STEP) {
	create_training_set(pairs, i);
}
create_validation_set(pairs);

function create_training_set(pairs: [string, string][], n: number) {
	const set = pairs.slice(0, n).map(([pinyin, hanji]) => {
		return [
			{ role: "system", content: "hakka translate" },
			{ role: "user", content: pinyin },
			{ role: "assistant", content: hanji },
		];
	});

	const content = set
		.map((messages) => JSON.stringify({ messages }))
		.join("\n");
	fs.writeFileSync(
		path.resolve(__dirname, "..", "data", `training-${n}.jsonl`),
		content,
	);
	console.log(`Created training set with ${n} samples`);
}

function create_validation_set(pairs: [string, string][]) {
	const set = pairs.slice(-VALIDATION_SIZE).map(([pinyin, hanji]) => {
		return [
			{ role: "system", content: "hakka translate" },
			{ role: "user", content: pinyin },
			{ role: "assistant", content: hanji },
		];
	});

	const content = set
		.map((messages) => JSON.stringify({ messages }))
		.join("\n");
	fs.writeFileSync(
		path.resolve(__dirname, "..", "data", "validation.jsonl"),
		content,
	);
	console.log(`Created validation set with ${VALIDATION_SIZE} samples`);
}

function clear_pinyin(raw: string): string {
	return raw
		.replace(/[^a-zA-Z0-9 ]/g, "")
		.replace(/ +/g, " ")
		.trim();
}

function clear_hanji(raw: string): string {
	return raw
		.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "")
		.replace(/ +/g, " ")
		.trim();
}

interface Data {
	客語漢字: string;
	客語拼音: string;
}
