import {Injectable} from '@angular/core'

import * as localForage from 'localforage'

import {Observable} from 'rxjs/Observable'
import 'rxjs/add/observable/fromPromise'
import 'rxjs/add/operator/concatMap'

import {_DEFAULT_STORAGE_CONFIG_} from '../../config'

import ICache from './ICache'

/*
 * Cache implementation using LocalForage
 */
@Injectable()
export default class LFCache implements ICache {
  private readonly storage: LocalForage =
    localForage.createInstance(_DEFAULT_STORAGE_CONFIG_)

  cache<T>(key: string, data: Observable<T>): Observable<T> {
    return data.concatMap(d => {
      return Observable.fromPromise(
        this.storage.setItem(key, d))
    })
  }

  async isCached(key: number|string): Promise<boolean> {
    const keys = await this.storage.keys()
    return keys.includes(key as string)
  }

  getCached<T>(key: number|string): Observable<T> {
    return Observable.fromPromise(this.storage.getItem(key as string))
  }
}
