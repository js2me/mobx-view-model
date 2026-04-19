import type * as React from 'react';

export type RComponentState = React.ComponentState;

export type RReactNode = React.ReactNode;

export type RForwardedRef<T> = React.ForwardedRef<T>

export type RComponentType<P = {}> = React.ComponentType<P>

export type RLegacyRef<T> = React.LegacyRef<T>;

export type RComponentClass<P = {}, S = RComponentState> = React.ComponentClass<P,S>

/** Value accepted by React [`use()`](https://react.dev/reference/react/use). */
export type RUsable<T> = React.Usable<T>