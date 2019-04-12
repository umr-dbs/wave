import {Interpolation, Unit, UnitDict} from '../../operators/unit.model';
import {Color, RgbaLike, RgbaTuple, TRANSPARENT, WHITE} from '../../colors/color';
import {ColorizerData, IColorizerData, MappingRasterColorizerDict} from '../../colors/colorizer-data.model';
import {ColorBreakpoint, ColorBreakpointDict} from '../../colors/color-breakpoint.model';

export enum SymbologyType {
    RASTER,
    SIMPLE_POINT,
    CLUSTERED_POINT,
    SIMPLE_LINE,
    COMPLEX_LINE,
    SIMPLE_VECTOR,
    MAPPING_COLORIZER_RASTER,
    ICON_POINT, // RESERVED
    COMPLEX_POINT,
    COMPLEX_VECTOR,
}

export const DEFAULT_VECTOR_STROKE_COLOR: Color = Color.fromRgbaLike([0, 0, 0, 1]);
export const DEFAULT_VECTOR_FILL_COLOR: Color = Color.fromRgbaLike([255, 0, 0, 1]);
export const DEFAULT_VECTOR_HIGHLIGHT_STROKE_COLOR: Color = Color.fromRgbaLike([255, 255, 255, 1]);
export const DEFAULT_VECTOR_HIGHLIGHT_FILL_COLOR: Color = Color.fromRgbaLike([0, 153, 255, 1]);
export const DEFAULT_VECTOR_HIGHLIGHT_TEXT_COLOR: Color = Color.fromRgbaLike([255, 255, 255, 1]);
export const DEFAULT_POINT_RADIUS = 5;
/**
 * Serialization interface
 */
export interface SymbologyDict {
    symbologyType: string;
}

// tslint:disable-next-line: no-empty-interface
export interface ISymbology {}


// TODO: Clean up...
export abstract class AbstractSymbology implements ISymbology {

    static fromDict(
        dict: SymbologyDict
    ): AbstractSymbology {
        console.log(dict);

        switch (dict.symbologyType) {
            case SymbologyType[SymbologyType.SIMPLE_POINT]:
                return ComplexPointSymbology.createSimpleSymbology(dict as ComplexPointSymbologyDict);
            case SymbologyType[SymbologyType.CLUSTERED_POINT]:
                return ComplexPointSymbology.createClusterSymbology(dict as VectorSymbologyDict);
            case SymbologyType[SymbologyType.COMPLEX_POINT]:
                return new ComplexPointSymbology(dict as ComplexPointSymbologyDict);

            case SymbologyType[SymbologyType.SIMPLE_LINE]:
                return ComplexLineSymbology.createSimpleSymbology(dict as VectorSymbologyDict);
            case SymbologyType[SymbologyType.COMPLEX_LINE]:
                return ComplexLineSymbology.createComplexSymbology(dict as ComplexVectorSymbologyDict);

            case SymbologyType[SymbologyType.SIMPLE_VECTOR]:
                return ComplexVectorSymbology.createSimpleSymbology(dict as VectorSymbologyDict);
            case SymbologyType[SymbologyType.COMPLEX_VECTOR]:
                return ComplexVectorSymbology.createComplexSymbology(dict as ComplexVectorSymbologyDict);

            case SymbologyType[SymbologyType.RASTER]:
                const rasterSymbologyDict = dict as RasterSymbologyDict;
                return new RasterSymbology({
                    hue: rasterSymbologyDict.hue,
                    opacity: rasterSymbologyDict.opacity,
                    saturation: rasterSymbologyDict.saturation,
                    unit: Unit.fromDict(rasterSymbologyDict.unit),
                });
            case SymbologyType[SymbologyType.MAPPING_COLORIZER_RASTER]:
                const mappingColorizerRasterSymbologyDict = dict as RasterSymbologyDict;
                return new MappingColorizerRasterSymbology({
                        hue: mappingColorizerRasterSymbologyDict.hue,
                        opacity: mappingColorizerRasterSymbologyDict.opacity,
                        saturation: mappingColorizerRasterSymbologyDict.saturation,
                        unit: Unit.fromDict(mappingColorizerRasterSymbologyDict.unit),
                        colorizer: ColorizerData.fromDict(mappingColorizerRasterSymbologyDict.colorizer)
                    });
            default:
                throw new Error('Unsupported Symbology: ' + dict.symbologyType + dict.symbologyType.toString());
        }
    }

