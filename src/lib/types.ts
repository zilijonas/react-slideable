import type { CSSProperties, ReactNode } from 'react';
export type SlidesPerView = ({ [pixels: number]: number } & { max: number }) | number;
export type SlideDirection = 'next' | 'previous';
export interface SlideableHandle {
  next(): void;
  previous(): void;
  goTo(index: number): void;
}
export interface SlideableProps {
  items: ReactNode[];
  looped?: boolean;
  draggable?: boolean;
  gap?: CSSProperties['gap'];
  height?: CSSProperties['height'];
  width?: CSSProperties['width'];
  controls?: boolean;
  placeholder?: ReactNode;
  previousIcon?: ReactNode;
  nextIcon?: ReactNode;
  slidesPerView?: SlidesPerView;
  duration?: number;
  onMove?: (direction: SlideDirection) => void;
  onChange?: (index: number) => void;
  initialIndex?: number;
  slidesToScroll?: number;
  autoplay?: number | false;
  pagination?: boolean;
  empty?: ReactNode;
  keyboard?: boolean;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}
