import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Slideable } from '../src';
import { Code } from './Code';
import { arrowStyles, cardStyles, logoStyles, photoStyles } from './snippets';
import '../src/styles.css';
import './style.css';

const places = ['Quiet shore', 'Above the clouds', 'Into the green', 'Room to breathe', 'Out of office'];
const companies = ['Orbit', 'Forma', 'Northstar', 'Layers', 'Arc', 'Goodfield', 'Modus', 'Outline'];

function App() {
  const [looped, setLooped] = useState(true);
  const [count, setCount] = useState(3);
  const [gap, setGap] = useState(16);
  const [amount, setAmount] = useState(5);
  const [auto, setAuto] = useState(false);
  const [smooth, setSmooth] = useState(true);
  const [draggable, setDraggable] = useState(true);
  const [pagination, setPagination] = useState(true);
  const [arrows, setArrows] = useState('default');
  const [index, setIndex] = useState(0);
  const toggles = [
    { label: 'Looped', value: looped, set: setLooped },
    { label: 'Autoplay', value: auto, set: setAuto },
    { label: 'Smooth motion', value: smooth, set: setSmooth },
    { label: 'Touch & drag', value: draggable, set: setDraggable },
    { label: 'Pagination', value: pagination, set: setPagination },
  ];
  return (
    <>
      <header className="shell topbar">
        <h1>
          react-slideable <span>v2</span>
        </h1>
        <a href="https://github.com/zilijonas/react-slideable">GitHub ↗</a>
      </header>
      <main>
        <section className="shell example" aria-label="Interactive playground">
          <div className="example-heading">
            <h2>Playground</h2>
            <span>
              {amount ? index + 1 : 0} / {amount}
            </span>
          </div>
          <Slideable
            items={places.slice(0, amount).map((name, i) => (
              <article className="photo" key={name}>
                <img src={`${import.meta.env.BASE_URL}images/destination-${i + 1}.jpg`} alt="" draggable={false} />
                <h3>
                  <span>0{i + 1}</span>
                  {name}
                </h3>
              </article>
            ))}
            looped={looped}
            draggable={draggable}
            slidesPerView={{ 520: 1, 800: Math.min(count, 2), max: count }}
            gap={`${gap}px`}
            height={240}
            duration={smooth ? 420 : 0}
            pagination={pagination}
            controls={arrows !== 'hidden'}
            previousIcon={arrows === 'custom' ? '↖' : undefined}
            nextIcon={arrows === 'custom' ? '↗' : undefined}
            className={arrows === 'custom' ? 'custom-arrows' : ''}
            autoplay={auto ? 3500 : false}
            onChange={setIndex}
            empty={<span>No slides. Increase slide count below.</span>}
            ariaLabel="Destinations"
          />
          <div className="settings" aria-label="Carousel settings">
            {[
              { id: 'visible', label: 'Slides per view', value: count, min: 1, max: 5, set: setCount, unit: '' },
              { id: 'gap', label: 'Gap', value: gap, min: 0, max: 40, set: setGap, unit: 'px' },
              { id: 'amount', label: 'Slide count', value: amount, min: 0, max: 5, set: setAmount, unit: '' },
            ].map(field => (
              <label className="range" key={field.id} htmlFor={field.id}>
                <span>
                  {field.label}
                  <output>
                    {field.value}
                    {field.unit}
                  </output>
                </span>
                <input
                  id={field.id}
                  type="range"
                  min={field.min}
                  max={field.max}
                  value={field.value}
                  onChange={event => field.set(Number(event.target.value))}
                />
              </label>
            ))}
            <label className="arrows">
              Arrows
              <select aria-label="Arrows" value={arrows} onChange={event => setArrows(event.target.value)}>
                <option value="default">Default</option>
                <option value="custom">Custom</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
            <div className="toggles">
              {toggles.map(toggle => (
                <label key={toggle.label}>
                  <input type="checkbox" checked={toggle.value} onChange={event => toggle.set(event.target.checked)} />
                  {toggle.label}
                </label>
              ))}
            </div>
          </div>
          <Code
            jsx={`<Slideable\n  items={cards.slice(0, ${amount})}\n  looped={${looped}}\n  draggable={${draggable}}\n  slidesPerView={{ 520: 1, 800: ${Math.min(count, 2)}, max: ${count} }}\n  gap="${gap}px"\n  height={240}\n  duration={${smooth ? 420 : 0}}\n  controls={${arrows !== 'hidden'}}\n  pagination={${pagination}}\n  autoplay={${auto ? 3500 : false}}${arrows === 'custom' ? '\n  previousIcon="↖"\n  nextIcon="↗"\n  className="custom-arrows"' : ''}\n  empty={<span>No slides. Increase slide count below.</span>}\n  ariaLabel="Destinations"\n/>`}
            css={photoStyles + (arrows === 'custom' ? `\n\n${arrowStyles}` : '')}
          />
        </section>
        <section className="logo-example example">
          <div className="shell example-heading">
            <h2>Trusted companies</h2>
            <span>Full width · autoplay · no arrows</span>
          </div>
          <Slideable
            items={companies.map((name, i) => (
              <div className="logo" key={name}>
                <svg viewBox="0 0 32 32" aria-hidden="true">
                  {i % 3 === 0 ? (
                    <>
                      <circle cx="16" cy="16" r="11" />
                      <path d="M3 23 29 9" />
                    </>
                  ) : i % 3 === 1 ? (
                    <>
                      <path d="M4 25 16 5 28 25Z" />
                      <path d="M10 25 22 15" />
                    </>
                  ) : (
                    <>
                      <path d="m16 3 13 13-13 13L3 16Z" />
                      <path d="M9 16h14M16 9v14" />
                    </>
                  )}
                </svg>
                <span>{name}</span>
              </div>
            ))}
            looped
            autoplay={2200}
            duration={850}
            controls={false}
            height={108}
            slidesPerView={{ 480: 2, 768: 3, 1100: 4, max: 6 }}
            ariaLabel="Company logos"
          />
          <p className="shell caption">Fictional logos. Hover or focus to pause.</p>
          <Code
            className="shell"
            jsx={`<div className="logo-example">\n  <Slideable\n    items={logos}\n    looped\n    autoplay={2200} // milliseconds\n    duration={850} // motion duration\n    controls={false}\n    height={108}\n    slidesPerView={{ 480: 2, 768: 3, 1100: 4, max: 6 }}\n    ariaLabel="Company logos"\n  />\n</div>`}
            css={logoStyles}
          />
        </section>
        <section className="shell example">
          <div className="example-heading">
            <h2>Cards</h2>
            <span>Finite · CSS styling · responsive gap</span>
          </div>
          <Slideable
            items={['Field notes', 'Design journal', 'New perspectives', 'Small discoveries'].map((title, i) => (
              <article className={`note note-${i}`} key={title}>
                <span>0{i + 1}</span>
                <div className="note-symbol" aria-hidden="true">
                  {['◌', '✳', '↗', '⊞'][i]}
                </div>
                <h3>{title}</h3>
              </article>
            ))}
            slidesPerView={{ 520: 1, 800: 2, max: 3 }}
            height={180}
            previousIcon="‹"
            nextIcon="›"
            className="custom-arrows css-styled"
            ariaLabel="Library features"
          />
          <Code
            jsx={`<Slideable\n  items={cards}\n  slidesPerView={{ 520: 1, 800: 2, max: 3 }}\n  height={180}\n  previousIcon="‹"\n  nextIcon="›"\n  className="custom-arrows css-styled"\n  ariaLabel="Cards"\n/>`}
            css={cardStyles}
          />
        </section>
      </main>
      <footer className="shell">MIT · React 18+ · Zero runtime dependencies</footer>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