    abstract getSymbologyType(): SymbologyType;

    get symbologyTypeId(): string {
        return SymbologyType[this.getSymbologyType()];
    }

    abstract clone(): AbstractSymbology;

    // abstract equals(other: AbstractSymbology): boolean; TODO: equals for symbologys?

    abstract toConfig(): ISymbology;

    abstract equals(other: AbstractSymbology): boolean;

    abstract toDict(): SymbologyDict;
}

export interface VectorSymbologyConfig extends ISymbology {
    fillRGBA: RgbaLike;
    strokeRGBA?: RgbaLike;
    strokeWidth?: number;
}

interface VectorSymbologyDict extends SymbologyDict {
    fillRGBA: RgbaTuple;
    strokeRGBA: RgbaTuple;
    strokeWidth: number;
}

export abstract class AbstractVectorSymbology extends AbstractSymbology {
    _fillColorBreakpoint: ColorBreakpoint = new ColorBreakpoint({rgba: DEFAULT_VECTOR_FILL_COLOR, value: 'Default fill color'});
    _strokeColorBreakpoint: ColorBreakpoint = new ColorBreakpoint({rgba: DEFAULT_VECTOR_STROKE_COLOR, value: 'Default stroke color'});

    // fillRGBA: Color = DEFAULT_VECTOR_FILL_COLOR;
    // strokeRGBA: Color = DEFAULT_VECTOR_STROKE_COLOR;
    strokeWidth = 1;

    abstract describesArea(): boolean;
    abstract describesRadius(): boolean;

    // Wrap colors in ColorBreakpoint for easy form usage
    set fillColorBreakpoint(colorBreakpoint: ColorBreakpoint) {
        this._fillColorBreakpoint = colorBreakpoint;
    }

    get fillColorBreakpoint(): ColorBreakpoint {
        return this._fillColorBreakpoint;
    }

    set strokeColorBreakpoint(colorBreakpoint: ColorBreakpoint) {
        this._strokeColorBreakpoint = colorBreakpoint;
    }

    get strokeColorBreakpoint(): ColorBreakpoint {
        return this._strokeColorBreakpoint;
    }

    // Wrap colors in ColorBreakpoint for easy form usage
    set fillRGBA(color: Color) {
        this._fillColorBreakpoint.setColor(color);
    }

    get fillRGBA(): Color {
        return this._fillColorBreakpoint.rgba;
    }

    set strokeRGBA(color: Color) {
        this._strokeColorBreakpoint.setColor(color);
    }

    get strokeRGBA(): Color {
        return this._strokeColorBreakpoint.rgba;
    }

    equals(other: AbstractVectorSymbology) {
        // console.log('AbstractVectorSymbology', 'equals', this, other);
        return other
            && this.fillColorBreakpoint.equals(other.fillColorBreakpoint)
            && this.strokeColorBreakpoint.equals(other.strokeColorBreakpoint)
            && this.strokeWidth === other.strokeWidth
            && this.describesArea() === other.describesArea()
            && this.describesRadius() === other.describesRadius();
    }


    setFillColorBreakpoint(colorBreakpoint: ColorBreakpoint) {
            this.fillColorBreakpoint = colorBreakpoint;
    }

    setStrokeColorBreakpoint(colorBreakpoint: ColorBreakpoint) {
            this.strokeColorBreakpoint = colorBreakpoint;
    }

