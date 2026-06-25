import { MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, ModernOutlineSettings, ModernOutlineSettingTab } from './settings';
import { OverlayOutline } from './ui/OverlayOutline';

export default class ModernOutlinePlugin extends Plugin {
	settings: ModernOutlineSettings;
	overlay: OverlayOutline;

	async onload() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ModernOutlineSettings>);

		this.overlay = new OverlayOutline(this.app, this);

		this.addRibbonIcon('list', 'Toggle modern outline', () => {
			this.overlay.toggle();
		});

		this.addCommand({
			id: 'toggle',
			name: 'Toggle',
			callback: () => { this.overlay.toggle(); },
		});

		this.addSettingTab(new ModernOutlineSettingTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				// Only re-attach when a markdown note is focused. When focus moves
				// to the sidebar or another non-markdown pane, keep the overlay on
				// the last note instead of removing it.
				if (view) this.overlay.attachTo(view);
			})
		);

		this.registerEvent(
			this.app.metadataCache.on('changed', (file) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (view?.file === file) this.overlay.scheduleRefresh();
			})
		);

		// Refresh on mode switch (source ↔ reading) and layout changes
		this.registerEvent(
			this.app.workspace.on('layout-change', () => this.overlay.scheduleRefresh())
		);

		this.app.workspace.onLayoutReady(() => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) this.overlay.attachTo(view);
		});
	}

	onunload() {
		this.overlay.detach();
	}

	refreshOutlineView() {
		this.overlay.scheduleRefresh();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
