import {NgModule} from '@angular/core'
import {CommonModule} from '@angular/common'

import {MainContainer} from './containers/main'
import {PlayerContainer} from './containers/player'
import {InspectorContainer} from './containers/inspector'

import {LoadingComponent} from './components/loading.component'
import {NotFoundComponent} from './components/not-found.component'
import {LogoComponent} from './components/logo.component'
import {ProjectBtnComponent} from './components/project-btn.component'
import {MainNavComponent} from './components/mainNav.component'

const _DECLS_ = [
  // Containers
  MainContainer, PlayerContainer, InspectorContainer,
  // Components
  LoadingComponent, NotFoundComponent, LogoComponent,
  MainNavComponent, ProjectBtnComponent
]

@NgModule({
  imports: [CommonModule],
  declarations: _DECLS_,
  exports: _DECLS_,
})
export class CoreModule {}
