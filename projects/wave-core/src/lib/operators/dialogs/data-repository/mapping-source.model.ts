import {Unit, UnitMappingDict} from '../../unit.model';
import {MappingRasterColorizerDict} from '../../../colors/colorizer-data.model';
import {IColorizerData} from '../../../colors/colorizer-data.model';

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

export interface SourceRasterLayerDescription {
    name: string;
    id: number;
    datatype: string;
    nodata: number;
    unit: Unit;
    methodology?: MappingRasterMethodology;
    colorizer?: IColorizerData;
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
}

export interface SourceVectorLayerDescription {
    name: string;
    id: number | string;
    title: string;
    geometryType: string; // FIXME: this must be the layer type -> POINT, POLYGON, LINE...
    textual: string[];
    numeric: string[];
    coords: {
        crs: string
    };
    colorizer?: IColorizerData;
    provenance: ProvenanceInfo;
}

export interface MappingSource {
    operator: string;
    source: string;
    name: string;
    rasterLayer?: SourceRasterLayerDescription[];
    vectorLayer?: SourceVectorLayerDescription[];
    descriptionText?: string;
    imgUrl?: string;
    tags?: Array<string>;
    provenance: ProvenanceInfo;
}

export interface MappingSourceDict {
    operator?: string;
    name: string;
    descriptionText?: string;
    imgUrl?: string;
    tags?: string[];
    colorizer?: MappingRasterColorizerDict;
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
    channels?: [MappingSourceRasterLayerDict];
    layer?: [MappingSourceVectorLayerDict];
}

export interface MappingSourceRasterLayerDict {
    datatype: string;
    nodata: number;
    name?: string;
    unit?: UnitMappingDict;
    methodology?: MappingRasterMethodology,
        colorizer?: MappingRasterColorizerDict;
    transform?: {
        unit?: UnitMappingDict,
        datatype: string,
        scale: number,
        offset: number,
    };
    coords: {
        crs: string,
        origin: number[],
        scale: number[],
        size: number[],
    };
    provenance?: {
        uri: string,
        license: string,
        citation: string,
    };
}

export interface MappingSourceVectorLayerDict {
    id?: number | string;
    name: string;
    title?: string;
    geometry_type: string; // FIXME: this must be the layer type -> POINT, POLYGON, LINE...
    textual?: string[];
    numeric?: string[];
    coords: {
        crs: string,
    };
    uri?: string;
    license?: string;
    citation?: string;
    provenance?: {
        uri: string,
        license: string,
        citation: string,
    };
}


export interface MappingSourceResponse {
    sourcelist: {[index: string]: MappingSourceDict};
}

export interface MappingRasterMethodology {
    type: 'SATELLITE_SENSOR';
}

export interface MappingSatelliteSensorRasterMethodology extends MappingRasterMethodology {
    central_wave_length_nm: number;
}