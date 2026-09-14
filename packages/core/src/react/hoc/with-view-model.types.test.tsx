import { Component, forwardRef, memo } from 'react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ViewModelSimple } from '../../core.js';
import { ViewModelBaseMock } from '../../view-model/view-model.base.test.js';

import { type ViewModelProps, withViewModel } from './with-view-model.js';

class PageVM extends ViewModelBaseMock {
  someTypedProperty = 'typed-value';
  someTypedMethod() {
    return 42;
  }
}

class WidgetVM extends ViewModelBaseMock {
  someTypedProperty = 'typed-value';
}

interface WidgetProps {
  value: string;
}

class SimplePageVM implements ViewModelSimple {
  id = 'simple-page';
  someTypedProperty = 'typed-value';
}

describe('withViewModel typings (regression)', () => {
  it('inline component without generics keeps the model typed', () => {
    const Page = withViewModel(PageVM, ({ model }) => {
      expectTypeOf(model).not.toBeAny();
      expectTypeOf(model).toEqualTypeOf<PageVM>();
      model.someTypedProperty satisfies string;
      model.someTypedMethod() satisfies number;
      // @ts-expect-error - VM has no such member
      model.someUnknownProperty;
      return null;
    });

    expect(Page).toBeDefined();
  });

  it('inline component with explicit VM generic keeps the model typed', () => {
    const Page = withViewModel<PageVM>(PageVM, ({ model }) => {
      expectTypeOf(model).not.toBeAny();
      expectTypeOf(model).toEqualTypeOf<PageVM>();
      model.someTypedProperty satisfies string;
      return null;
    });

    expect(Page).toBeDefined();
  });

  it('inline component with custom props keeps model and props typed', () => {
    const Widget = withViewModel<WidgetVM, WidgetProps>(
      WidgetVM,
      ({ model, value }) => {
        expectTypeOf(model).not.toBeAny();
        expectTypeOf(model).toEqualTypeOf<WidgetVM>();
        value satisfies string;
        // @ts-expect-error - value is a string, not a number
        value satisfies number;
        return null;
      },
    );

    expect(Widget).toBeDefined();
  });

  it('inline component for simple view models keeps the model typed', () => {
    const SimplePage = withViewModel(SimplePageVM, ({ model }) => {
      expectTypeOf(model).not.toBeAny();
      expectTypeOf(model).toEqualTypeOf<SimplePageVM>();
      model.someTypedProperty satisfies string;
      return null;
    });

    expect(SimplePage).toBeDefined();
  });

  it('curried inline component keeps the model typed', () => {
    const CurriedPage = withViewModel(PageVM)(({ model }) => {
      expectTypeOf(model).not.toBeAny();
      expectTypeOf(model).toEqualTypeOf<PageVM>();
      return null;
    });

    const CurriedWithConfig = withViewModel(PageVM, { id: 'page' })(
      ({ model }) => {
        expectTypeOf(model).not.toBeAny();
        expectTypeOf(model).toEqualTypeOf<PageVM>();
        return null;
      },
    );

    expect(CurriedPage).toBeDefined();
    expect(CurriedWithConfig).toBeDefined();
  });

  it('class component is still supported', () => {
    class PageClassView extends Component<ViewModelProps<PageVM>> {
      render() {
        return this.props.model.someTypedProperty;
      }
    }

    const PageFromClass = withViewModel(PageVM, PageClassView);

    expect(PageFromClass).toBeDefined();
  });

  it('memo component is still supported', () => {
    const MemoView = memo(({ model }: ViewModelProps<PageVM>) => {
      expectTypeOf(model).toEqualTypeOf<PageVM>();
      return null;
    });

    const PageFromMemo = withViewModel(PageVM, MemoView);

    expect(PageFromMemo).toBeDefined();
  });

  it('forwardRef component is still supported', () => {
    const ForwardedView = forwardRef<HTMLDivElement, ViewModelProps<PageVM>>(
      ({ model }, ref) => {
        expectTypeOf(model).toEqualTypeOf<PageVM>();
        return <div ref={ref} />;
      },
    );

    const PageFromForwardRef = withViewModel(PageVM, ForwardedView);

    expect(PageFromForwardRef).toBeDefined();
  });

  it('forwardedRef prop keeps its type with config', () => {
    const PageWithForwardedRef = withViewModel(
      PageVM,
      ({ forwardedRef, model }: ViewModelProps<PageVM, HTMLDivElement>) => {
        expectTypeOf(model).toEqualTypeOf<PageVM>();
        expectTypeOf(forwardedRef).toEqualTypeOf<
          React.ForwardedRef<HTMLDivElement> | undefined
        >();
        return null;
      },
      { forwardRef: true },
    );

    expect(PageWithForwardedRef).toBeDefined();
  });
});
