// file: assets/social/techtranslationsbydnb/render.ts
// Run:  npx tsx assets/social/techtranslationsbydnb/render.ts [--index N] [--templatePath path/to/template.svg] [--outDir cards]

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as TOML from "toml";

type SafeString = string;

interface Theme {
	bg?: SafeString;
	ink?: SafeString;
	muted?: SafeString;
	accent?: SafeString;
	rule?: SafeString;
	brandFont?: SafeString;
	bodyFont?: SafeString;
	monoFont?: SafeString;
}

interface Card {
	id?: SafeString;
	phrase: SafeString;
	pronunciation?: SafeString;
	part_of_speech?: SafeString;
	translation: SafeString;
	example?: SafeString;
	signature?: SafeString;
	url?: SafeString;
	timestamp?: SafeString;
}

interface Config {
	theme?: Theme;
	card?: Card | Card[];     // allow [card] or [[card]]
	cards?: Card[];           // backward alt
}

function parseArgs(argv: string[]): Record<string, string> {
	const out: Record<string, string> = {};
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i];
		if (a.startsWith("--")) {
			const key = a.slice(2);
			const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : "true";
			out[key] = val;
			if (val !== "true") i += 1;
		}
	}
	return out;
}

function xmlEscape(s: string): string {
	return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// Matches {key}, { key }, or with newlines/whitespace inside
function replacePlaceholderFlexible(tpl: string, key: string, value: string): string {
	const re = new RegExp(`\\{\\s*${key}\\s*\\}`, "g");
	return tpl.replace(re, value);
}

function tidyStyleBlocks(svg: string): string {
	return svg.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, open, css, close) => {
    let c = String(css);
		c = c.replace(/^(\s*[-a-zA-Z0-9_]+):\s*([\s\S]*?)\s*;\s*(?=(?:\r?\n|\}))/gm,
			(_m, prop, val) => `${prop}: ${val.trim()};`
    );
		c = c.replace(/;\s*\r?\n\s*\r?\n/g, ';\n');
		c = c.replace(/\r?\n{3,}/g, '\n\n');

		return `${open}${c}${close}`;
	});
}


function fillTemplate(tpl: string, theme: Required<Theme>, card: Card): string {
	const map: Record<string, string> = {
		theme_bg: xmlEscape(theme.bg),
		theme_ink: xmlEscape(theme.ink),
		theme_muted: xmlEscape(theme.muted),
		theme_accent: xmlEscape(theme.accent),
		theme_rule: xmlEscape(theme.rule),
		brand_font: xmlEscape(theme.brandFont),
		body_font: xmlEscape(theme.bodyFont),
		mono_font: xmlEscape(theme.monoFont),
		phrase: xmlEscape(card.phrase),
		pronunciation: xmlEscape(card.pronunciation ?? ""),
		part_of_speech: xmlEscape(card.part_of_speech ?? ""),
		translation: xmlEscape((card.translation ?? "").replaceAll("\\n", "\n")),
		example: xmlEscape((card.example ?? "").replaceAll("\\n", "\n")),
		signature: xmlEscape(card.signature ?? ""),
		url: xmlEscape(card.url ?? ""),
		timestamp: xmlEscape(card.timestamp ?? "")
	};

	let out = tpl;
	for (const [key, val] of Object.entries(map)) {
		out = replacePlaceholderFlexible(out, key, val);
	}
	return out;
}

async function readText(path: string): Promise<string> {
	return readFile(path, "utf8");
}

async function writeText(path: string, data: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, data, "utf8");
}

function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

function slugifyId(s?: string): string | null {
	if (!s) return null;
	const slug = s.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
	return slug || null;
}

