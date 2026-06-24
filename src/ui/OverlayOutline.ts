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
	private animateNextRefresh = false;

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

		// Wheeling over the outline would otherwise hit the dashes (pointer-events:
		// auto) and never reach the note's scroller (not a DOM ancestor of the
		// overlay). Forward the wheel to the note so it scrolls as if the outline
		// weren't there — and the strip itself never scrolls on its own.
		overlay.addEventListener('wheel', (e: WheelEvent) => {
			const scroller = this.getNoteScroller(view);
			if (!scroller) return;
			e.preventDefault();
			// Normalize delta: 0 = pixels, 1 = lines, 2 = pages.
			const factor = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scroller.clientHeight : 1;
			scroller.scrollTop += e.deltaY * factor;
		}, { passive: false });

		// On touch, just stop the strip from scrolling on its own.
		overlay.addEventListener('touchmove', (e: Event) => {
			if (overlay.classList.contains('overlay-scroll')) e.preventDefault();
		}, { passive: false });

		// Play the entry animation only when attaching to a (new) note, not on
		// the content/layout refreshes that happen while editing.
		this.animateNextRefresh = true;
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
		overlay.classList.add(`overlay-${this.plugin.settings.verticalPosition}`);
		overlay.classList.add(`outline-dash-${this.plugin.settings.dashColor}`);
		overlay.classList.add(`outline-label-${this.plugin.settings.labelColor}`);
		overlay.classList.add(`outline-shape-${this.plugin.settings.dashShape}`);
		overlay.classList.add(`outline-size-${this.plugin.settings.dashSize}`);
		overlay.classList.add(`outline-font-${this.plugin.settings.labelFont}`);

		const animate = this.plugin.settings.animationsEnabled;
		if (!animate) overlay.classList.add('outline-no-anim');
		if (animate && this.animateNextRefresh) overlay.classList.add('outline-animate-in');
		this.animateNextRefresh = false;

		if (!view.file) return;

		const { minHeadingLevel, maxHeadingLevel } = this.plugin.settings;
		this.headings = getHeadings(this.app, view.file).filter(
			h => h.level >= minHeadingLevel && h.level <= maxHeadingLevel
		);

		if (this.headings.length === 0) return;

		// With many headings the cascade takes too long to finish — drop the
		// stagger so labels/dashes animate together instead.
		if (this.headings.length > 30) overlay.classList.add('outline-no-stagger');

		// Each heading is a row: dash + label. Hovering anywhere on the overlay
		// fades in every label at once, via CSS :has().
		this.headings.forEach((h, i) => {
			const row = overlay.createDiv({ cls: 'outline-row' });
			row.dataset.index = String(i);
			row.style.setProperty('--i', String(i)); // cascade order, inherited by dash + label
			row.createSpan({ cls: `outline-label outline-label--h${h.level}`, text: h.heading });
			row.createDiv({ cls: `outline-dash outline-dash--h${h.level}` });
			row.addEventListener('click', () => this.scrollToHeading(h, view));
		});

		this.applyLayout(view);
		this.highlightCurrentHeading();
	}

	// Computes how many rungs fit in the available height (reserving headroom so
	// labels are never clipped mid-row). If all headings fit, spreads them with
	// dynamic padding — no scroll. If there are more headings than fit even at
	// minimum spacing, falls back to a scrollable strip that keeps the active
	// rung in view, so no headings are ever dropped.
	private applyLayout(view: MarkdownView) {
		const overlay = this.overlayEl;
		if (!overlay) return;

		const containerHeight = view.contentEl.clientHeight;
		const cap = containerHeight * 0.85;
		const headroom = 10; // ≈ half a label height, top and bottom
		const usable = Math.max(0, cap - headroom * 2);

		const dashHeight = 2;
		const padding = 6; // fixed row padding
		const minRow = dashHeight + padding * 2; // 14px
		const count = this.headings.length;

		const maxRungs = Math.max(1, Math.floor(usable / minRow));
		const overflowing = count > maxRungs;

		overlay.style.paddingBlock = `${headroom}px`;
		overlay.classList.toggle('overlay-scroll', overflowing);
		overlay.style.maxHeight = overflowing ? `${cap}px` : '';

		overlay.querySelectorAll<HTMLElement>('.outline-row').forEach(row => {
			row.style.paddingBlock = `${padding}px`;
		});
	}

	// The note's scrollable element — the CodeMirror scroller in editing mode,
	// the preview container in reading mode.
	private getNoteScroller(view: MarkdownView): HTMLElement | null {
		if (view.getMode() === 'preview') {
			const el = view.contentEl;
			return (el.querySelector('.markdown-preview-view') as HTMLElement | null)
				?? (el.querySelector('.markdown-reading-view') as HTMLElement | null);
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const cm = (view.editor as any)?.cm;
		return (cm?.scrollDOM as HTMLElement | undefined)
			?? (view.contentEl.querySelector('.cm-scroller') as HTMLElement | null);
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
		const overlay = this.overlayEl;
		if (!overlay) return;

		const rows = overlay.querySelectorAll<HTMLElement>('.outline-row');
		rows.forEach((el, i) => {
			el.classList.toggle('is-active', i === index);
		});

		// In scroll mode keep the active rung centered.
		if (overlay.classList.contains('overlay-scroll')) {
			const row = rows[index];
			if (row) {
				overlay.scrollTop = row.offsetTop + row.offsetHeight / 2 - overlay.clientHeight / 2;
			}
		}
	}
}
