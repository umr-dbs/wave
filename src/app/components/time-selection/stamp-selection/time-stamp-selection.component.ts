
import {Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input} from '@angular/core';
import {ProjectService} from '../../../project/project.service';
import {Time, TimeInterval, TimeType, TimePoint} from '../../../time/time.model';
import * as moment from 'moment';

@Component({
    selector: 'wave-time-stamp-selection',
    templateUrl: 'time-stamp-selection.component.html',
    styleUrls: ['time-stamp-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeStampSelectionComponent implements OnInit {
    @Input() time = 2007;
    @Input() time_min;
    @Input() time_max;

    constructor(private projectService: ProjectService,
                private changeDetector: ChangeDetectorRef) {}

    ngOnInit() {
        // this.projectService.getTimeStream().subscribe(time => {
        //     this.time = time.clone();
        //     this.reset();
        //     console.log(time);
        // });
        this.setTime();
    }

    reset() {
        // this.time_start = this.time.getStart().year();
        // this.time_end = this.time.getEnd().year();
        // this.start = this.start.set('months', 1);
        // this.start = this.start.set('days', 1);
        // this.start = this.start.set('hours', 0);
        // this.start = this.start.set('minutes', 0);
        // this.start = this.start.set('seconds', 0);
        // this.end = this.end.set('months', 1);
        // this.end = this.end.set('days', 1);
        // this.end = this.end.set('hours', 0);
        // this.end = this.end.set('minutes', 0);
        // this.end = this.end.set('seconds', 0);
        // let dict = {start: this.start.toISOString(),
        //             end: this.end.toISOString(),
        //             type: 'TimeInterval' as TimeType};
        // this.time = TimeInterval.fromDict(dict);
        // this.changeDetector.detectChanges();
    }

    setTime() {
        this.projectService.setTime(TimePoint.fromDict({
            start: this.time + '-01-01T00:00:00.000Z',
            type: 'TimePoint' as TimeType
        }));
        this.changeDetector.detectChanges();
    }
}
