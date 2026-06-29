import { App, debounce, MarkdownView, Platform, TFile } from 'obsidian';
import type ModernOutlinePlugin from '../main';
import { cleanHeadingText, getHeadings, HeadingInfo } from '../utils/headings';

export class OverlayOutline {
	private overlayEl: HTMLElement | null = null;
	private currentView: MarkdownView | null = null;
	private headings: HeadingInfo[] = [];
	private refreshTimer: number | null = null;
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
		if (this.refreshTimer) window.clearTimeout(this.refreshTimer);
		this.overlayEl?.remove();
		this.overlayEl = null;
		this.currentView = null;
		this.headings = [];
	}

	scheduleRefresh(delay = 300) {
		if (this.refreshTimer) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => this.doRefresh(), delay);
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
		overlay.classList.add(`outline-dash-${this.plugin.settings.markerColor}`);
		overlay.classList.add(`outline-label-${this.plugin.settings.labelColor}`);
		overlay.classList.add(`outline-highlight-${this.plugin.settings.highlightColor}`);
		overlay.classList.add(`outline-shape-${this.plugin.settings.markerShape}`);
		overlay.classList.add(`outline-size-${this.plugin.settings.markerSize}`);
		overlay.classList.add(`outline-font-${this.plugin.settings.labelFont}`);
		overlay.classList.add(`outline-hierarchy-${this.plugin.settings.labelHierarchy}`);
		if (this.plugin.settings.labelsAlwaysOn) overlay.classList.add('outline-labels-always-on');
		overlay.classList.add(`outline-tree-lines-${this.plugin.settings.treeLineColor}`);

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
			row.createSpan({ cls: `outline-label outline-label--h${h.level}`, text: cleanHeadingText(h.heading) });
			row.createDiv({ cls: `outline-dash outline-dash--h${h.level}` });
			row.addEventListener('click', () => this.scrollToHeading(h, view));
		});

		this.applyLayout(view);
		this.buildTreeLines();
		this.highlightCurrentHeading();
	}

	// Injects absolutely-positioned vertical line elements that connect each
	// parent heading's midpoint to its last child's midpoint. Runs after
	// applyLayout so offsetTop values reflect the final padding/sizes.
	private buildTreeLines() {
		const overlay = this.overlayEl;
		if (!overlay || !this.plugin.settings.treeLines) return;

		if (this.headings.length > 30) return;

		const rows = Array.from(overlay.querySelectorAll<HTMLElement>('.outline-row'));
		const isRight = this.plugin.settings.sidebarSide === 'right';
		const labelGap = parseFloat(getComputedStyle(overlay).getPropertyValue('--label-gap')) || 4;
		const indentStep = 8;

		for (let i = 0; i < this.headings.length; i++) {
			const parentHeading = this.headings[i];
			if (!parentHeading) continue;
			const parentLevel = parentHeading.level;

			// Find the last heading that is a descendant of this one.
			let lastChildIdx = -1;
			for (let j = i + 1; j < this.headings.length; j++) {
				const h = this.headings[j];
				if (!h || h.level <= parentLevel) break;
				lastChildIdx = j;
			}
			if (lastChildIdx < 0) continue;

			const parentRow = rows[i];
			const lastChildRow = rows[lastChildIdx];
			if (!parentRow || !lastChildRow) continue;

			// Height = distance from parent row center to last child row center.
			// offsetTop values are relative to the overlay (shared offset parent).
			const lineHeight =
				(lastChildRow.offsetTop + lastChildRow.offsetHeight / 2) -
				(parentRow.offsetTop + parentRow.offsetHeight / 2);
			if (lineHeight <= 0) continue;

			// Horizontal offset from the near edge of the row, into the label area.
			const rowWidth = parentRow.offsetWidth;
			const offsetFromEdge = rowWidth + labelGap + (parentLevel - 1) * indentStep + indentStep / 2 - 4;

			// The line is a child of its parent row so it inherits --i and --stagger
			// automatically — no manual copy needed, and it animates in sync with
			// the row's label regardless of whether stagger is on or off.
			const line = parentRow.createDiv({ cls: 'outline-tree-line' });
			let matchColor = '';
			if (this.plugin.settings.treeLineColor === 'match') {
				const label = parentRow.querySelector<HTMLElement>('.outline-label');
				if (label) matchColor = `background-color: ${getComputedStyle(label).color};`;
			}
			const transform = isRight
				? 'translateX(var(--label-nudge))'
				: 'translateX(calc(-1 * var(--label-nudge)))';
			const side = isRight ? `right: ${offsetFromEdge}px` : `left: ${offsetFromEdge}px`;
			line.setAttribute('style', `top: 112%; height: ${lineHeight - 4}px; transform: ${transform}; ${side}; ${matchColor}`);
		}
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
		const cap = containerHeight * (Platform.isMobile ? 0.6 : 0.85);
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
			return el.querySelector<HTMLElement>('.markdown-preview-view')
				?? el.querySelector<HTMLElement>('.markdown-reading-view');
		}
		const editor = view.editor as unknown as { cm?: { scrollDOM?: HTMLElement } } | undefined;
		return editor?.cm?.scrollDOM
			?? view.contentEl.querySelector<HTMLElement>('.cm-scroller');
	}

	private scrollToHeading(h: HeadingInfo, view: MarkdownView) {
		const line = h.position.start.line;
		if (!(view.file instanceof TFile)) return;
		const file = view.file;

		// Activate the leaf first, so a click works even when focus was
		// elsewhere (sidebar, another pane) — otherwise the first click only
		// re-focuses the note and a second click is needed to navigate.
		this.app.workspace.setActiveLeaf(view.leaf, { focus: true });

		// Mirrors obsidian-dynamic-outline's _navigateToHeading:
		// openFile sets the initial position, applyScroll ensures the line
		// is visible once the view is ready.
		void view.leaf.openFile(file, { active: true, eState: { line } });
		window.setTimeout(() => {
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
