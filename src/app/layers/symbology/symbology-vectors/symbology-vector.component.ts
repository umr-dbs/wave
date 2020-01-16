import {Component, Input, Output, EventEmitter, OnChanges, OnInit, SimpleChanges} from '@angular/core';

import {ComplexPointSymbology, ComplexVectorSymbology, IconSymbology, SymbologyType} from '../symbology.model';
import {MatSliderChange, MatSlideToggleChange} from '@angular/material';
import {ColorBreakpoint} from '../../../colors/color-breakpoint.model';
import {VectorLayer} from '../../layer.model';
import {DataTypes} from '../../../operators/datatype.model';
import {ColorizerData} from '../../../colors/colorizer-data.model';
import {MatSelectionListChange} from '@angular/material/list';
import {MatOptionSelectionChange} from '@angular/material/core';
import {MatSelectChange} from '@angular/material/select';

interface Attribute {
    name: string,
    type: 'number' | 'text',
}

interface IconAttribute {
    name: string,
    uri: string,
}

@Component({
    selector: 'wave-symbology-vector',
    templateUrl: `symbology-vector.component.html`,
    styleUrls: [
        './symbology-vector.component.scss'
    ],
})
export class SymbologyVectorComponent implements OnChanges, OnInit {

    static minStrokeWidth = 0;
    static minRadius = 1;

    @Input() editRadius = true;
    @Input() editStrokeWidth = true;
    @Input() layer: VectorLayer<ComplexPointSymbology> | VectorLayer<ComplexVectorSymbology> | VectorLayer<IconSymbology>;
    @Output('symbologyChanged') symbologyChanged = new EventEmitter<ComplexPointSymbology | ComplexVectorSymbology | IconSymbology>();

    _symbology: ComplexPointSymbology | ComplexVectorSymbology | IconSymbology;

    @Input()
    set symbology(symbology: ComplexPointSymbology | ComplexVectorSymbology | IconSymbology) {
        // console.log('SymbologyPointsComponent', 'set symbology');
        if (symbology && !symbology.equals(this._symbology)) {
            this._symbology = symbology; // TODO: figure out if this should clone;
            this.displayAsIcon = symbology.getSymbologyType() === SymbologyType.ICON_POINT;
            // console.log('SymbologyPointsComponent', 'set symbology', 'replaced');
        }
    }

    get symbology(): ComplexPointSymbology | ComplexVectorSymbology | IconSymbology {
        return this._symbology;
    }

    displayAsIcon = this._symbology !== undefined && this._symbology.getSymbologyType() === SymbologyType.ICON_POINT;
    colorizeByAttribute = false;
    compareFn = (t1, t2) => {
        return t1 === t2.uri;
    };
    findIconByURI = (uri) => {
        return this.iconAttributes.find(attr => (attr.uri === uri));
    };
    attribute: Attribute;
    attributes: Array<Attribute>;
    iconAttributes: Array<IconAttribute> = [{
            'name': 'Happy Whale',
            'uri': 'assets/icons/happyWhale.png'
        },
        {
            'name': 'Sad Whale',
            'uri': 'assets/icons/sadWhale.png'
        }];

    constructor() {}

    ngOnChanges(changes: SimpleChanges) {
        // console.log('SymbologyPointsComponent', 'ngOnChanges', changes, this);

        for (let propName in changes) { // tslint:disable-line:forin
            switch (propName) {
                case 'layer':
                    this.updateSymbologyFromLayer();
                    break;
                case 'editRadius':
                default:
                // DO NOTHING
            }
        }
    }

    ngOnInit() {
        // console.log('SymbologyPointsComponent', 'ngOnInit', this);
    }

    setColorizerAttribute() {
        if (this.colorizeByAttribute && this.attribute) {
            this.symbology.setColorAttribute(this.attribute.name);
            this.symbology.colorizer.clear();
            this.symbology.colorizer.addBreakpoint({
                rgba: this.symbology.fillRGBA,
                value: (this.attribute.type === 'number') ? 0 : '',
            });
        } else {
            this.symbology.unSetColorAttribute();
        }
    }

