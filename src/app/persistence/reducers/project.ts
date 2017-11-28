import {Record, List, Set} from 'immutable'

import * as project from '../actions/project'

import {_SNAPSHOTS_MAX_STACKSIZE_} from '../../config/snapshots'

import {
  Project, TimelineRecordFactory, ProjectRecordFactory,
  TrackRecordFactory, TrackFieldsRecordFactory,
  AnnotationRecordFactory, AnnotationFieldsRecordFactory,
  ProjectMetaRecordFactory, Timeline, ProjectSnapshot,
  ProjectSnapshotRecordFactory, ProjectAnnotationSelection,
  AnnotationSelection
} from '../model'

const initialState = new ProjectRecordFactory()

export type State = Record<Project>

function nextTrackId(timeline: Record<Timeline>): number {
  let maxId = -1
  const tracks = timeline.get('tracks', [])
  tracks.forEach(track => {
    const curId = track.get('id', -1) as number
    if(curId > maxId) {
      maxId = curId
    }
  })

  return maxId+1
}

function nextAnnotationId(timeline: Record<Timeline>): number {
  let maxId = -1
  const tracks = timeline.get('tracks', [])
  tracks.forEach(track => {
    const annotations = track.get('annotations', null)
    annotations.forEach(annotation => {
      const curId = annotation.get('id', -1) as number
      if(curId > maxId) {
        maxId = curId
      }
    })
  })

  return maxId+1
}

function filterTrackIndex(selection: Set<Record<AnnotationSelection>>, trackIndex: number) {
  return selection.filter(s => {
    return s.get('trackIndex', null) === trackIndex
  })
}

