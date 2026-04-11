import { VM } from "../../shared/lib/view-models/vm";

export class HomePageVM extends VM {
  protected willMount(): void {
    this.globals.stores.appInfo.setTitle('Home');
  }
};  