    protected constructor(config: VectorSymbologyConfig) {
        super();
        this.fillRGBA = Color.fromRgbaLike(config.fillRGBA);
        if (config.strokeRGBA) { this.strokeRGBA = Color.fromRgbaLike(config.strokeRGBA); }
        if (config.strokeWidth) { this.strokeWidth = config.strokeWidth; }
    }

    abstract getSymbologyType(): SymbologyType;
}

export interface LineSymbologyConfig extends VectorSymbologyConfig {
    strokeRGBA: RgbaLike;
    strokeWidth: number;
}

export class LineSymbology extends AbstractVectorSymbology implements VectorSymbologyConfig {

    constructor(conf: LineSymbologyConfig) {
        super(conf)
    }

    static createSymbology(conf: LineSymbologyConfig): LineSymbology {
        return new LineSymbology(conf)
    }

    clone(): LineSymbology {
        return LineSymbology.createSymbology(this);
    }

    describesArea(): boolean {
        return false;
    }

    describesRadius(): boolean {
        return false;
    }

    getSymbologyType(): SymbologyType {
        return SymbologyType.SIMPLE_LINE;
    }

    toConfig(): ISymbology {
        return this.clone();
    }

    toDict(): VectorSymbologyDict {
        return {
            symbologyType: this.symbologyTypeId,
            fillRGBA: this.fillRGBA.rgbaTuple(),
            strokeRGBA: this.strokeRGBA.rgbaTuple(),
            strokeWidth: this.strokeWidth
        }
    }

}


export interface ComplexVectorSymbologyConfig extends VectorSymbologyConfig {
    fillColorizer?: IColorizerData;
    fillAttribute?: string;
    strokeColorizer?: IColorizerData;
    strokeAttribute?: string;
    textAttribute?: string
    textColor?: RgbaLike;
    textStrokeWidth?: number;
}

export interface ComplexVectorSymbologyDict extends VectorSymbologyDict {
    fillColorizer: IColorizerData;
    fillAttribute: string;
    strokeColorizer: IColorizerData;
    strokeAttribute: string;
    textAttribute: string
    textColor: RgbaLike;
    textStrokeWidth: number;
}

export interface ComplexPointSymbologyConfig extends ComplexVectorSymbologyConfig {
    radius?: number;
    radiusAttribute?: string;
}

interface ComplexPointSymbologyDict extends ComplexVectorSymbologyDict {
    radius: number;
    radiusAttribute: string;
}

export abstract class AbstractComplexVectorSymbology extends AbstractVectorSymbology {
    fillColorizer: ColorizerData;
    fillAttribute: string = undefined;

    strokeColorizer: ColorizerData;
    strokeAttribute: string = undefined;

    textAttribute: string = undefined;
    textColor: Color = undefined;
    textStrokeWidth: number = undefined;

    protected constructor(config: ComplexVectorSymbologyConfig) {
        super(config);

        // FIXME: handle old configs!
        if (config['colorAttribute'] || config['colorizer']) {
            config.fillColorizer = config['colorizer'];
            config.fillAttribute = config['colorAttribute'];
        }

        this.fillAttribute = (config.fillAttribute) ? config.fillAttribute : undefined;
        this.fillColorizer = (config.fillColorizer) ? ColorizerData.fromDict(config.fillColorizer) : ColorizerData.empty();

        this.textAttribute = (config.textAttribute) ? config.textAttribute : undefined;
        this.textColor = (config.textColor) ? Color.fromRgbaLike(config.textColor) : WHITE;
        this.textStrokeWidth = (config.textStrokeWidth) ? config.textStrokeWidth : Math.ceil(config.strokeWidth * 0.1);
    }

    setFillColorAttribute(name: string, clr: ColorizerData = ColorizerData.empty()) {
        this.fillColorizer = clr;
        this.fillAttribute = name;
    }

