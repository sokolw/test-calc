import { CalculationRule } from './interfaces/calculation-rule';
import { Product } from './interfaces/product';
import { InputStaticDataObserver } from './interfaces/input-static-data-observer';
import { ObjectTypes } from './object-types';
import { FrameLimit } from './interfaces/frame-limit';
import { UserDataToCalculate } from './interfaces/user-data-to-calculate';
import { MaterialCalculationResult } from './interfaces/material-calculation-result';
import { TableResultsObserver } from './interfaces/table-results-observer';
import { MiniFrame } from './interfaces/mini-frame';
import { ProductData } from './interfaces/product-data';

export class AppModel {
  private productsData: Product[] = [];

  private calculationRules: CalculationRule[] = [];

  private sheets: Product[] = [];

  private pipes: Product[] = [];

  private strengths: CalculationRule[] = [];

  private frameLimit: FrameLimit | null = null;

  private inputStaticDataObservers: InputStaticDataObserver[] = [];

  private tableResultsObserver: TableResultsObserver = {} as TableResultsObserver;

  private materialCalculationResults: MaterialCalculationResult[] = [];

  private miniFrame: MiniFrame = {} as MiniFrame;

  private productDataResult: ProductData = {} as ProductData;

  public async initialize(): Promise<void> {
    const resData = await fetch(
      'https://raw.githubusercontent.com/Vistegra/test-calc-js/master/data/data.json'
    );
    this.productsData = await resData.json();

    const resConfig = await fetch(
      'https://raw.githubusercontent.com/Vistegra/test-calc-js/master/data/config.json'
    );
    this.calculationRules = await resConfig.json();
    this.notifyInputStaticDataObservers();
  }

  public registerInputStaticDataObservers(o: InputStaticDataObserver): void {
    this.inputStaticDataObservers.push(o);
  }

  public notifyInputStaticDataObservers(): void {
    for (let i = 0; i < this.inputStaticDataObservers.length; i += 1) {
      this.inputStaticDataObservers[i]?.updateInputStaticData();
    }
  }

  public registerTableResultsObserver(o: TableResultsObserver): void {
    this.tableResultsObserver = o;
  }

  public notifyTableResultsObserver(): void {
    this.tableResultsObserver.updateResults();
  }

  public getSheets(): Product[] {
    if (this.sheets.length !== 0) {
      return this.sheets;
    }
    this.sheets = this.productsData.filter((item) => item.type === ObjectTypes.SHEET);
    return this.sheets;
  }

  public getPipes(): Product[] {
    if (this.pipes.length !== 0) {
      return this.pipes;
    }
    this.pipes = this.productsData.filter((item) => item.type === ObjectTypes.PIPE);
    return this.pipes;
  }

  public getStrengths(): CalculationRule[] {
    if (this.strengths.length !== 0) {
      return this.strengths;
    }
    this.strengths = this.calculationRules.filter((item) => item.type === ObjectTypes.FRAME);
    return this.strengths;
  }

  public getFrameLimit(): FrameLimit {
    if (this.frameLimit !== null) {
      return this.frameLimit;
    }
    const sizes = this.calculationRules.filter((item) => item.type === ObjectTypes.SIZE);
    const result = {} as FrameLimit;

    for (let index = 0; index < sizes.length; index += 1) {
      const element = sizes[index];
      if (element?.key === 'length') {
        result.length = { min: element.min!, max: element.max! };
      }
      if (element?.key === 'width') {
        result.width = { min: element.min!, max: element.max! };
      }
    }
    this.frameLimit = result;
    return this.frameLimit;
  }

  public getCalcResults(): MaterialCalculationResult[] {
    return this.materialCalculationResults;
  }

  public getMiniFrame(): MiniFrame {
    return this.miniFrame;
  }

  public getProductDataResult(): ProductData {
    return this.productDataResult;
  }

  public calcRequiredMaterial(userData: UserDataToCalculate): void {
    this.materialCalculationResults = [];
    const sheet = this.sheets.find((item) => item.name === userData.sheet)!;
    const pipe = this.pipes.find((item) => item.name === userData.pipe)!;
    const strength = this.strengths.find((item) => item.name === userData.strength)!;
    const screw = this.productsData.find((item) => item.type === ObjectTypes.SCREW)!;
    const screwRule = this.calculationRules.find(
      (item) => item.type === ObjectTypes.SCREW && item.key === sheet.material
    )!;

    // base pipe width in mm by ГОСТ
    const pipeWidthInMeters = pipe.width! / 1000;

    // default sheetLength = 1m
    const sheetLength = 1;
    const step = strength.step! > sheet.width! ? sheet.width! : strength.step!;
    const miniFramesPerSheet = Math.floor(sheet.width! / step);

    const miniFrameLength = sheetLength - 2 * pipeWidthInMeters;
    const miniFrameWidth = step - 2 * pipeWidthInMeters;
    const miniFrameSize = miniFrameWidth * miniFrameLength;
    const frameArea = userData.width * userData.length;

    const numberMiniFrames = frameArea / miniFrameSize;
    const numberSheets = numberMiniFrames / miniFramesPerSheet;

    const numberMiniFramesInRow = userData.width / sheetLength;
    const numberVerticalLines = numberMiniFramesInRow + 1;

    const numberMiniFramesInCol = userData.length / step;
    const numberHorizontalLines = Math.ceil(numberMiniFramesInCol) + 1;

    // length equivalent м.п.(метрам погонным)
    const lengthVerticalLine = userData.length - numberHorizontalLines * pipeWidthInMeters;
    const lengthHorizontalLine = userData.width - numberVerticalLines * pipeWidthInMeters;

    const overallPipeLength =
      lengthVerticalLine * numberVerticalLines + lengthHorizontalLine * numberHorizontalLines;

    const screwPerMiniFrame = miniFrameSize * screwRule.value!;
    const overallNumberScrews = numberMiniFrames * screwPerMiniFrame;

    const totalCostOfSheets = numberSheets * sheet.price;
    const totalCostOfPipes = overallPipeLength * pipe.price;
    const totalCostOfScrews = overallNumberScrews * screw.price;

    this.materialCalculationResults.push({
      name: sheet.name,
      unit: sheet.unit,
      overallMaterial: Math.ceil(numberSheets),
      totalCost: +totalCostOfSheets.toFixed(2),
    });

    this.materialCalculationResults.push({
      name: pipe.name,
      unit: pipe.unit,
      overallMaterial: Math.ceil(overallPipeLength),
      totalCost: +totalCostOfPipes.toFixed(2),
    });

    this.materialCalculationResults.push({
      name: screw.name,
      unit: screw.unit,
      overallMaterial: Math.ceil(overallNumberScrews),
      totalCost: +totalCostOfScrews.toFixed(2),
    });

    this.miniFrame = { length: miniFrameLength, width: miniFrameWidth };
    this.productDataResult = {
      frameArea,
      miniFrame: this.miniFrame,
      totalCost: +this.materialCalculationResults
        .reduce((prev, curr) => prev + curr.totalCost, 0)
        .toFixed(2),
    };

    this.notifyTableResultsObserver();
  }
}
