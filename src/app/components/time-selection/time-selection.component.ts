
import {Component, OnInit, ChangeDetectionStrategy, AfterViewInit} from '@angular/core';


@Component({
    selector: 'wave-time-selection',
    templateUrl: 'time-selection.component.html',
    styleUrls: ['time-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeSelectionComponent {
    time_start = 2000;
    time_end = 2005;

    change_start(e: Event) {
        if (e.srcElement.value > this.time_end) {
            this.time_start = this.time_end - 1;
        }
    }

    change_end(e: Event) {
        if (e.srcElement.value < this.time_start) {
            this.time_end = this.time_start + 1;
        }
    }
}