    setOrUpdateFilllColorizer(clr: ColorizerData): boolean {
        if (clr && (!this.fillColorizer || !clr.equals(this.fillColorizer))) {
            this.fillColorizer = clr;
            return true;
        }
        return false;
    }

    unSetFillColorAttribute() {
        this.fillAttribute = undefined;
        this.fillColorizer = ColorizerData.empty()
    }

    equals(other: AbstractVectorSymbology) {
        // console.log('ComplexPointSymbology', 'equals', this, other);
        if (other instanceof AbstractComplexVectorSymbology) {
            return super.equals(other as AbstractComplexVectorSymbology)
                && this.fillColorizer && this.fillColorizer.equals(other.fillColorizer)
                && this.fillAttribute && other.fillAttribute && this.fillAttribute === other.fillAttribute
                && this.strokeColorizer && this.strokeColorizer.equals(other.strokeColorizer)
                && this.strokeAttribute && other.strokeAttribute && this.strokeAttribute === other.strokeAttribute
                && this.textColor && this.textColor.equals(other.textColor)
                && this.textStrokeWidth && other.textStrokeWidth && this.textStrokeWidth === other.textStrokeWidth
                && this.textAttribute && other.textAttribute && this.textAttribute === other.textAttribute;
        }
        return false;
    }

    toDict(): ComplexVectorSymbologyDict {
        return {
            symbologyType: this.symbologyTypeId,
            fillRGBA: this.fillRGBA.rgbaTuple(),
            strokeRGBA: this.strokeRGBA.rgbaTuple(),
            strokeWidth: this.strokeWidth,
            fillAttribute: this.fillAttribute,
            fillColorizer: this.fillColorizer ? this.fillColorizer.toDict() : undefined,
            strokeAttribute: this.strokeAttribute,
            strokeColorizer: this.strokeColorizer ? this.strokeColorizer.toDict() : undefined,
            textAttribute: this.textAttribute,
            textColor: this.textColor.rgbaTuple(),
            textStrokeWidth: this.textStrokeWidth,
        }
    }

}

export class ComplexLineSymbology extends AbstractComplexVectorSymbology implements ComplexVectorSymbologyConfig {
    protected constructor(config: ComplexVectorSymbologyConfig) {
        super(config);
    }

    static createSimpleSymbology(config: ComplexVectorSymbologyConfig): ComplexVectorSymbology {
        return new ComplexLineSymbology(config);
    }

    static createComplexSymbology(config: ComplexVectorSymbologyConfig): ComplexVectorSymbology {
        return new ComplexLineSymbology(config);
    }

    describesArea(): boolean {
        return false;
    }
    describesRadius(): boolean {
        return false;
    }
    getSymbologyType(): SymbologyType {
        return SymbologyType.COMPLEX_LINE;
    }
    clone(): ComplexLineSymbology {
        return new ComplexLineSymbology(this);
    }
    toConfig(): ComplexLineSymbology {
        return this.clone();
    }
}

export class ComplexVectorSymbology extends AbstractComplexVectorSymbology implements ComplexVectorSymbologyConfig {

    protected constructor(config: ComplexVectorSymbologyConfig) {
        super(config);
    }

    static createSimpleSymbology(config: ComplexVectorSymbologyConfig): ComplexVectorSymbology {
        return new ComplexVectorSymbology(config);
    }

    static createComplexSymbology(config: ComplexVectorSymbologyConfig): ComplexVectorSymbology {
        return new ComplexVectorSymbology(config);
    }

    describesArea(): boolean {
        return true;
    }
    describesRadius(): boolean {
       return false;
    }
    getSymbologyType(): SymbologyType {
        return SymbologyType.COMPLEX_VECTOR;
    }
    clone(): ComplexVectorSymbology {
        return new ComplexVectorSymbology(this);
    }
    toConfig(): ComplexVectorSymbologyConfig {
        return this.clone();
    }
}

