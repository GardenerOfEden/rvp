import {
  Component, Input, Output,
  OnInit, OnChanges, AfterViewInit,
  EventEmitter, ViewChild, ElementRef
} from '@angular/core'

import {
  FormGroup, FormBuilder, AbstractControl,
  Validators, ValidatorFn, ValidationErrors
} from '@angular/forms'

const _VALID_ = 'VALID' // not exported by @angular/forms

import * as moment from 'moment'
import {Record} from 'immutable'

import 'rxjs/add/operator/combineLatest'
import 'rxjs/add/operator/debounceTime'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/filter'

import {_FORM_INPUT_DEBOUNCE_} from '../../../config/form'

import {
  AnnotationColorMap, AnnotationRecordFactory,
  AnnotationFieldsRecordFactory
} from '../../../persistence/model'

import * as project from '../../../persistence/actions/project'

function formatDuration(unixTime: number): string {
  return moment.unix(unixTime).utc().format('HH:mm:ss.SSS')
}

const parseDurationRegex = /^(?:(?:([0-9]*):)|(?:([0-9]*):([0-9]*):))?([0-9]*)(?:\.([0-9]*))?$/

function parseDuration(durationStr: string): number {
  let result = parseDurationRegex.exec(durationStr)
  if(result === null) {
    return 0
  } else {
    let m1 = result[1] ? parseInt(result[1], 10) : 0;
    let h = result[2] ? parseInt(result[2], 10) : 0;
    let m2 = result[3] ? parseInt(result[3], 10) : 0;
    let s = result[4] ? parseInt(result[4], 10) : 0;
    let sFract = result[5] ? parseFloat('.'+result[5]) : 0;
    return h*3600 + m1*60 + m2*60 + s + sFract;
  }
}

function durationValidatorFactory(): ValidatorFn {
  const durationRegex = /^([0-9]*:){0,2}[0-9]*(\.[0-9]*)?$/

  return (control: AbstractControl): ValidationErrors|null => {
    const valid = durationRegex.test(control.value)
    return !valid ? {'duration': {value: control.value}} : null;
  }
}

const durationValidator = Validators.compose([Validators.required, durationValidatorFactory()])

@Component({
  selector: 'rv-inspector-entry',
  templateUrl: 'inspectorEntry.component.html',
  styleUrls: ['inspectorEntry.component.scss']
})
export class InspectorEntryComponent implements OnChanges, OnInit, AfterViewInit {
  @Input() entry: Record<AnnotationColorMap>
  @Input() index: number

  @Output() onUpdate = new EventEmitter<project.UpdateAnnotationPayload>()

  @ViewChild('start') startInput: ElementRef
  @ViewChild('duration') durationInput: ElementRef

  form: FormGroup|null = null

  constructor(private readonly _fb: FormBuilder) {}

  private _mapModel(entry: Record<AnnotationColorMap>) {
    const utc_timestamp = entry.getIn(['annotation', 'utc_timestamp'])
    const duration = entry.getIn(['annotation', 'duration'])
    const title = entry.getIn(['annotation', 'fields', 'title'])
    const description = entry.getIn(['annotation', 'fields', 'description'])

    return {
      utc_timestamp: formatDuration(utc_timestamp),
      duration: formatDuration(duration),
      title, description
    }
  }

  ngOnInit() {
    const {
      utc_timestamp, duration,
      title, description
    } = this._mapModel(this.entry)

    this.form = this._fb.group({
      utc_timestamp: [utc_timestamp, durationValidator],
      duration: [duration, durationValidator],
      title, description
    })

    this.form.valueChanges.combineLatest(this.form.statusChanges)
      .debounceTime(_FORM_INPUT_DEBOUNCE_)
      .filter(([_, status]) => status === _VALID_)
      .map(([formData, _]) => formData)
      .subscribe(({title, description, utc_timestamp, duration}) => {
        const annotation = new AnnotationRecordFactory({
          utc_timestamp: parseDuration(utc_timestamp),
          duration: parseDuration(duration),
          fields: new AnnotationFieldsRecordFactory({
            title, description
          })
        })

        this.onUpdate.emit({
          trackIndex: this.entry.get('trackIndex', null),
          annotationIndex: this.index,
          annotation
        })
      })
  }

  ngAfterViewInit() {
    // TODO: add keydown handler
  }

  ngOnChanges() {
    if(this.form !== null) {
      this.form.reset(this._mapModel(this.entry))
    }
  }
}
