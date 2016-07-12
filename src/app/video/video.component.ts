import { Component, OnInit, AfterViewInit, Input, ElementRef } from '@angular/core';
import 'video.js'; // creates global videojs() function

import { Observable } from 'rxjs/Observable';
import { Subject } from "rxjs/Subject";
// import 'rxjs/observable/interval';
import 'rxjs/Rx'; // TODO: proper feature imports for Rx


@Component({
  moduleId: module.id,
  selector: 'app-video',
  templateUrl: 'video.component.html',
  styleUrls: ['video.component.css']
})
export class VideoComponent implements OnInit, AfterViewInit {

  player; // VideoJS Player instance
  playerReady; // Promise that resolves when player is ready
  playerOptions = {}; // Options to pass to VideoJS player

  private timepolling:Observable<number>; //
  private pollingSubscription;

  timeupdate:Subject<number> = new Subject<number>();
  timeupdateRate = 30; // ms

  @Input()
  set videoSrc(src) {
    this.playerReady.then(() => {
      this.player.src(src);
    });
  }

  get videoSrc() {
    if (this.player) {
      return this.player.currentSrc();
    }
    return null;
  }

  constructor(public hostElement: ElementRef) {
    let resolveFn;
    this.playerReady = new Promise(function(resolve) {
      resolveFn = resolve;
    });
    this.playerReady.resolve = resolveFn;

    this.timepolling = Observable.interval(this.timeupdateRate).map(() => {
      return this.player.currentTime();
    });

    this.timeupdate.subscribe((time) => {
      log.debug('polling time', time);
    });
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.player = videojs('videojs', this.playerOptions, () => {
      // player ready
      this.playerReady.resolve();
      this.fitPlayer();
      window.addEventListener('resize', () => {
        this.fitPlayer();
      });
    });
  }

  private fitPlayer() {
    let elementDim = this.hostElement.nativeElement.getBoundingClientRect();
    this.player.dimensions(elementDim.width, elementDim.height);
  }

  onPlay(event?) {
    log.debug('play', event);
    this.pollingSubscription = this.timepolling.subscribe(this.timeupdate);
  }

  onPause(event?) {
    log.debug('pause', event);
    this.pollingSubscription.unsubscribe();
  }

  onSeeking(event?) {
    log.debug('seeking', event);
    this.timeupdate.next(this.player.currentTime());
  }


  /*
    Video.js Player API: http://docs.videojs.com/docs/api/player.html
    - currentTime( seconds ) : Get or set the current time (in seconds)

    - currentType() : Get the current source type e.g. video/mp4
    - currentSrc() : Returns the fully qualified URL of the current source value e.g. http://mysite.com/video.mp4
    - duration() : Get the length in time of the video in seconds
    - videoHeight() : Get video height
    - videoWidth() : Get video width

    - pause()
    - paused()
    - play()

    Events: http://docs.videojs.com/docs/api/player.html#Eventsended
    - play
    - pause
    - seeking
    - seeked
    - ended : Fired when video playback ends
    - error : Fired when an error occurs
    - loadeddata : Fired when the player has downloaded data at the current playback position
    - loadedmetadata : Fired when the player has initial duration and dimension information
    - timeupdate : Fired when the current playback position has changed. During playback this is fired every 15-250 milliseconds, depending on the playback technology in use
    - useractive : Fired when the user is active, e.g. moves the mouse over the player
    - userinactive : Fired when the user is inactive, e.g. a short delay after the last mouse move or control interaction
    - volumechange : Fired when the volume changes
   */
}