export class ComplexPointSymbology extends AbstractComplexVectorSymbology implements ComplexPointSymbologyConfig {

    radiusAttribute: string = undefined;
    radius: number = DEFAULT_POINT_RADIUS;

    constructor(config: ComplexPointSymbologyConfig) {
        super(config);
        // console.log('ComplexPointSymbology', config);
        if (config.radius) {
            this.radius = config.radius;
        }

        if (config.radiusAttribute) {
            this.radiusAttribute = config.radiusAttribute;
        }
    }

    /**
     * Creates a ComplexPointSymbology where radiusAttribute and textAttribute are set to the strings returned by Mappings cluster operator
     * @param {ComplexPointSymbologyConfig} config
     * @returns {ComplexPointSymbology}
     */
    static createClusterSymbology(config: ComplexPointSymbologyConfig): ComplexPointSymbology {
        config['radiusAttribute'] = '___radius';
        config['textAttribute'] = '___numberOfPoints';
        config['clustered'] = true;

        return ComplexPointSymbology.createSymbology(config);
    }

    static createSimpleSymbology(config: ComplexPointSymbologyConfig): ComplexPointSymbology {
        return ComplexPointSymbology.createSymbology(config);
    }

    static createSymbology(config: ComplexPointSymbologyConfig): ComplexPointSymbology {
        return new ComplexPointSymbology(config);
    }

    getSymbologyType(): SymbologyType {
        return SymbologyType.COMPLEX_POINT;
    }

    clone(): ComplexPointSymbology {
        return new ComplexPointSymbology(this);
    }

    equals(other: AbstractVectorSymbology) {
        // console.log('ComplexPointSymbology', 'equals', this, other);
        if (other instanceof ComplexPointSymbology) {
            return super.equals(other as AbstractComplexVectorSymbology)
            && this.radiusAttribute && other.radiusAttribute && this.radiusAttribute === other.radiusAttribute;
        }
        return false;
    }

    toConfig(): ComplexPointSymbologyConfig {
        return this.clone();
    }

    describesArea(): boolean {
        return true;
    }
    describesRadius(): boolean {
        return true;
    }

    toDict(): ComplexPointSymbologyDict {
        return {
            symbologyType: this.symbologyTypeId,
            fillRGBA: this.fillRGBA.rgbaTuple(),
            strokeRGBA: this.strokeRGBA.rgbaTuple(),
            strokeWidth: this.strokeWidth,
            fillAttribute: this.fillAttribute,
            fillColorizer: this.fillColorizer ? this.fillColorizer.toDict() : undefined,
            strokeAttribute: this.strokeAttribute,
            strokeColorizer: this.strokeColorizer ? this.strokeColorizer.toDict() : undefined,
            radiusAttribute: this.radiusAttribute,
            radius: this.radius,
            textAttribute: this.textAttribute,
            textColor: this.textColor.rgbaTuple(),
            textStrokeWidth: this.textStrokeWidth,
        }
    }
}

export interface IRasterSymbology extends ISymbology {
    opacity?: number;
    hue?: number;
    saturation?: number;
    unit: Unit;
}

export interface RasterSymbologyDict extends SymbologyDict {
    opacity: number;
    hue: number;
    saturation: number;
    unit: UnitDict;
    colorizer?: IColorizerData;
    noDataColor?: ColorBreakpointDict;
    overflowColor?: ColorBreakpointDict;
}

export class RasterSymbology extends AbstractSymbology implements IRasterSymbology {
    opacity = 1;
    hue = 0;
    saturation = 0;
    unit: Unit;

    constructor(config: IRasterSymbology) {
        super();
        this.unit = config.unit;
        if (config.opacity) { this.opacity = config.opacity; }
        if (config.hue) { this.hue = config.hue; }
        if (config.saturation) { this.saturation = config.saturation; }
    }

