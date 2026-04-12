import type { SVGProps } from 'react';

export const GridIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" fill="none" {...props} viewBox="0 0 20 20">
    <path
      d="M4 4.5h4M4 10h4m-4 5.5h4m4-11h4M12 10h4m-4 5.5h4M9 3v14m2-14v14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" fill="none" {...props} viewBox="0 0 20 20">
    <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m13 13 3.5 3.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const UserIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" fill="none" {...props} viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M5.5 19c1.7-3 4.1-4.5 6.5-4.5s4.8 1.5 6.5 4.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const BoxIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" fill="none" {...props} viewBox="0 0 24 24">
    <path
      d="m12 3 7 4v10l-7 4-7-4V7l7-4Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="m5 7 7 4 7-4M12 11v10"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const HeartIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" fill="none" {...props} viewBox="0 0 24 24">
    <path
      d="M12 20.5s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10.5c0 5.6-7 10-7 10Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const CartIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" fill="none" {...props} viewBox="0 0 24 24">
    <path
      d="M4 5h2l1.3 7.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L19.5 8H7.2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <circle cx="10" cy="18.5" r="1.25" fill="currentColor" />
    <circle cx="17" cy="18.5" r="1.25" fill="currentColor" />
  </svg>
);
