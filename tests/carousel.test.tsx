import { createRef, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slideable } from '../src';
import type { SlideableHandle } from '../src';
import { loopPosition, modulo, visibleCount } from '../src/lib/geometry';

describe('geometry', () => {
  it('rebases fractional positions without losing repeated-content alignment', () => {
    for (const position of [-100000.25, -1.5, 1000.125, 999999.75]) {
      const normalized = loopPosition(position, 6, 3, 101.25);
      expect(normalized).toBeGreaterThanOrEqual(607.5);
      expect(normalized).toBeLessThan(911.25);
      expect((position - normalized) / 303.75).toBeCloseTo(Math.round((position - normalized) / 303.75), 9);
    }
    expect(loopPosition(10, 3, 3, 0)).toBe(0);
  });
  it('wraps either direction, including empty lists', () => {
    expect(modulo(-1, 5)).toBe(4);
    expect(modulo(1001, 5)).toBe(1);
    expect(modulo(4, 0)).toBe(0);
  });
  it('uses sorted upper-bound container breakpoints and sanitizes invalid counts', () => {
    const config = { 800: 3, 400: 1, max: 4 };
    expect(visibleCount(400, config)).toBe(1);
    expect(visibleCount(401, config)).toBe(3);
    expect(visibleCount(900, config)).toBe(4);
    const custom = { 480: 2, 768: 3, 1100: 4, max: 6 };
    expect(visibleCount(767, custom)).toBe(3);
    expect(visibleCount(768, custom)).toBe(3);
    expect(visibleCount(769, custom)).toBe(4);
    expect(visibleCount(500, NaN)).toBe(1);
    expect(visibleCount(0, -5)).toBe(1);
    expect(visibleCount(900, 1e12)).toBe(100);
  });
});

describe('carousel', () => {
  const items = [<span key="a">A</span>, <span key="b">B</span>, <span key="c">C</span>];
  it('renders empty infinite mode and disables navigation', () => {
    const view = render(<Slideable items={[]} looped />);
    expect(view.container.querySelectorAll('.react-slideable__slide')).toHaveLength(0);
    expect(view.getByLabelText('Next slide').hasAttribute('disabled')).toBe(true);
  });
  it('does not duplicate single slides', () => {
    const view = render(<Slideable items={items.slice(0, 1)} looped slidesPerView={5} />);
    expect(view.container.querySelectorAll('.react-slideable__slide')).toHaveLength(1);
  });
  it('recenters active native scrolling and retains forward direction across rebases', () => {
    const direction = vi.fn();
    const view = render(<Slideable items={items} looped slidesPerView={1} onMove={direction} />);
    const element = view.container.querySelector('.react-slideable__viewport')!;
    element.scrollLeft = 7 * 900;
    fireEvent.scroll(element);
    expect(element.scrollLeft).toBe(4 * 900);
    fireEvent(element, new Event('scrollend'));
    expect(view.getByText('Slide 2 of 3')).toBeTruthy();
    expect(direction).toHaveBeenCalledWith('next');
  });
  it('keeps DOM bounded over repeated wraps and reports logical indices', () => {
    const api = createRef<SlideableHandle>();
    const change = vi.fn();
    const view = render(<Slideable ref={api} items={items} looped slidesPerView={1} duration={0} onChange={change} />);
    const element = view.container.querySelector('.react-slideable__viewport')!;
    const before = view.container.querySelectorAll('.react-slideable__slide').length;
    for (let i = 0; i < 300; i++) {
      act(() => api.current!.next());
      fireEvent(element, new Event('scrollend'));
    }
    expect(change).toHaveBeenCalledTimes(300);
    expect(change.mock.calls.at(-1)).toEqual([0]);
    expect(view.container.querySelectorAll('.react-slideable__slide')).toHaveLength(before);
    expect(element.scrollLeft).toBe(2700);
  });
  it('isolates instances and clears pending debounce and autoplay on unmount', () => {
    vi.useFakeTimers();
    const view = render(
      <>
        <Slideable items={items} autoplay={1000} />
        <Slideable items={items} autoplay={2000} />
      </>,
    );
    fireEvent.scroll(view.container.querySelector('.react-slideable__viewport')!);
    expect(vi.getTimerCount()).toBe(3);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels an unfinished animation on unmount', () => {
    vi.spyOn(globalThis, 'requestAnimationFrame').mockReturnValue(7);
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const api = createRef<SlideableHandle>();
    const view = render(<Slideable ref={api} items={items} />);
    act(() => api.current!.next());
    view.unmount();
    expect(cancel).toHaveBeenCalledWith(7);
  });
  it('ignores imperative navigation while hidden instead of dividing by zero', () => {
    const api = createRef<SlideableHandle>();
    const view = render(<Slideable ref={api} items={items} looped slidesPerView={1} />);
    const element = view.container.querySelector('.react-slideable__viewport')!;
    Object.defineProperty(element, 'clientWidth', { value: 0 });
    act(() => {
      api.current!.goTo(2);
      api.current!.next();
    });
    expect(Number.isFinite(element.scrollLeft)).toBe(true);
    expect(view.getByText('Slide 1 of 3')).toBeTruthy();
  });
  it('clamps after items shrink and remains safe when list empties', () => {
    const api = createRef<SlideableHandle>();
    const view = render(<Slideable ref={api} items={items} slidesPerView={1} initialIndex={2} />);
    view.rerender(<Slideable ref={api} items={items.slice(0, 1)} slidesPerView={1} />);
    expect(view.container.querySelector('.react-slideable__viewport')!.scrollLeft).toBe(0);
    view.rerender(<Slideable ref={api} items={[]} looped />);
    act(() => api.current!.next());
    expect(view.getByText('No slides')).toBeTruthy();
  });
  it('hides and disables duplicate content for assistive technology', () => {
    const view = render(<Slideable items={items} looped slidesPerView={2} />);
    expect(view.container.querySelectorAll('.react-slideable__slide:not([aria-hidden])')).toHaveLength(3);
    expect([...view.container.querySelectorAll('[data-copy]')].every(node => node.hasAttribute('inert'))).toBe(true);
  });
  it('does not consume arrows from nested controls', () => {
    const view = render(<Slideable items={[<input key="a" aria-label="Editor" />, ...items]} slidesPerView={1} />);
    fireEvent.keyDown(view.getByLabelText('Editor'), { key: 'ArrowRight' });
    expect(view.container.querySelector('.react-slideable__viewport')!.scrollLeft).toBe(0);
  });
  it('server renders without DOM globals', () => {
    expect(renderToString(<Slideable items={items} looped />)).toContain('carousel');
  });
  it('preserves original component state and DOM identity across wraps', () => {
    function Counter() {
      const [value, setValue] = useState(0);
      return <button onClick={() => setValue(value + 1)}>Count {value}</button>;
    }
    const api = createRef<SlideableHandle>();
    const view = render(
      <Slideable ref={api} items={[<Counter key="counter" />, ...items]} looped slidesPerView={2} duration={0} />,
    );
    const original = view.container.querySelector('.react-slideable__slide:not([data-copy]) button')!;
    fireEvent.click(original);
    for (let i = 0; i < 8; i++) {
      act(() => api.current!.next());
      fireEvent(view.container.querySelector('.react-slideable__viewport')!, new Event('scrollend'));
    }
    expect(view.container.querySelector('.react-slideable__slide:not([data-copy]) button')).toBe(original);
    expect(original.textContent).toBe('Count 1');
  });
});
