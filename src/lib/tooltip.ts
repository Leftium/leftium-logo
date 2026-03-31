/**
 * Svelte action wrapping tippy.js for instant, styled tooltips.
 *
 * Usage:
 *   <button use:tooltip={'Copy to clipboard'}>Copy</button>
 *   <button use:tooltip={{ content: 'Preview', placement: 'top' }}>Hover</button>
 */

import tippy from 'tippy.js';
import type { Props, Instance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

type TooltipParam = string | Partial<Props> | null | undefined;

export function tooltip(node: HTMLElement, param: TooltipParam) {
	if (!param) return {};

	const opts: Partial<Props> = typeof param === 'string' ? { content: param } : param;

	// @ts-expect-error -- tippy.js CJS/ESM interop under module:"NodeNext"
	const instance: Instance = tippy(node, {
		delay: [80, 0], // 80ms show delay (fast but not jumpy), instant hide
		duration: [150, 100],
		...opts
	});

	// Remove native title so browser tooltip doesn't fight tippy
	if (node.hasAttribute('title')) {
		node.removeAttribute('title');
	}

	return {
		update(newParam: TooltipParam) {
			if (!newParam) {
				instance.disable();
				return;
			}
			instance.enable();
			const newOpts: Partial<Props> =
				typeof newParam === 'string' ? { content: newParam } : newParam;
			instance.setProps(newOpts);
		},
		destroy() {
			instance.destroy();
		}
	};
}
