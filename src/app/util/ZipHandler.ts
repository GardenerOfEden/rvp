import {Injectable} from '@angular/core'

import * as JSZip from 'jszip'

import {Observable} from 'rxjs/Observable'

const defaultZipOptions = {
  type: 'blob',
  compression: "DEFLATE",
  compressionOptions: {
    level: 9
  }
}

@Injectable()
export class ZipHandler {
  unzip(data: Observable<ArrayBuffer|string>) {
    return data.concatMap(d => Observable.fromPromise(JSZip.loadAsync(d)))
  }

  zip(zip: any, options:any=defaultZipOptions) {
    return zip.generateAsync(options)
  }
}
