import { AppModel } from './app-model';
// eslint-disable-next-line import/no-cycle
import { AppView } from './app-view';
import { RawUserFormData } from './interfaces/raw-user-form-data';
import { UserDataToCalculate } from './interfaces/user-data-to-calculate';

export class AppController {
  private model: AppModel;

  private view: AppView;

  constructor(model: AppModel) {
    this.model = model;
    this.view = new AppView(this, model);
    this.view.createInputContainer();
    this.view.disableSubmitButton();
    this.model.initialize();
  }

  validateFormData(rawUserFormData: RawUserFormData): void {
    if (
      rawUserFormData.sheet &&
      rawUserFormData.pipe &&
      rawUserFormData.length &&
      rawUserFormData.width &&
      rawUserFormData.strength
    ) {
      const userDataToCalculate = this.transformUserData(rawUserFormData);
      const frameLimit = this.model.getFrameLimit();
      if (
        userDataToCalculate.length >= frameLimit.length.min &&
        userDataToCalculate.length <= frameLimit.length.max &&
        userDataToCalculate.width >= frameLimit.width.min &&
        userDataToCalculate.width <= frameLimit.width.max
      ) {
        this.view.enableSubmitButton();
      } else {
        this.view.disableSubmitButton();
      }
    } else {
      this.view.disableSubmitButton();
    }
  }

  private transformUserData(raw: RawUserFormData): UserDataToCalculate {
    return {
      ...raw,
      length: Number.parseInt(raw.length, 10),
      width: Number.parseInt(raw.width, 10),
    };
  }

  calcRequiredMaterial(raw: RawUserFormData): void {
    const userData = this.transformUserData(raw);
    this.model.calcRequiredMaterial(userData);
  }
}
