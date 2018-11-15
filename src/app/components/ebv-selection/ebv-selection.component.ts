import {Component, OnInit, ChangeDetectionStrategy, AfterViewInit, ViewChild, Input, Inject} from '@angular/core';
import {FormGroup, FormBuilder, Validators} from '@angular/forms';
import {VectorLayer, RasterLayer, Layer} from '../../layers/layer.model';
import {ProjectService} from '../../project/project.service';
import {
    ComplexVectorSymbology, RasterSymbology,
    MappingColorizerRasterSymbology
} from "../../layers/symbology/symbology.model";
import {Operator} from "../../operators/operator.model";
import {ResultTypes} from "../../operators/result-type.model";
import {Plot, PlotData} from '../../plots/plot.model';
import {RScriptType} from "../../operators/types/r-script-type.model";
import {TimeStampSelectionComponent} from "../time-selection/stamp-selection/time-stamp-selection.component";
import {RasterizePolygonType} from '../../operators/types/rasterize-polygon-type.model';
import {ExpressionType} from '../../operators/types/expression-type.model';
import {UserService} from '../../users/user.service';
import {
    of as observableOf,
    Observable,
    BehaviorSubject,
    ReplaySubject,
    Subscription,
    Observer,
    combineLatest as observableCombineLatest
} from 'rxjs';
import {MappingSource, MappingSourceRasterLayer} from '../../operators/dialogs/data-repository/mapping-source.model';
import {DataSource} from '@angular/cdk/collections';
import {Unit} from '../../operators/unit.model';
import {GdalSourceType} from '../../operators/types/gdal-source-type.model';
import {SourceDatasetComponent} from '../../operators/dialogs/data-repository/raster/source-dataset.component';
import {Projection, Projections} from '../../operators/projection.model';
import {DataType, DataTypes} from '../../operators/datatype.model';
import {TimeRangeSelectionComponent} from '../time-selection/range-selection/time-range-selection.component';
import {LayoutService} from '../../layout.service';
import {range} from "d3";
import {MAT_DIALOG_DATA, MatDialog, MatSelect} from '@angular/material';
import {LoadingState} from '../../project/loading-state.model';
import {debounceTime, first, switchMap, tap} from 'rxjs/operators';
import {Config} from '../../config.service';
import {MappingQueryService} from '../../queries/mapping-query.service';
import {TimeInterval} from '../../time/time.model';
import * as moment from 'moment';
import {NotificationService} from '../../notification.service';
import {PlotDetailViewComponent, PlotDetailViewData} from '../../plots/plot-detail-view/plot-detail-view.component';


