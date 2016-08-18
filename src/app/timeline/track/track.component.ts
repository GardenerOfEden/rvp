import { Component, OnInit, Input } from '@angular/core';
import { AnnotationComponent } from './annotation';
import { Track, Annotation } from '../../shared/models';
import { Store } from '@ngrx/store';
import { TimelineService } from '../../shared';
import { KeyDirective } from '../../shared/key.directive';

@Component({
  moduleId: module.id,
  selector: 'app-track',
  templateUrl: 'track.component.html',
  styleUrls: ['track.component.css'],
  directives: [AnnotationComponent, KeyDirective]
})
export class TrackComponent implements OnInit {

  @Input() data:Track;

  constructor(private store:Store<any>, private timeService:TimelineService) {
  }

  ngOnInit() {
  }

  // add annotation
  doubleClick(e) {
    let clickPosition = e.offsetX + e.target.scrollLeft;
    let clickTime = this.timeService.convertPixelsToSeconds(clickPosition);

    let newAnnotation:Annotation = {
      utc_timestamp: clickTime,  // todo: calculate accurate time corresponding to relative position on track
      duration: 0,
      fields: {
        title: '',
        description: ''
      },
      isSelected: false
    };

    this.store.dispatch( { type: 'ADD_ANNOTATION', payload: { annotation: newAnnotation, track: this.data } } );
    this.store.dispatch( { type: 'SELECT_ANNOTATION', payload: newAnnotation } );
  }

  deleteTrack(){
    if(window.confirm("Really delete track? All annotations will be deleted, too.")){
      this.store.dispatch( { type: 'DELETE_TRACK', payload: { track: this.data } } );
    }
  }
}
