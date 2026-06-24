import { App, debounce, MarkdownView, TFile } from 'obsidian';
import type ModernOutlinePlugin from '../main';
import { getHeadings, HeadingInfo } from '../utils/headings';

export class OverlayOutline {
	private overlayEl: HTMLElement | null = null;
	private currentView: MarkdownView | null = null;
	private headings: HeadingInfo[] = [];
	private refreshTimer: ReturnType<typeof setTimeout> | null = null;
	private _enabled = true;
	private scrollHandler: ((event: Event) => void) | null = null;

	constructor(private app: App, private plugin: ModernOutlinePlugin) {
		this.registerGlobalScrollListener();
	}

	get enabled() { return this._enabled; }

	toggle() {
		if (this._enabled) {
			this._enabled = false;
			this.detach();
		} else {
			this._enabled = true;
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) this.attachTo(view);
		}
	}

	attachTo(view: MarkdownView) {
		if (!this._enabled) return;

		if (this.currentView === view && this.overlayEl) {
			this.scheduleRefresh(0);
			return;
		}

		this.detach();
		this.currentView = view;
		const overlay = view.contentEl.createDiv({ cls: 'modern-outline-overlay' });
		this.overlayEl = overlay;
		this.scheduleRefresh(0);
	}

	detach() {
		if (this.refreshTimer) clearTimeout(this.refreshTimer);
		this.overlayEl?.remove();
		this.overlayEl = null;
		this.currentView = null;
		this.headings = [];
	}

	scheduleRefresh(delay = 300) {
		if (this.refreshTimer) clearTimeout(this.refreshTimer);
		this.refreshTimer = setTimeout(() => this.doRefresh(), delay);
	}

	private doRefresh() {
		const view = this.currentView;
		const overlay = this.overlayEl;
		if (!view || !overlay) return;

		overlay.empty();
		overlay.className = 'modern-outline-overlay';
		overlay.classList.add(
			this.plugin.settings.sidebarSide === 'left' ? 'overlay-left' : 'overlay-right'
		);

		if (!view.file) return;

		const { minHeadingLevel, maxHeadingLevel } = this.plugin.settings;
		this.headings = getHeadings(this.app, view.file).filter(
			h => h.level >= minHeadingLevel && h.level <= maxHeadingLevel
		);

		if (this.headings.length === 0) return;

		// Each heading is a row: dash + label. Hovering anywhere on the overlay
		// fades in every label at once, via CSS :has().
		this.headings.forEach((h, i) => {
			const row = overlay.createDiv({ cls: 'outline-row' });
			row.dataset.index = String(i);
			row.createSpan({ cls: 'outline-label', text: h.heading });
			row.createDiv({ cls: `outline-dash outline-dash--h${h.level}` });
			row.addEventListener('click', () => this.scrollToHeading(h, view));
		});

		this.highlightCurrentHeading();
	}

	private scrollToHeading(h: HeadingInfo, view: MarkdownView) {
		const line = h.position.start.line;
		const file = view.file as TFile;

		// Activate the leaf first, so a click works even when focus was
		// elsewhere (sidebar, another pane) — otherwise the first click only
		// re-focuses the note and a second click is needed to navigate.
		this.app.workspace.setActiveLeaf(view.leaf, { focus: true });

		// Mirrors obsidian-dynamic-outline's _navigateToHeading:
		// openFile sets the initial position, applyScroll ensures the line
		// is visible once the view is ready.
		view.leaf.openFile(file, { active: true, eState: { line } });
		setTimeout(() => {
			view.currentMode.applyScroll(line);
		}, 0);
	}

	// Single global scroll listener in the capture phase — the exact technique
	// used by obsidian-dynamic-outline. Capturing on document catches scroll
	// from ANY container (editor, reading view, embeds) without having to know
	// which element is actually scrolling.
	private registerGlobalScrollListener() {
		const handler = debounce((event: Event) => {
			const target = event.target as HTMLElement | null;
			// Ignore scrolling that happens inside the overlay itself.
			if (target?.classList?.contains('modern-outline-overlay')) return;
			this.highlightCurrentHeading();
		}, 0);

		this.scrollHandler = handler;
		// `activeWindow` accounts for pop-out windows; capture = true.
		this.plugin.registerDomEvent(
			activeWindow.document as unknown as HTMLElement,
			'scroll',
			handler,
			true
		);
	}

	// Reads the top visible line via view.currentMode.getScroll() — identical
	// in both editing and reading modes — and binary-searches the closest
	// heading. closestIndex starts at 0 so the first heading is always active.
	highlightCurrentHeading() {
		if (!this._enabled) return;
		const view = this.currentView;
		const overlay = this.overlayEl;
		if (!view || !overlay) return;
		if (this.headings.length === 0) return;

		let currentScrollPosition: number;
		try {
			currentScrollPosition = view.currentMode.getScroll();
		} catch {
			return;
		}

		const targetLine = currentScrollPosition + 1;
		let closestIndex = 0;
		let low = 0;
		let high = this.headings.length - 1;
		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			const h = this.headings[mid];
			if (!h) break;
			if (h.position.start.line <= targetLine) {
				closestIndex = mid;
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}

		this.setActiveItem(closestIndex);
	}

	setActiveItem(index: number) {
		this.overlayEl?.querySelectorAll('.outline-row').forEach((el, i) => {
			el.classList.toggle('is-active', i === index);
		});
	}
}
