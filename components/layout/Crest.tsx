/** The shield-and-figure crest used as the LRE mark across every screen. */
export function Crest({ className = 'w-9 h-11' }: { className?: string }) {
  return (
    <svg
      className={`${className} fill-current flex-shrink-0`}
      viewBox="0 0 24 28"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 0L24 4V13C24 20.5 18.8 26.8 12 28C5.2 26.8 0 20.5 0 13V4L12 0ZM12 3.1L2.5 6.3V13C2.5 19.2 6.6 24.3 12 25.4C17.4 24.3 21.5 19.2 21.5 13V6.3L12 3.1ZM12 6.5C13.8 6.5 15.3 8 15.3 9.8C15.3 11 14.6 12 13.6 12.6C15.4 13.3 16.7 15.1 16.7 17.2H7.3C7.3 15.1 8.6 13.3 10.4 12.6C9.4 12 8.7 11 8.7 9.8C8.7 8 10.2 6.5 12 6.5Z" />
    </svg>
  );
}

/** Board of Regents star, shown on showcase listings and the detail sidebar. */
export function RegentsStar({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
