import Link from 'next/link';
import { memo, Children, isValidElement } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './code-block';

const components: Partial<Components> = {
  // Override code to use your custom CodeBlock
  // @ts-expect-error
  code: CodeBlock,
  // Override the default paragraph behavior to prevent nesting <pre> inside <p>
  p: ({ node, children, ...props }) => {
    // Check if children contains a pre element or CodeBlock component
    const hasPreChild = Children.toArray(children).some(
      (child) =>
        isValidElement(child) &&
        (child.type === 'pre' || child.type === CodeBlock),
    );

    // If it has a pre child, just render the children directly
    if (hasPreChild) {
      return <>{children}</>;
    }

    // Otherwise, render a normal paragraph
    return <p {...props}>{children}</p>;
  },
  // Render pre without a parent wrapper to avoid nesting issues
  pre: ({ children }) => <>{children}</>,
  ol: ({ node, children, ...props }) => (
    <ol className="list-decimal list-outside ml-4" {...props}>
      {children}
    </ol>
  ),
  li: ({ node, children, ...props }) => (
    <li className="py-1" {...props}>
      {children}
    </li>
  ),
  ul: ({ node, children, ...props }) => (
    <ul className="list-decimal list-outside ml-4" {...props}>
      {children}
    </ul>
  ),
  strong: ({ node, children, ...props }) => (
    <span className="font-semibold" {...props}>
      {children}
    </span>
  ),
  a: ({ node, children, ...props }) => (
    // @ts-expect-error
    <Link
      className="text-blue-500 hover:underline"
      target="_blank"
      rel="noreferrer"
      {...props}
    >
      {children}
    </Link>
  ),
  h1: ({ node, children, ...props }) => (
    <h1 className="text-3xl font-semibold mt-6 mb-2" {...props}>
      {children}
    </h1>
  ),
  h2: ({ node, children, ...props }) => (
    <h2 className="text-2xl font-semibold mt-6 mb-2" {...props}>
      {children}
    </h2>
  ),
  h3: ({ node, children, ...props }) => (
    <h3 className="text-xl font-semibold mt-6 mb-2" {...props}>
      {children}
    </h3>
  ),
  h4: ({ node, children, ...props }) => (
    <h4 className="text-lg font-semibold mt-6 mb-2" {...props}>
      {children}
    </h4>
  ),
  h5: ({ node, children, ...props }) => (
    <h5 className="text-base font-semibold mt-6 mb-2" {...props}>
      {children}
    </h5>
  ),
  h6: ({ node, children, ...props }) => (
    <h6 className="text-sm font-semibold mt-6 mb-2" {...props}>
      {children}
    </h6>
  ),
};

const remarkPlugins = [remarkGfm];

const NonMemoizedMarkdown = ({ children }: { children: string }) => {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  );
};

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);