    updateColorizeByAttribute(event: MatSlideToggleChange) {
        this.colorizeByAttribute = event.checked;
        this.setColorizerAttribute();
    }

    updateDisplayAsIcon(event: MatSlideToggleChange) {
        this.displayAsIcon = event.checked;
        let config = this._symbology.toDict();
        if (this.displayAsIcon) {
            config.symbologyType = SymbologyType[SymbologyType.ICON_POINT];
            this._symbology = IconSymbology.fromDict(config) as IconSymbology;
        } else {
            config.symbologyType = SymbologyType[SymbologyType.COMPLEX_POINT];
            this._symbology = ComplexPointSymbology.fromDict(config) as ComplexPointSymbology;
        }
        this.update();
    }

    updateSymbologyFromLayer() {
        this.symbology = this.layer.symbology;
        this.colorizeByAttribute = !!this.symbology.colorAttribute;
        this.gatherAttributes();
        this.attribute = this.attributes.find(x => x.name === this.symbology.colorAttribute);
    }

    gatherAttributes() {
        // console.log('gatherAttributes', this.layer.operator.dataTypes);
        let attributes: Array<Attribute> = [];
        this.layer.operator.dataTypes.forEach((datatype, attribute) => {
            // console.log('gatherAttributes', attribute, datatype);

            if (DataTypes.ALL_NUMERICS.indexOf(datatype) >= 0) {
                attributes.push({
                    name: attribute,
                    type: 'number',
                });
            } else {
                attributes.push({
                    name: attribute,
                    type: 'text',
                });
            }
        });
        this.attributes = attributes;
    }

    update() {
       // return a clone (immutablility)
        this.symbologyChanged.emit(this.symbology.clone());
    }

    updateIconUrl(event: MatSelectChange) {
        this.symbology['uri'] = event.value;
        this.update();
    }

    updateRotation(event: MatSliderChange) {
        this.symbology['rotation'] = event.value;
        this.update();
    }

    updateOpacity(event: MatSliderChange) {
        this.symbology['opacity'] = event.value;
        this.update();
    }

    updateIconColor(fill: ColorBreakpoint) {
        // console.log('SymbologyPointsComponent', 'updateFill', fill);
        if (fill && fill !== this.symbology['color']) {
            (this.symbology as IconSymbology).iconColorBreakpoint = fill;
            this.update();
        }
    }

    updateScale(event: MatSliderChange) {
        this.symbology['scale'] = event.value;
        this.update();
    }

    updateStrokeWidth(event: MatSliderChange) {
        // guard against negative values
        if (this.symbology.strokeWidth < SymbologyVectorComponent.minStrokeWidth) {
            this.symbology.strokeWidth = SymbologyVectorComponent.minStrokeWidth;
        }

        this.symbology.strokeWidth = event.value;
        this.update();
    }

    updateRadius(event: MatSliderChange) {

        if (this.symbology instanceof ComplexPointSymbology && this.editRadius) {
            this.symbology.radius = event.value;

            if (this.symbology.radius < SymbologyVectorComponent.minRadius) {
                this.symbology.radius = SymbologyVectorComponent.minRadius;
            }
        } else {
            console.error('SymbologyVectorComponent: cant change radius for non point symbology');
        }

        this.update();
    }

    updateFill(fill: ColorBreakpoint) {
        // console.log('SymbologyPointsComponent', 'updateFill', fill);
        if (fill && fill !== this.symbology.fillColorBreakpoint) {
            this.symbology.setFillColorBreakpoint(fill);
            this.update();
        }
    }

    updateStroke(stroke: ColorBreakpoint) {
        // console.log('SymbologyPointsComponent', 'updateStroke', stroke);
        if (stroke && stroke !== this.symbology.strokeColorBreakpoint) {
            this.symbology.setStrokeColorBreakpoint(stroke);
            this.update();
        }
    }

    updateColorizer(event: ColorizerData) {
        if (event && this.symbology) {
            // console.log('SymbologyPointsComponent', 'updateColorizer', event);
            this.symbology.setOrUpdateColorizer(event);
            this.update();
        }
    }
}
