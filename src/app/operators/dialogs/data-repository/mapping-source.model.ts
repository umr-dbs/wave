import {Unit, UnitMappingDict} from '../../unit.model';
import {MappingRasterColorizerDict} from '../../../colors/colorizer-data.model';
import {IColorizerData} from '../../../colors/colorizer-data.model';
import * as moment from 'moment';

export interface MappingTransform {
  datatype: string;
  offset: number;
  scale: number;
  unit: Unit;
}

export interface ProvenanceInfo {
    uri: string;
    license: string;
    citation: string;
}

export interface TimeInterval {
    unit: string;
    value: number;
}

export interface MappingSourceRasterLayer {
    name: string;
    id: number;
    datatype: string;
    nodata: number;
    unit: Unit;
    colorizer: IColorizerData;
    transform: MappingTransform;
    hasTransform: boolean;
    isSwitchable: boolean;
    missingUnit?: boolean;
    coords: {
        crs: string,
        origin: number[],
        scale: number[],
        size: number[],
    };
    provenance: ProvenanceInfo;
    time_interval: TimeInterval;
    time_start?: moment.Moment;
    time_end?: moment.Moment;
}

export interface MappingSourceVectorLayer {
    name: string;
    id: number | string;
    title: string;
    geometryType: string; // FIXME: this must be the layer type -> POINT, POLYGON, LINE...
    textual: string[];
    numeric: string[];
    coords: {
        crs: string,
    };
    colorizer?: IColorizerData;
    provenance: ProvenanceInfo;
}

export interface MappingSource {
    operator: string;
    source: string;
    name: string;
    rasterLayer?: MappingSourceRasterLayer[];
    vectorLayer?: MappingSourceVectorLayer[];
    descriptionText?: string;
    imgUrl?: string;
    tags?: Array<string>;
    time_start?: moment.Moment;
    time_end?: moment.Moment;
    provenance: ProvenanceInfo;
}

export interface MappingSourceDict {
    operator?: string,
    name: string,
    descriptionText?: string,
    imgUrl?: string,
    tags?: Array<string>;
    time_start?: string;
    time_end?: string;
    colorizer?: MappingRasterColorizerDict,
    provenance?: {
        uri: string,
        license: string,
        citation: string,
    };
    coords: {
        crs: string,
        epsg?: number,
        origin?: number[],
        scale?: number[],
        size?: number[],
    };
    channels?: [{
        datatype: string,
        nodata: number,
        name?: string,
        unit?: UnitMappingDict,
        colorizer?: MappingRasterColorizerDict,
        transform?: {
            unit?: UnitMappingDict,
            datatype: string,
            scale: number,
            offset: number,
        },
        coords: {
            crs: string,
            origin: number[],
            scale: number[],
            size: number[],
        },
        provenance?: {
            uri: string,
            license: string,
            citation: string,
        }
        time_interval?: TimeInterval,
        time_start?: string,
        time_end?: string,
    }];
    layer?: [{
        id?: number | string,
        name: string,
        title?: string,
        geometry_type: string, // FIXME: this must be the layer type -> POINT, POLYGON, LINE...
        textual?: string[],
        numeric?: string[],
        coords: {
            crs: string,
        };
        uri?: string,
        license?: string,
        citation?: string,
        provenance?: {
            uri: string,
            license: string,
            citation: string,
        }
    }];
}

export interface MappingSourceResponse {
    sourcelist: {[index: string]: MappingSourceDict};
}
