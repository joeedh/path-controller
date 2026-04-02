export declare type HotKeyAction = string | ((ctx: any) => any)

export declare class HotKey<CTX = any> {
  constructor(key: string, modifiers: string[], action: HotKeyAction, uiname?: string)

  exec(ctx: any)

  buildString(): string

  action: string | ((ctx: CTX) => void)
}

export declare class KeyMap extends Array<HotKey> {
  constructor(hotkeys?: HotKey[], pathid?: string)

  pathid: any

  handle(ctx: any, e: KeyboardEvent): boolean

  add(hk: HotKey): void

  push(hk: HotKey): void
}

export declare type ModalLightState = {}

type EventHandler<E> = ((e: E) => undefined | boolean) | ((e: E) => void)
export declare type ModalEventHandler =
  //| EventHandler<Event> //
  EventHandler<MouseEvent> | EventHandler<PointerEvent> | EventHandler<KeyboardEvent>

export declare function pushModalLight(
  target: {
    [k: string]: ModalEventHandler
  },
  elem?: HTMLElement,
  pointerID?: any
): ModalLightState

export declare function popModalLight(state: ModalLightState)

export declare function haveModal(e: any): boolean
