import {Action} from '@ngrx/store'

export const PROJECT_FETCH = '[Project] Fetch'
export const PROJECT_FETCH_SUCCESS = '[Project] Fetch Success'
export const PROJECT_FETCH_ERROR = '[Project] Fetch Error'

export const PROJECT_UPDATE = '[Project] Update'
export const PROJECT_UPDATE_SUCCESS = '[Project] Update Success'
export const PROJECT_UPDATE_ERROR = '[Project] Update Error'

export class ProjectFetch implements Action {
  readonly type = PROJECT_FETCH
  constructor(readonly payload: {id: string}) {}
}

export class ProjectFetchSuccess implements Action {
  readonly type = PROJECT_FETCH_SUCCESS
  // TODO: adapt payload type
  constructor(readonly payload: any) {}
}

export class ProjectFetchError implements Action {
  readonly type = PROJECT_FETCH_ERROR
  constructor(readonly payload: any) {}
}

export class ProjectUpdate implements Action {
  readonly type = PROJECT_UPDATE
  constructor(readonly payload: {id: string}) {}
}

export class ProjectUpdateSuccess implements Action {
  readonly type = PROJECT_UPDATE_SUCCESS
  constructor(readonly payload: {id: string}) {}
}

export class ProjectUpdateError implements Action {
  readonly type = PROJECT_UPDATE_SUCCESS
  constructor(readonly payload: any) {}
}

export type Actions =
  ProjectFetch|ProjectFetchSuccess|ProjectFetchError|
  ProjectUpdate|ProjectUpdateSuccess|ProjectUpdateError
