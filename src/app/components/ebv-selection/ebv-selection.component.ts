import {Component, OnInit, ChangeDetectionStrategy, AfterViewInit, ViewChild} from '@angular/core';
import {FormGroup, FormBuilder, Validators} from '@angular/forms';
import {VectorLayer, RasterLayer, Layer} from '../../layers/layer.model';
import {ProjectService} from '../../project/project.service';
import {
    ComplexVectorSymbology, RasterSymbology,
    MappingColorizerRasterSymbology
} from "../../layers/symbology/symbology.model";
import {Operator} from "../../operators/operator.model";
import {ResultTypes} from "../../operators/result-type.model";
import {Plot} from "../../plots/plot.model";
import {RScriptType} from "../../operators/types/r-script-type.model";
import {TimeSelectionComponent} from "../time-selection/time-selection.component";
import {RasterizePolygonType} from '../../operators/types/rasterize-polygon-type.model';
import {ExpressionType} from '../../operators/types/expression-type.model';
import {UserService} from '../../users/user.service';
import {of as observableOf, Observable, BehaviorSubject} from 'rxjs';
import {MappingSource, MappingSourceRasterLayer} from '../../operators/dialogs/data-repository/mapping-source.model';
import {DataSource} from '@angular/cdk/collections';
import {Unit} from '../../operators/unit.model';
import {GdalSourceType} from '../../operators/types/gdal-source-type.model';
import {SourceDatasetComponent} from '../../operators/dialogs/data-repository/raster/source-dataset.component';
import {Projection, Projections} from '../../operators/projection.model';
import {DataType, DataTypes} from '../../operators/datatype.model';


@Component({
    selector: 'wave-ebv-selection',
    templateUrl: 'ebv-selection.component.html',
    styleUrls: ['ebv-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EBVComponent implements OnInit, AfterViewInit {

    countryLayer: VectorLayer<ComplexVectorSymbology>;
    ebvLayer: RasterLayer<RasterSymbology>;

    sources: Observable<Array<MappingSource>>;
    ebv: Observable<Array<MappingSourceRasterLayer>>;
    @ViewChild('time') time: TimeSelectionComponent;

    constructor(private formBuilder: FormBuilder,
                private projectService: ProjectService,
                private userService: UserService) {
        this.sources = this.userService.getRasterSourcesStream();
    }

    ngOnInit() {
        this.sources.subscribe(sources => {
            for(let i in sources) {
                let s = sources[i];
                if(s.name == 'GEO BON') {
                    this.ebv = observableOf(s.rasterLayer);
                }
            }
        })
    }

    ngAfterViewInit() {
    }

    setCountryLayer(layer: VectorLayer<ComplexVectorSymbology>, operator: Operator) {
        if (this.countryLayer !== null) {
            this.projectService.removeLayer(this.countryLayer);
        }
        this.projectService.addLayer(this.countryLayer = layer);
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
        if (this.ebvLayer !== null) {
            this.projectService.removeLayer(this.ebvLayer);
        }
        this.projectService.addLayer(this.ebvLayer = layer);
    }

    reload() {
        this.projectService.clearPlots();
        const countryOperator: Operator = this.countryLayer.operator;

        const clippedLayer = this.addClip(countryOperator, this.ebvLayer);

        const operator_country: Operator = new Operator({
            operatorType: new RScriptType({
                code: `
values = c()

dates = ${this.time.time_start}:${this.time.time_end}
for (date in sprintf("%d-01-01", dates)) {
  t1 = as.numeric(as.POSIXct(date, format="%Y-%m-%d"))
  rect = mapping.qrect
  rect$t1 = t1
  rect$t2 = t1 + 0.000001
  #print(rect$t1)
  data = mapping.loadRaster(0, rect)

  value = cellStats(data, stat="sum")

  pixels = sum(!is.na(getValues(data)))

  percentage = value / pixels

  values = c(values, percentage)
}
#print(values)
df = data.frame(dates, values)

p = (
        ggplot(df, aes(x=dates,y=values))
        + geom_area(fill="red", alpha=.6)
        + geom_line()
        + geom_point()
        + expand_limits(y=0)
        + xlab("Year")
        + ylab("Loss")
        + ggtitle("Forest Loss over Time")
        + theme(text = element_text(size=20)) +
        scale_y_continuous(labels = scales::percent) +
        scale_x_continuous(breaks = dates)
)
print(p)`,
                resultType: clippedLayer.operator.resultType,
            }),
            resultType: ResultTypes.PLOT,
            projection: clippedLayer.operator.projection,
            pointSources: undefined,
            lineSources: undefined,
            polygonSources: [clippedLayer.operator],
        });
        const plot_country = new Plot({
            name: 'local plot',
            operator: operator_country,
        });

        this.projectService.addPlot(plot_country);
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

        this.projectService.addLayer(layer);
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