    isContinuous() {
        return this.unit.interpolation === Interpolation.Continuous;
    }

    isDiscrete() {
        return this.unit.interpolation === Interpolation.Discrete;
    }

    isUnknown() {
        return !this.unit || !this.unit.interpolation || this.unit.interpolation === 0;
    }

    getSymbologyType(): SymbologyType {
        return SymbologyType.RASTER;
    }

    toConfig(): IRasterSymbology {
        return this.clone();
    }

    clone(): RasterSymbology {
        return new RasterSymbology(this);
    }

    equals(other: RasterSymbology) {
        // console.log('RasterSymbology', 'equals', this, other);
        return this.saturation === other.saturation
            && this.opacity === other.opacity
            && this.hue === other.hue
            && this.unit === other.unit;
    }

    toDict(): RasterSymbologyDict {
        return {
            symbologyType: SymbologyType[SymbologyType.RASTER],
            opacity: this.opacity,
            hue: this.hue,
            saturation: this.saturation,
            unit: this.unit.toDict(),
        };
    }
}

export interface IColorizerRasterSymbology extends IRasterSymbology {
    colorizer?: IColorizerData;
    noDataColor?: ColorBreakpointDict;
    overflowColor?: ColorBreakpointDict;
}

export class MappingColorizerRasterSymbology extends RasterSymbology
    implements IColorizerRasterSymbology {

    colorizer: ColorizerData;
    noDataColor: ColorBreakpoint;
    overflowColor: ColorBreakpoint;

    constructor(config: IColorizerRasterSymbology) {
        super(config);
        // TODO don't create grayscale
        this.colorizer = (config.colorizer) ? new ColorizerData(config.colorizer) : ColorizerData.grayScaleColorizer(config.unit);
        this.noDataColor = (config.noDataColor) ? new ColorBreakpoint(config.noDataColor)
            : new ColorBreakpoint({rgba: TRANSPARENT, value: 'NoData'});
        this.overflowColor = (config.overflowColor) ? new ColorBreakpoint(config.overflowColor)
            : new ColorBreakpoint({rgba: TRANSPARENT, value: 'Overflow'});
    }

    getSymbologyType(): SymbologyType {
        return SymbologyType.MAPPING_COLORIZER_RASTER;
    }

    isUnknown(): boolean {
        return super.isUnknown();
    }

    toConfig(): IColorizerRasterSymbology {
        return this.clone() as IColorizerRasterSymbology;
    }

    clone(): MappingColorizerRasterSymbology {
        return new MappingColorizerRasterSymbology(this);
    }

    equals(other: RasterSymbology) {
        // console.log('MappingColorizerRasterSymbology', 'equals', this, other);
        if (other instanceof MappingColorizerRasterSymbology) {
            return super.equals(other as RasterSymbology)
                && this.colorizer && this.colorizer.equals(other.colorizer)
                && this.noDataColor && this.noDataColor.equals(other.noDataColor)
                && this.overflowColor && this.overflowColor.equals(other.overflowColor);
        }
        return false;
    }

    toDict(): RasterSymbologyDict {
        return {
            symbologyType: this.symbologyTypeId,
            opacity: this.opacity,
            hue: this.hue,
            saturation: this.saturation,
            unit: this.unit.toDict(),
            colorizer: this.colorizer.toDict(),
            noDataColor: this.noDataColor.toDict(),
            overflowColor: this.overflowColor.toDict()
        };
    }

    mappingColorizerRequestString(): string {
        const mcbs: MappingRasterColorizerDict = {
            type: this.colorizer.type,
            nodata: this.noDataColor.asMappingRasterColorizerBreakpoint(),
            overflow: this.overflowColor.asMappingRasterColorizerBreakpoint(),
            breakpoints: this.colorizer.breakpoints.map(br => br.asMappingRasterColorizerBreakpoint())
        };
        return JSON.stringify(mcbs);
    }
}
