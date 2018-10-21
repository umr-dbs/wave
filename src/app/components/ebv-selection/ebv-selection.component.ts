
import {Component, OnInit, ChangeDetectionStrategy, AfterViewInit, ViewChild} from '@angular/core';
import {FormGroup, FormBuilder, Validators} from '@angular/forms';
import {VectorLayer, RasterLayer, Layer} from '../../layers/layer.model';
import {ProjectService} from '../../project/project.service';
import {ComplexVectorSymbology} from "../../layers/symbology/symbology.model";
import {Operator} from "../../operators/operator.model";
import {ResultTypes} from "../../operators/result-type.model";
import {Plot} from "../../plots/plot.model";
import {RScriptType} from "../../operators/types/r-script-type.model";
import {TimeSelectionComponent} from "../time-selection/time-selection.component";


@Component({
    selector: 'wave-ebv-selection',
    templateUrl: 'ebv-selection.component.html',
    styleUrls: ['ebv-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EBVComponent implements OnInit, AfterViewInit {

    form: FormGroup;
    countryLayer: VectorLayer<ComplexVectorSymbology>;
    ebvLayer: Layer;

    ebv = [];
    @ViewChild('time') time: TimeSelectionComponent;

    constructor(private formBuilder: FormBuilder,
                private projectService: ProjectService) {
        this.form = this.formBuilder.group({
            loginAuthority: ['gfbio', Validators.required],
            password: ['', Validators.required],
            staySignedIn: [true, Validators.required],
        });
    }

    ngOnInit() {
    }

    ngAfterViewInit() {
        // do this once for observables
        setTimeout(() => this.form.updateValueAndValidity(), 0);
    }

    setCountryLayer(layer: VectorLayer) {
        if (this.countryLayer !== null) {
            this.projectService.removeLayer(this.countryLayer);
        }
        this.projectService.addLayer(this.countryLayer = layer);
    }

    setEBVLayer(layer: RasterLayer) {
        if (this.ebvLayer !== null) {
            this.projectService.removeLayer(this.ebvLayer);
        }
        this.projectService.addLayer(this.ebvLayer = layer);
    }

    reload() {
        this.projectService.clearPlots();
        const countryOperator: Operator = this.countryLayer.operator;

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
                resultType: countryOperator.resultType,
            }),
            resultType: ResultTypes.PLOT,
            projection: countryOperator.projection,
            pointSources: undefined,
            lineSources: undefined,
            polygonSources: [countryOperator],
        });
        const plot_country = new Plot({
            name: 'local plot',
            operator: operator_country,
        });

        this.projectService.addPlot(plot_country);
    }
}
