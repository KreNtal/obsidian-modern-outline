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
