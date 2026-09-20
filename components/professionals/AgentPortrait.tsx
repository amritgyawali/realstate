import { Photo } from '@/components/ui/Photo';
import type { Agent } from '@/lib/types';

interface AgentPortraitProps {
  agent: Agent;
  sizes: string;
  className?: string;
}

/**
 * Portrait with a crest placeholder.
 *
 * Not every member has supplied a headshot; the reference screens show a stylised
 * avatar in that case rather than a broken frame, so this does the same.
 */
export function AgentPortrait({ agent, sizes, className = '' }: AgentPortraitProps) {
  if (!agent.image) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-sand-100 ${className}`}
        role="img"
        aria-label={`${agent.name} — no portrait supplied`}
      >
        <svg
          className="h-2/5 w-2/5 fill-current text-sand-400 opacity-70"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
      </div>
    );
  }

  return (
    <Photo
      src={agent.image}
      alt={`${agent.name} portrait`}
      fill
      sizes={sizes}
      className={`object-cover object-top ${className}`}
    />
  );
}
