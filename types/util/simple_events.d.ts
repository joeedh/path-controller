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

/** 
 * Detects if a given pointer event is in a 'button down' state.
 * Button should range from 0 to 2.
 * The hueristic is:
 *  - Touch events are down if pointerid is 0 and e.buttons includes (1 << button)
 *  - Pen events are down if e.buttons includes (1 << button)
 *  - Mouse events are down if e.buttons equals (1 << button) 
 */
export declare function eventWasMouseDown(event: PointerEvent, button?: number): boolean

export declare function pushModalLight(
  target: {
    [k: string]: ModalEventHandler
  },
  elem?: HTMLElement,
  pointerID?: any
): ModalLightState

export declare function popModalLight(state: ModalLightState)

export declare function haveModal(e: any): boolean
