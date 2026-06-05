import hljs from 'highlight.js'

export function useShellSyntaxHighlight() {
  const highlightShellLogs = (content: string): string => {
    if (!content) {
      return ''
    }

    return hljs.highlight(content, { language: 'bash', ignoreIllegals: true }).value
  }

  return {
    highlightShellLogs,
  }
}
