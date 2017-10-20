import {ElementRef} from '@angular/core'

import {PlayerOptions} from 'video.js'

import {Action} from '@ngrx/store'

interface PlayerCreatePayload {
  elemRef: ElementRef
  objectURL: string,
  playerOptions: PlayerOptions
}

export const PLAYER_CREATE = '[Player] Create'

export class PlayerCreate implements Action {
  readonly type = PLAYER_CREATE
  constructor(readonly payload: PlayerCreatePayload) {}
}

export const PLAYER_CREATE_SUCCESS = '[Player] Created'

export class PlayerCreateSuccess implements Action {
  readonly type = PLAYER_CREATE_SUCCESS
  // constructor(readonly playload: any) {}
}

export const PLAYER_CREATE_ERROR = '[Player] Create Error'

export class PlayerCreateError implements Action {
  readonly type = PLAYER_CREATE_ERROR
  constructor(readonly payload: any) {}
}

export const PLAYER_DESTROY = '[Player] Destroy'

export class PlayerDestroy implements Action {
  readonly type = PLAYER_DESTROY
}

export const PLAYER_DESTROY_SUCCESS = '[Player] Destroyed'

export class PlayerDestroySuccess implements Action {
  readonly type = PLAYER_DESTROY_SUCCESS
}

export const PLAYER_DESTROY_ERROR = '[Player] Destroy Error'

export class PlayerDestroyError implements Action {
  readonly type = PLAYER_DESTROY_ERROR
  constructor(readonly playload: any) {}
}

// Player state
export const PLAYER_SET_CURRENT_TIME = '[Player] Set Current Time'

export class PlayerSetCurrentTime implements Action {
  readonly type = PLAYER_SET_CURRENT_TIME
  constructor(readonly payload: {currentTime:number}) {}
}

// Player dimensions

interface PlayerDimensionsPayload {
  width: number
  height:number
}

export const PLAYER_SET_DIMENSIONS = '[Player] Set Dimensions'

export class PlayerSetDimensions implements Action {
  readonly type = PLAYER_SET_DIMENSIONS
  constructor(readonly payload: PlayerDimensionsPayload) {}
}

export type PlayerActions =
  PlayerCreate|PlayerCreateError|PlayerCreateSuccess|
  PlayerDestroy|PlayerDestroyError|PlayerDestroySuccess|
  PlayerSetCurrentTime|
  PlayerSetDimensions
