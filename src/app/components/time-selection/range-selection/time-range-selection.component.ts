
import {Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input, ViewChild} from '@angular/core';
import {ProjectService} from '../../../project/project.service';
import {Time, TimeInterval, TimeType} from '../../../time/time.model';
import * as moment from 'moment';
import {MatSliderChange, MatSlider} from '@angular/material';

@Component({
    selector: 'wave-time-range-selection',
    templateUrl: 'time-range-selection.component.html',
    styleUrls: ['time-range-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeRangeSelectionComponent implements OnInit {
    @Input() time_start = 2001;
    @Input() time_end = 2007;
    @Input() time_min;
    @Input() time_max;
    start_drag = false;
    end_drag = false;
    value: number;
    @ViewChild('filler') filler: MatSlider;

    constructor(private projectService: ProjectService,
                private changeDetector: ChangeDetectorRef) {}

    ngOnInit() {
        this.value = this.time_end - 1 - this.time_start;
    }

    toggle_start_dragging() {
        this.start_drag = !this.start_drag;
        console.log(this.start_drag);
    }

    toggle_end_dragging() {
        this.end_drag = !this.end_drag;
        console.log(this.end_drag);
    }

    transform_start(event: MatSliderChange) {
        this.time_start = this.time_end - 1 - event.value;
    }

    transform_value(event: MatSliderChange) {
        this.time_end = event.value;
        this.value = this.time_end - 1 - this.time_start;
    }

    formatLabel(value: number | null) {
        let val = this.time_end - 1 - value;
        return val;
    }

    recorrect() {
        this.filler.value = 1;
    }
}
