import type { JSX } from 'solid-js';

export type SJSXElement = JSX.Element;

export type SComponent<P = {}> = (props: P) => SJSXElement;

export type SRenderFn<P = {}> = (props: P) => SJSXElement;
