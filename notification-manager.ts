import {
  merge,
  Observable,
  BehaviorSubject,
  Subject,
  of,
  interval,
  EMPTY
} from "rxjs";
import {
  bufferCount,
  bufferTime,
  bufferToggle,
  distinctUntilChanged,
  filter,
  map,
  share,
  switchMap,
  windowToggle,
  flatMap,
  withLatestFrom,
  scan,
  takeUntil,
  startWith,
  mapTo,
  mergeAll,
  tap
} from "rxjs/operators";
import { NotificationStreamStates } from "./notificaton-stream-states";

export class NotificationManager<T> {
  private readonly stop$ = new Subject();
  private readonly pausedNotifications$: Observable<T[]>;
  private readonly pausedNotificationsCount$: Observable<number>;
  private readonly source$: Observable<T[]>;
  private readonly streamState$ = new BehaviorSubject<NotificationStreamStates>(
    NotificationStreamStates.auto
  );

  constructor(
    source: Observable<T>,
    private chunkTime: number = null,
    examinationTime = 2000,
    examinationSlices = 4,
    weightLimit = 2
  ) {
    const innerSource = source.pipe(
      takeUntil(this.stop$),
      share()
    );

    const pauseStatus$ = innerSource.pipe(
      bufferTime(examinationTime / examinationSlices),
      bufferCount(examinationSlices),
      map((parts: any[][]) => parts.filter(part => part.length).length),
      map(weight => weight > weightLimit),
      withLatestFrom(this.streamState$),
      map(([prediction, streamState]: [boolean, NotificationStreamStates]) => {
        if (streamState === NotificationStreamStates.auto) {
          return prediction;
        } else {
          return (
            streamState === NotificationStreamStates.pause ||
            streamState === NotificationStreamStates.forcePause
          );
        }
      }),
      startWith(false),
      distinctUntilChanged(),
      share()
    );

    const chunkStatus$ = pauseStatus$.pipe(
      switchMap((isPaused: boolean) => {
        const streamState = this.streamState$.getValue();

        if (isPaused) {
          return chunkTime && streamState === NotificationStreamStates.pause
            ? interval(chunkTime).pipe(
                mapTo([false, true]),
                mergeAll(),
                startWith(isPaused)
              )
            : of(isPaused);
        } else {
          return of(isPaused);
        }
      }),
      share()
    );

    const pauseOn$ = pauseStatus$.pipe(filter(x => !!x));
    const pauseOff$ = pauseStatus$.pipe(filter(x => !x));

    const openChank$ = chunkStatus$.pipe(filter(x => !!x));
    const closeChank$ = chunkStatus$.pipe(filter(x => !x));

    this.pausedNotifications$ = chunkStatus$.pipe(
      takeUntil(this.stop$),
      switchMap((isOpen: boolean) => {
        if (isOpen) {
          return innerSource.pipe(
            scan((acc: T[], val: T) => [...acc, val], [])
          );
        } else {
          return of([]);
        }
      }),
      share()
    );

    this.pausedNotificationsCount$ = this.pausedNotifications$.pipe(
      map((x: any[]) => x.length)
    );

    this.source$ = merge(
      innerSource.pipe(
        windowToggle(pauseOff$, () => pauseOn$),
        flatMap(x => x),
        map(x => [x])
      ),
      innerSource.pipe(bufferToggle(openChank$, () => closeChank$))
    );
  }

  public setChunkTime(chunkTime: number | null) {
    this.chunkTime = chunkTime;
  }

  public pause() {
    this.streamState$.next(NotificationStreamStates.pause);
  }

  public forcePause() {
    this.streamState$.next(NotificationStreamStates.forcePause);
  }

  public auto() {
    this.streamState$.next(NotificationStreamStates.auto);
  }

  public receive() {
    this.streamState$.next(NotificationStreamStates.receive);
  }

  public stop() {
    this.stop$.next();
  }

  public getSource$() {
    return this.source$;
  }

  public getPausedNotifications$() {
    return this.pausedNotifications$;
  }

  public getPausedNotificationsCount$() {
    return this.pausedNotificationsCount$;
  }

  public getStreamState$() {
    return this.streamState$.pipe(takeUntil(this.stop$));
  }
}
