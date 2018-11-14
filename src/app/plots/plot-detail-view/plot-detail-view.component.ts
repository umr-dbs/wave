
import {ReplaySubject, BehaviorSubject, combineLatest as observableCombineLatest} from 'rxjs';
import {first} from 'rxjs/operators';

import {AfterViewInit, ChangeDetectionStrategy, Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material';
import {ProjectService} from '../../project/project.service';
import {Plot, PlotData} from '../plot.model';
import {LayoutService} from '../../layout.service';
import {MappingQueryService} from '../../queries/mapping-query.service';
// import {MapService} from '../../map/map.service';
import {TimeInterval} from '../../time/time.model';

export interface PlotDetailViewData {
    plot: Plot,
    initialPlotData: PlotData,
    time: TimeInterval,
}

@Component({
    selector: 'wave-plot-detail-view',
    templateUrl: './plot-detail-view.component.html',
    styleUrls: ['./plot-detail-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlotDetailViewComponent implements OnInit, AfterViewInit {

    maxWidth$ = new ReplaySubject<number>(1);
    maxHeight$ = new ReplaySubject<number>(1);

    // initially blank pixel
    imagePlotData$ = new BehaviorSubject('data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==');
    imagePlotLoading$ = new BehaviorSubject(true);

    constructor(public projectService: ProjectService,
                // private mapService: MapService,
                private mappingQueryService: MappingQueryService,
                @Inject(MAT_DIALOG_DATA) public data: PlotDetailViewData) {
    }

    ngOnInit() {
        observableCombineLatest(
                // this.projectService.getPlotDataStream(this.plot),
                // this.projectService.getTimeStream(),
                // this.projectService.getProjectionStream(),
                // this.mapService.getViewportSizeStream(),
                this.maxWidth$, this.maxHeight$
            ).pipe(
            first())
            .subscribe(([/*plotData, time, projection, viewport,*/ width, height]) => {
                // set data uri for png type and load full screen image
                // if (plotData.type === 'png') {
                    this.imagePlotData$.next(`data:image/png;base64,${this.data.initialPlotData.data}`);

                    this.mappingQueryService
                        .getPlotData({
                            operator: this.data.plot.operator,
                            time: this.data.time,
                            extent: this.data.plot.operator.projection.getExtent(),
                            projection: this.data.plot.operator.projection,
                            plotWidth: width - LayoutService.remInPx(),
                            plotHeight: height,
                        }).pipe(
                        first())
                        .subscribe(newPlotData => {
                            this.imagePlotData$.next(`data:image/png;base64,${newPlotData.data}`);

                            this.imagePlotLoading$.next(false);
                        });
                // }
            });
    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.maxWidth$.next(window.innerWidth - 2 * LayoutService.remInPx());
            this.maxHeight$.next(window.innerHeight - 2 * LayoutService.remInPx() - LayoutService.getToolbarHeightPx());
        });
    }

}
