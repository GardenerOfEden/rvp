import {List, Record, Set} from 'immutable'

// Model

export interface Project {
  readonly meta: Record<ProjectMeta>|null
  readonly settings: Record<ProjectSettings>
  readonly videoBlob: Blob|null
  readonly player: Record<ProjectPlayerState>
  readonly selection: Record<ProjectSelection>
  readonly snapshots: ProjectSnapshots
  readonly clipboard: Set<Record<AnnotationSelection>>
}

export const VIDEO_TYPE_BLOB = 'blob'
export const VIDEO_TYPE_URL = 'url'
export const VIDEO_TYPE_NONE = 'none'
export type VideoType = 'blob'|'url'

export const VIDEO_URL_SOURCE_YT = 'youtube'
export const VIDEO_URL_SOURCE_VIMEO = 'vimeo'
export const VIDEO_URL_SOURCE_CUSTOM = 'customurl'
export type VideoUrlSource = 'youtube'|'vimeo'|'customurl'

export type ProjectVideo = BlobVideo|UrlVideo

export class BlobVideo {
  type = VIDEO_TYPE_BLOB
}

export class UrlVideo {
  type = VIDEO_TYPE_URL
  source: VideoUrlSource|null=null
  url: URL|null=null
}

export interface ProjectMeta {
  readonly id: number|null
  readonly video: Record<ProjectVideo>|null,
  readonly timeline: Record<Timeline>|null,
  readonly hashtags: Record<ProjectHashtags>|null
  readonly general: Record<ProjectGeneralData>|null
  // readonly viewmode: boolean|false
}

export interface ProjectSettings {
  readonly currentAnnotationsOnly: boolean,
  readonly search: string|null,
  readonly applyToTimeline: boolean
}

export interface ProjectPlayerState {
  readonly currentTime: number
  readonly width: number
  readonly height: number
}

export interface ProjectSelection {
  readonly annotation: Record<ProjectAnnotationSelection>
}

export interface ProjectAnnotationSelection {
  readonly range: Set<Record<AnnotationSelection>> // ranged selection via shift click
  readonly pick: Set<Record<AnnotationSelection>> // picked selection via cmd click
  readonly selected: Record<AnnotationSelection>|null   // special usage
}

export const enum SelectionSource {
  None,
  Timeline,
  Inspector
}

export const AnnotationSelectionRecordFactory = Record<AnnotationSelection>({
  track: null,
  annotationStackIndex: null,
  annotation: null,
  source: SelectionSource.None
})

export interface AnnotationSelection {
  readonly track: Record<Track>|null
  readonly annotationStackIndex: number|null
  readonly annotation: Record<Annotation>|null
  readonly source: SelectionSource
}

/* Use List as double ended queue
 *  - unshift: Insert first
 *  - shift: Remove first
 *  - first: Get first
 *  - pop: Remove last
 */
export interface ProjectSnapshots {
  readonly undo: List<Record<ProjectSnapshot>>
  readonly redo: List<Record<ProjectSnapshot>>
}

export interface ProjectSnapshot {
  readonly timestamp: number
  readonly state: Record<ProjectMeta>
}

export interface Timeline {
  readonly id: number|null
  readonly duration: number
  // readonly playhead: number
  // readonly zoom: number
  // readonly pan: number
  readonly tracks: List<Record<Track>>
}

export interface ProjectHashtags {
  readonly list: Array<String>|null
}
export interface ProjectGeneralData {
  readonly title: string|null
  readonly viewmode: boolean
  readonly defaultAnnotationDuration: number
}

export interface Track {
  readonly id: number|null
  readonly isActive: boolean
  readonly isVisible: boolean
  readonly color: string
  readonly fields: Record<TrackFields>
  readonly annotationStacks: List<List<Record<Annotation>>>
}

export interface TrackFields {
  readonly title: string
}

export interface Annotation {
  readonly id: number|null
  readonly isShown: boolean
  readonly utc_timestamp: number
  readonly duration: number
  readonly fields: Record<AnnotationFields>
  readonly pointerElement: Record<PointerElement>|null
}

