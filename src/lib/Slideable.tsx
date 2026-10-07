import {
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  version,
} from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { finiteNumber, loopPosition, modulo, positiveInteger, visibleCount } from './geometry';
import type { SlideableHandle, SlideableProps } from './types';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const inertAttribute = (parseInt(version, 10) >= 19 ? true : '') as true;

export const Slideable = forwardRef<SlideableHandle, SlideableProps>(function Slideable(
  {
    items,
    looped = false,
    draggable = true,
    gap: gapProp,
    height,
    width,
    controls = true,
    placeholder,
    previousIcon,
    nextIcon,
    slidesPerView = 1,
    duration = 360,
    onMove,
    onChange,
    initialIndex = 0,
    slidesToScroll = 1,
    autoplay = false,
    pagination = false,
    empty,
    keyboard = true,
    ariaLabel = 'Carousel',
    className = '',
    style,
  },
  ref,
) {
  const viewport = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(() => visibleCount(0, slidesPerView));
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const paused = hovered || focused || dragging;
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const current = useRef(Math.max(0, Math.floor(finiteNumber(initialIndex))));
  const target = useRef<number | null>(null);
  const rebased = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const callbacks = useRef({ onMove, onChange });
  callbacks.current = { onMove, onChange };
  const length = items.length;
  const loop = looped && length > 1;
  const band = loop ? Math.ceil((count + 1) / length) * length : 0;
  const maximum = Math.max(0, length - count);
  const gap = typeof gapProp === 'number' ? `${Math.max(0, finiteNumber(gapProp))}px` : gapProp;
  const frame = useRef<number | null>(null);
  const stride = () => {
    const element = viewport.current;
    if (!element?.clientWidth) return 0;
    const slides = element.firstElementChild!.children;
    const first = slides[0] as HTMLElement | undefined;
    const second = slides[1] as HTMLElement | undefined;
    if (first && second) {
      const distance = Math.abs(second.getBoundingClientRect().left - first.getBoundingClientRect().left);
      const positions = Math.abs(Number(second.style.order) - Number(first.style.order));
      if (distance && positions) return distance / positions;
    }
    return element.clientWidth / count;
  };
  const clamp = (value: number) => (loop ? modulo(value, length) : Math.max(0, Math.min(maximum, value)));

  useBrowserLayoutEffect(() => {
    const element = viewport.current!;
    const update = () => {
      setCount(visibleCount(element.clientWidth, slidesPerView));
      if (length && element.clientHeight) setContentHeight(element.clientHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [slidesPerView, length]);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    update();
    visibility();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useBrowserLayoutEffect(() => {
    const element = viewport.current!;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const step = stride;
    const reset = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      drag.current = null;
      setDragging(false);
      element.style.scrollSnapType = '';
      delete element.dataset.dragging;
      const next = loop ? modulo(current.current, length) : Math.max(0, Math.min(maximum, current.current));
      if (next !== current.current) callbacks.current.onChange?.(next);
      current.current = next;
      target.current = null;
      rebased.current = 0;
      element.scrollTo({ left: (band + next) * step(), behavior: 'instant' });
      setIndex(next);
    };
    reset();
    const settle = () => {
      clearTimeout(timer);
      if (disposed || drag.current || frame.current !== null || !step()) return;
      const raw = Math.round(element.scrollLeft / step());
      const next = loop ? modulo(raw - band, length) : Math.max(0, Math.min(maximum, raw));
      const previous = current.current;
      const difference = raw - band - previous + rebased.current;
      rebased.current = 0;
      current.current = next;
      target.current = null;
      if (loop && (raw < band || raw >= band + length)) {
        element.scrollTo({ left: (band + next) * step(), behavior: 'instant' });
      }
      setIndex(next);
      if (next !== previous) {
        callbacks.current.onChange?.(next);
        callbacks.current.onMove?.(difference >= 0 ? 'next' : 'previous');
      }
    };
    const scroll = () => {
      clearTimeout(timer);
      const size = step();
      if (
        loop &&
        target.current === null &&
        !drag.current &&
        size &&
        (element.scrollLeft < (band - count / 2) * size || element.scrollLeft > (2 * band - count / 2) * size)
      ) {
        const before = element.scrollLeft;
        const next = loopPosition(before, band, length, size);
        if (Math.abs(before - next) > 1) {
          rebased.current += Math.round((before - next) / size);
          element.scrollTo({ left: next, behavior: 'instant' });
        }
      }
      timer = setTimeout(settle, 180);
    };
    const resize = new ResizeObserver(reset);
    resize.observe(element);
    const firstSlide = element.firstElementChild?.firstElementChild;
    if (firstSlide) resize.observe(firstSlide);
    window.addEventListener('resize', reset);
    element.addEventListener('scroll', scroll, { passive: true });
    element.addEventListener('scrollend', settle);
    return () => {
      disposed = true;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      drag.current = null;
      element.style.scrollSnapType = '';
      delete element.dataset.dragging;
      setDragging(false);
      clearTimeout(timer);
      resize.disconnect();
      window.removeEventListener('resize', reset);
      element.removeEventListener('scroll', scroll);
      element.removeEventListener('scrollend', settle);
    };
  }, [band, count, gap, length, loop, maximum, className]);

  function animateTo(left: number) {
    const element = viewport.current!;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    element.style.scrollSnapType = 'none';
    const from = element.scrollLeft;
    const milliseconds = reduced ? 0 : Math.max(0, finiteNumber(duration));
    const finish = () => {
      frame.current = null;
      element.scrollLeft = left;
      element.style.scrollSnapType = '';
      element.dispatchEvent(new Event('scrollend'));
    };
    if (!milliseconds || Math.abs(left - from) < 0.5) {
      finish();
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / milliseconds);
      element.scrollLeft = from + (left - from) * (1 - (1 - progress) ** 3);
      if (progress < 1) frame.current = requestAnimationFrame(tick);
      else finish();
    };
    frame.current = requestAnimationFrame(tick);
  }

  function goTo(value: number) {
    const element = viewport.current;
    if (!element || !length || !stride() || !Number.isFinite(value)) return;
    const next = clamp(Math.floor(value));
    let physical = band + next;
    if (loop) {
      const position = element.scrollLeft / stride();
      physical = [physical - length, physical, physical + length].reduce((best, candidate) =>
        Math.abs(candidate - position) < Math.abs(best - position) ? candidate : best,
      );
    }
    target.current = physical;
    animateTo(physical * stride());
  }

  function move(direction: number) {
    const element = viewport.current;
    if (!element || !length || !stride()) return;
    const position = target.current ?? Math.round(element.scrollLeft / stride());
    const next = loop
      ? position + direction * Math.min(length, positiveInteger(slidesToScroll))
      : Math.max(0, Math.min(maximum, position + direction * positiveInteger(slidesToScroll)));
    let physical = next;
    if (loop && (next < 0 || next > 3 * band - count)) {
      const canonical = band + modulo(position - band, length);
      element.scrollTo({ left: canonical * stride(), behavior: 'instant' });
      physical = canonical + direction * Math.min(length, positiveInteger(slidesToScroll));
    }
    target.current = physical;
    animateTo(physical * stride());
  }

  useImperativeHandle(ref, () => ({ next: () => move(1), previous: () => move(-1), goTo }));

  useEffect(() => {
    if (!autoplay || !Number.isFinite(autoplay) || autoplay < 100 || paused || hidden || reduced || length < 2) return;
    const timer = setInterval(() => move(1), autoplay);
    return () => clearInterval(timer);
  }, [autoplay, paused, hidden, reduced, length, count, band, gap, maximum, slidesToScroll, duration]);

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    if (
      !draggable ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest('button,input,textarea,select,[contenteditable="true"]')
    )
      return;
    target.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    event.currentTarget.style.scrollSnapType = 'none';
    event.currentTarget.scrollTo({ left: event.currentTarget.scrollLeft, behavior: 'instant' });
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: event.currentTarget.scrollLeft,
      moved: false,
    };
    setDragging(true);
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId || !stride()) return;
    const delta = event.clientX - gesture.x;
    if (!gesture.moved && Math.abs(event.clientY - gesture.y) > Math.abs(delta)) {
      drag.current = null;
      setDragging(false);
      event.currentTarget.style.scrollSnapType = '';
      return;
    }
    if (!gesture.moved && Math.abs(delta) < 5) return;
    if (!gesture.moved) {
      gesture.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.style.scrollSnapType = 'none';
      event.currentTarget.dataset.dragging = 'true';
    }
    event.preventDefault();
    const desired = gesture.left - delta;
    const next = loop ? loopPosition(desired, band, length, stride()) : desired;
    if (loop) {
      rebased.current += Math.round((desired - next) / stride());
      gesture.left += next - desired;
    }
    event.currentTarget.scrollLeft = next;
  }

  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    const gesture = drag.current;
    if (!gesture || gesture.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    suppressClick.current = gesture.moved;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (gesture.moved && stride()) {
      const next = Math.round(event.currentTarget.scrollLeft / stride());
      target.current = next;
      animateTo(next * stride());
    } else event.currentTarget.style.scrollSnapType = '';
  }

  const total = loop ? band * 3 : Math.max(length, placeholder != null ? count : 0);
  const primaryPosition = (logical: number) => band + index + modulo(logical - index, length);
  function renderSlide(physical: number, logical: number, copy: boolean, key: string) {
    return (
      <div
        className="react-slideable__slide"
        key={key}
        style={{ order: physical }}
        role={logical < length ? 'group' : undefined}
        aria-roledescription={logical < length ? 'slide' : undefined}
        aria-label={logical < length ? `${logical + 1} of ${length}` : undefined}
        aria-hidden={copy || logical >= length ? true : undefined}
        inert={copy || logical >= length ? inertAttribute : undefined}
        data-copy={copy ? '' : undefined}
      >
        {logical < length ? items[logical] : placeholder}
      </div>
    );
  }
  const variables = {
    '--react-slideable-count': count,
    '--react-slideable-gap': gap,
    width,
    ...style,
  } as CSSProperties;
  return (
    <section
      className={`react-slideable ${className}`}
      style={variables}
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div
        className="react-slideable__row"
        style={{ height: height ?? (!length && contentHeight ? contentHeight : undefined) }}
      >
        {controls && (
          <button
            type="button"
            className="react-slideable__button react-slideable__button--previous"
            aria-label="Previous slide"
            disabled={!length || (!loop && index === 0)}
            onClick={() => move(-1)}
          >
            {previousIcon ?? '←'}
          </button>
        )}
        <div
          className="react-slideable__viewport"
          style={height == null && length ? undefined : { height: '100%' }}
          ref={viewport}
          tabIndex={length ? 0 : -1}
          data-draggable={draggable}
          onPointerDown={pointerDown}
          onWheel={() => {
            if (frame.current !== null) cancelAnimationFrame(frame.current);
            frame.current = null;
            target.current = null;
            if (viewport.current) viewport.current.style.scrollSnapType = '';
          }}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
          onLostPointerCapture={event => {
            if (event.target === event.currentTarget) pointerEnd(event);
          }}
          onPointerLeave={event => {
            if (event.pointerType === 'mouse' && drag.current && !drag.current.moved) pointerEnd(event);
          }}
          onDragStart={event => {
            if (draggable) event.preventDefault();
          }}
          onClickCapture={event => {
            if (suppressClick.current && event.detail > 0) {
              event.preventDefault();
              event.stopPropagation();
              suppressClick.current = false;
            }
          }}
          onKeyDown={event => {
            if (!keyboard || event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey)
              return;
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
              event.preventDefault();
              move(event.key === 'ArrowRight' ? 1 : -1);
            }
            if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              goTo(event.key === 'Home' ? 0 : loop ? length - 1 : maximum);
            }
          }}
        >
          <div className="react-slideable__track">
            {loop &&
              items.map((item, logical) =>
                renderSlide(
                  primaryPosition(logical),
                  logical,
                  false,
                  `original-${isValidElement(item) ? (item.key ?? logical) : logical}`,
                ),
              )}
            {Array.from({ length: total }, (_, physical) => {
              const logical = loop ? modulo(physical, length) : physical;
              if (loop && physical === primaryPosition(logical)) return null;
              return renderSlide(physical, logical, loop, `slot-${physical}`);
            })}
          </div>
          {!length && <div className="react-slideable__empty">{empty}</div>}
        </div>
        {controls && (
          <button
            type="button"
            className="react-slideable__button react-slideable__button--next"
            aria-label="Next slide"
            disabled={!length || (!loop && index >= maximum)}
            onClick={() => move(1)}
          >
            {nextIcon ?? '→'}
          </button>
        )}
      </div>
      {pagination && length > 1 && (
        <div className="react-slideable__dots" aria-label="Choose slide">
          {Array.from({ length: loop ? length : maximum + 1 }, (_, position) => (
            <button
              type="button"
              key={position}
              className="react-slideable__dot"
              aria-label={`Go to slide ${position + 1}`}
              aria-current={position === index ? 'true' : undefined}
              onClick={() => goTo(position)}
            />
          ))}
        </div>
      )}
      <span className="react-slideable__status" aria-live={autoplay && !paused ? 'off' : 'polite'} aria-atomic="true">
        {length ? `Slide ${index + 1} of ${length}` : 'No slides'}
      </span>
    </section>
  );
});
