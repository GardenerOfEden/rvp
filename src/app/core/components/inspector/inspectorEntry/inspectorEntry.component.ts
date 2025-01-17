import {
  Component, Input, Output,
  OnInit, OnChanges, AfterViewInit,
  EventEmitter, ViewChild, ElementRef,
  ChangeDetectionStrategy, OnDestroy,
  SimpleChanges, HostBinding, HostListener,
  ViewEncapsulation, ChangeDetectorRef
  // ChangeDetectorRef
} from '@angular/core'

import {
  FormGroup, FormBuilder, AbstractControl,
  Validators, ValidatorFn, ValidationErrors
} from '@angular/forms'

const _VALID_ = 'VALID' // not exported by @angular/forms

import { Record } from 'immutable'

import {
  Subscription, combineLatest,
  merge, fromEvent
} from 'rxjs'

import {
  withLatestFrom, map, filter,
  distinctUntilChanged, buffer,
  debounceTime,
  tap//, delay
} from 'rxjs/operators'

import { formatDuration } from '../../../../lib/time'

import {
  AnnotationColorMap, AnnotationRecordFactory,
  AnnotationFieldsRecordFactory, SelectionSource,
  AnnotationSelectionRecordFactory,
  PointerElement
} from '../../../../persistence/model'

import { _MOUSE_DBLCLICK_DEBOUNCE_ } from '../../../../config/form'

import * as project from '../../../../persistence/actions/project'
// import { PointerElementComponent } from '../../pointer-element/pointer-element.component'
import { parseDuration } from '../../../../lib/time'
import { DomService } from '../../../actions/dom.service'
import { HashtagService } from '../../../actions/hashtag.service'
import { Globals } from '../../../../common/globals'

function durationValidatorFactory(): ValidatorFn {
  const durationRegex = /^([0-9]*:){0,2}[0-9]*(\.[0-9]*)?$/

  return (control: AbstractControl): ValidationErrors | null => {
    const valid = durationRegex.test(control.value)
    return !valid ? { 'duration': { value: control.value } } : null
  }
}

const durationValidator = Validators.compose([Validators.required, durationValidatorFactory()])

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'rv-inspector-entry',
  templateUrl: 'inspectorEntry.component.html',
  host: { 'class': 'inspector-entry-host' },
  styleUrls: ['inspectorEntry.component.scss']
})
export class InspectorEntryComponent extends HashtagService implements OnChanges, OnInit, AfterViewInit, OnDestroy {

  form: FormGroup | null = null
  mouse_overed: boolean = false
  annotation_pointer_color: string = '#bbb'
  viewmode_active: boolean = false
  public annotation_id: number
  private readonly _subs: Subscription[] = []
  private readonly _video_elem_container = document.querySelector('.video-main-elem') as HTMLElement

  @Input() readonly entry: Record<AnnotationColorMap>
  @Input() readonly playerCurrentTime: number
  @Input() readonly annotationStartTime: number
  @Input() readonly annotationEndTime: number
  @Input() @HostBinding('class.selected') readonly isSelected: boolean = false
  @Input() @HostBinding('class.playercurrenttime') _isPlayerCurrentTime: boolean = false

  @Output() readonly onUpdate = new EventEmitter<project.UpdateAnnotationPayload>()
  @Output() readonly onSelectAnnotation = new EventEmitter<project.SelectAnnotationPayload>()
  @Output() readonly onFocusAnnotation = new EventEmitter<project.PlayerRequestCurrentTimePayload>()
  @Output() readonly onAddAnnotationPointer = new EventEmitter<project.UpdateAnnotationPointerPayload>()
  @Output() readonly onHashtagsUpdate = new EventEmitter<project.UpdateProjectHashtagsPayload>()

  @ViewChild('formWrapper', { static: true }) private readonly _formRef: ElementRef
  @ViewChild('start', { static: true }) private readonly _startInputRef: ElementRef
  @ViewChild('duration', { static: true }) private readonly _durationInputRef: ElementRef
  @ViewChild('descr', { static: true }) readonly _descrInputRef: ElementRef

  @HostListener('click', ['$event', '$event.target'])
  onClick(event: MouseEvent, target: HTMLElement) {
    this.removeHashTag(target)
  }

  constructor(
    readonly elem: ElementRef,
    private readonly _fb: FormBuilder,
    readonly _domService: DomService,
    private _global: Globals,
    private readonly _cdr: ChangeDetectorRef,
  ) {
    super(_domService)
  }

