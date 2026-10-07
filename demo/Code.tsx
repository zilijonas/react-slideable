import { useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-jsx';

function Snippet({ source, language }: { source: string; language: string }) {
  const html = useMemo(() => Prism.highlight(source, Prism.languages[language], language), [source, language]);
  return (
    <pre>
      <code className={`language-${language}`} dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

export function Code({ jsx, css, className = '' }: { jsx: string; css: string; className?: string }) {
  return (
    <details className={`example-code ${className}`}>
      <summary>Code</summary>
      <div className="code-heading">JSX</div>
      <Snippet
        source={`import { Slideable } from 'react-slideable';\nimport 'react-slideable/dist/index.css';\n\n${jsx}`}
        language="jsx"
      />
      <div className="code-heading">CSS</div>
      <Snippet source={css} language="css" />
    </details>
  );
}
