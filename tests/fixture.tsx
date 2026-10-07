import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Slideable } from '../src';
import '../src/styles.css';
import './fixture.css';
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ height: 400 }}>
      <button onClick={() => setCount(count + 1)}>Count {count}</button>
      <input aria-label="Edit slide" defaultValue="hello" />
      <a href="#clicked">Slide link</a>
    </div>
  );
}
function Fixture() {
  const [mounted, setMounted] = useState(true);
  return (
    <>
      {mounted && (
        <Slideable
          items={[
            <Counter key="counter" />,
            <div key="other" style={{ height: 400 }}>
              Other slide
            </div>,
          ]}
          looped
          slidesPerView={1}
          height={200}
          width={500}
          duration={0}
          ariaLabel="Interactive slides"
        />
      )}
      <button onClick={() => setMounted(!mounted)}>Toggle carousel</button>
      <Slideable
        items={['First', 'Second', 'Third'].map(label => (
          <div key={label}>{label}</div>
        ))}
        className="css-fixture"
        slidesPerView={2}
        gap={new URLSearchParams(location.search).has('gap') ? 40 : undefined}
        looped
        pagination
        duration={0}
        height={120}
        ariaLabel="CSS styled slides"
      />
    </>
  );
}

createRoot(document.getElementById('root')!).render(<Fixture />);