  private _mapModel(entry: Record<AnnotationColorMap>) {
    const utc_timestamp = entry.getIn(['annotation', 'utc_timestamp'])
    const duration = entry.getIn(['annotation', 'duration'])
    const description = entry.getIn(['annotation', 'fields', 'description'])

    return {
      utc_timestamp: formatDuration(utc_timestamp),
      duration: formatDuration(duration),
      description
    }
  }

  ngOnInit() {

    const {
      utc_timestamp,
      duration,
      description
    } = this._mapModel(this.entry)

    this.form = this._fb.group({
      utc_timestamp: [utc_timestamp, durationValidator],
      duration: [duration, durationValidator],
      description
    })

    this.annotation_id = this.entry.getIn(['annotation', 'id']) as number
    this.annotation_pointer_color = ((this.entry.getIn(['annotation', 'pointerElement']) !== null) ? (this.entry.get('color', null) as string) : '#bbb')

  }

  ngAfterViewInit() {

    this._global.getValue().subscribe((value) => {
      this.viewmode_active = value
      this._cdr.detectChanges()
    })

    setTimeout(() => {
      // add span nodes around hashtags inside textnodes
      this.encloseHashtags()
    })
    // find links and change them to hrefs/HTMLAnchorElement
    this.encloseHrefs()

    // make sure all hashtags are filtered/saved
    this.saveHashtags(this.entry.getIn(['annotation', 'fields', 'description']))

    const formClick = fromEvent(this._formRef.nativeElement, 'click')
      .pipe(filter((ev: MouseEvent) => ev.button === 0))

    const formDblClick = formClick
      .pipe(
        buffer(formClick.pipe(debounceTime(_MOUSE_DBLCLICK_DEBOUNCE_))),
        map(clicksInBuffer => clicksInBuffer.length),
        filter(clicksInBuffer => clicksInBuffer === 2))

    const formKeyUp = fromEvent(this._descrInputRef.nativeElement, 'keyup')

    const formInputClick = fromEvent(this._descrInputRef.nativeElement, 'click')
      .pipe(filter((ev: MouseEvent) => ev.button === 0))

    const durationKeydown = merge(
      fromEvent(this._startInputRef.nativeElement, 'keydown'),
      fromEvent(this._durationInputRef.nativeElement, 'keydown'))

    const formKeydown = merge(
      durationKeydown,
      fromEvent(this._descrInputRef.nativeElement, 'keydown'))

    const enterHotKey = formKeydown.pipe(filter((ev: KeyboardEvent) => ev.keyCode === 13))

    const formBlur = merge(
      fromEvent(this._startInputRef.nativeElement, 'blur'),
      fromEvent(this._durationInputRef.nativeElement, 'blur'),
      fromEvent(this._descrInputRef.nativeElement, 'blur'))

    // Select annotation
    this._subs.push(
      formClick.subscribe((ev: MouseEvent) => {
        this.onSelectAnnotation.emit({
          type: project.AnnotationSelectionType.Default,
          selection: AnnotationSelectionRecordFactory({
            track: this.entry.get('track', null),
            annotationStackIndex: this.entry.get('annotationStackIndex', null),
            annotation: this.entry.get('annotation', null),
            source: SelectionSource.Inspector
          })
        })
        this.encloseHashtags({ 'replace': true })
      }))


    this._subs.push(
      formInputClick.subscribe((ev: MouseEvent) => {
        this.deductHrefs()
      }))

    // Focus annotation
    this._subs.push(
      formDblClick.subscribe(() => {
        this.onFocusAnnotation.emit({
          currentTime: (this.entry.getIn(['annotation', 'utc_timestamp']))
        })
      }))

    this._subs.push(
      formKeyUp.subscribe((ev: KeyboardEvent) => {
      }))

    this._subs.push(
      formKeydown.subscribe((ev: KeyboardEvent) => {
        ev.stopPropagation()
        if (this.isHashTagPopupContainerOpen) {
          this.handleHashtagInput(ev)
        } else {
          if (ev.key === '#') {
            this.handleHashTag(ev)
          }
        }
      }))

    const validDurationInputKey = (keyCode: number) => {
      return (keyCode >= 48 && keyCode <= 57) || // 0-9
        keyCode === 8 ||                         // backspace
        keyCode === 186 ||                       // :
        keyCode === 190 ||                       // .
        keyCode === 37 ||                        // left arrow
        keyCode === 39                           // right arrow
    }

    this._subs.push(
      durationKeydown.pipe(filter((ev: KeyboardEvent) => !validDurationInputKey(ev.keyCode)))
        .subscribe((ev: KeyboardEvent) => {
          ev.preventDefault()
        }))

    this._subs.push(
      enterHotKey.subscribe((ev: any) => {
        // if(ev.target.nodeName !== 'TEXTAREA') {
        if (ev.target.classList.contains('contenteditable') !== true) {
          ev.target.blur()
        }
      }))

    this._subs.push(
      formBlur
        .pipe(
          // delay(100),
          tap((ev) => {
            // this.encloseHashtags()
            this.encloseHrefs()
          }),
          withLatestFrom(combineLatest(this.form!.valueChanges, this.form!.statusChanges), (_, [form, status]) => {
            return [form, status]
          }),
          filter(([_, status]) => status === _VALID_),
          map(([form]) => form),
          distinctUntilChanged((prev, cur) => {
            return prev.title === cur.title && prev.description === cur.description &&
              prev.utc_timestamp === cur.utc_timestamp && prev.duration === cur.duration
          }))
        .subscribe(({ description, utc_timestamp, duration }) => {
          description = this.htmlBr(description)
          description = this.removeNodesFromText(description)
          this.saveHashtags(description)

          const annotation = new AnnotationRecordFactory({
            id: this.entry.getIn(['annotation', 'id']),
            utc_timestamp: parseDuration(utc_timestamp),
            duration: parseDuration(duration),
            fields: new AnnotationFieldsRecordFactory({ description }),
            pointerElement: this.entry.getIn(['annotation', 'pointerElement'])
          })

          this.onUpdate.emit({
            trackIndex: this.entry.get('trackIndex', null),
            annotationStackIndex: this.entry.get('annotationStackIndex', null),
            annotationIndex: this.entry.get('annotationIndex', null),
            annotation
          })
        }))
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.form !== null && changes.entry !== undefined && !changes.entry.firstChange) {
      const { previousValue, currentValue } = changes.entry
      if (previousValue === undefined || !previousValue.equals(currentValue)) {
        // console.log(previousValue, currentValue)
        this.form.setValue(this._mapModel(currentValue))
        this.encloseHashtags()
        this.encloseHrefs()
      }
    }
  }

  ngOnDestroy() {
    this._subs.forEach(sub => sub.unsubscribe())
  }


  isPlayerCurrentTime() {
    const annotationStartTime = parseFloat(this.annotationStartTime.toFixed(2))
    const annotationEndTime = parseFloat(this.annotationEndTime.toFixed(2))
    const playerCurrentTime = parseFloat(this.playerCurrentTime.toFixed(2))

    return ((playerCurrentTime >= annotationStartTime) && (playerCurrentTime <= annotationEndTime) ? true : false)
  }

  pointerAction($event: MouseEvent) {

    this.onFocusAnnotation.emit({
      currentTime: (this.entry.getIn(['annotation', 'utc_timestamp']))
    })

    const annotation_id = this.entry.getIn(['annotation', 'id']) as number
    const entries_pointer_element = this.entry.getIn(['annotation', 'pointerElement'])
    /**
     *  check if new pointerelement
     */
    if (entries_pointer_element === null) {

      const componentWidth = 20
      const componentHeight = 20

      let options = {
        video_width: this._video_elem_container.offsetWidth as number,
        video_height: this._video_elem_container.offsetHeight as number,
        left: ((this._video_elem_container.offsetWidth / 2) - (componentWidth / 2)) as number,
        top: ((this._video_elem_container.offsetHeight / 2) - (componentHeight / 2)) as number,
        bgcolor: this.entry.get('color', null) as string,
        active: true as boolean,
        zIndex: 1 as number,
        annotation_path: {
          trackIndex: this.entry.get('trackIndex', null),
          annotationStackIndex: this.entry.get('annotationStackIndex', null),
          annotationIndex: this.entry.get('annotationIndex', null),
          annotation_id: annotation_id
        } as any
      } as PointerElement

      // save
      this.onAddAnnotationPointer.emit({
        annotation_id: annotation_id,
        pointer_payload: options
      })

      // set Pointer indicator color
      this.annotation_pointer_color = this.entry.get('color', null) as string
    }
  }


  removePointerAction($event: MouseEvent) {
    this.onFocusAnnotation.emit({
      currentTime: (this.entry.getIn(['annotation', 'utc_timestamp']))
    })
    const annotation_id = this.entry.getIn(['annotation', 'id']) as number
    let options = {
      annotation_path: {
        trackIndex: this.entry.get('trackIndex', null),
        annotationStackIndex: this.entry.get('annotationStackIndex', null),
        annotationIndex: this.entry.get('annotationIndex', null),
        annotation_id: annotation_id
      } as any
    } as PointerElement
    this.onAddAnnotationPointer.emit({
      annotation_id: annotation_id,
      pointer_payload: options,
      remove: true
    })
    this.annotation_pointer_color = '#bbb'
  }
}
