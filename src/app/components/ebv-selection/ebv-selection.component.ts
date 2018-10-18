
import {Component, OnInit, ChangeDetectionStrategy, AfterViewInit} from '@angular/core';
import {FormGroup, FormBuilder, Validators} from '@angular/forms';
import {VectorLayer, RasterLayer} from '../../layers/layer.model';
import {ProjectService} from '../../project/project.service';


@Component({
    selector: 'wave-login',
    templateUrl: 'ebv-selection.component.html',
    styleUrls: ['ebv-selection.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EBVComponent implements OnInit, AfterViewInit {

    form: FormGroup;
    countryLayer: VectorLayer;
    ebvLayer: RasterLayer;

    ebv = [];

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
        this.projectService.setLayers([this.countryLayer, this.ebvLayer = layer])
    }

    reload() {

    }
}
