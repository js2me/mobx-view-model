export default `
import { observable, action } from "mobx";
import { ViewModelBase } from "mobx-view-model";

export class ComponentVM extends ViewModelBase {
  @observable
  accessor search = '';

  @action
  setSearch(search: string) {
    this.search = search;
  }

  mount() {
    super.mount();
    fetchData();
  }
}
`