import { App, TFile } from 'obsidian';

export interface HeadingInfo {
	level: number;
	heading: string;
	position: {
		start: { line: number; col: number; offset: number };
	};
}

export function getHeadings(app: App, file: TFile): HeadingInfo[] {
	const cache = app.metadataCache.getFileCache(file);
	return (cache?.headings as HeadingInfo[] | undefined) ?? [];
}

// Strips markdown formatting from a heading so the label shows clean text:
// links/wikilinks become their visible text, emphasis/code markers are removed.
// e.g. "[Canabalt](https://canabalt.com/)" → "Canabalt".
export function cleanHeadingText(raw: string): string {
	let text = raw;
	// Images: ![alt](url) → alt
	text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
	// Markdown links: [text](url) → text
	text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
	// Wikilinks: [[target|alias]] → alias, [[target]] → target
	text = text.replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, '$1');
	text = text.replace(/\[\[([^\]]+)\]\]/g, '$1');
	// Emphasis / highlight / strikethrough / inline code
	text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
	text = text.replace(/(\*|_)(.*?)\1/g, '$2');
	text = text.replace(/==(.*?)==/g, '$1');
	text = text.replace(/~~(.*?)~~/g, '$1');
	text = text.replace(/`([^`]+)`/g, '$1');
	return text.trim();
}
