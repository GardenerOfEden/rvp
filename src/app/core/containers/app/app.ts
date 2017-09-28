import {Component, ChangeDetectionStrategy, OnInit} from '@angular/core'

import {Store} from '@ngrx/store'

import * as fromRoot from '../../../reducers'
import * as project from '../../actions/project'

@Component({
  selector: 'rv-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container">
      <rv-loading *ngIf="(isLoading | async)" [isLoading]="true"></rv-loading>
      <div *ngIf="!(isLoading | async)" class="row video-and-inspector">
        <div *ngIf="videoSrc | async" class="column video-component">
          <app-video [videoSrc]="videoSrc | async"></app-video>
        </div>
      </div>
    </div>`
})
export class AppComponent implements OnInit {
  isLoading = this._store.select(fromRoot.getIsLoading)
  // video = this._store.select(fromRoot.getVideo)
  videoSrc = this._store.select(fromRoot.getVideSrc)

  constructor(private readonly _store: Store<fromRoot.State>) {}

  ngOnInit() {
    /*
     * Let's say id='p0' identifies the default project.
     * In future, if a server implementation is available,
     * the default project id could be provided by the server.
     */
    this._store.dispatch(new project.ProjectFetch({id: 'p0'}))
  }
}
