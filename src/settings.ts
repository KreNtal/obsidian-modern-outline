import { App, PluginSettingTab, Setting } from 'obsidian';
import type ModernOutlinePlugin from './main';

export type ColorTheme = 'monochrome' | 'accent' | 'colorful' | 'headings';
export type DashShape = 'dash' | 'pill' | 'circle' | 'diamond' | 'literal' | 'hash';
export type DashSize = 'small' | 'medium' | 'large';
export type LabelFont = 'default' | 'text' | 'mono';
export type HighlightColor = 'accent' | 'monochrome' | 'colorful' | 'headings' | 'match';
export type LabelHierarchy = 'none' | 'indent' | 'size' | 'indent+size';

export interface ModernOutlineSettings {
	sidebarSide: 'left' | 'right';
	verticalPosition: 'top' | 'center' | 'bottom';
	markerColor: ColorTheme;
	labelColor: ColorTheme;
	highlightColor: HighlightColor;
	markerShape: DashShape;
	markerSize: DashSize;
	labelFont: LabelFont;
	labelHierarchy: LabelHierarchy;
	labelsAlwaysOn: boolean;
	treeLines: boolean;
	animationsEnabled: boolean;
	minHeadingLevel: number;
	maxHeadingLevel: number;
}

export const DEFAULT_SETTINGS: ModernOutlineSettings = {
	sidebarSide: 'left',
	verticalPosition: 'center',
	markerColor: 'monochrome',
	labelColor: 'monochrome',
	highlightColor: 'monochrome',
	markerShape: 'dash',
	markerSize: 'medium',
	labelFont: 'default',
	labelHierarchy: 'none',
	labelsAlwaysOn: false,
	treeLines: false,
	animationsEnabled: true,
	minHeadingLevel: 1,
	maxHeadingLevel: 4,
};

export class ModernOutlineSettingTab extends PluginSettingTab {
	plugin: ModernOutlinePlugin;

	constructor(app: App, plugin: ModernOutlinePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Layout ──────────────────────────────────────────────────────────
		new Setting(containerEl).setName('Layout').setHeading();

		new Setting(containerEl)
			.setName('Horizontal position')
			.setDesc('Which side of the note to show the outline on')
			.addDropdown(drop =>
				drop
					.addOption('left', 'Left')
					.addOption('right', 'Right')
					.setValue(this.plugin.settings.sidebarSide)
					.onChange(async (value) => {
						this.plugin.settings.sidebarSide = value as 'left' | 'right';
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Vertical alignment')
			.setDesc('Where to anchor the outline strip along the note height')
			.addDropdown(drop =>
				drop
					.addOption('top', 'Top')
					.addOption('center', 'Center')
					.addOption('bottom', 'Bottom')
					.setValue(this.plugin.settings.verticalPosition)
					.onChange(async (value) => {
						this.plugin.settings.verticalPosition = value as 'top' | 'center' | 'bottom';
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Animations')
			.setDesc('Enable cascade and fade animations for markers and labels')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.animationsEnabled)
					.onChange(async (value) => {
						this.plugin.settings.animationsEnabled = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		// ── Markers ─────────────────────────────────────────────────────────
		new Setting(containerEl).setName('Markers').setHeading();

		new Setting(containerEl)
			.setName('Style')
			.setDesc('Shape of the markers')
			.addDropdown(drop =>
				drop
					.addOption('dash', 'Dash')
					.addOption('pill', 'Pill')
					.addOption('circle', 'Circle')
					.addOption('diamond', 'Diamond')
					.addOption('literal', 'Literal')
					.addOption('hash', 'Hash')
					.setValue(this.plugin.settings.markerShape)
					.onChange(async (value) => {
						this.plugin.settings.markerShape = value as DashShape;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Size')
			.setDesc('Overall size of the markers')
			.addDropdown(drop =>
				drop
					.addOption('small', 'Small')
					.addOption('medium', 'Medium')
					.addOption('large', 'Large')
					.setValue(this.plugin.settings.markerSize)
					.onChange(async (value) => {
						this.plugin.settings.markerSize = value as DashSize;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Color')
			.setDesc('Color style for the markers')
			.addDropdown(drop =>
				drop
					.addOption('monochrome', 'Monochrome')
					.addOption('accent', 'Accent')
					.addOption('colorful', 'Colorful')
					.addOption('headings', 'Theme headings')
					.setValue(this.plugin.settings.markerColor)
					.onChange(async (value) => {
						this.plugin.settings.markerColor = value as ColorTheme;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Highlight color')
			.setDesc('Color used to highlight the active heading marker and label')
			.addDropdown(drop =>
				drop
					.addOption('monochrome', 'Monochrome')
					.addOption('accent', 'Accent')
					.addOption('colorful', 'Colorful')
					.addOption('headings', 'Theme headings')
					.addOption('match', 'Match marker')
					.setValue(this.plugin.settings.highlightColor)
					.onChange(async (value) => {
						this.plugin.settings.highlightColor = value as HighlightColor;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		// ── Labels ──────────────────────────────────────────────────────────
		new Setting(containerEl).setName('Labels').setHeading();

		new Setting(containerEl)
			.setName('Color')
			.setDesc('Color style for the labels')
			.addDropdown(drop =>
				drop
					.addOption('monochrome', 'Monochrome')
					.addOption('accent', 'Accent')
					.addOption('colorful', 'Colorful')
					.addOption('headings', 'Theme headings')
					.setValue(this.plugin.settings.labelColor)
					.onChange(async (value) => {
						this.plugin.settings.labelColor = value as ColorTheme;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Font')
			.setDesc('Font used for the heading labels')
			.addDropdown(drop =>
				drop
					.addOption('default', 'Interface (default)')
					.addOption('text', 'Editor text')
					.addOption('mono', 'Monospace')
					.setValue(this.plugin.settings.labelFont)
					.onChange(async (value) => {
						this.plugin.settings.labelFont = value as LabelFont;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Hierarchy')
			.setDesc('How heading depth is shown in the labels')
			.addDropdown(drop =>
				drop
					.addOption('none', 'None')
					.addOption('indent', 'Indent')
					.addOption('size', 'Size')
					.addOption('indent+size', 'Indent + size')
					.setValue(this.plugin.settings.labelHierarchy)
					.onChange(async (value) => {
						this.plugin.settings.labelHierarchy = value as LabelHierarchy;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Always visible')
			.setDesc('Keep labels visible at all times instead of only on hover')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.labelsAlwaysOn)
					.onChange(async (value) => {
						this.plugin.settings.labelsAlwaysOn = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Tree lines')
			.setDesc('Show vertical lines hierarchy connecting each label to its children')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.treeLines)
					.onChange(async (value) => {
						this.plugin.settings.treeLines = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		// ── Headings ─────────────────────────────────────────────────────────
		new Setting(containerEl).setName('Headings').setHeading();

		new Setting(containerEl)
			.setName('Minimum level')
			.setDesc('Show headings from this level and below')
			.addSlider(slider =>
				slider
					.setLimits(1, 6, 1)
					.setValue(this.plugin.settings.minHeadingLevel)
					.onChange(async (value) => {
						this.plugin.settings.minHeadingLevel = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Maximum level')
			.setDesc('Show headings up to this level (6 = show all)')
			.addSlider(slider =>
				slider
					.setLimits(1, 6, 1)
					.setValue(this.plugin.settings.maxHeadingLevel)
					.onChange(async (value) => {
						this.plugin.settings.maxHeadingLevel = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);
	}
}