function mergeTheme(base?: Theme, cli?: Record<string, string>): Required<Theme> {
	const defaults: Required<Theme> = {
		bg: "#0f0f10",
		ink: "#f1f1f1",
		muted: "#b7b7b7",
		accent: "#ff5500",
		rule: "#262628",
    brandFont: '"Changa One", sans-serif',
    bodyFont: '"Exo 2", sans-serif',
    monoFont: '"JetBrains Mono", monospace',
	};

	return {
		bg: String(cli?.bg ?? base?.bg ?? defaults.bg),
		ink: String(cli?.ink ?? base?.ink ?? defaults.ink),
		muted: String(cli?.muted ?? base?.muted ?? defaults.muted),
		accent: String(cli?.accent ?? base?.accent ?? defaults.accent),
		rule: String(cli?.rule ?? base?.rule ?? defaults.rule),
		brandFont: String(cli?.brandFont ?? base?.brandFont ?? defaults.brandFont),
		bodyFont: String(cli?.bodyFont ?? base?.bodyFont ?? defaults.bodyFont),
		monoFont: String(cli?.monoFont ?? base?.monoFont ?? defaults.monoFont)
	};
}

async function renderOne(templateAbs: string, theme: Required<Theme>, card: Card, outPath: string): Promise<string> {
	const tpl = await readText(templateAbs);
	const filled = fillTemplate(tpl, theme, card);
	const svg = tidyStyleBlocks(filled);     // <<— add this line
	await writeText(outPath, svg);
	return outPath;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const here = dirname(fileURLToPath(import.meta.url));

	// Template: default here; allow CLI override
	const defaultTemplateAbs = resolve(here, "./template.svg");
	const templateAbs = resolve(here, args.templatePath ? String(args.templatePath) : defaultTemplateAbs);

	// Config: default ./config.toml next to script
	const defaultConfigAbs = resolve(here, "config.toml");
	const configAbs = resolve(process.cwd(), args.config ? String(args.config) : defaultConfigAbs);

	// Output dir
	const outDir = resolve(here, args.outDir ? String(args.outDir) : "cards");
	await mkdir(outDir, { recursive: true });

	// Load config (ignore templatePath inside)
	const raw = await readText(configAbs).catch((e) => {
		console.error(`[error] Failed to read config: ${configAbs}`);
		throw e;
	});
	const parsed = TOML.parse(raw) as Config;

	const theme = mergeTheme(parsed.theme, args);

	// Collect cards correctly:
	// - [[card]]  => parsed.card is an ARRAY
	// - [card]    => parsed.card is an OBJECT
	// - {cards}   => parsed.cards is an ARRAY (legacy alt)
	let cards: Card[] = [];
	if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
		cards = parsed.cards;
	} else if (Array.isArray(parsed.card)) {
		cards = parsed.card;
	} else if (parsed.card) {
		cards = [parsed.card];
	}

	if (cards.length === 0) {
		console.error("[error] No cards found. Add [[card]] blocks (or a single [card]) to your config.");
		process.exit(1);
	}

	// Render by index
	if (args.index && args.index !== "true") {
		const idx = Number(args.index);
		if (!Number.isInteger(idx) || idx < 0 || idx >= cards.length) {
			console.error(`[error] Invalid --index ${args.index}. Expected 0..${cards.length - 1}.`);
			process.exit(1);
		}
		const card = cards[idx];
		if (!card.phrase || !card.translation) {
			console.error("[error] Missing required fields: phrase/translation.");
			process.exit(1);
		}
		const name = slugifyId(card.id) ?? `output-${pad2(idx + 1)}`;
		const outPath = join(outDir, `${name}.svg`);
		const out = await renderOne(templateAbs, theme, card, outPath);
		console.log(`Wrote ${out}`);
		return;
	}

	// Render all
	let ok = 0;
	for (let i = 0; i < cards.length; i += 1) {
		const card = cards[i];
		if (!card.phrase || !card.translation) {
			console.error(`[warn] Skipping card[${i}] due to missing fields (phrase/translation).`);
			continue;
		}
		const name = slugifyId(card.id) ?? `output-${pad2(i + 1)}`;
		const outPath = join(outDir, `${name}.svg`);
		try {
			const out = await renderOne(templateAbs, theme, card, outPath);
			console.log(`Wrote ${out}`);
			ok += 1;
		} catch (e) {
			console.error(`[error] Failed to render card[${i}] to ${outPath}:`, e);
		}
	}

	if (ok === 0) {
		console.error("[error] No cards were rendered. Fix errors and retry.");
		process.exit(1);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((e) => {
		console.error("Fatal:", e);
		process.exit(1);
	});
}