@Component({
    selector: 'wave-ebv-selection',
    templateUrl: 'ebv-selection.component.html',
    styleUrls: ['ebv-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EBVComponent implements OnInit, AfterViewInit {

    // make available in template
    public LoadingState = LoadingState;
    //

    countryLayer: VectorLayer<ComplexVectorSymbology>;
    ebvLayer: RasterLayer<RasterSymbology>;

    sources: Observable<Array<MappingSource>>;
    ebv: Observable<Array<MappingSourceRasterLayer>>;
    @ViewChild('timestartselect') time_start_select: MatSelect;
    @ViewChild('timeendselect') time_end_select: MatSelect;
    bottomContainerHeight$ = new BehaviorSubject<number>(0);
    windowHeight$ = new BehaviorSubject<number>(window.innerHeight);
    aggregation_fn = 'sum';
    time_min = 2001;
    time_max = 2012;
    time_start = this.time_min;
    time_end = this.time_max;
    years_start$ = new BehaviorSubject(range(this.time_min, this.time_max));
    years_end$ = new BehaviorSubject(range(this.time_min + 1, this.time_max + 1));
    geobon_source: MappingSource;

    plot: Plot = undefined;
    plotData$ = new ReplaySubject<PlotData>(1);
    plotDataState$ = new ReplaySubject<LoadingState>(1);
    private plotSubscription: Subscription;

    constructor(private formBuilder: FormBuilder,
                private projectService: ProjectService,
                private userService: UserService,
                private layoutService: LayoutService,
                private config: Config,
                private mappingQueryService: MappingQueryService,
                private notificationService: NotificationService,
                private dialog: MatDialog) {
        this.sources = this.userService.getRasterSourcesStream();
    }

    ngOnInit() {
        this.sources.subscribe(sources => {
            for (let i in sources) {
                let s = sources[i];
                if (s.name === 'GlobalForestChange') {
                    this.ebv = observableOf(s.rasterLayer);
                    this.geobon_source = s;
                }
            }
        });
        this.bottomContainerHeight$.next(LayoutService.calculateLayerDetailViewHeight(4 / 10, window.innerHeight));
    }

    ngAfterViewInit() {
        this.time_start_select.valueChange.subscribe(value => {
            this.years_end$.next(range(value + 1, this.time_max + 1));
        });
        this.time_end_select.valueChange.subscribe(value => {
            this.years_start$.next(range(this.time_min, value));
        })
    }

    setCountryLayer(layer: VectorLayer<ComplexVectorSymbology>) {
        // if (this.countryLayer !== null) {
        //     this.projectService.removeLayer(this.countryLayer);
        // }
        this.countryLayer = layer;
        // this.projectService.addLayer(this.countryLayer);
    }

    setEBVLayer(channel: MappingSourceRasterLayer) {
        const unit: Unit = channel.unit;
        const mappingTransformation = channel.transform;
        const doTransform = channel.hasTransform;

        let operator = this.createGdalSourceOperator(channel, doTransform);

        let colorizerConfig = channel.colorizer;
        if (doTransform) {
            colorizerConfig = SourceDatasetComponent.createAndTransformColorizer(colorizerConfig, mappingTransformation);
        }

        const layer = new RasterLayer({
            name: channel.name,
            operator: operator,
            symbology: new MappingColorizerRasterSymbology({
                unit: (doTransform) ? channel.transform.unit : unit,
                colorizer: colorizerConfig,
            }),
        });
        // if (this.ebvLayer !== null) {
        //     this.projectService.removeLayer(this.ebvLayer);
        // }
        this.ebvLayer = layer;
        // this.projectService.addLayer(this.ebvLayer);
    }

    reload() {
        this.projectService.clearLayers();
        this.projectService.addLayer(this.ebvLayer);
        this.projectService.addLayer(this.countryLayer);
        const countryOperator: Operator = this.countryLayer.operator;

        // console.log(this.countryLayer);
        const clippedLayer = this.addClip(countryOperator, this.ebvLayer);

//         console.log(clippedLayer.operator.resultType);
//         const operator_country: Operator = new Operator({
//             operatorType: new RScriptType({
//                 // code: this.code(this.countryLayer.name, this.ebvLayer.name),
//                 code: `library(ggplot2);
// values = c()
// rect = mapping.qrect
// if (rect$crs == "EPSG:3857") {
//   xmin = -20026376.39
//   xmax = 20026376.39
//   ymin = -20048966.10
//   ymax = 20048966.10
// }else {
//   xmin = -180
//   xmax = 180
//   ymin = -90
//   ymax = 180
// }
// xres = rect$xres
// yres = rect$yres
// rect$xres = 0
// rect$yres = 0
// rect$x1 = xmin
// rect$x2 = xmax
// rect$y1 = ymin
// rect$y2 = ymax
// c_layer = mapping.loadPolygons(0, rect)
// rect$xres = xres
// rect$yres = yres
// c_extent = extent(c_layer)
// dates = ${this.time_start}:${this.time_end}
// for (date in sprintf("%d-01-01", dates)) {
//   t1 = as.numeric(as.POSIXct(date, format="%Y-%m-%d"))
//   rect$x1 = xmin(c_extent)
//   rect$x2 = xmax(c_extent)
//   rect$y1 = ymin(c_extent)
//   rect$y2 = ymax(c_extent)
//   rect$t1 = t1
//   rect$t2 = t1 + 0.000001
//   data = mapping.loadRaster(0, rect)
//   value = cellStats(data, stat="sum")
//   pixels = sum(!is.na(getValues(data)))
//   percentage = value / pixels
//   values = c(values, percentage)
// }
// df = data.frame(dates, values)
// p = (
//         ggplot(df, aes(x=dates,y=values))
//         + geom_area(fill="red", alpha=.6)
//         + geom_line()
//         + geom_point()
//         + expand_limits(y=0)
//         + xlab("Year")
//         + ylab("")
//         + ggtitle(\"${this.countryLayer.name}\")
//         + theme(text = element_text(size=20)) +
//         scale_y_continuous(labels = scales::percent) +
//         scale_x_continuous(breaks = dates)
// )
// print(p)`,
//                 resultType: ResultTypes.PLOT,
//             }),
//             resultType: ResultTypes.PLOT,
//             projection: clippedLayer.operator.projection,
//             rasterSources: [clippedLayer.operator],
//             polygonSources: [this.countryLayer.operator.getProjectedOperator(clippedLayer.operator.projection)],
//         });
//         const plot_country = new Plot({
//             name: 'local plot',
//             operator: operator_country,
//         });
//
//         this.projectService.addPlot(plot_country);
//
//
//         const operator_global: Operator = new Operator({
//             operatorType: new RScriptType({
//                 // code: this.code('Global', this.ebvLayer.name),
//                 code: `library(ggplot2);
// rect = mapping.qrect
// if (rect$crs == "EPSG:3857") {
//   xmin = -20026376.39
//   xmax = 20026376.39
//   ymin = -20048966.10
//   ymax = 20048966.10
// }else {
//   xmin = -180
//   xmax = 180
//   ymin = -90
//   ymax = 180
// }
// values = c()
// rect$x1 = xmin
// rect$x2 = xmax
// rect$y1 = ymin
// rect$y2 = ymax
// dates = ${this.time_start}:${this.time_end}
// for (date in sprintf("%d-01-01", dates)) {
//   t1 = as.numeric(as.POSIXct(date, format="%Y-%m-%d"))
//   rect$t1 = t1
//   rect$t2 = t1 + 0.000001
//   data = mapping.loadRaster(0, rect)
//   value = cellStats(data, stat="sum")
//   pixels = sum(!is.na(getValues(data)))
//   percentage = value / pixels
//   values = c(values, percentage)
// }
//   df = data.frame(dates, values)
//   p = (
//     ggplot(df, aes(x=dates,y=values))
//     + geom_area(fill="red", alpha=.6)
//     + geom_line()
//     + geom_point()
//     + expand_limits(y=0)
//     + xlab("Year")
//     + ylab("")
//     + ggtitle("Global")
//     + theme(text = element_text(size=20)) +
//       scale_y_continuous(labels = scales::percent) +
//       scale_x_continuous(breaks = dates)
//   )
// print(p)`,
//                 resultType: ResultTypes.PLOT,
//             }),
//             resultType: ResultTypes.PLOT,
//             projection: this.ebvLayer.operator.projection,
//             rasterSources: [this.ebvLayer.operator],
//         });
//         const plot_global = new Plot({
//             name: 'global plot',
//             operator: operator_global,
//         });
//
//         this.projectService.addPlot(plot_global);

        this.addComparisonPlot(clippedLayer, this.countryLayer.name, this.ebvLayer.name);
    }

    code(title: string, layer_name: string): string {
        return `library(ggplot2);
            values = c()
            dates = ${this.time_start}:${this.time_end}
for (date in sprintf("%d-01-01", dates)) {
  t1 = as.numeric(as.POSIXct(date, format="%Y-%m-%d"))
  rect = mapping.qrect
  rect$t1 = t1
  rect$t2 = t1 + 0.000001
  #print(rect$t1)
  data = mapping.loadRaster(0, rect)
  value = cellStats(data, stat="${this.aggregation_fn}")
  pixels = sum(!is.na(getValues(data)))
  percentage = value / pixels
  values = c(values, percentage)
}
df = data.frame(dates, values)
p = (
        ggplot(df, aes(x=dates,y=values))
        + geom_area(fill="red", alpha=.6)
        + geom_line()
        + geom_point()
        + expand_limits(y=0)
        + xlab("Year")
        + ylab(\"${layer_name}\")
        + ggtitle(\"${title}\")
        + theme(text = element_text(size=20)) +
        scale_y_continuous(labels = scales::percent) +
        scale_x_continuous(breaks = dates)
)
print(p)`;
    }

    addComparisonPlot(clippedLayer: RasterLayer<RasterSymbology>, title: string, layer_name: string) {
        let cellStats_fn = (this.aggregation_fn !== 'mean') ? 'sum' : 'mean';
        let pixels = function(i: number, aggregation: string) {
            return (aggregation === 'fraction') ? 'sum(!is.na(getValues(data' + i + ')))' : 1;
        };
        let theme = '';
        if (this.aggregation_fn === 'fraction') {
            theme = '        + scale_y_continuous(labels = scales::percent) +\n        scale_x_continuous(breaks = dates)'
        }
        const operator: Operator = new Operator({
            operatorType: new RScriptType({
                code: `library(ggplot2)
values0 = c()
values1 = c()
rect = mapping.qrect
if (rect$crs == "EPSG:3857") {
  xmin = -20026376.39
  xmax = 20026376.39
  ymin = -20048966.10
  ymax = 20048966.10
}else {
  xmin = -180
  xmax = 180
  ymin = -90
  ymax = 180
}
xres = rect$xres
yres = rect$yres
rect$xres = 0
rect$yres = 0
rect$x1 = xmin
rect$x2 = xmax
rect$y1 = ymin
rect$y2 = ymax
c_layer = mapping.loadPolygons(0, rect)
rect$xres = xres
rect$yres = yres
c_extent = extent(c_layer)
dates = ${this.time_start}:${this.time_end}
for (date in sprintf("%d-01-01", dates)) {
  t1 = as.numeric(as.POSIXct(date, format="%Y-%m-%d"))
  rect = mapping.qrect
  rect$t1 = t1
  rect$t2 = t1 + 0.000001
  rect$x1 = xmin(c_extent)
  rect$x2 = xmax(c_extent)
  rect$y1 = ymin(c_extent)
  rect$y2 = ymax(c_extent)
  data0 = mapping.loadRaster(0, rect)
  value = cellStats(data0, stat="${cellStats_fn}")
  pixels = ${pixels(0, this.aggregation_fn)}
  percentage = value / pixels
  values0 = c(values0, percentage)
  rect$x1 = xmin
  rect$x2 = xmax
  rect$y1 = ymin
  rect$y2 = ymax
  data1 = mapping.loadRaster(1, rect)
  value = cellStats(data1, stat="${cellStats_fn}")
  pixels = ${pixels(1, this.aggregation_fn)}
  percentage = value / pixels
  values1 = c(values1, percentage)
}
df = data.frame(dates, global = values1, ${title} = values0)
df = reshape2::melt(df, id.var='dates')
p = (
        ggplot(df, aes(x = dates, y = value, col = variable, fill = variable))
        #+ geom_area()
        + geom_line()
        + geom_point()
        + expand_limits(y=0)
        + xlab("Year")
        + ylab(\"${layer_name}\")
        + ggtitle("${title} - global")
        + theme(text = element_text(size=20))
        ${theme}
)
print(p)`,
                resultType: ResultTypes.PLOT,
            }),
            resultType: ResultTypes.PLOT,
            projection: clippedLayer.operator.projection,
            rasterSources: [clippedLayer.operator, this.ebvLayer.operator],
            polygonSources: [this.countryLayer.operator.getProjectedOperator(this.ebvLayer.operator.projection)],
        });

        this.plot = new Plot({
            name: 'Comparison',
            operator: operator,
        });

        if (this.plotSubscription) {
            this.plotSubscription.unsubscribe();
        }
        this.plotSubscription = this.createPlotSubscription(this.plot, this.plotData$, this.plotDataState$);
    }

    private createPlotSubscription(plot: Plot, data$: Observer<PlotData>, loadingState$: Observer<LoadingState>): Subscription {
        const time = new TimeInterval(moment([this.time_start]), moment([this.time_end]));

        return this.layoutService.getSidenavWidthStream().pipe(
            debounceTime(this.config.DELAYS.DEBOUNCE),
            tap(() => loadingState$.next(LoadingState.LOADING)),
            switchMap((sidenavWidth) => {
                const buttonWidth = 0; // 56; // px
                const margin = 2 * LayoutService.remInPx() + buttonWidth;
                let plotWidth = sidenavWidth - margin;
                let plotHeight = sidenavWidth - margin;

                return this.mappingQueryService.getPlotData({
                    operator: plot.operator,
                    time: time,
                    extent: plot.operator.projection.getExtent(),
                    projection: plot.operator.projection,
                    plotWidth: plotWidth,
                    plotHeight: plotHeight,
                });
            }),
            tap(
                () => loadingState$.next(LoadingState.OK),
                (reason: Response) => {
                    this.notificationService.error(`${plot.name}: ${reason.status} ${reason.statusText}`);
                    loadingState$.next(LoadingState.ERROR);
                }
            ),
        ).subscribe(
            data => data$.next(data),
            error => error // ignore error
        );
    }

    showFullscreenPlot(plot: Plot) {
        this.plotData$.pipe(first()).subscribe(plotData => {
            this.dialog.open(
                PlotDetailViewComponent,
                {
                    data: {
                        plot: plot,
                        initialPlotData: plotData,
                        time: new TimeInterval(moment([this.time_start]), moment([this.time_end])),
                    } as PlotDetailViewData,
                    maxHeight: '100vh',
                    maxWidth: '100vw',
                },
            );
        });
    }

    addClip(polygonOperator: Operator, rasterLayer: RasterLayer<RasterSymbology>): RasterLayer<RasterSymbology> {
        const rasterOperator: Operator = rasterLayer.operator;

        const name: string = 'clip';

        const rasterizePolygonOperator = new Operator({
            operatorType: new RasterizePolygonType({}),
            resultType: ResultTypes.RASTER,
            projection: rasterOperator.projection,
            attributes: rasterOperator.attributes,
            dataTypes: rasterOperator.dataTypes,
            units: rasterOperator.units,
            polygonSources: [polygonOperator],
        });

        const expressionOperator = new Operator({
            operatorType: new ExpressionType({
                expression: `B > 0 ? A : NAN`,
                datatype: rasterOperator.getDataType('value'),
                unit: rasterOperator.getUnit('value'),
            }),
            resultType: ResultTypes.RASTER,
            projection: rasterOperator.projection,
            attributes: rasterOperator.attributes,
            dataTypes: rasterOperator.dataTypes,
            units: rasterOperator.units,
            rasterSources: [rasterOperator, rasterizePolygonOperator],
        });
        const layer = new RasterLayer({
            name: name,
            operator: expressionOperator,
            symbology: rasterLayer.symbology,
        });
        return layer;
    }


    createGdalSourceOperator(channel: MappingSourceRasterLayer, doTransform: boolean): Operator {
        const sourceDataType = channel.datatype;
        const sourceUnit: Unit = channel.unit;
        let sourceProjection: Projection;
        if (channel.coords.crs) {
            sourceProjection = Projections.fromCode(channel.coords.crs);
        } else {
            throw new Error('No projection or EPSG code defined in [GEO BON]. channel.id: ' + channel.id);
        }

        const operatorType = new GdalSourceType({
            channel: channel.id,
            sourcename: 'GEO BON',
            transform: doTransform, // TODO: user selectable transform?
        });

        const sourceOperator = new Operator({
            operatorType: operatorType,
            resultType: ResultTypes.RASTER,
            projection: sourceProjection,
            attributes: ['value'],
            dataTypes: new Map<string, DataType>().set('value', DataTypes.fromCode(sourceDataType)),
            units: new Map<string, Unit>().set('value', sourceUnit),
        });

        // console.log('doTransform', doTransform, 'unit', sourceUnit, 'expression', 'A', 'datatype', sourceDataType, 'channel', channel);
        if (doTransform && channel.hasTransform) {
            const transformUnit = channel.transform.unit;
            const transformDatatype = DataTypes.fromCode(channel.transform.datatype);

            const transformOperatorType = new ExpressionType({
                unit: transformUnit,
                expression: '(A -' + channel.transform.offset.toString() + ') *' + channel.transform.scale.toString(),
                datatype: transformDatatype,
            });

            const transformOperator = new Operator({
                operatorType: transformOperatorType,
                resultType: ResultTypes.RASTER,
                projection: sourceProjection,
                attributes: ['value'],
                dataTypes: new Map<string, DataType>().set('value', transformDatatype),
                units: new Map<string, Unit>().set('value', transformUnit),
                rasterSources: [sourceOperator],
            });
            return transformOperator;
        }

        return sourceOperator;
    }
}
class ChannelDataSource extends DataSource<MappingSourceRasterLayer> {
    private channels: Array<MappingSourceRasterLayer>;

    constructor(channels: Array<MappingSourceRasterLayer>) {
        super();
        this.channels = channels;
    }

    connect(): Observable<Array<MappingSourceRasterLayer>> {
        return observableOf(this.channels);
    }

    disconnect() {
    }
}
