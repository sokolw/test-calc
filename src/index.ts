import { AppController } from './app/app-controller';
import { AppModel } from './app/app-model';
import './app/scss/main.scss';

const appModel = new AppModel();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const appController = new AppController(appModel);
