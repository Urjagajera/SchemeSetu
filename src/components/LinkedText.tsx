import React from 'react';
import { splitLinks } from '../utils/linkify';

/**
 * Plain text in which web addresses are clickable. Links open in a new tab and carry rel="noopener noreferrer", so
 * the linked site cannot reach back into this page or see where the visitor came from. The text is rendered as
 * React text nodes and anchor elements only, never as HTML.
 */
export const LinkedText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {splitLinks(text).map((part, i) =>
      part.type === 'link' ? (
        <a
          key={i}
          href={part.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-secondary dark:text-sky-400 underline underline-offset-2 break-all hover:opacity-80"
        >
          {part.text}
        </a>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      ),
    )}
  </>
);