export interface AnnotationFields {
  readonly description: string
}

export interface AnnotationColorMap {
  readonly track: Record<Track>|null
  readonly trackIndex: number // TODO: really needed?
  readonly annotationStackIndex: number
  readonly annotationIndex: number
  readonly annotation: Record<Annotation>
  readonly color: string
}

export interface PointerElement {
  readonly left: number // x
  readonly top: number  // y
  readonly active: boolean
  readonly zIndex: number
  readonly bgcolor: string
  readonly video_width: number  // initial video width for scaling
  readonly video_height: number // initial video height for scaling
  readonly annotation_path: any // TODO : annotation_path record factory
  // readonly annotation_id: number
  // readonly pointer_id: number
}

// Record factories

export const ProjectMetaRecordFactory = Record<ProjectMeta>({
  id: null,
  video: null,
  timeline: null,
  hashtags: null,
  general: null
})

export const ProjectSettingsRecordFactory = Record<ProjectSettings>({
  currentAnnotationsOnly: false,
  search: null,
  applyToTimeline: false
})

export const ProjectSnapshotRecordFactory = Record<ProjectSnapshot>({
  timestamp: -1,
  state: new ProjectMetaRecordFactory()
})

export const ProjectSnapshotsRecordFactory = Record<ProjectSnapshots>({
  undo: List<Record<ProjectSnapshot>>(),
  redo: List<Record<ProjectSnapshot>>()
})

export const ProjectAnnotationSelectionRecordFactory = Record<ProjectAnnotationSelection>({
  range: Set(),
  pick: Set(),
  selected: null
})

export const ProjectSelectionRecordFactory = Record<ProjectSelection>({
  annotation: new ProjectAnnotationSelectionRecordFactory()
})

export const ProjectPlayerStateRecordFactory = Record<ProjectPlayerState>({
  currentTime: 0,
  width: 0,
  height: 0
})

export const ProjectRecordFactory = Record<Project>({
  meta: null,
  settings: new ProjectSettingsRecordFactory(),
  player: new ProjectPlayerStateRecordFactory(),
  videoBlob: null,
  selection: new ProjectSelectionRecordFactory(),
  snapshots: new ProjectSnapshotsRecordFactory(),
  clipboard: Set()
})

export const TimelineRecordFactory = Record<Timeline>({
  id: null,
  duration: -1,
  // playhead: -1,
  // zoom: -1,
  // pan: -1,
  tracks: List([])
})

export const TrackFieldsRecordFactory = Record<TrackFields>({
  title: ''
})

export const TrackRecordFactory = Record<Track>({
  id: null,
  isActive: false,
  isVisible: true,
  color: '#000',
  fields: new TrackFieldsRecordFactory(),
  annotationStacks: List([List([])])
})

export const AnnotationFieldsRecordFactory = Record<AnnotationFields>({
  description: ''
})

export const ProjectGeneralDataRecordFactory = Record<ProjectGeneralData>({
  title: '',
  viewmode: false,
  defaultAnnotationDuration: 0
})

export const AnnotationRecordFactory = Record<Annotation>({
  id: null,
  isShown: true,
  utc_timestamp: -1,
  duration: -1,
  fields: new AnnotationFieldsRecordFactory(),
  pointerElement: null
})

export const ProjectHashtagsRecordFactory = Record<ProjectHashtags>({
  list: []
})

export const BlobVideoRecordFactory = Record<BlobVideo>({
  type: VIDEO_TYPE_BLOB
})

export const UrlVideoRecordFactory = Record<UrlVideo>({
  type: VIDEO_TYPE_URL,
  source: null,
  url: null
})

export const AnnotationColorMapRecordFactory = Record<AnnotationColorMap>({
  trackIndex: -1,
  track: null,
  annotationStackIndex: -1,
  annotationIndex: -1,
  annotation: new AnnotationRecordFactory(),
  color: '#000'
})

export const PointerElementRecordFactory = Record<PointerElement>({
  left: 0,
  top: 0,
  active: true,
  zIndex: 1,
  bgcolor: '#000000',
  video_width: 0,
  video_height: 0,
  annotation_path: {}
})
