import { useRef } from 'react';
import { ScrollableElement } from '../elements';
import { useListener } from './useListener';

export type ItemsPerScrollWidthConfig = { [pixels: number]: number } & { max: number };

interface Props {
  list: ScrollableElement | null;
  margin: number;
  fitCount: number;
  swipeable: boolean;
}

export const useSwipe = ({ list, margin, fitCount, swipeable }: Props) => {
  const screenX = useRef<number>();
  useListener(
    ['mousedown', 'touchstart'],
    list &&
      swipeable &&
      ((event: MouseEvent | TouchEvent) =>
        (screenX.current = event instanceof MouseEvent ? event.screenX : event.touches[0]?.clientX)),
    [swipeable, fitCount, list, margin],
    list?.element,
  );
  useListener(
    ['mouseup', 'touchend'],
    list &&
      swipeable &&
      ((event: MouseEvent | TouchEvent) => {
        const lastScreenX = event instanceof MouseEvent ? event.screenX : event.changedTouches[0]?.clientX;
        if (screenX.current === null || screenX.current === undefined || lastScreenX === undefined) return;

        const difference = screenX.current - lastScreenX;
        difference > 0 && list.scrollForward(margin, fitCount);
        difference < 0 && list.scrollBack(margin);
        screenX.current = undefined;
      }),
    [swipeable, fitCount, list, margin],
    list?.element,
  );
};
