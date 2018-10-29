
import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {ProjectService} from '../../project/project.service';
import {Time, TimeInterval} from '../../time/time.model';


@Component({
    selector: 'wave-time-selection',
    templateUrl: 'time-selection.component.html',
    styleUrls: ['time-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeSelectionComponent {
    time_start = 2000;
    time_end = 2005;
    time: Time;

    constructor(private projectService: ProjectService) {}

    change_start(e: Event) {
        if (e.valueOf() > this.time_end) {
            this.time_start = this.time_end - 1;
        }
        this.setTime();
    }

    change_end(e: Event) {
        if (e.valueOf() < this.time_start) {
            this.time_end = this.time_start + 1;
        }
        this.setTime();
    }

    setTime() {
        let moment = require('moment');
        this.time = new TimeInterval(moment(this.time_start + '', 'YYYY'), moment(this.time_end + '', 'YYYY'));
        this.projectService.setTime(this.time);
        console.log(this.time);
    }
}
