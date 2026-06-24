import { App, PluginSettingTab, Setting } from 'obsidian';
import type ModernOutlinePlugin from './main';

export interface ModernOutlineSettings {
	sidebarSide: 'left' | 'right';
	minHeadingLevel: number;
	maxHeadingLevel: number;
}

export const DEFAULT_SETTINGS: ModernOutlineSettings = {
	sidebarSide: 'right',
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

		new Setting(containerEl)
			.setName('Overlay position')
			.setDesc('Which side of the note to show the outline on')
			.addDropdown(drop =>
				drop
					.addOption('right', 'Right')
					.addOption('left', 'Left')
					.setValue(this.plugin.settings.sidebarSide)
					.onChange(async (value) => {
						this.plugin.settings.sidebarSide = value as 'left' | 'right';
						await this.plugin.saveSettings();
						this.plugin.refreshOutlineView();
					})
			);

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
