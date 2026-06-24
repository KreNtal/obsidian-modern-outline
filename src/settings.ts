import { App, PluginSettingTab, Setting } from 'obsidian';
import type ModernOutlinePlugin from './main';

export type ColorTheme = 'monochrome' | 'accent' | 'colorful' | 'headings';
export type DashShape = 'rounded' | 'square';
export type DashSize = 'small' | 'medium' | 'large';
export type LabelFont = 'default' | 'text' | 'mono';
export type HighlightColor = 'accent' | 'monochrome' | 'colorful' | 'headings' | 'match';
export type LabelHierarchy = 'none' | 'indent' | 'size' | 'indent+size';

export interface ModernOutlineSettings {
	sidebarSide: 'left' | 'right';
	verticalPosition: 'top' | 'center' | 'bottom';
	dashColor: ColorTheme;
	labelColor: ColorTheme;
	highlightColor: HighlightColor;
	dashShape: DashShape;
	dashSize: DashSize;
	labelFont: LabelFont;
	labelHierarchy: LabelHierarchy;
	treeLines: boolean;
	animationsEnabled: boolean;
	minHeadingLevel: number;
	maxHeadingLevel: number;
}

export const DEFAULT_SETTINGS: ModernOutlineSettings = {
	sidebarSide: 'left',
	verticalPosition: 'center',
	dashColor: 'monochrome',
	labelColor: 'monochrome',
	highlightColor: 'accent',
	dashShape: 'rounded',
	dashSize: 'medium',
	labelFont: 'default',
	labelHierarchy: 'none',
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

		containerEl.createEl('h3', { text: 'Appearance' });

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
			.setDesc('Enable the cascade and fade animations of dashes and labels')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.animationsEnabled)
					.onChange(async (value) => {
						this.plugin.settings.animationsEnabled = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		containerEl.createEl('h3', { text: 'Style' });

		new Setting(containerEl)
			.setName('Dash color')
			.setDesc('Color style for the dashes')
			.addDropdown(drop =>
				drop
					.addOption('monochrome', 'Monochrome')
					.addOption('accent', 'Accent')
					.addOption('colorful', 'Colorful')
					.addOption('headings', 'Theme headings')
					.setValue(this.plugin.settings.dashColor)
					.onChange(async (value) => {
						this.plugin.settings.dashColor = value as ColorTheme;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Dash highlight color')
			.setDesc('Color used to mark the active heading dash and label')
			.addDropdown(drop =>
				drop
					.addOption('accent', 'Accent')
					.addOption('monochrome', 'Monochrome')
					.addOption('colorful', 'Colorful')
					.addOption('headings', 'Theme headings')
					.addOption('match', 'Match dash')
					.setValue(this.plugin.settings.highlightColor)
					.onChange(async (value) => {
						this.plugin.settings.highlightColor = value as HighlightColor;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Label color')
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
			.setName('Dash shape')
			.setDesc('Corner style of the dashes')
			.addDropdown(drop =>
				drop
					.addOption('rounded', 'Rounded')
					.addOption('square', 'Square')
					.setValue(this.plugin.settings.dashShape)
					.onChange(async (value) => {
						this.plugin.settings.dashShape = value as DashShape;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Dash size')
			.setDesc('Overall size of the dashes')
			.addDropdown(drop =>
				drop
					.addOption('small', 'Small')
					.addOption('medium', 'Medium')
					.addOption('large', 'Large')
					.setValue(this.plugin.settings.dashSize)
					.onChange(async (value) => {
						this.plugin.settings.dashSize = value as DashSize;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Label font')
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
			.setName('Label hierarchy')
			.setDesc('How heading depth is shown in the labels')
			.addDropdown(drop =>
				drop
					.addOption('none', 'None')
					.addOption('indent', 'Indent')
					.addOption('size', 'Size')
					.addOption('indent+size', 'Indent + Size')
					.setValue(this.plugin.settings.labelHierarchy)
					.onChange(async (value) => {
						this.plugin.settings.labelHierarchy = value as LabelHierarchy;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Tree lines')
			.setDesc('Show vertical lines connecting each heading to its children')
			.addToggle(toggle =>
				toggle
					.setValue(this.plugin.settings.treeLines)
					.onChange(async (value) => {
						this.plugin.settings.treeLines = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		containerEl.createEl('h3', { text: 'Headings' });

		new Setting(containerEl)
			.setName('Minimum heading level')
			.setDesc('Headings above this level are hidden (1 = H1, 2 = H2 …)')
			.addSlider(slider =>
				slider
					.setLimits(1, 6, 1)
					.setValue(this.plugin.settings.minHeadingLevel)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.minHeadingLevel = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

		new Setting(containerEl)
			.setName('Maximum heading level')
			.setDesc('Headings below this level are hidden (6 = show all)')
			.addSlider(slider =>
				slider
					.setLimits(1, 6, 1)
					.setValue(this.plugin.settings.maxHeadingLevel)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.maxHeadingLevel = value;
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);
	}
}
