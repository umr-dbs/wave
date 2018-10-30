
import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {ProjectService} from '../../project/project.service';
import {Time, TimeInterval} from '../../time/time.model';
import * as moment from 'moment';

@Component({
    selector: 'wave-time-selection',
    templateUrl: 'time-selection.component.html',
    styleUrls: ['time-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeSelectionComponent implements OnInit {
    time_start = 2000;
    time_end = 2005;
    start = moment.Moment = moment();
    end = moment.Moment = moment();

    constructor(private projectService: ProjectService) {}

    ngOnInit() {
        this.start.set('year', this.time_start);
        this.start.set('day', 1);
        this.start.set('month', 1);
        this.start.set('hour', 0);
        this.start.set('minute', 0);
        this.start.set('seconds', 0);
        this.end.set('year', this.time_end);
        this.end.set('day', 1);
        this.end.set('month', 1);
        this.end.set('hour', 0);
        this.end.set('minute', 0);
        this.end.set('seconds', 0);
        this.setTime();
    }

    change_start(e: Event) {
        if (e.valueOf() > this.time_end) {
            this.time_start = this.time_end - 1;
        }
        this.start.set('year', this.time_start);
        this.setTime();
    }

    change_end(e: Event) {
        if (e.valueOf() < this.time_start) {
            this.time_end = this.time_start + 1;
        }
        this.end.set('year', this.time_end);
        this.setTime();
    }

    setTime() {
        this.time = new TimeInterval(this.start, this.end);
        this.projectService.setTime(this.time);
        console.log(this.time);
    }
}
