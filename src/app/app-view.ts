// eslint-disable-next-line import/no-cycle
import { AppController } from './app-controller';
import { AppModel } from './app-model';
import { CalculationRule } from './interfaces/calculation-rule';
import { InputStaticDataObserver } from './interfaces/input-static-data-observer';
import { MaterialCalculationResult } from './interfaces/material-calculation-result';
import { Product } from './interfaces/product';
import { RawUserFormData } from './interfaces/raw-user-form-data';
import { TableResultsObserver } from './interfaces/table-results-observer';
import { ProductData } from './interfaces/product-data';

export class AppView implements InputStaticDataObserver, TableResultsObserver {
  private controller: AppController;

  private model: AppModel;

  form: HTMLFormElement | null = null;

  submitButton: HTMLInputElement | null = null;

  constructor(controller: AppController, model: AppModel) {
    this.controller = controller;
    this.model = model;
    this.model.registerInputStaticDataObservers(this as InputStaticDataObserver);
    this.model.registerTableResultsObserver(this as TableResultsObserver);
  }

  draw(): void {
    document.body.innerHTML = ``;
  }

  createInputContainer(): void {
    this.form = document.querySelector('.form');
    this.submitButton = this.form?.querySelector('.button')!;

    this.form?.addEventListener('submit', (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.form !== null) {
        const rawData = Object.fromEntries(new FormData(this.form));
        console.log(rawData, 'submit');
        this.controller.calcRequiredMaterial(rawData as unknown as RawUserFormData);
      }
    });

    this.form?.addEventListener('click', (e: Event) => {
      if (this.submitButton !== null && e.target !== this.submitButton) {
        if (this.form !== null) {
          const rawData = Object.fromEntries(new FormData(this.form));
          this.controller.validateFormData(rawData as unknown as RawUserFormData);
        }
      }
    });

    const inputFieldWidth = this.getFormFieldByName<HTMLInputElement>(this.form!, 'width');
    inputFieldWidth.addEventListener('input', this.handleNumberInput(this.form!));
    const inputFieldLength = this.getFormFieldByName<HTMLInputElement>(this.form!, 'length');
    inputFieldLength.addEventListener('input', this.handleNumberInput(this.form!));
  }

  private handleNumberInput(form: HTMLFormElement) {
    let previousValue: string = '';
    return (e: Event) => {
      const inputElem = e.target as HTMLInputElement;
      const { value } = inputElem;
      if (value.length > 0 && !Number.isNaN(Number.parseInt(value[value.length - 1]!, 10))) {
        previousValue = value;
        form.click();
      } else if (value.length === 0) {
        previousValue = value;
      } else {
        inputElem.value = previousValue;
      }
    };
  }

  updateInputStaticData(): void {
    console.log('data is loaded');
    this.drawSheetList(this.model.getSheets());
    this.drawPipeList(this.model.getPipes());
    this.drawStrengthList(this.model.getStrengths());
  }

  updateResults(): void {
    this.drawProduct(this.model.getProductDataResult(), this.model.getCalcResults());
  }

  drawSheetList(sheets: Product[]): void {
    if (this.form !== null) {
      this.drawSelectOptionsElement(this.form, 'sheet', sheets);
    }
  }

  drawPipeList(pipes: Product[]): void {
    if (this.form !== null) {
      this.drawSelectOptionsElement(this.form, 'pipe', pipes);
    }
  }

  drawStrengthList(strengths: CalculationRule[]): void {
    if (this.form !== null) {
      this.drawSelectOptionsElement(this.form, 'strength', strengths);
    }
  }

  enableSubmitButton(): void {
    if (this.submitButton !== null) this.submitButton.removeAttribute('disabled');
  }

  disableSubmitButton(): void {
    if (this.submitButton !== null) this.submitButton.setAttribute('disabled', '');
  }

  private drawSelectOptionsElement<T extends { name: string }>(
    form: HTMLFormElement,
    selectFieldName: string,
    data: T[]
  ): void {
    const selectElement = Array.from(form.elements).find(
      (elem) => elem.getAttribute('name') === selectFieldName
    ) as HTMLSelectElement;
    this.removingCustomOptionElements(selectElement, 'default');

    data.forEach((item) => {
      const customOption = document.createElement('option');
      customOption.textContent = item.name;
      selectElement.add(customOption);
    });
  }

  private removingCustomOptionElements(selectElement: HTMLSelectElement, defaultValue: string) {
    let index = selectElement.options.length - 1;
    while (selectElement.options.length !== 1) {
      if (selectElement.item(index)?.getAttribute('value') === defaultValue) {
        index -= 1;
      } else {
        selectElement.remove(index);
        index = selectElement.options.length - 1;
      }
    }
  }

  private getFormFieldByName<T>(form: HTMLFormElement, fieldName: string): T {
    return Array.from(form.elements).find((elem) => elem.getAttribute('name') === fieldName) as T;
  }

  drawProduct(productData: ProductData, results: MaterialCalculationResult[]): void {
    const product = this.createElement('div');
    product.classList.add('product');
    const productArea = this.createElement('p');
    productArea.classList.add('mb-0');
    productArea.textContent = `Площадь изделия: ${productData.frameArea}м2`;
    const frameSize = this.createElement('p');
    frameSize.textContent = `Размер ячейки ДхШ: ${productData.miniFrame.length}х${productData.miniFrame.width}м`;
    const tableLabel = this.createElement('p');
    tableLabel.classList.add('mb-0');
    tableLabel.textContent = `Кол-во материалов:`;
    const tableResults = this.drawTableResults(results);
    const totalCostLabel = this.createElement('p');
    totalCostLabel.textContent = `Итоговая стоимость: ${productData.totalCost}`;
    product.append(productArea, frameSize, tableLabel, tableResults, totalCostLabel);
    // insert product
    const resultContainer = document.querySelector('.result-container')!;
    resultContainer.innerHTML = '';
    resultContainer.append(product);
  }

  drawTableResults(results: MaterialCalculationResult[]): HTMLTableElement {
    const table = document.createElement('table');
    table.classList.add('table', 'table-hover');
    // table head
    const tableHead = document.createElement('thead');
    tableHead.classList.add('table-dark');
    const rowHead = document.createElement('tr');
    const colValues = ['Наименование', 'ед.', 'кол-во', 'сумма'];
    const colsHead = colValues.map((value) => {
      const colHead = document.createElement('th');
      colHead.textContent = value;
      return colHead;
    });
    rowHead.append(...colsHead);
    tableHead.append(rowHead);
    // table body
    const tableBody = document.createElement('tbody');
    for (let row = 0; row < results.length; row += 1) {
      const rowBody = this.createElement('tr');
      const values = Object.values(results[row]!);
      const cols = values.map((value) => {
        const colBody = this.createElement('td');
        colBody.textContent = value;
        return colBody;
      });
      rowBody.append(...cols);
      tableBody.append(rowBody);
    }
    table.append(tableHead, tableBody);
    return table;
    // insert table
    // const resultContainer = document.querySelector('.result-container')!;
    // resultContainer.innerHTML = '';
    // resultContainer.append(table);
  }

  public createElement<T extends keyof HTMLElementTagNameMap>(
    tagName: T
  ): HTMLElementTagNameMap[T] {
    return document.createElement<T>(tagName);
  }
}