export function reducer(state: State = initialState, action: project.Actions): State {
  switch(action.type) {
    case project.PROJECT_LOAD_SUCCESS: {
      const {meta: {id, timeline}, video} = action.payload
      // Create immutable representation
      return new ProjectRecordFactory({
        video,
        meta: ProjectMetaRecordFactory({
          id,
          timeline: TimelineRecordFactory({
            ...timeline,
            tracks: List(timeline.tracks.map((track: any) => {
              const {title} = track.fields
              return new TrackRecordFactory({
                ...track,
                fields: TrackFieldsRecordFactory({title}),
                annotations: List(track.annotations.map((annotation: any) => {
                  const {title, description} = annotation.fields
                  return new AnnotationRecordFactory({
                    ...annotation,
                    fields: new AnnotationFieldsRecordFactory({title, description}),
                  })
                }))
              })
            }))
          })
        })
      })
    }
    case project.PROJECT_IMPORT_VIDEO_SUCCESS: {
      const video = action.payload
      return state.set('video', video)
    }
    case project.PROJECT_SET_TIMELINE_DURATION: {
      return state.setIn(['meta', 'timeline', 'duration'], action.payload.duration)
    }
    case project.PROJECT_ADD_ANNOTATION: {
      const {trackIndex, annotation} = action.payload
      const newId = nextAnnotationId(state.getIn(['meta', 'timeline']))
      const a = annotation.set('id', newId)
      return state.updateIn(['meta', 'timeline', 'tracks', trackIndex, 'annotations'], annotations => {
        return annotations.push(a)
      })
    }
    case project.PROJECT_UPDATE_ANNOTATION: {
      const {trackIndex, annotationIndex, annotation} = action.payload
      return state.setIn([
        'meta', 'timeline', 'tracks', trackIndex,
        'annotations', annotationIndex
      ], annotation)
    }
    case project.PROJECT_DELETE_ANNOTATION: {
      const {trackIndex, annotationIndex} = action.payload
      return state.updateIn(['meta', 'timeline', 'tracks', trackIndex, 'annotations'], annotations => {
        return annotations.delete(annotationIndex)
      })
    }
    case project.PROJECT_ADD_TRACK: {
      const trackPartial = action.payload
      const nextId = nextTrackId(state.getIn(['meta', 'timeline']))
      return state.updateIn(['meta', 'timeline', 'tracks'], tracks => {
        return tracks.push(new TrackRecordFactory({
          id: nextId,
          color: trackPartial.color,
          fields: trackPartial.fields,
          annotations: trackPartial.annotations
        }))
      })
    }
    case project.PROJECT_UPDATE_TRACK: {
      const {trackIndex, track} = action.payload
      return state.setIn(['meta', 'timeline', 'tracks', trackIndex], track)
    }
    case project.PROJECT_DELETE_TRACK: {
      const {trackIndex} = action.payload
      return state.deleteIn(['meta', 'timeline', 'tracks', trackIndex])
    }
    case project.PROJECT_DUPLICATE_TRACK: {
      const {trackIndex} = action.payload
      const timeline = state.getIn(['meta', 'timeline'])
      const track = state.getIn(['meta', 'timeline', 'tracks', trackIndex])
      const duplicate = track.withMutations((mutableTrack: any) => {
        mutableTrack.set('id', nextTrackId(timeline))
        const oldTitle = track.getIn(['fields', 'title'])
        mutableTrack.setIn(['fields', 'title'], oldTitle !== '' ? `${oldTitle} Copy` : '')
        mutableTrack.set('annotations', mutableTrack.get('annotations').map((annotation: any, i: number) => {
          return annotation.set('id', nextAnnotationId(timeline)+i)
        }))
      })

      return state.updateIn(['meta', 'timeline', 'tracks'], tracks => {
        return tracks.insert(trackIndex+1, duplicate)
      })
    }
    case project.PROJECT_INSERTAT_TRACK: {
      const {currentTrackIndex, insertAtIndex} = action.payload
      const tracks = state.getIn(['meta', 'timeline', 'tracks'])
      const swapped = tracks.withMutations((mTracks: any) => {
        // mTracks ~ mutableTracks
        const tmp = mTracks.get(currentTrackIndex)
        mTracks.set(currentTrackIndex, mTracks.get(insertAtIndex))
        mTracks.set(insertAtIndex, tmp)
      })

      return state.setIn(['meta', 'timeline', 'tracks'], swapped)
    }
    case project.PROJECT_PUSH_UNDO: {
      const updatedRedo = state.setIn(['snapshots', 'redo'], List())
      return updatedRedo.updateIn(['snapshots', 'undo'], (undoList: List<Record<ProjectSnapshot>>) => {
        // Ensure max snapshot stack size
        if(undoList.size < _SNAPSHOTS_MAX_STACKSIZE_) {
          // Insert first
          return undoList.unshift(action.payload)
        } else {
          // Remove last, insert first
          return undoList.pop().unshift(action.payload)
        }
      })
    }
    case project.PROJECT_UNDO: {
      const undoList: List<Record<ProjectSnapshot>> = state.getIn(['snapshots', 'undo'])
      const redoList: List<Record<ProjectSnapshot>> = state.getIn(['snapshots', 'redo'])
      if(undoList.size > 0) {
        const undoSnapshot = undoList.first()!
        const currentSnapshot = new ProjectSnapshotRecordFactory({
          timestamp: Date.now(),
          state: state.get('meta', null)!
        })
        const updatedRedo = state.setIn(['snapshots', 'redo'], redoList.unshift(currentSnapshot))
        const updatedUndo = updatedRedo.setIn(['snapshots', 'undo'], undoList.shift())
        return updatedUndo.set('meta', undoSnapshot.get('state', null))
      }
      return state
    }
    case project.PROJECT_REDO: {
      const undoList: List<Record<ProjectSnapshot>> = state.getIn(['snapshots', 'undo'])
      const redoList: List<Record<ProjectSnapshot>> = state.getIn(['snapshots', 'redo'])
      if(redoList.size > 0) {
        const redoSnapshot = redoList.first()!
        const currentSnapshot = new ProjectSnapshotRecordFactory({
          timestamp: Date.now(),
          state: state.get('meta', null)!
        })
        const updatedUndo = state.setIn(['snapshots', 'undo'], undoList.unshift(currentSnapshot))
        const updatedRedo = updatedUndo.setIn(['snapshots', 'redo'], redoList.shift())
        return updatedRedo.set('meta', redoSnapshot.get('state', null))
      }
      return state
    }
    case project.PROJECT_SELECT_ANNOTATION: {
      const {type, selection} = action.payload
      switch(type) {
        case project.AnnotationSelectionType.Default: {
          return state.updateIn(['selection', 'annotation'], annotationSelection => {
            return annotationSelection.withMutations((mSelection: any) => {
              mSelection.set('range', Set()),
              mSelection.set('pick', Set()),
              mSelection.set('selected', selection)
            })
          })
        }
        case project.AnnotationSelectionType.Pick: {
          const aSel: Record<ProjectAnnotationSelection> = state.getIn(['selection', 'annotation'])
          const pickSelections = aSel.get('pick', null)!
          const curTrackIndex = selection.get('trackIndex', null)
          const curSelected = state.getIn(['selection', 'annotation', 'selected'])
          if(pickSelections.has(selection)) {
            return state.updateIn(['selection', 'annotation'], annotationSelection => {
              return annotationSelection.withMutations((mSelection: any) => {
                mSelection.set('pick', mSelection.get('pick').remove(selection))
                mSelection.set('range', mSelection.get('range').remove(selection))
                mSelection.set('selected', null)
              })
            })
          } else {
            return state.updateIn(['selection', 'annotation'], annotationSelection => {
              return annotationSelection.withMutations((mSelection: any) => {
                if(mSelection.get('selected')) {
                  mSelection.set('pick', mSelection.get('pick').add(curSelected))
                }
                mSelection.set('pick', filterTrackIndex(mSelection.get('pick'), curTrackIndex))
                mSelection.set('range', filterTrackIndex(mSelection.get('range'), curTrackIndex))
                mSelection.set('pick', mSelection.get('pick').add(selection))
                mSelection.set('selected', selection)
              })
            })
          }
        }
        case project.AnnotationSelectionType.Range: {
          return state
        }
      }
    }
    default: {
      return state
    }
  }
}

export const getProjectMeta = (state: State) => {
  return state.get('meta', null)
}
export const getProjectVideo = (state: State) => state.get('video', null)

export const getProjectSelection = (state: State) => {
  return state.get('selection', null)
}
