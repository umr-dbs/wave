import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {RasterLayer, VectorLayer} from '../../layers/layer.model';
import {ProjectService} from '../../project/project.service';
import {ComplexVectorSymbology, MappingColorizerRasterSymbology, RasterSymbology} from '../../layers/symbology/symbology.model';
import {Operator} from '../../operators/operator.model';
import {ResultTypes} from '../../operators/result-type.model';
import {Plot, PlotData} from '../../plots/plot.model';
import {RScriptType} from '../../operators/types/r-script-type.model';
import {RasterizePolygonType} from '../../operators/types/rasterize-polygon-type.model';
import {ExpressionType} from '../../operators/types/expression-type.model';
import {UserService} from '../../users/user.service';
import {BehaviorSubject, Observable, Observer, of as observableOf, ReplaySubject, Subscription} from 'rxjs';
import {MappingSource, MappingSourceRasterLayer} from '../../operators/dialogs/data-repository/mapping-source.model';
import {DataSource} from '@angular/cdk/collections';
import {Unit} from '../../operators/unit.model';
import {GdalSourceType} from '../../operators/types/gdal-source-type.model';
import {SourceDatasetComponent} from '../../operators/dialogs/data-repository/raster/source-dataset.component';
import {Projection, Projections} from '../../operators/projection.model';
import {DataType, DataTypes} from '../../operators/datatype.model';
import {LayoutService} from '../../layout.service';
import {range} from 'd3';
import {MatDialog, MatSelect} from '@angular/material';
import {LoadingState} from '../../project/loading-state.model';
import {debounceTime, first, map, switchMap, tap} from 'rxjs/operators';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EBVComponent implements OnInit, AfterViewInit {

    // make available in template
    public LoadingState = LoadingState;
    //

    sources: Observable<Array<MappingSource>>;
    selectedSource: MappingSource;

    ebvLayers = new BehaviorSubject<Array<MappingSourceRasterLayer>>([]);
    ebvLayer: RasterLayer<RasterSymbology>;

    countryLayer: VectorLayer<ComplexVectorSymbology>;
    isCountryLayer = true;

    @ViewChild('timestartselect') time_start_select: MatSelect;
    @ViewChild('timeendselect') time_end_select: MatSelect;
    bottomContainerHeight$ = new BehaviorSubject<number>(0);
    // windowHeight$ = new BehaviorSubject<number>(window.innerHeight);
    aggregation_fn = 'sum';
    time_min = 2001;
    time_max = 2012;
    time_start = this.time_min;
    time_end = this.time_max;
    years_start$ = new BehaviorSubject(range(this.time_min, this.time_max));
    years_end$ = new BehaviorSubject(range(this.time_min + 1, this.time_max + 1));

    plot: Plot = undefined;
    plotData$ = new ReplaySubject<PlotData>(1);
    plotDataState$ = new ReplaySubject<LoadingState>(1);
    private plotSubscription: Subscription;
    private ebvChannel: MappingSourceRasterLayer;

    constructor(private formBuilder: FormBuilder,
                private projectService: ProjectService,
                private userService: UserService,
                private layoutService: LayoutService,
                private config: Config,
                private mappingQueryService: MappingQueryService,
                private notificationService: NotificationService,
                private dialog: MatDialog,
                private changeDetector: ChangeDetectorRef) {
        this.sources = this.userService.getRasterSourcesStream().pipe(
            map((sourceList: Array<MappingSource>) => sourceList.filter(source => source.tags && source.tags.indexOf('GEOBON') >= 0))
        );
    }

    ngOnInit() {
        this.bottomContainerHeight$.next(LayoutService.calculateLayerDetailViewHeight(4 / 10, window.innerHeight));
    }

    ngAfterViewInit() {
        this.time_start_select.valueChange.subscribe(value => {
            // console.log("TRIGGERED 1!", this.time_max);
            this.years_end$.next(range(value + 1, this.time_max + 1));
        });
        this.time_end_select.valueChange.subscribe(value => {
            // console.log("TRIGGERED 2!", this.time_min);
            this.years_start$.next(range(this.time_min, value));
        })
    }

    selectSource(source: MappingSource) {
        this.selectedSource = source;
        this.ebvLayers.next(
            source.rasterLayer
        );
        this.ebvLayer = undefined;
    }

    setCountryLayer(layer: VectorLayer<ComplexVectorSymbology> | string) {
        this.isCountryLayer = !(typeof layer === 'string');
        if (this.isCountryLayer) {
            this.countryLayer = (layer as VectorLayer<ComplexVectorSymbology>);
        }
        this.showLayersOnMap();
    }

    selectEBVLayer(channel: MappingSourceRasterLayer) {

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
        this.ebvLayer = layer;
        this.ebvChannel = channel;

        this.time_min = channel.time_start ? channel.time_start.year() : this.selectedSource.time_start ? this.selectedSource.time_start.year() : 1900;
        this.time_max = channel.time_end ? channel.time_end.year() : this.selectedSource.time_end ? this.selectedSource.time_end.year() : 2018;

        console.log(this.time_min, this.time_max, this.time_start, this.time_end);

        this.years_start$.next(range(this.time_min, this.time_max));
        this.years_end$.next(range(this.time_min + 1, this.time_max + 1));

        const time_start = Math.min(Math.max(this.time_start, this.time_min), this.time_max - 1);
        let time_end = Math.max(Math.min(this.time_end, this.time_max), this.time_min + 1);

        if (time_end <= time_start) {
            time_end = time_start + 1;
        }

        this.time_start = time_start;
        this.time_end = time_end;

        setTimeout(() => {
            this.changeDetector.markForCheck();

            this.time_start_select.valueChange.emit(time_start);
            this.time_end_select.valueChange.emit(time_end);

            setTimeout(() => console.log(this.time_start, this.time_end));
        });

        // show ebv on map
        this.showLayersOnMap();
    }

    reload() {
        // this.projectService.clearLayers();
        // setTimeout(() => {
        //     this.projectService.addLayer(this.ebvLayer);
        //     this.projectService.addLayer(this.countryLayer);
        // });
        //
        // this.projectService.setTimeMin(this.time_min);
        // this.projectService.setTimeMax(this.time_max);
        // this.projectService.setSelectedTime(this.time_min + Math.round(this.time_max - this.time_min) / 2);

        // console.log(this.countryLayer);
        const clippedLayer = this.isCountryLayer ? this.addClip(this.countryLayer.operator, this.ebvLayer) : null;

        this.addComparisonPlot(clippedLayer, this.isCountryLayer ? this.countryLayer.name : 'Global', this.ebvLayer.name);
    }

    addComparisonPlot(clippedLayer: RasterLayer<RasterSymbology>, title: string, layer_name: string) {
        let cellStats_fn = (this.aggregation_fn !== 'mean') ? 'sum' : 'mean';
        let pixels = function (aggregation: string) {
            return (aggregation === 'fraction') ? 'sum(!is.na(getValues(data)))' : 1;
        };
        let theme = '';
        if (this.aggregation_fn === 'fraction') {
            theme = '        + scale_y_continuous(labels = scales::percent) +\n        scale_x_continuous(breaks = dates)'
        }
        const polygon = (this.isCountryLayer ? `
c_layer = mapping.loadPolygons(0, rect)
rect$xres = xres
rect$yres = yres
c_extent = extent(c_layer)` : '');
        const extent = this.isCountryLayer ? '(c_extent)' : '';

        let dates = '';
        if(this.ebvChannel.time_interval && this.ebvChannel.time_interval.unit.toLowerCase() === "year") {
            dates = `dates = seq(
  floor((${this.time_start}-${this.selectedSource.time_start.year()})/${this.ebvChannel.time_interval.value})*${this.ebvChannel.time_interval.value} + ${this.selectedSource.time_start.year()}, 
  ceiling((${this.time_end}-${this.selectedSource.time_start.year()})/${this.ebvChannel.time_interval.value})*${this.ebvChannel.time_interval.value} + ${this.selectedSource.time_start.year()}, 
${this.ebvChannel.time_interval.value})
dates[length(dates)] = min(dates[length(dates)], ${this.selectedSource.time_end.year()})`;
        } else {
            dates = `dates = ${this.time_start}:${this.time_end}`;
        }


        const operator: Operator = new Operator({
            operatorType: new RScriptType({
                code: `library(ggplot2)
values = c()
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
rect$y2 = ymax${polygon}
${dates}
for (date in sprintf("%d-01-01", dates)) {
  t1 = as.numeric(as.POSIXct(date, format="%Y-%m-%d", tz="GMT"))
  rect = mapping.qrect
  rect$t1 = t1
  rect$t2 = t1 + 0.000001
  rect$x1 = xmin${extent}
  rect$x2 = xmax${extent}
  rect$y1 = ymin${extent}
  rect$y2 = ymax${extent}
  data = mapping.loadRaster(0, rect)
  value = cellStats(data, stat="${cellStats_fn}", na.rm=TRUE)
  pixels = ${pixels(this.aggregation_fn)}
  percentage = value / pixels
  values = c(values, percentage)
}
df = data.frame(dates, values)
p = (
        ggplot(df, aes(x = dates, y = values))
        #+ geom_area()
        + geom_line()
        + geom_point()
        + expand_limits(y=0)
        + xlab("Year")
        + ylab(\"${layer_name}\")
        + scale_x_continuous(breaks = scales::pretty_breaks()(${this.time_start}:${this.time_end}))
        + coord_cartesian(xlim = c(${this.time_start},${this.time_end}))
        + ggtitle("${title} - ${this.aggregation_fn}")
        + theme(title = element_text(colour="black", size=20),
        axis.text.x = element_text(colour="grey20",size=12,angle=90,hjust=.5,vjust=.5,face="plain"),
        axis.text.y = element_text(colour="grey20",size=12,angle=0,hjust=1,vjust=0,face="plain"),
        axis.title.x = element_text(colour="grey20",size=12,angle=0,hjust=.5,vjust=0,face="plain"),
        axis.title.y = element_text(colour="grey20",size=12,angle=90,hjust=.5,vjust=.5,face="plain"))
        ${theme}
)
print(p)`,
                resultType: ResultTypes.PLOT,
            }),
            resultType: ResultTypes.PLOT,
            projection: this.isCountryLayer ? clippedLayer.operator.projection : this.ebvLayer.operator.projection,
            rasterSources: [this.isCountryLayer ? clippedLayer.operator : this.ebvLayer.operator],
            polygonSources: this.isCountryLayer ? [this.countryLayer.operator.getProjectedOperator(this.ebvLayer.operator.projection)] : [],
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
        const time = new TimeInterval(moment.utc([this.time_start]), moment.utc([this.time_end]));

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
                        time: new TimeInterval(moment.utc([this.time_start]), moment.utc([this.time_end])),
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
            sourcename: this.selectedSource.name,
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


    private showLayersOnMap() {
        this.projectService.clearLayers();
        setTimeout(() => {
            if (this.ebvLayer) {
                this.projectService.addLayer(this.ebvLayer);

                const currentYear = this.projectService.getSelectedTime();

                this.projectService.setTimeMin(this.time_min);
                this.projectService.setTimeMax(this.time_max);

                if (currentYear < this.time_min || currentYear > this.time_max) {
                    this.projectService.setSelectedTime(this.time_min + Math.round(this.time_max - this.time_min) / 2);
                }
            }
            if (this.countryLayer && this.isCountryLayer) {
                this.projectService.addLayer(this.countryLayer);
            }
        });
    }

}
