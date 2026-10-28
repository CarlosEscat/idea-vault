import ReactMarkdown from 'react-markdown'

const SAFE_PROTOCOLS = /^(https?:|mailto:)/i

/**
 * Renders untrusted markdown (user notes and LLM output): no raw HTML (react-markdown's default),
 * only http(s)/mailto links that open with rel=noopener, and no remote images (they leak requests).
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      urlTransform={url => (SAFE_PROTOCOLS.test(url) || url.startsWith('#') ? url : '')}
      components={{
        a: ({ href, children }) =>
          href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a> : <span>{children}</span>,
        img: () => null,
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
