import {
  Component, AfterViewInit, Renderer2,
  ViewChild, ElementRef, Inject,
  ChangeDetectionStrategy, OnInit,
  OnDestroy, Input, HostBinding,
  Output, ChangeDetectorRef, OnChanges,
  SimpleChanges
} from '@angular/core'

import {DOCUMENT} from '@angular/platform-browser'

import {Observable} from 'rxjs/Observable'
import {ReplaySubject} from 'rxjs/ReplaySubject'
import {Subject} from 'rxjs/Subject'
import {Subscription} from 'rxjs/Subscription'
import 'rxjs/add/observable/merge'
import 'rxjs/add/operator/takeUntil'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/switchMap'
import 'rxjs/add/operator/distinctUntilChanged'
import 'rxjs/add/operator/distinctUntilKeyChanged'
import 'rxjs/add/operator/filter'

import {fromEventPattern} from '../../../../lib/observable'

import {_MIN_WIDTH_} from '../../../../config/timeline/handlebar'

export interface Handlebar {
  readonly left: number
  readonly width: number
  readonly source: 'intern' | 'extern'
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rv-handlebar',
  template: `
    <div class="handlebar">
      <div #leftHandle class="left-handle"><i class="ion-arrow-right-b"></i></div>
      <div #middleHandle class="content">{{caption}}</div>
      <div #rightHandle class="right-handle"><i class="ion-arrow-left-b"></i></div>
    </div>
  `,
  styleUrls: ['handlebar.component.scss']
})
export class HandlebarComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() readonly caption: string
  @Input() readonly containerRect: Observable<ClientRect>
  @Input() @HostBinding('class.selected') readonly isSelected = false

  // Input left and width
  @Input('left') readonly inLeft: number
  @Input('width') readonly inWidth: number

  // Intern left and width (mutable, for fast UI updates)
  @HostBinding('style.left.%') internLeft: number
  @HostBinding('style.width.%') internWidth: number

  @ViewChild('leftHandle') private readonly leftHandle: ElementRef
  @ViewChild('middleHandle') private readonly middleHandle: ElementRef
  @ViewChild('rightHandle') private readonly rightHandle: ElementRef

  private readonly syncValueSubj = new Subject<Handlebar>()
  private readonly handlebarSubj = new ReplaySubject<Handlebar>(1)
  @Output() readonly onHandlebarUpdate = new ReplaySubject<Handlebar>(1)

  private readonly _subs: Subscription[] = []

  private isDragging = false

  constructor(
    private readonly _renderer: Renderer2,
    private readonly _cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private readonly _document: any) {}

  ngOnInit() {
    const _initRect: Handlebar = {
      left: this.inLeft,
      width: this.inWidth,
      source: 'extern'
    }

    // Init sync
    this.internLeft = this.inLeft
    this.internWidth = this.inWidth
    // Used intern
    this.handlebarSubj.next(_initRect)

    // No need to inform the outer world of the first handlebar update
    // since it's provided as @Input values
    this._subs.push(
      this.handlebarSubj
        .filter(hb => hb.source !== 'extern')
        .subscribe(this.onHandlebarUpdate))
  }

  ngAfterViewInit() {
    const mousemove = fromEventPattern(this._renderer, this._document, 'mousemove')
    const mouseup = fromEventPattern(this._renderer, this._document, 'mouseup')
    const leftMouseDown = fromEventPattern(this._renderer, this.leftHandle.nativeElement, 'mousedown')
    const rightMouseDown = fromEventPattern(this._renderer, this.rightHandle.nativeElement, 'mousedown')
    const middleMouseDown = fromEventPattern(this._renderer, this.middleHandle.nativeElement, 'mousedown')

    const clientPosWhileMouseMove = (args: any) => {
      return mousemove.map((mmEvent: MouseEvent) => {
        const {clientX, clientY} = mmEvent
        return {clientX, clientY, payload: args}
      }).takeUntil(mouseup)
    }

    const leftClientPos = leftMouseDown.switchMap(clientPosWhileMouseMove)
    const rightClientPos = rightMouseDown.switchMap(clientPosWhileMouseMove)
    const middleClientPos = middleMouseDown
      .withLatestFrom(this.handlebarSubj, this.containerRect, (mdEvent: MouseEvent, prevHb: Handlebar, hRect: ClientRect) => {
        const m = transformedToPercentage(mdEvent.clientX, hRect)
        const hbRight = prevHb.left+prevHb.width
        return {
          distLeft: m-prevHb.left,
          distRight: hbRight-m,
          hRect
        }
      })
      .switchMap(clientPosWhileMouseMove)

    const coordTransform = (clientX: number, hRect: ClientRect) => (clientX-hRect.left)
    const mapToPercentage = (localX: number, hRect: ClientRect) => (localX/hRect.width*100)
    const transformedToPercentage = (clientX: number, hRect: ClientRect) => {
      return mapToPercentage(coordTransform(clientX, hRect), hRect)
    }

    const minMax = (x: number) => Math.min(Math.max(0, x), 100)

    const left = leftClientPos
      .map(({clientX}) => clientX)
      .withLatestFrom(this.containerRect, (clientX, hRect) => minMax(transformedToPercentage(clientX, hRect)))
      .distinctUntilChanged()
      .withLatestFrom(this.handlebarSubj, (l, prevHb) => {
        const oldRight = prevHb.left+prevHb.width
        // ensure handlebar min width
        const newLeft = Math.min(l, oldRight-_MIN_WIDTH_)
        const deltaLeft = newLeft-prevHb.left
        const newWidth = prevHb.width-deltaLeft
        return {left: newLeft, width: newWidth}
      })

    const right = rightClientPos
      .map(({clientX}) => clientX)
      .withLatestFrom(this.containerRect, (clientX, hRect) => minMax(transformedToPercentage(clientX, hRect)))
      .distinctUntilChanged()
      .withLatestFrom(this.handlebarSubj, (r, prevHb) => {
        const newRight = Math.max(prevHb.left+_MIN_WIDTH_, r)
        return {left: prevHb.left, width: newRight-prevHb.left}
      })

    const middle = middleClientPos
      .map(({clientX, payload: {distLeft, distRight, hRect}}) => {
        return {
          distLeft, distRight,
          m: minMax(transformedToPercentage(clientX, hRect))
        }
      })
      .distinctUntilKeyChanged('m')
      .withLatestFrom(this.handlebarSubj, ({distLeft, m}, prevHb) => {
        const newLeft = Math.min(Math.max(0, m-distLeft), 100-prevHb.width)
        return {left: newLeft, width: prevHb.width}
      })

    this._subs.push(
      Observable.merge(leftMouseDown, rightMouseDown, middleMouseDown)
        .subscribe(() => {
          this.isDragging = true
        }))

    this._subs.push(mouseup.subscribe(() => {
      this.isDragging = false
    }))

    this._subs.push(
      Observable.merge(left, middle, right)
        .subscribe(({left, width}) => {
          this.internLeft = left
          this.internWidth = width
          this.handlebarSubj.next({source: 'intern', left, width})
          this._cdr.markForCheck()
        }))

    this._subs.push(
      this.syncValueSubj
        .subscribe(({left, width}) => {
          this.internLeft = left
          this.internWidth = width
          this.handlebarSubj.next({source: 'extern', left, width})
          this._cdr.markForCheck()
        }))
  }

  ngOnChanges(changes: SimpleChanges) {
    if(!this.isDragging) {
      const hasLeftChanges = changes.inLeft
      const hasWidthChanges = changes.inWidth

      if(hasLeftChanges && hasWidthChanges) {
        const newLeft = changes.inLeft.currentValue
        const newWidth = changes.inWidth.currentValue
        this.syncValueSubj.next({source: 'extern', left: newLeft, width: newWidth})
      } else if(hasLeftChanges) {
        const newLeft = changes.inLeft.currentValue
        this.syncValueSubj.next({source: 'extern', left: newLeft, width: this.internWidth})
      } else if(hasWidthChanges) {
        const newWidth = changes.inWidth.currentValue
        this.syncValueSubj.next({source: 'extern', left: this.internLeft, width: newWidth})
      }
    }
  }

  ngOnDestroy() {
    this._subs.forEach(sub => sub.unsubscribe())
  }
}