import type { PropsWithChildren } from 'react';

/** Keep React's DOM ownership intact: SimpleBar must not move rendered children. */
export const ScrollbarLayout = ({ children }: PropsWithChildren) => (
  <>
    <div className="simplebar-wrapper">
      <div className="simplebar-height-auto-observer-wrapper">
        <div className="simplebar-height-auto-observer" />
      </div>
      <div className="simplebar-mask">
        <div className="simplebar-offset">
          <div
            className="simplebar-content-wrapper"
            tabIndex={0}
            role="region"
            aria-label="scrollable content"
          >
            <div className="simplebar-content">{children}</div>
          </div>
        </div>
      </div>
      <div className="simplebar-placeholder" />
    </div>
    <div className="simplebar-track simplebar-horizontal">
      <div className="simplebar-scrollbar" />
    </div>
    <div className="simplebar-track simplebar-vertical">
      <div className="simplebar-scrollbar" />
    </div>
  </>
);
