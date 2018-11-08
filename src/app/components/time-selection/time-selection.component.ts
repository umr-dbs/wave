
import {Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef} from '@angular/core';
import {ProjectService} from '../../project/project.service';
import {Time, TimeInterval, TimeType} from '../../time/time.model';
import * as moment from 'moment';

@Component({
    selector: 'wave-time-selection',
    templateUrl: 'time-selection.component.html',
    styleUrls: ['time-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeSelectionComponent implements OnInit {
    time_start = 2001;
    time_end = 2007;
    time: Time;

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

    change_start(e: Event) {
        if (e.valueOf() > this.time_end) {
            this.time_start = this.time_end - 1;
        }
        if (e.valueOf() < 2001) {
            this.time_start = 2001;
        }
        // this.start.set('year', this.time_start);
        // let dict = {start: this.start.toISOString(),
        //     end: this.end.toISOString(),
        //     type: 'TimeInterval' as TimeType};
        // this.time = TimeInterval.fromDict(dict);
        this.setTime();
    }

    change_end(e: Event) {
        if (e.valueOf() < this.time_start) {
            this.time_end = this.time_start + 1;
        }
        if (e.valueOf() > 2012) {
            this.time_end = 2012;
        }
        // this.end.set('year', this.time_end);
        // let dict = {start: this.start.toISOString(),
        //     end: this.end.toISOString(),
        //     type: 'TimeInterval' as TimeType};
        // this.time = TimeInterval.fromDict(dict);
        this.setTime();
    }

    setTime() {
        this.projectService.setTime(TimeInterval.fromDict({
            start: this.time_start + '-01-01T00:00:00.000Z',
            end: this.time_end + '-01-01T00:00:00.000Z',
            type: 'TimeInterval' as TimeType
        }));
        this.changeDetector.detectChanges();
    }
}
